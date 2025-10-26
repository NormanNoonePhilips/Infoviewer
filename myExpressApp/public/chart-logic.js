// chart-logic.js (client-side module)
// Creates and updates charts for multi-sensor IoT data

import { CONFIG } from './config.js';

let charts = {};

// Shared Chart Options
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
        duration: 300 // Faster animations
    },
    interaction: { 
        mode: 'index', 
        intersect: false 
    },
    plugins: {
        legend: { 
            position: 'top',
            labels: {
                usePointStyle: true, // Smaller legend items
                padding: 10
            }
        },
        tooltip: { 
            mode: 'index', 
            intersect: false,
            callbacks: {
                // Format tooltips efficiently
                label: function(context) {
                    let label = context.dataset.label || '';
                    if (label) {
                        label += ': ';
                    }
                    if (context.parsed.y !== null) {
                        label += context.parsed.y.toFixed(2);
                    }
                    return label;
                }
            }
        },
        // Disable unused plugins
        title: false
    },
    scales: {
        x: {
            display: true,
            grid: { display: false },
            ticks: {
                maxTicksLimit: 10,
                autoSkip: true,
                autoSkipPadding: 10,
                maxRotation: 0, // Prevent label rotation (faster rendering)
                minRotation: 0
            }
        },
        y: { 
            display: true, 
            beginAtZero: false,
            ticks: {
                maxTicksLimit: 8 // Limit y-axis labels
            }
        }
    },
    // Performance optimizations
    parsing: false, // We provide data in correct format
    normalized: true, // Data already sorted by x-axis
    spanGaps: true // Connect lines across null values
};

