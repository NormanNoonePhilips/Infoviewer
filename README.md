# Infoviewer - IoT Sensor Dashboard with TTN Integration

[![]()](infoviewer-d5fmgzabe3hcgffh.westeurope-01.azurewebsites.net)

A real-time web dashboard for visualizing IoT sensor data from The Things Network (TTN). This Node.js/Express application fetches uplink messages from TTN's Storage Integration API and displays environmental and motion sensor readings in interactive charts.

---

## What This WebApp Does

### Core Functionality
- **Connects to The Things Network (TTN)** - Fetches sensor data via Storage Integration API
- **Visualizes Multi-Sensor Data** - Displays temperature, pressure, humidity, distance, and acceleration readings
- **Real-Time Updates** - Auto-refreshes data at configurable intervals
- **Historical Analysis** - Shows data trends over configurable time periods (hours/days)
- **Interactive Charts** - Built with Chart.js for responsive, interactive visualizations
- **Secure Authentication** - Uses Azure Key Vault for API key management

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
│  Node.js/       │
│  Express Server │ (app.js)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Web Dashboard  │ (Chart.js visualizations)
└─────────────────┘
```

---

## Deployment

### Prerequisites
- Node.js 14+ and npm
- Azure Account (for Key Vault and Web App)
- The Things Network account with application configured

---

### Configure Environment Variables

#### Required Settings:
```bash
KEY_VAULT_NAME=your-keyvault-name
TTN_SECRET_NAME=your-ttn-api-key-secret
TTN_APP_ID=your-ttn-app-id
TTN_CLUSTER=eu1  # or us1, au1, etc.
```

#### Optional Dashboard Settings (see Configuration section):
```bash
DASHBOARD_HOURS_BACK=72
DASHBOARD_POLL_INTERVAL=30000
CHART_TEMPERATURE=true
# ... see CONFIG_README.md for all options
```

---

## Configuration


### Available Settings:

See **[CONFIG_README.md](CONFIG_README.md)** for complete documentation including:
- All environment variable names
- Default values
- Examples for common scenarios
- Troubleshooting guide

### Quick Settings Reference:

| Setting | Default | Description |
|---------|---------|-------------|
| `DASHBOARD_HOURS_BACK` | `72` | Hours of historical data |
| `DASHBOARD_POLL_INTERVAL` | `30000` | Auto-refresh interval (ms) |
| `CHART_TEMPERATURE` | `true` | Show temperature chart |
| `CHART_PRESSURE` | `true` | Show pressure chart |
| `CHART_HUMIDITY` | `true` | Show humidity chart |
| `CHART_DISTANCE` | `true` | Show distance chart |
| `CHART_ACCELERATION` | `true` | Show acceleration chart |
| `SHOW_DEBUG_LOGGER` | `true` | Show raw data logger |
| `MAX_LOGGER_MESSAGES` | `5` | Max debug messages |

---

## API Key Management - IMPORTANT

### TTN API Key Expiration

**The Things Network API keys can expire!** You must monitor and renew them before expiration.

### Check Key Expiration:
1. Log in to [The Things Network Console](https://console.cloud.thethings.network/)
2. Go to your Application - API Keys
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
Your app will use the new key automatically (within 60 seconds due to caching).

#### Option 2: Create New Key with Longer Expiration
1. TTN Console - Your App - API Keys
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
- `GET /api/config` - Get dashboard configuration (JSON)

### Data Endpoints:
- `GET /api/data?last=72h&field_mask=up.uplink_message` - Fetch TTN uplink messages
- `GET /api/uplinks?last=72h` - Alternative uplink endpoint

### Debug/Test Endpoints:
- `GET /api/debug` - Detailed TTN API response with parsing info
- `GET /api/test-ttn` - Test TTN connection and credentials
- `GET /api/testjson` - Sample JSON data for development

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

### Test Endpoints:
```bash
# Test TTN connection
curl http://localhost:3000/api/test-ttn

# Test configuration
curl http://localhost:3000/api/config

# Test data fetch
curl http://localhost:3000/api/data?last=1h
```

### Browser Console Commands:
```javascript
// Get current configuration
window._getConfig()

// Reload configuration from server
await window._reloadConfig()

// Manual data refresh
window._fetchAndRender()

// Get latest raw data
window._getLatestData()
```

---

## Monitoring and Logs

### Azure Portal Logs:
```
App Services - [Your App] - Log stream
```

### Key Log Messages:
```
Application starting...
Serving dashboard configuration: {...}
Fetching from TTN Storage Integration: ...
Successfully parsed X messages from TTN
KeyVault error: ... (indicates API key issue)
```

---

## Troubleshooting

### No Data Appearing:
1. Check TTN Console - are devices sending data?
2. Verify API key is valid: `/api/test-ttn`
3. Check configuration: `/api/config`
4. Look for errors in browser console (F12)
5. Check Azure logs for authentication errors

### Charts Not Updating:
1. Verify `DASHBOARD_POLL_INTERVAL` is set and greater than 0
2. Check browser console for fetch errors
3. Test manual refresh: `window._fetchAndRender()`

### Configuration Not Working:
1. Verify environment variables are set in Azure Portal
2. Check `/api/config` returns expected values
3. Clear browser cache (Ctrl+Shift+R)
4. Ensure config.js is deployed to `/public` folder

### Authentication Errors:
1. **Check API key expiration** in TTN Console
2. Verify Key Vault access permissions
3. Ensure Managed Identity is enabled
4. Check `TTN_SECRET_NAME` matches Key Vault secret name

---

## Security Best Practices

- API keys stored in Azure Key Vault (never in code)
- Managed Identity for Key Vault access (no passwords)
- HTTPS enforced on Azure App Service
- Environment variables for configuration
- Regular API key rotation (set calendar reminders!)
- Monitor logs for unauthorized access attempts

---

## Documentation

- **[CONFIG_README.md](CONFIG_README.md)** - Complete configuration guide
- **[TTN Storage Integration API](https://www.thethingsindustries.com/docs/integrations/storage/)** - TTN API documentation
- **[Azure Key Vault](https://docs.microsoft.com/azure/key-vault/)** - Key Vault documentation

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS templates, vanilla JavaScript (ES6 modules)
- **Charts**: Chart.js
- **Cloud**: Azure App Service, Azure Key Vault
- **IoT**: The Things Network (LoRaWAN)
- **Authentication**: Azure Managed Identity

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly (especially configuration changes)
5. Submit a pull request

**Note**: When adding new configuration options:
- Add environment variable to `app.js` `/api/config` endpoint
- Update `CONFIG_README.md` with new setting
- Test with both default and custom values

---

## Support

For issues or questions:
1. Check the [CONFIG_README.md](CONFIG_README.md) troubleshooting section
2. Review Azure App Service logs
3. Verify TTN API key validity
4. Open an issue with detailed error messages and logs

---

## Quick Start Checklist

- [ ] Deploy code to Azure App Service
- [ ] Configure environment variables in Azure Portal
- [ ] Create TTN API key (with long expiration!)
- [ ] Store API key in Azure Key Vault
- [ ] Enable Managed Identity for Web App
- [ ] Grant Key Vault access to Web App identity
- [ ] Test `/api/test-ttn` endpoint
- [ ] Test `/api/config` endpoint
- [ ] Access dashboard and verify data appears
- [ ] **Set calendar reminder for API key expiration!**
- [ ] Bookmark CONFIG_README.md for configuration changes

---

**Happy Monitoring!**
