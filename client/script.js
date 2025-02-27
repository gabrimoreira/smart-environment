const dispositivos = {};

const platformLogos = {
    "netflix": "images/extra/Netflix.png",
    "disney+": "images/extra/Disney+.png",
    "prime": "images/extra/prime.png",
    "globo": "images/extra/Globo.png",
    "sbt": "images/extra/SBT.png",
    "record": "images/extra/record.png",
    "nenhum": "images/extra/pontos.png" 
};

document.addEventListener("DOMContentLoaded", () => {
    const savedUrl = localStorage.getItem("gatewayUrl");
    if (savedUrl) {
        document.getElementById("gatewayUrl").value = savedUrl;
    }
});

async function conectarGateway() {
    let baseUrl = document.getElementById("gatewayUrl").value.trim();

    if (!baseUrl) {
        alert("Por favor, insira uma URL válida.");
        return;
    }

    if (baseUrl.endsWith("/")) {
        baseUrl = baseUrl.slice(0, -1);
    }

    localStorage.setItem("gatewayUrl", baseUrl);

    const urlSensores = `${baseUrl}/sensores`;

    try {
        const response = await fetch(urlSensores);
        if (!response.ok) {
            throw new Error(`Erro na resposta: ${response.status}`);
        }

        const json = await response.json();
        console.log("Dados recebidos:", json);

        json.forEach(dado => {
            atualizarOuCriarDispositivo(dado.tipo, dado.valor);
            console.log("Tipo:", dado.tipo, "Valor:", dado.valor);
        });

    } catch (error) {
        console.error("Erro ao conectar ao gateway:", error.message);
    }
}


function gerarTemplate(tipo, valor) {
    const templates = {
        "fila_temperatura": `
            <div class="img-device-temp "></div>
            <div class="card-text">
                <h2 class="title-card">Sensor de Temperatura</h2>
                <div>Acompanhe a temperatura em tempo real</div>
                <div class="temp">${valor}°C</div>
            </div>
        `,
        "fila_tv": `
            <div class="img-device-tv"></div>
            <div class="card-text">
                <h2 class="title-card">Televisão</h2>
                <div>Status da TV: <span class="temp">${valor}</span></div>
                <button onclick="enviarComando('tv', 'power', 1)">Ligar</button>
                <button onclick="enviarComando('tv', 'power', 0)">Desligar</button>
            </div>
        `,"fila_smartv": `
            <div class="img-device-tv"></div>
            <div class="card-text">
                <h2 class="title-card">Televisão</h2>
                <div class="segment-container">
                    <div class="States-group">
                        <h4>Energia</h4>
                        <div class="temp"><p>${valor.power}</p></div>
                    </div>
                    <div class="States-group">
                        <h4>Tipo</h4>
                        <div class="temp"><p>${valor.source}</p></div>
                    </div>
                    <div class="States-group">
                        <h4>Plataforma</h4>
                        <div class="platform-container">
                            <img src="${platformLogos[valor.platform]}" alt="${valor.platform}">
                        </div>
                    </div>
                </div>
            </div>
        `,
        "fila_lampada": `
            <div class="img-device-lamp"></div>
            <div class="card-text">
                <h2 class="title-card">Lâmpada Inteligente</h2>
                <div>Estado atual:</div>
                <div class="temp">${valor}</div>
            </div>
        `
    };

    return templates[tipo] || `<div class="card-text"><h2>${tipo}</h2><div class="temp">${valor}</div></div>`;
}


function atualizarOuCriarDispositivo(tipo, valor) {
    let container = document.querySelector(".devices");

    if (!dispositivos[tipo]) {
        console.log(`✅ Criando novo card para: ${tipo}`);
        const device = document.createElement("div");
        device.classList.add("device");
        device.id = tipo;

        if (tipo === "fila_smartv") {
            valor = JSON.parse(valor); 
        }

        device.innerHTML = gerarTemplate(tipo, valor);
        container.appendChild(device);
        dispositivos[tipo] = device;
        console.log("📌 Elemento adicionado ao DOM:", device);
    } else {
        console.log(`Atualizando card existente para: ${tipo}`);

        //Fazendo o PARSE para interpretar a variável JSON da variável valor da smartTV 
        if (tipo === "fila_smartv") {
            const state = JSON.parse(valor);
            const card = dispositivos[tipo].querySelector(".card-text");
            card.querySelectorAll(".temp")[0].textContent = state.power;
            card.querySelectorAll(".temp")[1].textContent = state.source;
            const imgElement = card.querySelector(".platform-container img");
            if (imgElement) {
                imgElement.src = platformLogos[state.platform]; 
                imgElement.alt = state.platform;
            }
        } else {
            dispositivos[tipo].querySelector(".temp").textContent = valor;
        }
    }
}
