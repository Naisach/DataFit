import React, { useState, useMemo } from 'react';
import { useUniforms } from '../context/UniformsContext';
import { StockMovement } from '../types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Search,
  Download,
  Filter,
  FileText,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  X,
  Plus,
  PackagePlus,
  PackageMinus,
  Layers,
  Sparkles,
} from 'lucide-react';

export const MovementsView: React.FC = () => {
  const { movements, inventory, employees, addStockIngreso, addStockEntrega } = useUniforms();

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'ingreso' | 'entrega' | 'ajuste'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMovement, setSelectedMovement] = useState<StockMovement | null>(null);

  // Quick modals
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isEntregaModalOpen, setIsEntregaModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // KPIs
  const totalIngresadas = useMemo(() => {
    return movements.filter((m) => m.type === 'ingreso').reduce((sum, m) => sum + m.quantity, 0);
  }, [movements]);

  const totalEntregadas = useMemo(() => {
    return movements.filter((m) => m.type === 'entrega').reduce((sum, m) => sum + m.quantity, 0);
  }, [movements]);

  const filteredMovements = useMemo(() => {
    return movements.filter((mov) => {
      const matchesTab = activeTab === 'all' || mov.type === activeTab;
      const matchesSearch =
        mov.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.garmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.party.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.documentRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mov.responsible.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [movements, activeTab, searchTerm]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Código', 'Fecha y Hora', 'Tipo', 'Prenda / Artículo', 'Categoría', 'Talla', 'Cantidad', 'Contraparte (Proveedor / Trabajador)', 'Documento de Respaldo', 'Responsable Bodega', 'Observaciones'];
    const rows = filteredMovements.map((m) => [
      m.code,
      m.date,
      m.type.toUpperCase(),
      `"${m.garmentName}"`,
      m.category,
      m.size,
      m.type === 'entrega' ? `-${m.quantity}` : `+${m.quantity}`,
      `"${m.party}"`,
      `"${m.documentRef}"`,
      `"${m.responsible}"`,
      `"${m.notes || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Libro_Movimientos_Bodega_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Libro de movimientos exportado en CSV.');
  };

  // Forms states
  const [ingresoForm, setIngresoForm] = useState({
    itemId: inventory[0]?.id || '',
    quantity: 20,
    documentRef: `Factura F-${Math.floor(2000 + Math.random() * 8000)}`,
    supplier: 'Proveedor Textil Austral S.A.',
    responsible: 'Jorge Henríquez (Encargado Bodega)',
    notes: 'Recepción conforme de pedido',
  });

  const [entregaForm, setEntregaForm] = useState({
    itemId: inventory[0]?.id || '',
    employeeId: employees[0]?.id || '',
    quantity: 1,
    documentRef: `Acta-ENT-${Math.floor(100 + Math.random() * 900)}`,
    responsible: 'Jorge Henríquez (Encargado Bodega)',
    notes: 'Entrega directa de uniforme en terreno',
  });

  const handleSubmitIngreso = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find((i) => i.id === ingresoForm.itemId);
    if (!item) return;

    addStockIngreso({
      itemId: item.id,
      garmentName: item.name,
      category: item.category,
      size: item.size,
      quantity: Number(ingresoForm.quantity),
      documentRef: ingresoForm.documentRef,
      supplier: ingresoForm.supplier,
      responsible: ingresoForm.responsible,
      notes: ingresoForm.notes,
    });
    setIsIngresoModalOpen(false);
    showNotification(`Ingreso de ${ingresoForm.quantity} unidades registrado correctamente.`);
  };

  const handleSubmitEntrega = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find((i) => i.id === entregaForm.itemId);
    if (!item) return;

    const emp = employees.find((e) => e.id === entregaForm.employeeId);
    const empName = emp ? `${emp.fullName} (RUT ${emp.rut})` : 'Colaborador General';

    addStockEntrega({
      itemId: item.id,
      garmentName: item.name,
      category: item.category,
      size: item.size,
      quantity: Number(entregaForm.quantity),
      documentRef: entregaForm.documentRef,
      employeeId: emp?.id,
      employeeName: empName,
      responsible: entregaForm.responsible,
      notes: entregaForm.notes,
      signature: 'Firma digital registrada conforme',
    });
    setIsEntregaModalOpen(false);
    showNotification(`Entrega a ${emp ? emp.fullName : 'trabajador'} registrada y descontada del stock.`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-amber-500/40 text-xs animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Counters: Balance de Ingresos y Salidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Entradas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Ingresos a Bodega
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-600 font-display">
              +{totalIngresadas.toLocaleString('es-CL')}
            </span>
            <span className="text-xs font-medium text-slate-500">unidades recibidas</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Compras de proveedores y reposiciones
          </p>
        </div>

        {/* Salidas */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Entregas a Personal
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {totalEntregadas.toLocaleString('es-CL')}
            </span>
            <span className="text-xs font-medium text-slate-500">unidades despachadas</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Dotaciones y EPP con actas de entrega
          </p>
        </div>

        {/* Total Operaciones */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Movimientos Registrados
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 font-display">
              {movements.length}
            </span>
            <span className="text-xs font-medium text-slate-500">transacciones</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Trazabilidad completa con documento y responsable
          </p>
        </div>
      </div>

      {/* Control Bar: Title, Action Buttons, Tab Selection & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 font-display flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-600" />
              <span>Registro de Ingresos y Entregas</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Historial auditable de todo lo que ingresa a bodega y todo lo que se entrega a los trabajadores
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsIngresoModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <PackagePlus className="w-4 h-4" />
              <span>+ Nuevo Ingreso</span>
            </button>

            <button
              onClick={() => setIsEntregaModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <PackageMinus className="w-4 h-4" />
              <span>+ Nueva Entrega</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Exportar Libro (CSV)</span>
            </button>
          </div>
        </div>

        {/* Tab Selection & Search */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos ({movements.length})
            </button>

            <button
              onClick={() => setActiveTab('ingreso')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'ingreso'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              <span>📥 Ingresos ({movements.filter((m) => m.type === 'ingreso').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('entrega')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'entrega'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>📤 Entregas ({movements.filter((m) => m.type === 'entrega').length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ajuste')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'ajuste'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Ajustes ({movements.filter((m) => m.type === 'ajuste').length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por código, documento, trabajador o proveedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Código</th>
                <th className="py-3.5 px-4">Fecha y Hora</th>
                <th className="py-3.5 px-3 text-center">Tipo</th>
                <th className="py-3.5 px-4">Prenda / Artículo</th>
                <th className="py-3.5 px-3 text-center">Talla</th>
                <th className="py-3.5 px-4 text-center">Cantidad</th>
                <th className="py-3.5 px-4">Contraparte (Proveedor / Trabajador)</th>
                <th className="py-3.5 px-4">Documento de Respaldo</th>
                <th className="py-3.5 px-4">Responsable Bodega</th>
                <th className="py-3.5 px-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.map((mov) => {
                const isIngreso = mov.type === 'ingreso';
                const isEntrega = mov.type === 'entrega';
                const isAjuste = mov.type === 'ajuste';

                return (
                  <tr key={mov.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Código */}
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-[11px]">
                      {mov.code}
                    </td>

                    {/* Fecha */}
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{mov.date}</span>
                      </div>
                    </td>

                    {/* Tipo Badge */}
                    <td className="py-3 px-3 text-center">
                      {isIngreso && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          <ArrowDownLeft className="w-3 h-3" />
                          <span>INGRESO</span>
                        </span>
                      )}
                      {isEntrega && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                          <ArrowUpRight className="w-3 h-3" />
                          <span>ENTREGA</span>
                        </span>
                      )}
                      {isAjuste && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold">
                          <SlidersHorizontal className="w-3 h-3" />
                          <span>AJUSTE</span>
                        </span>
                      )}
                    </td>

                    {/* Prenda */}
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {mov.garmentName}
                    </td>

                    {/* Talla */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-900 text-amber-300 font-bold font-mono text-xs">
                        {mov.size}
                      </span>
                    </td>

                    {/* Cantidad con signo */}
                    <td className="py-3 px-4 text-center font-mono font-extrabold text-sm">
                      {isIngreso && (
                        <span className="text-emerald-600">+{mov.quantity} u.</span>
                      )}
                      {isEntrega && (
                        <span className="text-blue-700">-{mov.quantity} u.</span>
                      )}
                      {isAjuste && (
                        <span className="text-slate-700">{mov.quantity} u.</span>
                      )}
                    </td>

                    {/* Contraparte */}
                    <td className="py-3 px-4 text-slate-800">
                      <div className="flex items-center gap-1.5 font-medium">
                        {isIngreso ? (
                          <Building2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        )}
                        <span className="truncate max-w-[200px]" title={mov.party}>
                          {mov.party}
                        </span>
                      </div>
                    </td>

                    {/* Documento */}
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      {mov.documentRef}
                    </td>

                    {/* Responsable */}
                    <td className="py-3 px-4 text-slate-600">
                      {mov.responsible}
                    </td>

                    {/* Ver detalle */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => setSelectedMovement(mov)}
                        className="text-amber-700 font-semibold hover:underline text-xs"
                      >
                        Ver Ficha
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredMovements.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No hay movimientos registrados en este filtro</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Registra un nuevo ingreso o una entrega para generar trazabilidad
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL: FICHA DE MOVIMIENTO AUDITABLE */}
      {selectedMovement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    selectedMovement.type === 'ingreso'
                      ? 'bg-emerald-100 text-emerald-700'
                      : selectedMovement.type === 'entrega'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {selectedMovement.type === 'ingreso' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : selectedMovement.type === 'entrega' ? (
                    <ArrowUpRight className="w-5 h-5" />
                  ) : (
                    <SlidersHorizontal className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Comprobante de Movimiento: {selectedMovement.code}
                  </h3>
                  <p className="text-xs text-slate-500">Registro oficial de bodega y control de existencias</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMovement(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tipo de Operación:</span>
                  <strong className="text-slate-900 text-sm uppercase">{selectedMovement.type}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Fecha y Hora:</span>
                  <strong className="text-slate-900 text-sm">{selectedMovement.date}</strong>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Prenda / Artículo:</span>
                <p className="font-bold text-slate-900 text-sm">{selectedMovement.garmentName}</p>
                <div className="flex items-center gap-3 mt-1 text-slate-600 font-medium">
                  <span>Categoría: <strong className="capitalize">{selectedMovement.category}</strong></span>
                  <span>•</span>
                  <span>Talla: <strong>{selectedMovement.size}</strong></span>
                  <span>•</span>
                  <span>Cantidad: <strong className="text-slate-900">{selectedMovement.quantity} unidades</strong></span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">
                  {selectedMovement.type === 'ingreso' ? 'Proveedor / Origen:' : 'Trabajador Receptor / Destino:'}
                </span>
                <p className="font-semibold text-slate-900">{selectedMovement.party}</p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Documento de Respaldo:</span>
                <p className="font-mono text-slate-800 bg-slate-100 px-2 py-1 rounded-md inline-block">
                  {selectedMovement.documentRef}
                </p>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Responsable de Bodega:</span>
                <p className="font-semibold text-slate-800">{selectedMovement.responsible}</p>
              </div>

              {selectedMovement.notes && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Observaciones:</span>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    {selectedMovement.notes}
                  </p>
                </div>
              )}

              {selectedMovement.signature && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{selectedMovement.signature}</span>
                </div>
              )}
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedMovement(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK INGRESO MODAL */}
      {isIngresoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-emerald-600" />
                <span>+ Registrar Nuevo Ingreso a Bodega</span>
              </h3>
              <button onClick={() => setIsIngresoModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitIngreso} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prenda / Talla</label>
                <select
                  required
                  value={ingresoForm.itemId}
                  onChange={(e) => setIngresoForm({ ...ingresoForm, itemId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.name} • Talla: {inv.size} (Stock actual: {inv.currentStock} u.)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cantidad a Ingresar</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={ingresoForm.quantity}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-center text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">N° Guía / Factura</label>
                  <input
                    type="text"
                    required
                    value={ingresoForm.documentRef}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, documentRef: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proveedor</label>
                <input
                  type="text"
                  required
                  value={ingresoForm.supplier}
                  onChange={(e) => setIngresoForm({ ...ingresoForm, supplier: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsable de Recepción</label>
                <input
                  type="text"
                  required
                  value={ingresoForm.responsible}
                  onChange={(e) => setIngresoForm({ ...ingresoForm, responsible: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={ingresoForm.notes}
                  onChange={(e) => setIngresoForm({ ...ingresoForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsIngresoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs"
                >
                  Guardar Ingreso (+ Stock)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK ENTREGA MODAL */}
      {isEntregaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <PackageMinus className="w-5 h-5 text-amber-500" />
                <span>+ Registrar Nueva Entrega a Trabajador</span>
              </h3>
              <button onClick={() => setIsEntregaModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntrega} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prenda / Talla</label>
                <select
                  required
                  value={entregaForm.itemId}
                  onChange={(e) => setEntregaForm({ ...entregaForm, itemId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  {inventory.map((inv) => (
                    <option key={inv.id} value={inv.id} disabled={inv.currentStock <= 0}>
                      {inv.name} • Talla: {inv.size} ({inv.currentStock > 0 ? `${inv.currentStock} disp.` : 'AGOTADO'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trabajador Receptor</label>
                <select
                  required
                  value={entregaForm.employeeId}
                  onChange={(e) => setEntregaForm({ ...entregaForm, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} • RUT: {emp.rut}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cantidad a Entregar</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={entregaForm.quantity}
                    onChange={(e) => setEntregaForm({ ...entregaForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold text-center text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">N° Acta / Comprobante</label>
                  <input
                    type="text"
                    required
                    value={entregaForm.documentRef}
                    onChange={(e) => setEntregaForm({ ...entregaForm, documentRef: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Responsable de Entrega</label>
                <input
                  type="text"
                  required
                  value={entregaForm.responsible}
                  onChange={(e) => setEntregaForm({ ...entregaForm, responsible: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observaciones</label>
                <input
                  type="text"
                  value={entregaForm.notes}
                  onChange={(e) => setEntregaForm({ ...entregaForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEntregaModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold transition-all shadow-xs"
                >
                  Confirmar Entrega (- Stock)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
