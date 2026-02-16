import { useApp } from '@/contexts/AppContext';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Monitor } from 'lucide-react';
import { useState } from 'react';

export default function CallOverlay() {
  const { inCall, endCall, activeChat } = useApp();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  if (!inCall || !activeChat) return null;

  return (
    <div className="fixed inset-0 z-50 bg-call-bg flex flex-col items-center justify-center animate-fade-in">
      {/* Title */}
      <div className="absolute top-6 left-6 text-call-foreground">
        <h2 className="text-lg font-semibold">{activeChat.title}</h2>
        <p className="text-sm opacity-60">{activeChat.members.length} participantes • Conectando...</p>
      </div>

      {/* Video grid placeholder */}
      <div className="flex flex-wrap gap-4 justify-center items-center max-w-4xl px-8">
        {activeChat.members.map((m) => (
          <div
            key={m.id}
            className="w-64 h-48 rounded-2xl bg-call-muted flex flex-col items-center justify-center gap-2"
          >
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
              {m.displayName.charAt(0)}
            </div>
            <span className="text-call-foreground text-sm">{m.displayName}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="absolute bottom-8 flex items-center gap-4">
        <button
          onClick={() => setMicOn(!micOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            micOn ? 'bg-call-muted text-call-foreground hover:opacity-80' : 'bg-destructive text-destructive-foreground'
          }`}
          aria-label={micOn ? 'Silenciar micrófono' : 'Activar micrófono'}
        >
          {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button
          onClick={() => setCamOn(!camOn)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
            camOn ? 'bg-call-muted text-call-foreground hover:opacity-80' : 'bg-destructive text-destructive-foreground'
          }`}
          aria-label={camOn ? 'Apagar cámara' : 'Encender cámara'}
        >
          {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button
          className="w-12 h-12 rounded-full bg-call-muted text-call-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Compartir pantalla"
        >
          <Monitor className="w-5 h-5" />
        </button>
        <button
          onClick={endCall}
          className="w-14 h-14 rounded-full bg-call-danger text-destructive-foreground flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Colgar"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
