import { useApp } from '@/contexts/AppContext';
import { X } from 'lucide-react';
import StatusDot from './StatusDot';

interface DirectInfoPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function DirectInfoPanel({ open, onClose }: DirectInfoPanelProps) {
  const { activeChat, user } = useApp();

  if (!open || !activeChat || activeChat.type !== 'direct') return null;

  const otherMember = activeChat.members.find((m) => m.id !== user?.id);

  return (
    <aside className="w-80 h-full border-l border-border bg-card flex flex-col animate-slide-in-left shrink-0">
      <div className="h-16 px-4 flex items-center justify-between border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Info del contacto</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar panel">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {otherMember && (
        <div className="p-6 flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary">
              {otherMember.displayName.charAt(0)}
            </div>
            <StatusDot status={otherMember.status} className="absolute bottom-0 right-0 w-4 h-4 border-[3px]" />
          </div>
          <h4 className="text-lg font-semibold text-foreground">{otherMember.displayName}</h4>
          <p className="text-sm text-muted-foreground">@{otherMember.username}</p>
          <div className="mt-3 flex items-center gap-2">
            <StatusDot status={otherMember.status} className="w-2.5 h-2.5 border-0" />
            <span className="text-xs text-muted-foreground">
              {otherMember.status === 'online' ? 'En línea' : otherMember.status === 'busy' ? 'Ocupado' : 'Desconectado'}
            </span>
          </div>
        </div>
      )}

      <div className="px-4">
        <div className="border-t border-border pt-4">
          <h5 className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Participantes</h5>
          <div className="space-y-2">
            {activeChat.members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                    {m.displayName.charAt(0)}
                  </div>
                  <StatusDot status={m.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {m.displayName}
                    {m.id === user?.id && <span className="text-xs text-muted-foreground ml-1">(tú)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">@{m.username}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
