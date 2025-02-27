from concurrent import futures
import grpc
import devices_pb2
import devices_pb2_grpc
import json

DEVICE_NAME = "SMARTV"
FILE_PATH = "tvstate.json"

# Estado inicial da TV
tv_state = {
    "power": "desligado",
    "source": "nenhum",
    "platform": "nenhum"
}


def save_on_file(state):
    try:
        with open(FILE_PATH, "w") as file:
            json.dump(state, file)
            print(f"Estado da TV salvo no arquivo: {state}")
    except IOError as e:
        print(f"Erro ao salvar o estado no arquivo: {e}")


class TVControlServicer(devices_pb2_grpc.ManageDeviceServicer):
    def handle_power(self, value):
        """Liga ou desliga a TV baseado no valor recebido"""
        if value == 1:
            tv_state["power"] = "ligado"
            tv_state["source"] = "nenhum"
            tv_state["platform"] = "nenhum"
        else:
            tv_state["power"] = "desligado"
            tv_state["source"] = "nenhum"
            tv_state["platform"] = "nenhum"
        save_on_file(tv_state)  

    def handle_source(self, value):
        """Define a fonte da TV"""
        if tv_state["power"] == "desligado":
            raise ValueError("A TV está desligada. Ligue-a primeiro.")
        sources = {1: "streaming", 2: "cabo"}
        new_source = sources.get(value, "nenhum")

        #Se houver alteração, reinicia o estado anterior
        if tv_state["source"] != new_source:
            tv_state["platform"] = "nenhum"

        tv_state["source"] = new_source
        save_on_file(tv_state) 

    def handle_platform(self, value):
        """Define a plataforma de streaming da TV"""
        if tv_state["power"] == "desligado":
            raise ValueError("A TV está desligada. Ligue-a primeiro.")
        if tv_state["source"] != "streaming":
            raise ValueError("A TV não está em modo streaming. Defina a fonte primeiro.")
        streaming_platforms = {1: "netflix", 2: "disney+", 3: "prime"}
        tv_state["platform"] = streaming_platforms.get(value, "nenhum")
        save_on_file(tv_state)  

    def handle_channel(self, value):
        """Define o canal da TV"""
        if tv_state["power"] == "desligado":
            raise ValueError("A TV está desligada. Ligue-a primeiro.")
        if tv_state["source"] != "cabo":
            raise ValueError("A TV não está em modo à cabo. Defina o tipo primeiro.")
        cable_channels = {4: "globo", 5: "sbt", 6: "record"}
        tv_state["platform"] = cable_channels.get(value, "nenhum")
        save_on_file(tv_state)  

    def command(self, request, context):
        try:
            print(f"📡 [gRPC] Comando recebido:\n"
                  f"{json.dumps({'order': request.order, 'value': request.value}, indent=4)}")

            if request.order == "power":
                self.handle_power(request.value)
            elif request.order == "source":
                self.handle_source(request.value)
            elif request.order == "platform":
                self.handle_platform(request.value)
            elif request.order == "channel":
                self.handle_channel(request.value)
            else:
                raise ValueError("Comando inválido.")

            response = devices_pb2.CommandReply(
                device_name=request.device_name,
                response=f"TV updated: {tv_state}",
                current_state=devices_pb2.TVState(
                    power=tv_state["power"],
                    source=tv_state["source"],
                    platform=tv_state["platform"]
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