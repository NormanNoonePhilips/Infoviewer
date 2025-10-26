# Infoviewer - IoT Sensor Dashboard with TTN Integration

A real-time web dashboard for visualizing IoT sensor data from The Things Network (TTN). This Node.js/Express application fetches uplink messages from TTN's Storage Integration API and displays environmental and motion sensor readings in interactive charts with optimized performance for large datasets.

**Live URL:** https://infoviewer-d5fmgzabe3gffh.westeurope-01.azurewebsites.net

---

## What This WebApp Does

### Core Functionality
- **Connects to The Things Network (TTN)** - Fetches sensor data via Storage Integration API
- **Visualizes Multi-Sensor Data** - Displays temperature, pressure, humidity, distance, and acceleration readings
- **Real-Time Updates** - Auto-refreshes data at configurable intervals with intelligent caching
- **Historical Analysis** - Shows data trends over configurable time periods (hours/days)
- **Interactive Charts** - Built with Chart.js for responsive, interactive visualizations
- **Intelligent Data Sampling** - Automatically downsamples large datasets to 999 points for optimal performance
- **Secure Authentication** - Uses Azure Key Vault for API key management
- **Client-Side Configuration** - All dashboard settings managed in `/public/config.js`
- **Performance Optimized** - Response caching, compression, connection pooling, and efficient parsing

### Supported Sensors
The dashboard decodes and displays data from devices sending ASCII-encoded payloads with these measurements:

| Sensor Type | Field | Description | Unit |
|-------------|-------|-------------|------|
| **Temperature** | `Te` | External temperature (DS18B20) | °C |
| | `Ti` | Internal temperature (DS18B20) | °C |
| | `Tb` | BME280 temperature | °C |
| **Pressure** | `P` | Atmospheric pressure (BME280) | hPa |
| **Humidity** | `H` | Relative humidity (BME280) | %RH |
| **Distance** | `Z` | Time-of-Flight sensor | mm |
| **Acceleration** | `Ax`, `Ay`, `Az` | 3-axis acceleration | g |

### Example Payload Format
```
Te:22.3,Ti:21.8,Tb:22.5,P:984.2,H:43.6,Z:755,Ax:0.03,Ay:-0.02,Az:0.98
```

---

## Architecture

```
┌─────────────────┐
│  IoT Devices    │ (LoRaWAN sensors)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ The Things      │
│ Network (TTN)   │ (Storage Integration API)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Azure Key Vault │ (API Key Storage)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Node.js/       │ (Response Cache, Compression)
│  Express Server │ (Connection Pooling)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Web Dashboard  │ (Chart.js visualizations)
│  + Client-Side  │ (config.js, client-app.js, chart-logic.js)
│  Configuration  │ (Data sampling: 999 points max)
└─────────────────┘
```

---

## Performance Features

### Server-Side Optimizations
- **Response Caching** - 30-second cache with NodeCache (configurable TTL)
- **Secret Caching** - 5-minute cache for Key Vault secrets
- **Compression** - gzip/deflate middleware for smaller payloads
- **Connection Pooling** - HTTP keep-alive for persistent connections
- **Efficient Parsing** - Stream-based parsing with pre-allocated arrays
- **Static Asset Caching** - 1-day browser cache in production

### Client-Side Optimizations
- **Data Sampling** - Automatically downsamples to 999 points from larger datasets
- **Debounced Logging** - Batched DOM updates for debug logger
- **Request Deduplication** - Prevents duplicate API calls
- **Visibility API** - Pauses updates when browser tab is hidden
- **Fast Initial Load** - Charts render without animation on first load
- **Point Radius Optimization** - Hides chart points for datasets over 100 points

---

## Deployment

### Prerequisites
- Node.js 16+ and npm
- Azure Account (for Key Vault and Web App)
- The Things Network account with application configured

---

### Server Environment Variables

#### Required Settings:
```bash
KEY_VAULT_NAME=your-keyvault-name
TTN_SECRET_NAME=your-ttn-api-key-secret
TTN_APP_ID=your-ttn-app-id
TTN_CLUSTER=eu1  # or us1, au1, etc.
```

These are set in Azure Portal: App Service > Configuration > Application settings.

---

## Configuration

### Client-Side Configuration (Primary Method)

**All dashboard settings are managed in `/public/config.js`**. This file is served to the browser and controls:
- Data fetch settings (time range, refresh interval)
- Chart visibility (which charts to display)
- Debug logger settings
- UI customization

See **[CONFIG_README.md](CONFIG_README.md)** for complete documentation.

### Quick Settings Reference:

