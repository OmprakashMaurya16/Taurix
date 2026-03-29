import requests
import time
from config import NEWS_API_KEY, NEWS_PROVIDER, STOCK_SEARCH_TERMS


_CACHE = {}
_CACHE_TTL_SECONDS = 600


def _build_article_text(title, description):
    title = (title or "").strip()
    description = (description or "").strip()
    return f"{title} {description}".strip()


def _provider_from_key(key):
    key = str(key).strip()
    # NewsData.io keys start with "pub_"
    if key.startswith("pub_"):
        return "newsdata"
    # Finnhub keys are alphanumeric, ~20 chars, no underscores/dashes
    if key.replace("_", "").isalnum() and len(key) >= 16 and "_" not in key and "-" not in key:
        return "finnhub"
    # NewsAPI.org keys are 32-char hex
    return "newsapi"


def _as_article_list(value):
    if isinstance(value, list):
        return value
    return []


def _get_query(stock):
    return STOCK_SEARCH_TERMS.get(stock, stock)

def fetch_news_with_links(stock):
    provider = (NEWS_PROVIDER or "auto").lower()
    if provider == "auto":
        provider = _provider_from_key(NEWS_API_KEY)

    query = _get_query(stock)
    cache_key = f"{provider}:{query}"
    now = time.time()
    cached = _CACHE.get(cache_key)
    if cached and (now - cached["ts"]) < _CACHE_TTL_SECONDS:
        return list(cached["articles"])

    articles = []

    try:
        if provider == "newsapi":
            url = (
                f"https://newsapi.org/v2/everything"
                f"?q={query}&apiKey={NEWS_API_KEY}&language=en&pageSize=5&sortBy=publishedAt"
            )
            response = requests.get(url, timeout=12)
            response.raise_for_status()
            data = response.json()
            articles_raw = _as_article_list(data.get("articles", []))

            for item in articles_raw[:5]:
                text = _build_article_text(item.get("title"), item.get("description"))
                link = (item.get("url") or "").strip()
                if text:
                    articles.append({"text": text, "url": link})

        elif provider == "newsdata":
            url = (
                f"https://newsdata.io/api/1/news"
                f"?apikey={NEWS_API_KEY}&q={query}&language=en&size=5"
            )
            response = requests.get(url, timeout=12)
            response.raise_for_status()
            data = response.json()
            results_raw = _as_article_list(data.get("results", []))

            for item in results_raw[:5]:
                text = _build_article_text(item.get("title"), item.get("description"))
                link = (item.get("link") or "").strip()
                if text:
                    articles.append({"text": text, "url": link})

        elif provider == "finnhub":
            # Finnhub company-news endpoint uses the NSE ticker symbol.
            # We fetch the last 7 days of news for the stock.
            import datetime
            today = datetime.date.today()
            week_ago = today - datetime.timedelta(days=7)
            url = (
                f"https://finnhub.io/api/v1/company-news"
                f"?symbol={stock}.NS"
                f"&from={week_ago}&to={today}"
                f"&token={NEWS_API_KEY}"
            )
            response = requests.get(url, timeout=12)
            response.raise_for_status()
            articles_raw = response.json()
            if not isinstance(articles_raw, list):
                articles_raw = []

            for item in articles_raw[:5]:
                text = _build_article_text(item.get("headline"), item.get("summary"))
                link = (item.get("url") or "").strip()
                if text:
                    articles.append({"text": text, "url": link})

        else:
            print(f"[news_service] Unknown provider: {provider!r}")
            return []

    except requests.RequestException as exc:
        print(f"[news_service] HTTP error fetching news for {stock} via {provider}: {exc}")
        return []
    except (ValueError, KeyError, TypeError) as exc:
        print(f"[news_service] Parse error for {stock} via {provider}: {exc}")
        return []

    _CACHE[cache_key] = {"ts": now, "articles": list(articles)}
    return articles


def fetch_news(stock):
    # Backward-compatible text-only wrapper.
    return [item.get("text", "") for item in fetch_news_with_links(stock)]