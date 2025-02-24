import pika
import time

RABBITMQ_HOST = 'localhost'
QUEUE_NAME = 'fila_temperatura'
TEMP_FILE = "./servidor/temperature.txt"

def publish_temperature():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    channel.queue_declare(queue=QUEUE_NAME, durable=True)


    while True:
        try:
            with open(TEMP_FILE, 'r') as file:
                current_temp = file.read()
        except(FileNotFoundError):
            print(f"File Not Found.")
            channel.basic_publish(exchange='', routing_key=QUEUE_NAME, body=f"Could not get temperature.")
            break

        message = f"{current_temp}"
        channel.basic_publish(exchange='', routing_key=QUEUE_NAME, body=message)
        print(f"Published temperature: {message} °C")

        time.sleep(5)

    connection.close()

if __name__ == '__main__':
    publish_temperature()