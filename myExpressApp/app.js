// Server (CommonJS) app.js - Express server, serves views + /public static assets.

'use strict';

const express = require('express');
const path = require('path');
const axios = require('axios');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
const PORT = process.env.PORT || 3000;

// Response Caching
const NodeCache = require('node-cache');
const responseCache = new NodeCache({ 
    stdTTL: 30,  // Cache for 30 seconds
    checkperiod: 60 
});

// Axios Instance with Connection Pooling
const ttnAxios = axios.create({
    timeout: 30000,
    maxRedirects: 5,
    // Enable HTTP keep-alive for connection reuse
    httpAgent: new (require('http').Agent)({ 
        keepAlive: true,
        maxSockets: 10 
    }),
    httpsAgent: new (require('https').Agent)({ 
        keepAlive: true,
        maxSockets: 10 
    })
});

// Key Vault setup
const keyVaultName = process.env.KEY_VAULT_NAME;
const secretName = process.env.TTN_SECRET_NAME || 'editions-app-key-first';
const ttnCluster = process.env.TTN_CLUSTER || 'eu1';
const ttnAppId = (process.env.TTN_APP_ID || 'pcb-test-1').toLowerCase();

let secretClient = null;
if (keyVaultName) {
    const credential = new DefaultAzureCredential();
    const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
    secretClient = new SecretClient(vaultUrl, credential);
}


// Longer Secret Cache with LRU
let cachedSecretValue = null;
let cachedAt = 0;
const SECRET_CACHE_MS = 5 * 60 * 1000; // 5 minutes instead of 60s

async function getAppSecret() {
    if (!secretClient) {
        throw new Error('KeyVault client not configured (KEY_VAULT_NAME missing)');
    }
    try {
        if (cachedSecretValue && Date.now() - cachedAt < SECRET_CACHE_MS) {
            return cachedSecretValue;
        }
        const secretResp = await secretClient.getSecret(secretName);
        cachedSecretValue = secretResp.value;
        cachedAt = Date.now();
        return cachedSecretValue;
    } catch (err) {
        console.error('KeyVault error:', err);
        throw new Error('Failed to read secret from KeyVault: ' + err.message);
    }
}

// View engine and static folder
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Compression Middleware
const compression = require('compression');
app.use(compression({
    level: 6, // Balance between speed and compression ratio
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Static File Caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
    etag: true,
    lastModified: true,
    setHeaders: (res, filepath) => {
        if (filepath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            if (process.env.NODE_ENV === 'production') {
                res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
            }
        }
    }
}));

// Render main page
app.get('/', (req, res) => {
    try {
        return res.render('chart');
    } catch (err) {
        console.error('Error rendering chart.ejs:', err && err.stack ? err.stack : err);
        return res.status(500).send('Template render error. Check server logs.');
    }
});

// Response Caching Middleware
function cacheMiddleware(duration = 30) {
    return (req, res, next) => {
        const key = '__express__' + req.originalUrl || req.url;
        const cachedBody = responseCache.get(key);
        
        if (cachedBody) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedBody);
        }
        
        // Store original json function
        const originalJson = res.json.bind(res);
        
        // Override json function to cache response
        res.json = (body) => {
            responseCache.set(key, body, duration);
            res.setHeader('X-Cache', 'MISS');
            return originalJson(body);
        };
        
        next();
    };
}

// Optimized TTN Data Endpoint
app.get('/api/data', cacheMiddleware(30), async (req, res) => {
    try {
        const secret = await getAppSecret();
        const last = req.query.last || '1h';
        const fieldMask = req.query.field_mask || 'up.uplink_message';

        const url = `https://${ttnCluster}.cloud.thethings.network/api/v3/as/applications/${ttnAppId}/packages/storage/uplink_message`;

        console.log('Fetching from TTN:', url, 'last:', last);

        const resp = await ttnAxios.get(url, {
            params: { last, field_mask: fieldMask },
            headers: {
                'Accept': 'text/event-stream',
                'Authorization': `Bearer ${secret}`
            },
            responseType: 'text',
            validateStatus: null
        });

        if (resp.status !== 200) {
            console.error(`TTN API returned status ${resp.status}`);
            return res.status(resp.status).json({
                error: 'TTN API error',
                status: resp.status,
                details: resp.data
            });
        }

        // Faster Parsing with Streams
        const lines = resp.data.split('\n');
        const messages = [];
        
        // Pre-allocate array if possible
        messages.length = lines.length;
        let messageCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                messages[messageCount++] = JSON.parse(line);
            } catch (e) {
                // Skip invalid lines silently
            }
        }
        
        // Trim array to actual size
        messages.length = messageCount;

        console.log(`Successfully parsed ${messageCount} messages from TTN`);
        return res.json(messages);

    } catch (err) {
        console.error('Error fetching from TTN:', err.message);
        
        // Don't cache errors
        res.setHeader('Cache-Control', 'no-store');
        
        return res.status(502).json({
            error: 'Failed to fetch data from TTN',
            details: err.message
        });
    }
});

// Health Check Endpoint (Uncached)
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        cache: {
            keys: responseCache.keys().length,
            stats: responseCache.getStats()
        }
    });
});


// Graceful Shutdown
const server = app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        responseCache.close();
        process.exit(0);
    });
});

module.exports = app;