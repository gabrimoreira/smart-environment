const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const readline = require("readline-sync");

const app = express();
const PORT = 3000;
app.use(express.json());
app.use(cors());

// gRPC - Comunicação com Smart TV
const PROTO_PATH = "../proto/devices.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;



const devices = {
    "Air_Conditioner_1": "localhost:8888",
    "Lamp_1" : "localhost:8889"
};

const clients = {
    tv: new devicesProto.ManageDevice('localhost:50051', grpc.credentials.createInsecure()),
};




async function sendCommand(device_name, order, value) {
    if (!devices[device_name]) {
        return { error: `Error: Device '${device_name}' not found.` };
    }
    console.log(devices[device_name])

    const address = devices[device_name];  
    const client2 = new devicesProto.ManageDevice(address, grpc.credentials.createInsecure());
    return new Promise((resolve, reject) => {
        console.log("📤 Enviando para  Enviando para gRPC: { device_name: 'Lamp_1', order: 'poweroff', value: -1 }gRPC4:", JSON.stringify({ device_name, order, value }, null, 2));

        client2.command({ deviceName : device_name, order, value }, (err, response) => {
            console.log("📤 Enviando para gRPC3:", { device_name, order, value });      

            if (err) {
                reject({ error: `Error communicating with ${device_name}: ${err.message}` });
            } else {
                resolve({ device_name: response.device_name, response: response.response });
            } 
        });
    });
} 






let dispositivos = {}; 
let channel;
// RabbitMQ - Gateway de Mensagens 
async function startGateway() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        const channel = await connection.createChannel();
        const queues = ['fila_temperatura', 'fila_lampada', 'fila_tv'];

        for (const queue of queues) {
            await channel.assertQueue(queue, { durable: true });

            console.log(`[*] Aguardando mensagens na fila: ${queue}`);

            channel.consume(queue, (message) => {
                if (message) {
                    const content = message.content.toString();
                    console.log(`Recebido de ${queue}: ${content}`);
                    dispositivos[queue] = { tipo: queue, valor: content };
                    channel.ack(message);
                }
            });
        }
    } catch (error) {
        console.error('Erro ao iniciar o gateway:', error);
    }
}



async function getActuatorsState() {
    const actuators = [];
    
    for (const [deviceName, address] of Object.entries(devices)) {
        try {
            const client = createGrpcClient(address);
            const state = await new Promise((resolve, reject) => {
                client.getState({ device_name: deviceName }, (error, response) => {
                    error ? reject(error) : resolve(response);
                });
            });
            actuators.push({ device_name: deviceName, state });
        } catch (error) {
            actuators.push({ 
                device_name: deviceName, 
                error: error.message 
            });
        }
    }
    
    return actuators;
}



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



// Rotas HTTP
app.get('/sensores', (req, res) => {
    res.json(Object.values(dispositivos));
});


app.get('/atuadores', async (req, res) => {
    try {
        const actuators = await getActuatorsState();
        res.json(actuators);
    } catch (error) {
        res.status(500).json({ error: "Erro ao obter estados dos atuadores" });
    }
});


app.get('/atuadores-tv', async (req, res) => {
    try {
        const tvState = await getLastState('tv'); 
        const actuators = {
            tv: tvState,
        };

        res.json(actuators);
    } catch (error) {
        console.error('Erro ao obter estados dos atuadores:', error);
        res.status(500).json({ error: "Erro ao obter estados dos atuadores" });
    }
});


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

app.post('/send-command', async (req, res) => {
    const { device_name, order, value } = req.body;
    console.log(req.body)
    try {
        console.log("📤 Enviando para gRPC:", { device_name, order, value });

        const result = await sendCommand(device_name, order, value);
        res.json(result); 
    } catch (error) {
        res.status(500).json(error);
    }
});






// Inicializa o Gateway e Servidor
startGateway().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        // menu(); // Inicia o menu interativo
    });
});
