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
  authReady: boolean;
  authError: string | null;
}

interface AppContextType extends AppState {
  loginWS: (usernameOrEmail: string, password: string) => void;
  registerWS: (
    displayName: string,
    username: string,
    email: string,
    password: string
  ) => void;
  logout: () => void;
  clearAuthError: () => void;

  setActiveChat: (chat: Chat | null) => void;

  sendMessage: (chatId: string, content: string, kind?: Message["kind"]) => void;
  createGroup: (title: string, description?: string) => void;
  createDirectChat: (targetUserId: string) => void;
  inviteToGroup: (groupId: string, userIds: string[]) => void;

  findUserByUsername: (username: string) => Promise<User | null>;
  createDirectChatByUsername: (username: string) => Promise<boolean>;

  startCall: (chatId: string) => void;
  endCall: () => void;

  updateStatus: (status: User["status"]) => void;

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

const AUTH_EVENT_TYPES = new Set(["auth:error", "error"]);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    user: null,
    chats: [],
    messages: [],
    activeChat: null,
    inCall: false,
    callChatId: null,
    authReady: false,
    authError: null,
  });

  useEffect(() => {
    const token = localStorage.getItem("token") || undefined;
    wsClient.connect(token);

    if (!token) {
      setState((s) => ({ ...s, authReady: true }));
    }

    const off = wsClient.on((msg) => {
      const { type, data } = msg;

      if (type === "auth:ok") {
        const nextToken = data.token as string;
        const user = mapBackendUser(data.user);

        localStorage.setItem("token", nextToken);
        wsClient.connect(nextToken);

        setState((s) => ({ ...s, user, authReady: true, authError: null }));
        return;
      }

      if (type === "hello:ok") {
        setState((s) => ({ ...s, authReady: true, authError: null }));
        wsClient.send("chat:list", {});
        return;
      }

      if (type === "chat:list:ok") {
        const chats = (data.chats || []).map(mapBackendChat);
        setState((s) => ({ ...s, chats }));
        return;
      }

      if (type === "message:list:ok") {
        const chatId = data.chatId as string;
        const list = (data.messages || []) as Message[];
        setState((s) => {
          const notFromChat = s.messages.filter((m) => m.chatId !== chatId);
          return { ...s, messages: [...notFromChat, ...list] };
        });
        return;
      }

      if (type === "chat:created") {
        const chat = mapBackendChat(data.chat);
        const autoSelect = Boolean(data.autoSelect);
        setState((s) => {
          const exists = s.chats.some((c) => c.id === chat.id);
          const chats = exists ? s.chats.map((c) => (c.id === chat.id ? chat : c)) : [...s.chats, chat];
          return { ...s, chats, activeChat: autoSelect ? chat : s.activeChat };
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

        setState((s) => {
          const exists = s.messages.some((msg) => msg.id === m.id);
          if (exists) return s;

          return {
            ...s,
            messages: [...s.messages, m],
            chats: s.chats.map((c) => (c.id === m.chatId ? { ...c, lastMessage: m } : c)),
          };
        });
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

      if (AUTH_EVENT_TYPES.has(type)) {
        const message = data?.message || "Error de autenticación";

        if (message === "Token inválido") {
          localStorage.removeItem("token");
          setState((s) => ({
            ...s,
            user: null,
            chats: [],
            messages: [],
            activeChat: null,
            authReady: true,
            authError: "Tu sesión expiró, vuelve a iniciar sesión.",
          }));
          return;
        }

        setState((s) => ({ ...s, authError: message, authReady: true }));
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

  const loginWS = useCallback((usernameOrEmail: string, password: string) => {
    setState((s) => ({ ...s, authError: null }));
    wsClient.send("auth:login", { usernameOrEmail, password });
  }, []);

  const registerWS = useCallback(
    (displayName: string, username: string, email: string, password: string) => {
      setState((s) => ({ ...s, authError: null }));
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
    setState((s) => ({
      ...s,
      user: null,
      activeChat: null,
      chats: [],
      messages: [],
      authError: null,
      authReady: true,
    }));
    wsClient.close();
    wsClient.connect();
  }, []);

  const clearAuthError = useCallback(() => {
    setState((s) => ({ ...s, authError: null }));
  }, []);

  const setActiveChat = useCallback((chat: Chat | null) => {
    setState((s) => ({ ...s, activeChat: chat }));
    if (chat) wsClient.send("room:join", { chatId: chat.id });
  }, []);

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

  const createDirectChatByUsername = useCallback(
    async (username: string) => {
      const u = await findUserByUsername(username);
      if (!u) return false;
      wsClient.send("chat:createDirect", { userId: u.id });
      return true;
    },
    [findUserByUsername]
  );

  const startCall = useCallback((chatId: string) => {
    setState((s) => ({ ...s, inCall: true, callChatId: chatId }));
  }, []);

  const endCall = useCallback(() => {
    setState((s) => ({ ...s, inCall: false, callChatId: null }));
  }, []);

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
        clearAuthError,
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
