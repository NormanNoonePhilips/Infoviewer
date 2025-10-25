// client-app.js (client-side module)
// Boots charts, fetches /api/data, handles polling and logging.

import { createCharts, normalizeJson, updateCharts } from './chart-logic.js';

const DATA_URL = '/api/data';
const POLL_INTERVAL_MS = 30000; // 30 seconds - set to null to disable

function log(msg, isError = false) {
    console[isError ? 'error' : 'log'](msg);
    const p = document.getElementById('rawJson');
    if (p) p.textContent += (isError ? 'ERROR: ' : '') + msg + '\n';
}

async function fetchAndRender() {
    const rawEl = document.getElementById('rawJson');
    try {
        // Build query parameters
        const params = new URLSearchParams({
            'last': '72h',
            'field_mask': 'up.uplink_message'
        });

        const url = `${DATA_URL}?${params.toString()}`;

        log('Fetching data from ' + url + ' ...');

        if (rawEl) rawEl.textContent = 'Loading...';

        const resp = await fetch(url, { 
            cache: 'no-store',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!resp.ok) {
            const errorText = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${errorText}`);
        }

        const text = await resp.text();

        try {
            const json = JSON.parse(text);
            
            // Show raw JSON
            if (rawEl) rawEl.textContent = JSON.stringify(json, null, 2);
            
            // Check if we got data
            if (!json || (Array.isArray(json) && json.length === 0)) {
                log('No data returned from TTN. This might be normal if there are no recent uplinks.', false);
            } else {
                log(`Received ${Array.isArray(json) ? json.length : 1} message(s) from TTN`);
            }
            
            // Normalize and update charts
            const normalized = normalizeJson(json);
            updateCharts(normalized);
            log('Charts updated â€" ' + new Date().toLocaleTimeString());
            
        } catch (parseErr) {
            if (rawEl) rawEl.textContent = text;
            log('Response is not valid JSON â€" using fallback data. (' + parseErr.message + ')', true);
            const normalized = normalizeJson();
            updateCharts(normalized);
        }

    } catch (err) {
        console.error('Failed to fetch/parse data:', err);
        log('Failed to load data: ' + (err && err.message), true);
        if (rawEl) rawEl.textContent = 'Error: ' + (err && err.message);
        
        // Use fallback data
        const normalized = normalizeJson();
        updateCharts(normalized);
    }
}

function start() {
    log('Initializing charts...');
    createCharts();
    
    log('Fetching initial data...');
    fetchAndRender();
    
    if (POLL_INTERVAL_MS) {
        log(`Polling enabled: will refresh every ${POLL_INTERVAL_MS/1000} seconds`);
        setInterval(fetchAndRender, POLL_INTERVAL_MS);
    }
    
    // Expose for manual refresh
    window._fetchAndRender = fetchAndRender;
    log('Ready! You can manually refresh by calling window._fetchAndRender() in the console.');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}