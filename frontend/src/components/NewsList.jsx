import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";

const sentimentStyles = {
  positive: {
    Icon: TrendingUp,
    iconColor: "text-[#3fb950]",
    scoreColor: "text-[#3fb950]",
  },
  negative: {
    Icon: TrendingDown,
    iconColor: "text-[#f85149]",
    scoreColor: "text-[#f85149]",
  },
  neutral: {
    Icon: Minus,
    iconColor: "text-[#8b949e]",
    scoreColor: "text-white",
  },
};

const COMPANIES = ["HDFC", "ICICI", "L&T", "JP Morgan"];

function NewsList() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadNews = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const results = await Promise.all(
          COMPANIES.map(async (company) => {
            const newsResponse = await fetch("/ml/get-news", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ company }),
            });

            if (!newsResponse.ok) {
              throw new Error(`Failed to load news for ${company}.`);
            }

            const newsPayload = await newsResponse.json();
            const combinedText = String(
              newsPayload?.combined_text || "",
            ).trim();

            if (!combinedText) {
              return {
                company,
                sentiment: "neutral",
                confidence: 0,
                recommendation: "HOLD",
              };
            }

            const analyzeResponse = await fetch("/ml/analyze", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: combinedText }),
            });

            if (!analyzeResponse.ok) {
              throw new Error(`Failed to analyze news for ${company}.`);
            }

            const analyzePayload = await analyzeResponse.json();
            const overall = analyzePayload?.overall || {};

            return {
              company,
              sentiment: String(overall.sentiment || "NEUTRAL").toLowerCase(),
              confidence: Number(overall.confidence || 0),
              recommendation: overall.recommendation || "HOLD",
            };
          }),
        );

        if (isMounted) {
          setItems(results);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message || "Unable to load news.");
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNews();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-white">Intelligence Feed</h2>
        <button className="text-[#8b949e] text-xs font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center">
          VIEW ALL <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {isLoading ? (
        <p className="text-[#8b949e] text-sm">Loading analyst feed...</p>
      ) : errorMessage ? (
        <p className="text-[#f85149] text-sm">{errorMessage}</p>
      ) : items.length ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, index) => {
            const style =
              sentimentStyles[item.sentiment] || sentimentStyles.neutral;
            const Icon = style.Icon;
            const confidenceScore = Math.round(item.confidence * 100);

            return (
              <div
                key={`${item.company}-${index}`}
                className="bg-[#161b22] border border-[#21262d] p-6 rounded-xl flex flex-col h-full hover:border-[#30363d] transition-colors cursor-pointer">
                <div className="flex justify-between items-center mb-3">
                  <div className="bg-[#21262d] text-[#8b949e] text-[10px] font-bold px-2.5 py-1 rounded">
                    {item.company}
                  </div>
                  <Icon className={`w-4 h-4 ${style.iconColor}`} />
                </div>

                <h3 className="text-[15px] font-semibold text-white leading-snug mb-8 flex-1">
                  {item.company} Intelligence
                </h3>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                      Sentiment
                    </span>
                    <span className={`font-bold text-sm ${style.scoreColor}`}>
                      {item.sentiment.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                      Confidence
                    </span>
                    <span className="text-white text-sm font-bold">
                      {confidenceScore}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#8b949e] text-[10px] font-bold tracking-widest uppercase">
                      Recommendation
                    </span>
                    <span className="text-[#00e5ff] text-sm font-bold">
                      {item.recommendation}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[#8b949e] text-sm">
          No intelligence data available.
        </p>
      )}
    </div>
  );
}

export default NewsList;
