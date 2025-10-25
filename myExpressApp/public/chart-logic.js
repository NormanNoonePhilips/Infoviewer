// chart-logic.js (client-side module)
// Creates and updates charts for multi-sensor IoT data

import { CONFIG } from './config.js';

let charts = {};

export function createCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { position: 'top' },
            tooltip: { mode: 'index', intersect: false }
        },
        scales: {
            x: { display: true, grid: { display: false } },
            y: { display: true, beginAtZero: false }
        }
    };

    // Temperature Chart (3 sensors)
    if (CONFIG.charts.temperature) {
        charts.temperature = new Chart(document.getElementById('temperatureChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: {
                        ...commonOptions.scales.y,
                        title: { display: true, text: 'Temperature (°C)' }
                    }
                }
            }
        });
    }

    // Pressure Chart
    if (CONFIG.charts.pressure) {
        charts.pressure = new Chart(document.getElementById('pressureChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: {
                        ...commonOptions.scales.y,
                        title: { display: true, text: 'Pressure (hPa)' }
                    }
                }
            }
        });
    }

    // Humidity Chart
    if (CONFIG.charts.humidity) {
        charts.humidity = new Chart(document.getElementById('humidityChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: {
                        ...commonOptions.scales.y,
                        title: { display: true, text: 'Humidity (%RH)' },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    // Distance Chart
    if (CONFIG.charts.distance) {
        charts.distance = new Chart(document.getElementById('distanceChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: {
                        ...commonOptions.scales.y,
                        title: { display: true, text: 'Distance (mm)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Acceleration Chart (3-axis)
    if (CONFIG.charts.acceleration) {
        charts.acceleration = new Chart(document.getElementById('accelerationChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: {
                        ...commonOptions.scales.y,
                        title: { display: true, text: 'Acceleration (g)' }
                    }
                }
            }
        });
    }
}

export function parseSensorData(ttnMessages) {
    if (!Array.isArray(ttnMessages) || ttnMessages.length === 0) {
        return null;
    }

    const dataPoints = [];

    ttnMessages.forEach(msg => {
        try {
            // Navigate TTN structure: msg.result.uplink_message
            const uplink = msg?.result?.uplink_message;
            if (!uplink) return;

            const timestamp = uplink.received_at || uplink.settings?.time;
            const payload = uplink.decoded_payload;

            if (!timestamp || !payload) return;

            // Extract sensor readings
            dataPoints.push({
                timestamp: new Date(timestamp),
                Te: payload.Te,  // External temp
                Ti: payload.Ti,  // Internal temp
                Tb: payload.Tb,  // BME280 temp
                P: payload.P,    // Pressure
                H: payload.H,    // Humidity
                Z: payload.Z,    // Distance
                Ax: payload.Ax,  // Acceleration X
                Ay: payload.Ay,  // Acceleration Y
                Az: payload.Az   // Acceleration Z
            });
        } catch (e) {
            console.warn('Error parsing message:', e);
        }
    });

    // Sort by timestamp
    dataPoints.sort((a, b) => a.timestamp - b.timestamp);

    return dataPoints;
}

export function updateCharts(dataPoints) {
    if (!dataPoints || dataPoints.length === 0) {
        console.warn('No data points to display');
        return;
    }

    // Generate labels (human-readable timestamps)
    const labels = dataPoints.map(dp => 
        dp.timestamp.toLocaleString('it-IT', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    );

    // Update Temperature Chart
    if (CONFIG.charts.temperature && charts.temperature) {
        charts.temperature.data.labels = labels;
        charts.temperature.data.datasets = [
            {
                label: 'External (DS18B20)',
                data: dataPoints.map(dp => dp.Te),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.3,
                fill: true
            },
            {
                label: 'Internal (DS18B20)',
                data: dataPoints.map(dp => dp.Ti),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true
            },
            {
                label: 'BME280',
                data: dataPoints.map(dp => dp.Tb),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true
            }
        ];
        charts.temperature.update();
    }

    // Update Pressure Chart
    if (CONFIG.charts.pressure && charts.pressure) {
        charts.pressure.data.labels = labels;
        charts.pressure.data.datasets = [{
            label: 'Pressure',
            data: dataPoints.map(dp => dp.P),
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0.3,
            fill: true
        }];
        charts.pressure.update();
    }

    // Update Humidity Chart
    if (CONFIG.charts.humidity && charts.humidity) {
        charts.humidity.data.labels = labels;
        charts.humidity.data.datasets = [{
            label: 'Humidity',
            data: dataPoints.map(dp => dp.H),
            borderColor: 'rgb(14, 165, 233)',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            tension: 0.3,
            fill: true
        }];
        charts.humidity.update();
    }

    // Update Distance Chart
    if (CONFIG.charts.distance && charts.distance) {
        charts.distance.data.labels = labels;
        charts.distance.data.datasets = [{
            label: 'Distance',
            data: dataPoints.map(dp => dp.Z),
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.3,
            fill: true
        }];
        charts.distance.update();
    }

    // Update Acceleration Chart
    if (CONFIG.charts.acceleration && charts.acceleration) {
        charts.acceleration.data.labels = labels;
        charts.acceleration.data.datasets = [
            {
                label: 'Ax (X-axis)',
                data: dataPoints.map(dp => dp.Ax),
                borderColor: 'rgb(239, 68, 68)',
                tension: 0.3
            },
            {
                label: 'Ay (Y-axis)',
                data: dataPoints.map(dp => dp.Ay),
                borderColor: 'rgb(16, 185, 129)',
                tension: 0.3
            },
            {
                label: 'Az (Z-axis)',
                data: dataPoints.map(dp => dp.Az),
                borderColor: 'rgb(59, 130, 246)',
                tension: 0.3
            }
        ];
        charts.acceleration.update();
    }
}

export function updateStatusBar(dataPoints, status = 'Connected') {
    if (!CONFIG.showStatusBar) return;

    const statusEl = document.getElementById('statusValue');
    const dataPointsEl = document.getElementById('dataPointsValue');
    const lastUpdateEl = document.getElementById('lastUpdateValue');

    if (statusEl) {
        statusEl.textContent = status;
        statusEl.style.color = status === 'Connected' ? '#10b981' : '#ef4444';
    }

    if (dataPointsEl && dataPoints) {
        dataPointsEl.textContent = dataPoints.length;
    }

    if (lastUpdateEl) {
        lastUpdateEl.textContent = new Date().toLocaleTimeString('it-IT');
    }
}

export function showError(message) {
    const container = document.getElementById('errorContainer');
    if (!container) return;

    container.innerHTML = `
        <div class="error-msg">
            <strong>Error:</strong> ${message}
        </div>
    `;
}

export function clearError() {
    const container = document.getElementById('errorContainer');
    if (container) container.innerHTML = '';
}