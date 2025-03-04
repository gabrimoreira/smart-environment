const express = require('express');
const amqp = require('amqplib');
const cors = require('cors');
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const app = express();
const PORT = 3000;
app.use(express.json());
app.use(cors());

const PROTO_PATH = "../proto/devices.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;


const devices = {
    "Air_Conditioner_1": "localhost:8888",
    "Lamp_1": "localhost:8889",
    "TV": "localhost:50051" 
};

let dispositivos = {}; 
let channel;
let currentStateTV = { power: "desligado", source: "nenhum", platform: "nenhum" };

//RabbitMQ - Gateway de Mensagens 
async function startGateway() {
    try {
        const connection = await amqp.connect('amqp://localhost');
        channel = await connection.createChannel();
        const queues = ['fila_temperatura', 'fila_lampada', 'fila_smartv'];

        for (const queue of queues) {
            await channel.assertQueue(queue, { durable: true });

            console.log(`[*] Aguardando mensagens na fila: ${queue}`);

            channel.consume(queue, (message) => {
                if (message) {
                    const content = message.content.toString();
                    console.log(`Recebido de ${queue}: ${content}`);
                    dispositivos[queue] = { tipo: queue, valor: content };
                    channel.ack(message);

                    if (queue === 'fila_smartv') {
                        const state = JSON.parse(content);
                        currentStateTV = state;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Erro ao iniciar o gateway:', error);
    }
}

//Recebe os estados dos atuadores que guardam o proprio estado
async function getActuatorsState() {
    const actuators = [];
    
    for (const [deviceName, address] of Object.entries(devices)) {
        try {
            if (deviceName === 'fila_smartv') {
                actuators.push({
                    device_name: 'fila_smartv',
                    state: currentStateTV
                });
            } else {
                const client = new devicesProto.ManageDevice(address, grpc.credentials.createInsecure());
                const state = await new Promise((resolve, reject) => {
                    client.getState({ device_name: deviceName }, (error, response) => {
                        error ? reject(error) : resolve(response);
                    });
                });
                //actuators.push({ device_name: deviceName, state });
            }
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


//Funcao para a reconhecer os comandos da TV, definindo seus próprios parametros para permitir a conversao do JSON para protobuf
async function sendCommandTV(command) {
    console.log(`Estado prévio da TV: ${JSON.stringify(currentStateTV)}`);

    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true
    });
    const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;

    const State = {
        power: currentStateTV.power,
        source: currentStateTV.source,
        platform: currentStateTV.platform
    };

    const request = {
        device_name: 'SMARTV',
        order: command.order,
        value: command.value,
        current_state: State
    };

    const tvClient = new devicesProto.ManageDevice('localhost:50051', grpc.credentials.createInsecure());
                
    return new Promise((resolve, reject) => {
        tvClient.command(request, (error, response) => {
            if (error) {
                console.log(`Erro ao enviar comando para atuador: ${error.message}`);
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

//Função para a Lampada e o Ar Condicionado
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


/*
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
*/

app.post('/send-command-tv', async (req, res) => {
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

//Inicializa o Gateway e Servidor
startGateway().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
});
