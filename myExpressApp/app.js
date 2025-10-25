// Server (CommonJS) app.js - Express server, serves views + /public static assets.

'use strict';

//emergency logging
console.log('========================================');
console.log('Application starting...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT || 3000);
console.log('KEY_VAULT_NAME:', process.env.KEY_VAULT_NAME);
console.log('TTN_APP_ID:', process.env.TTN_APP_ID);
console.log('TTN_SECRET_NAME:', process.env.TTN_SECRET_NAME);
console.log('========================================');


const express = require('express');
const path = require('path');
const axios = require('axios');
const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const app = express();
const PORT = process.env.PORT || 3000;

// Key Vault / TTN config
const keyVaultName = process.env.KEY_VAULT_NAME;
const secretName = process.env.TTN_SECRET_NAME || 'editions-app-key-first';
const ttnCluster = process.env.TTN_CLUSTER || 'eu1';
const ttnAppId = (process.env.TTN_APP_ID || 'pcb-test-1').toLowerCase();

// Azure Key Vault clients (only created if KEY_VAULT_NAME provided)
let secretClient = null;
if (keyVaultName) {
    const credential = new DefaultAzureCredential();
    const vaultUrl = `https://${keyVaultName}.vault.azure.net`;
    secretClient = new SecretClient(vaultUrl, credential);
}

// Secret cache (avoid hitting Key Vault on every request)
let cachedSecretValue = null;
let cachedAt = 0;
const SECRET_CACHE_MS = 60 * 1000; // 60s

if (!keyVaultName) {
    console.warn('Warning: KEY_VAULT_NAME not set. If you expect secrets from Key Vault, set KEY_VAULT_NAME in App Settings.');
}

// Helper: get app secret (with in-memory cache)
async function getAppSecret() {
    if (!secretClient) {
        throw new Error('KeyVault client not configured (KEY_VAULT_NAME missing)');
    }
    try {
        if (cachedSecretValue && Date.now() - cachedAt < SECRET_CACHE_MS) return cachedSecretValue;
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

// Serve static client-side files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Render main page
app.get('/', (req, res) => {
    try {
        console.log('Rendering chart.ejs from:', app.get('views'));
        return res.render('chart');
    } catch (err) {
        console.error('Error rendering chart.ejs:', err && err.stack ? err.stack : err);
        return res.status(500).send('Template render error. Check server logs.');
    }
});

/**
 * Proxy endpoint to TTN Storage Integration API
 * Fetches uplink messages from The Things Stack
 */
app.get('/api/data', async (req, res) => {
    try {
        const secret = await getAppSecret();

        // Get query parameters with defaults
        const last = req.query.last || '1h';
        const fieldMask = req.query.field_mask || 'up.uplink_message';

        const url = `https://${ttnCluster}.cloud.thethings.network/api/v3/as/applications/${ttnAppId}/packages/storage/uplink_message`;

        console.log('Fetching from TTN Storage Integration:', url);
        console.log('Parameters: last=' + last + ', field_mask=' + fieldMask);
        console.log('Using cluster:', ttnCluster, 'App ID:', ttnAppId);

        const resp = await axios.get(url, {
            params: {
                last: last,
                field_mask: fieldMask
            },
            headers: {
                'Accept': 'text/event-stream',
                'Authorization': `Bearer ${secret}`
            },
            responseType: 'text',
            validateStatus: null,
            timeout: 30000
        });

        console.log('TTN API Response Status:', resp.status);

        if (resp.status !== 200) {
            console.error(`TTN API returned status ${resp.status}`);
            console.error('Response:', resp.data);
            return res.status(resp.status).json({
                error: 'TTN API error',
                status: resp.status,
                details: resp.data
            });
        }

        // Parse the event stream format (newline-delimited JSON)
        const lines = resp.data.split('\n').filter(line => line.trim());
        const messages = [];

        for (const line of lines) {
            try {
                const parsed = JSON.parse(line);
                messages.push(parsed);
            } catch (e) {
                console.warn('Could not parse line:', line.substring(0, 100));
            }
        }

        console.log(`Successfully parsed ${messages.length} messages from TTN`);

        // Return as JSON array
        return res.json(messages);

    } catch (err) {
        console.error('Error fetching from TTN:', err.message);
        if (err.response) {
            console.error('Response status:', err.response.status);
            console.error('Response data:', err.response.data);
        }
        return res.status(502).json({
            error: 'Failed to fetch data from TTN',
            details: err.message,
            hint: 'Check if TTN_APP_ID, TTN_CLUSTER, and API key are correct'
        });
    }
});

// Dedicated endpoint for uplinks
app.get('/api/uplinks', async (req, res) => {
    try {
        const secret = await getAppSecret();

        const last = req.query.last || '1h';
        const fieldMask = req.query.field_mask || 'up.uplink_message';

        const url = `https://${ttnCluster}.cloud.thethings.network/api/v3/as/applications/${ttnAppId}/packages/storage/uplink_message?last=${last}&field_mask=${fieldMask}`;

        console.log('Fetching uplinks from:', url);

        const resp = await axios.get(url, {
            headers: {
                'Accept': 'text/event-stream',
                'Authorization': `Bearer ${secret}`
            },
            validateStatus: null,
            timeout: 30000
        });

        if (resp.status !== 200) {
            console.error(`TTN API returned status ${resp.status}`);
            return res.status(resp.status).json({ error: 'TTN API error', details: resp.data });
        }

        // Parse event stream to JSON array
        const lines = resp.data.split('\n').filter(line => line.trim());
        const messages = lines.map(line => {
            try {
                return JSON.parse(line);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        return res.json(messages);
    } catch (err) {
        console.error('Error fetching uplinks:', err.message);
        return res.status(502).json({
            error: 'Failed to fetch uplinks',
            details: err.message
        });
    }
});

// Debug endpoint - tests TTN V3 Storage Integration with detailed response
app.get('/api/debug', async (req, res) => {
    try {
        const secret = await getAppSecret();

        const last = req.query.last || '1h';
        const fieldMask = req.query.field_mask || 'up.uplink_message';
        const url = `https://${ttnCluster}.cloud.thethings.network/api/v3/as/applications/${ttnAppId}/packages/storage/uplink_message`;

        console.log('Debug: Testing URL:', url);
        console.log('Debug: Using cluster:', ttnCluster);
        console.log('Debug: Using app ID:', ttnAppId);

        const resp = await axios.get(url, {
            params: {
                last: last,
                field_mask: fieldMask
            },
            headers: {
                'Accept': 'text/event-stream',
                'Authorization': `Bearer ${secret}`
            },
            responseType: 'text',
            validateStatus: null,
            timeout: 30000
        });

        // Parse event stream
        let parsedMessages = [];
        if (resp.status === 200) {
            const lines = resp.data.split('\n').filter(line => line.trim());
            parsedMessages = lines.map(line => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    return { parseError: e.message, rawLine: line.substring(0, 200) };
                }
            });
        }

        return res.json({
            success: resp.status === 200,
            requestedUrl: url,
            cluster: ttnCluster,
            appId: ttnAppId,
            status: resp.status,
            statusText: resp.statusText,
            headers: resp.headers,
            rawDataLength: resp.data?.length || 0,
            rawDataPreview: resp.data?.substring(0, 500) || '',
            parsedMessageCount: parsedMessages.length,
            parsedMessages: parsedMessages.slice(0, 5),
            params: {
                last: last,
                field_mask: fieldMask
            }
        });
    } catch (err) {
        console.error('/api/debug error:', err && err.stack ? err.stack : err);
        return res.status(500).json({
            success: false,
            error: err.message || String(err),
            details: err.response?.data || null,
            responseStatus: err.response?.status || null
        });
    }
});

// Quick test endpoint
app.get('/api/test-ttn', async (req, res) => {
    try {
        const secret = await getAppSecret();
        const url = `https://${ttnCluster}.cloud.thethings.network/api/v3/applications/${ttnAppId}`;

        console.log('Testing TTN connection:', url);
        console.log('Using cluster:', ttnCluster);
        console.log('Using app ID:', ttnAppId);

        const resp = await axios.get(url, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${secret}`
            },
            validateStatus: null,
            timeout: 30000
        });

        return res.json({
            status: resp.status,
            success: resp.status === 200,
            message: resp.status === 200 ? 'Connection successful!' : 'Connection failed',
            url: url,
            cluster: ttnCluster,
            appId: ttnAppId,
            data: resp.data,
            headers: resp.headers
        });
    } catch (err) {
        console.error('Test TTN error:', err);
        return res.status(500).json({
            success: false,
            error: err.message,
            details: err.response?.data || null
        });
    }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));