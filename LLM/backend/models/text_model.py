import json
import urllib.request
import urllib.error

OLLAMA_URL = "http://127.0.0.1:11434/api/generate"

def query_text_model(prompt: str, model_name: str = "phi3") -> str:
    """Queries the local Ollama instance for text generation."""
    payload = {
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "keep_alive": "5m",
        "options": {
            "temperature": 0.3,
            "num_predict": 150
        }
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(OLLAMA_URL, data=data, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode("utf-8"))
            return result.get("response", "")
    except urllib.error.URLError as e:
        return f"[Error: Could not connect to Ollama. Ensure Ollama is running and '{model_name}' is installed. Details: {str(e)}]"
