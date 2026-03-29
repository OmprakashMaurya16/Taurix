"""
risk.py – Composite Total Risk computation for each stock.

Risk components (each 0-100, weighted to form a final 0-100 score):
  1. Sentiment Risk   (35%)  – negative=high, neutral=medium, positive=low
  2. Volatility Risk  (30%)  – magnitude of price trend (bigger move → more risk)
  3. Uncertainty Risk (20%)  – inverse of model confidence
  4. Conflict Risk    (15%)  – penalty when news sentiment contradicts market direction

Risk label bands:
  0-25   → Low
  26-50  → Moderate
  51-75  → High
  76-100 → Very High
"""

import math


def _safe_float(value, default=0.0):
    try:
        num = float(value)
        if math.isfinite(num):
            return num
    except (TypeError, ValueError):
        pass
    return default


def compute_risk(sentiment: str, trend: float, confidence: float) -> dict:
    """
    Returns a dict with:
        risk_score  – float 0..100 (higher = riskier)
        risk_label  – str  ("Low" | "Moderate" | "High" | "Very High")
        risk_components – dict of sub-scores for transparency
    """
    trend = _safe_float(trend, 0.0)
    confidence = max(0.0, min(1.0, _safe_float(confidence, 0.5)))

    # ── 1. Sentiment Risk (0-100) ──────────────────────────────────────────
    #   negative → 80, neutral → 50, positive → 20
    sentiment_risk_map = {"negative": 80.0, "neutral": 50.0, "positive": 20.0}
    sentiment_risk = sentiment_risk_map.get(sentiment, 50.0)

    # ── 2. Volatility Risk (0-100) ─────────────────────────────────────────
    #   |trend| capped at 10 % maps linearly to 0-100
    volatility_risk = min(100.0, (abs(trend) / 10.0) * 100.0)

    # ── 3. Uncertainty Risk (0-100) ────────────────────────────────────────
    #   confidence=1 → 0 risk, confidence=0 → 100 risk
    uncertainty_risk = (1.0 - confidence) * 100.0

    # ── 4. Conflict Risk (0-100) ───────────────────────────────────────────
    #   Signal conflict: bullish news + falling price, or bearish news + rising price
    conflict = False
    if sentiment == "positive" and trend < -1.5:
        conflict = True
    elif sentiment == "negative" and trend > 1.5:
        conflict = True
    conflict_risk = 75.0 if conflict else 0.0

    # ── Weighted composite ────────────────────────────────────────────────
    total_risk = (
        0.35 * sentiment_risk
        + 0.30 * volatility_risk
        + 0.20 * uncertainty_risk
        + 0.15 * conflict_risk
    )

    total_risk = round(max(0.0, min(100.0, total_risk)), 1)

    # ── Label ──────────────────────────────────────────────────────────────
    if total_risk <= 25:
        label = "Low"
    elif total_risk <= 50:
        label = "Moderate"
    elif total_risk <= 75:
        label = "High"
    else:
        label = "Very High"

    return {
        "risk_score": total_risk,
        "risk_label": label,
        "risk_components": {
            "sentiment_risk": round(sentiment_risk, 1),
            "volatility_risk": round(volatility_risk, 1),
            "uncertainty_risk": round(uncertainty_risk, 1),
            "conflict_risk": round(conflict_risk, 1),
        },
    }
