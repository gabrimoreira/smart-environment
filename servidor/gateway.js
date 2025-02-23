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

// gRPC - Comunicação com Smart TV
const PROTO_PATH = "../proto/devices.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;

const clients = {
    tv: new devicesProto.ManageDevice('localhost:50051', grpc.credentials.createInsecure()),
    air: new devicesProto.ManageDevice('localhost:8888', grpc.credentials.createInsecure())
};

// RabbitMQ connection
let channel; // Definindo globalmente

async function startGateway() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel(); // Atribuindo ao canal global
        const queues = ['fila_temperatura', 'fila_tv'];

        for (const queue of queues) {
            await channel.assertQueue(queue, { durable: true });
        }
        console.log('Conectado ao RabbitMQ.');
    } catch (error) {
        console.log('Erro ao iniciar o gateway:', error);
    }
}

// Fetch the last state from RabbitMQ
async function getLastState(name) {
    const message = await channel.get('fila_tv', { noAck: false });
    if (message) {
        const state = JSON.parse(message.content.toString());
        channel.ack(message); // Acknowledge the message
        console.log(`Estado recebido da fila: ${JSON.stringify(state)}`);
        return state;
    }
    return { power: "desligado", source: "nenhum", platform: "nenhum" }; // Default state
}

// Publish the new state to RabbitMQ
async function publishState(name, state) {
    // Garantir que o state é um objeto e serializar corretamente
    const stateToPublish = {
        power: state.power,
        source: state.source,
        platform: state.platform
    };

    // Publicar no RabbitMQ
    await channel.sendToQueue('fila_tv', Buffer.from(JSON.stringify(stateToPublish)), { persistent: true });
    console.log(`Estado publicado na fila_tv: ${JSON.stringify(stateToPublish)}`);
}

// Send command to gRPC server
async function sendCommandTV(command) {
    const lastState = await getLastState();
    console.log(`Estado recebido da fila: ${lastState}`);
    const request = {
        device_name: 'TV',
        order: command.order,
        value: command.value,
        current_state: {
            power: lastState.power,
            source: lastState.source,
            platform: lastState.platform
        }
    };
    console.log(`Estado enviado para o gRPC: ${JSON.stringify(request.current_state)}`);

    return new Promise((resolve, reject) => {
        clients.tv.command(request, (error, response) => {
            if (error) {
                console.log(`Erro ao enviar comando para atuador: ${error.message}`);
                reject(error);
            } else {
                publishState("fila_tv", response.currentState);
                console.log(`Resposta do atuador: ${JSON.stringify(response)}`);
                resolve(response);
            }
        });
    });
}

async function sendCommand_Air(command) {
    const request = {
        device_name: '',
        order: command.order,
        value: command.value,
        current_state: {}
    };

    console.log("oi")
    return new Promise((resolve, reject) => {
        console.log("📤 Enviando para gRPC4:", JSON.stringify({ device_name, order, value }, null, 2));

        clients.air.command(request, (err, response) => { 
            console.log("📤 Enviando para gRPC3:", { device_name, order, value });      

            if (err) {
                reject({ error: `Error communicating with ${device_name}: ${err.message}` });
            } else {
                publishState("fila_ar", response.currentState);
                resolve({ device_name: response.device_name, response: response.response });
            } 
        });
    });
}

app.post('/send-command-air', async (req, res) => {
    const { device_name, order, value } = req.body;
    console.log(`Comando recebido: Order: ${order}, Value: ${value}`);

    try {
        console.log("📤 Enviando para gRPC:", { device_name, order, value });
        const response = await sendCommand_Air({ order, value});
        res.json({ message: 'Comando enviado com sucesso', status: 'success', response });
    } catch (error) {
        console.log(`Erro ao processar comando: ${error}`);
        res.status(500).json({ message: 'Erro ao processar comando', status: 'error', error });
    }
});

app.get('/atuadores', async (req, res) => {
    try {
        // Get the last state of the TV from the RabbitMQ queue
        const tvState = await getLastState('tv'); // You can specify the queue name if needed
        const actuators = {
            tv: tvState,
        };

        res.json(actuators);
    } catch (error) {
        console.error('Erro ao obter estados dos atuadores:', error);
        res.status(500).json({ error: "Erro ao obter estados dos atuadores" });
    }
});


// POST route to receive commands
app.post('/send-command-tv', async (req, res) => {
    console.log("Request received:", req.body); // Debugging log
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
