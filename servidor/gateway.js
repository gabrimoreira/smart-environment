const express = require('express');
const amqp = require('amqplib');
const cors = require('cors')
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors())
let dispositivos = {}; 
async function startGateway() {
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
                    
                    dispositivos[queue] = { tipo: queue, valor: content };

                    channel.ack(message);
                }
            });
        }
    } catch (error) {
        console.error('Error starting gateway:', error);
    }
}

app.get('/dados', (req, res) => {
    res.json(Object.values(dispositivos));
});

startGateway().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
});
