import pika
import grpc
import time
import devices_pb2
import devices_pb2_grpc

# Configuração do RabbitMQ
RABBITMQ_HOST = "localhost"
QUEUE_NAME = "fila_tv"

# Conectar ao RabbitMQ
connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
channel = connection.channel()
channel.queue_declare(queue=QUEUE_NAME, durable=True)

# Conectar ao servidor gRPC (controlTV.py)
GRPC_SERVER = "localhost:50051"
channel_grpc = grpc.insecure_channel(GRPC_SERVER)
stub = devices_pb2_grpc.ManageDeviceStub(channel_grpc)

def get_tv_state():
    """Solicita o estado atual da TV via gRPC"""
    try:
        response = stub.getState(devices_pb2.TVRequest(device_name="SmartTV"))
        return {
            "power": response.power,
            "source": response.source,
            "platform": response.platform
        }
    except Exception as e:
        print(f"Erro ao buscar estado da TV: {e}")
        return None

def publish_state():
    """Publica o estado da TV no RabbitMQ"""
    while True:
        state = get_tv_state()
        if state:
            message = str(state)
            channel.basic_publish(exchange='', routing_key=QUEUE_NAME, body=message)
            print(f"📡 Estado da TV publicado: {message}")
        time.sleep(5)  # Publica a cada 5 segundos

if __name__ == "__main__":
    print("📺 [Sensor] TV Sensor iniciado, publicando estado no RabbitMQ...")
    publish_state()
