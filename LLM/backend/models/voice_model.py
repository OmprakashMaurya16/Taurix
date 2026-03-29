import os
from transformers import pipeline

whisper_pipe = None

def init_whisper():
    global whisper_pipe
    if whisper_pipe is None:
        try:
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            print(f"Initializing Whisper pipeline on {device}...")
            whisper_pipe = pipeline("automatic-speech-recognition", model="openai/whisper-tiny", device=device)
        except Exception as e:
            print(f"Failed to load whisper model: {e}")

def transcribe_audio(audio_path: str) -> str:
    """Takes a path to an audio file and returns the text transcript using local Whisper model."""
    init_whisper()
    
    if not whisper_pipe:
        return "[Error: Whisper pipeline not initialized. Ensure torch/transformers are installed.]"
    
    try:
        result = whisper_pipe(audio_path)
        return result.get("text", "").strip()
    except Exception as e:
        return f"[Error during transcription: {str(e)}]"
