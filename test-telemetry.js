// Test script to send complete telemetry data
const testPayload = {
  "soc": 70,
  "voltage": 11.05,
  "temperature": 31.4,
  "health": 100,
  "cycleCount": 1248,
  "estimatedRangeKm": 152,
  "chargingStatus": "discharging",
  "alerts": []
};

// Send to API
fetch('/api/telemetry', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    device: 'PE-001',
    ...testPayload
  })
}).then(r => r.json()).then(result => {
  console.log('POST result:', result);
  
  // Then fetch to verify
  return fetch('/api/telemetry?device=PE-001&limit=5');
}).then(r => r.json()).then(data => {
  console.log('GET result:', data);
  console.log('Last entry:', data.data[data.data.length - 1]);
});