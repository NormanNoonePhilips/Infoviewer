# Dashboard Configuration Guide

**All dashboard settings are managed in `/public/config.js`**

This is a client-side configuration file served to the browser. Changes require redeployment but take effect immediately after the app restarts (typically 10-60 seconds).

---

## Configuration File Location

```
myExpressApp/public/config.js
```

This file is served as a static asset to the browser and controls all dashboard behavior.

---

## Data Fetch Settings

### `hoursBack`
- **Type:** `number`
- **Default:** `72`
- **Description:** Hours of historical data to fetch from TTN

**Examples:**
```javascript
hoursBack: 24,     // Last 24 hours
hoursBack: 168,    // Last week (7 days)
hoursBack: 2.75,   // Last 165 minutes (2 hours 45 minutes)
hoursBack: 0.5,    // Last 30 minutes
```

**Display format:**
- Less than 1 hour: Shows as minutes (e.g., `30m`)
- 1-23 hours: Shows as hours (e.g., `12h`)
- 24+ hours: Shows as days (e.g., `7d`)

---

### `pollIntervalMs`
- **Type:** `number`
- **Default:** `30000`
- **Description:** Auto-refresh interval in milliseconds

**Examples:**
```javascript
pollIntervalMs: 60000,  // Refresh every minute
pollIntervalMs: 10000,  // Refresh every 10 seconds
pollIntervalMs: 0,      // Disable auto-refresh
pollIntervalMs: null,   // Disable auto-refresh
```

**Note:** Set to `0` or `null` to disable automatic data refresh. Users can still manually refresh using `window._fetchAndRender()` in the browser console.

---

### `customTitle`
- **Type:** `string` or `null`
- **Default:** `null`
- **Description:** Custom dashboard title

**Examples:**
```javascript
customTitle: null,                          // Auto-generate title based on time range
customTitle: "Production Sensors",          // Simple custom title
customTitle: "Building A - Floor 3",        // Location-specific title
customTitle: "Development Environment",     // Environment indicator
```

When `null`, the dashboard automatically generates a title like:
```
Sensor Data Dashboard (Last 72h)
```

---

## Chart Visibility

Control which charts appear on the dashboard. Each chart can be individually enabled or disabled.

### `charts` Object

```javascript
charts: {
    temperature: true,    // Show temperature chart (3 sensors)
    pressure: true,       // Show atmospheric pressure chart
    humidity: true,       // Show humidity chart
    distance: true,       // Show distance (ToF) chart
    acceleration: true    // Show 3-axis acceleration chart
}
```

**Example - Hide distance and acceleration charts:**
```javascript
charts: {
    temperature: true,
    pressure: true,
    humidity: true,
    distance: false,      // Hidden
    acceleration: false   // Hidden
}
```

**Example - Temperature only:**
```javascript
charts: {
    temperature: true,
    pressure: false,
    humidity: false,
    distance: false,
    acceleration: false
}
```

---

## Debug Logger Settings

### `showDebugLogger`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Show/hide the raw JSON logger section at the bottom of the page

**Examples:**
```javascript
showDebugLogger: true,   // Show debug section
showDebugLogger: false,  // Hide debug section completely
```

---

### `maxLoggerMessages`
- **Type:** `number`
- **Default:** `5`
- **Description:** Maximum number of messages to display in the logger

**Examples:**
```javascript
maxLoggerMessages: 5,    // Show last 5 messages (default)
maxLoggerMessages: 10,   // Show last 10 messages
maxLoggerMessages: 0,    // Show unlimited messages (not recommended)
```

**Warning:** Setting to `0` shows all messages, which can:
- Cause performance issues with large datasets
- Use excessive memory on mobile devices
- Make the page slow to load

---

## UI Customization

### `showStatusBar`
- **Type:** `boolean`
- **Default:** `true`
- **Description:** Show/hide the status bar at the top of the dashboard

**Examples:**
```javascript
showStatusBar: true,   // Show status bar (connection status, data points, last update)
showStatusBar: false,  // Hide status bar completely
```

The status bar displays:
- Connection status (Connected/Error/No Data)
- Number of data points
- Last update timestamp

---

## Applying Changes

1. Edit `/public/config.js` in your project
2. Save the file
3. Redeploy the webapp to Azure
4. Wait for app restart (typically 10-60 seconds)
5. Clear browser cache if needed (Ctrl+Shift+R / Cmd+Shift+R)

**Note:** Changes take effect immediately after deployment - no server restart required beyond the automatic Azure deployment restart.

---

## Common Configuration Examples

