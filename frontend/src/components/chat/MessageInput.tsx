import React, { useState, useRef } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Send, Smile } from 'lucide-react';

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '🎉', '😎', '🙌', '💯', '🤔', '😢', '👋'];

export default function MessageInput() {
  const { activeChat, sendMessage } = useApp();
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!activeChat) return null;

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(activeChat.id, trimmed);
    setText('');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleEmoji = (emoji: string) => {
    sendMessage(activeChat.id, emoji, 'emoji');
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative px-4 py-3 border-t border-border bg-card shrink-0">
      {showEmoji && (
        <div className="absolute bottom-full left-4 mb-2 p-3 bg-popover border border-border rounded-xl shadow-lg grid grid-cols-6 gap-2 animate-fade-in">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              onClick={() => handleEmoji(e)}
              className="text-xl hover:scale-125 transition-transform p-1"
              aria-label={`Emoji ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEmoji(!showEmoji)}
          className={`p-2.5 rounded-lg transition-colors ${showEmoji ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
          aria-label="Emojis"
        >
          <Smile className="w-5 h-5" />
        </button>
        <input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe un mensaje..."
          className="flex-1 px-4 py-2.5 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          aria-label="Mensaje"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
          aria-label="Enviar mensaje"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
