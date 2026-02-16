import { useState, useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X, UserPlus, Copy, Check, Users } from 'lucide-react';
import StatusDot from './StatusDot';
import { User } from '@/types';

interface GroupInfoPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function GroupInfoPanel({ open, onClose }: GroupInfoPanelProps) {
  const { activeChat, allUsers, user, inviteToGroup } = useApp();
  const [tab, setTab] = useState<'members' | 'invite'>('members');
  const [copied, setCopied] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const inviteCode = useMemo(
    () => activeChat ? `CHAT-${activeChat.id.toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}` : '',
    [activeChat?.id]
  );

  if (!open || !activeChat) return null;

  const memberIds = new Set(activeChat.members.map((m) => m.id));
  const availableUsers = allUsers.filter((u) => !memberIds.has(u.id));

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleInviteSelected = () => {
    inviteToGroup(activeChat.id, selectedUsers);
    setSelectedUsers([]);
  };

  return (
    <aside className="w-80 h-full border-l border-border bg-card flex flex-col animate-slide-in-left shrink-0">
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Info del grupo</h3>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar panel">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Group info */}
      <div className="p-5 border-b border-border text-center">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
          <Users className="w-7 h-7 text-secondary-foreground" />
        </div>
        <h4 className="text-base font-semibold text-foreground">{activeChat.title}</h4>
        {activeChat.description && (
          <p className="text-xs text-muted-foreground mt-1">{activeChat.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-2">{activeChat.members.length} miembros</p>
      </div>

      {/* Tabs */}
      <div className="flex px-3 pt-3 gap-1">
        <button
          onClick={() => setTab('members')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            tab === 'members' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Miembros ({activeChat.members.length})
        </button>
        <button
          onClick={() => setTab('invite')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
            tab === 'invite' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
        >
          Invitar
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {tab === 'members' ? (
          <div className="space-y-1">
            {activeChat.members.map((member) => (
              <MemberRow key={member.id} member={member} isYou={member.id === user?.id} />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Invite by code */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Código de invitación</label>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-xs text-foreground font-mono truncate">
                  {inviteCode}
                </div>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
                  aria-label="Copiar código"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Invite by user selection */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">Seleccionar usuarios</label>
              {availableUsers.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Todos los usuarios ya son miembros</p>
              ) : (
                <div className="space-y-1">
                  {availableUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => toggleUser(u.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
                        selectedUsers.includes(u.id)
                          ? 'bg-primary/10 border border-primary/20'
                          : 'hover:bg-muted border border-transparent'
                      }`}
                    >
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                          {u.displayName.charAt(0)}
                        </div>
                        <StatusDot status={u.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{u.displayName}</p>
                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                        selectedUsers.includes(u.id) ? 'bg-primary border-primary' : 'border-border'
                      }`}>
                        {selectedUsers.includes(u.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedUsers.length > 0 && (
              <button
                onClick={handleInviteSelected}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-4 h-4" />
                Invitar ({selectedUsers.length})
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

function MemberRow({ member, isYou }: { member: User; isYou: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors">
      <div className="relative">
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
          {member.displayName.charAt(0)}
        </div>
        <StatusDot status={member.status} className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {member.displayName}
          {isYou && <span className="text-xs text-muted-foreground ml-1">(tú)</span>}
        </p>
        <p className="text-xs text-muted-foreground">@{member.username}</p>
      </div>
    </div>
  );
}
