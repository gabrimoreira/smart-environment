const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

// Configure logging (substituído por console.log)
const app = express();
const PORT = 3000;
app.use(express.json());
app.use(cors());

// Load the proto file
const PROTO_PATH = "../proto/devices.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});
const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;

// Create gRPC clients
const clients = {
    tv: new devicesProto.ManageDevice('localhost:50051', grpc.credentials.createInsecure()),
    air: new devicesProto.ManageDevice('localhost:8888', grpc.credentials.createInsecure())
};

// RabbitMQ connection
let channel;
let currentState = { power: "desligado", source: "nenhum", platform: "nenhum" };

async function startGateway() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();
        const queues = [ 'fila_tv'];

        for (const queue of queues) {
            await channel.assertQueue(queue, { durable: true });
        }
        

        console.log('Conectado ao RabbitMQ.');

        // Continuamente consome a fila
        channel.consume('fila_tv', async (message) => {
            if (message) {
                const state = JSON.parse(message.content.toString());
                console.log(`Estado recebido da fila: ${JSON.stringify(state)}`);
                channel.ack(message); // Acknowledge the message
                currentState = state;
            }
            
        }, { noAck: false });
    } catch (error) {
        console.log('Erro ao iniciar o gateway:', error);
    }
}
/*
// Fetch the last state from RabbitMQ
async function getLastState() {
    try {
        // Ensure the queue exists
        await channel.assertQueue('fila_tv', { durable: true });

        // Fetch the latest message from the queue
        const message = await channel.get('fila_tv', { noAck: false });

        if (message) {
            const state = JSON.parse(message.content.toString());
            console.log(`Estado recebido da fila: ${JSON.stringify(state)}`);
            channel.ack(message); // Acknowledge the message
            return state;
        } else {
            console.log('Nenhuma mensagem encontrada na fila. Retornando estado padrão.');
            return { power: "desligado", source: "nenhum", platform: "nenhum" }; // Default state
        }
    } catch (error) {
        console.error('Erro ao buscar estado da fila:', error);
        throw error;
    }
}
*/

// Publish the new state to RabbitMQ
async function publishState(state) {
    if (!state) {
        console.error('Estado não definido:', state);
        throw new Error('Estado não definido.');
    }

    const stateToPublish = {
        power: state.power || "desligado", // Default to "desligado" if undefined
        source: state.source || "nenhum", // Default to "nenhum" if undefined
        platform: state.platform || "nenhum" // Default to "nenhum" if undefined
    };

    await channel.sendToQueue('fila_tv', Buffer.from(JSON.stringify(stateToPublish)), { persistent: true });
    console.log(`Estado publicado na fila_tv: ${JSON.stringify(stateToPublish)}`);
}

// Send command to gRPC server
async function sendCommandTV(command) {
    // Use the global `currentState` directly, no need to redefine it here.
    console.log(`Estado atual da TV: ${JSON.stringify(currentState)}`);

    // Create a TvState object
    const State = {
        power: currentState.power,
        source: currentState.source,
        platform: currentState.platform
    };

    const request = {
        device_name: 'TV',
        order: command.order,
        value: command.value,
        current_state: State
    };

    console.log(`Estado enviado para o gRPC: ${JSON.stringify(request.current_state)}`);

    return new Promise((resolve, reject) => {
        clients.tv.command(request, (error, response) => {
            if (error) {
                console.log(`Erro ao enviar comando para atuador: ${error.message}`);
                reject(error);
            } else {
                if (!response.current_state) {
                    console.error('Resposta do atuador não contém current_state:', response);
                    reject(new Error('Resposta do atuador inválida: current_state ausente.'));
                } else {
                    // Publish the updated state to RabbitMQ
                    publishState(response.current_state)
                        .then(() => resolve(response))
                        .catch((err) => reject(err));
                }
            }
        });
    });
}

// POST route to receive commands
app.post('/send-command-tv', async (req, res) => {
    console.log("Request received:", req.body);
    const { order, value } = req.body;
    console.log(`Comando recebido: Order: ${order}, Value: ${value}`);

    try {
        const response = await sendCommandTV({ order, value });
        res.json({ message: 'Comando enviado com sucesso', status: 'success', response });
    } catch (error) {
        console.log(`Erro ao processar comando: ${error}`);
        res.status(500).json({ message: 'Erro ao processar comando', status: 'error', error });
    }
});

// Start the gateway
startGateway().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
});