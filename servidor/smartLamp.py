"""Air Conditioner implementation using GRPC"""

from concurrent import futures
import grpc
import devices_pb2, devices_pb2_grpc

DEVICE_NAME = "Lamp_1"
STATUS_FILE = "lampstate.txt"

class ManageDevice(devices_pb2_grpc.ManageDeviceServicer):
    def command(self, request, context):
        try:
            with open(STATUS_FILE, "r") as file:
                current_status = file.read()
        except (FileNotFoundError, ValueError):
            current_status = "poweroff"

        if request.device_name != DEVICE_NAME:
            return devices_pb2.CommandReply(device_name=DEVICE_NAME, response="Device not recognized.")            
        else:
            order = str(request.order)
            if(order == "poweron"):
                if(current_status == order):
                    return devices_pb2.CommandReply(device_name=DEVICE_NAME, response='Lamp already on.')
                current_status = order

            elif (order == "poweroff"):
                if(current_status == order):
                    return devices_pb2.CommandReply(device_name=DEVICE_NAME, response='Lamp already off.')
                current_status = order
            else:
                return devices_pb2.CommandReply(device_name=DEVICE_NAME, response='Command not found.')
        print(f"Command: {order} | New state: {current_status}")
        with open(STATUS_FILE, "w") as file:
            file.write(current_status)

        message = (f"Lamp turned on" if current_status == f"poweron" else f"Lamp turned off")
        return devices_pb2.CommandReply(device_name=DEVICE_NAME, response=message)
        
def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=1))
    devices_pb2_grpc.add_ManageDeviceServicer_to_server(ManageDevice(), server)
    server.add_insecure_port('localhost:8889')
    server.start()
    server.wait_for_termination()

if __name__ == '__main__':
    serve()