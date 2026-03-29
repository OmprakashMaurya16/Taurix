def verify(fin_label, fin_score, dis_label, dis_score):

    agreement = fin_label == dis_label

    confidence = (fin_score * 0.6) + (dis_score * 0.4)

    if not agreement:
        confidence *= 0.7

    return confidence, agreement