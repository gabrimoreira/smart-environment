import grpc
import pika
import threading

import device_pb2, device_pb2_grpc

# RabbitMQ Configuration
RABBITMQ_HOST = 'localhost'
TEMP_QUEUE = 'temperature_data'
LIGHT_QUEUE = 'light_data'

# Store latest sensor readings
latest_data = {"temperature": None, "light": None}

# gRPC Devices Configuration
DEVICES = {
    "Air_Conditioner_1": "localhost:8888",
    "Lamp_1": "localhost:8889"
}

# gRPC Communication
def send_command(device_name, order, value):
    if device_name not in DEVICES:
        return f"Error: Device '{device_name}' not found."

    address = DEVICES[device_name]
    channel = grpc.insecure_channel(address)
    stub = device_pb2_grpc.ManageDeviceStub(channel)

    try:
        request = stub.command(device_pb2.CommandRequest(device_name=device_name, order=order, value=value))
        response = f"DEVICE_NAME: {request.device_name}; RESPONSE: {request.response}"
    except grpc.RpcError as e:
        response = f"Error communicating with {device_name}: {e}"

    channel.close()
    return response

# RabbitMQ Callbacks (Sensor Data Handling)
def callback_temperature(ch, method, properties, body):
    latest_data["temperature"] = body.decode()
    #print(f"Updated Temperature: {latest_data['temperature']}°C")

def callback_light(ch, method, properties, body):
    latest_data["light"] = body.decode()
    #print(f"Updated Light: {latest_data['light']}")

# RabbitMQ Listener in a Separate Thread
def start_rabbitmq_listener():
    connection = pika.BlockingConnection(pika.ConnectionParameters(host=RABBITMQ_HOST))
    channel = connection.channel()

    channel.queue_declare(queue=TEMP_QUEUE)
    channel.queue_declare(queue=LIGHT_QUEUE)

    channel.basic_consume(queue=TEMP_QUEUE, on_message_callback=callback_temperature, auto_ack=True)
    channel.basic_consume(queue=LIGHT_QUEUE, on_message_callback=callback_light, auto_ack=True)

    print("Gateway listening for sensor data...")
    channel.start_consuming()

# Start RabbitMQ Listener in Background
rabbitmq_thread = threading.Thread(target=start_rabbitmq_listener, daemon=True)
rabbitmq_thread.start()

# Main Interaction Loop
if __name__ == '__main__':
    while True:
        print("\nOptions: [1] Control Device [2] Get Sensor Data [3] Exit")
        choice = input("Select: ")

        if choice == "1":
            device = input("Enter device name: ")
            command = input("Enter command: ")
            value = int(input("Enter value (if applicable, else enter 0): "))
            print(send_command(device, command, value))

        elif choice == "2":
            print(f"Latest Temperature: {latest_data['temperature']}°C")
            print(f"Latest Lamp State: {latest_data['light']}")

        elif choice == "3":
            print("Exiting...")
            break

        else:
            print("Invalid option, try again.")
