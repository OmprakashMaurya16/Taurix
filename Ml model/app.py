from flask import Flask, request, jsonify, render_template
from transformers import pipeline
import requests
import os
import re
import time
import hashlib

app = Flask(__name__)

# Try loading FinBERT first.
try:
    print("Loading FinBERT...")
    sentiment = pipeline(
        "sentiment-analysis",
        model="ProsusAI/finbert",
        device=-1,
    )
    MODEL_NAME = "FinBERT"
    print("FinBERT loaded successfully")
except Exception:
    print("FinBERT failed, switching to lightweight model...")
    sentiment = pipeline("sentiment-analysis")
    MODEL_NAME = "DistilBERT"


NEWS_API_KEY = os.getenv("NEWS_API_KEY", "pub_ac61d3e70aef4dd9a61669cb6ed7ef44")

_CACHE = {}
_CACHE_TTL_SECONDS = 300


def _cache_get(key):
    entry = _CACHE.get(key)
    if not entry:
        return None
    if time.time() - entry["ts"] > _CACHE_TTL_SECONDS:
        _CACHE.pop(key, None)
        return None
    return entry["value"]


def _cache_set(key, value):
    _CACHE[key] = {"ts": time.time(), "value": value}


def _text_hash(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def label_to_signed(label, confidence):
    label = (label or "").upper()
    if label == "POSITIVE":
        return confidence
    if label == "NEGATIVE":
        return -confidence
    return 0.0


def analyze_long_text(text, chunk_size=1200):
    # Chunk long text so model can process the full input safely.
    chunks = [
        text[i : i + chunk_size]
        for i in range(0, len(text), chunk_size)
        if text[i : i + chunk_size].strip()
    ]

    if not chunks:
        return "NEUTRAL", 0.0

    signed_total = 0.0
    confidence_total = 0.0

    for chunk in chunks:
        result = sentiment(chunk)[0]
        label = result["label"].upper()
        confidence = float(result["score"])
        signed_total += label_to_signed(label, confidence)
        confidence_total += confidence

    avg_signed = signed_total / len(chunks)
    avg_confidence = confidence_total / len(chunks)

    if avg_signed > 0.1:
        final_label = "POSITIVE"
    elif avg_signed < -0.1:
        final_label = "NEGATIVE"
    else:
        final_label = "NEUTRAL"

    return final_label, avg_confidence


# Simple keyword-based assist for recommendation.
def get_keyword_score(text):
    text = text.lower()

    positive = ["profit", "growth", "surge", "record", "strong"]
    negative = ["loss", "crash", "fraud", "decline", "debt"]

    score = 0
    for w in positive:
        if w in text:
            score += 1
    for w in negative:
        if w in text:
            score -= 1

    return score


def smart_recommendation(text, sentiment_label, confidence):
    score = 0

    if sentiment_label == "POSITIVE":
        score += 2
    elif sentiment_label == "NEGATIVE":
        score -= 2

    if confidence > 0.8:
        score += 1

    score += get_keyword_score(text)

    if score >= 3:
        return "STRONG BUY"
    if score == 2:
        return "BUY"
    if score >= 0:
        return "HOLD"
    if score <= -3:
        return "STRONG SELL"
    return "SELL"


# Fetch news by company/domain.
def fetch_news(company):
    try:
        url = "https://newsdata.io/api/1/news"
        params = {
            "apikey": NEWS_API_KEY,
            "q": company,
            "language": "en",
            "size": 5,
        }
        res = requests.get(url, params=params, timeout=12).json()

        articles = []
        for article in res.get("results", [])[:5]:
            title = (article.get("title") or "").strip()
            description = (article.get("description") or "").strip()
            content = (article.get("content") or "").strip()
            link = (article.get("link") or article.get("source_url") or "").strip()

            full_text = "\n".join(part for part in [title, description, content] if part)

            if title:
                articles.append({
                    "headline": title,
                    "full_text": full_text or title,
                    "preview": (description or title)[:220],
                    "link": link,
                })

        if articles:
            return articles

        return [{
            "headline": f"No recent news found for {company}.",
            "full_text": f"No recent news found for {company}.",
            "preview": f"No recent news found for {company}.",
            "link": "",
        }]

    except Exception:
        return [
            {
                "headline": f"{company} reports strong profit growth",
                "full_text": f"{company} reports strong profit growth",
                "preview": f"{company} reports strong profit growth",
                "link": "",
            },
            {
                "headline": f"{company} faces regulatory concerns",
                "full_text": f"{company} faces regulatory concerns",
                "preview": f"{company} faces regulatory concerns",
                "link": "",
            },
            {
                "headline": f"{company} stock remains stable",
                "full_text": f"{company} stock remains stable",
                "preview": f"{company} stock remains stable",
                "link": "",
            },
        ]


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.json or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "No text provided"}), 400

    cache_key = f"analyze:{_text_hash(text)}"
    cached = _cache_get(cache_key)
    if cached:
        return jsonify(cached)

    overall_label, overall_confidence = analyze_long_text(text)
    overall_recommendation = smart_recommendation(text, overall_label, overall_confidence)

    # Split by blank lines so Analyze can show article-wise breakdown.
    blocks = [b.strip() for b in re.split(r"\n\s*\n+", text) if b.strip()]
    if not blocks:
        blocks = [text]

    breakdown = []
    for idx, block in enumerate(blocks, start=1):
        block_label, block_confidence = analyze_long_text(block)
        block_recommendation = smart_recommendation(block, block_label, block_confidence)

        breakdown.append({
            "article": idx,
            "preview": block.replace("\n", " ")[:180],
            "sentiment": block_label,
            "confidence": round(block_confidence, 2),
            "recommendation": block_recommendation,
        })

    response_payload = {
        "model": MODEL_NAME,
        "overall": {
            "sentiment": overall_label,
            "confidence": round(overall_confidence, 2),
            "recommendation": overall_recommendation,
            "articles_analyzed": len(breakdown),
        },
        "breakdown": breakdown,
    }

    _cache_set(cache_key, response_payload)
    return jsonify(response_payload)


@app.route("/get-news", methods=["POST"])
def get_news():
    company = (request.json or {}).get("company", "")
    cache_key = f"news:{company.lower()}"
    cached = _cache_get(cache_key)
    if cached:
        return jsonify(cached)

    articles = fetch_news(company)

    all_text = [article["full_text"] for article in articles]
    combined_text = "\n\n".join(all_text)

    response_payload = {
        "model": MODEL_NAME,
        "combined_text": combined_text,
        "count": len(articles),
        "articles": articles,
    }

    _cache_set(cache_key, response_payload)
    return jsonify(response_payload)


if __name__ == "__main__":
    app.run(debug=True, port=3000)
