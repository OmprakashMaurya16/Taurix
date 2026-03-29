import { useEffect, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import { ArrowUpRight } from "lucide-react";

const COMPANIES = ["HDFC", "ICICI", "L&T", "JP Morgan"];
const MAX_ITEMS = 10;
const INSIGHTS_CACHE_TTL_MS = 5 * 60 * 1000;
const INSIGHTS_PAGE_CACHE_KEY = "insights:page:v1";

const COMPANY_LOGOS = {
  HDFC: "https://logo.clearbit.com/hdfcbank.com",
  ICICI: "https://logo.clearbit.com/icicibank.com",
  "L&T": "https://logo.clearbit.com/larsentoubro.com",
  "JP Morgan": "https://logo.clearbit.com/jpmorgan.com",
};

const sentimentStyles = {
  positive: "text-[#3fb950]",
  negative: "text-[#f85149]",
  neutral: "text-[#8b949e]",
};

const riskStyles = {
  low: "bg-[rgba(63,185,80,0.15)] text-[#3fb950]",
  moderate: "bg-[rgba(234,179,8,0.18)] text-[#eab308]",
  high: "bg-[rgba(249,115,22,0.18)] text-[#f97316]",
  "very high": "bg-[rgba(248,81,73,0.2)] text-[#f85149]",
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const truncateText = (value, limit) => {
  const text = String(value || "").trim();
  if (text.length <= limit) {
    return text;
  }
  return `${text.slice(0, limit - 1)}…`;
};

const shuffleItems = (items) => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getFallbackLogo = (company) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    company,
  )}&background=0d1117&color=00e5ff&bold=true&size=64`;

const getLogoUrl = (company) =>
  COMPANY_LOGOS[company] || getFallbackLogo(company);

const buildRisk = (sentiment, confidence) => {
  const base =
    sentiment === "negative" ? 70 : sentiment === "neutral" ? 45 : 20;
  const adjustment = (1 - confidence) * 30;
  const score = clamp(Math.round(base + adjustment), 0, 100);
  let label = "moderate";
  if (score < 30) {
    label = "low";
  } else if (score < 55) {
    label = "moderate";
  } else if (score < 75) {
    label = "high";
  } else {
    label = "very high";
  }
  return { score, label };
};

const getCachedPayload = (key, ttlMs) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const age = Date.now() - Number(parsed.ts || 0);
    if (!Number.isFinite(age) || age > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed.data ?? null;
  } catch {
    return null;
  }
};

const setCachedPayload = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Ignore quota/storage errors.
  }
};

function Insights() {
  const [newsItems, setNewsItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadInsights = async () => {
      const cachedPage = getCachedPayload(
        INSIGHTS_PAGE_CACHE_KEY,
        INSIGHTS_CACHE_TTL_MS,
      );
      if (cachedPage && isMounted) {
        setNewsItems(cachedPage);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");

      try {
        const getCompanyInsights = async (company) => {
          const companyCacheKey = `insights:company:${company.toLowerCase()}`;
          const cachedCompany = getCachedPayload(
            companyCacheKey,
            INSIGHTS_CACHE_TTL_MS,
          );
          if (cachedCompany) {
            return cachedCompany;
          }

          const response = await fetch("/ml/get-news", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ company }),
          });

          if (!response.ok) {
            throw new Error(`Failed to load news for ${company}.`);
          }

          const payload = await response.json();
          const articles = Array.isArray(payload?.articles)
            ? payload.articles
            : [];
          const combinedText = String(payload?.combined_text || "").trim();

          let sentiment = "neutral";
          let confidence = 0;

          if (combinedText) {
            const analyzeResponse = await fetch("/ml/analyze", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ text: combinedText }),
            });

            if (analyzeResponse.ok) {
              const analyzePayload = await analyzeResponse.json();
              const overall = analyzePayload?.overall || {};
              sentiment = String(overall.sentiment || "neutral").toLowerCase();
              confidence = Number(overall.confidence || 0);
            }
          }

          const mapped = articles.map((article) => ({
            company,
            headline: article.headline || "Market update",
            preview: article.preview || "",
            fullText:
              article.full_text || article.preview || article.headline || "",
            link: article.link || "",
            sentiment,
            confidence,
          }));

          setCachedPayload(companyCacheKey, mapped);
          return mapped;
        };

        const companyResults = await Promise.all(
          COMPANIES.map((company) => getCompanyInsights(company)),
        );

        const flatArticles = shuffleItems(companyResults.flat()).slice(
          0,
          MAX_ITEMS,
        );

        const newsPayload = flatArticles.map((item) => ({
          ...item,
          risk: buildRisk(item.sentiment, item.confidence),
        }));

        if (isMounted) {
          setNewsItems(newsPayload);
          setCachedPayload(INSIGHTS_PAGE_CACHE_KEY, newsPayload);
        }
      } catch (error) {
        if (isMounted) {
          setNewsItems([]);
          setErrorMessage(error?.message || "Unable to load insights.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInsights();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="bg-[#0d1117] min-h-screen text-white font-sans font-['Inter',sans-serif] flex flex-col items-center pb-12">
      <TopNavbar />

      <main className="w-full max-w-[1240px] px-4 md:px-8 mt-10">
        {/* Header Section */}
        <div className="mb-10 text-left">
          <h1 className="text-4xl font-bold tracking-tight text-[#f0f6fc] mb-3">
            Market Intelligence
          </h1>
          <p className="text-[#8b949e] max-w-2xl text-[15px] leading-relaxed">
            Real-time analysis from the AI Decision Layer. Precision signals
            synthesized from multi-vector market data.
          </p>
        </div>

        <div className="bg-[#161b22] border border-[#21262d] p-6 rounded-xl text-left">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">Top 10 News</h2>
            <span className="text-[#8b949e] text-xs">Randomized snapshot</span>
          </div>

          {isLoading ? (
            <p className="text-[#8b949e] text-sm">Loading news analysis...</p>
          ) : errorMessage ? (
            <p className="text-[#f85149] text-sm">{errorMessage}</p>
          ) : newsItems.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {newsItems.map((item, index) => (
                <div
                  key={`${item.headline}-${index}`}
                  className="bg-[#0d1117] border border-[#21262d] p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0b0f14] border border-[#21262d] overflow-hidden flex items-center justify-center">
                        <img
                          src={getLogoUrl(item.company)}
                          alt={`${item.company} logo`}
                          className="w-full h-full object-cover"
                          onError={(event) => {
                            event.currentTarget.src = getFallbackLogo(
                              item.company,
                            );
                          }}
                        />
                      </div>
                      <div>
                        <span className="text-[#00e5ff] text-[10px] font-bold tracking-widest uppercase block">
                          {item.company}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase ${sentimentStyles[item.sentiment] || sentimentStyles.neutral}`}>
                          {item.sentiment}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${riskStyles[item.risk.label]}`}>
                      {item.risk.label}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold text-sm mb-2">
                    {truncateText(item.headline, 90)}
                  </h3>
                  <p className="text-[#8b949e] text-xs leading-relaxed mb-3">
                    {truncateText(item.preview, 140)}
                  </p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#8b949e] uppercase tracking-widest">
                      Risk Score
                    </span>
                    <span className="text-white font-bold">
                      {item.risk.score}/100
                    </span>
                  </div>
                  {item.link ? (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00e5ff] text-xs font-bold inline-flex items-center mt-3">
                      Read full article{" "}
                      <ArrowUpRight className="w-3 h-3 ml-1" />
                    </a>
                  ) : (
                    <span className="text-[#8b949e] text-xs mt-3 inline-block">
                      Link unavailable
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[#8b949e] text-sm">No news available.</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default Insights;
