import React, { useState, useRef, useEffect } from 'react';
import { useUniforms } from '../context/UniformsContext';
import { Employee, UniformDelivery, DeliveryStatus, DeliveryItem } from '../types';
import { X, PackageCheck, User, ShieldCheck, Sun, Check, AlertTriangle, PenTool, RotateCcw } from 'lucide-react';

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
  const { employees, addDelivery } = useUniforms();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [kitType, setKitType] = useState<'estival' | 'permanente' | 'reposicion'>('estival');
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [dispatcherName, setDispatcherName] = useState('Jorge Henríquez (Bodega Central)');
  const [status, setStatus] = useState<DeliveryStatus>('entregada');
  const [comments, setComments] = useState('');

  // Signature canvas
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  // Active employee object
  const currentEmp = employees.find((e) => e.id === selectedEmployeeId) || preselectedEmployee;

  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedEmployeeId(preselectedEmployee.id);
      setKitType(preselectedEmployee.type === 'estival' ? 'estival' : 'permanente');
    } else if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
      setKitType(employees[0].type === 'estival' ? 'estival' : 'permanente');
    }
  }, [preselectedEmployee, employees, isOpen]);

  // Update kit items based on selected employee sizes and kit type
  const items: DeliveryItem[] = React.useMemo(() => {
    if (!currentEmp) return [];

    if (kitType === 'estival') {
      return [
        { id: 'item-1', name: 'Polera Dry-Fit Protección UV +50', size: currentEmp.sizes.shirt, quantity: 2, delivered: true },
        { id: 'item-2', name: 'Pantalón Cargo Ripstop Liviano', size: currentEmp.sizes.pants, quantity: 2, delivered: true },
        { id: 'item-3', name: 'Zapato de Seguridad Liviano', size: currentEmp.sizes.footwear, quantity: 1, delivered: true },
        { id: 'item-4', name: 'Jockey Legionario Cubrenuca UV', size: currentEmp.sizes.headwear, quantity: 1, delivered: true },
      ];
    } else if (kitType === 'permanente') {
      return [
        { id: 'item-1', name: 'Camisa Institucional / Polera Piqué', size: currentEmp.sizes.shirt, quantity: 3, delivered: true },
        { id: 'item-2', name: 'Pantalón Cargo Reforzado', size: currentEmp.sizes.pants, quantity: 2, delivered: true },
        { id: 'item-3', name: 'Chaqueta Softshell Térmica', size: currentEmp.sizes.jacket, quantity: 1, delivered: true },
        { id: 'item-4', name: 'Zapato de Seguridad Dieléctrico', size: currentEmp.sizes.footwear, quantity: 1, delivered: true },
        { id: 'item-5', name: 'Jockey Institucional', size: currentEmp.sizes.headwear, quantity: 1, delivered: true },
      ];
    } else {
      // Reposición / Cambio
      return [
        { id: 'item-rep-1', name: 'Pantalón Cargo Recambio', size: currentEmp.sizes.pants, quantity: 1, delivered: true, notes: 'Ajuste de talla' },
      ];
    }
  }, [currentEmp, kitType]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp) return;

    let sigData = '';
    if (canvasRef.current && hasSignature) {
      sigData = canvasRef.current.toDataURL('image/png');
    } else {
      // Fallback digital acknowledgment
      sigData = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40"><text x="10" y="25" font-family="sans-serif" font-size="12" fill="%230f172a">Firma Digital Registrada</text></svg>';
    }

    const kitTitleMap = {
      estival: 'Kit Estival 2026-2027 (Protección UV)',
      permanente: 'Kit Planta Permanente 2026',
      reposicion: 'Kit Reposición y Cambio de Talla',
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
      receiverSignature: sigData,
      signedAt: status === 'entregada' ? `${deliveryDate} 10:30` : undefined,
      comments,
    });

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
                Entrega física en bodega o faena con comprobante y firma
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
                <option value="estival">Kit Estival (Polera UV, Cargo Liviano, Calzado, Legionario)</option>
                <option value="permanente">Kit Planta Permanente (Camisas, Cargo, Softshell, Calzado)</option>
                <option value="reposicion">Reposición / Cambio de Talla</option>
              </select>
            </div>
          </div>

          {/* Worker Info Card */}
          {currentEmp && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900">{currentEmp.fullName}</span>
                <p className="text-slate-500 text-[11px]">
                  {currentEmp.workLocation} • {currentEmp.department}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                  Polera: <strong>{currentEmp.sizes.shirt}</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                  Pantalón: <strong>{currentEmp.sizes.pants}</strong>
                </span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200 font-mono text-[11px]">
                  Calzado: <strong>{currentEmp.sizes.footwear}</strong>
                </span>
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

          {/* Digital Signature Canvas */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                <PenTool className="w-3.5 h-3.5 text-slate-500" />
                <span>Firma de Recepción Conforme del Trabajador</span>
              </div>
              <button
                type="button"
                onClick={clearSignature}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Limpiar firma
              </button>
            </div>
            <div className="border border-dashed border-slate-300 rounded-lg bg-white overflow-hidden touch-none">
              <canvas
                ref={canvasRef}
                width={500}
                height={100}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-24 cursor-crosshair block"
              />
            </div>
            <p className="text-[10px] text-slate-400 text-center">
              Firma con el mouse o dedo en pantalla touch para confirmar recepción
            </p>
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
