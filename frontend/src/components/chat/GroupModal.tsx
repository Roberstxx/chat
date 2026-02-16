import React, { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X, Search, Users } from 'lucide-react';

interface GroupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GroupModal({ open, onClose }: GroupModalProps) {
  const { createGroup, inviteToGroup, chats, user } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  const contacts = useMemo(() => {
    const map = new Map<string, { id: string; displayName: string; username: string }>();

    chats.forEach((chat) => {
      if (chat.type !== 'direct') return;
      chat.members.forEach((m) => {
        if (m.id === user?.id) return;
        map.set(m.id, {
          id: m.id,
          displayName: m.displayName,
          username: m.username,
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [chats, user?.id]);

  const filteredContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) => c.displayName.toLowerCase().includes(q) || c.username.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  if (!open) return null;

  const toggleUser = (userId: string) => {
    setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setSearch('');
    setSelected([]);
    setCreating(false);
  };

  const handleCreate = async () => {
    if (!title.trim() || creating) return;

    setCreating(true);
    const chat = await createGroup(title.trim(), description.trim() || undefined);

    if (chat && selected.length > 0) {
      inviteToGroup(chat.id, selected);
    }

    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 md:bg-background/80 md:backdrop-blur-sm animate-fade-in">
      <div className="h-full md:h-auto md:min-h-0 md:flex md:items-center md:justify-center p-0 md:p-4">
        <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl bg-card border-0 md:border border-border rounded-none md:rounded-2xl p-4 md:p-6 shadow-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0">
            <h2 className="text-lg font-semibold text-foreground">Crear grupo</h2>
            <button onClick={() => { reset(); onClose(); }} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto pr-1">
            <div>
              <label htmlFor="group-name" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Nombre del grupo
              </label>
              <input
                id="group-name"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="Ej: Equipo de diseño"
                aria-label="Nombre del grupo"
              />
            </div>

            <div>
              <label htmlFor="group-desc" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Descripción (opcional)
              </label>
              <textarea
                id="group-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
                placeholder="¿De qué trata este grupo?"
                aria-label="Descripción del grupo"
              />
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-foreground">Agregar contactos</p>
                <span className="text-xs text-muted-foreground">{selected.length} seleccionados</span>
              </div>

              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o usuario..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  aria-label="Buscar contactos"
                />
              </div>

              <div className="max-h-56 md:max-h-64 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-muted/30">
                {filteredContacts.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    No hay contactos con chats directos aún.
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const checked = selected.includes(contact.id);
                    return (
                      <label key={contact.id} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleUser(contact.id)}
                          className="w-4 h-4 accent-primary"
                        />
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-semibold">
                          {contact.displayName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{contact.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">@{contact.username}</p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border shrink-0 flex flex-col-reverse md:flex-row gap-2 md:justify-end">
            <button
              onClick={() => { reset(); onClose(); }}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted/50 transition"
              disabled={creating}
            >
              Cancelar
            </button>
            <button
              onClick={() => void handleCreate()}
              disabled={!title.trim() || creating}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
              aria-label="Crear grupo"
            >
              {creating ? 'Creando...' : 'Crear grupo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
