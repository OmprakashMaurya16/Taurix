from flask import Flask, render_template, request, jsonify
from config import STOCKS, TOP_N_STOCKS, TOP_N_SECTOR_STOCKS, SECTOR_STOCKS
from services.news_service import fetch_news_with_links
from services.sentiment import get_finbert, get_distilbert
from services.verification import verify
from services.market import get_market_data
from services.reasoning import analyze_impact
from services.scoring import advanced_score
from services.allocation import allocate_money_advanced
from services.risk import compute_risk

app = Flask(__name__)

SECTORS = sorted(SECTOR_STOCKS.keys())

def select_top_stocks_by_trend(stocks, limit):
    trend_map = {stock: get_market_data(stock) for stock in stocks}
    ranked = sorted(stocks, key=lambda s: trend_map[s], reverse=True)
    selected = ranked[:limit]

    return selected, trend_map


def market_confidence_fallback(trend):
    trend = float(trend)
    magnitude = abs(trend)

    if magnitude < 0.5:
        return "neutral", 0.35

    proxy_conf = min(0.75, 0.35 + (magnitude / 6.0))
    proxy_sentiment = "positive" if trend > 0 else "negative"
    return proxy_sentiment, round(proxy_conf, 2)


def summarize_article(text):
    cleaned = " ".join(str(text or "").split())
    if not cleaned:
        return "", ""
    parts = [part.strip() for part in cleaned.split(".") if part.strip()]
    title = parts[0] if parts else cleaned
    if len(title) > 120:
        title = f"{title[:117]}..."
    remainder = ". ".join(parts[1:]) if len(parts) > 1 else cleaned
    if len(remainder) > 160:
        remainder = f"{remainder[:157]}..."
    return title, remainder


def analyze_stock(stock, precomputed_trend=None):
    news_items = fetch_news_with_links(stock)
    news_list = [item.get("text", "") for item in news_items if item.get("text")]
    news_link = next((item.get("url") for item in news_items if item.get("url")), "")

    sentiments = []
    confidences = []

    for article in news_list:

        fin_label, fin_score = get_finbert(article)
        dis_label, dis_score = get_distilbert(article)

        conf, agreement = verify(fin_label, fin_score, dis_label, dis_score)

        sentiments.append(fin_label)
        confidences.append(conf)

    trend = precomputed_trend if precomputed_trend is not None else get_market_data(stock)

    # Primary signal from news sentiment; fallback to market proxy if news is unavailable.
    if sentiments:
        final_sentiment = max(set(sentiments), key=sentiments.count)
        avg_conf = sum(confidences) / len(confidences)
        confidence_source = "news"
    else:
        final_sentiment, avg_conf = market_confidence_fallback(trend)
        confidence_source = "market_proxy"

    reasoning, market_alignment, confidence_factor = analyze_impact(
        final_sentiment, trend, avg_conf
    )

    if not news_list:
        reasoning.insert(
            0,
            "Data note: No recent articles were fetched for this ticker, so confidence is inferred from market trend strength.",
        )

    score = advanced_score(
        final_sentiment,
        trend,
        avg_conf,
        market_alignment,
        confidence_factor,
    )

    risk = compute_risk(final_sentiment, trend, avg_conf)

    return {
        "stock": stock,
        "sentiment": final_sentiment,
        "confidence": round(avg_conf, 2),
        "confidence_source": confidence_source,
        "news_link": news_link,
        "trend": trend,
        "score": round(score, 4),
        "reasoning": reasoning,
        "risk_score": risk["risk_score"],
        "risk_label": risk["risk_label"],
        "risk_components": risk["risk_components"],
    }

@app.route("/")
def home():
    return render_template("index.html", sectors=SECTORS)

@app.route("/sectors", methods=["GET"])
def sectors():
    sector_options = [{"value": "ALL", "label": "All Sectors"}]
    sector_options.extend({"value": sector, "label": sector} for sector in SECTORS)
    return jsonify({"sectors": sector_options})


@app.route("/news", methods=["GET"])
def news():
    stock = str(request.args.get("stock", "HDFCBANK")).upper()
    articles = fetch_news_with_links(stock)
    items = []

    for idx, article in enumerate(articles):
        text = (article.get("text") or "").strip()
        if not text:
            continue

        fin_label, fin_score = get_finbert(text)
        dis_label, dis_score = get_distilbert(text)
        confidence, agreement = verify(fin_label, fin_score, dis_label, dis_score)

        sentiment = fin_label if fin_label in {"positive", "negative", "neutral"} else "neutral"
        sentiment_score = round(confidence * 100)
        title, description = summarize_article(text)
        time_label = "LATEST" if idx == 0 else "RECENT"

        items.append(
            {
                "title": title,
                "description": description,
                "sentiment": sentiment,
                "sentiment_score": sentiment_score,
                "agreement": agreement,
                "link": article.get("url", ""),
                "time_label": time_label,
            }
        )

    return jsonify({"stock": stock, "items": items})

@app.route("/analyze", methods=["POST"])
def analyze():
    payload = request.get_json(silent=True) or {}
    selected_sector = str(payload.get("sector", "ALL")).upper()

    try:
        amount = float(payload.get("amount", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid amount."}), 400

    if amount <= 0:
        return jsonify({"error": "Amount must be greater than 0."}), 400

    if selected_sector == "ALL":
        universe = STOCKS
        shortlist_limit = TOP_N_STOCKS
    else:
        if selected_sector not in SECTOR_STOCKS:
            return jsonify({"error": "Invalid sector filter."}), 400
        universe = SECTOR_STOCKS[selected_sector]
        shortlist_limit = TOP_N_SECTOR_STOCKS

    shortlisted_stocks, trend_map = select_top_stocks_by_trend(universe, shortlist_limit)

    results = []
    stock_data = {}

    for stock in shortlisted_stocks:
        data = analyze_stock(stock, precomputed_trend=trend_map.get(stock))
        results.append(data)
        stock_data[stock] = {
            "score": data["score"],
            "confidence": data["confidence"],
            "trend": data["trend"],
        }

    allocation = allocate_money_advanced(amount, stock_data)

    allocated_total = 0.0
    for r in results:
        money = allocation[r["stock"]]
        r["allocation"] = money
        allocated_total += money

        if r["score"] <= 0:
            r["reasoning"].append(
                "Allocation outcome: Set to zero because risk-adjusted score is non-positive."
            )
        elif money == 0:
            r["reasoning"].append(
                "Allocation outcome: No capital assigned after portfolio risk-cap balancing."
            )
        else:
            r["reasoning"].append(
                f"Allocation outcome: Assigned INR {money:.2f} based on relative strength under risk caps."
            )

    cash_reserve = round(max(0.0, amount - allocated_total), 2)

    return jsonify(
        {
            "results": results,
            "portfolio": {
                "requested_amount": round(amount, 2),
                "allocated_amount": round(allocated_total, 2),
                "cash_reserve": cash_reserve,
                "cap_ratio": 0.4,
                "selected_sector": selected_sector,
                "universe_size": len(universe),
                "analyzed_count": len(shortlisted_stocks),
                "selection_basis": "top_trend",
            },
        }
    )

if __name__ == "__main__":
    app.run(debug=True, port=8000)