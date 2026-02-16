import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Circle } from 'lucide-react';

export default function StatusSelector() {
  const { user, updateStatus } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) return null;

  const statuses: { value: 'online' | 'busy' | 'offline'; label: string; color: string }[] = [
    { value: 'online', label: 'En línea', color: 'bg-status-online' },
    { value: 'busy', label: 'Ocupado', color: 'bg-status-busy' },
    { value: 'offline', label: 'Ausente', color: 'bg-status-offline' },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Cambiar estado"
      >
        <span className={`w-2 h-2 rounded-full ${statuses.find((s) => s.value === user.status)?.color}`} />
        {statuses.find((s) => s.value === user.status)?.label}
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 w-36 bg-popover border border-border rounded-xl shadow-lg p-1.5 animate-fade-in z-50">
          {statuses.map((s) => (
            <button
              key={s.value}
              onClick={() => { updateStatus(s.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                user.status === s.value ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
              }`}
            >
              <span className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
