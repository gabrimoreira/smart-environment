const amqp = require('amqplib');

async function startBroker() {
  try {
    const connection = await amqp.connect('amqp://localhost');
    const channel = await connection.createChannel();

    const queues = ['fila_temperatura', 'fila_lampada', 'fila_tv'];

    for (const queue of queues) {
      await channel.assertQueue(queue, { durable: true });

      console.log(`[*] Waiting for messages in queue: ${queue}`);
      channel.consume(queue, (message) => {
        if (message) {
          const content = message.content.toString();
          console.log(`Received from ${queue}: ${content}`);
          channel.ack(message);
        }
      });
    }
  } catch (error) {
    console.error('Error starting gateway:', error);
  }
}

startBroker();
