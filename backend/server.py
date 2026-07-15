import os
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import uvicorn
from typing import List
from imfu_parser import parse_imfu_file

app = FastAPI(title="IMFU Dashboard API")

# Allow CORS for the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi.responses import JSONResponse

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
            
    if errors:
        return JSONResponse(status_code=400, content={"message": "Erreur lors du traitement de certains fichiers.", "errors": errors, "items": all_items})
    return {"message": "Success", "items": all_items}

import sys

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
        if os.path.isfile(requested_file):
            return FileResponse(requested_file)
        return FileResponse(index_file)

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
