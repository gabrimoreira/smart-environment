import pika
import time

RABBITMQ_HOST = 'localhost'
QUEUE_NAME = 'light_data'
STATUS_FILE = 'lampstate.txt'

def publish_light():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    channel.queue_declare(queue=QUEUE_NAME)

    last_state = ''
    while True:
        try:
            with open(STATUS_FILE, 'r') as file:
                lamp_state = file.read()
        except(FileNotFoundError):
            print(f"File Not Found.")
            channel.basic_publish(exchange='', routing_key=QUEUE_NAME, body=f"Could not get info on the lamp.")
            break
        
        if (lamp_state != last_state): # Se o estado da lâmpada não mudou, não há porque informar novamente
            last_state = lamp_state
            message = f"{lamp_state}"
            channel.basic_publish(exchange='', routing_key=QUEUE_NAME, body=message)
            print(f"Published Brightness: {message}")

        time.sleep(5)

    connection.close()

if __name__ == '__main__':
    publish_light()
