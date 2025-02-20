const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const readline = require("readline-sync");

// Carrega o arquivo .proto
const PROTO_PATH = "../devices.proto"; // Ajuste o caminho para subir um nível
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const devicesProto = grpc.loadPackageDefinition(packageDefinition).devices;

// Conecta ao servidor gRPC do atuador (Smart TV)
const client = new devicesProto.ManageDevice(
  "localhost:50051",
  grpc.credentials.createInsecure()
);

function sendCommand(order, value) {
  console.log(`🔵 Enviando comando: ${order} = ${value}...`);

  const request = { device_name: "SmartTV", order, value };
  client.command(request, (err, response) => {
    if (err) {
      console.error(`❌ Erro ao enviar comando: ${err.message}`);
    } else {
      console.log(`✅ Comando enviado com sucesso!`);
      console.log(`📺 Resposta do servidor:`, response); 
    }
    setTimeout(() => {
      client.getState({ device_name: "SmartTV" }, (err, stateResponse) => {
        if (err) {
          console.error(`❌ Erro ao obter estado da TV: ${err.message}`);
        } else {
          console.log(`📺 Estado atual da TV após o comando:`, stateResponse);
        }
        menu();
      });
    }, 500);
  });
  ;
}

async function ligarTV() {
  try {
    sendCommand("power", 1);
  } catch (error) {
    console.log(error);
  }
}

async function desligarTV() {
  try {
    sendCommand("power", 0);
  } catch (error) {
    console.log(error);
  }
}

async function alterarFonte() {
  try {
    const response = await new Promise((resolve, reject) => {
      client.getState({ device_name: "SmartTV" }, (err, response) => {
        if (err) {
          reject(`❌ Erro ao obter estado da TV: ${err.message}`);
        } else {
          resolve(response);
        }
      });
    });

    if (!response || response.power !== "on") {
      console.log("⚠️ A TV está desligada! Ligue-a primeiro.");
      return menu();
    }

    const sourceOption = readline.questionInt("Escolha: [1] Streaming | [2] Cabo: ");
    
    if (sourceOption === 1) {
      await sendCommand("source", sourceOption);  // Envia o comando para alterar a fonte
      await escolherPlataforma();  // Chama diretamente a função para escolher a plataforma
    } else if (sourceOption === 2) {
      await sendCommand("source", sourceOption);  // Envia o comando para alterar a fonte
      await escolherCanal();  // Chama diretamente a função para escolher o canal
    } else {
      console.log("option inválida!");
      return alterarFonte();  // Chama novamente em caso de escolha inválida
    }

  } catch (error) {
    console.log(error);
  }
}


async function escolherCanal() {
  console.log("Opções disponíveis para Cabo: ");
  console.log("[4] Globo, [5] SBT, [6] Record");
  
  const channelChoice = readline.questionInt("Escolha uma option: ");
  if (channelChoice < 4 || channelChoice > 6) {
    console.log("option inválida!");
    return escolherCanal();  // Chama novamente a função em caso de escolha inválida
  }
  
  try {
    sendCommand("channel", channelChoice);  // Envia o comando para mudar o canal
    console.log("Canal escolhido com sucesso!");
    menu();  // Retorna ao menu após a escolha
  } catch (error) {
    console.log(error);  // Exibe erro caso haja algum problema ao enviar o comando
  }
}

async function escolherPlataforma() {
  console.log("Opções disponíveis para Streaming: ");
  console.log("[1] Netflix, [2] Disney+, [3] Prime");
  
  const platformChoice = readline.questionInt("Escolha uma option: ");
  if (platformChoice < 1 || platformChoice > 3) {
    console.log("option inválida!");
    return escolherPlataforma();  // Chama novamente a função em caso de escolha inválida
  }

  try {
    await sendCommand("platform", platformChoice);  // Envia o comando para mudar a plataforma
    console.log("Plataforma escolhida com sucesso!");
    menu();  // Retorna ao menu após a escolha
  } catch (error) {
    console.log(error);  // Exibe erro caso haja algum problema ao enviar o comando
  }
}



async function menu() {
  try {
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

    const option = readline.questionInt("Escolha uma option: ");

    switch (option) {
      case 1:
        await ligarTV();
        break;
      case 2:
        await desligarTV();
        break;
      case 3:
        await alterarFonte();
        break;
      case 4:
        if (state.source === "streaming") {
          await escolherPlataforma();
        } else if (state.source === "cabo") {
          await escolherCanal();
        }
        break;
      case 5:
        console.log("Encerrando...");
        process.exit();
        break;
      default:
        console.log("option inválida. Tente novamente.");
        await menu();
    }
  } catch (error) {
    console.log(error);
  }
}

async function escolherPlataforma() {
  console.log("Opções disponíveis para Streaming: ");
  console.log("[1] Netflix, [2] Disney+, [3] Prime");
  
  const platformChoice = readline.questionInt("Escolha uma option: ");
  if (platformChoice < 1 || platformChoice > 3) {
    console.log("option inválida!");
    return escolherPlataforma();
  }
  
  try {
    await sendCommand("platform", platformChoice);
    console.log("Plataforma escolhida com sucesso!");
    menu();
  } catch (error) {
    console.log(error);
  }
}

async function escolherCanal() {
  console.log("Opções disponíveis para Cabo: ");
  console.log("[4] Globo, [5] SBT, [6] Record");
  
  const channelChoice = readline.questionInt("Escolha uma option: ");
  if (channelChoice < 4 || channelChoice > 6) {
    console.log("option inválida!");
    return escolherCanal();
  }
  
  try {
    await sendCommand("platform", channelChoice);
    console.log("Canal escolhido com sucesso!");
    menu();
  } catch (error) {
    console.log(error);
  }
}


// Inicia o menu interativo
menu();
