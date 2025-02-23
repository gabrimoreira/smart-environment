const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  console.log('Connected to MQTT Broker');
  setInterval(() => {
    const temperature = (Math.random() * 30).toFixed(2);
    client.publish('sensor/temperature', temperature);
    console.log(`Sent temperature: ${temperature}`);
  }, 5000);
});