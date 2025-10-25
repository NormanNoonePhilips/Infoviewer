// client-app.js (client-side module)
// Main entry point: fetches data, updates charts and UI

import { CONFIG, getDashboardTitle, getTimeRangeLabel } from './config.js';
import { 
    createCharts, 
    parseSensorData, 
    updateCharts, 
    updateStatusBar,
    showError,
    clearError
} from './chart-logic.js';

const DATA_URL = '/api/data';

let latestData = null;
let debugMessageCount = 0;

function applyUIConfiguration() {
    // Set dashboard title
    const titleEl = document.getElementById('dashboardTitle');
    if (titleEl) {
        titleEl.textContent = '🌡️ ' + getDashboardTitle();
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
    const logLine = `[${timestamp}] ${message}\n`;
    
    // Check if we need to limit messages
    if (CONFIG.maxLoggerMessages > 0) {
        debugMessageCount++;
        
        // Clear old messages if we exceed the limit
        if (debugMessageCount > CONFIG.maxLoggerMessages) {
            const lines = debugEl.textContent.split('\n');
            // Keep only the most recent messages
            const linesToKeep = CONFIG.maxLoggerMessages * 3; // Rough estimate (message + data + blank line)
            if (lines.length > linesToKeep) {
                debugEl.textContent = lines.slice(-linesToKeep).join('\n');
            }
        }
    }
    
    debugEl.textContent += logLine;
    
    if (data) {
        const dataStr = JSON.stringify(data, null, 2);
        debugEl.textContent += dataStr + '\n\n';
    }
    
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
        logDebug(`Fetching data from TTN (last ${CONFIG.hoursBack}h)...`);

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
            logDebug('No valid sensor data found in messages');
            updateStatusBar([], 'No Data');
            showError('No sensor data available. Check if devices are sending data.');
            return;
        }

        logDebug(`Parsed ${dataPoints.length} data points`);

        // Update charts
        updateCharts(dataPoints);
        updateStatusBar(dataPoints, 'Connected');

    } catch (err) {
        console.error('Failed to fetch/parse data:', err);
        logDebug('ERROR: ' + err.message);
        
        updateStatusBar([], 'Error');
        showError(`Failed to load data: ${err.message}`);
    }
}

function start() {
    // Apply UI configuration first
    applyUIConfiguration();
    
    logDebug('Initializing sensor dashboard...');
    logDebug('Configuration:', CONFIG);
    
    // Create all charts (only enabled ones will be created)
    createCharts();
    logDebug('Charts initialized');
    
    // Fetch initial data
    logDebug(`Fetching initial data (last ${CONFIG.hoursBack}h)...`);
    fetchAndRender();
    
    // Set up polling if enabled
    if (CONFIG.pollIntervalMs) {
        logDebug(`Auto-refresh enabled: every ${CONFIG.pollIntervalMs/1000} seconds`);
        setInterval(fetchAndRender, CONFIG.pollIntervalMs);
    } else {
        logDebug('Auto-refresh disabled');
    }
    
    // Expose for manual refresh
    window._fetchAndRender = fetchAndRender;
    window._getLatestData = () => latestData;
    window._getConfig = () => CONFIG;
    
    logDebug('Dashboard ready! Manual refresh: window._fetchAndRender()');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}