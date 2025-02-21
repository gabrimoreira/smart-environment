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




// gRPC - Comunicação com Smart TV
const PROTO_PATH = "../proto/devices.proto";
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;

const client = new devicesProto.ManageDevice(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

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
    console.log("Order", order)
    console.log("Value", value)
    res.json(order)
});
  
// async function sendCommand(order, value) {
//     console.log(`🔵 Enviando comando: ${order} = ${value}...`);

//     const request = { device_name: "SmartTV", order, value };
//     return new Promise((resolve, reject) => {
//         client.command(request, (err, response) => {
//             if (err) {
//                 console.error(`❌ Erro ao enviar comando: ${err.message}`);
//                 reject(err);
//             } else {
//                 console.log(`✅ Comando enviado com sucesso!`);
//                 console.log(`📺 Resposta do servidor:`, response);
//                 resolve(response);
//             }
//         });
//     }).finally(() => {
//         menu();
//     });
// }

 async function ligarTV() {
     try {
         await sendCommand("power", 1);
     } catch (error) {
         console.log(error);
     }
 }

// async function desligarTV() {
//     try {
//         await sendCommand("power", 0);
//     } catch (error) {
//         console.log(error);
//     }
// }

// async function alterarFonte(state) {
//     try {
//         if (!state || state.power !== "on") {
//             console.log("⚠️ A TV está desligada! Ligue-a primeiro.");
//             return menu();
//         }

//         const sourceOption = readline.questionInt("Escolha: [1] Streaming | [2] Cabo: ");
        
//         if (sourceOption === 1 || sourceOption === 2) {
//             await sendCommand("source", sourceOption);
//             console.log("Fonte alterada com sucesso!");
//         } else {
//             console.log("Opção inválida!");
//             return alterarFonte(state);
//         }
//     } catch (error) {
//         console.log(error);
//     }
// }

// async function escolherPlataforma(state) {
//     console.log("Opções disponíveis para Streaming: ");
//     console.log("[1] Netflix, [2] Disney+, [3] Prime");
    
//     const platformChoice = readline.questionInt("Escolha uma opção: ");
//     if (platformChoice < 1 || platformChoice > 3) {
//         console.log("Opção inválida!");
//         return escolherPlataforma(state);
//     }
    
//     try {
//         await sendCommand("platform", platformChoice);
//         console.log("Plataforma escolhida com sucesso!");
//     } catch (error) {
//         console.log(error);
//     }
// }

// async function escolherCanal(state) {
//     console.log("Opções disponíveis para Cabo: ");
//     console.log("[4] Globo, [5] SBT, [6] Record");
    
//     const channelChoice = readline.questionInt("Escolha uma opção: ");
//     if (channelChoice < 4 || channelChoice > 6) {
//         console.log("Opção inválida!");
//         return escolherCanal(state);
//     }
    
//     try {
//         await sendCommand("channel", channelChoice);
//         console.log("Canal escolhido com sucesso!");
//     } catch (error) {
//         console.log(error);
//     }
// }

// async function menu() {
//     try {
//         const state = await new Promise((resolve, reject) => {
//             client.getState({ device_name: "SmartTV" }, (err, response) => {
//                 if (err) {
//                     reject(`❌ Erro ao obter estado da TV: ${err.message}`);
//                 } else {
//                     resolve(response);
//                 }
//             });
//         });

//         console.log("\n=== Controle da Smart TV ===");
//         console.log("[1] Ligar TV");
//         console.log("[2] Desligar TV");
//         console.log("[3] Alterar Fonte (Cabo/Streaming)");

//         if (state.source === "streaming") {
//             console.log("[4] Escolher Plataforma");
//         } else if (state.source === "cabo") {
//             console.log("[4] Escolher Canal");
//         }

//         console.log("[5] Sair");

//         const option = readline.questionInt("Escolha uma opção: ");

//         switch (option) {
//             case 1:
//                 await ligarTV();
//                 break;
//             case 2:
//                 await desligarTV();
//                 break;
//             case 3:
//                 await alterarFonte(state);
//                 break;
//             case 4:
//                 if (state.source === "streaming") {
//                     await escolherPlataforma(state);
//                 } else if (state.source === "cabo") {
//                     await escolherCanal(state);
//                 }
//                 break;
//             case 5:
//                 console.log("Encerrando...");
//                 process.exit();
//                 break;
//             default:
//                 console.log("Opção inválida. Tente novamente.");
//                 await menu();
//         }
//     } catch (error) {
//         console.log(error);
//     }
// }

// Inicializa o Gateway e Servidor


startGateway().then(() => {
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
        // menu(); // Inicia o menu interativo
    });
});
