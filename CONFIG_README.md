# Dashboard Configuration Guide

---

## Data Fetch Settings

| **Setting**               | **Type** | **Default** | **Description                        |
| ------------------------- | -------: | ----------: | ------------------------------------ |
| `DASHBOARD_HOURS_BACK`    |   number |          72 | Hours of historical data to fetch    |
| `DASHBOARD_POLL_INTERVAL` |   number |       30000 | Auto-refresh interval (milliseconds) |
| `DASHBOARD_CUSTOM_TITLE`  |   string |        null | Custom dashboard title               |

**Examples:**

```text
DASHBOARD_HOURS_BACK = 24    # Last 24 hours
DASHBOARD_HOURS_BACK = 168   # Last week
DASHBOARD_POLL_INTERVAL = 60000   # Refresh every minute
DASHBOARD_POLL_INTERVAL = 0       # Disable auto-refresh
DASHBOARD_CUSTOM_TITLE = Production Sensors
```

## Chart Visibility

Control which charts appear. Set to `false` (string or boolean) to hide a chart.

| **Setting**          | **Default** | **Description**                    |
| -------------------- | ----------: | ---------------------------------- |
| `CHART_TEMPERATURE`  |        true | Show temperature chart (3 sensors) |
| `CHART_PRESSURE`     |        true | Show atmospheric pressure chart    |
| `CHART_HUMIDITY`     |        true | Show humidity chart                |
| `CHART_DISTANCE`     |        true | Show distance (ToF) chart          |
| `CHART_ACCELERATION` |        true | Show 3-axis acceleration chart     |

**Example - Hide distance and acceleration charts:**

```text
CHART_DISTANCE = false
CHART_ACCELERATION = false
```

## Debug Logger Settings

| **Setting**           | **Type** | **Default** | **Description**           |
| --------------------- | -------: | ----------: | ------------------------- |
| `SHOW_DEBUG_LOGGER`   |  boolean |        true | Show/hide raw JSON logger |
| `MAX_LOGGER_MESSAGES` |   number |           5 | Max messages to display   |

**Examples:**

```text
SHOW_DEBUG_LOGGER = false   # Hide debug section completely
MAX_LOGGER_MESSAGES = 10
MAX_LOGGER_MESSAGES = 0     # Show unlimited (not recommended)
```

## UI Customization

| **Setting**       | **Default** | **Description**        |
| ----------------- | ----------: | ---------------------- |
| `SHOW_STATUS_BAR` |        true | Show status bar at top |

**Example:**

```text
SHOW_STATUS_BAR = false    # Hide status bar
```

---

## How to Apply Changes

### Method 1: Change in Azure Portal (Recommended)

1. Go to Azure Portal -> Your Web App -> Configuration
2. Update the application setting values
3. Click Save at the top

After clicking Save Azure will restart the app automatically - this typically takes about 30 seconds. Refresh your browser to see changes.

### Method 2: Manual Refresh (For Testing)

If you want to test changes without restarting the server:

1. Change settings in Azure Portal
2. Save (do not restart yet)
3. In browser console, run:

```javascript
await window._reloadConfig();
window._applyConfig();
```

---

## Common Configuration Examples

**Example 1: Minimal Dashboard (Last 24h, Temperature Only)**

```text
DASHBOARD_HOURS_BACK = 24
CHART_PRESSURE = false
CHART_HUMIDITY = false
CHART_DISTANCE = false
CHART_ACCELERATION = false
SHOW_DEBUG_LOGGER = false
```

**Example 2: Production Monitoring (Long History, No Debug)**

```text
DASHBOARD_HOURS_BACK = 168
DASHBOARD_CUSTOM_TITLE = Production Environment
DASHBOARD_POLL_INTERVAL = 60000
SHOW_DEBUG_LOGGER = false
```

**Example 3: Development Mode (All Features, Frequent Updates)**

```text
DASHBOARD_HOURS_BACK = 12
DASHBOARD_POLL_INTERVAL = 10000
SHOW_DEBUG_LOGGER = true
MAX_LOGGER_MESSAGES = 10
```

**Example 4: Static Dashboard (No Auto-Refresh)**

```text
DASHBOARD_POLL_INTERVAL = 0
DASHBOARD_CUSTOM_TITLE = Historical Data Archive
```

