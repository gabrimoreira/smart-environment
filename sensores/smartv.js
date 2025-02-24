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
        const stateToPublish = {
            ...state,
            messageSource: "sensor" // Adiciona um identificador para mensagens do sensor
        };
        await channel.sendToQueue('fila_smartv', Buffer.from(JSON.stringify(stateToPublish)), { persistent: true });
        console.log(`📤 Estado da TV publicado (${printCounter}) na fila: ${JSON.stringify(stateToPublish)}`);
    } catch (error) {
        console.log(`Erro ao publicar estado da TV: ${error}`);
    }
}

// Função para consumir comandos e estados da fila no RabbitMQ
async function consumeState(channel) {
    channel.consume('fila_smartv', async (message) => {
        if (message) {
            try {
                const newState = JSON.parse(message.content.toString());
                console.log(`📩 Mensagem recebida no sensor: ${JSON.stringify(newState)}`);


                // Processa apenas mensagens do gateway
                if (newState.messageSource === "gateway") {
                    
                    currentState = { ...newState }; 
                    delete currentState.messageSource;  

                    console.log(`🔄 Estado da TV atualizado vindo do gateway: ${JSON.stringify(currentState)}`);

                    printCounter++;
                    await publishState(channel, currentState, printCounter);
                } else {
                    channel.ack(message); // Descarta mensagens de outras fontes
                }

            } catch (error) {
                console.log(`Erro ao processar a mensagem: ${error}`);
                channel.ack(message); // Confirma a mensagem mesmo em caso de erro
            }
        }
    });
    console.log('🔄 Aguardando por comandos da TV...');
}

function startPeriodicPublishing(channel) {
    setInterval(async () => {
        printCounter++;
        await publishState(channel, currentState, printCounter);
    }, 5000); 
}


async function startSensor() {
    try {
        const channel = await connectRabbitMQ();
        
        await consumeState(channel);

        startPeriodicPublishing(channel);
    } catch (error) {
        console.log(`Erro ao iniciar o sensor: ${error}`);
    }
}

startSensor().then(() => {
    console.log('📺 [Sensor] TV Sensor iniciado, consumindo e publicando estado da TV no RabbitMQ...');
});