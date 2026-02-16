import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { X } from 'lucide-react';

interface GroupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function GroupModal({ open, onClose }: GroupModalProps) {
  const { createGroup } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!open) return null;

  const handleCreate = () => {
    if (!title.trim()) return;
    createGroup(title.trim(), description.trim() || undefined);
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Crear grupo</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors" aria-label="Cerrar">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-4">
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
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all resize-none"
              placeholder="¿De qué trata este grupo?"
              aria-label="Descripción del grupo"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
            aria-label="Crear grupo"
          >
            Crear grupo
          </button>
        </div>
      </div>
    </div>
  );
}
