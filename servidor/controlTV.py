from concurrent import futures
import grpc
import devices_pb2
import devices_pb2_grpc
import time

class TVControlServicer(devices_pb2_grpc.ManageDeviceServicer):
    def __init__(self):
        self.state = {
            "power": "off",
            "source": "none",
            "platform": "none"
        }
    
    def command(self, request, context):
        if request.order == "power":
            self.state["power"] = "on" if request.value == 1 else "off"
        elif request.order == "source":
            self.state["source"] = "streaming" if request.value == 1 else "cable"
        elif request.order == "platform":
            platforms = {1: "netflix", 2: "hbomax", 3: "disney+", 4: "globo", 5: "record", 6: "sbt"}
            self.state["platform"] = platforms.get(request.value, "none")
        
        response = f"TV updated: {self.state}"
        print(response)
        return devices_pb2.CommandReply(device_name=request.device_name, response=response)


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    devices_pb2_grpc.add_ManageDeviceServicer_to_server(TVControlServicer(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    print("[Atuador] TV Control Server running on port 50051...")
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)

if __name__ == "__main__":
    serve()
