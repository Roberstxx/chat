// src/contexts/AppContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from "react";
import { User, Chat, Message } from "@/types";
import { wsClient } from "@/services/wsClient";

interface AppState {
  user: User | null;
  chats: Chat[];
  messages: Message[];
  activeChat: Chat | null;
  inCall: boolean;
  callChatId: string | null;
}

interface AppContextType extends AppState {
  // Auth
  loginWS: (usernameOrEmail: string, password: string) => void;
  registerWS: (
    displayName: string,
    username: string,
    email: string,
    password: string
  ) => void;
  logout: () => void;

  // UI
  setActiveChat: (chat: Chat | null) => void;

  // Chat actions
  sendMessage: (chatId: string, content: string, kind?: Message["kind"]) => void;
  createGroup: (title: string, description?: string) => void;
  createDirectChat: (targetUserId: string) => void;
  inviteToGroup: (groupId: string, userIds: string[]) => void;

  // 🔥 NUEVO: Por username
  findUserByUsername: (username: string) => Promise<User | null>;
  createDirectChatByUsername: (username: string) => Promise<boolean>;

  // Call (solo UI por ahora)
  startCall: (chatId: string) => void;
  endCall: () => void;

  // Presence
  updateStatus: (status: User["status"]) => void;

  // Helpers
  refreshChats: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

function mapBackendUser(u: any): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl ?? undefined,
    status: (u.status ?? "offline") as User["status"],
  };
}

function mapBackendChat(ch: any): Chat {
  return {
    id: ch.id,
    type: ch.type,
    title: ch.title,
    description: ch.description ?? undefined,
    members: ch.members ?? [],
    lastMessage: ch.lastMessage ?? undefined,
  } as Chat;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    chats: [],
    messages: [],
    activeChat: null,
    inCall: false,
    callChatId: null,
  });

  // Conectar WS al montar y “hello” si hay token
  useEffect(() => {
    const token = localStorage.getItem("token") || undefined;
    wsClient.connect(token);

    const off = wsClient.on((msg) => {
      const { type, data } = msg;

      if (type === "auth:ok") {
        const token = data.token as string;
        const user = mapBackendUser(data.user);

        localStorage.setItem("token", token);
        wsClient.connect(token); // reconecta con token => manda hello

        setState((s) => ({ ...s, user }));
        return;
      }

      if (type === "hello:ok") {
        wsClient.send("chat:list", {});
        return;
      }

      if (type === "chat:list:ok") {
        const chats = (data.chats || []).map(mapBackendChat);
        setState((s) => ({ ...s, chats }));
        return;
      }

      if (type === "chat:created") {
        const chat = mapBackendChat(data.chat);
        setState((s) => {
          const exists = s.chats.some((c) => c.id === chat.id);
          const chats = exists ? s.chats : [...s.chats, chat];
          return { ...s, chats, activeChat: chat };
        });
        return;
      }

      if (type === "group:created") {
        const chat = mapBackendChat(data.chat);
        setState((s) => ({ ...s, chats: [...s.chats, chat], activeChat: chat }));
        return;
      }

      if (type === "message:receive") {
        const m: Message = {
          id: data.id,
          chatId: data.chatId,
          senderId: data.senderId,
          kind: data.kind,
          content: data.content,
          createdAt: data.createdAt,
        };

        setState((s) => ({
          ...s,
          messages: [...s.messages, m],
          chats: s.chats.map((c) => (c.id === m.chatId ? { ...c, lastMessage: m } : c)),
        }));
        return;
      }

      if (type === "presence:update") {
        const { userId, status } = data;
        setState((s) => {
          if (s.user && s.user.id === userId) {
            return { ...s, user: { ...s.user, status } };
          }
          return s;
        });
        return;
      }

      if (type === "auth:error" || type === "error") {
        console.log("[WS ERROR]", data?.message || data);
        return;
      }
    });

    return () => {
      off?.();
    };
  }, []);

  const refreshChats = useCallback(() => {
    wsClient.send("chat:list", {});
  }, []);

  // Auth
  const loginWS = useCallback((usernameOrEmail: string, password: string) => {
    wsClient.send("auth:login", { usernameOrEmail, password });
  }, []);

  const registerWS = useCallback(
    (displayName: string, username: string, email: string, password: string) => {
      wsClient.send("auth:register", {
        displayName,
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        password,
      });
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    setState((s) => ({ ...s, user: null, activeChat: null, chats: [], messages: [] }));
    wsClient.connect(); // reconecta sin token
  }, []);

  // UI
  const setActiveChat = useCallback((chat: Chat | null) => {
    setState((s) => ({ ...s, activeChat: chat }));
    if (chat) wsClient.send("room:join", { chatId: chat.id });
  }, []);

  // Chat actions
  const sendMessage = useCallback(
    (chatId: string, content: string, kind: Message["kind"] = "text") => {
      wsClient.send("message:send", { chatId, kind, content });
    },
    []
  );

  const createGroup = useCallback((title: string, description?: string) => {
    wsClient.send("group:create", { title, description });
  }, []);

  const createDirectChat = useCallback((targetUserId: string) => {
    wsClient.send("chat:createDirect", { userId: targetUserId });
  }, []);

  const inviteToGroup = useCallback((groupId: string, userIds: string[]) => {
    for (const userId of userIds) {
      wsClient.send("group:invite", { groupId, userId });
    }
  }, []);

  // 🔥 NUEVO: Buscar usuario por username (promise)
  const findUserByUsername = useCallback((username: string) => {
    return new Promise<User | null>((resolve) => {
      const clean = username.trim().toLowerCase();
      if (!clean) return resolve(null);

      const off = wsClient.on((msg) => {
        if (msg.type === "user:found") {
          off?.();
          resolve(mapBackendUser(msg.data.user));
        }
        if (msg.type === "user:notFound") {
          off?.();
          resolve(null);
        }
      });

      wsClient.send("user:findByUsername", { username: clean });
    });
  }, []);

  // 🔥 NUEVO: Crear chat directo por username
  const createDirectChatByUsername = useCallback(
    async (username: string) => {
      const u = await findUserByUsername(username);
      if (!u) return false;
      wsClient.send("chat:createDirect", { userId: u.id });
      return true;
    },
    [findUserByUsername]
  );

  // Call UI
  const startCall = useCallback((chatId: string) => {
    setState((s) => ({ ...s, inCall: true, callChatId: chatId }));
  }, []);

  const endCall = useCallback(() => {
    setState((s) => ({ ...s, inCall: false, callChatId: null }));
  }, []);

  // Presence
  const updateStatus = useCallback((status: User["status"]) => {
    wsClient.send("presence:update", { status });
    setState((s) => (s.user ? { ...s, user: { ...s.user, status } } : s));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        loginWS,
        registerWS,
        logout,
        setActiveChat,
        sendMessage,
        startCall,
        endCall,
        createGroup,
        createDirectChat,
        inviteToGroup,
        findUserByUsername,
        createDirectChatByUsername,
        updateStatus,
        refreshChats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
