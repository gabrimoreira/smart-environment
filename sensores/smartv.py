import pika
import time
import json

# Configurações
RABBITMQ_HOST = 'localhost'
QUEUE_NAME = 'fila_smartv'
FILE_PATH = '../servidor/tvstate.json'

# Função para ler o estado da TV do arquivo JSON
def read_state_from_file():
    try:
        with open(FILE_PATH, 'r') as file:
            return json.load(file)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Erro ao ler o estado da TV: {e}")
        return None

# Função para publicar o estado da TV no RabbitMQ
def publish_state(channel):
    state = read_state_from_file()
    if state:
        message = json.dumps(state)
        channel.basic_publish(
            exchange='',
            routing_key=QUEUE_NAME,
            body=message,
            properties=pika.BasicProperties(delivery_mode=2)  # Torna a mensagem persistente
        )
        print(f"📤 Estado da TV publicado na fila: {message}")

# Função principal
def start_sensor():
    try:
        # Conecta ao RabbitMQ
        connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
        channel = connection.channel()

        # Declara a fila (se não existir, ela será criada)
        channel.queue_declare(queue=QUEUE_NAME, durable=True)

        print('Conexão com RabbitMQ estabelecida.')

        # Publica o estado da TV a cada 5 segundos
        while True:
            publish_state(channel)
            time.sleep(5)

    except Exception as e:
        print(f"Erro ao iniciar o sensor: {e}")
    finally:
        if 'connection' in locals() and connection.is_open:
            connection.close()

if __name__ == '__main__':
    print('TV iniciado, publicando estado da TV no RabbitMQ...')
    start_sensor()