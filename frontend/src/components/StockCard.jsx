import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";

const RANGE_LABELS = ["1D", "5D", "1M", "6M", "1Y", "5Y"];

const formatCurrency = (value, currency) => {
  const normalizedCurrency = currency || "USD";
  const locale = normalizedCurrency === "INR" ? "en-IN" : "en-US";
  const numeric = new Intl.NumberFormat(locale, {
    style: "decimal",
    maximumFractionDigits: 2,
  }).format(value || 0);

  return `${numeric} ${normalizedCurrency}`;
};

const formatMarketState = (marketState) => {
  const state = String(marketState || "").toUpperCase();
  if (!state) return "Market";
  if (state === "REGULAR") return "Regular Session";
  if (state === "PRE") return "Pre-Market";
  if (state === "POST") return "After Hours";
  return state.replace("_", " ");
};

const resolveExchangeLabel = (symbol, quoteExchange) => {
  if (quoteExchange) {
    return quoteExchange;
  }

  const normalized = String(symbol || "").toUpperCase();
  if (normalized.endsWith(".NS")) return "NSE";
  if (normalized.endsWith(".BO")) return "BSE";
  return "NSE";
};

function StockCard({
  symbol,
  label,
  data,
  quote,
  rangePreset,
  onRangeChange,
  isLoading,
  errorMessage,
}) {
  const latest = data?.length ? data[data.length - 1].value : 0;
  const previous = data?.length > 1 ? data[data.length - 2].value : latest;
  const seriesChange = previous ? ((latest - previous) / previous) * 100 : 0;
  const price = latest || 0;
  const change = seriesChange;
  const changeText = `${change >= 0 ? "+" : ""}${change.toFixed(2)}%`;
  const isPositive = change >= 0;
  const gradientId = `chartGradient-${String(symbol || "market").replace(
    /[^a-zA-Z0-9_-]/g,
    "",
  )}`;

  return (
    <div className="bg-[#11151d] border border-[#1f2430] rounded-2xl flex flex-col overflow-hidden h-full relative shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      <div className="px-6 pt-6 pb-4 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.3em] uppercase text-[#8b949e]">
              Market Pulse
            </p>
            <h2 className="text-xl font-semibold text-white">
              {label || symbol || "Market Overview"}
            </h2>
            <p className="text-xs text-[#8b949e] mt-1">
              {symbol
                ? `${symbol} • ${formatMarketState(quote?.marketState)}`
                : "Live snapshot"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {RANGE_LABELS.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => onRangeChange?.(range)}
                className={`px-3 py-1 text-[0.65rem] font-semibold rounded-full border transition ${
                  rangePreset === range
                    ? "bg-white text-black border-white"
                    : "border-[#2a303c] text-[#8b949e] hover:text-white"
                }`}>
                {range}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-3">
              <h3 className="text-4xl font-semibold text-white tracking-tight">
                {price ? formatCurrency(price, quote?.currency) : "—"}
              </h3>
              <span
                className={`flex items-center text-sm font-semibold ${
                  isPositive ? "text-[#3fb950]" : "text-[#f85149]"
                }`}>
                {isPositive ? (
                  <ArrowUpRight className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-0.5" />
                )}
                {changeText}
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-2">
              Latest in selected range • Currency {quote?.currency || "USD"}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.3em] text-[#8b949e]">
              Exchange
            </p>
            <p className="text-sm font-semibold text-white">
              {resolveExchangeLabel(symbol, quote?.exchange)}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-[#8b949e] text-xs">Loading market data...</p>
        ) : errorMessage ? (
          <p className="text-[#f85149] text-xs">{errorMessage}</p>
        ) : null}
      </div>

      <div className="relative w-full h-56 px-4 pb-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(63,185,80,0.15),_transparent_60%)]" />
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data?.length ? data : [{ value: 0 }, { value: 0 }]}
            margin={{ top: 10, right: 12, left: 12, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isPositive ? "#3fb950" : "#f85149"}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={isPositive ? "#3fb950" : "#f85149"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <YAxis domain={["dataMin - 10", "dataMax + 10"]} hide={true} />
            <Area
              type="monotone"
              dataKey="value"
              stroke={isPositive ? "#3fb950" : "#f85149"}
              strokeWidth={2.2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-6 bottom-6 h-[1px] bg-[#1f2430]" />
      </div>
    </div>
  );
}

export default StockCard;
