const amqp = require('amqplib');

async function startSensor() {
  const queue = 'fila_temperatura';

  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });

    setInterval(() => {
      const temperature = (20 + Math.random() * 10).toFixed(2);
      const message = `Temperatura ${temperature}`;

      channel.sendToQueue(queue, Buffer.from(message));
      console.log(`Temperature Sensor: Sent ${message}`);
    }, 5000);
  } catch (error) {
    console.error('Error starting temperature sensor:', error);
  }
}

startSensor();
