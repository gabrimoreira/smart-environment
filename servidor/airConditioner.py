from concurrent import futures
import grpc
import devices_pb2
import devices_pb2_grpc

class AirConditionerServicer(devices_pb2_grpc.ManageDeviceServicer):
    def __init__(self):
        pass

    def handle_increase(self, state, value):
        """Increase the temperature"""
        new_temp = state.temperature + value
        if new_temp > 32:
            raise ValueError("Temperature too high! Max is 32°C.")
        state.temperature = new_temp

    def handle_decrease(self, state, value):
        """Decrease the temperature"""
        new_temp = state.temperature - value
        if new_temp < 16:
            raise ValueError("Temperature too low! Min is 16°C.")
        state.temperature = new_temp

    def command(self, request, context):
        try:
            # Extract the current state from the gRPC request
            if not request.current_state:
                raise ValueError("Current state is missing in the request.")
            
            state = request.current_state
            
            print(f"Comando recebido: {request.order}, valor: {request.value}, estado atual: {state}")
            
            # Handle the command
            if request.order == "increase":
                self.handle_increase(state, request.value)
            elif request.order == "decrease":
                self.handle_decrease(state, request.value)
            else:
                raise ValueError("Comando inválido.")

            # Prepare the gRPC response
            response = devices_pb2.CommandReply(
                device_name=request.device_name,
                response=f"Air Conditioner updated: {state}",
                current_state=state
            )

            print("Resposta do servidor gRPC:", response)
            return response
        except Exception as e:
            print(f"Erro ao processar comando: {e}")
            context.set_code(grpc.StatusCode.INVALID_ARGUMENT)
            context.set_details(str(e))
            return devices_pb2.CommandReply()

def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    devices_pb2_grpc.add_ManageDeviceServicer_to_server(AirConditionerServicer(), server)
    server.add_insecure_port('[::]:8888')
    print("[Atuador] Air Conditioner Server running on port 8888...")
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    serve()