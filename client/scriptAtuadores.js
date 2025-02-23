const dispositivos = {};
let conectado = false; 

const savedUrl = localStorage.getItem("gatewayUrl");

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
            button.classList.toggle('show');  
        } else {
            button.classList.remove('show');  
        }
    });
}


async function enviarComando(order, value) {
    if (!conectado) {
      alert("Você precisa conectar ao Gateway primeiro!");
      return;
    }
    const comando = { order, value };
    
  
    try {
      const response = await fetch(`${savedUrl}/comando`, {
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
  

  function gerarTemplate(tipo, state) { 
    if (tipo === 'Air_Conditioner_1') {
        return `
        <div class="device" id="${tipo}">
            <h2 class="title-card">Ar Condicionado</h2>
            <img src="./images/ar-condicionado.png" alt="" />
            <div class="segment-container">
                <h3 class="title-card">Controle de Temperatura</h3>
                <div class="button-group">
                    <button  onclick="enviarComandoAr('increase', 1)">Aumentar +1°</button>
                    <button  onclick="enviarComandoAr('decrease', 1)">Diminuir -1°</button>
                </div>
            </div>
        </div>
        `;
    }

    if(tipo === 'Lamp_1'){
        return `
        <div class="device" id="${tipo}">
            <h2 class="title-card">Lampada</h2>
            <img src="./images/lampada-inteligente.png" alt="" />
            <div class="segment-container">
                <h3 class="title-card">Controle de Temperatura</h3>
                <div class="button-group">
                    <button  onclick="enviarComandoLamp('poweron', -1)">Ligar</button>
                    <button  onclick="enviarComandoLamp('poweroff', -1)">Desligar</button>
                </div>
            </div>
        </div>
        `;
    }
    
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




function atualizarOuCriarDispositivo(dispositivo) {
    const { device_name, state, error } = dispositivo;
    let container = document.querySelector("#devices-container");
    
    let existing = container.querySelector(`#${device_name}`);
    
    if (!existing) {
        const device = document.createElement("div");
        device.innerHTML = gerarTemplate(device_name, state);
        container.appendChild(device);
    } else {
        if (device_name !== 'Air_Conditioner_1') {
            const estadoElement = existing.querySelector('.temp');
            if (estadoElement) {
                estadoElement.textContent = `
                    ${state?.power ? 'Ligada' : 'Desligada'} | 
                    ${state?.source || 'Nenhuma fonte'} | 
                    ${state?.platform || 'Nenhuma plataforma'}
                `;
            }
        }
    }
}

async function conectarGateway() {

    try {
        const response = await fetch(`${savedUrl}/atuadores`);
        const dispositivos = await response.json();

        document.querySelector("#devices-container").innerHTML = '';

        dispositivos.forEach(dispositivo => {

            if (dispositivo.device_name === 'Air_Conditioner_1') {
                dispositivo.state = null;
            }
            atualizarOuCriarDispositivo(dispositivo);
        });

        habilitarComandos();
        conectado = true;

    } catch (error) {
        console.error("Erro ao conectar:", error);
        alert("Falha ao conectar ao Gateway");
    }
}


async function enviarComandoAr(order, value) {
    if (!conectado) {
        alert("Conecte ao Gateway primeiro!");
        return;
    }
    try {
        const response = await fetch(`${savedUrl}/send-command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                device_name: "Air_Conditioner_1",
                order,
                value
            })
        });
        const result = await response.json();
        if (result.error) {
            alert(`Erro: ${result.error}`);
        } else {
            conectarGateway();
        }
    } catch (error) {
        alert("Erro de comunicação");
    }
}


async function enviarComandoLamp(order, value) {
    if (!conectado) {
        alert("Conecte ao Gateway primeiro!");
        return;
    }
    try {
        const response = await fetch(`${savedUrl}/send-command`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                device_name: "Lamp_1",
                order,
                value
            })
        });
        const result = await response.json();
        if (result.error) {
            alert(`Erro: ${result.error}`);
        } else {
            conectarGateway();
        }
    } catch (error) {
        alert("Erro de comunicação");
    }
}

