import json
import urllib.request
import urllib.error
import base64

import io
from PIL import Image

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

def query_image_model(prompt: str, image_path: str, model_name: str = "llava") -> str:
    """Queries local Ollama VLM with a base64 encoded image."""
    try:
        # Open and resize image to reduce processing time and payload size
        with Image.open(image_path) as img:
            # Convert to RGB to ensure JPEG compatibility and remove alpha channel
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Resize to 336px (native LLaVA-1.5 resolution) to ensure only 1 ViT slice is processed, greatly speeding up inference.
            max_size = 336
            if max(img.size) > max_size:
                img.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
            
            # Save to BytesIO buffer
            buffer = io.BytesIO()
            img.save(buffer, format="JPEG", quality=85)
            encoded_string = base64.b64encode(buffer.getvalue()).decode('utf-8')
    except Exception as e:
        return f"[Error processing image: {str(e)}]"

    payload = {
        "model": model_name,
        "prompt": prompt,
        "images": [encoded_string],
        "stream": False,
        "keep_alive": "5m",
        "options": {
            "temperature": 0.2,
            "num_predict": 75
        }
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(OLLAMA_URL, data=data, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result.get("response", "")
    except urllib.error.URLError as e:
        return f"[Error: Could not connect to Ollama VLM. Ensure Ollama is running and '{model_name}' is installed. Details: {str(e)}]"
