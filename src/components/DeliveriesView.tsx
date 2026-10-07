import React, { useState } from 'react';
import { useUniforms } from '../context/UniformsContext';
import { UniformDelivery, DeliveryStatus } from '../types';
import { DeliveryModal } from './DeliveryModal';
import {
  PackageCheck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileText,
  User,
  Shield,
  Sun,
  X,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { exportDeliveriesToDrive } from '../services/googleDriveService';
import { hasActiveDriveToken } from '../services/authService';

export const DeliveriesView: React.FC = () => {
  const { deliveries, updateDeliveryStatus } = useUniforms();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('todos');
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [isNewDeliveryOpen, setIsNewDeliveryOpen] = useState(false);

  // Selected delivery for printable voucher modal
  const [selectedVoucher, setSelectedVoucher] = useState<UniformDelivery | null>(null);

  const [isExportingDrive, setIsExportingDrive] = useState(false);
  const [driveExportSuccess, setDriveExportSuccess] = useState<string | null>(null);

  const handleExportDrive = async () => {
    if (!hasActiveDriveToken()) {
      alert('Por favor conecte su cuenta en la pestaña "Google Drive" para sincronizar las actas.');
      return;
    }
    setIsExportingDrive(true);
    setDriveExportSuccess(null);
    try {
      const res = await exportDeliveriesToDrive(deliveries);
      setDriveExportSuccess(`Actas de despacho guardadas en Google Drive: ${res.name}`);
      setTimeout(() => setDriveExportSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al guardar en Google Drive');
    } finally {
      setIsExportingDrive(false);
    }
  };

  const filteredDeliveries = deliveries.filter((del) => {
    const matchesSearch =
      del.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.employeeRut.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.deliveryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      del.kitName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'todos' || del.status === selectedStatus;
    const matchesType = selectedType === 'todos' || del.employeeType === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const deliveredCount = deliveries.filter((d) => d.status === 'entregada').length;
  const changeCount = deliveries.filter((d) => d.status === 'requiere_cambio').length;
  const scheduledCount = deliveries.filter((d) => d.status === 'programada').length;

  return (
    <div className="space-y-5">
      {/* Drive Alert */}
      {driveExportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{driveExportSuccess}</span>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-display">
            Administración y Control de Entregas
          </h1>
          <p className="text-xs text-slate-500">
            Registro de recepción de kits, comprobantes firmados y gestión de cambios de talla
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-deliveries-drive"
            onClick={handleExportDrive}
            disabled={isExportingDrive}
            title="Guardar actas en Google Drive"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-semibold transition-colors shadow-2xs disabled:opacity-50"
          >
            {isExportingDrive ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-700 animate-spin" />
            ) : (
              <HardDrive className="w-3.5 h-3.5 text-amber-600" />
            )}
            <span>Guardar en Drive</span>
          </button>

          <button
            id="btn-new-delivery"
            onClick={() => setIsNewDeliveryOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nueva Entrega</span>
          </button>
        </div>
      </div>

      {/* KPI stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Entregadas Conforme
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{deliveredCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Cambios de Talla Solicitados
            </span>
            <p className="text-xl font-bold text-rose-600 mt-1">{changeCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Entregas Programadas
            </span>
            <p className="text-xl font-bold text-blue-600 mt-1">{scheduledCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código de entrega, trabajador o RUT..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="todos">Estado: Todos</option>
            <option value="entregada">Entregada Conforme</option>
            <option value="requiere_cambio">Requiere Cambio</option>
            <option value="programada">Programada</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
          >
            <option value="todos">Tipo: Todos</option>
            <option value="permanente">Permanente</option>
            <option value="estival">Temporada Estival</option>
          </select>
        </div>
      </div>

      {/* Deliveries List */}
      <div className="space-y-3">
        {filteredDeliveries.map((del) => (
          <div
            key={del.id}
            className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold ${
                    del.status === 'entregada'
                      ? 'bg-emerald-50 text-emerald-700'
                      : del.status === 'requiere_cambio'
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-blue-50 text-blue-700'
                  }`}
                >
                  <PackageCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{del.employeeName}</span>
                    <span className="font-mono text-xs text-slate-500">({del.employeeRut})</span>
                    {del.employeeType === 'estival' ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 text-[10px] font-semibold border border-amber-200">
                        <Sun className="w-3 h-3 text-amber-600" /> Estival
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-semibold border border-slate-200">
                        <Shield className="w-3 h-3 text-slate-600" /> Permanente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {del.kitName} • Código: <strong className="font-mono text-slate-700">{del.deliveryCode}</strong> • Fecha: {del.deliveryDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Status Badge */}
                {del.status === 'entregada' && (
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Entregada Conforme
                  </span>
                )}
                {del.status === 'requiere_cambio' && (
                  <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Requiere Cambio de Talla
                  </span>
                )}
                {del.status === 'programada' && (
                  <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Programada
                  </span>
                )}

                {/* View Voucher Button */}
                <button
                  onClick={() => setSelectedVoucher(del)}
                  className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ver Acta / Comprobante</span>
                </button>
              </div>
            </div>

            {/* Items Included */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600 text-[11px] uppercase tracking-wider">
                Prendas Entregadas:
              </span>
              {del.items.map((it, idx) => (
                <span
                  key={idx}
                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] border ${
                    it.delivered
                      ? 'bg-slate-50 text-slate-800 border-slate-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <span className="font-medium">{it.name}</span>
                  <strong className="bg-white px-1.5 py-0.2 rounded border border-slate-200 font-mono">
                    {it.size}
                  </strong>
                  <span className="text-slate-400 font-mono">x{it.quantity}</span>
                  {it.notes && <span className="text-rose-600 font-medium">({it.notes})</span>}
                </span>
              ))}
            </div>

            {/* Comments & Resolver for size exchange */}
            {del.comments && (
              <div className="mt-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200/70 flex items-center justify-between">
                <span>
                  <strong>Observación / Despachador:</strong> {del.comments} ({del.dispatcherName})
                </span>
                {del.status === 'requiere_cambio' && (
                  <button
                    onClick={() => updateDeliveryStatus(del.id, 'entregada', 'Cambio de talla resuelto satisfactoriamente')}
                    className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-0.5 rounded transition-colors"
                  >
                    Marcar Cambio Resuelto
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {filteredDeliveries.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            No se registran entregas que coincidan con la búsqueda.
          </div>
        )}
      </div>

      {/* Printable Receipt / Voucher Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Comprobante de Entrega de Uniforme y EPP
                </h3>
              </div>
              <button
                onClick={() => setSelectedVoucher(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Body */}
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3 text-xs">
              <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">ACTA DE RECEPCIÓN CONFORME</h4>
                  <p className="text-[11px] text-slate-500">
                    Código: <span className="font-mono font-bold text-slate-800">{selectedVoucher.deliveryCode}</span>
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <p>Fecha: <strong>{selectedVoucher.deliveryDate}</strong></p>
                  <p>Lugar: {selectedVoucher.workLocation}</p>
                </div>
              </div>

              {/* Worker info */}
              <div className="grid grid-cols-2 gap-2 text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Trabajador</span>
                  <span className="font-bold">{selectedVoucher.employeeName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">RUT</span>
                  <span className="font-mono font-bold">{selectedVoucher.employeeRut}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Dotación</span>
                  <span className="capitalize">{selectedVoucher.employeeType}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Departamento</span>
                  <span>{selectedVoucher.department}</span>
                </div>
              </div>

              {/* Items */}
              <div>
                <p className="font-bold text-slate-800 mb-1.5">Prendas y Elementos Recibidos:</p>
                <table className="w-full bg-white border border-slate-200 rounded-lg overflow-hidden text-[11px]">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="py-1.5 px-2 text-left">Prenda</th>
                      <th className="py-1.5 px-2 text-center">Talla</th>
                      <th className="py-1.5 px-2 text-center">Cant.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedVoucher.items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1.5 px-2">{it.name}</td>
                        <td className="py-1.5 px-2 text-center font-bold">{it.size}</td>
                        <td className="py-1.5 px-2 text-center font-mono">{it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Legal confirmation notice */}
              <p className="text-[10px] text-slate-400 leading-tight">
                El trabajador declara recibir a entera conformidad las prendas descritas en su talla correspondiente, comprometiéndose a su uso exclusivo durante la jornada laboral según la normativa de seguridad y prevención de riesgos.
              </p>

              {/* Signature display */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400">Entregado por:</p>
                  <p className="font-medium text-slate-800">{selectedVoucher.dispatcherName}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400">Firma del Trabajador:</p>
                  {selectedVoucher.receiverSignature ? (
                    <img
                      src={selectedVoucher.receiverSignature}
                      alt="Firma"
                      className="h-10 border-b border-slate-400 inline-block mt-0.5"
                    />
                  ) : (
                    <span className="text-[11px] italic text-slate-400">[Firma física pendiente]</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setSelectedVoucher(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir Acta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Delivery Modal */}
      <DeliveryModal
        isOpen={isNewDeliveryOpen}
        onClose={() => setIsNewDeliveryOpen(false)}
      />
    </div>
  );
};
