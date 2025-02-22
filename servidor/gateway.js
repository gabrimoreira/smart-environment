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

const client = new devicesProto.ManageDevice(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

async function sendCommand(device_name, order, value) {
    console.log(`🔵 Enviando comando: ${order} = ${value}...`);

    const request = { device_name, order, value };
    return new Promise((resolve, reject) => {
        client.command(request, (err, response) => {
            if (err) {
                console.error(`❌ Erro ao enviar comando: ${err.message}`);
                reject(err);
            } else {
                console.log(`✅ Comando enviado com sucesso!`);
                console.log(`📺 Resposta do servidor gRPC:`, response);

                smartTV.state = response.currentState; 

                resolve(response);
                return {sucesso: true};
            }
        });
    });
}

class SmartTV{
    constructor(){
        this.state = {power: "off", source: "none", platform: "none"}
    }
    async  ligarTV() {
        try {
            await sendCommand("SmartTV", "power", 1);
        } catch (error) {
            console.log(error);
        }
    }
    
    async desligarTV() {
        try {
            await sendCommand("SmartTV", "power", 0);
        } catch (error) {
            console.log(error);
        }
    }

    async alterarFonte(value) {
      try {
        if ( this.state.power !== "on") {
          console.log("⚠️ A TV está desligada! Ligue-a primeiro.");
          return ;
        }
        if (![1, 2].includes(value)) {
            console.log("❌ Opção inválida para fonte.");
            return;
        }

        await sendCommand("SmartTV","source", value);
        console.log(`✅ Fonte alterada para ${this.state.source}`);
      } catch (error) {
        console.log(error);
      }
    }
    
    async escolherPlataforma(value) {
        if (this.state.source !== "streaming") {
            console.log("⚠️ A TV não está no modo Streaming!");
            return;
        }

        const plataformas = { 1: "Netflix", 2: "Disney+", 3: "Prime" };
        if (!plataformas[value]) {
            console.log("❌ Plataforma inválida!");
            return;
        }

        await sendCommand("SmartTV","platform", value);
        console.log(`✅ Plataforma alterada para ${plataformas[value]}`);
    }
    
    async escolherCanal(value) {
        if (this.state.source !== "cabo") {
            console.log("⚠️ A TV não está no modo Cabo!");
            return;
        }

        const canais = { 4: "Globo", 5: "SBT", 6: "Record" };
        if (!canais[value]) {
            console.log("❌ Canal inválido!");
            return;
        }

        await sendCommand("SmartTV","channel", value);
        console.log(`✅ Canal alterado para ${canais[value]}`);
    }

    async executarComando(option, value) {
        switch (option) {
            case "power":
                if (value === 1) {
                    await this.ligarTV();
                } else if (value === 0) {
                    await this.desligarTV();
                } else {
                    console.log("❌ Valor inválido para power (use 0 ou 1).");
                }
                break;
            
            case "source":
                await this.alterarFonte(value);
                break;
            
            case "platform":
                if (this.state.source === "streaming") {
                    await this.escolherPlataforma(value);
                } else {
                    console.log("⚠️ A TV não está no modo Streaming!");
                }
                break;
            
            case "channel":
                if (this.state.source === "cabo") {
                    await this.escolherCanal(value);
                } else {
                    console.log("⚠️ A TV não está no modo Cabo!");
                }
                break;

            default:
                console.log("Opção inválida. Tente novamente.");
        }
    }
}


let dispositivos = {}; 

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

const smartTV = new SmartTV();


// Rotas HTTP
app.get('/sensores', (req, res) => {
    res.json(Object.values(dispositivos));
});

app.get('/atuadores', (req, res) => {
    const device_name = req.params.device_name;
  
    client.getState({ device_name }, (error, response) => {
      if (error) {
        res.status(500).json({ error: error.message });
      } else {
        res.json(response); // Retorna o estado do atuador
      }
    });
});

  
app.post('/comando', async (req, res) => {
    const { order, value } = req.body;
    console.log("Corpo da requisição", req.body); 

    try {
        await smartTV.executarComando(order, value);
        res.json({ success: true, message: "Comando executado com sucesso!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Inicializa o Gateway e Servidor
startGateway().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        // menu(); // Inicia o menu interativo
    });
});