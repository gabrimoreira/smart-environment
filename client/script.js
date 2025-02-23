const dispositivos = {};

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


// async function enviarComando(dispositivo, comando, valor) {
//     try {
//         const response = await fetch("http://localhost:3000/comando", {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify({ dispositivo, comando, valor })
//         });

//         const data = await response.json();
//         if (data.sucesso) {
//             alert("Comando enviado com sucesso!");
//         } else {
//             alert(`Erro: ${data.mensagem}`);
//         }
//     } catch (error) {
//         console.error("Erro ao conectar com o servidor:", error);
//         alert("Erro de conexão. Tente novamente mais tarde.");
//     }
// }

