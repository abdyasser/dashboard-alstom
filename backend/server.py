import os
import sys
import json
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
import uvicorn
from typing import List
from pydantic import BaseModel
from imfu_parser import parse_imfu_file

app = FastAPI(title="IMFU Dashboard API")

# Allow CORS for the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_FILE = os.path.expanduser("~/.imfu_dashboard_config.json")

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError, OSError):
            return {}
    return {}

def save_config(data):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(data, f)

class ConfigModel(BaseModel):
    shared_folder: str

@app.get("/api/config")
def get_config():
    return load_config()

@app.post("/api/config")
def update_config(config: ConfigModel):
    data = load_config()
    data["shared_folder"] = config.shared_folder
    save_config(data)
    return {"message": "Config updated", "config": data}

@app.get("/api/sync")
def sync_folder():
    config = load_config()
    folder = config.get("shared_folder")
    if not folder or not os.path.exists(folder):
        return JSONResponse(status_code=400, content={"message": "Dossier partagé introuvable ou non configuré."})
    
    all_items = []
    errors = []
    
    try:
        files = os.listdir(folder)
    except Exception as e:
        return JSONResponse(status_code=400, content={"message": f"Impossible d'accéder au dossier: {str(e)}"})
        
    for filename in files:
        if filename.startswith("~$") or filename.startswith("."):
            continue
        if filename.lower().endswith((".xlsx", ".xls", ".csv")):
            filepath = os.path.join(folder, filename)
            try:
                with open(filepath, 'rb') as f:
                    contents = f.read()
                items = parse_imfu_file(contents, filename)
                all_items.extend(items)
            except Exception as e:
                errors.append(f"Erreur avec {filename}: {str(e)}")
                
    if not all_items and errors:
        return JSONResponse(status_code=400, content={"message": "Échec de lecture des fichiers.", "errors": errors, "items": []})
        
    return {"message": "Success", "items": all_items, "errors": errors}


@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    all_items = []
    errors = []
    for f in files:
        contents = await f.read()
        try:
            items = parse_imfu_file(contents, f.filename)
            all_items.extend(items)
        except Exception as e:
            errors.append(f"Erreur avec le fichier {f.filename}: {str(e)}")
            
    if errors and not all_items:
        return JSONResponse(status_code=400, content={"message": "Erreur lors du traitement des fichiers.", "errors": errors, "items": []})
    return {"message": "Success", "items": all_items, "errors": errors}

# Serve static files from the Vite build
if getattr(sys, 'frozen', False):
    # Running in a PyInstaller bundle
    base_dir = sys._MEIPASS
    frontend_dist = os.path.join(base_dir, "frontend/dist")
else:
    # Running in normal Python environment
    base_dir = os.path.dirname(__file__)
    frontend_dist = os.path.join(base_dir, "../frontend/dist")

if os.path.exists(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Serve the index.html for all other routes to support React Router or SPA
        index_file = os.path.join(frontend_dist, "index.html")
        requested_file = os.path.join(frontend_dist, full_path)
        # Security: prevent path traversal attacks
        if not os.path.realpath(requested_file).startswith(os.path.realpath(frontend_dist)):
            return FileResponse(index_file)
        if os.path.isfile(requested_file):
            return FileResponse(requested_file)
        return FileResponse(index_file)

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
