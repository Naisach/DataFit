import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, LogIn, Sparkles } from 'lucide-react';

interface ProtectedViewGuardProps {
  moduleName: string;
  moduleDescription: string;
  icon?: React.ReactNode;
}

export const ProtectedViewGuard: React.FC<ProtectedViewGuardProps> = ({
  moduleName,
  moduleDescription,
  icon,
}) => {
  const { openAuthModal, login } = useAuth();

  return (
    <div className="py-12 px-4 sm:px-6 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="max-w-2xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Banner header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">
            Acceso Restringido a Usuarios Registrados
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-lg mx-auto">
            Cualquiera puede acceder libremente a esta plataforma, pero para <strong className="text-amber-300 font-semibold">ver los datos y realizar modificaciones</strong> en <span className="underline decoration-amber-400 font-medium">{moduleName}</span> debes iniciar sesión con tu cuenta.
          </p>
        </div>

        {/* Action card */}
        <div className="p-8">
          {/* Quick interactive buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={openAuthModal}
              className="w-full sm:w-auto px-6 py-3.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar Sesión / Crear Cuenta</span>
            </button>

            <button
              onClick={() => login('admin', 'admin123')}
              className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-2 border border-slate-300"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Entrar rápido como Admin (Prueba)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
