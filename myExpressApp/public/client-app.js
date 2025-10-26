// client-app.js (client-side module)
// Main entry point: fetches data, updates charts and UI

import { CONFIG, getDashboardTitle, getTimeRangeLabel } from './config.js';
import {
    createCharts,
    parseSensorData,
    updateCharts,
    createEmptyCharts,
    updateStatusBar,
    showError,
    clearError
} from './chart-logic.js';

const DATA_URL = '/api/data';

let latestData = null;
let debugMessages = [];

function applyUIConfiguration() {
    // Set dashboard title
    const titleEl = document.getElementById('dashboardTitle');
    if (titleEl) {
        titleEl.textContent = getDashboardTitle();
    }

    const subtitleEl = document.getElementById('dashboardSubtitle');
    if (subtitleEl) {
        subtitleEl.textContent = `Real-time monitoring of environmental and motion sensors (Last ${getTimeRangeLabel()})`;
    }

    // Hide/show status bar
    const statusBar = document.getElementById('statusBar');
    if (statusBar && !CONFIG.showStatusBar) {
        statusBar.classList.add('hidden');
    }

    // Hide/show data warning (same visibility as status bar)
    const dataWarning = document.getElementById('dataWarning');
    if (dataWarning && !CONFIG.showStatusBar) {
        dataWarning.classList.add('hidden');
    }

    // Hide/show charts based on config
    const chartCards = {
        temperature: document.getElementById('card-temperature'),
        pressure: document.getElementById('card-pressure'),
        humidity: document.getElementById('card-humidity'),
        distance: document.getElementById('card-distance'),
        acceleration: document.getElementById('card-acceleration')
    };

    Object.entries(chartCards).forEach(([key, element]) => {
        if (element && !CONFIG.charts[key]) {
            element.classList.add('hidden');
        }
    });

    // Hide/show debug section
    const debugSection = document.getElementById('debugSection');
    if (debugSection && !CONFIG.showDebugLogger) {
        debugSection.classList.add('hidden');
    }
}

function logDebug(message, data = null) {
    if (!CONFIG.showDebugLogger) return;

    console.log(message, data || '');

    const debugEl = document.getElementById('debugContent');
    if (!debugEl) return;

    const timestamp = new Date().toLocaleTimeString('it-IT');
    const logEntry = {
        timestamp,
        message,
        data
    };

    // Add to message array
    debugMessages.push(logEntry);

    // Trim array if we have a limit set
    if (CONFIG.maxLoggerMessages > 0 && debugMessages.length > CONFIG.maxLoggerMessages) {
        debugMessages = debugMessages.slice(-CONFIG.maxLoggerMessages);
    }

    // Rebuild the entire debug content
    let fullContent = '';
    for (const entry of debugMessages) {
        fullContent += `[${entry.timestamp}] ${entry.message}\n`;
        if (entry.data) {
            fullContent += JSON.stringify(entry.data, null, 2) + '\n\n';
        }
    }

    debugEl.textContent = fullContent;

    // Auto-scroll to bottom
    debugEl.scrollTop = debugEl.scrollHeight;
}

async function fetchAndRender() {
    try {
        clearError();

        // Build query parameters using config
        const params = new URLSearchParams({
            'last': `${CONFIG.hoursBack}h`,
            'field_mask': 'up.uplink_message'
        });

        const url = `${DATA_URL}?${params.toString()}`;
        logDebug(`Fetching data from TTN (last ${CONFIG.hoursBack}h = ${getTimeRangeLabel()})...`);

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

        const rawData = await resp.json();
        latestData = rawData;

        logDebug(`Received ${rawData.length} messages from TTN`);

        // Show limited sample in debug logger if configured
        if (CONFIG.showDebugLogger && CONFIG.maxLoggerMessages > 0) {
            const sampleSize = Math.min(CONFIG.maxLoggerMessages, rawData.length);
            const sample = rawData.slice(-sampleSize);
            logDebug(`Showing last ${sampleSize} of ${rawData.length} messages:`, sample);
        } else if (CONFIG.showDebugLogger) {
            logDebug('Full raw data:', rawData);
        }

        // Parse sensor data from TTN messages
        const dataPoints = parseSensorData(rawData);

        if (!dataPoints || dataPoints.length === 0) {
            logDebug('No valid sensor data found in messages - displaying empty charts');

            // Create empty charts with current timestamp
            createEmptyCharts();
            updateStatusBar([], 'No Data');

            showError('No sensor data available in the selected time range. Charts are empty.');
            return;
        }

        logDebug(`Parsed ${dataPoints.length} data points`);

        // Update charts with real data
        updateCharts(dataPoints);
        updateStatusBar(dataPoints, 'Connected');

    } catch (err) {
        console.error('Failed to fetch/parse data:', err);
        logDebug('ERROR: ' + err.message);

        // Create empty charts on error too
        createEmptyCharts();
        updateStatusBar([], 'Error');

        showError(`Failed to load data: ${err.message}`);
    }
}

function start() {
    console.log('Starting dashboard with configuration:', CONFIG);

    // Apply UI configuration
    applyUIConfiguration();

    logDebug('Initializing sensor dashboard...');
    logDebug('Configuration:', CONFIG);
    logDebug(`Time range: ${getTimeRangeLabel()}`);

    // Create all charts (only enabled ones will be created)
    createCharts();
    logDebug('Charts initialized');

    // Fetch initial data
    logDebug(`Fetching initial data (last ${getTimeRangeLabel()})...`);
    fetchAndRender();

    // Set up polling if enabled
    if (CONFIG.pollIntervalMs && CONFIG.pollIntervalMs > 0) {
        logDebug(`Auto-refresh enabled: every ${CONFIG.pollIntervalMs / 1000} seconds`);
        setInterval(fetchAndRender, CONFIG.pollIntervalMs);
    } else {
        logDebug('Auto-refresh disabled');
    }

    // Expose for manual refresh
    window._fetchAndRender = fetchAndRender;
    window._getLatestData = () => latestData;

    logDebug('Dashboard ready! Manual refresh: window._fetchAndRender()');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}