import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import ChatSidebar from '@/components/chat/ChatSidebar';
import ChatHeader from '@/components/chat/ChatHeader';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import CallOverlay from '@/components/chat/CallOverlay';
import GroupModal from '@/components/chat/GroupModal';
import GroupInfoPanel from '@/components/chat/GroupInfoPanel';
import DirectInfoPanel from '@/components/chat/DirectInfoPanel';
import NewDirectChatModal from '@/components/chat/NewDirectChatModal';
import { MessageSquare } from 'lucide-react';

export default function AppLayout() {
  const { activeChat } = useApp();
  const [groupModal, setGroupModal] = useState(false);
  const [directModal, setDirectModal] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Close info panel when switching chats
  useEffect(() => {
    setInfoOpen(false);
  }, [activeChat?.id]);

  return (
    <div className="h-screen flex bg-background">
      <ChatSidebar
        onNewGroup={() => setGroupModal(true)}
        onNewDirect={() => setDirectModal(true)}
      />

      <main className="flex-1 flex min-w-0">
        <div className="flex-1 flex flex-col min-w-0">
          {activeChat ? (
            <>
              <ChatHeader
                onToggleInfo={() => setInfoOpen((p) => !p)}
                infoOpen={infoOpen}
              />
              <MessageList />
              <MessageInput />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Chat Local</h2>
              <p className="text-sm">Selecciona un chat para comenzar</p>
            </div>
          )}
        </div>

        {activeChat?.type === 'group' && (
          <GroupInfoPanel open={infoOpen} onClose={() => setInfoOpen(false)} />
        )}
        {activeChat?.type === 'direct' && (
          <DirectInfoPanel open={infoOpen} onClose={() => setInfoOpen(false)} />
        )}
      </main>

      <CallOverlay />
      <GroupModal open={groupModal} onClose={() => setGroupModal(false)} />
      <NewDirectChatModal open={directModal} onClose={() => setDirectModal(false)} />
    </div>
  );
}