export function createCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }

    // Disable Animations on Initial Load
    const initialOptions = {
        ...commonOptions,
        animation: false // No animation on first render
    };

    // Temperature Chart
    if (CONFIG.charts.temperature) {
        charts.temperature = new Chart(document.getElementById('temperatureChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...initialOptions,
                scales: {
                    x: commonOptions.scales.x,
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
                ...initialOptions,
                scales: {
                    x: commonOptions.scales.x,
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
                ...initialOptions,
                scales: {
                    x: commonOptions.scales.x,
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
                ...initialOptions,
                scales: {
                    x: commonOptions.scales.x,
                    y: {
                        ...commonOptions.scales.y,
                        title: { display: true, text: 'Distance (mm)' },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Acceleration Chart
    if (CONFIG.charts.acceleration) {
        charts.acceleration = new Chart(document.getElementById('accelerationChart'), {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                ...initialOptions,
                scales: {
                    x: commonOptions.scales.x,
                    y: {
                        ...commonOptions.scales.y,
                        title: { display: true, text: 'Acceleration (g)' }
                    }
                }
            }
        });
    }

    // Re-enable animations after initial load
    setTimeout(() => {
        Object.values(charts).forEach(chart => {
            if (chart && chart.options) {
                chart.options.animation = { duration: 300 };
            }
        });
    }, 1000);
}

// Optimized Parsing
export function parseSensorData(ttnMessages) {
    if (!Array.isArray(ttnMessages) || ttnMessages.length === 0) {
        return null;
    }

    // Pre-allocate array
    const dataPoints = new Array(ttnMessages.length);
    let validCount = 0;

    for (let i = 0; i < ttnMessages.length; i++) {
        const msg = ttnMessages[i];
        
        // Fast path: check structure first
        const uplink = msg?.result?.uplink_message;
        if (!uplink) continue;

        const timestamp = uplink.received_at || uplink.settings?.time;
        const payload = uplink.decoded_payload;

        if (!timestamp || !payload) continue;

        // Reuse object structure
        dataPoints[validCount++] = {
            timestamp: new Date(timestamp),
            Te: payload.Te,
            Ti: payload.Ti,
            Tb: payload.Tb,
            P: payload.P,
            H: payload.H,
            Z: payload.Z,
            Ax: payload.Ax,
            Ay: payload.Ay,
            Az: payload.Az
        };
    }

    // Trim to actual size
    dataPoints.length = validCount;

    if (validCount === 0) return null;

    // Sort by timestamp
    dataPoints.sort((a, b) => a.timestamp - b.timestamp);

    return dataPoints;
}

// Data Sampling for Large Datasets
function sampleData(dataPoints, maxPoints = 500) {
    if (dataPoints.length <= maxPoints) return dataPoints;

    const sampledPoints = [];
    const step = dataPoints.length / maxPoints;

    for (let i = 0; i < dataPoints.length; i += step) {
        sampledPoints.push(dataPoints[Math.floor(i)]);
    }

    // Always include the last point
    sampledPoints.push(dataPoints[dataPoints.length - 1]);

    console.log(`Sampled ${sampledPoints.length} points from ${dataPoints.length}`);
    return sampledPoints;
}

export function createEmptyCharts() {
    const now = new Date();
    const label = now.toLocaleString('it-IT', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const labels = [label];

    if (CONFIG.charts.temperature && charts.temperature) {
        charts.temperature.data.labels = labels;
        charts.temperature.data.datasets = [
            {
                label: 'External (DS18B20)',
                data: [],
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 0 // Hide points for better performance
            },
            {
                label: 'Internal (DS18B20)',
                data: [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 0
            },
            {
                label: 'BME280',
                data: [],
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 0
            }
        ];
        charts.temperature.update('none'); // Update without animation
    }

    // Similar for other charts (omitted for brevity)
    // Use update('none') for instant updates
}

// Chart Updates
export function updateCharts(dataPoints) {
    if (!dataPoints || dataPoints.length === 0) {
        console.warn('No data points to display');
        return;
    }

    // Sample data if too many points
    const displayPoints = sampleData(dataPoints, 500);

    // Generate labels once
    const labels = displayPoints.map(dp =>
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
                data: displayPoints.map(dp => dp.Te),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: displayPoints.length > 100 ? 0 : 2 // Hide points if many
            },
            {
                label: 'Internal (DS18B20)',
                data: displayPoints.map(dp => dp.Ti),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: displayPoints.length > 100 ? 0 : 2
            },
            {
                label: 'BME280',
                data: displayPoints.map(dp => dp.Tb),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: displayPoints.length > 100 ? 0 : 2
            }
        ];
        charts.temperature.update();
    }

    // Similar updates for other charts (use same pattern)
    // ... (code for other charts omitted for brevity)
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

// Batch Chart Updates
export function updateAllCharts(dataPoints) {
    if (!dataPoints || dataPoints.length === 0) {
        console.warn('No data points to display');
        return;
    }

    // Sample data if too many points
    const displayPoints = sampleData(dataPoints, 500);

    // Generate labels once
    const labels = displayPoints.map(dp =>
        dp.timestamp.toLocaleString('it-IT', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    );

    // Determine point radius based on data density
    const pointRadius = displayPoints.length > 100 ? 0 : 2;

    // Update Temperature Chart
    if (CONFIG.charts.temperature && charts.temperature) {
        charts.temperature.data.labels = labels;
        charts.temperature.data.datasets = [
            {
                label: 'External (DS18B20)',
                data: displayPoints.map(dp => dp.Te),
                borderColor: 'rgb(239, 68, 68)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius
            },
            {
                label: 'Internal (DS18B20)',
                data: displayPoints.map(dp => dp.Ti),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius
            },
            {
                label: 'BME280',
                data: displayPoints.map(dp => dp.Tb),
                borderColor: 'rgb(16, 185, 129)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius
            }
        ];
        charts.temperature.update();
    }

    // Update Pressure Chart
    if (CONFIG.charts.pressure && charts.pressure) {
        charts.pressure.data.labels = labels;
        charts.pressure.data.datasets = [{
            label: 'Pressure',
            data: displayPoints.map(dp => dp.P),
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius
        }];
        charts.pressure.update();
    }

    // Update Humidity Chart
    if (CONFIG.charts.humidity && charts.humidity) {
        charts.humidity.data.labels = labels;
        charts.humidity.data.datasets = [{
            label: 'Humidity',
            data: displayPoints.map(dp => dp.H),
            borderColor: 'rgb(14, 165, 233)',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius
        }];
        charts.humidity.update();
    }

    // Update Distance Chart
    if (CONFIG.charts.distance && charts.distance) {
        charts.distance.data.labels = labels;
        charts.distance.data.datasets = [{
            label: 'Distance',
            data: displayPoints.map(dp => dp.Z),
            borderColor: 'rgb(245, 158, 11)',
            backgroundColor: 'rgba(245, 158, 11, 0.1)',
            tension: 0.3,
            fill: true,
            pointRadius
        }];
        charts.distance.update();
    }

    // Update Acceleration Chart
    if (CONFIG.charts.acceleration && charts.acceleration) {
        charts.acceleration.data.labels = labels;
        charts.acceleration.data.datasets = [
            {
                label: 'Ax (X-axis)',
                data: displayPoints.map(dp => dp.Ax),
                borderColor: 'rgb(239, 68, 68)',
                tension: 0.3,
                pointRadius,
                fill: false // No fill for multi-line acceleration chart
            },
            {
                label: 'Ay (Y-axis)',
                data: displayPoints.map(dp => dp.Ay),
                borderColor: 'rgb(16, 185, 129)',
                tension: 0.3,
                pointRadius,
                fill: false
            },
            {
                label: 'Az (Z-axis)',
                data: displayPoints.map(dp => dp.Az),
                borderColor: 'rgb(59, 130, 246)',
                tension: 0.3,
                pointRadius,
                fill: false
            }
        ];
        charts.acceleration.update();
    }
}

// Destroy Charts on Cleanup
export function destroyCharts() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    charts = {};
}

// Export updateCharts as alias
// Keep original function name for backwards compatibility
export { updateAllCharts as updateCharts };