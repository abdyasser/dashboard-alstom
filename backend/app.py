import threading
import uvicorn
import webview
import time
import urllib.request
import urllib.error
import socket
from server import app as fastapi_app

def find_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1]

def start_server(port):
    uvicorn.run(fastapi_app, host="127.0.0.1", port=port, log_level="error")

if __name__ == '__main__':
    port = find_free_port()
    # Start the FastAPI server in a separate daemon thread
    server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
    server_thread.start()

    # Wait for the server to be responsive
    server_ready = False
    for _ in range(30):
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{port}/")
            with urllib.request.urlopen(req) as response:
                if response.status in [200, 404]:
                    server_ready = True
                    break
        except urllib.error.URLError:
            pass
        
        time.sleep(0.1)
    
    if not server_ready:
        print("Error: Could not start internal server.")
        exit(1)

    # Create the native desktop window
    window = webview.create_window(
        "Alstom IMFU Dashboard",
        f"http://127.0.0.1:{port}",
        width=1280,
        height=800,
        min_size=(1024, 768),
        background_color='#F5F7FA'
    )
    
    # Start the native GUI loop
    webview.start()
