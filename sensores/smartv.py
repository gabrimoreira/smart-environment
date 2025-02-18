import pika
import time
import random
import json

# Configuração do RabbitMQ
QUEUE_NAME = 'fila_tv'
connection = pika.BlockingConnection(pika.ConnectionParameters('localhost'))
channel = connection.channel()
channel.queue_declare(queue=QUEUE_NAME, durable=True)

def get_tv_state():
    power = random.choice(["on", "off"])
    if power == "on":
        source = random.choice(["streaming", "cable"])
        if source == "streaming":
            platform = random.choice(["netflix", "hbomax", "disney+"])
        else:
            platform = random.choice(["globo", "record", "sbt"])
    else:
        source = "none"
        platform = "none"
    
    return {
        "device": "smart_tv",
        "power": power,
        "source": source,
        "platform": platform
    }

while True:
    tv_state = get_tv_state()
    channel.basic_publish(
        exchange='',
        routing_key=QUEUE_NAME,
        body=json.dumps(tv_state),
        properties=pika.BasicProperties(delivery_mode=2)  # Mensagem persistente
    )
    print(f"[Sensor] Published: {tv_state}")
    time.sleep(5)  # Publica estado a cada 5 segundos
