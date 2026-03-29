from transformers import pipeline

finbert = pipeline("sentiment-analysis", model="ProsusAI/finbert")
distilbert = pipeline("sentiment-analysis")

def get_finbert(text):
    result = finbert(text[:512])[0]
    return result['label'].lower(), result['score']

def get_distilbert(text):
    result = distilbert(text[:512])[0]
    label = result['label'].lower()

    if label == "positive":
        return "positive", result['score']
    else:
        return "negative", result['score']