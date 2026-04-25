import os
import psutil
import time
import threading
import ctypes
import platform

class GameOptimizer:
    def __init__(self, interval=60):
        self.interval = interval
        self.is_running = False
        self.system = platform.system()

    def clean_ram(self):
        """
      
        """
        if self.system == "Windows":
             ctypes.windll.psapi.EmptyWorkingSet(-1)
        print(f"[{time.strftime('%H:%M:%S')}] Memória RAM otimizada.")

    def set_high_priority(self, process_name):
        """
     
        """
        for proc in psutil.process_iter(['name']):
            if process_name.lower() in proc.info['name'].lower():
                p = psutil.Process(proc.pid)
                if self.system == "Windows":
                    p.nice(psutil.HIGH_PRIORITY_CLASS)
                else:
                    p.nice(-10) # Linux/Unix priority
                print(f"Prioridade de {process_name} definida como ALTA.")

    def optimization_loop(self):
        """
        Loop de execução em segundo plano.
        """
        while self.is_running:
            self.clean_ram()
            # Adicione aqui outras funções como limpeza de arquivos temporários
            time.sleep(self.interval)

    def start(self):
        if not self.is_running:
            self.is_running = True
            self.thread = threading.Thread(target=self.optimization_loop, daemon=True)
            self.thread.start()
            print("Serviço de otimização iniciado.")

    def stop(self):
        self.is_running = False
        print("Serviço de otimização parado.")


if __name__ == "__main__":
    opt = GameOptimizer(interval=120) # Executa a cada 2 minutos
    opt.start()
    
    #
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        opt.stop()
              
