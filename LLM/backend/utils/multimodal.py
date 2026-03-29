import re
from backend.models.text_model import query_text_model
from backend.models.image_model import query_image_model
from backend.models.voice_model import transcribe_audio
from backend.services.finance_service import analyze_stock_trend

def multimodal_chat(text: str = None, audio_path: str = None, image_path: str = None) -> str:
    """
    Synthesizes the user query by combining text, audio, and image insights 
    along with financial indicators. Evaluates via a single LLM to minimize latency.
    """
    context_chunks = []
    
    # 1. Process Audio
    if audio_path:
        audio_text = transcribe_audio(audio_path)
        context_chunks.append(f"Audio Transcript: {audio_text}")
        text = f"{text} {audio_text}" if text else audio_text

    # 2. Detect Stock Tickers in text and fetch indicators
    if text:
        potential_tickers = re.findall(r'\b[A-Z]{3,5}\b', text)
        for ticker in set(potential_tickers):
            if ticker not in ["WHAT", "THIS", "THAT", "THEY", "HAVE", "WITH", "WILL", "YOUR", "STOCK", "TREND", "PRICE"]:
                trend_data = analyze_stock_trend(ticker)
                if "error" not in trend_data:
                    context_chunks.append(f"Recent Financial Data for {ticker}: {trend_data}")

    user_query = text if text else "Analyze the provided image."
    context_chunks.append(f"User Query: {user_query}")

    # Build final system prompt
    system_prompt = (
        "You are an expert financial AI assistant. "
        "Use the provided context (which may include audio transcripts and real-time stock data) "
        "to answer the user's query intelligently. Keep your response extremely concise, professional, and highlight key trends. "
        "MAXIMUM 3 SENTENCES. Give a direct yes/no/maybe recommendation if asked to invest.\n\n"
    )
    
    final_prompt = system_prompt + "\n".join(context_chunks)
    
    # 3. FAST EVALUATION: Instead of running 2 LLMs sequentially, 
    # we directly pass the full prompt to the Vision local model if an image exists!
    if image_path:
        final_response = query_image_model(prompt=final_prompt, image_path=image_path)
    else:
        final_response = query_text_model(prompt=final_prompt)

    if not final_response:
        final_response = "I'm sorry, I couldn't generate a response. Please check if the Ollama server is running."

    return final_response
