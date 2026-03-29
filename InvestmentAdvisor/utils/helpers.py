import statistics

def safe_mean(values):
    if not values:
        return 0
    return sum(values) / len(values)


def majority_label(labels):
    if not labels:
        return "neutral"
    return max(set(labels), key=labels.count)


def normalize_score(value, min_val=-1, max_val=1):
    if max_val - min_val == 0:
        return 0
    return (value - min_val) / (max_val - min_val)


def clamp(value, min_val=0, max_val=1):
    return max(min_val, min(value, max_val))


def format_percentage(value):
    return f"{round(value, 2)}%"


def risk_level(scores):
    if not scores:
        return "Unknown"

    avg = statistics.mean(scores)

    if avg > 0.6:
        return "Low Risk"
    elif avg > 0.3:
        return "Moderate Risk"
    else:
        return "High Risk"