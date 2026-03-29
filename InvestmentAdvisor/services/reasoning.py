def analyze_impact(sentiment, trend, confidence):
    reasoning = []
    trend = float(trend)
    confidence = max(0.0, min(1.0, float(confidence)))

    # Step 1: Sentiment interpretation in causal form.
    if sentiment == "positive":
        reasoning.append(
            "Why: Positive news flow. Impact: buying interest can expand. Outcome: upside bias if price confirms."
        )
    elif sentiment == "negative":
        reasoning.append(
            "Why: Negative news flow. Impact: risk premium rises. Outcome: downside pressure unless trend recovers."
        )
    else:
        reasoning.append(
            "Why: Mixed or neutral headlines. Impact: conviction stays low. Outcome: wait for stronger confirmation."
        )

    # Step 2: Market confirmation with a neutral zone to avoid noise.
    if trend > 1.5:
        reasoning.append(
            "Market confirmation: Trend is strongly positive, supporting a bullish thesis."
        )
        market_alignment = 1
    elif trend < -1.5:
        reasoning.append(
            "Market confirmation: Trend is strongly negative, confirming bearish pressure."
        )
        market_alignment = -1
    else:
        reasoning.append(
            "Market confirmation: Trend is weak or range-bound, so directional conviction is limited."
        )
        market_alignment = 0

    # Step 3: Confidence banding to avoid over-trusting weak signals.
    if confidence >= 0.75:
        reasoning.append("Model confidence is high, so uncertainty discount is minimal.")
        confidence_factor = 1.0
    elif confidence >= 0.5:
        reasoning.append("Model confidence is moderate, so position sizing should stay measured.")
        confidence_factor = 0.85
    else:
        reasoning.append("Model confidence is low, so exposure should be conservative.")
        confidence_factor = 0.65

    # Step 4: Risk and time horizon guidance.
    if market_alignment == 1 and sentiment == "positive":
        reasoning.append("Risk posture: constructive. Time horizon: short-to-medium term momentum.")
    elif market_alignment == -1 and sentiment == "negative":
        reasoning.append("Risk posture: defensive. Time horizon: avoid fresh longs until stabilization.")
    else:
        reasoning.append("Risk posture: cautious due to signal conflict. Time horizon: wait for confirmation.")

    return reasoning, market_alignment, confidence_factor
