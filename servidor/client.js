const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const readline = require("readline-sync");

// Carrega o arquivo .proto
const PROTO_PATH = "./proto/devices.proto"; // Ajuste o caminho para subir um nível
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;

// Conecta ao servidor gRPC do atuador (Smart TV)
const client = new devicesProto.ManageDevice(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

async function sendCommand(order, value) {
  console.log(`🔵 Enviando comando: ${order} = ${value}...`);

  const request = { device_name: "SmartTV", order, value };
  return new Promise((resolve, reject) => {
    client.command(request, (err, response) => {
      if (err) {
        console.error(`❌ Erro ao enviar comando: ${err.message}`);
        reject(err);
      } else {
        console.log(`✅ Comando enviado com sucesso!`);
        console.log(`📺 Resposta do servidor:`, response);
        resolve(response);
      }
    });
  }).finally(() => {
    menu();
  });
}

async function ligarTV(state) {
  try {
    await sendCommand("power", 1);
  } catch (error) {
    console.log(error);
  }
}

async function desligarTV(state) {
  try {
    await sendCommand("power", 0);
  } catch (error) {
    console.log(error);
  }
}

async function alterarFonte(state) {
  try {
    if (!state || state.power !== "on") {
      console.log("⚠️ A TV está desligada! Ligue-a primeiro.");
      return menu();
    }

    const sourceOption = readline.questionInt("Escolha: [1] Streaming | [2] Cabo: ");
    
    if (sourceOption === 1 || sourceOption === 2) {
      await sendCommand("source", sourceOption);  // Envia o comando para alterar a fonte
      console.log("Fonte alterada com sucesso!");
      // No need to call menu() here, as sendCommand will call it
    } else {
      console.log("Opção inválida!");
      return alterarFonte(state);  // Chama novamente em caso de escolha inválida
    }
  } catch (error) {
    console.log(error);
  }
}

async function escolherPlataforma(state) {
  console.log("Opções disponíveis para Streaming: ");
  console.log("[1] Netflix, [2] Disney+, [3] Prime");
  
  const platformChoice = readline.questionInt("Escolha uma opção: ");
  if (platformChoice < 1 || platformChoice > 3) {
    console.log("Opção inválida!");
    return escolherPlataforma(state);
  }
  
  try {
    await sendCommand("platform", platformChoice);
    console.log("Plataforma escolhida com sucesso!");
    // No need to call menu() here, as sendCommand will call it
  } catch (error) {
    console.log(error);
  }
}

async function escolherCanal(state) {
  console.log("Opções disponíveis para Cabo: ");
  console.log("[4] Globo, [5] SBT, [6] Record");
  
  const channelChoice = readline.questionInt("Escolha uma opção: ");
  if (channelChoice < 4 || channelChoice > 6) {
    console.log("Opção inválida!");
    return escolherCanal(state);
  }
  
  try {
    await sendCommand("channel", channelChoice);
    console.log("Canal escolhido com sucesso!");
    // No need to call menu() here, as sendCommand will call it
  } catch (error) {
    console.log(error);
  }
}

async function menu() {
  try {
    // Fetch the current state of the TV
    const state = await new Promise((resolve, reject) => {
      client.getState({ device_name: "SmartTV" }, (err, response) => {
        if (err) {
          reject(`❌ Erro ao obter estado da TV: ${err.message}`);
        } else {
          resolve(response);
        }
      });
    });

    console.log("\n=== Controle da Smart TV ===");
    console.log("[1] Ligar TV");
    console.log("[2] Desligar TV");
    console.log("[3] Alterar Fonte (Cabo/Streaming)");

    // Exibe opções de canal ou plataforma com base na fonte
    if (state.source === "streaming") {
      console.log("[4] Escolher Plataforma");
    } else if (state.source === "cabo") {
      console.log("[4] Escolher Canal");
    }

    console.log("[5] Sair");

    const option = readline.questionInt("Escolha uma opção: ");

    switch (option) {
      case 1:
        await ligarTV(state);
        break;
      case 2:
        await desligarTV(state);
        break;
      case 3:
        await alterarFonte(state);
        break;
      case 4:
        if (state.source === "streaming") {
          await escolherPlataforma(state);
        } else if (state.source === "cabo") {
          await escolherCanal(state);
        }
        break;
      case 5:
        console.log("Encerrando...");
        process.exit();
        break;
      default:
        console.log("Opção inválida. Tente novamente.");
        await menu();
    }
  } catch (error) {
    console.log(error);
  }
}

// Inicia o menu interativo
menu();