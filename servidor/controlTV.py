from concurrent import futures
import grpc

import sys
sys.path.append(r'c:\Users\ipgou\OneDrive\Documentos\1) ARQUIVOS PRINCIPAIS\FCD\UFC\S6\Sistemas Distribuídos\Parte 2\smart-environment')

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

    def handle_power(self, value):
        """Liga ou desliga a TV e reseta estado se desligada"""
        if value == 1:
            self.state["power"] = "on"
        else:
            self.state["power"] = "off"
            self.reset_tv_state()
    
    def handle_source(self, value):
        """Define a fonte da TV se ela estiver ligada e reseta a plataforma"""
        if self.state["power"] == "off":
            return
        
        sources = {1: "streaming", 2: "cabo"}
        new_source = sources.get(value, "none")
        
        # Se a fonte mudar, reseta a plataforma para "none"
        if self.state["source"] != new_source:
            self.state["platform"] = "none"
    
        self.state["source"] = new_source

    def handle_platform(self, value):
      """Define a plataforma de streaming se a TV estiver ligada e fonte for streaming"""
      if self.state["power"] == "off" or self.state["source"] != "streaming":
        return
        
      streaming_platforms = {1: "netflix", 2: "disney+", 3: "prime"}
      self.state["platform"] = streaming_platforms.get(value, "none")

    def handle_channel(self, value):
      """Define o canal se a TV estiver ligada e fonte for cabo"""
      if self.state["power"] == "off" or self.state["source"] != "cabo":
        return
        
      cable_channels = {4: "globo", 5: "sbt", 6: "record"}
      self.state["platform"] = cable_channels.get(value, "none")

    def reset_tv_state(self):
      """Reseta a fonte e a plataforma quando a TV é desligada"""
      self.state["source"] = "none"
      self.state["platform"] = "none"

    def command(self, request, context):
      try:
          print(f"Comando recebido: {request.order}, valor: {request.value}")
          
          if request.order == "power":
              self.handle_power(request.value)
          elif request.order == "source":
              self.handle_source(request.value)
          elif request.order == "platform":
              self.handle_platform(request.value)
          elif request.order == "channel":
              self.handle_channel(request.value)

          response = devices_pb2.CommandReply(
              device_name=request.device_name,
              response=f"TV updated: {self.state}",
              current_state=devices_pb2.TVState(
                  power=self.state["power"],
                  source=self.state["source"],
                  platform=self.state["platform"]
              )
          )

          print("Resposta do servidor gRPC:", response)
          return response
      except Exception as e:
          print(f"❌ Erro ao processar comando: {e}")
          context.set_code(grpc.StatusCode.INTERNAL)
          context.set_details(f"Erro interno no servidor: {e}")
          return devices_pb2.CommandReply()


    def getState(self, request, context):
      print("Recebendo requisição de estado da TV...")
      state = devices_pb2.TVState(
        power=self.state["power"],
        source=self.state["source"],
        platform=self.state["platform"]
      )
      return state

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