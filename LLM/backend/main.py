import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import tempfile
import uvicorn
from pydantic import BaseModel

from backend.utils.multimodal import multimodal_chat
from backend.models.voice_model import init_whisper

app = FastAPI(title="Multimodal Finance Chatbot")

# Allow requests from the React frontend (Vite defaults to port 5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Preload the whisper model locally so it doesn't block the first request
    init_whisper()

@app.post("/api/chat")
async def chat_endpoint(
    text: Optional[str] = Form(None),
    audio: Optional[UploadFile] = File(None),
    image: Optional[UploadFile] = File(None)
):
    audio_path = None
    image_path = None
    
    # Save files to temp directory
    if audio:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_audio:
            tmp_audio.write(await audio.read())
            audio_path = tmp_audio.name
            
    if image:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp_image:
            tmp_image.write(await image.read())
            image_path = tmp_image.name

    try:
        response = multimodal_chat(text=text, audio_path=audio_path, image_path=image_path)
    finally:
        # Cleanup temp files
        if audio_path and os.path.exists(audio_path):
            os.remove(audio_path)
        if image_path and os.path.exists(image_path):
            os.remove(image_path)

    return {"response": response}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
