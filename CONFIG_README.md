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

**Important Notes:**
- TTN Storage Integration API has a **1000 message limit** per request
- If your time range contains more than 1000 messages, the API returns the **oldest** messages first
- Consider reducing the time range if you're missing recent data
- The dashboard automatically samples data to 999 points for display (see Performance section)

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

**Note:** 
- Set to `0` or `null` to disable automatic data refresh
- Users can still manually refresh using `window._fetchAndRender()` in the browser console
- Auto-refresh pauses automatically when browser tab is hidden (saves resources)
- Server caches responses for 30 seconds (configurable in `app.js`)

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

**Performance Tip:** Hiding unused charts improves page load time and reduces memory usage.

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

**What the logger shows:**
- Configuration details
- Data fetch operations
- Cache hit/miss status
- Parsing statistics
- Data sampling information
- Error messages

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

**Note:** Debug messages are batched and debounced for performance (100ms delay).

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
- **Status**: Connected / Error / No Data
- **Data Points**: Total number of data points from TTN (before sampling)
- **Last Update**: Timestamp of last successful refresh

---

## Performance Features

### Automatic Data Sampling
The dashboard automatically downsamples large datasets for optimal performance:

- **Maximum display points**: 999 (configurable in `chart-logic.js`)
- **Trigger**: Automatically occurs when dataset exceeds 999 points
- **Algorithm**: Evenly spaced sampling with guaranteed inclusion of last point
- **Transparency**: Original count shown in status bar, sampling logged to console

**Example:**
```
Console: "Received 2500 messages"
Console: "Parsed 2500 data points"
Console: "Sampled 999 points from 2500"
Status Bar: "Data Points: 2500"
```

### Server-Side Caching
The server caches API responses to reduce load on TTN and improve performance:

- **Cache Duration**: 30 seconds (configurable in `app.js`)
- **Cache Key**: Based on request URL
- **Cache Headers**: Response includes `X-Cache: HIT` or `X-Cache: MISS`
- **Statistics**: Available via `/health` endpoint

### Client-Side Optimizations
- **Request Deduplication**: Prevents multiple simultaneous API calls
- **Visibility API**: Pauses updates when browser tab is hidden
- **Debounced Logging**: Batches debug messages (100ms delay)
- **Preconnect**: Establishes early connection to API
- **Fast Initial Load**: Charts render without animation on first load
- **Point Radius Optimization**: Hides chart points for datasets over 100 points

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

**Note:** 7 days of data may exceed TTN's 1000 message limit. Monitor the status bar and reduce time range if needed.

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

**Use Case:** Display dashboard on monitor without constant refreshing.

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

**Note:** Frequent updates (5s) may increase server load. Consider server-side cache settings.

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
   - Check Azure Portal > Deployment Center for status

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

4. **Check for errors in browser console**
   - Debug messages may be blocked by JavaScript errors

---

### No Data in Charts?

This is **not a configuration issue**. Check:

1. **TTN devices are sending data**
   - Log in to TTN Console
   - Check recent uplink messages

2. **API key is valid**
   - Test health endpoint: `/health`
   - Check Azure logs for authentication errors
   - Verify API key hasn't expired

3. **Time range matches data availability**
   - If `hoursBack: 0.5` but last message was 2 hours ago, no data will show
   - Increase `hoursBack` or wait for new messages

4. **TTN 1000 message limit**
   - If time range contains >1000 messages, API returns oldest first
   - Recent data may be missing
   - Reduce `hoursBack` to get more recent data

5. **Server logs**
   - Azure Portal > Log stream
   - Look for "Successfully parsed X messages"
   - Check for "KeyVault error" or "TTN API error"

---

### Data Appears But Charts Are Slow?

1. **Check if sampling is occurring**
   - Look for console message: "Sampled X points from Y"
   - If Y is very large (>2000), consider reducing `hoursBack`

2. **Verify cache is working**
   - Check response headers for `X-Cache: HIT`
   - Monitor `/health` endpoint for cache statistics

3. **Reduce visible charts**
   - Hide unused charts to improve performance
   - Each chart adds rendering overhead