| Setting | Default | Description |
|---------|---------|-------------|
| `hoursBack` | `72` | Hours of historical data to fetch |
| `pollIntervalMs` | `30000` | Auto-refresh interval (ms) |
| `customTitle` | `null` | Custom dashboard title |
| `charts.temperature` | `true` | Show temperature chart |
| `charts.pressure` | `true` | Show pressure chart |
| `charts.humidity` | `true` | Show humidity chart |
| `charts.distance` | `true` | Show distance chart |
| `charts.acceleration` | `true` | Show acceleration chart |
| `showDebugLogger` | `true` | Show raw data logger |
| `maxLoggerMessages` | `5` | Max debug messages |
| `showStatusBar` | `true` | Show status bar at top |

**To modify settings:** Edit `/public/config.js` and redeploy (takes 10-60 seconds).

---

## API Key Management - IMPORTANT

### TTN API Key Expiration

**The Things Network API keys can expire!** You must monitor and renew them before expiration.

### Check Key Expiration:
1. Log in to [The Things Network Console](https://console.cloud.thethings.network/)
2. Go to your Application > API Keys
3. Check the **"Expires"** column

### Recommended Settings:
- **Set expiration to maximum** (TTN allows up to 1 year, or no expiration for some key types)
- **Set calendar reminders** 1 month before expiration
- **Monitor application logs** for authentication errors

### Renewing/Updating API Key:

#### Option 1: Update in Azure Key Vault (Recommended)
```bash
az keyvault secret set \
  --vault-name your-keyvault-name \
  --name your-ttn-api-key-secret \
  --value "NEW_TTN_API_KEY"
```
Your app will use the new key automatically (within 5 minutes due to secret caching).

#### Option 2: Create New Key with Longer Expiration
1. TTN Console > Your App > API Keys
2. Click **"Add API key"**
3. Set **Rights**: Read application traffic (uplink messages)
4. Set **Expiration**: Maximum available or "No expiration"
5. Copy the generated key
6. Update Azure Key Vault (see Option 1)

### Monitoring for Issues:
Watch for these errors in Azure logs:
```
KeyVault error: Failed to read secret
TTN API error: 401 Unauthorized
Failed to fetch data from TTN
```

These usually indicate an expired or invalid API key.

---

## API Endpoints

### Public Endpoints:
- `GET /` - Dashboard home page
- `GET /health` - Health check endpoint (includes cache statistics)

### Data Endpoints:
- `GET /api/data?last=72h&field_mask=up.uplink_message` - Fetch TTN uplink messages
  - Response includes `X-Cache` header (`HIT` or `MISS`)
  - Cached for 30 seconds

---

## Testing

### Local Development:
```bash
# Set environment variables
export KEY_VAULT_NAME=your-keyvault
export TTN_APP_ID=your-app-id
export TTN_SECRET_NAME=your-secret-name
export TTN_CLUSTER=eu1

# Run server
node app.js

# Open browser
http://localhost:3000
```

### Health Check:
```bash
curl http://localhost:3000/health
```

### Test Data Fetch:
```bash
# Check cache status in response headers
curl -i http://localhost:3000/api/data?last=1h
```

### Browser Console Commands:
```javascript
// Get current configuration
window._getConfig()

// Manual data refresh
window._fetchAndRender()

// Get latest raw data
window._getLatestData()

// Clear local cache
window._clearCache()
```

---

## Monitoring and Logs

### Azure Portal Logs:
```
App Services > [Your App] > Log stream
```

### Key Log Messages:
```
Server listening on PORT
Fetching from TTN Storage Integration: ...
Successfully parsed X messages from TTN
Sampled Y points from X (when downsampling occurs)
KeyVault error: ... (indicates API key issue)
```

### Cache Statistics:
Available via `/health` endpoint:
```json
{
  "status": "ok",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "cache": {
    "keys": 5,
    "stats": {
      "hits": 42,
      "misses": 8,
      "keys": 5
    }
  }
}
```

---

## Troubleshooting

### No Data Appearing:
1. Check TTN Console - are devices sending data?
2. Verify API key is valid: `/health` and check Azure logs
3. Check browser console for fetch errors (F12)
4. Look for authentication errors in Azure logs
5. Verify `hoursBack` setting in `/public/config.js` matches expected data availability
6. Check that time range doesn't exceed TTN's 1000 message limit

### Charts Not Updating:
1. Verify `pollIntervalMs` is set and greater than 0 in `/public/config.js`
2. Check browser console for fetch errors
3. Test manual refresh: `window._fetchAndRender()`
4. Check if browser tab is visible (updates pause when hidden)

### Configuration Not Working:
1. Verify `/public/config.js` has been deployed
2. Clear browser cache (Ctrl+Shift+R)
3. Check browser console: `window._getConfig()`
4. Ensure config.js is accessible: `http://your-app.azurewebsites.net/config.js`

### Authentication Errors:
1. **Check API key expiration** in TTN Console
2. Verify Key Vault access permissions
3. Ensure Managed Identity is enabled
4. Check `TTN_SECRET_NAME` matches Key Vault secret name
5. Secret cache expires after 5 minutes - wait and retry

### Performance Issues:
1. Check if data sampling is occurring (console logs "Sampled X points from Y")
2. Verify response cache is working (check `X-Cache` header)
3. Monitor `/health` endpoint for cache hit ratio
4. Consider reducing `hoursBack` if fetching large datasets
5. Check Azure App Service plan (scale up if needed)

---

## Security Best Practices

- API keys stored in Azure Key Vault (never in code)
- Managed Identity for Key Vault access (no passwords)
- HTTPS enforced on Azure App Service
- Environment variables for server configuration
- Client-side configuration file for dashboard settings (no secrets)
- Regular API key rotation (set calendar reminders!)
- Monitor logs for unauthorized access attempts
- Secret caching (5 minutes) reduces Key Vault API calls
- Response caching minimizes exposure of API endpoints

---

## Data Sampling Behavior

The dashboard automatically downsamples large datasets to maintain performance:

- **Maximum display points**: 999 (configurable in `chart-logic.js`)
- **When it occurs**: Automatically when dataset exceeds 999 points
- **Algorithm**: Evenly spaced sampling with guaranteed inclusion of last point
- **Logging**: Console message when sampling occurs: `"Sampled X points from Y"`
- **Transparency**: Total data points shown in status bar (original count, not sampled)

Example:
```
Input: 2500 data points from TTN
Output: 999 points displayed on charts
Console: "Sampled 999 points from 2500"
Status Bar: "Data Points: 2500"
```

---

## Documentation

- **[CONFIG_README.md](CONFIG_README.md)** - Complete client-side configuration guide
- **[TTN Storage Integration API](https://www.thethingsindustries.com/docs/integrations/storage/)** - TTN API documentation
- **[Azure Key Vault](https://docs.microsoft.com/azure/key-vault/)** - Key Vault documentation
- **[Chart.js](https://www.chartjs.org/)** - Chart.js documentation

---

## Tech Stack

- **Backend**: Node.js 16+, Express.js 4.21+
- **Frontend**: EJS templates, vanilla JavaScript (ES6 modules)
- **Charts**: Chart.js 4.x
- **Cloud**: Azure App Service, Azure Key Vault
- **IoT**: The Things Network (LoRaWAN)
- **Authentication**: Azure Managed Identity
- **Performance**: NodeCache, compression middleware, axios connection pooling

---

## Project Structure

```
myExpressApp/
├── app.js                    # Express server with caching and optimization
├── package.json              # Dependencies and scripts
├── public/                   # Static assets (served to browser)
│   ├── config.js            # Client-side configuration (edit this!)
│   ├── client-app.js        # Main client application logic
│   └── chart-logic.js       # Chart creation and updates (999 point limit)
└── views/
    ├── chart.ejs            # Main dashboard template
    └── error.ejs            # Error page template
```

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially configuration changes)
5. Update documentation if needed (README.md and CONFIG_README.md)
6. Submit a pull request

**Note**: When adding new configuration options, update both `/public/config.js` and `CONFIG_README.md`.

---

## Support

For issues or questions:
1. Check the [CONFIG_README.md](CONFIG_README.md) troubleshooting section
2. Review Azure App Service logs
3. Verify TTN API key validity
4. Check `/health` endpoint for cache statistics
5. Open an issue with detailed error messages and logs

---

## Quick Start Checklist

- [ ] Deploy code to Azure App Service
- [ ] Configure server environment variables in Azure Portal
- [ ] Create TTN API key (with long expiration!)
- [ ] Store API key in Azure Key Vault
- [ ] Enable Managed Identity for Web App
- [ ] Grant Key Vault access to Web App identity
- [ ] Test `/health` endpoint
- [ ] Access dashboard and verify data appears
- [ ] Customize dashboard in `/public/config.js` if needed
- [ ] **Set calendar reminder for API key expiration!**
- [ ] Bookmark CONFIG_README.md for configuration changes

---

## License

MIT License - See [LICENSE](LICENSE) file for details.

---

**Happy Monitoring!**
