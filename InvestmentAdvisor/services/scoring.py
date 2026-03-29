import math


def _safe_float(value, default=0.0):
    try:
        num = float(value)
        if math.isfinite(num):
            return num
    except (TypeError, ValueError):
        pass
    return default


def advanced_score(sentiment, trend, confidence, market_alignment, confidence_factor):
    sentiment_map = {
        "positive": 1,
        "neutral": 0,
        "negative": -1,
    }

    base = sentiment_map.get(sentiment, 0)
    trend = _safe_float(trend, 0.0)
    confidence = max(0.0, min(1.0, _safe_float(confidence, 0.0)))
    confidence_factor = max(0.4, min(1.0, _safe_float(confidence_factor, 0.7)))

    if market_alignment not in (-1, 0, 1):
        market_alignment = 0

    trend_component = max(-1.0, min(1.0, trend / 4.0))

    # Confidence-aware weighting: higher confidence boosts narrative/alignment trust.
    sentiment_weight = 0.30 + (0.15 * confidence)
    alignment_weight = 0.25 + (0.10 * confidence)
    trend_weight = 0.30 - (0.10 * confidence)
    confidence_weight = 1.0 - (sentiment_weight + alignment_weight + trend_weight)

    # Dynamic weighting: narrative + market alignment + market magnitude + confidence.
    score = (
        base * sentiment_weight
        + market_alignment * alignment_weight
        + trend_component * trend_weight
        + confidence * confidence_weight
    )

    # Contradiction penalties when narrative and market direction diverge.
    if sentiment == "positive" and trend < 0:
        score *= 0.7
    elif sentiment == "negative" and trend > 0:
        score *= 0.7

    if sentiment == "neutral" and confidence < 0.5:
        score *= 0.8

    # Uncertainty penalty from confidence regime.
    score *= confidence_factor

    return max(-1.0, min(1.0, score))


def score_stock(sentiment, trend, confidence):
    # Backward-compatible wrapper for older callers.
    return advanced_score(
        sentiment=sentiment,
        trend=trend,
        confidence=confidence,
        market_alignment=0,
        confidence_factor=1.0,
    )