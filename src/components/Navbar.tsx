import React from 'react';
import { useUniforms } from '../context/UniformsContext';
import {
  LayoutDashboard,
  Users,
  PackageCheck,
  TrendingUp,
  Smartphone,
  Sun,
  ShieldCheck,
  Clock,
  RotateCcw,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { activeView, setActiveView, employees, deliveries, totalBudgetCLP, resetToSampleData } = useUniforms();

  const totalEmployees = employees.length;
  const seasonalEmployees = employees.filter((e) => e.type === 'estival').length;
  const permanentEmployees = employees.filter((e) => e.type === 'permanente').length;
  const completedSurveys = employees.filter((e) => e.surveyStatus === 'completado').length;
  const surveyCoverage = totalEmployees > 0 ? Math.round((completedSurveys / totalEmployees) * 100) : 0;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200">
      {/* Top Notification Banner for Seasonal Lead Time */}
      <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white px-4 py-1.5 text-xs font-medium flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full">
          <Sun className="w-4 h-4 shrink-0 text-amber-100 animate-pulse" />
          <span className="font-semibold tracking-wide uppercase text-[11px] bg-amber-700/60 px-1.5 py-0.5 rounded">
            Planificación Campaña Estival
          </span>
          <span className="truncate">
            Ventana crítica de compras activa: Pedido a talleres textiles debe emitirse antes del <strong>01 de Octubre</strong> para entrega el <strong>15 de Noviembre</strong>.
          </span>
        </div>
        <button
          onClick={resetToSampleData}
          title="Restablecer datos de ejemplo"
          className="hidden md:flex items-center gap-1 text-[11px] bg-white/15 hover:bg-white/25 px-2 py-0.5 rounded text-white transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          Restablecer datos
        </button>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-lg shadow-md ring-2 ring-amber-400/20">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight font-display">
                  DataFit
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  Gestión & EPP
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Recolección de tallas, entregas y planificación de compras
              </p>
            </div>
          </div>

          {/* Quick Stats in Header */}
          <div className="hidden lg:flex items-center gap-5 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span>Dotación:</span>
              <strong className="text-slate-900">{totalEmployees}</strong>
              <span className="text-[11px] text-slate-400">({permanentEmployees} perm. / {seasonalEmployees} estiv.)</span>
            </div>
            <div className="w-px h-3.5 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Cobertura tallas:</span>
              <strong className="text-emerald-700 font-semibold">{surveyCoverage}%</strong>
            </div>
            <div className="w-px h-3.5 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Presupuesto est.:</span>
              <strong className="text-slate-900">${(totalBudgetCLP / 1000000).toFixed(1)}M CLP</strong>
            </div>
          </div>

          {/* Worker Self-Survey Button (Quick Access) */}
          <button
            id="btn-nav-worker-portal"
            onClick={() => setActiveView('self_service')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-xs ${
              activeView === 'self_service'
                ? 'bg-amber-600 text-white shadow-amber-600/20'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/70'
            }`}
          >
            <Smartphone className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Autoregistro Colaborador (QR)</span>
            <span className="sm:hidden">QR Tallas</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 overflow-x-auto py-1 scrollbar-none">
          <button
            id="nav-tab-dashboard"
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeView === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tablero General</span>
          </button>

          <button
            id="nav-tab-employees"
            onClick={() => setActiveView('employees')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeView === 'employees'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Recolección de Tallas ({totalEmployees})</span>
          </button>

          <button
            id="nav-tab-deliveries"
            onClick={() => setActiveView('deliveries')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeView === 'deliveries'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Entregas & Despachos ({deliveries.length})</span>
          </button>

          <button
            id="nav-tab-procurement"
            onClick={() => setActiveView('procurement')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors relative ${
              activeView === 'procurement'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-amber-400" />
            <span>Planificación de Compras</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
          </button>
        </nav>
      </div>
    </header>
  );
};
