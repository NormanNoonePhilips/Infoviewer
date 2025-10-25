// config.js - Dashboard Configuration
// Edit these values to customize your dashboard behavior

export const CONFIG = {
    // === DATA FETCH SETTINGS ===

    // How many hours of data to fetch from TTN
    // This affects both the title display and the API query
    // Default: 72
    hoursBack: 72,

    // Auto-refresh interval in milliseconds (30000 = 30 seconds)
    // Set to null to disable auto-refresh
    // Default: 30000
    pollIntervalMs: 30000,


    // === CHART VISIBILITY ===

    charts: {
        temperature: true,    // Show temperature chart (3 sensors) - Default: true
        pressure: true,       // Show atmospheric pressure chart - Default: true
        humidity: true,       // Show humidity chart - Default: true
        distance: true,       // Show distance (ToF) chart - Default: true
        acceleration: true    // Show 3-axis acceleration chart - Default: true
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

    // Dashboard title (leave null to auto-generate from hoursBack)
    // Default: null
    customTitle: null,  // e.g., "My Sensor Dashboard"

    // Show status bar (connection status, data points, last update)
    // Default: true
    showStatusBar: true
};

// Helper function to get the time range string
export function getTimeRangeLabel() {
    const h = CONFIG.hoursBack;
    if (h < 24) {
        return `${h}h`;
    } else if (h === 24) {
        return '24h';
    } else {
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