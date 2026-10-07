import React, { useState } from 'react';
import { useUniforms } from '../context/UniformsContext';
import {
  TrendingUp,
  Sliders,
  Calendar,
  Clock,
  Sparkles,
  Download,
  Printer,
  FileSpreadsheet,
  ShieldCheck,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ChevronRight,
  Info,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { exportProcurementPlanToDrive } from '../services/googleDriveService';
import { hasActiveDriveToken } from '../services/authService';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

export const ProcurementPlanView: React.FC = () => {
  const {
    purchasePlan,
    totalBudgetCLP,
    planningConfig,
    setPlanningConfig,
    garments,
    employees,
    aiAnalysis,
    isAiLoading,
    runAiProcurementAnalysis,
  } = useUniforms();

  const [selectedGarmentFilter, setSelectedGarmentFilter] = useState<string>('todos');
  const [procurementNotes, setProcurementNotes] = useState('');
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false);

  // Timeline computation
  const today = new Date('2026-09-21');
  const cutoff = new Date(planningConfig.supplierCutoffDate);
  const target = new Date(planningConfig.targetDeliveryDate);
  const daysToCutoff = Math.ceil((cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysToTarget = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  // Lead time alert state
  const isCutoffUrgent = daysToCutoff <= 14;

  // Filtered items
  const filteredPlanItems = selectedGarmentFilter === 'todos'
    ? purchasePlan
    : purchasePlan.filter((p) => p.garmentId === selectedGarmentFilter);

  // Total units to order
  const totalGrossUnits = purchasePlan.reduce((acc, curr) => acc + curr.totalToOrder, 0);
  const totalInStockUnits = purchasePlan.reduce((acc, curr) => acc + (curr.inStock || 0), 0);
  const totalNetUnits = purchasePlan.reduce((acc, curr) => acc + (curr.netToOrder !== undefined ? curr.netToOrder : curr.totalToOrder), 0);
  const totalBufferUnits = purchasePlan.reduce((acc, curr) => acc + curr.bufferUnits, 0);

  // Summary by garment for the chart
  const garmentChartData = garments.map((g) => {
    const items = purchasePlan.filter((p) => p.garmentId === g.id);
    const confirmed = items.reduce((acc, curr) => acc + curr.confirmedCount, 0);
    const projected = items.reduce((acc, curr) => acc + curr.projectedSeasonalAddition, 0);
    const buffer = items.reduce((acc, curr) => acc + curr.bufferUnits, 0);
    return {
      name: g.name.length > 20 ? g.name.substring(0, 20) + '...' : g.name,
      fullName: g.name,
      Confirmado: confirmed,
      ProyeccionEstival: projected,
      BufferSeguridad: buffer,
      Total: confirmed + projected + buffer,
    };
  });

  // Export CSV for Suppliers
  const handleExportCsv = () => {
    const headers = [
      'ID Prenda',
      'Nombre de Prenda',
      'Categoria',
      'Talla',
      'Personal Confirmado (Reg.)',
      'Proyeccion Temporeros Estivales',
      `Colchon Buffer (${planningConfig.bufferPercent}%)`,
      'Total Unidades a Confeccionar',
      'Costo Unitario Estimado (CLP)',
      'Subtotal Estimado (CLP)',
    ];

    const rows = purchasePlan.map((p) => [
      `"${p.garmentId}"`,
      `"${p.garmentName}"`,
      `"${p.category}"`,
      `"${p.size}"`,
      p.confirmedCount,
      p.projectedSeasonalAddition,
      p.bufferUnits,
      p.totalToOrder,
      p.unitCost,
      p.totalCost,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Orden_Compra_Tallas_Uniformes_${planningConfig.seasonName.replace(/\s+/g, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [driveExportSuccess, setDriveExportSuccess] = useState<string | null>(null);

  const handleExportDrive = async () => {
    if (!hasActiveDriveToken()) {
      // Prompt sign in via Google Drive view
      window.location.hash = '#drive';
      alert('Por favor conecte su cuenta en la pestaña "Google Drive" para sincronizar directamente.');
      return;
    }
    setIsExportingDrive(true);
    setDriveExportSuccess(null);
    try {
      const res = await exportProcurementPlanToDrive(purchasePlan, planningConfig, totalBudgetCLP);
      setDriveExportSuccess(`Orden de compra guardada con éxito en Google Drive: ${res.name}`);
      setTimeout(() => setDriveExportSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al guardar en Google Drive');
    } finally {
      setIsExportingDrive(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drive Alert */}
      {driveExportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{driveExportSuccess}</span>
          </div>
        </div>
      )}

      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold mb-1">
            <Sun className="w-3.5 h-3.5 text-amber-600" />
            <span>Planificador Oportuno de Adquisiciones</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            Planificación y Análisis de Compras
          </h1>
          <p className="text-xs text-slate-500">
            Proyección de demanda, cálculo de colchón de contingencia para temporeros y cronograma oportuno
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-tender"
            onClick={() => setIsTenderModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Ficha de Licitación</span>
          </button>

          <button
            id="btn-export-procurement-drive"
            onClick={handleExportDrive}
            disabled={isExportingDrive}
            title="Guardar orden de compra en Google Drive"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
          >
            {isExportingDrive ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Guardar en Drive</span>
          </button>

          <button
            id="btn-export-procurement-csv"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Pedido (CSV)</span>
          </button>
        </div>
      </div>

      {/* Critical Timeline & Lead Time Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                isCutoffUrgent ? 'bg-amber-100 text-amber-800 animate-bounce' : 'bg-slate-900 text-amber-400'
              }`}
            >
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  Semáforo de Adquisición Oportuna
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isCutoffUrgent ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'
                  }`}
                >
                  {isCutoffUrgent ? 'VENTANA CRÍTICA' : 'FASE PLANIFICACIÓN'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Considera 35 a 45 días de plazo de fabricación textil, corte, bordado de logos y despacho a faena.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Límite Envío O.C. Proveedor</span>
              <strong className="text-slate-900 font-bold">{planningConfig.supplierCutoffDate}</strong>
              <span className="text-amber-700 block font-semibold">({daysToCutoff} días restantes)</span>
            </div>
            <div className="w-px h-8 bg-slate-200" />
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Inicio Campaña / Entrega Faena</span>
              <strong className="text-slate-900 font-bold">{planningConfig.targetDeliveryDate}</strong>
              <span className="text-emerald-700 block font-semibold">({daysToTarget} días restantes)</span>
            </div>
          </div>
        </div>

        {/* Dynamic Simulation Controls Bar */}
        <div className="mt-4 pt-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Config 1: Temporeros proyectados adicionales */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">
              Temporeros Estivales Proyectados
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={500}
                value={planningConfig.projectedSummerWorkers}
                onChange={(e) =>
                  setPlanningConfig((prev) => ({
                    ...prev,
                    projectedSummerWorkers: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
                className="w-20 px-2 py-1 bg-white border border-slate-300 rounded font-bold text-center text-slate-900"
              />
              <span className="text-slate-500 text-[11px]">
                ({employees.filter((e) => e.type === 'estival').length} ya registrados)
              </span>
            </div>
          </div>

          {/* Config 2: Colchón de seguridad (Buffer) */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">Colchón de Seguridad (Buffer)</label>
              <strong className="text-amber-700 font-bold">{planningConfig.bufferPercent}%</strong>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              step={1}
              value={planningConfig.bufferPercent}
              onChange={(e) =>
                setPlanningConfig((prev) => ({
                  ...prev,
                  bufferPercent: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full accent-amber-600"
            />
            <span className="text-[10px] text-slate-400">
              +{totalBufferUnits} unidades para cambios y rotación
            </span>
          </div>

          {/* Config 3: Fecha corte O.C. */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">Fecha Límite O.C.</label>
            <input
              type="date"
              value={planningConfig.supplierCutoffDate}
              onChange={(e) =>
                setPlanningConfig((prev) => ({
                  ...prev,
                  supplierCutoffDate: e.target.value,
                }))
              }
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 text-xs"
            />
          </div>

          {/* Config 4: Fecha Entrega Deseada */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">Fecha Entrega Faena</label>
            <input
              type="date"
              value={planningConfig.targetDeliveryDate}
              onChange={(e) =>
                setPlanningConfig((prev) => ({
                  ...prev,
                  targetDeliveryDate: e.target.value,
                }))
              }
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-800 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Summary KPI Cards for Procurement */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Requerimiento Bruto
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalGrossUnits}</span>
            <span className="text-xs text-slate-500">prendas</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Nómina + temporeros + buffer ({totalBufferUnits} u.)
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Cubierto por Bodega
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{totalInStockUnits}</span>
            <span className="text-xs text-slate-500">en stock actual</span>
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            Ahorro descontado del pedido
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Compra Neta Requerida
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{totalNetUnits}</span>
            <span className="text-xs text-slate-500">a licitar</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Faltante neto para cubrir la campaña
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Presupuesto Neto O.C.
          </span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              ${(totalBudgetCLP).toLocaleString('es-CL')}
            </span>
            <span className="text-xs text-slate-500">CLP</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Aprox. ${(Math.round(totalBudgetCLP / 930)).toLocaleString()} USD
          </p>
        </div>
      </div>

      {/* Recharts Chart: Demanda por Prenda */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Demanda Consolidada por Tipo de Prenda
            </h2>
            <p className="text-xs text-slate-500">
              Desglose entre requerimiento confirmado, proyección de temporeros y colchón de seguridad
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={garmentChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-10} textAnchor="end" tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar dataKey="Confirmado" stackId="a" fill="#0f172a" name="Confirmado (Nómina)" />
              <Bar dataKey="ProyeccionEstival" stackId="a" fill="#f59e0b" name="Proyección Temporeros" />
              <Bar dataKey="BufferSeguridad" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name={`Buffer (+${planningConfig.bufferPercent}%)`} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Procurement Strategist (Gemini 3.8 Flash) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 text-white shadow-md border border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Asistente Inteligente de Adquisiciones & Licitación</span>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                  Gemini AI
                </span>
              </h2>
              <p className="text-xs text-slate-300">
                Analiza las curvas de tallas, detecta riesgos de quiebre y genera pliegos técnicos para proveedores
              </p>
            </div>
          </div>

          <button
            id="btn-run-ai-analysis"
            disabled={isAiLoading}
            onClick={() => runAiProcurementAnalysis(procurementNotes)}
            className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isAiLoading ? 'Analizando Compras...' : 'Generar Informe Estratégico'}</span>
          </button>
        </div>

        {/* Optional Notes Input for Context */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={procurementNotes}
            onChange={(e) => setProcurementNotes(e.target.value)}
            placeholder="Contexto adicional (ej: Faenas con calor extremo sobre 32°C, preferencia tela certificada UV)..."
            className="w-full bg-slate-800/80 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
          />
        </div>

        {/* AI Output Display */}
        {aiAnalysis ? (
          <div className="mt-4 pt-4 border-t border-slate-700/80 space-y-4 text-xs">
            {/* Executive Summary */}
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
              <h3 className="font-bold text-amber-300 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                Diagnóstico de Compras Oportunas:
              </h3>
              <p className="text-slate-200 leading-relaxed">{aiAnalysis.executiveSummary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Buffer and size distribution advice */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
                <h4 className="font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Recomendación de Colchón y Curva de Tallas:
                </h4>
                <p className="text-slate-300 leading-relaxed">{aiAnalysis.bufferRecommendation}</p>
              </div>

              {/* Technical specs recommendation */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
                <h4 className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                  <Sun className="w-4 h-4" /> Especificaciones Técnicas Estivales:
                </h4>
                <p className="text-slate-300 leading-relaxed">{aiAnalysis.technicalSpecsRecommendation}</p>
              </div>
            </div>

            {/* Action Plan Milestones */}
            {aiAnalysis.procurementActionPlan && (
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700">
                <h4 className="font-bold text-white mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" /> Cronograma de Hitos Críticos:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {aiAnalysis.procurementActionPlan.map((step: any, idx: number) => (
                    <div key={idx} className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700 text-[11px]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-amber-300 truncate">{step.step}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          step.impact === 'Crítico' ? 'bg-rose-500/20 text-rose-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {step.impact}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[10px] mb-1">Plazo: {step.timeframe}</p>
                      <p className="text-slate-300">{step.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 text-xs text-slate-400 italic">
            💡 Haz clic en "Generar Informe Estratégico" para obtener recomendaciones automáticas de tallas y negociación textil con IA.
          </div>
        )}
      </div>

      {/* Sizing Matrix Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Matriz Consolidada de Tallas y Plan de Pedido
            </h3>
            <p className="text-xs text-slate-500">
              Desglose detallado por prenda y talla con unidades base + colchón de contingencia
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Filtrar Prenda:</span>
            <select
              value={selectedGarmentFilter}
              onChange={(e) => setSelectedGarmentFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            >
              <option value="todos">Todas las prendas</option>
              {garments.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4">Prenda de Uniforme</th>
                <th className="py-2.5 px-3 text-center">Talla</th>
                <th className="py-2.5 px-3 text-center">Confirmado</th>
                <th className="py-2.5 px-3 text-center">Proy. Estival</th>
                <th className="py-2.5 px-3 text-center">Buffer (+{planningConfig.bufferPercent}%)</th>
                <th className="py-2.5 px-3 text-center font-bold text-slate-700">Demanda Bruta</th>
                <th className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/50">En Bodega</th>
                <th className="py-2.5 px-3 text-center font-bold text-amber-900 bg-amber-50/80">Neto a Comprar</th>
                <th className="py-2.5 px-3 text-right">Costo Unit.</th>
                <th className="py-2.5 px-4 text-right font-bold text-slate-900">Subtotal Neto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlanItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    <span className="truncate max-w-xs block">{item.garmentName}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="inline-block min-w-[30px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                      {item.size}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600">{item.confirmedCount}</td>
                  <td className="py-2.5 px-3 text-center text-amber-700 font-medium">+{item.projectedSeasonalAddition}</td>
                  <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">+{item.bufferUnits}</td>
                  <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                    {item.totalToOrder} un.
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-emerald-700 bg-emerald-50/30">
                    {item.inStock || 0} un.
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-amber-50/50">
                    <span className={`px-2 py-0.5 rounded ${item.netToOrder > 0 ? 'bg-amber-100 text-amber-900 font-extrabold' : 'bg-slate-100 text-slate-400 font-normal'}`}>
                      {item.netToOrder !== undefined ? item.netToOrder : item.totalToOrder} un.
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-slate-500 font-mono">
                    ${item.unitCost.toLocaleString('es-CL')}
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">
                    ${((item.netToOrder !== undefined ? item.netToOrder : item.totalToOrder) * item.unitCost).toLocaleString('es-CL')}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900 text-xs">
              <tr>
                <td colSpan={6} className="py-3 px-4 text-right uppercase tracking-wider">
                  Total Neto a Comprar a Proveedores:
                </td>
                <td className="py-3 px-3 text-center text-emerald-700 font-extrabold bg-emerald-100/40">
                  {filteredPlanItems.reduce((a, b) => a + (b.inStock || 0), 0)} u.
                </td>
                <td className="py-3 px-3 text-center font-extrabold text-amber-900 bg-amber-100/60">
                  {filteredPlanItems.reduce((a, b) => a + (b.netToOrder !== undefined ? b.netToOrder : b.totalToOrder), 0)} unidades
                </td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm font-mono">
                  ${filteredPlanItems.reduce((a, b) => a + ((b.netToOrder !== undefined ? b.netToOrder : b.totalToOrder) * b.unitCost), 0).toLocaleString('es-CL')} CLP
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Tender Sheet Printable Modal */}
      {isTenderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Ficha Oficial de Licitación para Proveedores Textiles
                </h3>
              </div>
              <button
                onClick={() => setIsTenderModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                ✕
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 text-xs space-y-3">
              <div className="border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide">
                  Requerimiento de Confección: {planningConfig.seasonName}
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Fecha límite de cotización: <strong>{planningConfig.supplierCutoffDate}</strong> • Entrega máxima en bodega: <strong>{planningConfig.targetDeliveryDate}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-slate-800">Especificaciones Generales Requeridas:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600 text-[11px]">
                  <li>Prendas superiores de temporada deben certificar factor de protección solar UPF 50+.</li>
                  <li>Pantalones en tela ripstop liviana (65% poliéster / 35% algodón) con triple costura reforzada.</li>
                  <li>Zapatos de seguridad con puntera de composite no metálica (dieléctrico) y plantilla anti-perforación.</li>
                  <li>El proveedor debe garantizar un plazo de recambio de tallas de máximo 5 días hábiles ante descalces.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold text-slate-800 mb-1">Volumen Consolidado por Prenda:</p>
                <div className="space-y-1 text-[11px]">
                  {garments.map((g) => {
                    const sum = purchasePlan.filter((p) => p.garmentId === g.id).reduce((a, b) => a + b.totalToOrder, 0);
                    return (
                      <div key={g.id} className="flex justify-between bg-white p-1.5 rounded border border-slate-200">
                        <span className="font-medium text-slate-800">{g.name}</span>
                        <strong className="font-mono text-slate-900">{sum} unidades</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setIsTenderModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Pliego de Cotización</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
