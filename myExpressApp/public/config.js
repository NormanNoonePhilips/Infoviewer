// config.js - Client-Side Dashboard Configuration
// Edit these values directly to customize your dashboard

export const CONFIG = {
    // === DATA FETCH SETTINGS ===

    // How many hours of data to fetch from TTN (default: 72)
    hoursBack: 2.75,  // 165 minutes converted to hours

    // Auto-refresh interval in milliseconds (30000 = 30 seconds)
    // Set to 0 or null to disable auto-refresh
    // Default: 30000
    pollIntervalMs: 30000,

    // Custom dashboard title (leave null to auto-generate)
    // Default: null
    customTitle: null,  // e.g., "Production Sensors - Building A"


    // === CHART VISIBILITY ===

    charts: {
        temperature: true,    // Show temperature chart (3 sensors)
        pressure: true,       // Show atmospheric pressure chart
        humidity: true,       // Show humidity chart
        distance: true,       // Show distance (ToF) chart
        acceleration: true    // Show 3-axis acceleration chart
    },


    // === DEBUG/LOGGER SETTINGS ===

    // Show the raw JSON logger section
    // Default: true
    showDebugLogger: true,

    // Maximum number of JSON messages to display in the logger
    // Set to 0 for unlimited (not recommended for large datasets)
    // Default: 5
    maxLoggerMessages: 5,


    // === UI CUSTOMIZATION ===

    // Show status bar (connection status, data points, last update)
    // Default: true
    showStatusBar: true
};

// Helper function to get the time range string
export function getTimeRangeLabel() {
    const h = CONFIG.hoursBack;

    // If less than 1 hour, show minutes
    if (h < 1) {
        const minutes = Math.round(h * 60);
        return `${minutes}m`;
    }
    // If less than 24 hours, show hours
    else if (h < 24) {
        // Show decimal if not a whole number
        if (h % 1 !== 0) {
            return `${h.toFixed(2)}h`;
        }
        return `${h}h`;
    }
    // If 24 hours exactly
    else if (h === 24) {
        return '24h';
    }
    // If more than 24 hours, show days and hours
    else {
        const days = Math.floor(h / 24);
        const remainingHours = h % 24;
        if (remainingHours === 0) {
            return `${days}d`;
        }
        return `${days}d ${remainingHours}h`;
    }
}

// Helper function to get the dashboard title
export function getDashboardTitle() {
    if (CONFIG.customTitle) {
        return CONFIG.customTitle;
    }
    return `Sensor Data Dashboard (Last ${getTimeRangeLabel()})`;
}

// Expose functions globally for debugging
window._getConfig = () => CONFIG;

// Log configuration on load
console.log('Dashboard configuration loaded:', CONFIG);
console.log('Time range:', getTimeRangeLabel());