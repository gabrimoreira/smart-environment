const amqp = require('amqplib');

let lampStatus = 'off';

async function startLampSensor() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertQueue('fila_lampada', { durable: true });

    setInterval(() => {
      const message = `Lampada ${lampStatus}`;
      channel.sendToQueue('fila_lampada', Buffer.from(message));
      console.log(`Lamp Sensor: Sent ${message}`);
    }, 5000);

    setInterval(() => {
      lampStatus = lampStatus === 'off' ? 'on' : 'off';
    }, 10000);
  } catch (error) {
    console.error('Error starting lamp sensor:', error);
  }
}

startLampSensor();