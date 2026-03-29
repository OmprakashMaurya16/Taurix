deps = ["fastapi", "uvicorn", "yfinance", "whisper", "transformers", "multipart"]
missing = []
for d in deps:
    try:
        if d == "multipart":
            __import__("multipart")
        else:
            __import__(d)
    except Exception as e:
        missing.append(d)
if missing:
    print("MISSING_DEPS:" + ",".join(missing))
else:
    print("ALL_DEPS_OK")
