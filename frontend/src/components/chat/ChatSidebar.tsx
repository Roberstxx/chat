import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Chat } from '@/types';
import { Search, Plus, Users, MessageSquare, LogOut } from 'lucide-react';
import StatusDot from './StatusDot';
import StatusSelector from './StatusSelector';

interface ChatSidebarProps {
  onNewGroup: () => void;
  onNewDirect: () => void;
}

export default function ChatSidebar({ onNewGroup, onNewDirect }: ChatSidebarProps) {
  const { user, chats, activeChat, setActiveChat, logout } = useApp();
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');

  const filtered = chats
    .filter((c) => c.type === (tab === 'direct' ? 'direct' : 'group'))
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="w-full md:w-80 h-full flex flex-col bg-card border-r border-border shrink-0">
      {/* Profile */}
      <div className="p-4 border-b border-border flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
            {user?.displayName?.charAt(0) || '?'}
          </div>
          <StatusDot status={user?.status || 'offline'} className="absolute -bottom-0.5 -right-0.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{user?.displayName}</p>
          <StatusSelector />
        </div>
        <button onClick={logout} className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar sesión">
          <LogOut className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar chats..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
            aria-label="Buscar chats"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-3 gap-1">
        <button
          onClick={() => setTab('direct')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'direct' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
          aria-label="Chats directos"
        >
          <MessageSquare className="w-4 h-4" />
          Directos
        </button>
        <button
          onClick={() => setTab('group')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'group' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
          }`}
          aria-label="Grupos"
        >
          <Users className="w-4 h-4" />
          Grupos
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mb-2 opacity-40" />
            <p className="text-sm">No hay chats</p>
          </div>
        ) : (
          filtered.map((chat) => (
            <ChatItem
              key={chat.id}
              chat={chat}
              active={activeChat?.id === chat.id}
              onClick={() => setActiveChat(chat)}
              formatTime={formatTime}
              currentUserId={user?.id}
            />
          ))
        )}
      </div>

      {/* New button */}
      <div className="p-3 border-t border-border">
        <button
          onClick={tab === 'group' ? onNewGroup : onNewDirect}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
          aria-label={tab === 'group' ? 'Nuevo grupo' : 'Nuevo chat'}
        >
          <Plus className="w-4 h-4" />
          {tab === 'group' ? 'Nuevo grupo' : 'Nuevo chat'}
        </button>
      </div>
    </aside>
  );
}

function ChatItem({ chat, active, onClick, formatTime, currentUserId }: { chat: Chat; active: boolean; onClick: () => void; formatTime: (ts?: number) => string; currentUserId?: string }) {
  const otherMember = chat.type === 'direct' ? chat.members.find((m) => m.id !== currentUserId) : null;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
        active ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted border border-transparent'
      }`}
      aria-label={`Chat: ${chat.title}`}
    >
      <div className="relative shrink-0">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
          chat.type === 'group' ? 'bg-secondary text-secondary-foreground' : 'bg-primary/20 text-primary'
        }`}>
          {chat.type === 'group' ? <Users className="w-4 h-4" /> : chat.title.charAt(0)}
        </div>
        {otherMember && <StatusDot status={otherMember.status} className="absolute -bottom-0.5 -right-0.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground truncate">{chat.title}</span>
          {chat.lastMessage && (
            <span className="text-xs text-muted-foreground shrink-0">{formatTime(chat.lastMessage.createdAt)}</span>
          )}
        </div>
        {chat.lastMessage && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{chat.lastMessage.content}</p>
        )}
      </div>
    </button>
  );
}
