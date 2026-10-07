import React, { useState, useMemo } from 'react';
import { useUniforms } from '../context/UniformsContext';
import { InventoryItem, MatrixRow } from '../types';
import { BulkImportModal } from './BulkImportModal';
import { SIZE_COLUMNS } from '../services/csvParserService';
import {
  Boxes,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  Search,
  Download,
  Plus,
  Minus,
  CheckCircle2,
  X,
  MapPin,
  TrendingDown,
  Layers,
  DollarSign,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Upload,
  Table,
  LayoutGrid,
  Building2,
  Archive,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    inventory,
    inventoryMatrix,
    totalStockUnits,
    totalStockValuation,
    lowStockCount,
    addStockIngreso,
    addStockEntrega,
    adjustStock,
    updateInventoryItem,
    employees,
    setActiveView,
  } = useUniforms();

  // View Mode: Matrix view (JAC/BBB spreadsheet) vs Itemized detailed view
  const [viewMode, setViewMode] = useState<'matrix' | 'items'>('matrix');

  // Season selector: 'all' (shows all 3 tables) or specific season ('2025 verano', '2025 invierno', '2026 invierno')
  const [selectedSeason, setSelectedSeason] = useState<'all' | '2025 verano' | '2025 invierno' | '2026 invierno'>('all');
  const [itemSeasonFilter, setItemSeasonFilter] = useState<string>('all');

  // Search & Filters for Matrix
  const [matrixSearch, setMatrixSearch] = useState('');
  const [matrixCompanyFilter, setMatrixCompanyFilter] = useState<'all' | 'JAC' | 'BBB' | 'General'>('all');
  const [matrixStorageFilter, setMatrixStorageFilter] = useState<'all' | 'Caja' | 'Repisa'>('all');

  // Search & Filters for Items
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modals
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isEntregaModalOpen, setIsEntregaModalOpen] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Quick Notification
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Helper function to resolve row season
  const getRowSeason = (row: MatrixRow): string => {
    if (row.season) return row.season.toLowerCase();
    const gLow = row.garmentName.toLowerCase();
    if (gLow.includes('m/c')) return '2025 verano';
    if (gLow.includes('m/l') || gLow.includes('polar') || gLow.includes('parka')) return '2026 invierno';
    return '2026 invierno';
  };

  // Filtered Matrix Rows (global query and company/storage filter applied)
  const filteredMatrix = useMemo(() => {
    return inventoryMatrix.filter((row) => {
      const q = matrixSearch.toLowerCase();
      const matchesSearch =
        row.garmentName.toLowerCase().includes(q) ||
        row.company.toLowerCase().includes(q) ||
        row.storageType.toLowerCase().includes(q);

      const matchesCompany =
        matrixCompanyFilter === 'all' ||
        (matrixCompanyFilter === 'JAC' && row.company === 'JAC') ||
        (matrixCompanyFilter === 'BBB' && row.company === 'BBB') ||
        (matrixCompanyFilter === 'General' && (!row.company || row.company === 'General'));

      const matchesStorage =
        matrixStorageFilter === 'all' ||
        row.storageType.toLowerCase() === matrixStorageFilter.toLowerCase();

      return matchesSearch && matchesCompany && matchesStorage;
    });
  }, [inventoryMatrix, matrixSearch, matrixCompanyFilter, matrixStorageFilter]);

  // Rows partitioned by season
  const matrix2025Verano = useMemo(() => {
    return filteredMatrix.filter((r) => getRowSeason(r) === '2025 verano');
  }, [filteredMatrix]);

  const matrix2025Invierno = useMemo(() => {
    return filteredMatrix.filter((r) => getRowSeason(r) === '2025 invierno');
  }, [filteredMatrix]);

  const matrix2026Invierno = useMemo(() => {
    return filteredMatrix.filter((r) => getRowSeason(r) === '2026 invierno');
  }, [filteredMatrix]);

  // Season Stats
  const calculateSeasonStats = (rows: MatrixRow[]) => {
    let jac = 0;
    let bbb = 0;
    let general = 0;
    let total = 0;
    rows.forEach((r) => {
      total += r.total;
      if (r.company === 'JAC') jac += r.total;
      else if (r.company === 'BBB') bbb += r.total;
      else general += r.total;
    });
    return { total, jac, bbb, general, count: rows.length };
  };

  const stats2025Verano = useMemo(() => {
    return calculateSeasonStats(inventoryMatrix.filter((r) => getRowSeason(r) === '2025 verano'));
  }, [inventoryMatrix]);

  const stats2025Invierno = useMemo(() => {
    return calculateSeasonStats(inventoryMatrix.filter((r) => getRowSeason(r) === '2025 invierno'));
  }, [inventoryMatrix]);

  const stats2026Invierno = useMemo(() => {
    return calculateSeasonStats(inventoryMatrix.filter((r) => getRowSeason(r) === '2026 invierno'));
  }, [inventoryMatrix]);

  // Overall Matrix Totals
  const matrixStats = useMemo(() => {
    let jacTotal = 0;
    let bbbTotal = 0;
    let generalTotal = 0;
    let grandTotal = 0;

    inventoryMatrix.forEach((r) => {
      grandTotal += r.total;
      if (r.company === 'JAC') jacTotal += r.total;
      else if (r.company === 'BBB') bbbTotal += r.total;
      else generalTotal += r.total;
    });

    return { jacTotal, bbbTotal, generalTotal, grandTotal };
  }, [inventoryMatrix]);

  // Filtered Detailed Items
  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus === 'low') {
        matchesStatus = item.currentStock <= item.minStock && item.currentStock > 0;
      } else if (selectedStatus === 'out') {
        matchesStatus = item.currentStock === 0;
      } else if (selectedStatus === 'ok') {
        matchesStatus = item.currentStock > item.minStock;
      }

      let matchesSeason = true;
      if (itemSeasonFilter !== 'all') {
        const itemSeason = (item.season || '').toLowerCase();
        matchesSeason = itemSeason === itemSeasonFilter.toLowerCase();
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesSeason;
    });
  }, [inventory, searchTerm, selectedCategory, selectedStatus, itemSeasonFilter]);

  // Export Matrix CSV (supports specific season or all)
  const handleExportMatrixCSV = (seasonFilter?: string) => {
    const rowsToExport = seasonFilter
      ? filteredMatrix.filter((r) => getRowSeason(r) === seasonFilter)
      : filteredMatrix;

    const headers = ['TEMPORADA', 'EMP', 'Ubicación', 'PRENDA', ...SIZE_COLUMNS, 'Total'];
    const rows = rowsToExport.map((r) => {
      const sizeValues = SIZE_COLUMNS.map((col) => {
        const val = r.sizes[col];
        return val !== undefined && val > 0 ? String(val) : ' - ';
      });
      const rowSeasonLabel = getRowSeason(r).toUpperCase();
      return [
        `"${rowSeasonLabel}"`,
        r.company === 'General' ? '' : r.company,
        r.storageType,
        `"${r.garmentName}"`,
        ...sizeValues,
        r.total,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    const seasonSuffix = seasonFilter ? `_${seasonFilter.replace(/\s+/g, '_').toUpperCase()}` : '_TODAS_TEMPORADAS';
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Matriz_Inventario${seasonSuffix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification(`Matriz de inventario (${seasonFilter || 'todas las temporadas'}) descargada con éxito.`);
  };

  // Export Detailed Items CSV
  const handleExportItemsCSV = () => {
    const headers = [
      'Código',
      'Prenda / Artículo',
      'Categoría',
      'Talla',
      'Stock Actual',
      'Stock Mínimo',
      'Costo Unitario CLP',
      'Valor Total CLP',
      'Ubicación',
      'Última Actualización',
    ];
    const rows = filteredInventory.map((i) => [
      i.code,
      `"${i.name}"`,
      i.category,
      i.size,
      i.currentStock,
      i.minStock,
      i.unitCostCLP,
      i.currentStock * i.unitCostCLP,
      `"${i.location}"`,
      i.lastUpdated,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inventario_Detallado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification('Reporte detallado de inventario descargado con éxito.');
  };

  // Forms states
  const [ingresoForm, setIngresoForm] = useState({
    itemId: '',
    garmentName: 'Camisa hombre M/C',
    category: 'superior' as 'superior' | 'inferior' | 'calzado' | 'abrigo' | 'proteccion',
    size: 'L',
    quantity: 20,
    documentRef: '',
    supplier: 'Proveedor Textil Central S.A.',
    responsible: 'Encargado de Bodega',
    unitCostCLP: 18500,
    location: 'Bodega Central - Caja',
    notes: '',
  });

  const [entregaForm, setEntregaForm] = useState({
    itemId: '',
    employeeId: employees[0]?.id || '',
    quantity: 1,
    documentRef: `Acta-Entrega-${Math.floor(100 + Math.random() * 900)}`,
    responsible: 'Encargado de Bodega',
    notes: 'Entrega de dotación en terminal',
  });

  const [adjustQuantity, setAdjustQuantity] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Conteo físico y cuadratura de bodega');
  const [adjustResponsible, setAdjustResponsible] = useState<string>('Auditor de Bodega');

  const handleOpenIngresoForSpecificItem = (item: InventoryItem) => {
    setIngresoForm({
      itemId: item.id,
      garmentName: item.name,
      category: item.category,
      size: item.size,
      quantity: 10,
      documentRef: `Guía-Recepción-${Math.floor(1000 + Math.random() * 9000)}`,
      supplier: 'Proveedor Textil Central S.A.',
      responsible: 'Encargado de Bodega',
      unitCostCLP: item.unitCostCLP,
      location: item.location,
      notes: 'Reposición de stock en bodega',
    });
    setIsIngresoModalOpen(true);
  };

  const handleOpenEntregaForSpecificItem = (item: InventoryItem) => {
    setEntregaForm({
      itemId: item.id,
      employeeId: employees[0]?.id || '',
      quantity: 1,
      documentRef: `Acta-Entrega-${Math.floor(100 + Math.random() * 900)}`,
      responsible: 'Encargado de Bodega',
      notes: `Entrega de ${item.name} Talla ${item.size}`,
    });
    setIsEntregaModalOpen(true);
  };

  const handleOpenAdjust = (item: InventoryItem) => {
    setAdjustingItem(item);
    setAdjustQuantity(item.currentStock);
    setAdjustReason('Cuadratura y toma de inventario físico');
  };

  const handleSubmitIngreso = (e: React.FormEvent) => {
    e.preventDefault();
    if (ingresoForm.quantity <= 0) return;

    addStockIngreso({
      itemId: ingresoForm.itemId || undefined,
      garmentName: ingresoForm.garmentName,
      category: ingresoForm.category,
      size: ingresoForm.size,
      quantity: Number(ingresoForm.quantity),
      documentRef: ingresoForm.documentRef || 'Guía de Despacho s/n',
      supplier: ingresoForm.supplier,
      responsible: ingresoForm.responsible,
      unitCostCLP: Number(ingresoForm.unitCostCLP),
      location: ingresoForm.location,
      notes: ingresoForm.notes,
    });

    setIsIngresoModalOpen(false);
    showNotification(`Ingreso registrado: +${ingresoForm.quantity} unidades sumadas al inventario.`);
  };

  const handleSubmitEntrega = (e: React.FormEvent) => {
    e.preventDefault();
    const item = inventory.find((i) => i.id === entregaForm.itemId);
    if (!item) return;

    const emp = employees.find((e) => e.id === entregaForm.employeeId);
    const empName = emp ? `${emp.fullName} (#${emp.identifier || emp.rut})` : 'Funcionario';

    addStockEntrega({
      itemId: item.id,
      garmentName: item.name,
      category: item.category,
      size: item.size,
      quantity: Number(entregaForm.quantity),
      documentRef: entregaForm.documentRef,
      employeeId: entregaForm.employeeId || undefined,
      employeeName: empName,
      responsible: entregaForm.responsible,
      notes: entregaForm.notes,
    });

    setIsEntregaModalOpen(false);
    showNotification(`Entrega registrada: ${entregaForm.quantity} un. entregadas a ${empName}.`);
  };

  const handleConfirmAdjust = () => {
    if (!adjustingItem) return;
    adjustStock(adjustingItem.id, adjustQuantity, adjustReason, adjustResponsible);
    setAdjustingItem(null);
    showNotification(`Stock de ${adjustingItem.name} ajustado a ${adjustQuantity} unidades.`);
  };

  const handleSaveEditItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    updateInventoryItem(editingItem.id, {
      name: editingItem.name,
      minStock: Number(editingItem.minStock),
      unitCostCLP: Number(editingItem.unitCostCLP),
      location: editingItem.location,
    });
    setEditingItem(null);
    showNotification('Parámetros del artículo actualizados con éxito.');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs border border-slate-700 animate-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display flex items-center gap-2.5">
            <span>Control de Inventario y Stock</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {matrixStats.grandTotal.toLocaleString('es-CL')} Unidades Físicas
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Existencias por prenda, talla y ubicación para Cía. JAC Transportes y Buses Bío Bío SpA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Carga Masiva Button */}
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Carga Masiva CSV</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={() => (viewMode === 'matrix' ? handleExportMatrixCSV() : handleExportItemsCSV())}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Descargar CSV</span>
          </button>

          {/* Quick Ingreso Button */}
          <button
            onClick={() => setIsIngresoModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <PackagePlus className="w-4 h-4 text-amber-400" />
            <span>Ingreso (+)</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards for the 3 Seasons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 2025 Verano */}
        <button
          onClick={() => setSelectedSeason('2025 verano')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            selectedSeason === '2025 verano'
              ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-500/20'
              : 'bg-white hover:bg-amber-50/50 border-slate-200 text-slate-900 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedSeason === '2025 verano' ? 'text-slate-950' : 'text-amber-700'}`}>
              ☀️ 2025 Verano
            </span>
            <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300">
              M/C
            </span>
          </div>
          <div className="text-xl font-bold">
            {stats2025Verano.total.toLocaleString('es-CL')}{' '}
            <span className={`text-xs font-normal ${selectedSeason === '2025 verano' ? 'text-slate-900' : 'text-slate-500'}`}>
              unidades
            </span>
          </div>
          <div className={`text-[10px] mt-0.5 font-medium ${selectedSeason === '2025 verano' ? 'text-slate-900' : 'text-amber-700'}`}>
            JAC: {stats2025Verano.jac} | BBB: {stats2025Verano.bbb}
          </div>
        </button>

        {/* 2025 Invierno */}
        <button
          onClick={() => setSelectedSeason('2025 invierno')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            selectedSeason === '2025 invierno'
              ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-600/20'
              : 'bg-white hover:bg-sky-50/50 border-slate-200 text-slate-900 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedSeason === '2025 invierno' ? 'text-sky-100' : 'text-sky-700'}`}>
              ❄️ 2025 Invierno
            </span>
            <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-sky-100 text-sky-900 border border-sky-300">
              M/L
            </span>
          </div>
          <div className="text-xl font-bold">
            {stats2025Invierno.total.toLocaleString('es-CL')}{' '}
            <span className={`text-xs font-normal ${selectedSeason === '2025 invierno' ? 'text-sky-100' : 'text-slate-500'}`}>
              unidades
            </span>
          </div>
          <div className={`text-[10px] mt-0.5 font-medium ${selectedSeason === '2025 invierno' ? 'text-sky-200' : 'text-sky-700'}`}>
            JAC: {stats2025Invierno.jac} | BBB: {stats2025Invierno.bbb}
          </div>
        </button>

        {/* 2026 Invierno */}
        <button
          onClick={() => setSelectedSeason('2026 invierno')}
          className={`text-left p-3.5 rounded-xl border transition-all ${
            selectedSeason === '2026 invierno'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/20'
              : 'bg-white hover:bg-indigo-50/50 border-slate-200 text-slate-900 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${selectedSeason === '2026 invierno' ? 'text-indigo-100' : 'text-indigo-700'}`}>
              ❄️ 2026 Invierno
            </span>
            <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-900 border border-indigo-300">
              M/L
            </span>
          </div>
          <div className="text-xl font-bold">
            {stats2026Invierno.total.toLocaleString('es-CL')}{' '}
            <span className={`text-xs font-normal ${selectedSeason === '2026 invierno' ? 'text-indigo-100' : 'text-slate-500'}`}>
              unidades
            </span>
          </div>
          <div className={`text-[10px] mt-0.5 font-medium ${selectedSeason === '2026 invierno' ? 'text-indigo-200' : 'text-indigo-700'}`}>
            JAC: {stats2026Invierno.jac} | BBB: {stats2026Invierno.bbb}
          </div>
        </button>
      </div>

      {/* View Switcher Bar (Matrix vs Itemized List) */}
      <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-xl border border-slate-200">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-amber-600" />
            <span>Tablas por Temporada (Planilla Oficial JAC / BBB)</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold">
              3 Temporadas
            </span>
          </button>

          <button
            onClick={() => setViewMode('items')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'items'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
            <span>Listado Detallado por Ítem & Bodega</span>
            <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-bold">
              {inventory.length} ítems
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 hidden md:inline px-2 font-medium">
          {viewMode === 'matrix' ? 'Tablas separadas por 2025 Verano, 2025 Invierno y 2026 Invierno' : 'Vista de gestión individual'}
        </span>
      </div>

      {/* ======================================================== */}
      {/* MODE 1: MATRIX VIEW (Tablas por Temporada)                */}
      {/* ======================================================== */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          {/* Season Switcher & Quick Filters Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            {/* Season Tabs Selector */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-bold text-slate-700 mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  <span>Temporada:</span>
                </span>

                <button
                  onClick={() => setSelectedSeason('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedSeason === 'all'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>📑 Todas las Temporadas (Ver las 3 Tablas)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20 text-white font-mono">
                    {matrixStats.grandTotal.toLocaleString('es-CL')}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedSeason('2025 verano')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedSeason === '2025 verano'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
                  }`}
                >
                  <span>☀️ 2025 Verano</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-900/10 font-bold">
                    {stats2025Verano.total.toLocaleString('es-CL')} un.
                  </span>
                </button>

                <button
                  onClick={() => setSelectedSeason('2025 invierno')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedSeason === '2025 invierno'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80'
                  }`}
                >
                  <span>❄️ 2025 Invierno</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-900/10 font-bold">
                    {stats2025Invierno.total.toLocaleString('es-CL')} un.
                  </span>
                </button>

                <button
                  onClick={() => setSelectedSeason('2026 invierno')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedSeason === '2026 invierno'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80'
                  }`}
                >
                  <span>❄️ 2026 Invierno</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-900/10 font-bold">
                    {stats2026Invierno.total.toLocaleString('es-CL')} un.
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 font-medium hidden lg:inline">
                {selectedSeason === 'all'
                  ? 'Mostrando las 3 tablas simultáneas en pantalla'
                  : `Visualizando tabla de ${selectedSeason}`}
              </div>
            </div>

            {/* Matrix Search & Filters */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar prenda (Camisa, Sweater, Parka...)..."
                  value={matrixSearch}
                  onChange={(e) => setMatrixSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <select
                  value={matrixCompanyFilter}
                  onChange={(e) => setMatrixCompanyFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none"
                >
                  <option value="all">Empresas: Todas</option>
                  <option value="JAC">Cía. JAC Transportes (JAC)</option>
                  <option value="BBB">Buses Bío Bío (BBB)</option>
                  <option value="General">Compartido / General</option>
                </select>

                <select
                  value={matrixStorageFilter}
                  onChange={(e) => setMatrixStorageFilter(e.target.value as any)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                >
                  <option value="all">Ubicación: Caja y Repisa</option>
                  <option value="Caja">Caja</option>
                  <option value="Repisa">Repisa</option>
                </select>

                {(matrixSearch || matrixCompanyFilter !== 'all' || matrixStorageFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setMatrixSearch('');
                      setMatrixCompanyFilter('all');
                      setMatrixStorageFilter('all');
                    }}
                    className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Render individual Season Table Helper */}
          {(() => {
            const renderTable = (
              rows: MatrixRow[],
              seasonKey: '2025 verano' | '2025 invierno' | '2026 invierno',
              title: string,
              subtitle: string,
              icon: string,
              theme: {
                border: string;
                headerBg: string;
                headerText: string;
                badgeBg: string;
                badgeText: string;
                badgeBorder: string;
              },
              stats: { total: number; jac: number; bbb: number; general: number; count: number }
            ) => {
              return (
                <div key={seasonKey} className={`bg-white rounded-2xl border ${theme.border} shadow-2xs overflow-hidden`}>
                  {/* Season Header Banner */}
                  <div className={`p-3.5 ${theme.headerBg} border-b ${theme.border} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{icon}</span>
                        <h2 className={`text-sm sm:text-base font-bold font-display ${theme.headerText}`}>
                          {title}
                        </h2>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                          {stats.total.toLocaleString('es-CL')} Unidades en Bodega
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {subtitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200">
                        <span className="text-amber-800">JAC: {stats.jac.toLocaleString('es-CL')}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-blue-800">BBB: {stats.bbb.toLocaleString('es-CL')}</span>
                        {stats.general > 0 && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span className="text-slate-700">Pantalones: {stats.general.toLocaleString('es-CL')}</span>
                          </>
                        )}
                      </div>

                      <button
                        onClick={() => handleExportMatrixCSV(seasonKey)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-bold transition-all shadow-2xs"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        <span>Descargar CSV ({title})</span>
                      </button>
                    </div>
                  </div>

                  {/* Table Content */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 text-white font-semibold text-[11px] sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-3 whitespace-nowrap bg-slate-950">EMP</th>
                          <th className="py-2.5 px-3 whitespace-nowrap bg-slate-950">Ubicación</th>
                          <th className="py-2.5 px-4 whitespace-nowrap bg-slate-950 min-w-[200px]">PRENDA</th>
                          {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '-'].map((sz) => (
                            <th key={sz} className="py-2.5 px-2 text-center whitespace-nowrap bg-slate-900 border-l border-slate-800">
                              {sz}
                            </th>
                          ))}
                          {[36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64].map((sz) => (
                            <th key={sz} className="py-2.5 px-2 text-center whitespace-nowrap bg-slate-850 border-l border-slate-800">
                              {sz}
                            </th>
                          ))}
                          <th className="py-2.5 px-3 text-right whitespace-nowrap bg-amber-500 text-slate-950 font-bold border-l border-amber-600">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {rows.length === 0 ? (
                          <tr>
                            <td colSpan={28} className="py-8 text-center text-slate-400 font-sans">
                              No se encontraron registros para {title} con los filtros seleccionados.
                            </td>
                          </tr>
                        ) : (
                          rows.map((row) => {
                            const isJac = row.company === 'JAC';
                            const isBbb = row.company === 'BBB';
                            const isCaja = row.storageType.toLowerCase() === 'caja';

                            return (
                              <tr key={row.id} className="hover:bg-amber-50/30 transition-colors">
                                <td className="py-2 px-3 whitespace-nowrap font-sans font-bold">
                                  {isJac && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                                      JAC
                                    </span>
                                  )}
                                  {isBbb && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-200">
                                      BBB
                                    </span>
                                  )}
                                  {!isJac && !isBbb && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                      General
                                    </span>
                                  )}
                                </td>

                                <td className="py-2 px-3 whitespace-nowrap font-sans">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      isCaja
                                        ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                                    }`}
                                  >
                                    {row.storageType}
                                  </span>
                                </td>

                                <td className="py-2 px-4 whitespace-nowrap font-sans font-bold text-slate-900">
                                  {row.garmentName}
                                </td>

                                {['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '-'].map((col) => {
                                  const val = row.sizes[col];
                                  return (
                                    <td
                                      key={col}
                                      className={`py-2 px-2 text-center border-l border-slate-100 ${
                                        val && val > 0 ? 'bg-amber-50/40 text-slate-900 font-bold' : 'text-slate-300'
                                      }`}
                                    >
                                      {val && val > 0 ? val : '-'}
                                    </td>
                                  );
                                })}

                                {[36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64].map((num) => {
                                  const val = row.sizes[String(num)];
                                  return (
                                    <td
                                      key={num}
                                      className={`py-2 px-2 text-center border-l border-slate-100 ${
                                        val && val > 0 ? 'bg-blue-50/50 text-slate-900 font-bold' : 'text-slate-300'
                                      }`}
                                    >
                                      {val && val > 0 ? val : '-'}
                                    </td>
                                  );
                                })}

                                <td className="py-2 px-3 text-right font-bold text-slate-950 bg-slate-50 border-l border-slate-200">
                                  {row.total > 0 ? (
                                    <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-400 font-bold text-xs">
                                      {row.total}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            };

            const themeVerano = {
              border: 'border-amber-300',
              headerBg: 'bg-gradient-to-r from-amber-100/90 via-amber-50 to-orange-50/60',
              headerText: 'text-amber-950',
              badgeBg: 'bg-amber-200',
              badgeText: 'text-amber-950',
              badgeBorder: 'border-amber-300',
            };

            const themeInvierno2025 = {
              border: 'border-sky-300',
              headerBg: 'bg-gradient-to-r from-sky-100/90 via-sky-50 to-blue-50/60',
              headerText: 'text-sky-950',
              badgeBg: 'bg-sky-200',
              badgeText: 'text-sky-950',
              badgeBorder: 'border-sky-300',
            };

            const themeInvierno2026 = {
              border: 'border-indigo-300',
              headerBg: 'bg-gradient-to-r from-indigo-100/90 via-indigo-50 to-purple-50/60',
              headerText: 'text-indigo-950',
              badgeBg: 'bg-indigo-200',
              badgeText: 'text-indigo-950',
              badgeBorder: 'border-indigo-300',
            };

            return (
              <div className="space-y-6">
                {(selectedSeason === 'all' || selectedSeason === '2025 verano') &&
                  renderTable(
                    matrix2025Verano,
                    '2025 verano',
                    'Temporada 2025 Verano',
                    'Dotación estival: Camisas y blusas manga corta (M/C), sweaters ligeros y pantalones oficiales',
                    '☀️',
                    themeVerano,
                    stats2025Verano
                  )}

                {(selectedSeason === 'all' || selectedSeason === '2025 invierno') &&
                  renderTable(
                    matrix2025Invierno,
                    '2025 invierno',
                    'Temporada 2025 Invierno',
                    'Dotación invernal histórica: Manga larga (M/L), parkas impermeables, polares térmicos y pantalones',
                    '❄️',
                    themeInvierno2025,
                    stats2025Invierno
                  )}

                {(selectedSeason === 'all' || selectedSeason === '2026 invierno') &&
                  renderTable(
                    matrix2026Invierno,
                    '2026 invierno',
                    'Temporada 2026 Invierno',
                    'Dotación invernal vigente: Camisas M/L, polares, parkas unisex, sweaters de abrigo y pantalones',
                    '❄️',
                    themeInvierno2026,
                    stats2026Invierno
                  )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODE 2: ITEMIZED INDIVIDUAL STOCK VIEW                   */}
      {/* ======================================================== */}
      {viewMode === 'items' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, prenda o ubicación..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={itemSeasonFilter}
                onChange={(e) => setItemSeasonFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none"
              >
                <option value="all">Temporada: Todas</option>
                <option value="2025 verano">☀️ 2025 Verano</option>
                <option value="2025 invierno">❄️ 2025 Invierno</option>
                <option value="2026 invierno">❄️ 2026 Invierno</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="all">Categorías: Todas</option>
                <option value="superior">Superior (Camisas/Poleras)</option>
                <option value="inferior">Inferior (Pantalones)</option>
                <option value="abrigo">Abrigo (Polar/Parka/Sweater)</option>
                <option value="proteccion">Accesorios / Corbata</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
              >
                <option value="all">Estado: Todos</option>
                <option value="ok">Con Stock Suficiente</option>
                <option value="low">Bajo Stock Mínimo</option>
                <option value="out">Sin Stock (Agotado)</option>
              </select>

              {(searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || itemSeasonFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                    setItemSeasonFilter('all');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Itemized Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Código / Prenda</th>
                    <th className="py-3 px-3">Temporada</th>
                    <th className="py-3 px-3">Talla</th>
                    <th className="py-3 px-3 text-center">Stock Actual</th>
                    <th className="py-3 px-3 text-center">Stock Mínimo</th>
                    <th className="py-3 px-3">Ubicación Bodega</th>
                    <th className="py-3 px-3 text-right">Acciones Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No se encontraron artículos que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredInventory.map((item) => {
                      const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
                      const isOut = item.currentStock === 0;
                      const isVerano = (item.season || '').includes('verano');
                      const isInv25 = (item.season || '').includes('2025 invierno');

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{item.name}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{item.code}</div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isVerano
                                  ? 'bg-amber-50 text-amber-900 border-amber-200'
                                  : isInv25
                                  ? 'bg-sky-50 text-sky-900 border-sky-200'
                                  : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                              }`}
                            >
                              {isVerano ? '☀️ 2025 Verano' : isInv25 ? '❄️ 2025 Invierno' : '❄️ 2026 Invierno'}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold border border-slate-200">
                              {item.size}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                isOut
                                  ? 'bg-rose-100 text-rose-800'
                                  : isLow
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {item.currentStock} un.
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center text-slate-500 font-medium">
                            {item.minStock} un.
                          </td>

                          <td className="py-3 px-3 text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>{item.location}</span>
                            </div>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenIngresoForSpecificItem(item)}
                                title="Ingresar stock (+)"
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md font-semibold text-[11px] border border-emerald-200 transition-colors flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Ingreso</span>
                              </button>

                              <button
                                onClick={() => handleOpenEntregaForSpecificItem(item)}
                                title="Entregar stock (-)"
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md font-semibold text-[11px] border border-amber-200 transition-colors flex items-center gap-1"
                              >
                                <Minus className="w-3 h-3" />
                                <span>Entrega</span>
                              </button>

                              <button
                                onClick={() => handleOpenAdjust(item)}
                                title="Ajuste manual de auditoría"
                                className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-md transition-colors"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: INGRESO DE STOCK (+)                              */}
      {/* ======================================================== */}
      {isIngresoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Registrar Ingreso de Stock</h3>
              </div>
              <button
                onClick={() => setIsIngresoModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitIngreso} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Prenda / Artículo</label>
                <input
                  type="text"
                  required
                  value={ingresoForm.garmentName}
                  onChange={(e) => setIngresoForm({ ...ingresoForm, garmentName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Talla</label>
                  <input
                    type="text"
                    required
                    value={ingresoForm.size}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, size: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cantidad a Ingresar</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={ingresoForm.quantity}
                    onChange={(e) => setIngresoForm({ ...ingresoForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Documento / Guía de Despacho</label>
                <input
                  type="text"
                  value={ingresoForm.documentRef}
                  onChange={(e) => setIngresoForm({ ...ingresoForm, documentRef: e.target.value })}
                  placeholder="Guía Nº 12450 o Factura"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proveedor / Origen</label>
                <input
                  type="text"
                  value={ingresoForm.supplier}
                  onChange={(e) => setIngresoForm({ ...ingresoForm, supplier: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIngresoModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Confirmar Ingreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ENTREGA A TRABAJADOR (-)                          */}
      {/* ======================================================== */}
      {isEntregaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <PackageMinus className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Registrar Entrega de Dotación</h3>
              </div>
              <button
                onClick={() => setIsEntregaModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitEntrega} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trabajador Receptor</label>
                <select
                  value={entregaForm.employeeId}
                  onChange={(e) => setEntregaForm({ ...entregaForm, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      #{emp.identifier || emp.rut} - {emp.fullName} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cantidad a Entregar</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={entregaForm.quantity}
                  onChange={(e) => setEntregaForm({ ...entregaForm, quantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nº Acta / Comprobante</label>
                <input
                  type="text"
                  value={entregaForm.documentRef}
                  onChange={(e) => setEntregaForm({ ...entregaForm, documentRef: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEntregaModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Confirmar Entrega
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: AJUSTE MANUAL                                     */}
      {/* ======================================================== */}
      {adjustingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-xs">
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Ajuste de Conteo Físico
            </h3>
            <p className="text-slate-500 mb-3">{adjustingItem.name} (Talla {adjustingItem.size})</p>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Stock Físico Real</label>
                <input
                  type="number"
                  min="0"
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-base"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingItem(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdjust}
                  className="px-4 py-1.5 font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Guardar Ajuste
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Carga Masiva Modal */}
      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        defaultTab="inventory"
      />
    </div>
  );
};
