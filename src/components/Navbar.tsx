import React from 'react';
import { useUniforms } from '../context/UniformsContext';
import { useAuth } from '../context/AuthContext';
import {
  Boxes,
  Users,
  TrendingUp,
  FileText,
  AlertTriangle,
  LogIn,
  LogOut,
  Lock,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    activeView,
    setActiveView,
    employees,
    inventory,
    movements,
    totalStockUnits,
    lowStockCount,
  } = useUniforms();

  const { currentUser, isAuthenticated, openAuthModal, logout } = useAuth();

  const totalEmployees = employees.length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-amber-400/20">
              <Boxes className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <span className="font-bold text-lg text-slate-900 tracking-tight font-display">
                DataFit
              </span>
            </div>
          </div>

          {/* Metrics in Header (only when authenticated or summarized) */}
          {isAuthenticated ? (
            <div className="hidden lg:flex items-center gap-4 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
              <div className="flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-amber-600" />
                <span>Stock Físico:</span>
                <strong className="text-slate-900">{totalStockUnits.toLocaleString('es-CL')} u.</strong>
              </div>

              <div className="w-px h-3.5 bg-slate-200" />

              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Trabajadores:</span>
                <strong className="text-slate-900">{totalEmployees}</strong>
              </div>

              <div className="w-px h-3.5 bg-slate-200" />

              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Movimientos:</span>
                <strong className="text-slate-900">{movements.length} reg.</strong>
              </div>

              {lowStockCount > 0 && (
                <>
                  <div className="w-px h-3.5 bg-slate-200" />
                  <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{lowStockCount} bajo stock</span>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-xl border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>Datos protegidos contra visualización y modificación no autorizada</span>
            </div>
          )}

          {/* Right Action / Auth Area */}
          <div className="flex items-center gap-2">
            {isAuthenticated && currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wider">
                    {currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'encargado' ? 'Encargado' : 'Usuario Registrado'}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shadow-xs border border-amber-400/40">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>

                <button
                  onClick={logout}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Salir</span>
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Iniciar Sesión</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Dedicated Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 overflow-x-auto py-1 scrollbar-none">
          {/* Tab 1: Inventario a Tiempo Real */}
          <button
            id="nav-tab-inventory"
            onClick={() => setActiveView('inventory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeView === 'inventory' || (activeView as string) === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-4 h-4 text-amber-400" />
            <span>Inventario a Tiempo Real</span>
            {isAuthenticated && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                activeView === 'inventory' || (activeView as string) === 'dashboard'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {totalStockUnits} u.
              </span>
            )}
          </button>

          {/* Tab 2: Registros de Trabajadores */}
          <button
            id="nav-tab-employees"
            onClick={() => setActiveView('employees')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeView === 'employees'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Registros de Trabajadores</span>
            {isAuthenticated && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                activeView === 'employees' ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
              }`}>
                {totalEmployees}
              </span>
            )}
          </button>

          {/* Tab 3: Planificación de Compra */}
          <button
            id="nav-tab-procurement"
            onClick={() => setActiveView('procurement')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors relative ${
              activeView === 'procurement'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Planificación de Compra</span>
          </button>

          {/* Tab 4: Registro de Ingresos y Entregas */}
          <button
            id="nav-tab-movements"
            onClick={() => setActiveView('movements')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              activeView === 'movements' || (activeView as string) === 'deliveries'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Registro de Ingresos y Entregas</span>
            {isAuthenticated && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                activeView === 'movements' || (activeView as string) === 'deliveries'
                  ? 'bg-blue-900 text-blue-200'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {movements.length}
              </span>
            )}
          </button>
        </nav>
      </div>
    </header>
  );
};
