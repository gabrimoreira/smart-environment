const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');

const RABBITMQ_HOST = 'amqp://localhost';
const QUEUE_NAME = 'fila_temperatura';
const TEMP_FILE = path.join(__dirname, '../servidor/temperature.txt');

async function publishTemperature() {
    try {
        // Conectar ao RabbitMQ
        const connection = await amqp.connect(RABBITMQ_HOST);
        const channel = await connection.createChannel();

        // Declarar a fila
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        while (true) {
            try {
                // Ler a temperatura do arquivo
                const currentTemp = fs.readFileSync(TEMP_FILE, 'utf-8').trim();

                // Publicar a temperatura na fila
                const message = `${currentTemp}`;
                channel.sendToQueue(QUEUE_NAME, Buffer.from(message), {
                    persistent: true
                });
                console.log(`Published temperature: ${message} °C`);

            } catch (err) {
                console.error('File Not Found or Error reading file.');
                // Caso não consiga ler o arquivo, envia uma mensagem de erro
                const errorMessage = 'Could not get temperature.';
                channel.sendToQueue(QUEUE_NAME, Buffer.from(errorMessage), {
                    persistent: true
                });
                break;
            }

            // Aguardar 5 segundos
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Fechar a conexão com RabbitMQ
        await connection.close();
    } catch (err) {
        console.error('Error connecting to RabbitMQ:', err);
    }
}

publishTemperature();
