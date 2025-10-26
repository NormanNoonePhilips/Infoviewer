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
let fetchController = null; // For aborting requests
let isFirstLoad = true;

// Debounced Logging
let debugLogQueue = [];
let debugLogTimer = null;

function flushDebugLogs() {
    if (!CONFIG.showDebugLogger || debugLogQueue.length === 0) return;

    const debugEl = document.getElementById('debugContent');
    if (!debugEl) return;

    // Batch update DOM only once
    debugMessages.push(...debugLogQueue);

    if (CONFIG.maxLoggerMessages > 0 && debugMessages.length > CONFIG.maxLoggerMessages) {
        debugMessages = debugMessages.slice(-CONFIG.maxLoggerMessages);
    }

    let fullContent = '';
    for (const entry of debugMessages) {
        fullContent += `[${entry.timestamp}] ${entry.message}\n`;
        if (entry.data) {
            fullContent += JSON.stringify(entry.data, null, 2) + '\n\n';
        }
    }

    debugEl.textContent = fullContent;
    debugEl.scrollTop = debugEl.scrollHeight;

    debugLogQueue = [];
}

function logDebug(message, data = null) {
    if (!CONFIG.showDebugLogger) return;

    console.log(message, data || '');

    const timestamp = new Date().toLocaleTimeString('it-IT');
    debugLogQueue.push({ timestamp, message, data });

    // Debounce DOM updates
    clearTimeout(debugLogTimer);
    debugLogTimer = setTimeout(flushDebugLogs, 100);
}

// Request Deduplication
let pendingRequest = null;

async function fetchAndRender() {
    // If there's already a request in flight, return that promise
    if (pendingRequest) {
        logDebug('Request already in progress, waiting...');
        return pendingRequest;
    }

    // Abort any previous request
    if (fetchController) {
        fetchController.abort();
    }

    fetchController = new AbortController();

    pendingRequest = (async () => {
        try {
            clearError();

            const params = new URLSearchParams({
                'last': `${CONFIG.hoursBack}h`,
                'field_mask': 'up.uplink_message'
            });

            const url = `${DATA_URL}?${params.toString()}`;

            if (isFirstLoad) {
                logDebug(`Initial fetch from TTN (last ${getTimeRangeLabel()})...`);
                isFirstLoad = false;
            }

            const resp = await fetch(url, {
                cache: 'no-store',
                headers: { 'Accept': 'application/json' },
                signal: fetchController.signal
            });

            if (!resp.ok) {
                const errorText = await resp.text();
                throw new Error(`HTTP ${resp.status}: ${errorText}`);
            }

            const rawData = await resp.json();
            latestData = rawData;

            // Log cache status
            const cacheStatus = resp.headers.get('X-Cache');
            if (cacheStatus) {
                logDebug(`Cache status: ${cacheStatus}`);
            }

            logDebug(`Received ${rawData.length} messages`);

            // Data Parsing
            const dataPoints = parseSensorData(rawData);

            if (!dataPoints || dataPoints.length === 0) {
                logDebug('No valid sensor data - displaying empty charts');

                // Use requestAnimationFrame for DOM updates
                requestAnimationFrame(() => {
                    createEmptyCharts();
                    updateStatusBar([], 'No Data');
                    showError('No sensor data available in the selected time range.');
                });
                return;
            }

            logDebug(`Parsed ${dataPoints.length} data points`);

            // Batch DOM Updates
            requestAnimationFrame(() => {
                updateCharts(dataPoints);
                updateStatusBar(dataPoints, 'Connected');
            });

        } catch (err) {
            if (err.name === 'AbortError') {
                logDebug('Request aborted');
                return;
            }

            console.error('Failed to fetch/parse data:', err);
            logDebug('ERROR: ' + err.message);

            requestAnimationFrame(() => {
                createEmptyCharts();
                updateStatusBar([], 'Error');
                showError(`Failed to load data: ${err.message}`);
            });
        } finally {
            pendingRequest = null;
            fetchController = null;
        }
    })();

    return pendingRequest;
}

// UI Updates
function applyUIConfiguration() {
    // Batch all DOM reads/writes
    const elements = {
        title: document.getElementById('dashboardTitle'),
        subtitle: document.getElementById('dashboardSubtitle'),
        statusBar: document.getElementById('statusBar'),
        dataWarning: document.getElementById('dataWarning'),
        debugSection: document.getElementById('debugSection'),
        charts: {
            temperature: document.getElementById('card-temperature'),
            pressure: document.getElementById('card-pressure'),
            humidity: document.getElementById('card-humidity'),
            distance: document.getElementById('card-distance'),
            acceleration: document.getElementById('card-acceleration')
        }
    };

    // Single style recalculation
    requestAnimationFrame(() => {
        if (elements.title) {
            elements.title.textContent = getDashboardTitle();
        }

        if (elements.subtitle) {
            elements.subtitle.textContent =
                `Real-time monitoring of environmental and motion sensors (Last ${getTimeRangeLabel()})`;
        }

        if (elements.statusBar && !CONFIG.showStatusBar) {
            elements.statusBar.classList.add('hidden');
        }

        if (elements.dataWarning && !CONFIG.showStatusBar) {
            elements.dataWarning.classList.add('hidden');
        }

        Object.entries(elements.charts).forEach(([key, element]) => {
            if (element && !CONFIG.charts[key]) {
                element.classList.add('hidden');
            }
        });

        if (elements.debugSection && !CONFIG.showDebugLogger) {
            elements.debugSection.classList.add('hidden');
        }
    });
}

// Visibility API for Power Saving
let pollInterval = null;

function startPolling() {
    if (CONFIG.pollIntervalMs && CONFIG.pollIntervalMs > 0) {
        logDebug(`Auto-refresh enabled: every ${CONFIG.pollIntervalMs / 1000}s`);
        pollInterval = setInterval(fetchAndRender, CONFIG.pollIntervalMs);
    } else {
        logDebug('Auto-refresh disabled');
    }
}

function stopPolling() {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

// Pause updates when page is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        logDebug('Page hidden - pausing updates');
        stopPolling();
    } else {
        logDebug('Page visible - resuming updates');
        fetchAndRender(); // Immediate update
        startPolling();
    }
});

// Preconnect to API
function preconnectAPI() {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = window.location.origin;
    document.head.appendChild(link);
}

function start() {
    console.log('Starting dashboard with configuration:', CONFIG);

    preconnectAPI();
    applyUIConfiguration();

    logDebug('Initializing sensor dashboard...');
    logDebug('Configuration:', CONFIG);

    createCharts();
    logDebug('Charts initialized');

    fetchAndRender();
    startPolling();

    // Expose for manual operations
    window._fetchAndRender = fetchAndRender;
    window._getLatestData = () => latestData;
    window._clearCache = () => {
        latestData = null;
        debugMessages = [];
        logDebug('Cache cleared');
    };

    logDebug('Dashboard ready!');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}