import React, { useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function NewDirectChatModal({ open, onClose }: Props) {
  const { createDirectChatByUsername } = useApp();

  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setUsername("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const u = username.trim().toLowerCase();
    if (!u) {
      setError("Escribe un username.");
      return;
    }

    setLoading(true);
    const ok = await createDirectChatByUsername(u);
    setLoading(false);

    if (!ok) {
      setError("No existe ese usuario.");
      return;
    }

    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">Nuevo chat directo</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Escribe el <b>username</b> (ej: <span className="font-mono">alex12</span>)
        </p>

        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              placeholder="usuario..."
              autoFocus
            />
            {error && <p className="text-destructive text-sm mt-2">{error}</p>}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted/50 transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              disabled={loading}
            >
              {loading ? "Buscando..." : "Crear chat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
