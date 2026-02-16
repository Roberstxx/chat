export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: 'online' | 'offline' | 'busy';
}

export interface Chat {
  id: string;
  type: 'direct' | 'group';
  title: string;
  members: User[];
  lastMessage?: Message;
  description?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  kind: 'text' | 'emoji' | 'object';
  content: string;
  createdAt: number;
}

export type CallMode = 'audio' | 'video';

export interface RtcSignal {
  type: 'offer' | 'answer' | 'ice' | 'end';
  chatId: string;
  fromUserId: string;
  toUserId?: string;
  mode?: CallMode;
  payload?: any;
}

export type WsEvent =
  | 'auth:login'
  | 'auth:register'
  | 'chat:list'
  | 'chat:createDirect'
  | 'group:create'
  | 'group:invite'
  | 'message:send'
  | 'message:receive'
  | 'rtc:signal'
  | 'presence:update';
