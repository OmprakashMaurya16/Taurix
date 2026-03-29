import { useEffect, useMemo, useState } from "react";
import TopNavbar from "../components/TopNavbar";
import StockCard from "../components/StockCard";
import RecommendationCard from "../components/RecommendationCard";
import NewsList from "../components/NewsList";
import { Bot, Send, User, X } from "lucide-react";

const DEFAULT_SYMBOL = "IBM";
const RANGE_PRESETS = {
  "1D": { interval: "5m", range: "1d" },
  "5D": { interval: "15m", range: "5d" },
  "1M": { interval: "1h", range: "1mo" },
  "6M": { interval: "1d", range: "6mo" },
  "1Y": { interval: "1d", range: "1y" },
  "5Y": { interval: "1wk", range: "5y" },
};
const DASHBOARD_CACHE_TTL_MS = 3 * 60 * 1000;

const readCache = (key, ttlMs) => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const age = Date.now() - Number(parsed?.ts || 0);
    if (!Number.isFinite(age) || age > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed?.data ?? null;
  } catch {
    return null;
  }
};

const writeCache = (key, data) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // Ignore storage errors.
  }
};

function Dashboard() {
  const [searchValue, setSearchValue] = useState(DEFAULT_SYMBOL);
  const [activeQuery, setActiveQuery] = useState(DEFAULT_SYMBOL);
  const [activeSymbol, setActiveSymbol] = useState(DEFAULT_SYMBOL);
  const [activeLabel, setActiveLabel] = useState(DEFAULT_SYMBOL);
  const [seriesData, setSeriesData] = useState([]);
  const [quoteSnapshot, setQuoteSnapshot] = useState(null);
  const [rangePreset, setRangePreset] = useState("1D");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [recData, setRecData] = useState({
    recommendation: "HOLD",
    confidence: 0,
    sentiment: "neutral",
    modelName: "",
    summary: "",
  });
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "ai",
      content:
        "Ask me about any ticker, market trend, or risk profile. I can analyze text, charts, and market context.",
    },
  ]);

  const chartData = useMemo(
    () =>
      seriesData.map((point) => ({
        value: point.close,
        timestamp: point.timestamp,
      })),
    [seriesData],
  );

  useEffect(() => {
    let isMounted = true;

    const resolveSymbol = async (query) => {
      const trimmed = String(query || "").trim();
      if (!trimmed) {
        return null;
      }

      try {
        const response = await fetch(
          `/yahoo/v1/finance/search?q=${encodeURIComponent(trimmed)}`,
        );

        if (!response.ok) {
          return {
            symbol: trimmed.toUpperCase(),
            label: trimmed,
          };
        }

        const payload = await response.json();
        const quotes = Array.isArray(payload?.quotes) ? payload.quotes : [];
        const preferred = quotes.find(
          (item) => item?.quoteType === "EQUITY" && item?.symbol,
        );
        const fallback = quotes.find((item) => item?.symbol);
        const quote = preferred || fallback;
        if (!quote?.symbol) {
          return {
            symbol: trimmed.toUpperCase(),
            label: trimmed,
          };
        }

        return {
          symbol: quote.symbol,
          label: quote.shortname || quote.longname || quote.symbol,
        };
      } catch (error) {
        console.log(error);
        return {
          symbol: trimmed.toUpperCase(),
          label: trimmed,
        };
      }
    };

    const fetchChart = async (symbol, interval, range) => {
      const response = await fetch(
        `/yahoo/v8/finance/chart/${encodeURIComponent(
          symbol,
        )}?interval=${interval}&range=${range}&includePrePost=false&events=div%2Csplit`,
      );

      if (!response.ok) {
        throw new Error("Failed to load market data.");
      }

      const payload = await response.json();
      const result = payload?.chart?.result?.[0];
      const timestamps = Array.isArray(result?.timestamp)
        ? result.timestamp
        : [];
      const closes = Array.isArray(result?.indicators?.quote?.[0]?.close)
        ? result.indicators.quote[0].close
        : [];

      if (!timestamps.length || !closes.length) {
        const message =
          payload?.chart?.error?.description || "No data returned.";
        throw new Error(message);
      }

      return timestamps
        .map((timestamp, index) => ({
          timestamp: new Date(timestamp * 1000).toISOString(),
          close: Number(closes[index] || 0),
        }))
        .filter((point) => Number.isFinite(point.close) && point.close > 0);
    };

    const fetchQuote = async (symbol) => {
      const response = await fetch(
        `/yahoo/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`,
      );

      if (!response.ok) {
        throw new Error("Failed to load quote data.");
      }

      const payload = await response.json();
      const quote = payload?.quoteResponse?.result?.[0];

      if (!quote) {
        return null;
      }

      const price =
        Number(quote.regularMarketPrice) ||
        Number(quote.postMarketPrice) ||
        Number(quote.preMarketPrice) ||
        0;

      const changePercent =
        Number(quote.regularMarketChangePercent) ||
        Number(quote.postMarketChangePercent) ||
        Number(quote.preMarketChangePercent) ||
        0;

      return {
        price,
        changePercent,
        currency: quote.currency || "USD",
        exchange: quote.exchangeName || quote.fullExchangeName || "",
        marketState: quote.marketState || "",
        source: "Yahoo Finance",
      };
    };

    const loadSeries = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const resolved = await resolveSymbol(activeQuery);
        if (!resolved?.symbol) {
          throw new Error("Enter a valid market symbol or name.");
        }

        const selectedRange = RANGE_PRESETS[rangePreset] || RANGE_PRESETS["1D"];
        const marketCacheKey = `dashboard:market:${resolved.symbol}:${selectedRange.interval}:${selectedRange.range}`;
        const cachedMarket = readCache(marketCacheKey, DASHBOARD_CACHE_TTL_MS);

        if (cachedMarket && isMounted) {
          setActiveSymbol(resolved.symbol);
          setActiveLabel(resolved.label);
          setSeriesData(
            Array.isArray(cachedMarket.points) ? cachedMarket.points : [],
          );
          setQuoteSnapshot(cachedMarket.quote || null);
          setIsLoading(false);
          return;
        }

        if (isMounted) {
          setActiveSymbol(resolved.symbol);
          setActiveLabel(resolved.label);
        }

        let points = [];
        try {
          points = await fetchChart(
            resolved.symbol,
            selectedRange.interval,
            selectedRange.range,
          );
        } catch (error) {
          console.log(error);
          points = await fetchChart(resolved.symbol, "1d", "6mo");
        }

        let quote = null;
        try {
          quote = await fetchQuote(resolved.symbol);
        } catch (error) {
          console.log(error);
          quote = null;
        }

        if (isMounted) {
          setSeriesData(points);
          setQuoteSnapshot(quote);
          writeCache(marketCacheKey, { points, quote });
        }
      } catch (error) {
        if (isMounted) {
          setSeriesData([]);
          setQuoteSnapshot(null);
          setErrorMessage(error?.message || "Unable to load market data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (activeSymbol) {
      loadSeries();
    }

    return () => {
      isMounted = false;
    };
  }, [activeQuery, rangePreset]);

  useEffect(() => {
    let isMounted = true;

    const loadRecommendation = async () => {
      setRecLoading(true);
      setRecError("");

      try {
        const recCacheKey = `dashboard:rec:${String(activeLabel || "").toLowerCase()}`;
        const cachedRec = readCache(recCacheKey, DASHBOARD_CACHE_TTL_MS);
        if (cachedRec && isMounted) {
          setRecData(cachedRec);
          setRecLoading(false);
          return;
        }

        const newsResponse = await fetch("/ml/get-news", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ company: activeLabel }),
        });

        if (!newsResponse.ok) {
          throw new Error("Failed to load market narrative.");
        }

        const newsPayload = await newsResponse.json();
        const combinedText = String(newsPayload?.combined_text || "").trim();

        if (!combinedText) {
          throw new Error("No news available to analyze.");
        }

        const analyzeResponse = await fetch("/ml/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: combinedText }),
        });

        if (!analyzeResponse.ok) {
          throw new Error("Failed to analyze sentiment.");
        }

        const analyzePayload = await analyzeResponse.json();
        const overall = analyzePayload?.overall || {};
        const sentiment = String(overall.sentiment || "neutral").toLowerCase();
        const confidence = Number(overall.confidence || 0);
        const recommendation = overall.recommendation || "HOLD";
        const headlineSource = Array.isArray(newsPayload?.articles)
          ? newsPayload.articles
          : [];
        const headlineItem = headlineSource.find(
          (item) => String(item?.headline || "").trim().length > 0,
        );
        const headlineText = headlineItem
          ? String(headlineItem.headline).trim()
          : "Recent market updates are mixed.";
        const totalArticles = Number(newsPayload?.count || 0);
        const reasoning = totalArticles
          ? `Headline: ${headlineText} Reason: Based on the latest news, the view is ${recommendation} for now.`
          : `Headline: ${headlineText} Reason: The view is ${recommendation} for now.`;

        if (isMounted) {
          const nextRec = {
            recommendation,
            confidence,
            sentiment,
            modelName: "",
            summary: reasoning,
          };
          setRecData(nextRec);
          writeCache(recCacheKey, nextRec);
        }
      } catch (error) {
        if (isMounted) {
          setRecError(error?.message || "Unable to load recommendation.");
        }
      } finally {
        if (isMounted) {
          setRecLoading(false);
        }
      }
    };

    if (activeLabel) {
      loadRecommendation();
    }

    return () => {
      isMounted = false;
    };
  }, [activeLabel]);

  const handleSearchSubmit = (value) => {
    const trimmed = String(value || "").trim();
    if (trimmed) {
      setActiveQuery(trimmed);
      setSearchValue(trimmed);
    }
  };

  const handleChatSend = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || chatLoading) {
      return;
    }

    setChatMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setChatInput("");
    setChatLoading(true);

    try {
      const formData = new FormData();
      formData.append("text", trimmed);

      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Chat request failed (${response.status})`);
      }

      const data = await response.json();
      const botReply =
        typeof data?.response === "string" && data.response.trim()
          ? data.response
          : "I could not generate a response right now. Please try again.";

      setChatMessages((prev) => [...prev, { role: "ai", content: botReply }]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content:
            "Connection error: chatbot backend is not reachable. Ensure the backend is running on port 8001.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleChatSend();
    }
  };

  return (
    <div className="bg-[#0d1117] min-h-screen text-white flex flex-col items-center">
      <TopNavbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        onSearchSubmit={handleSearchSubmit}
        searchPlaceholder="Search markets (e.g., IBM, AAPL)"
      />

      <main className="w-full max-w-[1440px] p-4 md:p-8 mx-auto mt-2 md:mt-4 relative">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-4 sm:gap-0 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1 text-white">
              Market Terminal
            </h1>
            <p className="text-[#8b949e] text-sm">
              Real-time analysis for {activeLabel}.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 mt-2 sm:mt-0">
            <button className="bg-[#21262d] text-[#8b949e] px-4 py-1.5 font-bold text-xs tracking-widest uppercase rounded flex items-center">
              MARKET: {activeSymbol}
            </button>
            <button className="bg-[rgba(63,185,80,0.1)] text-[#3fb950] px-4 py-1.5 font-bold text-xs tracking-widest uppercase rounded flex items-center border border-[rgba(63,185,80,0.2)]">
              MARKET OPEN
            </button>
          </div>
        </div>

        {/* Top Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <StockCard
              symbol={activeSymbol}
              label={activeLabel}
              data={chartData}
              quote={quoteSnapshot}
              rangePreset={rangePreset}
              onRangeChange={setRangePreset}
              isLoading={isLoading}
              errorMessage={errorMessage}
            />
          </div>
          <div className="lg:col-span-1">
            <RecommendationCard
              recommendation={recData.recommendation}
              confidence={recData.confidence}
              sentiment={recData.sentiment}
              modelName={recData.modelName}
              summary={recData.summary}
              isLoading={recLoading}
              errorMessage={recError}
            />
          </div>
        </div>

        {/* News Section */}
        <NewsList stock="HDFC Bank" />

        {/* Integrated Chatbot */}
        <div className="fixed bottom-6 right-4 md:bottom-8 md:right-8 z-50">
          {isChatOpen ? (
            <div className="w-[92vw] max-w-[380px] h-[540px] bg-[#0f141c] border border-[#1f2a36] rounded-2xl shadow-[0_14px_40px_rgba(0,0,0,0.45)] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-[#1f2a36] bg-[linear-gradient(135deg,#00d2ff20,#7c3aed1f)] flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-sm tracking-wide">
                    Market Chatbot
                  </h3>
                  <p className="text-[#9fb2c8] text-[11px]">
                    Connected to local multimodal backend
                  </p>
                </div>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="w-8 h-8 rounded-lg bg-[#161d28] text-[#9fb2c8] hover:text-white hover:bg-[#1a2433] flex items-center justify-center"
                  aria-label="Close chatbot">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`flex gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}>
                    {message.role === "ai" && (
                      <div className="w-7 h-7 rounded-lg bg-[#143a4d] text-[#61dafb] flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                        message.role === "user"
                          ? "bg-[#00e5ff] text-[#04131b] rounded-br-md"
                          : "bg-[#182333] text-[#d4e2f0] border border-[#223247] rounded-bl-md"
                      }`}>
                      {message.content}
                    </div>

                    {message.role === "user" && (
                      <div className="w-7 h-7 rounded-lg bg-[#00e5ff] text-[#04131b] flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex items-center gap-2 text-[#9fb2c8] text-xs">
                    <Bot className="w-3.5 h-3.5 text-[#61dafb]" />
                    Thinking...
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-[#1f2a36] bg-[#101722]">
                <div className="flex items-end gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={handleChatKeyDown}
                    placeholder="Ask about AAPL, NIFTY, BTC, earnings, risk..."
                    className="flex-1 bg-[#161f2b] text-[#d4e2f0] placeholder:text-[#7f93a7] border border-[#223247] rounded-xl px-3 py-2 text-sm outline-none resize-none min-h-[42px] max-h-[110px]"
                    rows={1}
                  />
                  <button
                    onClick={handleChatSend}
                    disabled={!chatInput.trim() || chatLoading}
                    className="w-10 h-10 rounded-xl bg-[#00e5ff] text-[#04131b] disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-transform flex items-center justify-center"
                    aria-label="Send message">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsChatOpen(true)}
              className="w-12 h-12 bg-[#00e5ff] rounded-lg shadow-[0_4px_20px_rgba(0,229,255,0.38)] flex items-center justify-center hover:scale-105 transition-transform"
              aria-label="Open chatbot">
              <Bot className="w-5 h-5 text-black" />
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
