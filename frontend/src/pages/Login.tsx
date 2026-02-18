import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "../contexts/AppContext";

import { MessageCircle } from "lucide-react";

export default function Login() {
  const [emailOrUser, setEmailOrUser] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; server?: string }>({});

  const { loginWS, user, authError, clearAuthError } = useApp();
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errs: typeof errors = {};
    if (!emailOrUser.trim()) errs.email = "El email o usuario es requerido";
    if (!password.trim()) errs.password = "La contraseña es requerida";

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    // 🔥 manda al backend
    clearAuthError();
    loginWS(emailOrUser.trim(), password);
  };

  // Cuando el contexto ya tenga user, entramos al /app
  React.useEffect(() => {
    if (user) navigate("/app");
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">KaapehChat</h1>
        </div>

        <div className="bg-card rounded-2xl p-8 border border-border shadow-lg">
          <h2 className="text-xl font-semibold text-foreground mb-6">Iniciar sesión</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Email o usuario
              </label>
              <input
                id="email"
                type="text"
                value={emailOrUser}
                onChange={(e) => {
                  setEmailOrUser(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined, server: undefined }));
                  clearAuthError();
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="tu@email.com o usuario"
                aria-label="Email o usuario"
              />
              {errors.email && <p className="text-destructive text-sm mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-1.5">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined, server: undefined }));
                  clearAuthError();
                }}
                className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                placeholder="••••••••"
                aria-label="Contraseña"
              />
              {errors.password && <p className="text-destructive text-sm mt-1">{errors.password}</p>}
            </div>

            {(errors.server || authError) && <p className="text-destructive text-sm">{errors.server || authError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              aria-label="Iniciar sesión"
            >
              Iniciar sesión
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿No tienes cuenta?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Crear cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
