import yfinance as yf

def get_market_data(stock):
    ticker = yf.Ticker(stock + ".NS")
    data = ticker.history(period="1d", interval="1m")

    if data.empty:
        return 0

    open_price = data.iloc[0]['Open']
    latest = data.iloc[-1]['Close']

    change = ((latest - open_price) / open_price) * 100

    return round(change, 2)