4. **Check browser performance**
   - Open DevTools > Performance tab
   - Look for long tasks or memory issues
   - Try different browser if issues persist

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
pollIntervalMs: 1000,   // Too frequent, may impact server and TTN quota
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

**Consider time range vs data frequency:**
```javascript
// If devices send every 5 minutes
hoursBack: 24,  // ~288 messages (well under 1000 limit)

// If devices send every 30 seconds
hoursBack: 2,   // ~240 messages (safe)
hoursBack: 24,  // ~2880 messages (will hit 1000 limit!)
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
hoursBack: 168,  // 7 days (watch for 1000 message limit)
```

**Production settings:**
```javascript
// Clean, professional dashboard
showDebugLogger: false,
showStatusBar: true,
customTitle: "Production Sensors",
```

---

### Working with TTN's 1000 Message Limit

The TTN Storage Integration API returns a maximum of 1000 messages per request. Understanding this limit is crucial for configuration:

**How the limit works:**
- When your time range contains more than 1000 messages, the API returns the **oldest 1000 messages**
- This means recent data may be missing from your dashboard
- The status bar shows the number of messages received, not the total available

**Calculating messages in your time range:**
```javascript
// If device sends every 5 minutes:
// Messages per hour = 60 / 5 = 12
// Messages in 24h = 12 * 24 = 288 (safe)
// Messages in 7 days = 12 * 24 * 7 = 2016 (will hit limit)

// If device sends every 30 seconds:
// Messages per hour = 60 / 0.5 = 120
// Messages in 24h = 120 * 24 = 2880 (will hit limit)
// Messages in 1h = 120 (safe)
```

**Best practices:**
1. Calculate your expected message count based on device transmission interval
2. Set `hoursBack` to keep total messages under 1000
3. Monitor status bar to verify you're getting recent data
4. If you see old timestamps in charts, reduce `hoursBack`

**Example configurations:**

```javascript
// Device sends every 5 minutes
hoursBack: 72,  // ~864 messages - safe

// Device sends every 1 minute
hoursBack: 12,  // ~720 messages - safe

// Device sends every 30 seconds
hoursBack: 2,   // ~240 messages - safe
```

---

## Browser Console Debugging

### Inspect Current Configuration
```javascript
window._getConfig()
```

**Example Output:**
```javascript
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

### Manual Data Refresh
```javascript
window._fetchAndRender()
```

Triggers immediate data fetch from TTN API, bypassing the auto-refresh timer.

### Check Latest Data
```javascript
window._getLatestData()
```

Returns the raw JSON data from the last successful API call. Useful for debugging parsing issues.

### Clear Local Cache
```javascript
window._clearCache()
```

Clears client-side cached data and debug messages. Does not affect server-side cache.

### Example Debugging Session
```javascript
// 1. Check current config
window._getConfig()

// 2. Check what data we have
const data = window._getLatestData()
console.log('Messages:', data.length)

// 3. Force refresh
window._fetchAndRender()

// 4. Clear everything and start fresh
window._clearCache()
window._fetchAndRender()
```

---

## Security Note

**This is a client-side configuration file** served to browsers. Do not include:
- API keys
- Secrets
- Authentication tokens
- Database credentials
- Sensitive URLs
- Internal system information

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

**Q: Why is my data being downsampled to 999 points?**  
A: This is for performance optimization. The limit is set in `chart-logic.js` and can be adjusted if needed. Downsampling occurs automatically when datasets exceed 999 points.

**Q: How do I know if data is being sampled?**  
A: Check the browser console for messages like "Sampled 999 points from 2500". The status bar shows the original count before sampling.

**Q: Can I disable auto-refresh completely?**  
A: Yes, set `pollIntervalMs: 0` or `pollIntervalMs: null`. You can still refresh manually using `window._fetchAndRender()`.

**Q: Why does my dashboard pause when I switch tabs?**  
A: The dashboard uses the Visibility API to pause updates when the browser tab is hidden. This saves server resources and battery life. Updates resume automatically when you return to the tab.

---

## Complete Configuration Template

```javascript
// config.js - Client-Side Dashboard Configuration

