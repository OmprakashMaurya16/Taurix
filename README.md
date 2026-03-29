# 🐂 Taurix — AI-Powered Financial Decision Platform

> 💡 Taurix doesn’t just analyze the market — it helps you act on it.

Taurix is an AI-based financial assistant that converts **raw market data into actionable investment decisions** using sentiment analysis, portfolio intelligence, and conversational AI.

---

## 📌 Overview

In today’s market, investors face:

- 📉 Too much unstructured data  
- ❓ Unreliable sources  
- ⚡ Difficulty making decisions  

Taurix solves this by acting as an **intelligent decision layer** over financial data.

---

## 🚀 Core Features

### 📊 1. News + Sentiment Analysis

- Fetches real-time financial news  
- Uses **FinBERT** for sentiment analysis  

**Generates:**
- ✅ Buy  
- ⚠️ Hold  
- ❌ Sell  

---

### 💼 2. AI Investment Advisor

**Input:**
- Investment amount  
- Preferred sector  

**Output:**
- Recommended stocks  
- Allocation (how much to invest)  
- Risk score  
- Confidence score  

---

### 🤖 3. AI Chatbot

- Ask financial questions naturally  
- Context-aware responses  
- Explains decisions  

---

### 🧩 4. Multimodal AI Assistant

Supports:

- 🎤 Voice input  
- 🖼️ Image input (charts)  
- 💬 Text queries  
- 🔊 Voice output  

---

## 🧩 System Architecture

User Input → Multimodal Processing → LLM → (News + Advisor + Chatbot) → Final Decision (Buy/Sell/Hold)


## 🔄 Data Flow


User → UI → Backend
↓
Fetch Data (News + Market)
↓
Sentiment Analysis (FinBERT)
↓
LLM Processing
↓
Decision Engine
↓
Output (Buy / Sell / Hold)


---

## ⚙️ Feature Flow

### 📊 News Pipeline

News API → Clean Data → FinBERT → Score → Decision


### 💼 Investment Advisor

User Input → Sector Analysis → Stock Selection → Allocation → Output


### 🤖 Chatbot

User Query → NLP → LLM → Response


### 🧩 Multimodal

Voice → STT
Image → Vision Model
Text → NLP

  ↓

Unified Prompt → LLM → Response


---

## 🛠️ Tech Stack

### Backend
- Python (Flask)

### AI/ML
- FinBERT  
- DistilBERT  
- LLM  

### Frontend
- React (Web App)  
- React Native (Mobile App)  

---

## 🚀 Getting Started

```bash
git clone https://github.com/your-username/taurix.git
cd taurix
pip install -r requirements.txt
python app.py

Open in browser:

http://localhost:5000



##📈 Future Scope
📱 Mobile app
📊 Advanced ML portfolio optimization
🌍 Multi-language support
🔐 Authentication system
🤖 Autonomous AI investor
