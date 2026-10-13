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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-base shadow-xs">
              <Boxes className="w-5 h-5 text-amber-400" />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight font-display">
              DataFit
            </span>
          </div>

          {/* Right Action / Auth Area */}
          <div className="flex items-center gap-2">
            {isAuthenticated && currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-slate-800 leading-tight">
                    {currentUser.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {currentUser.role === 'admin' ? 'Administrador' : 'Encargado'}
                  </span>
                </div>

                <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xs shadow-2xs">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>

                <button
                  onClick={logout}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Ingresar</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimal Navigation Tabs */}
        <nav className="flex space-x-1 border-t border-slate-100 overflow-x-auto py-1 scrollbar-none">
          {/* Tab 1: Inventario */}
          <button
            id="nav-tab-inventory"
            onClick={() => setActiveView('inventory')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeView === 'inventory' || (activeView as string) === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-amber-400" />
            <span>Inventario</span>
            {isAuthenticated && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeView === 'inventory' || (activeView as string) === 'dashboard'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {totalStockUnits}
              </span>
            )}
          </button>

          {/* Tab 2: Trabajadores */}
          <button
            id="nav-tab-employees"
            onClick={() => setActiveView('employees')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeView === 'employees'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Trabajadores</span>
            {isAuthenticated && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeView === 'employees' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {totalEmployees}
              </span>
            )}
          </button>

          {/* Tab 3: Movimientos */}
          <button
            id="nav-tab-movements"
            onClick={() => setActiveView('movements')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeView === 'movements' || (activeView as string) === 'deliveries'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Movimientos</span>
            {isAuthenticated && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                activeView === 'movements' || (activeView as string) === 'deliveries'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}>
                {movements.length}
              </span>
            )}
          </button>

          {/* Tab 4: Plan de Compra */}
          <button
            id="nav-tab-procurement"
            onClick={() => setActiveView('procurement')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeView === 'procurement'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>Plan de Compra</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
