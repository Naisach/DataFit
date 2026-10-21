import React, { useState, useMemo } from 'react';
import { InventoryItem, Employee } from '../types';
import {
  Boxes,
  Users,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Shirt,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';

interface InventoryDashboardChartsProps {
  inventory: InventoryItem[];
  employees: Employee[];
  totalStockUnits: number;
}

export const InventoryDashboardCharts: React.FC<InventoryDashboardChartsProps> = ({
  inventory,
  employees,
  totalStockUnits,
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [sizeCategory, setSizeCategory] = useState<'superiores' | 'pantalones'>('superiores');

  // 1. Top Garments by Stock
  const topGarmentsData = useMemo(() => {
    const garmentMap = new Map<string, number>();

    for (const item of inventory) {
      const name = (item.name || '').trim();
      if (!name) continue;
      garmentMap.set(name, (garmentMap.get(name) || 0) + (item.currentStock || 0));
    }

    return Array.from(garmentMap.entries())
      .map(([name, stock]) => {
        // Shorter label for clean display on charts
        let shortName = name;
        if (name.length > 20) {
          shortName = name.replace('hombre', 'H').replace('mujer', 'M').replace('unisex', 'U');
        }
        const percentage = totalStockUnits > 0 ? ((stock / totalStockUnits) * 100).toFixed(1) : '0';
        return {
          name,
          shortName,
          stock,
          percentage,
        };
      })
      .sort((a, b) => b.stock - a.stock)
      .slice(0, 7);
  }, [inventory, totalStockUnits]);

  // 2. Most Repeated Sizes in Workers
  const topSizesData = useMemo(() => {
    const counts: Record<string, number> = {};

    if (sizeCategory === 'superiores') {
      for (const emp of employees) {
        const s = (emp.sizes?.camisa || emp.sizes?.blusa || emp.sizes?.shirt || '').trim().toUpperCase();
        if (s && s !== 'NO APLICA' && s !== '-' && s !== 'SIN TALLA') {
          counts[s] = (counts[s] || 0) + 1;
        }
      }
    } else {
      for (const emp of employees) {
        const p = (emp.sizes?.pants || (emp.sizes as any)?.pantalon || '').trim();
        if (p && p !== 'NO APLICA' && p !== '-' && p !== 'SIN TALLA') {
          counts[p] = (counts[p] || 0) + 1;
        }
      }
    }

    const totalValid = Object.values(counts).reduce((a, b) => a + b, 0);

    return Object.entries(counts)
      .map(([size, count]) => ({
        size,
        count,
        percentage: totalValid > 0 ? ((count / totalValid) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [employees, sizeCategory]);

  const topGarmentLeader = topGarmentsData[0];
  const topSizeLeader = topSizesData[0];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden transition-all duration-200">
      {/* Header bar with toggle */}
      <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-slate-50 via-white to-amber-50/30 border-b border-slate-200/80 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-900 text-amber-400 flex items-center justify-center shadow-2xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">
                Dashboard de Existencias y Tallas
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100/80 text-amber-900 border border-amber-200/60">
                Analítica en tiempo real
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Prendas de mayor stock en bodega y distribución de tallas de {employees.length} trabajadores
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          title={isOpen ? 'Ocultar gráficos' : 'Mostrar gráficos'}
        >
          <span>{isOpen ? 'Ocultar' : 'Mostrar'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Charts Grid */}
      {isOpen && (
        <div className="p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Top Garments by Stock */}
          <div className="flex flex-col bg-slate-50/60 rounded-xl p-4 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Prendas con Mayor Stock Físico
                </h3>
              </div>
              {topGarmentLeader && (
                <div className="text-[11px] font-medium text-slate-600 bg-white px-2.5 py-0.5 rounded-md border border-slate-200 shadow-2xs self-start sm:self-auto">
                  Mayor volumen: <span className="font-bold text-slate-900">{topGarmentLeader.name}</span> ({topGarmentLeader.stock} u.)
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mb-2">
              Top 7 prendas con mayor cantidad de unidades disponibles en bodega
            </p>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topGarmentsData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 500 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    width={125}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg border border-slate-700">
                            <p className="font-bold text-amber-400 mb-1">{data.name}</p>
                            <p className="text-slate-200">
                              Stock en bodega: <span className="font-mono font-bold text-white">{data.stock}</span> unidades
                            </p>
                            <p className="text-slate-400 text-[10px] mt-0.5">
                              Representa el {data.percentage}% del inventario total
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="stock" radius={[0, 4, 4, 0]}>
                    {topGarmentsData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? '#f59e0b' // Gold for leader
                            : index === 1
                            ? '#0f172a' // Dark slate for 2nd
                            : index < 4
                            ? '#334155' // Slate
                            : '#64748b' // Muted slate
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Most Repeated Sizes in Workers */}
          <div className="flex flex-col bg-slate-50/60 rounded-xl p-4 border border-slate-200/80">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Tallas Más Repetidas en Trabajadores
                </h3>
              </div>

              {/* Category selector */}
              <div className="flex items-center bg-white p-0.5 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-auto">
                <button
                  onClick={() => setSizeCategory('superiores')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    sizeCategory === 'superiores'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Superiores (Camisas/Poleras)
                </button>
                <button
                  onClick={() => setSizeCategory('pantalones')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    sizeCategory === 'pantalones'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Pantalones
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
              <span>
                Frecuencia de tallas registradas en la nómina activa de personal
              </span>
              {topSizeLeader && (
                <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  Talla más demandada: <strong>{topSizeLeader.size}</strong> ({topSizeLeader.count} trab.)
                </span>
              )}
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topSizesData}
                  margin={{ top: 10, right: 15, left: -10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="size"
                    tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg border border-slate-700">
                            <p className="font-bold text-amber-400 mb-1">
                              Talla {data.size} ({sizeCategory === 'superiores' ? 'Prenda Superior' : 'Pantalón'})
                            </p>
                            <p className="text-slate-200">
                              Trabajadores: <span className="font-mono font-bold text-white">{data.count}</span> personas
                            </p>
                            <p className="text-slate-400 text-[10px] mt-0.5">
                              {data.percentage}% de la categoría analizada
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {topSizesData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          index === 0
                            ? '#2563eb' // Blue for top size
                            : index === 1
                            ? '#3b82f6'
                            : index < 4
                            ? '#60a5fa'
                            : '#93c5fd'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
