import React, { useState, useRef } from 'react';
import './InputArea.css';

export default function InputArea({ onSend, disabled }) {
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = e => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          onSend(text, audioBlob, image);
          setText('');
          setImage(null);
        };
        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        alert("Microphone access denied or unavailable.");
      }
    }
  };

  const handleSend = () => {
    if (!text.trim() && !image) return;
    onSend(text, null, image);
    setText('');
    setImage(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-area-container">
      {image && (
        <div className="image-preview-chip">
          <span>🖼️ {image.name}</span>
          <button onClick={() => setImage(null)}>×</button>
        </div>
      )}
      <div className="input-bar">
        <label className="icon-btn attachment">
          📎
          <input type="file" accept="image/*" onChange={handleImageUpload} hidden />
        </label>

        <textarea
          placeholder="Ask a question or request a trend analysis..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isRecording}
          rows={1}
        />

        <button 
          className={`icon-btn mic ${isRecording ? 'recording' : ''}`}
          onClick={toggleRecording}
          title="Click to toggle audio recording"
          disabled={disabled}
        >
          {isRecording ? '🛑' : '🎤'}
        </button>

        <button 
          className="send-btn" 
          onClick={handleSend}
          disabled={disabled || isRecording || (!text.trim() && !image)}
        >
          ➤
        </button>
      </div>
    </div>
  );
}
