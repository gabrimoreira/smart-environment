const amqp = require('amqplib');
const fs = require('fs');

let printCounter = 0;
FILE_PATH = './servidor/tvstate.json';
RABBITMQ_HOST = 'localhost'
QUEUE_NAME = 'fila_smartv'

//Ler o estado da TV do arquivo JSON
function read_state_from_file() {
    try {
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Erro ao ler o estado da TV:", error);
        return 
    }
}

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
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}


async function publishState(channel) {
    const state = read_state_from_file();
    await channel.sendToQueue('fila_smartv', Buffer.from(JSON.stringify(state)), { persistent: true });
    console.log(`📤 Estado da TV publicado (${printCounter}) na fila: ${JSON.stringify(state)}`);
    printCounter++;
}


function startPeriodicPublishing(channel) {
    setInterval(async () => {
        await publishState(channel);
    }, 5000);  
}

async function startSensor() {
    try {
        const channel = await connectRabbitMQ();
        startPeriodicPublishing(channel);
    } catch (error) {
        console.log(`Erro ao iniciar o sensor: ${error}`);
    }
}

startSensor().then(() => {
    console.log('TV iniciado, publicando estado da TV no RabbitMQ...');
});