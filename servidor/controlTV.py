from concurrent import futures
import grpc
import devices_pb2
import devices_pb2_grpc
import json


class TVControlServicer(devices_pb2_grpc.ManageDeviceServicer):
    def __init__(self):
        pass

    def handle_power(self, state, value):
        """Liga ou desliga a TV baseado no estado recebido"""
        if value == 1:
            state["power"] = "ligado"
            state["source"] = "nenhum"
            state["platform"] = "nenhum"
        else:
            state["power"] = "desligado"
            state["source"] = "nenhum"
            state["platform"] = "nenhum"

    def handle_source(self, state, value):
        """Define a fonte da TV"""
        if state["power"] == "desligado":
            raise ValueError("A TV está desligada. Ligue-a primeiro.")
        sources = {1: "streaming", 2: "cabo"}
        new_source = sources.get(value, "nenhum")

        # Se a source mudou, redefinir a plataforma para "nenhum"
        if state["source"] != new_source:
            state["platform"] = "nenhum"

        state["power"] = "ligado"
        state["source"] = new_source

    def handle_platform(self, state, value):
        """Define a plataforma de streaming se a fonte for streaming"""
        streaming_platforms = {1: "netflix", 2: "disney+", 3: "prime"}
        state["power"] = "ligado"
        state["source"] = "streaming"
        state["platform"] = streaming_platforms.get(value, "nenhum")

    def handle_channel(self, state, value):
        """Define o canal se a fonte for cabo"""
        cable_channels = {4: "globo", 5: "sbt", 6: "record"}
        state["power"] = "ligado"
        state["source"] = "cabo"
        state["platform"] = cable_channels.get(value, "nenhum")

    def command(self, request, context):
        try:
            state = {
                "power": request.current_state.power,
                "source": request.current_state.source,
                "platform": request.current_state.platform
            }
            
            print(f"📡 [gRPC] Comando recebido:\n"
      f"{json.dumps({'order': request.order, 'value': request.value, 'current_state': state}, indent=4)}")
            
            if request.order == "power":
                self.handle_power(state, request.value)
            elif request.order == "source":
                self.handle_source(state, request.value)
            elif request.order == "platform":
                self.handle_platform(state, request.value)
            elif request.order == "channel":
                self.handle_channel(state, request.value)
            else:
                raise ValueError("Comando inválido.")

            response = devices_pb2.CommandReply(
                device_name=request.device_name,
                response=f"TV updated: {state}",
                current_state=devices_pb2.TVState(
                    power=state["power"],
                    source=state["source"],
                    platform=state["platform"]
                )
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
    devices_pb2_grpc.add_ManageDeviceServicer_to_server(TVControlServicer(), server)
    server.add_insecure_port('[::]:50051')
    print("[Atuador] TV Control Server running on port 50051...")
    server.start()
    server.wait_for_termination()

if __name__ == "__main__":
    serve()