// chart-logic.js (client-side module)
// Exports chart helpers and updates. Browser-side only.

const FALLBACK_JSON = [
    { "label": "2000-01-01T09:00:00Z", "value": 1 },
    { "label": "2000-01-01T10:00:00Z", "value": 1 },
    { "label": "2000-01-01T11:00:00Z", "value": 1 },
    { "label": "2000-01-01T12:00:00Z", "value": 1 }
];

let lineChart = null;
let barChart = null;

export function createCharts() {
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not loaded');
        return;
    }
    const lineCanvas = document.getElementById('lineChart');
    const barCanvas = document.getElementById('barChart');
    if (!lineCanvas || !barCanvas) {
        console.error('Canvas elements not found');
        return;
    }

    const ctxLine = lineCanvas.getContext('2d');
    const ctxBar = barCanvas.getContext('2d');

    lineChart = new Chart(ctxLine, {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            stacked: false,
            plugins: { title: { display: true, text: 'Time series' } },
            scales: { x: { display: true }, y: { display: true, beginAtZero: true } }
        }
    });

    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: { labels: [], datasets: [] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { title: { display: true, text: 'Aggregated values' } },
            scales: { x: { display: true }, y: { display: true, beginAtZero: true } }
        }
    });
}

export function normalizeJson(json = FALLBACK_JSON) {
    // Handle TTN uplink message format
    if (Array.isArray(json) && json.length > 0 && json[0].result) {
        // TTN Storage Integration format
        const dataPoints = [];

        json.forEach(msg => {
            if (msg.result && msg.result.uplink_message) {
                const uplink = msg.result.uplink_message;
                const timestamp = uplink.received_at || uplink.settings?.time;

                // Extract decoded payload if available
                if (uplink.decoded_payload) {
                    Object.entries(uplink.decoded_payload).forEach(([key, value]) => {
                        if (typeof value === 'number') {
                            dataPoints.push({
                                label: timestamp,
                                value: value,
                                field: key
                            });
                        }
                    });
                }
            }
        });

        if (dataPoints.length > 0) {
            // Group by field name
            const fieldGroups = {};
            dataPoints.forEach(pt => {
                if (!fieldGroups[pt.field]) fieldGroups[pt.field] = [];
                fieldGroups[pt.field].push(pt);
            });

            const labels = [...new Set(dataPoints.map(pt => pt.label))].sort();
            const series = Object.entries(fieldGroups).map(([field, points]) => ({
                name: field,
                values: labels.map(ts => {
                    const pt = points.find(p => p.label === ts);
                    return pt ? pt.value : null;
                })
            }));

            return { labels, series };
        }
    }

    // Handle simple label/value format (your original format)
    if (Array.isArray(json) && json.length > 0 && 'label' in json[0]) {
        return {
            labels: json.map(r => r.label),
            series: [{ name: 'Series 1', values: json.map(r => Number(r.value)) }]
        };
    }

    if (json && typeof json === 'object' && !Array.isArray(json)) {
        const entries = Object.entries(json).map(([k, v]) => ({ label: k, value: v }));
        return normalizeJson(entries);
    }

    return normalizeJson(FALLBACK_JSON);
}

export function humanLabel(ts) {
    try {
        const d = new Date(ts);
        return isNaN(d) ? String(ts) : d.toLocaleString();
    } catch (e) {
        return String(ts);
    }
}

export function updateCharts(normalized) {
    if (!lineChart || !barChart) {
        console.error('Charts are not initialized; call createCharts() first.');
        return;
    }

    const labels = normalized.labels.map(l => humanLabel(l));
    lineChart.data.labels = labels;
    lineChart.data.datasets = normalized.series.map(s => ({
        label: s.name,
        data: s.values,
        tension: 0.25,
        spanGaps: true
    }));
    lineChart.update();

    const aggLabels = normalized.series.map(s => s.name);
    const aggValues = normalized.series.map(s => s.values.reduce((acc, v) => acc + (v || 0), 0));
    barChart.data.labels = aggLabels;
    barChart.data.datasets = [{ label: 'Sum', data: aggValues }];
    barChart.update();
}
