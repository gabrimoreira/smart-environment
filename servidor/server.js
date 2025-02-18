const amqp = require('amqplib');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const PROTO_PATH = './devices.proto';
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;


const QUEUE_NAME = 'fila_tv';
const RABBITMQ_URL = 'amqp://localhost';
const GRPC_SERVER_URL = 'localhost:50051';

async function startServer() {
    try {
        // Conectar ao RabbitMQ
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`[*] Listening for messages on queue: ${QUEUE_NAME}`);

        // Conectar ao gRPC atuador
        const client = new devicesProto.ManageDevice(GRPC_SERVER_URL, grpc.credentials.createInsecure());

        channel.consume(QUEUE_NAME, (message) => {
            if (message) {
                const content = JSON.parse(message.content.toString());
                console.log(`[Server] Received:`, content);

                if (content.power === 'off') {
                    sendGrpcCommand(client, 'power', 0);
                } else {
                    sendGrpcCommand(client, 'power', 1);
                    sendGrpcCommand(client, 'source', content.source === 'streaming' ? 1 : 0);
                    
                    const platformMap = { 'netflix': 1, 'hbomax': 2, 'disney+': 3, 'globo': 4, 'record': 5, 'sbt': 6 };
                    if (content.platform in platformMap) {
                        sendGrpcCommand(client, 'platform', platformMap[content.platform]);
                    }
                }
                channel.ack(message);
            }
        });
    } catch (error) {
        console.error('[Server] Error:', error);
    }
}

function sendGrpcCommand(client, order, value) {
    const request = { device_name: 'smart_tv', order, value };
    client.command(request, (error, response) => {
        if (error) {
            console.error(`[gRPC] Error sending ${order}:`, error);
        } else {
            console.log(`[gRPC] Response:`, response);
        }
    });
}

startServer();