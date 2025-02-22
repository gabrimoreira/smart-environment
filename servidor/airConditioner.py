"""Air Conditioner implementation using GRPC"""

from concurrent import futures

import grpc

import devices_pb2, devices_pb2_grpc

MAX_TEMP = 32
MIN_TEMP = 16
DEVICE_NAME = "Air_Conditioner_1"
TEMP_FILE = "temperature.txt"

class ManageDevice(devices_pb2_grpc.ManageDeviceServicer):
    def command(self, request, context):
        print(f"Recebido no servidor Python: {request.device_name}, {request.order}, {request.value}")
        try:
            with open(TEMP_FILE, "r") as file:
                current_temp = int(file.read())
        except (FileNotFoundError, ValueError):
            current_temp = 22

        if request.device_name != DEVICE_NAME:
            print("oi")
            return devices_pb2.CommandReply(device_name=DEVICE_NAME, response="Device not recognized.")            
        else:
            order = str(request.order)
            value = int(request.value)
            if(order == "increase"):
                if(current_temp + value > MAX_TEMP):
                    return devices_pb2.CommandReply(device_name=DEVICE_NAME, response='Informed temperature too high! Please, inform another value.')
                current_temp += value

            elif (order == "decrease"):
                if(current_temp - value < MIN_TEMP):
                    return devices_pb2.CommandReply(device_name=DEVICE_NAME, response='Informed temperature too low! Please, inform another value.')
                current_temp -= value
            else:
                return devices_pb2.CommandReply(device_name=DEVICE_NAME, response='Command not found.')
        print(f"Command: {order} {value} | New Temp: {current_temp}")
        with open(TEMP_FILE, "w") as file:
            file.write(str(current_temp))

        return devices_pb2.CommandReply(device_name=DEVICE_NAME, response=f"Temperature set to {current_temp}")
        
def serve():
    print("oi")
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=1))
    print("oi1")
    devices_pb2_grpc.add_ManageDeviceServicer_to_server(ManageDevice(), server)
    print("oi2")
    server.add_insecure_port('localhost:8888')
    print("oi3")
    server.start()
    print("começou")
    server.wait_for_termination()
    print("terminou")

if __name__ == '__main__':
    serve()