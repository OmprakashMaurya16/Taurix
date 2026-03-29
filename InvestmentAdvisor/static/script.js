const amountInput = document.getElementById("amount");
const sectorSelect = document.getElementById("sector");
const analyzeBtn = document.getElementById("analyzeBtn");
const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");
const resultsEl = document.getElementById("results");

analyzeBtn.addEventListener("click", analyze);
amountInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    analyze();
  }
});

async function analyze() {
  const amount = Number(amountInput.value);
  const selectedSector = sectorSelect.value || "ALL";

  if (!Number.isFinite(amount) || amount <= 0) {
    setStatus("Please enter a valid amount greater than 0.", "error");
    return;
  }

  setLoading(true);
  setStatus("Analyzing stocks...", "info");

  try {
    const response = await fetch("/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, sector: selectedSector }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const payload = await response.json();
    const data = Array.isArray(payload) ? payload : payload.results || [];
    const portfolio = Array.isArray(payload) ? {} : payload.portfolio || {};

    if (!Array.isArray(data) || data.length === 0) {
      setStatus("No analysis data was returned.", "error");
      renderResults([]);
      renderSummary([]);
      return;
    }

    const orderedData = [...data].sort(
      (a, b) => Number(b.score) - Number(a.score),
    );

    renderSummary(orderedData, amount, portfolio);
    renderResults(orderedData);
    setStatus("Analysis completed successfully.", "success");
  } catch (error) {
    renderResults([]);
    renderSummary([]);
    setStatus(`Could not analyze stocks. ${error.message}`, "error");
  } finally {
    setLoading(false);
  }
}

function renderResults(data) {
  resultsEl.innerHTML = "";

  if (!data.length) {
    resultsEl.innerHTML = '<p class="empty">No results to display.</p>';
    return;
  }

  data.forEach((stock) => {
    const card = document.createElement("div");
    card.className = "card";

    const sentimentClass = getSentimentClass(stock.sentiment);
    const validNewsLink =
      typeof stock.news_link === "string" &&
      /^https?:\/\//i.test(stock.news_link)
        ? stock.news_link
        : "";
    const newsLinkHtml = validNewsLink
      ? `<a class="metric-link" href="${escapeHtml(validNewsLink)}" target="_blank" rel="noopener noreferrer">Read Latest News</a>`
      : '<span class="metric muted">News Link: Not available</span>';
    const reasoningItems = Array.isArray(stock.reasoning)
      ? stock.reasoning
          .map((reason) => `<li>${escapeHtml(reason)}</li>`)
          .join("")
      : "";

    const riskLabel   = stock.risk_label  || "Unknown";
    const riskScore   = stock.risk_score  != null ? Number(stock.risk_score).toFixed(1)  : "—";
    const riskClass   = getRiskClass(riskLabel);
    const riskComponents = stock.risk_components || {};
    const riskBreakdownHtml = Object.keys(riskComponents).length
      ? `<ul class="risk-breakdown">
          <li>Sentiment Risk: ${riskComponents.sentiment_risk ?? "—"}</li>
          <li>Volatility Risk: ${riskComponents.volatility_risk ?? "—"}</li>
          <li>Uncertainty Risk: ${riskComponents.uncertainty_risk ?? "—"}</li>
          <li>Conflict Risk: ${riskComponents.conflict_risk ?? "—"}</li>
        </ul>`
      : "";

    card.innerHTML = `
            <h3>${stock.stock}</h3>
            <p class="metric ${sentimentClass}">
                Sentiment: ${stock.sentiment}
            </p>
            <p class="metric">
                Confidence: ${(Number(stock.confidence) * 100).toFixed(1)}%
            </p>
            <p class="metric">News: ${newsLinkHtml}</p>
            <p class="metric">
                Trend: ${stock.trend}%
            </p>
            <p class="metric">
                Allocation: ${formatCurrency(stock.allocation)}
            </p>
            <p class="metric score">
                Score: ${Number(stock.score).toFixed(2)}
            </p>
            <div class="risk-block">
              <div class="risk-header">
                <span class="risk-title">Total Risk</span>
                <span class="risk-badge ${riskClass}">${riskLabel} &nbsp;${riskScore}/100</span>
              </div>
              <div class="risk-bar-wrap">
                <div class="risk-bar" style="width:${riskScore}%" data-risk="${riskClass}"></div>
              </div>
              ${riskBreakdownHtml}
            </div>
            <div class="reasoning-block">
              <p class="reasoning-title">Reasoning</p>
              <ul class="reasoning-list">${reasoningItems}</ul>
            </div>
        `;

    resultsEl.appendChild(card);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSummary(data, requestedAmount = 0, portfolio = {}) {
  if (!data.length) {
    summaryEl.classList.add("hidden");
    summaryEl.innerHTML = "";
    return;
  }

  const best = data[0];
  const totalAllocation = Number(
    portfolio.allocated_amount ||
      data.reduce((sum, item) => sum + Number(item.allocation || 0), 0),
  );
  const requested = Number(portfolio.requested_amount || requestedAmount || 0);
  const cashReserve = Number(
    portfolio.cash_reserve || Math.max(0, requested - totalAllocation),
  );
  const deployment = requested > 0 ? (totalAllocation / requested) * 100 : 0;
  const sector = String(portfolio.selected_sector || "ALL");
  const analyzedCount = Number(portfolio.analyzed_count || data.length || 0);

  summaryEl.classList.remove("hidden");
  summaryEl.innerHTML = `
    <div class="summary-item">
      <span class="summary-label">Top Pick</span>
      <strong>${best.stock}</strong>
    </div>
    <div class="summary-item">
      <span class="summary-label">Top Sentiment</span>
      <strong class="${getSentimentClass(best.sentiment)}">${best.sentiment}</strong>
    </div>
    <div class="summary-item">
      <span class="summary-label">Invested</span>
      <strong>${formatCurrency(totalAllocation)}</strong>
    </div>
    <div class="summary-item">
      <span class="summary-label">Cash Reserve</span>
      <strong class="neutral">${formatCurrency(cashReserve)}</strong>
    </div>
    <div class="summary-item">
      <span class="summary-label">Deployment</span>
      <strong>${deployment.toFixed(1)}%</strong>
    </div>
    <div class="summary-item">
      <span class="summary-label">Sector Filter</span>
      <strong>${escapeHtml(sector)}</strong>
    </div>
    <div class="summary-item">
      <span class="summary-label">Analyzed Stocks</span>
      <strong>${analyzedCount}</strong>
    </div>
  `;
}

function setLoading(isLoading) {
  analyzeBtn.disabled = isLoading;
  analyzeBtn.textContent = isLoading ? "Analyzing..." : "Analyze";
}

function setStatus(message, type) {
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function getSentimentClass(sentiment) {
  if (sentiment === "positive") return "positive";
  if (sentiment === "negative") return "negative";
  return "neutral";
}

function getRiskClass(label) {
  switch ((label || "").toLowerCase()) {
    case "low":       return "risk-low";
    case "moderate":  return "risk-moderate";
    case "high":      return "risk-high";
    case "very high": return "risk-very-high";
    default:          return "risk-moderate";
  }
}
