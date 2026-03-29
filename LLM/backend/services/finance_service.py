import yfinance as yf
import pandas as pd

def analyze_stock_trend(ticker_symbol: str) -> dict:
    try:
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period="1mo")
        if hist.empty:
            return {"error": "No data found for the ticker"}
        
        # Calculate Simple Moving Average (SMA)
        hist['SMA_20'] = hist['Close'].rolling(window=20).mean()
        
        current_price = hist['Close'].iloc[-1]
        sma_20 = hist['SMA_20'].iloc[-1]
        
        # Simple trend logic
        trend = "Neutral"
        if current_price > sma_20 * 1.02:
            trend = "Bullish"
        elif current_price < sma_20 * 0.98:
            trend = "Bearish"
            
        summary = {
            "symbol": ticker_symbol.upper(),
            "current_price": round(current_price, 2),
            "sma_20": round(sma_20, 2) if not pd.isna(sma_20) else "N/A",
            "trend_signal": trend,
            "recent_high": round(hist['High'].max(), 2),
            "recent_low": round(hist['Low'].min(), 2)
        }
        return summary
    except Exception as e:
        return {"error": str(e)}
