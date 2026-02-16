import { useApp } from '@/contexts/AppContext';
import { Phone, Video, Info, Users } from 'lucide-react';
import StatusDot from './StatusDot';

interface ChatHeaderProps {
  onToggleInfo?: () => void;
  infoOpen?: boolean;
}

export default function ChatHeader({ onToggleInfo, infoOpen }: ChatHeaderProps) {
  const { activeChat, startCall } = useApp();
  if (!activeChat) return null;

  const otherMember = activeChat.type === 'direct'
    ? activeChat.members.find((m) => m.id !== 'u1')
    : null;

  return (
    <header className="h-16 px-6 flex items-center justify-between border-b border-border bg-card shrink-0">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
          activeChat.type === 'group' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/20 text-primary'
        }`}>
          {activeChat.type === 'group' ? <Users className="w-4 h-4" /> : activeChat.title.charAt(0)}
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{activeChat.title}</h2>
          <div className="flex items-center gap-1.5">
            {otherMember && <StatusDot status={otherMember.status} className="w-2 h-2" />}
            <p className="text-xs text-muted-foreground">
              {activeChat.type === 'group'
                ? `${activeChat.members.length} miembros`
                : otherMember?.status === 'online' ? 'En línea' : otherMember?.status === 'busy' ? 'Ocupado' : 'Desconectado'}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => startCall(activeChat.id)}
          className="p-2.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Llamada de audio"
        >
          <Phone className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={() => startCall(activeChat.id)}
          className="p-2.5 rounded-lg hover:bg-muted transition-colors"
          aria-label="Videollamada"
        >
          <Video className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={onToggleInfo}
          className={`p-2.5 rounded-lg transition-colors ${infoOpen ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'}`}
          aria-label="Info del chat"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
