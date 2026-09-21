import React, { useState, useEffect } from 'react';
import { Employee, EmployeeType, GenderFit, ShirtSize, PantsSize, FootwearSize, JacketSize } from '../types';
import { X, User, Shield, Shirt, Ruler } from 'lucide-react';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  employeeToEdit?: Employee | null;
}

const SHIRT_SIZES: ShirtSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const PANTS_SIZES: PantsSize[] = ['38', '40', '42', '44', '46', '48', '50', '52', '54'];
const FOOTWEAR_SIZES: FootwearSize[] = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const JACKET_SIZES: JacketSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  employeeToEdit,
}) => {
  const [rut, setRut] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [type, setType] = useState<EmployeeType>('estival');
  const [department, setDepartment] = useState('Operaciones Agrícolas & Terreno');
  const [workLocation, setWorkLocation] = useState('Fundo Alto Jahuel');
  const [role, setRole] = useState('Operario de Temporada');
  const [genderFit, setGenderFit] = useState<GenderFit>('unisex');
  const [shirt, setShirt] = useState<ShirtSize>('L');
  const [pants, setPants] = useState<PantsSize>('42');
  const [footwear, setFootwear] = useState<FootwearSize>('42');
  const [jacket, setJacket] = useState<JacketSize>('L');
  const [headwear, setHeadwear] = useState('Legionario UV');
  const [contractStart, setContractStart] = useState('2026-11-01');
  const [contractEnd, setContractEnd] = useState('2027-03-15');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (employeeToEdit) {
      setRut(employeeToEdit.rut);
      setFullName(employeeToEdit.fullName);
      setEmail(employeeToEdit.email);
      setPhone(employeeToEdit.phone);
      setType(employeeToEdit.type);
      setDepartment(employeeToEdit.department);
      setWorkLocation(employeeToEdit.workLocation);
      setRole(employeeToEdit.role);
      setGenderFit(employeeToEdit.genderFit);
      setShirt(employeeToEdit.sizes.shirt);
      setPants(employeeToEdit.sizes.pants);
      setFootwear(employeeToEdit.sizes.footwear);
      setJacket(employeeToEdit.sizes.jacket);
      setHeadwear(employeeToEdit.sizes.headwear);
      setContractStart(employeeToEdit.contractStart);
      setContractEnd(employeeToEdit.contractEnd || '');
      setNotes(employeeToEdit.notes || '');
    } else {
      setRut('');
      setFullName('');
      setEmail('');
      setPhone('');
      setType('estival');
      setDepartment('Operaciones Agrícolas & Terreno');
      setWorkLocation('Fundo Alto Jahuel');
      setRole('Operario de Temporada');
      setGenderFit('unisex');
      setShirt('L');
      setPants('42');
      setFootwear('42');
      setJacket('L');
      setHeadwear('Legionario UV');
      setContractStart('2026-11-01');
      setContractEnd('2027-03-15');
      setNotes('');
    }
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !rut.trim()) return;

    onSave({
      rut,
      fullName,
      email: email || `${rut.replace(/[^0-9kK]/g, '')}@empresa.com`,
      phone: phone || '+56 9 1234 5678',
      type,
      department,
      workLocation,
      role,
      genderFit,
      sizes: {
        shirt,
        pants,
        footwear,
        jacket,
        headwear,
      },
      surveyStatus: 'completado',
      contractStart,
      contractEnd: type === 'estival' ? contractEnd : undefined,
      deliveryStatus: employeeToEdit ? employeeToEdit.deliveryStatus : 'sin_entregar',
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {employeeToEdit ? 'Editar Colaborador y Tallas' : 'Registrar Colaborador y Tallas'}
              </h2>
              <p className="text-xs text-slate-500">
                Captura completa de información laboral y medidas de uniforme
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
          {/* Section: Tipo de Dotación */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Tipo de Dotación Laboral
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setType('permanente');
                  setHeadwear('Estándar');
                }}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  type === 'permanente'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Planta Permanente</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setType('estival');
                  setHeadwear('Legionario UV');
                }}
                className={`py-2.5 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                  type === 'estival'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span className="text-base leading-none">☀️</span>
                <span>Temporada Estival</span>
              </button>
            </div>
          </div>

          {/* Identification Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RUT / DNI <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="12.345.678-9"
                value={rut}
                onChange={(e) => setRut(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Completo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nombre y Apellidos"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
              <input
                type="email"
                placeholder="correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono / WhatsApp</label>
              <input
                type="text"
                placeholder="+56 9 8765 4321"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Departamento / Área</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Operaciones, Bodega, Terreno..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ubicación / Faena</label>
              <input
                type="text"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                placeholder="Planta Central, Fundo, Sucursal..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cargo / Función</label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="Operario, Chofer, Supervisor..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Corte / Calce</label>
              <select
                value={genderFit}
                onChange={(e) => setGenderFit(e.target.value as GenderFit)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="unisex">Unisex Estándar</option>
                <option value="masculino">Corte Masculino</option>
                <option value="femenino">Corte Femenino (Entallado)</option>
              </select>
            </div>
          </div>

          {/* Sizing Information Section */}
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/70 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
              <Ruler className="w-4 h-4 text-amber-700" />
              <span>Medidas y Tallas para Uniforme</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Polera / Camisa
                </label>
                <select
                  value={shirt}
                  onChange={(e) => setShirt(e.target.value as ShirtSize)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {SHIRT_SIZES.map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Pantalón / Cargo
                </label>
                <select
                  value={pants}
                  onChange={(e) => setPants(e.target.value as PantsSize)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {PANTS_SIZES.map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Calzado Seguridad
                </label>
                <select
                  value={footwear}
                  onChange={(e) => setFootwear(e.target.value as FootwearSize)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {FOOTWEAR_SIZES.map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Chaqueta / Softshell
                </label>
                <select
                  value={jacket}
                  onChange={(e) => setJacket(e.target.value as JacketSize)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
                >
                  {JACKET_SIZES.map((sz) => (
                    <option key={sz} value={sz}>{sz}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Gorro / Protección Cabeza
              </label>
              <select
                value={headwear}
                onChange={(e) => setHeadwear(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold focus:ring-2 focus:ring-amber-500"
              >
                <option value="Legionario UV">Jockey Legionario UV con Cubrenuca (Recomendado Estival)</option>
                <option value="Estándar">Jockey Institucional Estándar</option>
                <option value="Gorro Pescador">Gorro ala ancha 360°</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones (Alergias, calce especial, adaptación de faena)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Requiere empeine ancho en zapato de seguridad..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

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
              {employeeToEdit ? 'Actualizar Ficha' : 'Guardar Colaborador'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
