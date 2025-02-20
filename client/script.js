const dispositivos = {};

async function conectarGateway() {
    const url = "http://localhost:3000/dados"; 
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        
        const json = await response.json();
        console.log("Dados recebidos:", json);
        
        json.forEach(dado => {
            atualizarOuCriarDispositivo(dado.tipo, dado.valor);
        });

    } catch (error) {
        console.error(error.message);
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
            <div class="img-device-tv "></div>
            <div class="card-text">
                <h2 class="title-card">Televisão</h2>
                <div>Status da TV</div>
                <div class="temp">${valor}</div>
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
        const device = document.createElement("div");
        device.classList.add("device");
        device.id = tipo;
        device.innerHTML = gerarTemplate(tipo, valor);

        container.appendChild(device);
        dispositivos[tipo] = device;
    } else {
        dispositivos[tipo].querySelector(".temp").textContent = valor;
    }
}
