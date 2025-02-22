const dispositivos = {};
let conectado = false; // Variável para saber se já está conectado ao Gateway


// Habilita os botões de comando após a conexão
function habilitarComandos() {
    const devices = document.querySelectorAll('.device');
    devices.forEach(device => {
        const powerButton = device.querySelector('.btn-power');
        const sourceButton = device.querySelector('.btn-source');
        const platformButton = device.querySelector('.btn-platform');

        if (powerButton) powerButton.disabled = false;
        if (sourceButton) sourceButton.disabled = false;
        if (platformButton) platformButton.disabled = false;
    });
}


function toggleSubButtons(buttonType) {
    const buttons = document.querySelectorAll('.sub-buttons');
    buttons.forEach(button => {
        if (button.classList.contains(buttonType)) {
            button.classList.toggle('show');  // Exibe ou esconde os sub-botões
        } else {
            button.classList.remove('show');  // Esconde os outros sub-botões
        }
    });
}

// Função para enviar comandos ao Gateway
async function enviarComando(order, value) {
    if (!conectado) {
      alert("Você precisa conectar ao Gateway primeiro!");
      return;
    }
  
    const comando = { order, value };
  
    try {
      const response = await fetch("http://localhost:3000/comando", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(comando)
      });
  
      const data = await response.json();
      if (data.sucesso) {
        alert("Comando enviado com sucesso!");
      } else {
        alert(`Erro: ${data.mensagem}`);
      }
    } catch (error) {
      console.error("Erro ao conectar com o servidor:", error);
      alert("Erro de conexão. Tente novamente mais tarde.");
    }
  }
  

  function gerarTemplate(tipo) {
    return `
    <div class="device" id="${tipo}">
          <h2 class="title-card">Televisão</h2>
          <img src="./images/smart-tv.png" alt="" />
          <div class="segment-container">
            <h3 class="title-card">Energia</h3>
            <div class="button-group">
                <button onclick="enviarComando('power', 1)">Ligar</button>
                <button onclick="enviarComando('power', 0)">Desligar</button>
            </div>
          </div>
          <div class="segment-container">
            <h3 class="title-card">Serviço</h3>
            <div class="button-group">
              <button onclick="enviarComando('source', 1)">Streaming</button>
              <button onclick="enviarComando('source', 2)">Cabo</button>  
            </div>
          </div>
          <div class="segment-container">
            <h3 class="title-card">Plataforma</h3>
            <div class="button-group">
              <button onclick="enviarComando('platform', 1)">Netflix</button>
              <button onclick="enviarComando('platform', 2)">Disney+</button>
              <button onclick="enviarComando('platform', 3)">Prime</button>
            </div>
          </div>
          <div class="segment-container">
            <h3 class="title-card">Canal</h3>
            <div class="button-group">
              <button onclick="enviarComando('channel', 4)">Globo</button>
              <button onclick="enviarComando('channel', 5)">SBT</button>
              <button onclick="enviarComando('channel', 6)">Record</button>
            </div>
          </div>
    </div>
    `;
}




function atualizarOuCriarDispositivo(tipo, valor) {
    let container = document.querySelector("#devices-container");
  
    if (!dispositivos[tipo]) {
      const device = document.createElement("div");
      device.classList.add("device");
      device.id = tipo;
      device.innerHTML = gerarTemplate(tipo, valor);
  
      container.appendChild(device);
      dispositivos[tipo] = device;
    } else {
      // Atualiza o valor da TV no card
      dispositivos[tipo].querySelector(".temp").textContent = `Power: ${valor.power}, Source: ${valor.source}, Platform: ${valor.platform}`;
    }
}

async function conectarGateway() {
    const url = "http://localhost:3000/atuadores"; 
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const json = await response.json();
        console.log("Dispositivos recebidos:", json);

        // Aqui, verifique se o retorno está correto:
        if (!json) {
            throw new Error("Não foi possível recuperar o dispositivo");
        }

        // Atualiza a interface com o dispositivo
        atualizarOuCriarDispositivo("tv", json);

        // Habilitar os botões após a conexão
        habilitarComandos();

        // Marcar como conectado
        conectado = true;

    } catch (error) {
        console.error("Erro ao conectar ao Gateway:", error.message);
    }
}


