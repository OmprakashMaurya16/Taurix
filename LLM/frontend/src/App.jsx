import React, { useState } from "react";
import ChatWindow from "./components/ChatWindow";
import InputArea from "./components/InputArea";
import "./App.css";

function App() {
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content:
        "Hi! I'm your multimodal financial assistant. Ask me a question, upload a stock chart, or use voice!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (text, audioBlob, imageFile) => {
    // Add user message to UI immediately
    const userMessage = { role: "user", content: text || "" };
    if (imageFile) userMessage.image = URL.createObjectURL(imageFile);
    if (audioBlob) userMessage.audioAdded = true;

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const formData = new FormData();
    if (text) formData.append("text", text);
    if (audioBlob) formData.append("audio", audioBlob, "audio.wav");
    if (imageFile) formData.append("image", imageFile);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.response,
        },
      ]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "[Connection Error: Could not reach the backend locally.]",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true"></div>
        <div className="brand-copy">
          <h1>
            Market<span>Pilot</span>
          </h1>
          <p>
            Multimodal financial copilot for text, image, and voice analysis
          </p>
        </div>
        <div className="status-pill">Local AI Online</div>
      </header>

      <main className="chat-container">
        <ChatWindow messages={messages} isLoading={isLoading} />
        <InputArea onSend={handleSend} disabled={isLoading} />
      </main>
    </div>
  );
}

export default App;
