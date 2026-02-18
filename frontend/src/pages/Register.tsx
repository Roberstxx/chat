import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { MessageCircle } from "lucide-react";

export default function Register() {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { registerWS, user, authError, clearAuthError } = useApp();
  const navigate = useNavigate();

  const set = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((p) => ({ ...p, [key]: "" }));
    clearAuthError();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = "El nombre es requerido";
    if (!form.username.trim()) errs.username = "El usuario es requerido";
    if (!form.email.trim()) errs.email = "El email es requerido";
    if (form.password.length < 4) errs.password = "Mínimo 4 caracteres";
    if (form.password !== form.confirm) errs.confirm = "Las contraseñas no coinciden";

    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    // 🔥 manda al backend (MySQL)
    clearAuthError();
    registerWS(form.name.trim(), form.username.trim().toLowerCase(), form.email.trim().toLowerCase(), form.password);
  };

  // cuando el contexto ya tenga user, nos vamos a /app
  React.useEffect(() => {
    if (user) navigate("/app");
  }, [user, navigate]);

  const fields = [
    { key: "name", label: "Nombre completo", type: "text", placeholder: "Tu nombre" },
    { key: "username", label: "Usuario", type: "text", placeholder: "tu_usuario" },
    { key: "email", label: "Email", type: "email", placeholder: "tu@email.com" },
    { key: "password", label: "Contraseña", type: "password", placeholder: "••••••••" },
    { key: "confirm", label: "Confirmar contraseña", type: "password", placeholder: "••••••••" },
  ];

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
          <h2 className="text-xl font-semibold text-foreground mb-6">Crear cuenta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label htmlFor={f.key} className="block text-sm font-medium text-muted-foreground mb-1.5">
                  {f.label}
                </label>
                <input
                  id={f.key}
                  type={f.type}
                  value={(form as any)[f.key]}
                  onChange={set(f.key)}
                  className="w-full px-4 py-2.5 rounded-lg bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
                  placeholder={f.placeholder}
                  aria-label={f.label}
                />
                {errors[f.key] && <p className="text-destructive text-sm mt-1">{errors[f.key]}</p>}
              </div>
            ))}

            {authError && <p className="text-destructive text-sm">{authError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
              aria-label="Crear cuenta"
            >
              Crear cuenta
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