### Example 1: Minimal Dashboard (Last 24h, Temperature Only)
```javascript
export const CONFIG = {
    hoursBack: 24,
    pollIntervalMs: 30000,
    customTitle: "Temperature Monitor",
    
    charts: {
        temperature: true,
        pressure: false,
        humidity: false,
        distance: false,
        acceleration: false
    },
    
    showDebugLogger: false,
    maxLoggerMessages: 5,
    showStatusBar: true
};
```

---

### Example 2: Production Monitoring (Long History, No Debug)
```javascript
export const CONFIG = {
    hoursBack: 168,  // 7 days
    pollIntervalMs: 60000,  // Every minute
    customTitle: "Production Environment",
    
    charts: {
        temperature: true,
        pressure: true,
        humidity: true,
        distance: true,
        acceleration: true
    },
    
    showDebugLogger: false,  // Hide debug in production
    maxLoggerMessages: 5,
    showStatusBar: true
};
```

---

### Example 3: Development Mode (All Features, Frequent Updates)
```javascript
export const CONFIG = {
    hoursBack: 12,
    pollIntervalMs: 10000,  // Every 10 seconds
    customTitle: "Development Dashboard",
    
    charts: {
        temperature: true,
        pressure: true,
        humidity: true,
        distance: true,
        acceleration: true
    },
    
    showDebugLogger: true,
    maxLoggerMessages: 10,  // More debug messages
    showStatusBar: true
};
```

---

### Example 4: Static Dashboard (No Auto-Refresh)
```javascript
export const CONFIG = {
    hoursBack: 72,
    pollIntervalMs: 0,  // Disabled
    customTitle: "Historical Data Archive",
    
    charts: {
        temperature: true,
        pressure: true,
        humidity: true,
        distance: true,
        acceleration: true
    },
    
    showDebugLogger: false,
    maxLoggerMessages: 5,
    showStatusBar: true
};
```

---

### Example 5: Short-Term Monitoring (Last 30 minutes)
```javascript
export const CONFIG = {
    hoursBack: 0.5,  // 30 minutes
    pollIntervalMs: 5000,  // Every 5 seconds
    customTitle: "Real-Time Monitor",
    
    charts: {
        temperature: true,
        pressure: true,
        humidity: true,
        distance: true,
        acceleration: true
    },
    
    showDebugLogger: true,
    maxLoggerMessages: 3,
    showStatusBar: true
};
```

---

## Troubleshooting

### Configuration Not Updating?

1. **Clear browser cache**
   - Chrome/Edge: Ctrl+Shift+R (Cmd+Shift+R on Mac)
   - Firefox: Ctrl+Shift+Delete
   
2. **Verify file is deployed**
   - Check file exists: `http://your-app.azurewebsites.net/config.js`
   - Should show JavaScript code, not 404 error
   
3. **Check browser console**
   ```javascript
   window._getConfig()  // Shows current configuration
   ```
   
4. **Wait for Azure deployment**
   - Deployments typically take 10-60 seconds
   - Check Azure Portal → Deployment Center for status

---

### Charts Not Appearing?

1. **Verify chart is enabled**
   ```javascript
   charts: {
       temperature: true,  // Must be true to show
       // ...
   }
   ```

2. **Check console for errors**
   - Open browser DevTools (F12)
   - Look for JavaScript errors in Console tab

3. **Verify canvas elements exist**
   - Charts need corresponding `<canvas>` elements in `chart.ejs`
   - Check browser console: `document.getElementById('temperatureChart')`

---

### Debug Logger Shows Nothing?

1. **Verify logger is enabled**
   ```javascript
   showDebugLogger: true
   ```

2. **Check if section is collapsed**
   - Click "Toggle Raw Data" button

3. **Verify data is being fetched**
   ```javascript
   window._fetchAndRender()  // Manual refresh
   window._getLatestData()   // Check raw data
   ```

---

### No Data in Charts?

This is **not a configuration issue**. Check:

1. **TTN devices are sending data**
   - Log in to TTN Console
   - Check recent uplink messages

2. **API key is valid**
   - Test endpoint: `/api/test-ttn`
   - Check Azure logs for authentication errors

3. **Time range matches data availability**
   - If `hoursBack: 0.5` but last message was 2 hours ago, no data will show
   - Increase `hoursBack` or wait for new messages

4. **Server logs**
   - Azure Portal → Log stream
   - Look for "Successfully parsed X messages"

---

## Tips and Best Practices

### Performance Optimization

