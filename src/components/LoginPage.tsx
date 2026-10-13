import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Boxes, User, Lock, Eye, EyeOff, LogIn, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, register } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Additional fields for register mode
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isRegisterMode) {
        if (!name.trim()) {
          setError('Ingresa tu nombre completo.');
          setIsLoading(false);
          return;
        }
        const res = await register({
          name: name.trim(),
          username: username.trim(),
          email: email.trim() || `${username.trim().toLowerCase()}@empresa.cl`,
          password: password.trim(),
        });
        if (!res.success) {
          setError(res.error || 'No fue posible crear la cuenta.');
        }
      } else {
        const res = await login(username, password);
        if (!res.success) {
          setError(res.error || 'Usuario o contraseña incorrectos.');
        }
      }
    } catch {
      setError('Ocurrió un error al procesar el ingreso.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillAccount = (user: string, pass: string) => {
    setIsRegisterMode(false);
    setUsername(user);
    setPassword(pass);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 font-sans selection:bg-amber-500/30 selection:text-amber-200 relative overflow-hidden">
      {/* Subtle ambient lighting */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 text-amber-400 mb-3 shadow-md ring-2 ring-amber-400/20">
            <Boxes className="w-6 h-6 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
            {isRegisterMode ? 'Crear Cuenta' : 'Inicio de Sesión'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isRegisterMode
              ? 'Registra tu usuario para acceder al inventario y dotación'
              : 'Sistema de Control de Inventario y Dotación · JAC y Buses Bío Bío'}
          </p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <>
                {/* Barra: Nombre Completo (solo en registro) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nombre Completo
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Correo Electrónico (Opcional)
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="correo@empresa.cl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-900"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Barra 1: Usuario */}
            <div>
              <label
                htmlFor="input-username"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="input-username"
                  type="text"
                  autoFocus
                  placeholder="Ingresa tu usuario"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full pl-10 pr-3.5 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs"
                />
              </div>
            </div>

            {/* Barra 2: Contraseña */}
            <div>
              <label
                htmlFor="input-password"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="input-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium text-slate-900 placeholder:text-slate-400 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                  title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de Enviar */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {isLoading ? (
                  <span>Verificando...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4 text-amber-400" />
                    <span>{isRegisterMode ? 'Registrar Cuenta' : 'Iniciar Sesión'}</span>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Access Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-2.5">
              Cuentas de acceso rápido (Prueba)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleFillAccount('admin', 'admin123')}
                className="p-2 text-left bg-slate-50 hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 rounded-lg text-xs transition-colors group"
              >
                <div className="font-bold text-slate-800 group-hover:text-amber-900 flex items-center justify-between">
                  <span>admin</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">clave: admin123</div>
              </button>

              <button
                type="button"
                onClick={() => handleFillAccount('bodega', 'bodega2026')}
                className="p-2 text-left bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-blue-300 rounded-lg text-xs transition-colors group"
              >
                <div className="font-bold text-slate-800 group-hover:text-blue-900 flex items-center justify-between">
                  <span>bodega</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-0.5">clave: bodega2026</div>
              </button>
            </div>
          </div>

          {/* Toggle Register / Login */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setError(null);
              }}
              className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors"
            >
              {isRegisterMode
                ? '¿Ya tienes una cuenta? Iniciar sesión'
                : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
        </div>
      </div>

      {/* Discreet Footer */}
      <div className="mt-6 text-xs text-slate-500 text-center relative z-10">
        <span>DataFit · Control de Uniformes JAC & Buses Bío Bío</span>
      </div>
    </div>
  );
};
