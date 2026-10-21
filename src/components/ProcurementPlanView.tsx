import React, { useState } from 'react';
import { useUniforms } from '../context/UniformsContext';
import {
  TrendingUp,
  Sliders,
  Calendar,
  Clock,
  Download,
  Printer,
  FileSpreadsheet,
  Sun,
  Snowflake,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ChevronRight,
  Info,
  HardDrive,
  RefreshCw,
  Users,
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
import { SeasonType, isGarmentInSeason } from '../types';

const PRESET_PERIODS: { label: string; season: SeasonType; cutoff: string; target: string }[] = [
  { label: 'Verano 2025', season: 'verano', cutoff: '2024-10-01', target: '2024-11-15' },
  { label: 'Invierno 2025', season: 'invierno', cutoff: '2025-03-01', target: '2025-04-15' },
  { label: 'Verano 2026', season: 'verano', cutoff: '2025-10-01', target: '2025-11-15' },
  { label: 'Invierno 2026', season: 'invierno', cutoff: '2026-03-01', target: '2026-04-15' },
  { label: 'Verano 2027', season: 'verano', cutoff: '2026-10-01', target: '2026-11-15' },
  { label: 'Invierno 2027', season: 'invierno', cutoff: '2027-03-01', target: '2027-04-15' },
  { label: 'Verano 2028', season: 'verano', cutoff: '2027-10-01', target: '2027-11-15' },
  { label: 'Invierno 2028', season: 'invierno', cutoff: '2028-03-01', target: '2028-04-15' },
];

export const ProcurementPlanView: React.FC = () => {
  const {
    purchasePlan,
    planningConfig,
    setPlanningConfig,
    garments,
    employees,
  } = useUniforms();

  const [selectedGarmentFilter, setSelectedGarmentFilter] = useState<string>('todos');
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false);
  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [driveExportSuccess, setDriveExportSuccess] = useState<string | null>(null);

  // Active season resolution
  const activeSeason: SeasonType =
    planningConfig.seasonType ||
    (planningConfig.seasonName.toLowerCase().includes('invierno') ? 'invierno' : 'verano');

  // Filter garments strictly for the selected season
  const seasonalGarments = garments.filter((g) => isGarmentInSeason(g.name, activeSeason));

  // Items from purchasePlan that belong to the active season
  const seasonalPlanItems = purchasePlan.filter((p) =>
    seasonalGarments.some((g) => g.id === p.garmentId)
  );

  // Timeline computation
  const today = new Date('2026-09-21');
  const cutoff = new Date(planningConfig.supplierCutoffDate);
  const target = new Date(planningConfig.targetDeliveryDate);
  const daysToCutoff = Math.ceil((cutoff.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const daysToTarget = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isCutoffUrgent = daysToCutoff <= 14;

  // Filtered items by selected garment dropdown
  const filteredPlanItems = selectedGarmentFilter === 'todos'
    ? seasonalPlanItems
    : seasonalPlanItems.filter((p) => p.garmentId === selectedGarmentFilter);

  // Aggregated totals
  const totalGrossUnits = seasonalPlanItems.reduce((acc, curr) => acc + curr.totalToOrder, 0);
  const totalInStockUnits = seasonalPlanItems.reduce((acc, curr) => acc + (curr.inStock || 0), 0);
  const totalNetUnits = seasonalPlanItems.reduce(
    (acc, curr) => acc + (curr.netToOrder !== undefined ? curr.netToOrder : curr.totalToOrder),
    0
  );
  const totalBufferUnits = seasonalPlanItems.reduce((acc, curr) => acc + curr.bufferUnits, 0);
  const totalNetBudgetCLP = seasonalPlanItems.reduce(
    (acc, curr) =>
      acc + ((curr.netToOrder !== undefined ? curr.netToOrder : curr.totalToOrder) * curr.unitCost),
    0
  );

  // Switch season (Verano <-> Invierno)
  const handleSeasonToggle = (newSeason: SeasonType) => {
    if (newSeason === activeSeason) return;
    const yearMatch = planningConfig.seasonName.match(/\d{4}/);
    const year = yearMatch ? yearMatch[0] : '2026';
    const newPeriodLabel = `${newSeason === 'verano' ? 'Verano' : 'Invierno'} ${year}`;
    const preset = PRESET_PERIODS.find((p) => p.label === newPeriodLabel);

    setPlanningConfig((prev) => ({
      ...prev,
      seasonType: newSeason,
      seasonName: newPeriodLabel,
      period: newPeriodLabel,
      supplierCutoffDate: preset ? preset.cutoff : (newSeason === 'verano' ? `${year}-10-01` : `${year}-03-01`),
      targetDeliveryDate: preset ? preset.target : (newSeason === 'verano' ? `${year}-11-15` : `${year}-04-15`),
    }));
    setSelectedGarmentFilter('todos');
  };

  // Switch period dropdown
  const handlePeriodChange = (newPeriod: string) => {
    const preset = PRESET_PERIODS.find((p) => p.label === newPeriod);
    const newSeason: SeasonType = preset
      ? preset.season
      : newPeriod.toLowerCase().includes('invierno')
      ? 'invierno'
      : 'verano';

    setPlanningConfig((prev) => ({
      ...prev,
      seasonType: newSeason,
      seasonName: newPeriod,
      period: newPeriod,
      supplierCutoffDate: preset ? preset.cutoff : prev.supplierCutoffDate,
      targetDeliveryDate: preset ? preset.target : prev.targetDeliveryDate,
    }));
    setSelectedGarmentFilter('todos');
  };

  // Summary by garment for the chart (strictly seasonal garments)
  const garmentChartData = seasonalGarments.map((g) => {
    const items = seasonalPlanItems.filter((p) => p.garmentId === g.id);
    const confirmed = items.reduce((acc, curr) => acc + curr.confirmedCount, 0);
    const buffer = items.reduce((acc, curr) => acc + curr.bufferUnits, 0);
    return {
      name: g.name.length > 20 ? g.name.substring(0, 20) + '...' : g.name,
      fullName: g.name,
      Confirmado: confirmed,
      BufferSeguridad: buffer,
      Total: confirmed + buffer,
    };
  });

  // Export CSV for Suppliers
  const handleExportCsv = () => {
    const headers = [
      'ID Prenda',
      'Nombre de Prenda',
      'Categoria',
      'Talla',
      'Personal Confirmado (Nómina)',
      `Colchon Buffer (${planningConfig.bufferPercent}%)`,
      'Total Demanda Bruta',
      'En Bodega',
      'Neto a Comprar',
      'Costo Unitario Estimado (CLP)',
      'Subtotal Neto (CLP)',
    ];

    const rows = filteredPlanItems.map((p) => [
      `"${p.garmentId}"`,
      `"${p.garmentName}"`,
      `"${p.category}"`,
      `"${p.size}"`,
      p.confirmedCount,
      p.bufferUnits,
      p.totalToOrder,
      p.inStock || 0,
      p.netToOrder !== undefined ? p.netToOrder : p.totalToOrder,
      p.unitCost,
      (p.netToOrder !== undefined ? p.netToOrder : p.totalToOrder) * p.unitCost,
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

  const handleExportDrive = async () => {
    if (!hasActiveDriveToken()) {
      window.location.hash = '#drive';
      alert('Por favor conecte su cuenta en la pestaña "Google Drive" para sincronizar directamente.');
      return;
    }
    setIsExportingDrive(true);
    setDriveExportSuccess(null);
    try {
      const res = await exportProcurementPlanToDrive(seasonalPlanItems, planningConfig, totalNetBudgetCLP);
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
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-amber-400 text-[11px] font-bold mb-1 shadow-2xs">
            {activeSeason === 'verano' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Snowflake className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>Planificación Estacional de Adquisiciones</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            Planificación de Compras: {planningConfig.seasonName}
          </h1>
          <p className="text-xs text-slate-500">
            Cálculo de requerimientos por nómina activa, prendas estacionales y colchón de seguridad para recambios
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

      {/* Main Season & Period Selector Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Configuración de Campaña
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Selección de Temporada y Periodo
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                  activeSeason === 'verano'
                    ? 'bg-amber-100 text-amber-900 border border-amber-200'
                    : 'bg-sky-100 text-sky-900 border border-sky-200'
                }`}
              >
                {activeSeason === 'verano' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-600" />
                ) : (
                  <Snowflake className="w-3.5 h-3.5 text-sky-600" />
                )}
                <span>{planningConfig.seasonName}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {activeSeason === 'verano'
                ? 'El pedido calcula exclusivamente las prendas de Verano: Camisa M/C, Blusa M/C, Sweater M/C, Pantalón hombre/mujer y Corbata.'
                : 'El pedido calcula exclusivamente las prendas de Invierno: Camisa M/L, Blusa M/L, Sweater M/L, Polar hombre/mujer, Parka unisex, Pantalón hombre/mujer y Corbata.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Season Toggle: Verano vs Invierno */}
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                id="btn-season-verano"
                onClick={() => handleSeasonToggle('verano')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeSeason === 'verano'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Verano</span>
              </button>
              <button
                type="button"
                id="btn-season-invierno"
                onClick={() => handleSeasonToggle('invierno')}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeSeason === 'invierno'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Snowflake className="w-4 h-4" />
                <span>Invierno</span>
              </button>
            </div>

            {/* Period Dropdown */}
            <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <label htmlFor="select-planning-period" className="text-xs font-bold text-slate-600 pl-1">
                Periodo:
              </label>
              <select
                id="select-planning-period"
                value={planningConfig.seasonName}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 shadow-2xs focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
              >
                <optgroup label="Campañas de Verano">
                  <option value="Verano 2025">Verano 2025</option>
                  <option value="Verano 2026">Verano 2026</option>
                  <option value="Verano 2027">Verano 2027</option>
                  <option value="Verano 2028">Verano 2028</option>
                </optgroup>
                <optgroup label="Campañas de Invierno">
                  <option value="Invierno 2025">Invierno 2025</option>
                  <option value="Invierno 2026">Invierno 2026</option>
                  <option value="Invierno 2027">Invierno 2027</option>
                  <option value="Invierno 2028">Invierno 2028</option>
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Previews of Seasonal Garments */}
        <div className="mt-3 pt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-500">
            Prendas de {activeSeason === 'verano' ? 'Verano' : 'Invierno'} ({seasonalGarments.length} definidas):
          </span>
          {seasonalGarments.map((g) => (
            <span
              key={g.id}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
            >
              <Package className="w-3 h-3 text-slate-400" />
              <span>{g.name}</span>
            </span>
          ))}
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

        {/* Planning Parameters Bar (No temporeros) */}
        <div className="mt-4 pt-1 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          {/* Config 1: Colchón de seguridad (Buffer) */}
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
              +{totalBufferUnits} unidades de contingencia para cambios y rotación
            </span>
          </div>

          {/* Config 2: Fecha corte O.C. */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <label className="block font-semibold text-slate-700 mb-1">Fecha Límite O.C. Proveedor</label>
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

          {/* Config 3: Fecha Entrega Deseada */}
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
            Nómina activa ({employees.length} trab.) + buffer ({totalBufferUnits} u.)
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
            <span className="text-xs text-slate-500">a confeccionar</span>
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
              ${totalNetBudgetCLP.toLocaleString('es-CL')}
            </span>
            <span className="text-xs text-slate-500">CLP</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Aprox. ${(Math.round(totalNetBudgetCLP / 930)).toLocaleString()} USD
          </p>
        </div>
      </div>

      {/* Recharts Chart: Demanda por Prenda */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Demanda de {planningConfig.seasonName} por Prenda
            </h2>
            <p className="text-xs text-slate-500">
              Desglose entre dotación confirmada de nómina y colchón de seguridad (+{planningConfig.bufferPercent}%)
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
              <Bar dataKey="Confirmado" stackId="a" fill="#0f172a" name="Nómina Confirmada" />
              <Bar
                dataKey="BufferSeguridad"
                stackId="a"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                name={`Buffer (+${planningConfig.bufferPercent}%)`}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sizing Matrix Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Matriz Consolidada de Tallas y Pedido ({planningConfig.seasonName})
            </h3>
            <p className="text-xs text-slate-500">
              Mostrando únicamente las {seasonalGarments.length} prendas correspondientes a {activeSeason === 'verano' ? 'Verano' : 'Invierno'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Filtrar Prenda:</span>
            <select
              value={selectedGarmentFilter}
              onChange={(e) => setSelectedGarmentFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
            >
              <option value="todos">Todas las prendas ({seasonalGarments.length})</option>
              {seasonalGarments.map((g) => (
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
                <th className="py-2.5 px-3 text-center">Nómina Confirmada</th>
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
                  <td className="py-2.5 px-3 text-center text-emerald-700 font-semibold">+{item.bufferUnits}</td>
                  <td className="py-2.5 px-3 text-center font-medium text-slate-600">
                    {item.totalToOrder} un.
                  </td>
                  <td className="py-2.5 px-3 text-center font-semibold text-emerald-700 bg-emerald-50/30">
                    {item.inStock || 0} un.
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-amber-50/50">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        (item.netToOrder !== undefined ? item.netToOrder : item.totalToOrder) > 0
                          ? 'bg-amber-100 text-amber-900 font-extrabold'
                          : 'bg-slate-100 text-slate-400 font-normal'
                      }`}
                    >
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
              {filteredPlanItems.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No hay prendas registradas para el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900 text-xs">
              <tr>
                <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider">
                  Total Neto a Comprar ({planningConfig.seasonName}):
                </td>
                <td className="py-3 px-3 text-center text-emerald-700 font-extrabold bg-emerald-100/40">
                  {filteredPlanItems.reduce((a, b) => a + (b.inStock || 0), 0)} u.
                </td>
                <td className="py-3 px-3 text-center font-extrabold text-amber-900 bg-amber-100/60">
                  {filteredPlanItems.reduce(
                    (a, b) => a + (b.netToOrder !== undefined ? b.netToOrder : b.totalToOrder),
                    0
                  )} unidades
                </td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-4 text-right font-extrabold text-slate-900 text-sm font-mono">
                  ${filteredPlanItems.reduce(
                    (a, b) => a + ((b.netToOrder !== undefined ? b.netToOrder : b.totalToOrder) * b.unitCost),
                    0
                  ).toLocaleString('es-CL')} CLP
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
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
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
                  {activeSeason === 'verano' ? (
                    <>
                      <li>Prendas superiores de temporada estival (camisas y blusas M/C) deben certificar factor de protección solar UPF 50+ y tejido respirable.</li>
                      <li>Sweater unisex manga corta con tejido suave y anti-pilling de media estación.</li>
                    </>
                  ) : (
                    <>
                      <li>Prendas de abrigo de invierno (parkas y polares) deben certificar aislamiento térmico para bajas temperaturas.</li>
                      <li>Parka unisex impermeable con costuras termoselladas y capucha desmontable.</li>
                      <li>Camisas y blusas manga larga en popelina 65/35 de alta resistencia.</li>
                    </>
                  )}
                  <li>Pantalones en tela ripstop liviana (65% poliéster / 35% algodón) con triple costura reforzada.</li>
                  <li>Corbata institucional con nudo reforzado y acabado anti-manchas.</li>
                  <li>El proveedor debe garantizar un plazo de recambio de tallas de máximo 5 días hábiles ante descalces.</li>
                </ul>
              </div>

              <div>
                <p className="font-bold text-slate-800 mb-1">
                  Volumen Consolidado ({seasonalGarments.length} prendas de {activeSeason === 'verano' ? 'Verano' : 'Invierno'}):
                </p>
                <div className="space-y-1 text-[11px]">
                  {seasonalGarments.map((g) => {
                    const sum = seasonalPlanItems
                      .filter((p) => p.garmentId === g.id)
                      .reduce((a, b) => a + (b.netToOrder !== undefined ? b.netToOrder : b.totalToOrder), 0);
                    return (
                      <div key={g.id} className="flex justify-between bg-white p-1.5 rounded border border-slate-200">
                        <span className="font-medium text-slate-800">{g.name}</span>
                        <strong className="font-mono text-slate-900">{sum} unidades a licitar</strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <button
                onClick={() => setIsTenderModalOpen(false)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer"
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
