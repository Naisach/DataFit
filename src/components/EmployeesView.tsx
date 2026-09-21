import React, { useState, useMemo } from 'react';
import { useUniforms } from '../context/UniformsContext';
import { Employee, EmployeeType, SurveyStatus } from '../types';
import { EmployeeModal } from './EmployeeModal';
import { BulkImportModal } from './BulkImportModal';
import { ShareQrModal } from './ShareQrModal';
import {
  Users,
  Search,
  Plus,
  Upload,
  QrCode,
  Download,
  Filter,
  Shield,
  Sun,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  PackageCheck,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';

interface EmployeesViewProps {
  onOpenDeliveryForEmployee?: (employee: Employee) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ onOpenDeliveryForEmployee }) => {
  const { employees, addEmployee, updateEmployee, deleteEmployee, importEmployeesBatch, setActiveView } = useUniforms();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedSurveyStatus, setSelectedSurveyStatus] = useState<string>('todos');
  const [selectedLocation, setSelectedLocation] = useState<string>('todos');

  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // Distinct locations for filter
  const locations = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.workLocation) set.add(e.workLocation);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = selectedType === 'todos' || emp.type === selectedType;
      const matchesSurvey = selectedSurveyStatus === 'todos' || emp.surveyStatus === selectedSurveyStatus;
      const matchesLocation = selectedLocation === 'todos' || emp.workLocation === selectedLocation;

      return matchesSearch && matchesType && matchesSurvey && matchesLocation;
    });
  }, [employees, searchTerm, selectedType, selectedSurveyStatus, selectedLocation]);

  // Counts
  const totalCount = employees.length;
  const permCount = employees.filter((e) => e.type === 'permanente').length;
  const seasCount = employees.filter((e) => e.type === 'estival').length;
  const pendingSurveyCount = employees.filter((e) => e.surveyStatus === 'pendiente').length;

  const handleOpenEdit = (emp: Employee) => {
    setEmployeeToEdit(emp);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenNew = () => {
    setEmployeeToEdit(null);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (employeeToEdit) {
      updateEmployee(employeeToEdit.id, data);
    } else {
      addEmployee(data);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar a "${name}" de la nómina?`)) {
      deleteEmployee(id);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [
      'RUT',
      'Nombre Completo',
      'Tipo Dotacion',
      'Departamento',
      'Faena / Ubicacion',
      'Cargo',
      'Corte',
      'Talla Polera',
      'Talla Pantalon',
      'Talla Calzado',
      'Talla Chaqueta',
      'Proteccion Cabeza',
      'Estado Encuesta',
      'Estado Entrega',
      'Inicio Contrato',
      'Fin Contrato',
      'Observaciones',
    ];

    const rows = employees.map((e) => [
      `"${e.rut}"`,
      `"${e.fullName}"`,
      `"${e.type}"`,
      `"${e.department}"`,
      `"${e.workLocation}"`,
      `"${e.role}"`,
      `"${e.genderFit}"`,
      `"${e.sizes.shirt}"`,
      `"${e.sizes.pants}"`,
      `"${e.sizes.footwear}"`,
      `"${e.sizes.jacket}"`,
      `"${e.sizes.headwear}"`,
      `"${e.surveyStatus}"`,
      `"${e.deliveryStatus}"`,
      `"${e.contractStart}"`,
      `"${e.contractEnd || ''}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Nomina_Tallas_Uniformes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Top Header & Fast Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            Recolección y Registro de Tallas
          </h1>
          <p className="text-xs text-slate-500">
            Catálogo unificado de colaboradores: {permCount} planta permanente y {seasCount} temporeros estivales
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-qr-modal"
            onClick={() => setIsQrModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300/80 rounded-xl text-xs font-semibold transition-colors"
          >
            <QrCode className="w-3.5 h-3.5 text-amber-700" />
            <span>Compartir QR</span>
          </button>

          <button
            id="btn-open-bulk-import"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-600" />
            <span>Carga Masiva</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            id="btn-new-employee"
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Colaborador</span>
          </button>
        </div>
      </div>

      {/* Segment Tabs (Permanente vs Estival) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setSelectedType('todos')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedType === 'todos'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Toda la Dotación</span>
            <Users className="w-4 h-4 opacity-70" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold">{totalCount}</span>
            <span className="text-[11px] opacity-70">registros</span>
          </div>
        </button>

        <button
          onClick={() => setSelectedType('permanente')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedType === 'permanente'
              ? 'bg-slate-800 text-white border-slate-800 shadow-xs ring-2 ring-slate-800/20'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Planta Permanente</span>
            <Shield className="w-4 h-4 opacity-70" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold">{permCount}</span>
            <span className="text-[11px] opacity-70">contratos fijos</span>
          </div>
        </button>

        <button
          onClick={() => setSelectedType('estival')}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedType === 'estival'
              ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium">Temporada Estival</span>
            <Sun className="w-4 h-4 text-amber-300" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-lg font-bold">{seasCount}</span>
            <span className="text-[11px] opacity-70">temporeros activos</span>
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por Nombre, RUT, Departamento o Cargo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Survey status filter */}
          <select
            value={selectedSurveyStatus}
            onChange={(e) => setSelectedSurveyStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="todos">Encuestas: Todas</option>
            <option value="completado">Completadas</option>
            <option value="pendiente">Pendientes de Talla</option>
          </select>

          {/* Location filter */}
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="todos">Sedes: Todas</option>
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {(searchTerm || selectedType !== 'todos' || selectedSurveyStatus !== 'todos' || selectedLocation !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('todos');
                setSelectedSurveyStatus('todos');
                setSelectedLocation('todos');
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Colaborador / Identificación</th>
                <th className="py-3 px-3">Dotación</th>
                <th className="py-3 px-3">Ubicación & Área</th>
                <th className="py-3 px-3 text-center">Polera</th>
                <th className="py-3 px-3 text-center">Pantalón</th>
                <th className="py-3 px-3 text-center">Calzado</th>
                <th className="py-3 px-3 text-center">Chaqueta</th>
                <th className="py-3 px-3">Protección Cabeza</th>
                <th className="py-3 px-3 text-center">Encuesta</th>
                <th className="py-3 px-3 text-center">Entrega</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Name & RUT */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{emp.fullName}</div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
                      <span>{emp.rut}</span>
                      <span className="text-slate-300">•</span>
                      <span>{emp.role}</span>
                    </div>
                  </td>

                  {/* Dotation Type */}
                  <td className="py-3 px-3">
                    {emp.type === 'permanente' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-semibold border border-slate-200">
                        <Shield className="w-3 h-3 text-slate-600" />
                        Permanente
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[11px] font-semibold border border-amber-200">
                        <Sun className="w-3 h-3 text-amber-600" />
                        Estival
                      </span>
                    )}
                  </td>

                  {/* Location & Area */}
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-700 truncate max-w-[150px]">{emp.workLocation}</div>
                    <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{emp.department}</div>
                  </td>

                  {/* Sizes badges */}
                  <td className="py-3 px-3 text-center">
                    <span className="inline-block min-w-[26px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200/60">
                      {emp.sizes.shirt}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-block min-w-[26px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200/60">
                      {emp.sizes.pants}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-block min-w-[26px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-bold border border-slate-200">
                      {emp.sizes.footwear}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className="inline-block min-w-[26px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/60">
                      {emp.sizes.jacket}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-600 text-[11px]">
                    <span className="truncate max-w-[120px] inline-block font-medium">
                      {emp.sizes.headwear}
                    </span>
                  </td>

                  {/* Survey Status */}
                  <td className="py-3 px-3 text-center">
                    {emp.surveyStatus === 'completado' ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Lista
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px] bg-amber-50 px-2 py-0.5 rounded">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Pendiente
                      </span>
                    )}
                  </td>

                  {/* Delivery Status */}
                  <td className="py-3 px-3 text-center">
                    {emp.deliveryStatus === 'completado' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Entregado
                      </span>
                    )}
                    {emp.deliveryStatus === 'sin_entregar' && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                        Sin Despacho
                      </span>
                    )}
                    {emp.deliveryStatus === 'cambio_solicitado' && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-1 justify-center">
                        <AlertTriangle className="w-3 h-3" />
                        Cambio Talla
                      </span>
                    )}
                    {emp.deliveryStatus === 'parcial' && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-medium">
                        Parcial
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onOpenDeliveryForEmployee && (
                        <button
                          onClick={() => onOpenDeliveryForEmployee(emp)}
                          title="Entregar Uniforme"
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <PackageCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(emp)}
                        title="Editar Datos y Tallas"
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id, emp.fullName)}
                        title="Eliminar Colaborador"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-xs text-slate-500">
                    No se encontraron colaboradores que coincidan con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="bg-slate-50/70 px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Mostrando {filteredEmployees.length} de {totalCount} colaboradores</span>
          <span className="text-[11px]">
            {pendingSurveyCount > 0 ? (
              <span className="text-amber-700 font-semibold">⚠️ Hay {pendingSurveyCount} encuestas pendientes por responder</span>
            ) : (
              <span className="text-emerald-700 font-semibold">✓ 100% de tallas recolectadas</span>
            )}
          </span>
        </div>
      </div>

      {/* Modals */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        employeeToEdit={employeeToEdit}
      />

      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onImport={importEmployeesBatch}
      />

      <ShareQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        onOpenSelfService={() => setActiveView('self_service')}
      />
    </div>
  );
};
