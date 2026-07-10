import threading
import uvicorn
import webview
import time
import urllib.request
import urllib.error
from server import app as fastapi_app

def start_server():
    uvicorn.run(fastapi_app, host="127.0.0.1", port=8000, log_level="error")

if __name__ == '__main__':
    # Start the FastAPI server in a separate daemon thread
    server_thread = threading.Thread(target=start_server, daemon=True)
    server_thread.start()

    # Wait for the server to be responsive
    server_ready = False
    for _ in range(30):
        try:
            req = urllib.request.Request("http://127.0.0.1:8000/")
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
        "http://127.0.0.1:8000",
        width=1280,
        height=800,
        min_size=(1024, 768),
        background_color='#F5F7FA'
    )
    
    # Start the native GUI loop
    webview.start()
