'use strict';

// npm install express @azure/identity @azure/keyvault-secrets node-fetch
const express = require('express');
const path = require('path');

// Required non-secret config in App Settings
const keyVaultName = process.env.KEY_VAULT_NAME;
const secretName = process.env.TTN_SECRET_NAME || 'editions-app-key-first';
const ttnAppId = process.env.TTN_APP_ID || 'IDpcb-test-1';
const ttnBaseUrl = 'https://${ttnAppId}.data.thethingsnetwork.org';

const { DefaultAzureCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const credential = new DefaultAzureCredential();
const vaultUrl = 'https://${keyVaultName}.vault.azure.net';
const secretClient = new SecretClient(vaultUrl, credential);

// small in-memory cache to avoid hitting Key Vault on every request
let cachedSecretValue = null;
let cachedAt = 0;
const SECRET_CACHE_MS = 60 * 1000; // 60s

if (!keyVaultName) {
    console.error('KEY_VAULT_NAME must be set in App Settings');
    process.exit(1);
}

process.on('unhandledRejection', err => {
    console.error('Unhandled promise rejection:', err);
});

// Serve the EJS or HTML
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'views')));

app.get('/', (req, res) => {
    try {
        return res.render('chart'); // will load chart.ejs from views/chart.ejs
    } catch (err) {
        console.error('Error rendering chart.ejs:', err && err.stack ? err.stack : err);
        return res.status(500).send('Template render error. Check server logs.');
    }
});

/**
 * Retrieve the application secret from Azure Key Vault with a short in-memory TTL cache.
 *
 * Behavior:
 * - Returns a cached secret immediately if one exists and the cache TTL (SECRET_CACHE_MS)
 *   has not expired.
 * - Otherwise fetches the secret from Key Vault using 'secretClient.getSecret(secretName)',
 *   updates the in-memory cache ('cachedSecretValue') and the timestamp ('cachedAt'),
 *   and returns the secret value.
 *
 * Inputs / external state:
 * - Reads 'secretName' and the shared 'secretClient' (Azure Key Vault client).
 * - Uses module-level variables 'cachedSecretValue', 'cachedAt', and 'SECRET_CACHE_MS'.
 *
 * Returns:
 * - A Promise that resolves to the secret string.
 *
 * Error handling:
 * - Errors from the Key Vault call are logged and rethrown as a generic Error with
 *   the original message included. Note: this wraps the original error which may
 *   hide the original stack/type; consider preserving the original error using
 *   'throw err' or the 'cause' option in newer Node versions for better diagnostics.
 */
async function getAppSecret() {
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

/**
 * Proxy endpoint
 * Example usage (frontend): fetch('/api/data?path=/api/v2/query/mydevice&last=24h')
 * We'll forward path+query to TTN; you can tighten this logic (allow-list paths, validate params).
 */
app.get('/api/data', async (req, res) => {
    app.get('/api/data', async (req, res) => {
        try {
            // get secret (this function should exist in your file)
            const secret = await getAppSecret();

            // build target URL (avoid naming this 'path' — we use pathParam)
            const pathParam = req.query.path || '/api/v2/query/';
            const qs = new URLSearchParams(req.query);
            qs.delete('path');

            const url = `${ttnBaseUrl}${pathParam}${qs.toString() ? '?' + qs.toString() : ''}`;
            console.log('Fetching external URL:', url);

            const resp = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `key ${secret}`
                },
                method: 'GET'
            });

            // read response body as text first
            const text = await resp.text();

            // If HTTP status is not OK, try to parse JSON and return with the same status;
            // otherwise return raw text with the original status.
            if (!resp.ok) {
                console.error(`External API returned status ${resp.status}`);
                try {
                    const json = JSON.parse(text);
                    return res.status(resp.status).json(json);
                } catch {
                    return res.status(resp.status).send(text);
                }
            }

            // resp.ok -> try to parse JSON, if parse fails return text
            try {
                const json = JSON.parse(text);
                // Optionally: sanitize/normalize before returning
                return res.json(json);
            } catch {
                // If it's not JSON, forward the plain text (200)
                return res.status(200).send(text);
            }
        } catch (err) {
            // Top-level errors (Key Vault, network, unexpected)
            console.error('Error fetching external API:', err.message || err);
            if (err.response) {
                console.error('Status:', err.response.status);
                console.error('Body:', err.response.data);
            }
            return res.status(502).json({
                error: 'Failed to fetch data from external API',
                details: err.message,
                status: err.response?.status || null
            });
        }
    });
});

app.listen(PORT, () => console.log('Server listening on ${PORT}'));