---

## Troubleshooting

**Configuration not updating?**

* Ensure you clicked Save in Azure Portal
* Wait for app restart - about 30 seconds
* Clear browser cache (Ctrl+Shift+R / Cmd+Shift+R)
* Check browser console for error messages

**Charts not appearing?**

* Verify the chart setting is not set to `false`
* Confirm the setting name is spelled correctly (case-sensitive)
* In browser console run `window._getConfig()` to inspect loaded config

**Debug logger shows errors?**

* Verify `/api/config` endpoint responds: open `https://your-app.azurewebsites.net/api/config` in browser
* Confirm the JSON response contains the expected values

---

## Tips

* *Test locally first*: set environment variables in a local `.env` file or in your system environment
* *Use descriptive titles*: `DASHBOARD_CUSTOM_TITLE = Building A - Floor 3`
* *Balance refresh rate*: faster polling means more API calls and higher costs
* *Hide unused charts*: cleaner UI and faster page load
* *Limit logger messages*: reduces memory usage, important on mobile devices

---

## Advanced: Reading Current Config (Browser Console)

```javascript
// Get current configuration
window._getConfig()

// Reload config from server
await window._reloadConfig()

// Apply new config without refresh
window._applyConfig()

// Get latest data
window._getLatestData()

// Manual data refresh
window._fetchAndRender()
```

---

## Migration Checklist

* Add `/api/config` endpoint to `app.js`
* Replace old `chart.ejs` in `/views` folder
* Add `config.js` to `/public` folder
* Replace `client-app.js` in `/public` folder
* Replace `chart-logic.js` in `/public` folder
* Deploy to Azure
* Test `/api/config` endpoint in browser
* Add environment variables in Azure Portal (optional)
* Test configuration changes without redeployment

---

## Quick Start

**Minimal Setup (Use Defaults)**
If no environment variables are set, the dashboard uses these defaults:

* 72 hours of data
* All charts enabled
* Auto-refresh every 30 seconds
* Debug logger enabled (5 messages max)

**Custom Setup**

1. Deploy the updated code
2. Go to Azure Portal -> Configuration
3. Add only the settings you want to change
4. Save and wait for restart

---

## Example: Setting Up in Azure Portal - Step by Step

1. Navigate to Azure Portal -> App Services -> [Your App] -> Configuration -> Application settings
2. Click "+ New application setting"
3. **Name:** `DASHBOARD_HOURS_BACK`  **Value:** `24`  Click OK
4. Add other settings as needed, for example:

   * `CHART_ACCELERATION = false`
   * `DASHBOARD_CUSTOM_TITLE = My Sensors`
   * `SHOW_DEBUG_LOGGER = false`
5. Click Save at the top of the page and confirm
6. Wait ~30 seconds for the app to restart
7. Verify by opening `https://your-app.azurewebsites.net/api/config`
8. Refresh your dashboard to see changes

---

## Security Note

* Configuration settings are server-side only. The `/api/config` endpoint does not expose:

  * API keys
  * Secrets
  * Authentication tokens
  * Database credentials

Only dashboard display settings are returned by the endpoint.

---

## Monitoring Configuration Changes

All configuration loads are logged in your app's console:

```javascript
console.log('Serving dashboard configuration:', config);
```

Check your Azure App Service logs to see when configuration is requested and which values are returned.

---

## FAQ

**Q: Do I need to restart the app after changing settings?**
A: Yes. Azure automatically restarts when you click Save in Configuration. This takes about 30 seconds.

**Q: Can I change settings while the app is running?**
A: Yes, but changes require an app restart to take effect.

**Q: What happens if I delete a setting?**
A: The dashboard will use the default value for that setting.

**Q: Can I use different settings for development vs production?**
A: Yes. Each Azure App Service (dev/staging/production) has its own Configuration settings.

**Q: How do I test locally?**
A: Create a `.env` file in your project root with the same variable names, or set them in your system environment.

**Q: Can I change the chart colors or styles via configuration?**
A: No. Changing colors or styles requires modifying `chart-logic.js` and redeploying.

**Q: Does this work with CI/CD pipelines?**
A: Yes. Environment variables persist across deployments. Only code changes require redeployment.

---

# End of README
