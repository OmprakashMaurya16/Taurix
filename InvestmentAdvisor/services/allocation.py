import math


def _safe_positive(value):
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(number):
        return 0.0
    return max(0.0, number)


def allocate_money_advanced(total_money, stock_data, cap_ratio=0.4):
    # Keep only investable positive-score signals.
    total_money = _safe_positive(total_money)
    cap_ratio = min(1.0, max(0.05, float(cap_ratio)))

    positive_scores = {}
    for stock, data in stock_data.items():
        score = _safe_positive((data or {}).get("score", 0.0))
        if score > 0:
            positive_scores[stock] = score

    allocation = {stock: 0.0 for stock in stock_data}

    if total_money <= 0 or not positive_scores:
        return allocation

    cap_amount = cap_ratio * total_money
    remaining_money = float(total_money)
    active = dict(positive_scores)

    # Iteratively distribute and cap to avoid concentration while using capital.
    while active and remaining_money > 1e-9:
        total_score = sum(active.values())
        if total_score <= 0:
            break

        capped_in_round = []

        for stock, score in list(active.items()):
            target = (score / total_score) * remaining_money
            remaining_cap = cap_amount - allocation[stock]

            if remaining_cap <= 1e-9:
                capped_in_round.append(stock)
                continue

            add = min(target, remaining_cap)
            allocation[stock] += add

            if remaining_cap - add <= 1e-9:
                capped_in_round.append(stock)

        used_money = sum(allocation.values())
        remaining_money = max(0.0, float(total_money) - used_money)

        for stock in capped_in_round:
            active.pop(stock, None)

        if not capped_in_round:
            break

    for stock in allocation:
        allocation[stock] = round(allocation[stock], 2)

    return allocation


def allocate_money(total_money, scores):
    # Backward-compatible wrapper for older callers.
    stock_data = {stock: {"score": score} for stock, score in scores.items()}
    return allocate_money_advanced(total_money, stock_data)