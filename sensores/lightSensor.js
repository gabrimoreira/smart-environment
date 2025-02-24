const amqp = require('amqplib');
const fs = require('fs');
const path = require('path');

const RABBITMQ_HOST = 'amqp://localhost';
const QUEUE_NAME = 'fila_lampada';
const STATUS_FILE = path.join(__dirname, '../servidor/lampstate.txt');

async function publishLight() {
    try {
        // Conectar ao RabbitMQ
        const connection = await amqp.connect(RABBITMQ_HOST);
        const channel = await connection.createChannel();

        // Declarar a fila
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        let lastState = '';

        while (true) {
            try {
                // Ler o estado da lâmpada do arquivo
                const lampState = fs.readFileSync(STATUS_FILE, 'utf-8').trim();

                // Verificar se o estado mudou
                if (lampState !== lastState) {
                    lastState = lampState;
                    const message = `${lampState}`;
                    channel.sendToQueue(QUEUE_NAME, Buffer.from(message), {
                        persistent: true
                    });
                    console.log(`Published Brightness: ${message}`);
                }
            } catch (err) {
                console.error('File Not Found or Error reading file.');
                // Caso não consiga ler o arquivo, envia uma mensagem de erro
                const errorMessage = 'Could not get info on the lamp.';
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

publishLight();
