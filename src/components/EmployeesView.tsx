import React, { useState, useMemo } from 'react';
import { useUniforms } from '../context/UniformsContext';
import { Employee } from '../types';
import { EmployeeModal } from './EmployeeModal';
import { BulkImportModal } from './BulkImportModal';
import {
  Users,
  Search,
  Plus,
  Upload,
  Download,
  Building2,
  CheckCircle2,
  Edit2,
  Trash2,
  PackageCheck,
  HardDrive,
  RefreshCw,
  Bus,
  Check,
  Ban,
  Clock,
  Filter,
} from 'lucide-react';
import { exportEmployeesToDrive } from '../services/googleDriveService';

interface EmployeesViewProps {
  onOpenDeliveryForEmployee?: (employee: Employee) => void;
}

export const EmployeesView: React.FC<EmployeesViewProps> = ({ onOpenDeliveryForEmployee }) => {
  const {
    employees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    setActiveView,
  } = useUniforms();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('todas');
  const [selectedRole, setSelectedRole] = useState<string>('todos');
  const [selectedGender, setSelectedGender] = useState<string>('todos');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('todos');

  // Pagination for high performance with 500+ employees
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Modal states
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Distinct roles for filter
  const roles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.role) set.add(e.role);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        (emp.identifier && emp.identifier.toLowerCase().includes(q)) ||
        emp.fullName.toLowerCase().includes(q) ||
        (emp.company && emp.company.toLowerCase().includes(q)) ||
        emp.role.toLowerCase().includes(q) ||
        emp.rut.toLowerCase().includes(q) ||
        (emp.timestamp && emp.timestamp.toLowerCase().includes(q));

      const matchesCompany =
        selectedCompany === 'todas' ||
        (selectedCompany === 'BBB' && (emp.company?.includes('Bio Bio') || emp.workLocation?.includes('Bio Bio'))) ||
        (selectedCompany === 'JAC' && (emp.company?.includes('Jac') || emp.workLocation?.includes('JAC')));

      const matchesRole = selectedRole === 'todos' || emp.role === selectedRole;

      const empGender = emp.gender || (emp.genderFit === 'femenino' ? 'Mujer' : 'Hombre');
      const matchesGender = selectedGender === 'todos' || empGender === selectedGender;

      let matchesStatus = true;
      if (selectedStatusFilter === 'no_solicita') {
        matchesStatus = emp.timestamp === 'No solicita tallas' || emp.notes === 'No solicita tallas';
      } else if (selectedStatusFilter === 'con_tallas') {
        matchesStatus = emp.timestamp !== 'No solicita tallas' && emp.notes !== 'No solicita tallas';
      } else if (selectedStatusFilter === 'manual') {
        matchesStatus = Boolean(emp.timestamp?.includes('MANUAL'));
      }

      return matchesSearch && matchesCompany && matchesRole && matchesGender && matchesStatus;
    });
  }, [employees, searchTerm, selectedCompany, selectedRole, selectedGender, selectedStatusFilter]);

  // Paginated slice
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage]);

  // Quick Counts
  const totalCount = employees.length;
  const bbbCount = employees.filter((e) => e.company?.includes('Bio Bio') || e.workLocation?.includes('Bio Bio')).length;
  const jacCount = employees.filter((e) => e.company?.includes('Jac') || e.workLocation?.includes('JAC')).length;

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

  // Export CSV matching the official JAC & BBB format
  const handleExportCsv = () => {
    const headers = [
      'Marca temporal',
      'Empresa',
      'Identificador',
      'Genero',
      'Cargo',
      'Talla de blusa',
      'Talla de camisa',
      'Talla de sweater',
      'Talla de polar',
      'Talla de parka',
      'Talla de pantalon',
      'Corbata',
    ];

    const rows = employees.map((e) => {
      const isFemale = e.gender === 'Mujer' || e.genderFit === 'femenino';
      return [
        `"${e.timestamp || e.createdAt}"`,
        `"${e.company || (e.workLocation?.includes('JAC') ? 'Cia. Jac Transportes SpA' : 'Buses Bio Bio SpA')}"`,
        `"${e.identifier || ''}"`,
        `"${isFemale ? 'Mujer' : 'Hombre'}"`,
        `"${e.role}"`,
        `"${e.sizes.blusa || ''}"`,
        `"${e.sizes.camisa || (e.sizes.shirt as string) || ''}"`,
        `"${e.sizes.sweater || ''}"`,
        `"${e.sizes.polar || ''}"`,
        `"${e.sizes.parka || (e.sizes.jacket as string) || ''}"`,
        `"${(e.sizes.pants as string) || ''}"`,
        `"${e.sizes.corbata || (isFemale ? 'No aplica' : 'Si aplica')}"`,
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nomina_Trabajadores_JAC_BBB_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [driveExportSuccess, setDriveExportSuccess] = useState<string | null>(null);

  const handleExportDrive = async () => {
    try {
      setIsExportingDrive(true);
      const res = await exportEmployeesToDrive(employees);
      setDriveExportSuccess(`Planilla guardada exitosamente en Drive (${res.name})`);
      setTimeout(() => setDriveExportSuccess(null), 6000);
    } catch (err: any) {
      alert(`No fue posible guardar en Drive: ${err?.message || 'Error de conexión'}`);
    } finally {
      setIsExportingDrive(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Drive Success Alert */}
      {driveExportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{driveExportSuccess}</span>
          </div>
          <button
            onClick={() => setActiveView('drive')}
            className="underline font-bold hover:text-emerald-700"
          >
            Ver en Google Drive
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display flex items-center gap-2">
            <span>Registros de Trabajadores</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {totalCount} Registrados
            </span>
          </h1>
          <p className="text-xs text-slate-500">
            Nómina oficial y asignación de tallas de dotación para Buses Bío Bío y Cía. JAC Transportes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-open-bulk-import"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Carga Masiva CSV</span>
          </button>

          <button
            id="btn-export-csv"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Descargar CSV</span>
          </button>

          <button
            id="btn-export-drive"
            onClick={handleExportDrive}
            disabled={isExportingDrive}
            title="Guardar archivo en Google Drive"
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
          >
            {isExportingDrive ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Guardar en Drive</span>
          </button>

          <button
            id="btn-new-employee"
            onClick={handleOpenNew}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Nuevo Registro</span>
          </button>
        </div>
      </div>

      {/* Summary Cards by Company */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => {
            setSelectedCompany('todas');
            setCurrentPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedCompany === 'todas'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider">Total Nómina</span>
            <Users className="w-4 h-4 opacity-70" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold">{totalCount}</span>
            <span className="text-[11px] opacity-70">colaboradores</span>
          </div>
        </button>

        <button
          onClick={() => {
            setSelectedCompany('BBB');
            setCurrentPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedCompany === 'BBB'
              ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-blue-700">Buses Bío Bío</span>
            <Bus className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">{bbbCount}</span>
            <span className="text-[11px] text-slate-500">BBB SpA</span>
          </div>
        </button>

        <button
          onClick={() => {
            setSelectedCompany('JAC');
            setCurrentPage(1);
          }}
          className={`p-3 rounded-xl border text-left transition-all ${
            selectedCompany === 'JAC'
              ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wider text-amber-700">Cía. JAC</span>
            <Bus className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">{jacCount}</span>
            <span className="text-[11px] text-slate-500">JAC Transportes</span>
          </div>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por ID, nombre, cargo o RUT..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Empresa filter */}
          <select
            value={selectedCompany}
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 font-semibold focus:outline-none"
          >
            <option value="todas">Empresas: Todas</option>
            <option value="BBB">Buses Bio Bio SpA</option>
            <option value="JAC">Cia. Jac Transportes</option>
          </select>

          {/* Cargo filter */}
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="todos">Cargos: Todos</option>
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {/* Género filter */}
          <select
            value={selectedGender}
            onChange={(e) => {
              setSelectedGender(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="todos">Género: Todos</option>
            <option value="Hombre">Hombre</option>
            <option value="Mujer">Mujer</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => {
              setSelectedStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
          >
            <option value="todos">Registros: Todos</option>
            <option value="con_tallas">Con Tallas Solicitadas</option>
            <option value="no_solicita">No Solicita Tallas</option>
            <option value="manual">Registro Manual</option>
          </select>

          {(searchTerm ||
            selectedCompany !== 'todas' ||
            selectedRole !== 'todos' ||
            selectedGender !== 'todos' ||
            selectedStatusFilter !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCompany('todas');
                setSelectedRole('todos');
                setSelectedGender('todos');
                setSelectedStatusFilter('todos');
                setCurrentPage(1);
              }}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold px-2 py-1"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Main Table with exact options */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 text-center">ID / Ficha</th>
                <th className="py-3 px-3">Empresa</th>
                <th className="py-3 px-3">Colaborador / Cargo</th>
                <th className="py-3 px-2 text-center" title="Talla de Blusa (Mujer)">Blusa</th>
                <th className="py-3 px-2 text-center" title="Talla de Camisa (Hombre)">Camisa</th>
                <th className="py-3 px-2 text-center">Sweater</th>
                <th className="py-3 px-2 text-center">Polar</th>
                <th className="py-3 px-2 text-center">Parka</th>
                <th className="py-3 px-2 text-center">Pantalón</th>
                <th className="py-3 px-2 text-center">Corbata</th>
                <th className="py-3 px-3">Marca Temporal</th>
                <th className="py-3 px-3 text-center">Entrega</th>
                <th className="py-3 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-8 text-center text-slate-400">
                    No se encontraron trabajadores que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map((emp) => {
                  const isJac = emp.company?.includes('Jac') || emp.workLocation?.includes('JAC');
                  const isFemale = emp.gender === 'Mujer' || emp.genderFit === 'femenino';
                  const isNoSolicita = emp.timestamp === 'No solicita tallas' || emp.notes === 'No solicita tallas';

                  return (
                    <tr key={emp.id} className="hover:bg-amber-50/20 transition-colors">
                      {/* ID / Ficha */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/80">
                          #{emp.identifier || emp.rut.replace(/[^0-9]/g, '').slice(0, 4)}
                        </span>
                      </td>

                      {/* Empresa */}
                      <td className="py-2.5 px-3">
                        {isJac ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-bold text-[11px] border border-amber-200">
                            Cía. JAC
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 font-bold text-[11px] border border-blue-200">
                            Buses Bío Bío
                          </span>
                        )}
                      </td>

                      {/* Colaborador / Cargo */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 leading-tight">
                          {emp.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <span className={`font-semibold ${isFemale ? 'text-pink-600' : 'text-blue-600'}`}>
                            {isFemale ? 'Mujer' : 'Hombre'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-700 font-medium">{emp.role}</span>
                        </div>
                      </td>

                      {/* Blusa */}
                      <td className="py-2.5 px-2 text-center">
                        {emp.sizes.blusa ? (
                          <span className="inline-block min-w-[24px] px-1.5 py-0.5 rounded bg-pink-50 text-pink-800 font-bold border border-pink-200/70">
                            {emp.sizes.blusa}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Camisa */}
                      <td className="py-2.5 px-2 text-center">
                        {emp.sizes.camisa ? (
                          <span className="inline-block min-w-[24px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200/70">
                            {emp.sizes.camisa}
                          </span>
                        ) : emp.sizes.shirt && !isFemale ? (
                          <span className="inline-block min-w-[24px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200/70">
                            {emp.sizes.shirt}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Sweater */}
                      <td className="py-2.5 px-2 text-center">
                        {emp.sizes.sweater ? (
                          <span className="inline-block min-w-[24px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/70">
                            {emp.sizes.sweater}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Polar */}
                      <td className="py-2.5 px-2 text-center">
                        {emp.sizes.polar ? (
                          <span className="inline-block min-w-[24px] px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 font-bold border border-cyan-200/70">
                            {emp.sizes.polar}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Parka */}
                      <td className="py-2.5 px-2 text-center">
                        {emp.sizes.parka || emp.sizes.jacket ? (
                          <span className="inline-block min-w-[24px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-800 font-bold border border-indigo-200/70">
                            {emp.sizes.parka || emp.sizes.jacket}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Pantalón */}
                      <td className="py-2.5 px-2 text-center">
                        {emp.sizes.pants ? (
                          <span className="inline-block min-w-[26px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 font-bold border border-amber-200">
                            {emp.sizes.pants}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {/* Corbata */}
                      <td className="py-2.5 px-2 text-center">
                        {emp.sizes.corbata === 'Si aplica' ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 font-semibold text-[10px] border border-purple-200">
                            <Check className="w-2.5 h-2.5" />
                            <span>Sí</span>
                          </span>
                        ) : emp.sizes.corbata === 'No aplica' ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-medium text-[10px]">
                            <Ban className="w-2.5 h-2.5" />
                            <span>No</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">-</span>
                        )}
                      </td>

                      {/* Marca Temporal */}
                      <td className="py-2.5 px-3">
                        {isNoSolicita ? (
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                            No solicita tallas
                          </span>
                        ) : emp.timestamp?.includes('MANUAL') ? (
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            {emp.timestamp}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px] font-mono">
                            {emp.timestamp || emp.createdAt || '-'}
                          </span>
                        )}
                      </td>

                      {/* Estado Entrega */}
                      <td className="py-2.5 px-3 text-center">
                        {emp.deliveryStatus === 'completado' && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Entregado
                          </span>
                        )}
                        {emp.deliveryStatus === 'sin_entregar' && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                            Pendiente
                          </span>
                        )}
                        {emp.deliveryStatus === 'parcial' && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-medium">
                            Parcial
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onOpenDeliveryForEmployee && (
                            <button
                              onClick={() => onOpenDeliveryForEmployee(emp)}
                              title="Entregar dotación a trabajador"
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md font-semibold text-[11px] flex items-center gap-1 border border-amber-200 transition-colors"
                            >
                              <PackageCheck className="w-3.5 h-3.5 text-amber-700" />
                              <span className="hidden lg:inline">Entregar</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(emp)}
                            title="Editar ficha"
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(emp.id, emp.fullName)}
                            title="Eliminar registro"
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 bg-slate-50/50">
            <span>
              Mostrando {Math.min(filteredEmployees.length, (currentPage - 1) * pageSize + 1)} -{' '}
              {Math.min(filteredEmployees.length, currentPage * pageSize)} de {filteredEmployees.length} registros
            </span>

            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50"
              >
                Anterior
              </button>
              <span className="px-2 font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-md border border-slate-200 bg-white font-semibold disabled:opacity-40 hover:bg-slate-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modales */}
      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        onSave={handleSaveEmployee}
        employeeToEdit={employeeToEdit}
      />

      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        defaultTab="employees"
      />
    </div>
  );
};
