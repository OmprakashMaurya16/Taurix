import { Sparkles } from "lucide-react";

const getActionStyle = (action) => {
  const normalized = String(action || "").toUpperCase();
  if (normalized.includes("BUY")) {
    return "bg-[#00ffcc] text-black";
  }
  if (normalized.includes("SELL")) {
    return "bg-[#f85149] text-white";
  }
  return "bg-[#8b949e] text-black";
};

const getRiskMeta = (confidence) => {
  if (confidence >= 0.8) {
    return { label: "LOW GROWTH RISK", color: "text-[#3fb950]", level: 3 };
  }
  if (confidence >= 0.6) {
    return { label: "MODERATE RISK", color: "text-[#eab308]", level: 2 };
  }
  return { label: "ELEVATED RISK", color: "text-[#f97316]", level: 1 };
};

function RecommendationCard({
  recommendation = "HOLD",
  confidence = 0,
  sentiment = "neutral",
  modelName = "",
  summary = "",
  isLoading = false,
  errorMessage = "",
}) {
  const confidenceScore = Math.round(confidence * 100);
  const riskMeta = getRiskMeta(confidence);
  const actionStyle = getActionStyle(recommendation);

  return (
    <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-xl flex flex-col justify-between h-full">
      <div>
        <p className="text-[#8b949e] text-xs font-bold tracking-widest uppercase flex items-center mb-5">
          <Sparkles className="w-4 h-4 mr-2 text-[#00e5ff]" />
          AI Recommendation
        </p>

        <div
          className={`inline-block px-5 py-1.5 rounded-md font-bold text-sm mb-4 ${actionStyle}`}>
          {recommendation}
        </div>

        {isLoading ? (
          <p className="text-[#8b949e] text-sm">Analyzing latest signals...</p>
        ) : errorMessage ? (
          <p className="text-[#f85149] text-sm">{errorMessage}</p>
        ) : (
          <p className="text-[#8b949e] text-sm leading-relaxed">
            {summary ||
              `Model sentiment is ${sentiment} with ${confidenceScore}% confidence.`}
            {modelName ? ` (${modelName})` : ""}
          </p>
        )}
      </div>

      <div className="mt-8 space-y-5">
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[#8b949e] text-xs font-semibold">
              Confidence Score
            </span>
            <span className="text-white text-xl font-bold">
              {confidenceScore}%
            </span>
          </div>
          <div className="w-full bg-[#21262d] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#00e5ff] h-full shadow-[0_0_8px_#00e5ff]"
              style={{ width: `${confidenceScore}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-[#8b949e] text-xs font-semibold">
              Risk Level
            </span>
            <span
              className={`${riskMeta.color} text-xs font-bold uppercase tracking-wide`}>
              {riskMeta.label}
            </span>
          </div>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((segment) => (
              <div
                key={segment}
                className={`h-1.5 flex-1 rounded-full ${segment <= riskMeta.level ? "bg-[#3fb950] shadow-[0_0_4px_rgba(63,185,80,0.5)]" : "bg-[#21262d]"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecommendationCard;
