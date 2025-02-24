const amqp = require('amqplib');

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
async function publishState(channel, state) {
    try {
        await channel.sendToQueue('fila_smartv', Buffer.from(JSON.stringify(state)), { persistent: true });
        console.log(`📤 Estado da TV publicado na fila: ${JSON.stringify(state)}`);
    } catch (error) {
        console.log(`Erro ao publicar estado da TV: ${error}`);
    }
}

// Função para consumir comandos e estados da fila no RabbitMQ
async function consumeState(channel) {
    channel.consume('fila_smartv', (message) => {
        if (message) {
            try {
                const content = message.content.toString();
                const data = JSON.parse(content);

                // Verifica se a mensagem é um comando
                if (data.command) {
                    console.log(`📡 Comando recebido: ${JSON.stringify(data)}`);

                    // Atualiza o estado global com base no comando
                    currentState = { ...currentState, ...data.state };
                    console.log(`🔄 Estado da TV atualizado: ${JSON.stringify(currentState)}`);

                    // Publica o novo estado na fila
                    publishState(channel, currentState);
                } else {
                    // Se não for um comando, trata como um estado
                    console.log(`📡 Estado recebido: ${JSON.stringify(data)}`);
                    currentState = data;
                }

                channel.ack(message); // Confirma o recebimento da mensagem
            } catch (error) {
                console.log(`Erro ao processar a mensagem: ${error}`);
            }
        }
    });
    console.log('🔄 Aguardando por comandos ou estados da TV...');
}

// Função para publicar o estado periodicamente
function startPeriodicPublishing(channel) {
    setInterval(async () => {
        await publishState(channel, currentState);
    }, 5000); // Publica o estado a cada 5 segundos
}

// Inicializa o sensor
async function startSensor() {
    try {
        const channel = await connectRabbitMQ();
        
        // Publica o estado inicial da TV
        await publishState(channel, currentState);
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