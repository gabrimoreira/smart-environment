const amqp = require('amqplib');

let currentTemperature = 22;
let printCounter = 0;
let channel;

async function connectRabbitMQ() {
    while (true) {
        try {
            const connection = await amqp.connect('amqp://localhost');
            channel = await connection.createChannel();
            await channel.assertQueue('fila_temperatura', { durable: true });
            console.log('Conexão com RabbitMQ estabelecida.');
            return channel;
        } catch (error) {
            console.log(`Erro ao conectar ao RabbitMQ: ${error}. Tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}


function generateTemperature() {
    const adjustment = Math.random() > 0.5 ? 0.2 : -0.2; // Adiciona ou subtrai 0.5
    currentTemperature += adjustment; // Ajusta a temperatura
    return parseFloat(currentTemperature.toFixed(2)); // Retorna a temperatura ajustada, com 2 casas decimais
}

function printTemperature() {
    setInterval(async () => {
        printCounter++;
        currentTemperature = generateTemperature();
        console.log(`🌡️ Temperatura atual (${printCounter}): ${currentTemperature}°C`);

        // Publica a temperatura gerada na fila do RabbitMQ
        try {
            await publishTemperature(currentTemperature);
        } catch (error) {
            console.log(`Erro ao publicar temperatura: ${error}`);
        }
    }, 5000);
}

async function publishTemperature(temperature) {
  if (!channel) {
      throw new Error('Canal RabbitMQ não inicializado.');
  }

  const message = {
      temperature: temperature
  };

  await channel.sendToQueue('fila_temperatura', Buffer.from(JSON.stringify(message)), { persistent: true });
  console.log(`🌡️ Temperatura publicada na fila: ${temperature}°C`);
}

async function startSensor() {
    try {
        await connectRabbitMQ();
        printTemperature();
    } catch (error) {
        console.log(`Erro ao iniciar o sensor de temperatura: ${error}`);
    }
}

startSensor().then(() => {
    console.log('🌡️ [Sensor] Sensor de temperatura iniciado e publicando dados no RabbitMQ...');
});