import { User, Chat, Message } from '@/types';

export const currentUser: User = {
  id: 'u1',
  username: 'carlos',
  displayName: 'Carlos M.',
  status: 'online',
};

export const mockUsers: User[] = [
  currentUser,
  { id: 'u2', username: 'maria', displayName: 'María G.', status: 'online' },
  { id: 'u3', username: 'juan', displayName: 'Juan P.', status: 'busy' },
  { id: 'u4', username: 'ana', displayName: 'Ana R.', status: 'offline' },
  { id: 'u5', username: 'luis', displayName: 'Luis H.', status: 'online' },
];

export const mockMessages: Message[] = [
  { id: 'm1', chatId: 'c1', senderId: 'u2', kind: 'text', content: '¡Hola! ¿Cómo estás?', createdAt: Date.now() - 300000 },
  { id: 'm2', chatId: 'c1', senderId: 'u1', kind: 'text', content: 'Todo bien, ¿y tú?', createdAt: Date.now() - 240000 },
  { id: 'm3', chatId: 'c1', senderId: 'u2', kind: 'text', content: 'Aquí trabajando en el proyecto 💻', createdAt: Date.now() - 180000 },
  { id: 'm4', chatId: 'c1', senderId: 'u1', kind: 'emoji', content: '🔥', createdAt: Date.now() - 120000 },
  { id: 'm5', chatId: 'c1', senderId: 'u2', kind: 'text', content: '¿Nos conectamos por videollamada?', createdAt: Date.now() - 60000 },
  { id: 'm6', chatId: 'c2', senderId: 'u3', kind: 'text', content: 'La reunión es a las 3pm', createdAt: Date.now() - 500000 },
  { id: 'm7', chatId: 'c2', senderId: 'u1', kind: 'text', content: 'Perfecto, ahí estaré', createdAt: Date.now() - 400000 },
  { id: 'm8', chatId: 'c3', senderId: 'u5', kind: 'text', content: '¿Alguien tiene el enlace?', createdAt: Date.now() - 200000 },
  { id: 'm9', chatId: 'c3', senderId: 'u3', kind: 'text', content: 'Lo paso en un momento', createdAt: Date.now() - 150000 },
  { id: 'm10', chatId: 'c3', senderId: 'u1', kind: 'text', content: 'Gracias Juan 👍', createdAt: Date.now() - 100000 },
];

export const mockChats: Chat[] = [
  {
    id: 'c1',
    type: 'direct',
    title: 'María G.',
    members: [currentUser, mockUsers[1]],
    lastMessage: mockMessages[4],
  },
  {
    id: 'c2',
    type: 'direct',
    title: 'Juan P.',
    members: [currentUser, mockUsers[2]],
    lastMessage: mockMessages[6],
  },
  {
    id: 'c3',
    type: 'group',
    title: 'Equipo Desarrollo',
    description: 'Canal del equipo de desarrollo',
    members: [currentUser, mockUsers[2], mockUsers[4]],
    lastMessage: mockMessages[9],
  },
  {
    id: 'c4',
    type: 'group',
    title: 'Proyecto Alpha',
    description: 'Discusión del proyecto Alpha',
    members: [currentUser, mockUsers[1], mockUsers[3]],
  },
];
