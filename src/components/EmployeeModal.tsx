import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { X, User, Building2, Shirt, Tag, Clock } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  employeeToEdit?: Employee | null;
}

const LETTER_SIZES = ['-', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
const PANTS_SIZES = [
  '-', '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64'
];

const COMMON_ROLES = [
  'Conductor/a',
  'Asistente de bus',
  'Cajero/a',
  'Operador servicio al cliente',
  'Asistente de Terminal',
  'Promotor de Ventas',
  'Movilizador',
  'Cajero Jefe Turno',
  'Jefe de Operaciones',
  'Otro Cargo',
];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeToEdit,
}) => {
  const [empresa, setEmpresa] = useState('Buses Bio Bio SpA');
  const [identificador, setIdentificador] = useState('');
  const [rut, setRut] = useState('');
  const [fullName, setFullName] = useState('');
  const [genero, setGenero] = useState<'Hombre' | 'Mujer'>('Hombre');
  const [cargo, setCargo] = useState('Conductor/a');
  const [customCargo, setCustomCargo] = useState('');

  // Tallas específicas de JAC y Buses Bio Bio
  const [tallaBlusa, setTallaBlusa] = useState('-');
  const [tallaCamisa, setTallaCamisa] = useState('-');
  const [tallaSweater, setTallaSweater] = useState('-');
  const [tallaPolar, setTallaPolar] = useState('-');
  const [tallaParka, setTallaParka] = useState('-');
  const [tallaPantalon, setTallaPantalon] = useState('-');
  const [corbata, setCorbata] = useState('Si aplica');

  const [timestamp, setTimestamp] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (employeeToEdit) {
      setEmpresa(employeeToEdit.company || (employeeToEdit.workLocation?.includes('JAC') ? 'Cia. Jac Transportes SpA' : 'Buses Bio Bio SpA'));
      setIdentificador(employeeToEdit.identifier || employeeToEdit.rut.replace(/[^0-9]/g, '').slice(0, 4) || '');
      setRut(employeeToEdit.rut || '');
      setFullName(employeeToEdit.fullName || '');
      setGenero(employeeToEdit.gender === 'Mujer' || employeeToEdit.genderFit === 'femenino' ? 'Mujer' : 'Hombre');
      setCargo(employeeToEdit.role || 'Conductor/a');
      setTallaBlusa(employeeToEdit.sizes.blusa || '-');
      setTallaCamisa(employeeToEdit.sizes.camisa || (employeeToEdit.sizes.shirt as string) || '-');
      setTallaSweater(employeeToEdit.sizes.sweater || '-');
      setTallaPolar(employeeToEdit.sizes.polar || '-');
      setTallaParka(employeeToEdit.sizes.parka || (employeeToEdit.sizes.jacket as string) || '-');
      setTallaPantalon((employeeToEdit.sizes.pants as string) || '-');
      setCorbata(employeeToEdit.sizes.corbata || 'Si aplica');
      setTimestamp(employeeToEdit.timestamp || employeeToEdit.createdAt || '');
      setNotes(employeeToEdit.notes || '');
    } else {
      setEmpresa('Buses Bio Bio SpA');
      setIdentificador('');
      setRut('');
      setFullName('');
      setGenero('Hombre');
      setCargo('Conductor/a');
      setCustomCargo('');
      setTallaBlusa('-');
      setTallaCamisa('L');
      setTallaSweater('L');
      setTallaPolar('L');
      setTallaParka('L');
      setTallaPantalon('48');
      setCorbata('Si aplica');
      setTimestamp(new Date().toLocaleString('es-CL'));
      setNotes('');
    }
  }, [employeeToEdit, isOpen]);

  // Sincronizar corbata sugerida según género
  const handleGenderChange = (newGen: 'Hombre' | 'Mujer') => {
    setGenero(newGen);
    if (newGen === 'Mujer') {
      setCorbata('No aplica');
      if (tallaBlusa === '-') setTallaBlusa('M');
    } else {
      setCorbata('Si aplica');
      if (tallaCamisa === '-') setTallaCamisa('L');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const idVal = identificador.trim() || String(Date.now()).slice(-4);
    const finalCargo = cargo === 'Otro Cargo' && customCargo.trim() ? customCargo.trim() : cargo;
    const finalName = fullName.trim() || `Funcionario #${idVal} - ${finalCargo}`;
    const finalRut = rut.trim() || `${idVal}.000.000-${idVal.slice(-1) || 'K'}`;

    const effectiveShirt = genero === 'Mujer' ? (tallaBlusa !== '-' ? tallaBlusa : tallaSweater) : (tallaCamisa !== '-' ? tallaCamisa : tallaSweater);

    onSave({
      identifier: idVal,
      company: empresa,
      rut: finalRut,
      fullName: finalName,
      email: `${idVal}@${empresa.toLowerCase().includes('jac') ? 'jac' : 'biobio'}.cl`,
      phone: '+56 9 7000 0000',
      workLocation: empresa.toLowerCase().includes('jac') ? 'Terminal JAC' : 'Terminal Buses Bío Bío',
      department: finalCargo.toLowerCase().includes('conductor')
        ? 'Operaciones / Ruta'
        : finalCargo.toLowerCase().includes('cajero')
        ? 'Comercial / Cajas'
        : 'Terminal / Pasajeros',
      role: finalCargo,
      gender: genero,
      genderFit: genero === 'Mujer' ? 'femenino' : 'masculino',
      type: 'permanente',
      sizes: {
        shirt: effectiveShirt !== '-' ? effectiveShirt : 'L',
        pants: tallaPantalon !== '-' ? tallaPantalon : '46',
        footwear: '42',
        jacket: tallaParka !== '-' ? tallaParka : (tallaPolar !== '-' ? tallaPolar : 'L'),
        headwear: 'Estándar',
        blusa: tallaBlusa !== '-' ? tallaBlusa : '',
        camisa: tallaCamisa !== '-' ? tallaCamisa : '',
        sweater: tallaSweater !== '-' ? tallaSweater : '',
        polar: tallaPolar !== '-' ? tallaPolar : '',
        parka: tallaParka !== '-' ? tallaParka : '',
        corbata: corbata,
      },
      surveyStatus: 'completado',
      contractStart: '2026-08-01',
      deliveryStatus: employeeToEdit ? employeeToEdit.deliveryStatus : 'sin_entregar',
      timestamp: timestamp || new Date().toLocaleString('es-CL'),
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {employeeToEdit ? 'Editar Registro de Trabajador' : 'Registrar Nuevo Trabajador y Tallas'}
              </h2>
              <p className="text-xs text-slate-500">
                Formulario de dotación oficial para Buses Bío Bío y Cía. JAC Transportes
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Empresa y Identificador */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Empresa <span className="text-rose-500">*</span></span>
              </label>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                <option value="Buses Bio Bio SpA">Buses Bio Bio SpA (BBB)</option>
                <option value="Cia. Jac Transportes SpA">Cia. Jac Transportes SpA (JAC)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-blue-600" />
                <span>Identificador / Ficha <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 1, 258, 480..."
                value={identificador}
                onChange={(e) => setIdentificador(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Datos Personales y Cargo */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Género <span className="text-rose-500">*</span>
              </label>
              <select
                value={genero}
                onChange={(e) => handleGenderChange(e.target.value as 'Hombre' | 'Mujer')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold"
              >
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Cargo / Función <span className="text-rose-500">*</span>
              </label>
              <select
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              >
                {COMMON_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {cargo === 'Otro Cargo' && (
                <input
                  type="text"
                  placeholder="Especifica el cargo..."
                  value={customCargo}
                  onChange={(e) => setCustomCargo(e.target.value)}
                  className="mt-1.5 w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Completo (Opcional)
              </label>
              <input
                type="text"
                placeholder={`Funcionario #${identificador || 'N'}`}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RUT (Opcional)
              </label>
              <input
                type="text"
                placeholder="12.345.678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Marca Temporal / Registro</span>
              </label>
              <input
                type="text"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                placeholder="Ej: 30-07-2026, MANUAL, No solicita tallas"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Matriz de Tallas para el Uniforme */}
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                <Shirt className="w-4 h-4 text-amber-700" />
                <span>Tallas de Dotación Asignadas</span>
              </div>
              <span className="text-[11px] text-amber-800">
                Selecciona las tallas correspondientes
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Blusa (Mujer) */}
              <div className={genero === 'Hombre' ? 'opacity-60' : ''}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Talla de Blusa (Mujer)
                </label>
                <select
                  value={tallaBlusa}
                  onChange={(e) => setTallaBlusa(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {LETTER_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Camisa (Hombre) */}
              <div className={genero === 'Mujer' ? 'opacity-60' : ''}>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Talla de Camisa (Hombre)
                </label>
                <select
                  value={tallaCamisa}
                  onChange={(e) => setTallaCamisa(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {LETTER_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Sweater */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Talla de Sweater
                </label>
                <select
                  value={tallaSweater}
                  onChange={(e) => setTallaSweater(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {LETTER_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Polar */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Talla de Polar
                </label>
                <select
                  value={tallaPolar}
                  onChange={(e) => setTallaPolar(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {LETTER_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Parka */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Talla de Parka
                </label>
                <select
                  value={tallaParka}
                  onChange={(e) => setTallaParka(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {LETTER_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Pantalón */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Talla de Pantalón (36 a 64)
                </label>
                <select
                  value={tallaPantalon}
                  onChange={(e) => setTallaPantalon(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {PANTS_SIZES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Corbata */}
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Corbata
                </label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="corbata"
                      value="Si aplica"
                      checked={corbata === 'Si aplica'}
                      onChange={() => setCorbata('Si aplica')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>Sí aplica</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="corbata"
                      value="No aplica"
                      checked={corbata === 'No aplica'}
                      onChange={() => setCorbata('No aplica')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span>No aplica</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones adicionales
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Registro manual en terminal, cambio solicitado..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs"
            >
              {employeeToEdit ? 'Actualizar Ficha' : 'Guardar Ficha Trabajador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