**Balance refresh rate:**
```javascript
// Good for production
pollIntervalMs: 60000,  // Every minute

// Good for development
pollIntervalMs: 10000,  // Every 10 seconds

// Avoid very frequent polling
pollIntervalMs: 1000,   // Too frequent, may impact costs
```

**Hide unused charts:**
```javascript
// Better performance
charts: {
    temperature: true,
    pressure: false,  // Hidden
    humidity: false,  // Hidden
    distance: false,  // Hidden
    acceleration: false  // Hidden
}
```

**Limit debug messages:**
```javascript
// Good for mobile devices
maxLoggerMessages: 3,

// Good for desktop
maxLoggerMessages: 10,

// Avoid unlimited
maxLoggerMessages: 0,  // Not recommended
```

---

### User Experience

**Descriptive titles:**
```javascript
customTitle: "Building A - Floor 3",
customTitle: "Production Environment",
customTitle: "Development Dashboard",
```

**Appropriate time ranges:**
```javascript
// Real-time monitoring
hoursBack: 1,

// Recent trends
hoursBack: 24,

// Historical analysis
hoursBack: 168,  // 7 days
```

**Production settings:**
```javascript
// Clean, professional dashboard
showDebugLogger: false,
showStatusBar: true,
customTitle: "Production Sensors",
```

---

## Browser Console Debugging

### Inspect Current Configuration
```javascript
window._getConfig()
```

### Manual Data Refresh
```javascript
window._fetchAndRender()
```

### Check Latest Data
```javascript
window._getLatestData()
```

### Example Output
```javascript
> window._getConfig()
{
  hoursBack: 72,
  pollIntervalMs: 30000,
  customTitle: null,
  charts: { temperature: true, pressure: true, ... },
  showDebugLogger: true,
  maxLoggerMessages: 5,
  showStatusBar: true
}
```

---

## Security Note

**This is a client-side configuration file** served to browsers. Do not include:
- API keys
- Secrets
- Authentication tokens
- Database credentials
- Sensitive URLs

Server configuration (TTN credentials, Azure settings) is managed via environment variables in Azure Portal.

---

## FAQ

**Q: Do I need to restart the server after changing config.js?**  
A: No, but you must redeploy the file. Azure will automatically restart (10-60 seconds).

**Q: Can I change settings while the app is running?**  
A: Yes, edit config.js and redeploy. Changes take effect after the automatic restart.

**Q: What happens if I delete a setting?**  
A: The app will use the default value shown in this documentation.

**Q: Can I use different settings for dev/staging/production?**  
A: Yes. Deploy different versions of config.js to each environment, or use environment-specific branches.

**Q: How do I test changes locally?**  
A: Edit config.js locally, run `node app.js`, and open `http://localhost:3000`

**Q: Can I change chart colors via configuration?**  
A: No. Colors are defined in `chart-logic.js`. Edit that file to change visual styling.

**Q: Why use client-side configuration instead of server-side?**  
A: Client-side config allows faster iteration without server restarts and keeps dashboard behavior visible in the browser.

---

## Complete Configuration Template

```javascript
// config.js - Client-Side Dashboard Configuration

export const CONFIG = {
    // === DATA FETCH SETTINGS ===
    hoursBack: 72,           // Hours of historical data to fetch
    pollIntervalMs: 30000,   // Auto-refresh interval (ms), 0 to disable
    customTitle: null,       // Custom title or null for auto-generate

    // === CHART VISIBILITY ===
    charts: {
        temperature: true,   // Show temperature chart (3 sensors)
        pressure: true,      // Show atmospheric pressure chart
        humidity: true,      // Show humidity chart
        distance: true,      // Show distance (ToF) chart
        acceleration: true   // Show 3-axis acceleration chart
    },

    // === DEBUG/LOGGER SETTINGS ===
    showDebugLogger: true,   // Show raw JSON logger section
    maxLoggerMessages: 5,    // Max debug messages (0 = unlimited)

    // === UI CUSTOMIZATION ===
    showStatusBar: true      // Show status bar at top
};

// Helper function to get the time range string
export function getTimeRangeLabel() {
    const h = CONFIG.hoursBack;
    if (h < 1) {
        const minutes = Math.round(h * 60);
        return `${minutes}m`;
    } else if (h < 24) {
        if (h % 1 !== 0) {
            return `${h.toFixed(2)}h`;
        }
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

// Expose functions globally for debugging
window._getConfig = () => CONFIG;

// Log configuration on load
console.log('Dashboard configuration loaded:', CONFIG);
console.log('Time range:', getTimeRangeLabel());
```

---

**End of Configuration Guide**
