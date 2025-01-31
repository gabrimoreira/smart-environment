const amqp = require('amqplib');

const channels = ['Canal 1', 'Canal 2', 'Canal 3'];

async function startTvSensor() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    const queue = 'fila_tv';

    await channel.assertQueue(queue, { durable: true });

    setInterval(() => {
      const selectedChannel = channels[Math.floor(Math.random() * channels.length)];
      const message = `Transmitindo ${selectedChannel}`;
      channel.sendToQueue(queue, Buffer.from(message));
      console.log(`TV Sensor: Sent ${message}`);
    }, 5000);

  } catch (error) {
    console.error('Error starting TV sensor:', error);
  }
}

startTvSensor();