export const CONFIG = {
    // === DATA FETCH SETTINGS ===
    
    // Hours of historical data to fetch from TTN
    // Consider TTN's 1000 message limit when setting this
    hoursBack: 72,
    
    // Auto-refresh interval in milliseconds
    // Set to 0 or null to disable auto-refresh
    // Server caches responses for 30 seconds
    pollIntervalMs: 30000,
    
    // Custom dashboard title
    // Leave null to auto-generate based on time range
    customTitle: null,


    // === CHART VISIBILITY ===
    
    charts: {
        temperature: true,    // Show temperature chart (3 sensors: DS18B20 x2, BME280)
        pressure: true,       // Show atmospheric pressure chart (BME280)
        humidity: true,       // Show humidity chart (BME280)
        distance: true,       // Show distance chart (ToF sensor)
        acceleration: true    // Show 3-axis acceleration chart
    },


    // === DEBUG/LOGGER SETTINGS ===
    
    // Show raw JSON logger section at bottom of page
    // Logs are debounced (100ms delay) for performance
    showDebugLogger: true,
    
    // Maximum number of messages to display in logger
    // Set to 0 for unlimited (not recommended)
    maxLoggerMessages: 5,


    // === UI CUSTOMIZATION ===
    
    // Show status bar at top (connection status, data points, last update)
    showStatusBar: true
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

## Advanced Configuration

### Modifying Data Sampling Limit

If you need to change the maximum number of displayed points (default: 999):

1. Edit `/public/chart-logic.js`
2. Find the `sampleData` function (around line 177)
3. Change the `maxPoints` parameter:

```javascript
// Default
function sampleData(dataPoints, maxPoints = 999) {

// Custom (e.g., 1500 points)
function sampleData(dataPoints, maxPoints = 1500) {
```

4. Update all calls to `sampleData` to use the new limit:

```javascript
// Line ~234
const displayPoints = sampleData(dataPoints, 1500);

// Line ~333
const displayPoints = sampleData(dataPoints, 1500);
```

**Note:** Higher limits may impact performance on slower devices.

---

### Modifying Server Cache Duration

If you need to change how long the server caches responses (default: 30 seconds):

1. Edit `/app.js`
2. Find the cache configuration (around line 15):

```javascript
// Default
const responseCache = new NodeCache({ 
    stdTTL: 30,  // Cache for 30 seconds
    checkperiod: 60 
});

// Custom (e.g., 2 minutes)
const responseCache = new NodeCache({ 
    stdTTL: 120,  // Cache for 2 minutes
    checkperiod: 60 
});
```

**Trade-offs:**
- Longer cache: Reduces TTN API calls, but data may be stale
- Shorter cache: More real-time data, but increases server load

---

### Modifying Secret Cache Duration

If you need to change how long Key Vault secrets are cached (default: 5 minutes):

1. Edit `/app.js`
2. Find the secret cache configuration (around line 32):

```javascript
// Default
const SECRET_CACHE_MS = 5 * 60 * 1000; // 5 minutes

// Custom (e.g., 10 minutes)
const SECRET_CACHE_MS = 10 * 60 * 1000; // 10 minutes
```

**Note:** Longer cache reduces Key Vault API calls but delays API key rotation.

---

## Related Files

### Files You Should Edit:
- `/public/config.js` - Dashboard configuration (edit frequently)
- `/public/chart-logic.js` - Chart styling and data sampling (edit occasionally)

### Files You Should NOT Edit (unless you know what you're doing):
- `/app.js` - Express server (contains caching and optimization logic)
- `/public/client-app.js` - Client application logic
- `/views/chart.ejs` - HTML template

---

## Getting Help

If you encounter issues:

1. **Check this documentation** - Most common issues are covered here
2. **Check browser console** - Use `window._getConfig()` to verify settings
3. **Check server logs** - Azure Portal > Log stream
4. **Test health endpoint** - Visit `/health` to check cache statistics
5. **Review main README** - See [README.md](README.md) for architecture details
6. **Open an issue** - Include configuration, error messages, and logs

---

**End of Configuration Guide**
