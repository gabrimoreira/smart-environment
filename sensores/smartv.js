const amqp = require('amqplib');

let printCounter = 0;
// Estado inicial da TV no sensor
let currentState = {
    power: "desligado",
    source: "nenhum",
    platform: "nenhum"
};

// Conectar ao RabbitMQ
async function connectRabbitMQ() {
    while (true) {
        try {
            const connection = await amqp.connect('amqp://localhost');
            const channel = await connection.createChannel();
            await channel.assertQueue('fila_smartv', { durable: true });
            console.log('Conexão com RabbitMQ estabelecida.');
            return channel;
        } catch (error) {
            console.log(`Erro ao conectar ao RabbitMQ: ${error}. Tentando novamente...`);
            await new Promise(resolve => setTimeout(resolve, 5000)); // Tenta reconectar a cada 5 segundos
        }
    }
}

// Função para publicar o estado da TV na fila do RabbitMQ
async function publishState(channel, state, printCounter) {
    try {
        await channel.sendToQueue('fila_smartv', Buffer.from(JSON.stringify(state)), { persistent: true });
        console.log(`Estado da TV publicado (${printCounter}) na fila: ${JSON.stringify(state)}`);
    } catch (error) {
        console.log(`Erro ao publicar estado da TV: ${error}`);
    }
}

// Função para consumir comandos e estados da fila no RabbitMQ
async function consumeState(channel) {
    channel.consume('fila_smartv', (message) => {
        if (message) {
            try {
                const newState = JSON.parse(message.content.toString());
                console.log(`📡 Estado da TV recebido: ${JSON.stringify(newState)}`);

                // Atualiza o estado atual da TV
                currentState = newState;
                channel.ack(message); // Confirma o processamento da mensagem

                console.log(`🔄 Estado da TV atualizado: ${JSON.stringify(currentState)}`);

            } catch (error) {
                console.log(`Erro ao processar a mensagem: ${error}`);
                channel.ack(message); // Confirma a mensagem mesmo em caso de erro
            }
        }
    });
    console.log('🔄 Aguardando por comandos da TV...');
}

// Função para publicar o estado periodicamente
function startPeriodicPublishing(channel) {
    setInterval(async () => {
        printCounter++;
        await publishState(channel, currentState, printCounter);
    }, 5000); // Publica o estado a cada 5 segundos
}

// Inicializa o sensor
async function startSensor() {
    try {
        const channel = await connectRabbitMQ();
        
        // Inicia o consumo de mensagens da fila
        await consumeState(channel);

        // Inicia a publicação periódica do estado
        startPeriodicPublishing(channel);
    } catch (error) {
        console.log(`Erro ao iniciar o sensor: ${error}`);
    }
}

// Inicia o sensor
startSensor().then(() => {
    console.log('📺 [Sensor] TV Sensor iniciado, consumindo e publicando estado da TV no RabbitMQ...');
});