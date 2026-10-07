import React from 'react';
import { useUniforms } from '../context/UniformsContext';
import {
  Users,
  Sun,
  ShieldCheck,
  PackageCheck,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

export const DashboardView: React.FC = () => {
  const { employees, deliveries, totalBudgetCLP, planningConfig, setActiveView } = useUniforms();

  const totalEmployees = employees.length;
  const permanentCount = employees.filter((e) => e.type === 'permanente').length;
  const seasonalRegistered = employees.filter((e) => e.type === 'estival').length;
  const seasonalProjectedTotal = planningConfig.projectedSummerWorkers;
  const completedSurveys = employees.filter((e) => e.surveyStatus === 'completado').length;
  const pendingSurveys = totalEmployees - completedSurveys;
  const surveyPercent = totalEmployees > 0 ? Math.round((completedSurveys / totalEmployees) * 100) : 0;

  const deliveredCount = deliveries.filter((d) => d.status === 'entregada').length;
  const pendingDeliveryCount = employees.filter((e) => e.deliveryStatus === 'sin_entregar').length;
  const sizeChangeRequested = deliveries.filter((d) => d.status === 'requiere_cambio').length;

  // Size distribution breakdown for shirts
  const shirtSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const shirtData = shirtSizes.map((sz) => {
    const permCount = employees.filter((e) => e.type === 'permanente' && e.sizes.shirt === sz).length;
    const seasCount = employees.filter((e) => e.type === 'estival' && e.sizes.shirt === sz).length;
    return {
      size: sz,
      Permanente: permCount,
      Estival: seasCount,
      Total: permCount + seasCount,
    };
  });

  // Workforce composition pie data
  const pieData = [
    { name: 'Planta Permanente', value: permanentCount, color: '#0f172a' },
    { name: 'Estival Registrados', value: seasonalRegistered, color: '#d97706' },
    { name: 'Estival Por Contratar (Proyectado)', value: Math.max(0, seasonalProjectedTotal - seasonalRegistered), color: '#f59e0b' },
  ];

  // Footwear distribution
  const shoeSizes = ['37', '38', '39', '40', '41', '42', '43', '44', '45'];
  const shoeData = shoeSizes.map((sz) => ({
    size: sz,
    cantidad: employees.filter((e) => e.sizes.footwear === sz).length,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Dotación Total */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Dotación Registrada</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalEmployees}</span>
            <span className="text-xs text-slate-500">colaboradores</span>
          </div>
          <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-slate-800" />
            <span>{permanentCount} Planta fija</span>
            <span className="text-slate-300">•</span>
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            <span>{seasonalRegistered} Temporada</span>
          </div>
        </div>

        {/* Card 2: Cobertura de Tallas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recolección de Tallas</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{surveyPercent}%</span>
            <span className="text-xs text-slate-500 font-medium">({completedSurveys}/{totalEmployees})</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${surveyPercent}%` }}
              />
            </div>
            {pendingSurveys > 0 && (
              <span className="text-[11px] font-semibold text-amber-600 shrink-0">
                {pendingSurveys} pendientes
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Temporada Estival Proyectada */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Demanda Estival Total</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600">{seasonalProjectedTotal}</span>
            <span className="text-xs text-slate-500">temporeros estivales</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {seasonalRegistered} fichados + {Math.max(0, seasonalProjectedTotal - seasonalRegistered)} por ingresar
          </p>
        </div>

        {/* Card 4: Entregas & Incidencias */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado de Entregas</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <PackageCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{deliveredCount}</span>
            <span className="text-xs text-emerald-600 font-medium">entregados</span>
          </div>
          <div className="mt-2 text-xs flex items-center justify-between text-slate-600">
            <span>{pendingDeliveryCount} pendientes</span>
            {sizeChangeRequested > 0 && (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {sizeChangeRequested} cambio de talla
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Analytical Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Curva de Tallas Prendas Superiores (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Curva de Tallas: Prendas Superiores (Poleras UV / Camisas)
              </h2>
              <p className="text-xs text-slate-500">
                Distribución real por talla discriminada entre dotación fija y trabajadores de temporada
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-slate-900" />
                <span className="text-slate-600">Permanente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-amber-500" />
                <span className="text-slate-600">Estival</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shirtData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="size" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="Permanente" stackId="a" fill="#0f172a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Estival" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 p-3 bg-slate-50 rounded-lg text-xs text-slate-600 flex items-center justify-between">
            <span className="font-medium text-slate-700">
              💡 Concentración principal en tallas <strong>M</strong> y <strong>L</strong> (60% de la dotación).
            </span>
            <button
              onClick={() => setActiveView('procurement')}
              className="text-amber-700 font-semibold hover:underline flex items-center gap-1"
            >
              Ver matriz completa <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Chart 2: Composición de Dotación y Proyección (1 col) */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Composición de Dotación</h2>
            <p className="text-xs text-slate-500 mb-4">
              Balance entre planta y contratación estival proyectada
            </p>

            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2">
              {pieData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 truncate max-w-[170px]">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.value} pers.</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4">
            <button
              onClick={() => setActiveView('employees')}
              className="w-full text-center text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 py-2 rounded-lg transition-colors"
            >
              Administrar Nómina de Colaboradores
            </button>
          </div>
        </div>
      </div>

      {/* Operational Actions & Critical Alerts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pending Size Surveys Notice */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Encuestas de Tallas Pendientes</h3>
                <p className="text-xs text-slate-500">Colaboradores sin confirmar medidas corporales</p>
              </div>
            </div>
            <button
              onClick={() => setActiveView('employees')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/60"
            >
              Ver Nómina
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {employees
              .filter((e) => e.surveyStatus === 'pendiente')
              .slice(0, 4)
              .map((emp) => (
                <div key={emp.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{emp.fullName}</span>
                    <p className="text-[11px] text-slate-500">
                      {emp.department} • <span className="uppercase text-amber-700 font-medium">{emp.type}</span>
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-medium">
                    Falta calzado/talla
                  </span>
                </div>
              ))}
            {employees.filter((e) => e.surveyStatus === 'pendiente').length === 0 && (
              <div className="py-6 text-center text-xs text-slate-500">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                Todas las encuestas registradas están completadas al 100%.
              </div>
            )}
          </div>
        </div>

        {/* Quick Procurement Plan Snapshot */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Kits de Temporada Estival</h3>
                <p className="text-xs text-slate-500">Prendas obligatorias y especificaciones de protección UV</p>
              </div>
            </div>
            <button
              onClick={() => setActiveView('procurement')}
              className="text-xs font-semibold text-slate-900 hover:text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md"
            >
              Ver Licitación
            </button>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/60 flex items-center justify-between">
              <div>
                <span className="font-semibold text-amber-950">Polera Dry-Fit Protección Solar UV+50</span>
                <p className="text-[11px] text-amber-800">2 unidades por temporero • Confección transpirable</p>
              </div>
              <span className="text-amber-900 font-bold bg-white px-2 py-1 rounded shadow-2xs">
                Lead Time: 35 d
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Pantalón Cargo Ripstop Liviano</span>
                <p className="text-[11px] text-slate-500">2 unidades por temporero • Anti-desgarro para faena</p>
              </div>
              <span className="text-slate-800 font-bold bg-white px-2 py-1 rounded border border-slate-200">
                Lead Time: 45 d
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <span className="font-semibold text-slate-800">Jockey Legionario con Cubrenuca</span>
                <p className="text-[11px] text-slate-500">Obligatorio por ley de radiación UV en terreno</p>
              </div>
              <span className="text-slate-800 font-bold bg-white px-2 py-1 rounded border border-slate-200">
                Lead Time: 20 d
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
