import { useEffect, useMemo, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import { Zap } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const CHART_COLORS = [
  "#00e5ff",
  "#00ffcc",
  "#3b82f6",
  "#ef4444",
  "#f59e0b",
  "#14b8a6",
  "#a855f7",
  "#22c55e",
];

const formatINR = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

const formatPercent = (value, digits = 1) => {
  return `${Number(value || 0).toFixed(digits)}%`;
};

const getSentimentClass = (sentiment) => {
  const tone = String(sentiment || "").toLowerCase();
  if (tone.includes("positive") || tone.includes("bull")) {
    return "bg-[rgba(63,185,80,0.1)] text-[#3fb950]";
  }
  if (tone.includes("negative") || tone.includes("bear")) {
    return "bg-[rgba(248,81,73,0.12)] text-[#f85149]";
  }
  if (tone.includes("neutral")) {
    return "bg-[rgba(139,148,158,0.2)] text-[#8b949e]";
  }
  return "bg-[rgba(46,160,67,0.1)] text-[#2ea043]";
};

const getRiskClass = (label) => {
  const tone = String(label || "").toLowerCase();
  if (tone === "low") {
    return "bg-[rgba(34,197,94,0.15)] text-[#22c55e]";
  }
  if (tone === "moderate") {
    return "bg-[rgba(234,179,8,0.16)] text-[#eab308]";
  }
  if (tone === "high") {
    return "bg-[rgba(249,115,22,0.16)] text-[#f97316]";
  }
  if (tone === "very high") {
    return "bg-[rgba(239,68,68,0.18)] text-[#ef4444]";
  }
  return "bg-[rgba(139,148,158,0.2)] text-[#8b949e]";
};

function Portfolio() {
  const [amountInput, setAmountInput] = useState("120000");
  const [sectorOptions, setSectorOptions] = useState([
    { value: "ALL", label: "All Sectors" },
  ]);
  const [selectedSector, setSelectedSector] = useState("ALL");
  const [analysis, setAnalysis] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadSectors = async () => {
      try {
        const response = await fetch("/sectors");
        if (!response.ok) {
          throw new Error("Failed to load sectors.");
        }
        const payload = await response.json();
        const rawOptions = Array.isArray(payload?.sectors)
          ? payload.sectors
          : ["ALL"];
        const options = rawOptions.map((item) => {
          if (typeof item === "string") {
            return item === "ALL"
              ? { value: "ALL", label: "All Sectors" }
              : { value: item, label: item };
          }
          return {
            value: item?.value || "ALL",
            label: item?.label || item?.value || "All Sectors",
          };
        });

        if (isMounted) {
          setSectorOptions(options);
          if (!options.some((option) => option.value === selectedSector)) {
            setSelectedSector("ALL");
          }
        }
      } catch {
        if (isMounted) {
          setSectorOptions([{ value: "ALL", label: "All Sectors" }]);
        }
      }
    };

    loadSectors();

    return () => {
      isMounted = false;
    };
  }, [selectedSector]);

  const parsedAmount = useMemo(() => {
    const cleaned = String(amountInput).replace(/[^0-9.]/g, "");
    const value = Number(cleaned);
    return Number.isFinite(value) ? value : 0;
  }, [amountInput]);

  const {
    allocationData,
    allocationList,
    totalAssets,
    metrics,
    summary,
    orderedResults,
  } = useMemo(() => {
    if (!analysis || !analysis.results) {
      return {
        allocationData: [],
        allocationList: [],
        totalAssets: 0,
        metrics: {
          avgConfidence: 0,
          avgRisk: 0,
          avgRisk10: 0,
          avgTrend: 0,
          requestedAmount: parsedAmount,
          allocatedAmount: 0,
          cashReserve: 0,
          riskLabel: "Awaiting",
        },
        summary: {
          topPick: "-",
          topSentiment: "-",
          invested: 0,
          cashReserve: 0,
          deployment: 0,
          sector: "ALL",
          analyzedCount: 0,
        },
        orderedResults: [],
      };
    }

    const results = analysis.results || [];
    const portfolio = analysis.portfolio || {};
    const requestedAmount = Number(
      portfolio.requested_amount || parsedAmount || 0,
    );
    const allocatedAmount = Number(portfolio.allocated_amount || 0);
    const cashReserve = Number(portfolio.cash_reserve || 0);

    const avgConfidence = results.length
      ? results.reduce((sum, item) => sum + Number(item.confidence || 0), 0) /
        results.length
      : 0;

    const avgRisk = results.length
      ? results.reduce((sum, item) => sum + Number(item.risk_score || 0), 0) /
        results.length
      : 0;

    const avgTrend = results.length
      ? results.reduce((sum, item) => sum + Number(item.trend || 0), 0) /
        results.length
      : 0;

    const avgRisk10 = avgRisk / 10;
    const riskLabel =
      avgRisk10 <= 3
        ? "Conservative"
        : avgRisk10 <= 6
          ? "Moderate"
          : "Aggressive";

    const rankedAllocations = results
      .filter((item) => Number(item.allocation || 0) > 0)
      .map((item) => ({
        name: item.stock,
        value: Number(item.allocation || 0),
      }))
      .sort((a, b) => b.value - a.value);

    const orderedResults = results
      .slice()
      .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

    const best = orderedResults[0] || {};
    const investedTotal =
      allocatedAmount ||
      results.reduce((sum, item) => sum + Number(item.allocation || 0), 0);
    const deployment =
      requestedAmount > 0 ? (investedTotal / requestedAmount) * 100 : 0;

    const baseTotal = requestedAmount || 1;
    const topEntries = rankedAllocations.slice(0, 4).map((item, index) => ({
      name: item.name,
      value: (item.value / baseTotal) * 100,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));

    const remaining = rankedAllocations
      .slice(4)
      .reduce((sum, item) => sum + item.value, 0);

    const nextAllocation = [...topEntries];

    if (remaining > 0) {
      nextAllocation.push({
        name: "Other",
        value: (remaining / baseTotal) * 100,
        color: "#94a3b8",
      });
    }

    if (cashReserve > 0) {
      nextAllocation.push({
        name: "Cash Reserve",
        value: (cashReserve / baseTotal) * 100,
        color: "#334155",
      });
    }

    const nextAllocationList = nextAllocation.map((item) => ({
      ...item,
      value: Math.round(item.value * 10) / 10,
    }));

    return {
      allocationData: nextAllocation,
      allocationList: nextAllocationList,
      totalAssets: results.length,
      metrics: {
        avgConfidence,
        avgRisk,
        avgRisk10,
        avgTrend,
        requestedAmount,
        allocatedAmount,
        cashReserve,
        riskLabel,
      },
      summary: {
        topPick: best.stock || "-",
        topSentiment: best.sentiment || "-",
        invested: investedTotal,
        cashReserve,
        deployment,
        sector: String(portfolio.selected_sector || "ALL"),
        analyzedCount: Number(portfolio.analyzed_count || results.length || 0),
      },
      orderedResults,
    };
  }, [analysis, parsedAmount]);

  const handleGenerate = async () => {
    if (!parsedAmount || parsedAmount <= 0) {
      setErrorMessage("Enter an investment capital greater than 0.");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await fetch("/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount: parsedAmount, sector: selectedSector }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Allocation failed.");
      }

      setAnalysis(payload);
      setLastUpdated(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    } catch (error) {
      setErrorMessage(error?.message || "Unable to generate allocation.");
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceScore = Math.round(metrics.avgConfidence * 1000) / 10;
  const riskPercent = Math.min(100, (metrics.avgRisk10 / 10) * 100);

  return (
    <div className="bg-[#0d1117] min-h-screen text-white font-['Inter',sans-serif] flex flex-col items-center">
      <TopNavbar />

      <main className="w-full max-w-[1240px] p-4 md:p-8 mx-auto mt-6">
        <div className="mb-10 text-left">
          <h1 className="text-4xl font-bold tracking-tight text-[#f0f6fc] mb-3">
            Portfolio Builder
          </h1>
          <p className="text-[#8b949e] max-w-2xl text-[15px] leading-relaxed">
            Engineer your financial future using the Quant's Atelier AI engine.
            Precision allocation based on real-time neural data clusters.
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] p-5 rounded-xl mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#00e5ff] text-[10px] font-bold tracking-widest uppercase">
              Portfolio Summary
            </h2>
            <span className="text-[#8b949e] text-[10px]">
              {analysis ? "Live" : "Awaiting"}
            </span>
          </div>
          {analysis ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 text-left">
              <div>
                <p className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                  Top Pick
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {summary.topPick}
                </p>
              </div>
              <div>
                <p className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                  Top Sentiment
                </p>
                <span
                  className={`${getSentimentClass(summary.topSentiment)} text-[10px] font-bold px-2 py-1 rounded inline-block tracking-wide mt-1`}>
                  {String(summary.topSentiment).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                  Invested
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {formatINR(summary.invested)}
                </p>
              </div>
              <div>
                <p className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                  Cash Reserve
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {formatINR(summary.cashReserve)}
                </p>
              </div>
              <div>
                <p className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                  Deployment
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {formatPercent(summary.deployment, 1)}
                </p>
              </div>
              <div>
                <p className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                  Sector Filter
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {summary.sector}
                </p>
              </div>
              <div>
                <p className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                  Analyzed Stocks
                </p>
                <p className="text-white font-semibold text-sm mt-1">
                  {summary.analyzedCount}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[#8b949e] text-xs">
              Generate allocation to view the portfolio summary.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-xl flex flex-col">
              <label className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase mb-2 block text-left">
                Investment Capital
              </label>
              <div className="relative mb-8 text-left">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white font-semibold">
                  ₹
                </span>
                <input
                  type="text"
                  value={amountInput}
                  onChange={(event) => setAmountInput(event.target.value)}
                  className="bg-[#0d1117] border-none text-white text-xl font-bold rounded-lg w-full pl-10 pr-4 py-3 outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all"
                />
              </div>

              <label className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase mb-2 block text-left">
                Sector Category
              </label>
              <div className="relative mb-6 text-left">
                <select
                  value={selectedSector}
                  onChange={(event) => setSelectedSector(event.target.value)}
                  className="bg-[#0d1117] border border-[#21262d] text-white text-sm font-semibold rounded-lg w-full px-4 py-3 outline-none focus:ring-1 focus:ring-[#00e5ff] transition-all">
                  {sectorOptions.map((sector) => (
                    <option
                      key={sector.value}
                      value={sector.value}
                      className="bg-[#0d1117]">
                      {sector.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-8" />
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-[#00e5ff] hover:bg-[#00ccff] disabled:bg-[#21262d] disabled:text-[#8b949e] text-black font-bold py-3 rounded-lg text-sm tracking-wide transition-colors">
                {isLoading ? "RUNNING MODEL..." : "GENERATE ALLOCATION"}
              </button>

              {errorMessage ? (
                <p className="text-[#f85149] text-xs mt-3">{errorMessage}</p>
              ) : null}
            </div>

            <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-xl text-left">
              <p className="text-[#00e5ff] text-[10px] font-bold tracking-widest uppercase flex items-center mb-4">
                <Zap className="w-3.5 h-3.5 mr-2" />
                AI Confidence Score
              </p>
              <h2 className="text-3xl font-bold text-white mb-2">
                {analysis ? `${confidenceScore}%` : "--"}
              </h2>
              <p className="text-[#8b949e] text-xs leading-relaxed">
                {analysis
                  ? "Confidence derived from aggregated sentiment agreement and trend alignment."
                  : "Run an allocation to compute confidence for this configuration."}
              </p>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-xl flex flex-col md:flex-row items-center justify-between text-left">
              <div className="relative w-48 h-48 shrink-0 mb-6 md:mb-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={
                        allocationData.length
                          ? allocationData
                          : [{ name: "Pending", value: 100, color: "#21262d" }]
                      }
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none">
                      {(allocationData.length
                        ? allocationData
                        : [{ name: "Pending", value: 100, color: "#21262d" }]
                      ).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase">
                    Diversified
                  </span>
                  <span className="text-white font-bold text-base">
                    {analysis ? `${totalAssets} Assets` : "Awaiting"}
                  </span>
                </div>
              </div>

              <div className="flex-1 w-full md:pl-12">
                <h3 className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase mb-6">
                  Asset Allocation Breakdown
                </h3>
                {allocationList.length ? (
                  <div className="space-y-4">
                    {allocationList.map((item, i) => (
                      <div
                        key={i}
                        className="flex justify-between items-center text-sm">
                        <div className="flex items-center text-[#c9d1d9] font-medium">
                          <div
                            className="w-2 h-2 rounded-full mr-3 shadow-md"
                            style={{
                              backgroundColor: item.color,
                              boxShadow: `0 0 6px ${item.color}80`,
                            }}></div>
                          {item.name}
                        </div>
                        <div className="text-white font-bold">
                          {formatPercent(item.value, 1)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#8b949e] text-xs">
                    Generate allocation to view the breakdown.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-xl text-left flex flex-col">
                <h3 className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase mb-4">
                  Composite Risk Score
                </h3>
                <div className="flex items-baseline mb-5">
                  <span className="text-4xl font-bold text-[#00e5ff]">
                    {analysis ? metrics.avgRisk10.toFixed(1) : "--"}
                  </span>
                  <span className="text-[#8b949e] text-lg font-bold">/10</span>
                </div>

                <div className="mt-auto">
                  <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden mb-2">
                    <div
                      className="bg-[#00e5ff] h-full shadow-[0_0_8px_#00e5ff]"
                      style={{ width: `${riskPercent}%` }}></div>
                  </div>
                  <div className="text-right">
                    <span className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase">
                      {analysis ? metrics.riskLabel : "Awaiting"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="lg:col-span-12 bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden text-left">
            <div className="p-5 border-b border-[#21262d] flex items-center justify-between">
              <h3 className="text-[#00e5ff] text-[10px] font-bold tracking-widest uppercase">
                Analysis Details
              </h3>
              <span className="text-[#8b949e] text-[10px]">
                {orderedResults.length} Cards
              </span>
            </div>

            {orderedResults.length ? (
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {orderedResults.map((item, idx) => {
                  const riskLabel = item.risk_label || "Unknown";
                  const riskScore =
                    item.risk_score != null
                      ? Number(item.risk_score).toFixed(1)
                      : "--";
                  const riskBar = Math.min(
                    100,
                    Math.max(0, Number(item.risk_score || 0)),
                  );
                  const riskClass = getRiskClass(riskLabel);
                  const hasNewsLink =
                    typeof item.news_link === "string" &&
                    /^https?:\/\//i.test(item.news_link);
                  const riskComponents = item.risk_components || {};

                  return (
                    <article
                      key={`${item.stock}-${idx}`}
                      className="bg-[#0d1117] border border-[#21262d] rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-white font-semibold text-base">
                            {item.stock}
                          </h4>
                          <p className="text-[#8b949e] text-[10px] tracking-widest uppercase mt-1">
                            Stock Analysis
                          </p>
                        </div>
                        <span
                          className={`${getSentimentClass(item.sentiment)} text-[10px] font-bold px-2 py-1 rounded inline-block tracking-wide`}>
                          {String(item.sentiment || "Neutral").toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs text-[#c9d1d9] mb-4">
                        <div>
                          <p className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase">
                            Confidence
                          </p>
                          <p className="text-white font-semibold mt-1">
                            {item.confidence != null
                              ? formatPercent(Number(item.confidence) * 100, 1)
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase">
                            Trend
                          </p>
                          <p className="text-white font-semibold mt-1">
                            {item.trend != null
                              ? `${Number(item.trend).toFixed(2)}%`
                              : "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase">
                            Allocation
                          </p>
                          <p className="text-white font-semibold mt-1">
                            {formatINR(item.allocation)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase">
                            Score
                          </p>
                          <p className="text-white font-semibold mt-1">
                            {item.score != null
                              ? Number(item.score).toFixed(2)
                              : "-"}
                          </p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <p className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase">
                          Latest News
                        </p>
                        {hasNewsLink ? (
                          <a
                            className="text-[#00e5ff] text-xs font-semibold mt-1 inline-block"
                            href={item.news_link}
                            target="_blank"
                            rel="noreferrer">
                            Read Latest News
                          </a>
                        ) : (
                          <p className="text-[#8b949e] text-xs mt-1">
                            News link not available.
                          </p>
                        )}
                      </div>

                      <div className="bg-[#161b22] border border-[#21262d] rounded-lg p-3 mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase">
                            Total Risk
                          </p>
                          <span
                            className={`${riskClass} text-[10px] font-bold px-2 py-1 rounded`}>
                            {riskLabel} {riskScore}/100
                          </span>
                        </div>
                        <div className="w-full bg-[#0d1117] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#00e5ff] h-full"
                            style={{ width: `${riskBar}%` }}></div>
                        </div>
                        {Object.keys(riskComponents).length ? (
                          <div className="grid grid-cols-2 gap-2 mt-3 text-[10px] text-[#8b949e]">
                            <p>
                              Sentiment Risk:{" "}
                              {riskComponents.sentiment_risk ?? "-"}
                            </p>
                            <p>
                              Volatility Risk:{" "}
                              {riskComponents.volatility_risk ?? "-"}
                            </p>
                            <p>
                              Uncertainty Risk:{" "}
                              {riskComponents.uncertainty_risk ?? "-"}
                            </p>
                            <p>
                              Conflict Risk:{" "}
                              {riskComponents.conflict_risk ?? "-"}
                            </p>
                          </div>
                        ) : null}
                      </div>

                      <div>
                        <p className="text-[#8b949e] text-[9px] font-bold tracking-widest uppercase mb-2">
                          Reasoning
                        </p>
                        {Array.isArray(item.reasoning) &&
                        item.reasoning.length ? (
                          <ul className="list-disc pl-5 text-xs text-[#c9d1d9] space-y-1">
                            {item.reasoning.map((reason, reasonIdx) => (
                              <li key={reasonIdx}>{reason}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[#8b949e] text-xs">
                            No reasoning available.
                          </p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-[#8b949e] text-xs p-6">
                Run an allocation to view detailed stock analysis.
              </p>
            )}
          </section>
        </div>

        {lastUpdated ? (
          <p className="text-[#8b949e] text-xs mt-4">
            Last updated: {lastUpdated}
          </p>
        ) : null}
      </main>
    </div>
  );
}

export default Portfolio;
