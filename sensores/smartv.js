const amqp = require('amqplib');

// Estado inicial da TV no sensor
let currentState = {
    power: "desligado",
    source: "nenhum",
    platform: "nenhum"
};

// Counter for print_state
let printCounter = 0;

// Conectar ao RabbitMQ
async function connectRabbitMQ() {
    while (true) {
        try {
            const connection = await amqp.connect('amqp://localhost');
            const channel = await connection.createChannel();
            await channel.assertQueue('fila_tv', { durable: true });
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
        await channel.sendToQueue('fila_tv', Buffer.from(JSON.stringify(state)), { persistent: true });
        console.log(`📤 Estado da TV publicado na fila: ${JSON.stringify(state)}`);
    } catch (error) {
        console.log(`Erro ao publicar estado da TV: ${error}`);
    }
}

// Função para consumir o estado da TV da fila no RabbitMQ
async function consumeState(channel) {
    channel.consume('fila_tv', (message) => {
        if (message) {
            try {
                const newState = JSON.parse(message.content.toString());

                // Verifique se houve uma mudança no estado
                if (JSON.stringify(newState) !== JSON.stringify(currentState)) {
                    currentState = newState;
                    console.log(`📡 Novo estado da TV recebido: ${JSON.stringify(currentState)}`);
                    channel.ack(message); // Acknowledge the message

                    // Publicar o novo estado sempre que for alterado
                    publishState(channel, currentState);
                } else {
                    channel.ack(message); // Acknowledge the message, but no state change
                }
            } catch (error) {
                console.log(`Erro ao processar a mensagem: ${error}`);
            }
        }
    });
    console.log('🔄 Aguardando por novos estados da TV...');
}

// Função para imprimir o estado a cada 5 segundos
function printState() {
    setInterval(() => {
        printCounter++;
        console.log(`Estado atual da TV (${printCounter}): ${JSON.stringify(currentState, null, 4)}`);
    }, 5000); // Imprime o estado a cada 5 segundos
}

// Inicializa o sensor
async function startSensor() {
    try {
        const channel = await connectRabbitMQ();
        await consumeState(channel);

        // Publica o estado inicial da TV
        await publishState(channel, currentState);

        printState(); // Inicia a função para imprimir o estado
    } catch (error) {
        console.log(`Erro ao iniciar o sensor: ${error}`);
    }
}

// Inicia o sensor
startSensor().then(() => {
    console.log('📺 [Sensor] TV Sensor iniciado, consumindo e publicando estado da TV no RabbitMQ...');
});
