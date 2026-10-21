import React, { useState, useEffect } from 'react';
import { useUniforms } from '../context/UniformsContext';
import { Employee, UniformDelivery, DeliveryStatus, DeliveryItem } from '../types';
import { X, PackageCheck, User, ShieldCheck, Sun, Check, AlertTriangle } from 'lucide-react';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEmployee?: Employee | null;
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  isOpen,
  onClose,
  preselectedEmployee,
}) => {
  const { employees, addDelivery, addStockEntrega } = useUniforms();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [kitType, setKitType] = useState<'estival' | 'permanente' | 'reposicion'>('estival');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispatcherName, setDispatcherName] = useState('Jorge Henríquez (Bodega Central)');
  const [status, setStatus] = useState<DeliveryStatus>('entregada');
  const [comments, setComments] = useState('');

  // Active employee object
  const currentEmp = employees.find((e) => e.id === selectedEmployeeId) || preselectedEmployee;

  const isFemale = currentEmp
    ? currentEmp.gender?.toLowerCase().includes('mujer') ||
      currentEmp.genderFit === 'femenino' ||
      Boolean(currentEmp.sizes?.blusa && !currentEmp.sizes?.camisa)
    : false;

  const shirtOrBlusaSize = currentEmp
    ? (isFemale ? (currentEmp.sizes?.blusa || currentEmp.sizes?.shirt) : (currentEmp.sizes?.camisa || currentEmp.sizes?.shirt)) || 'L'
    : 'L';
  const pantsSize = currentEmp?.sizes?.pants || '46';
  const parkaSize = currentEmp?.sizes?.parka || currentEmp?.sizes?.jacket || 'L';
  const polarSize = currentEmp?.sizes?.polar || currentEmp?.sizes?.jacket || 'L';
  const sweaterSize = currentEmp?.sizes?.sweater || currentEmp?.sizes?.shirt || 'L';
  const hasCorbata = currentEmp?.sizes?.corbata
    ? currentEmp.sizes.corbata.toLowerCase().includes('si') ||
      (currentEmp.sizes.corbata.toLowerCase().includes('aplica') && !currentEmp.sizes.corbata.toLowerCase().includes('no'))
    : false;

  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedEmployeeId(preselectedEmployee.id);
      setKitType(preselectedEmployee.type === 'estival' ? 'estival' : 'permanente');
    } else if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
      setKitType(employees[0].type === 'estival' ? 'estival' : 'permanente');
    }
  }, [preselectedEmployee, employees, isOpen]);

  // Update kit items based on selected employee sizes and kit type, using REAL inventory garments
  const items: DeliveryItem[] = React.useMemo(() => {
    if (!currentEmp) return [];

    if (kitType === 'estival') {
      return [
        {
          id: 'item-estival-top',
          name: isFemale ? 'Blusa mujer M/C' : 'Camisa hombre M/C',
          size: shirtOrBlusaSize,
          quantity: 1,
          delivered: true,
        },
        {
          id: 'item-estival-pants',
          name: isFemale ? 'Pantalón mujer' : 'Pantalón hombre',
          size: pantsSize,
          quantity: 1,
          delivered: true,
        },
      ];
    } else if (kitType === 'permanente') {
      const permanentItems: DeliveryItem[] = [
        {
          id: 'item-perm-top',
          name: isFemale ? 'Blusa mujer M/L' : 'Camisa hombre M/L',
          size: shirtOrBlusaSize,
          quantity: 1,
          delivered: true,
        },
        {
          id: 'item-perm-pants',
          name: isFemale ? 'Pantalón mujer' : 'Pantalón hombre',
          size: pantsSize,
          quantity: 1,
          delivered: true,
        },
        {
          id: 'item-perm-parka',
          name: 'Parka unisex',
          size: parkaSize,
          quantity: 1,
          delivered: true,
        },
        {
          id: 'item-perm-polar',
          name: isFemale ? 'Polar mujer' : 'Polar hombre',
          size: polarSize,
          quantity: 1,
          delivered: true,
        },
        {
          id: 'item-perm-sweater',
          name: 'Sweater unisex M/L',
          size: sweaterSize,
          quantity: 1,
          delivered: true,
        },
      ];

      if (hasCorbata) {
        permanentItems.push({
          id: 'item-perm-tie',
          name: 'Corbata',
          size: 'Estándar',
          quantity: 1,
          delivered: true,
        });
      }

      return permanentItems;
    } else {
      // Reposición / Cambio
      return [
        {
          id: 'item-rep-1',
          name: isFemale ? 'Blusa mujer M/C' : 'Camisa hombre M/C',
          size: shirtOrBlusaSize,
          quantity: 1,
          delivered: true,
          notes: 'Ajuste / Reposición',
        },
      ];
    }
  }, [currentEmp, kitType, isFemale, shirtOrBlusaSize, pantsSize, parkaSize, polarSize, sweaterSize, hasCorbata]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp) return;

    const kitTitleMap = {
      estival: 'Kit Estival (Camisa/Blusa M/C + Pantalón)',
      permanente: `Kit Planta Permanente (M/L, Pantalón, Parka, Polar, Sweater${items.some((i) => i.name === 'Corbata') ? ', Corbata' : ''})`,
      reposicion: 'Kit Reposición y Cambio de Prenda',
    };

    addDelivery({
      employeeId: currentEmp.id,
      employeeName: currentEmp.fullName,
      employeeRut: currentEmp.rut,
      employeeType: currentEmp.type,
      department: currentEmp.department,
      workLocation: currentEmp.workLocation,
      kitName: kitTitleMap[kitType],
      items,
      status,
      deliveryDate,
      dispatcherName,
      receiverSignature: 'Entrega Registrada en Bodega',
      signedAt: status === 'entregada' ? `${deliveryDate} 10:30` : undefined,
      comments,
    });

    // Synchronize deduction in real-time inventory and movement book
    if (status === 'entregada') {
      items.forEach((item) => {
        if (item.delivered) {
          const cat = item.name.toLowerCase().includes('pantalón')
            ? 'inferior'
            : item.name.toLowerCase().includes('parka') || item.name.toLowerCase().includes('polar') || item.name.toLowerCase().includes('sweater')
            ? 'abrigo'
            : item.name.toLowerCase().includes('corbata')
            ? 'proteccion'
            : 'superior';

          addStockEntrega({
            garmentName: item.name,
            category: cat,
            size: item.size,
            quantity: item.quantity,
            documentRef: `Acta-ENT-${currentEmp.rut.split('-')[0]}`,
            employeeId: currentEmp.id,
            employeeName: `${currentEmp.fullName} (RUT ${currentEmp.rut})`,
            responsible: dispatcherName,
            notes: `Entrega de dotación ${kitTitleMap[kitType]}`,
            company: currentEmp.company,
          });
        }
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Registrar Entrega de Uniforme
              </h2>
              <p className="text-xs text-slate-500">
                Entrega física en bodega o faena con comprobante
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Colaborador Receptor <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  const found = employees.find((emp) => emp.id === e.target.value);
                  if (found) {
                    setKitType(found.type === 'estival' ? 'estival' : 'permanente');
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.rut}) - {emp.type === 'estival' ? 'Estival' : 'Permanente'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Kit a Entregar
              </label>
              <select
                value={kitType}
                onChange={(e) => setKitType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
              >
                <option value="estival">Kit Estival (Camisa/Blusa M/C + Pantalón)</option>
                <option value="permanente">Kit Planta Permanente (Camisa/Blusa M/L, Pantalón, Parka, Polar, Sweater, Corbata)</option>
                <option value="reposicion">Reposición / Cambio de Prenda Individual</option>
              </select>
            </div>
          </div>

          {/* Worker Info Card */}
          {currentEmp && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900">{currentEmp.fullName}</span>
                <p className="text-slate-500 text-[11px]">
                  {currentEmp.workLocation} • {currentEmp.department} • <span className="font-semibold text-slate-700">{isFemale ? 'Femenino' : 'Masculino'}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                  {isFemale ? 'Blusa' : 'Camisa'}: <strong>{shirtOrBlusaSize}</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                  Pantalón: <strong>{pantsSize}</strong>
                </span>
                {kitType === 'permanente' && (
                  <>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                      Parka: <strong>{parkaSize}</strong>
                    </span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                      Polar: <strong>{polarSize}</strong>
                    </span>
                    <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                      Sweater: <strong>{sweaterSize}</strong>
                    </span>
                    {hasCorbata && (
                      <span className="bg-amber-50 text-amber-900 px-2 py-1 rounded border border-amber-200 font-mono text-[11px]">
                        Corbata: <strong>Aplica</strong>
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Pre-packaged Items List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100/80 px-3.5 py-2 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
              <span>Detalle de Prendas Incluidas en la Entrega</span>
              <span className="text-[11px] text-slate-500 lowercase font-normal">
                {items.length} ítems en este kit
              </span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              {items.map((it, idx) => (
                <div key={idx} className="px-3.5 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-bold">
                      {it.quantity}
                    </span>
                    <span className="font-medium text-slate-800">{it.name}</span>
                  </div>
                  <span className="font-bold bg-slate-100 px-2.5 py-0.5 rounded text-slate-700 border border-slate-200">
                    Talla: {it.size}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status, Date & Dispatcher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-semibold"
              >
                <option value="entregada">Entregada Conforme</option>
                <option value="requiere_cambio">Requiere Cambio de Talla</option>
                <option value="programada">Programada para Faena</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha de Entrega</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Despachador / Bodega</label>
              <input
                type="text"
                value={dispatcherName}
                onChange={(e) => setDispatcherName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones de Entrega o Solicitud de Cambio
            </label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ej: Calzado entregado conforme, probado con calcetín térmico..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg"
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
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-all shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Confirmar y Guardar Entrega</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
