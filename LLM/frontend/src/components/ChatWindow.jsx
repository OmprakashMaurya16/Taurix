import React, { useRef, useEffect } from 'react';
import './ChatWindow.css';

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null);
  
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="chat-window">
      {messages.map((msg, idx) => (
        <div key={idx} className={`message-row ${msg.role}`}>
          <div className="message-bubble">
            {msg.role === 'ai' && <div className="avatar-ai">✨</div>}
            
            <div className="message-content">
              {msg.image && <img src={msg.image} alt="uploaded" className="msg-img" />}
              {msg.audioAdded && <div className="msg-audio-chip">🎤 Audio attached</div>}
              {msg.content && <div className="msg-text">{msg.content}</div>}
            </div>
            
            {msg.role === 'user' && <div className="avatar-user">👤</div>}
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="message-row ai">
          <div className="message-bubble">
            <div className="avatar-ai">✨</div>
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
