import React, { useState, useEffect, useMemo } from 'react';
import { useUniforms } from '../context/UniformsContext';
import { Employee, DeliveryStatus, DeliveryItem } from '../types';
import {
  X,
  PackageCheck,
  Check,
  RefreshCw,
  PackagePlus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertCircle,
  Shirt,
  Info,
} from 'lucide-react';

interface DeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedEmployee?: Employee | null;
  initialKitType?: 'estival' | 'permanente' | 'reposicion';
}

export const DeliveryModal: React.FC<DeliveryModalProps> = ({
  isOpen,
  onClose,
  preselectedEmployee,
  initialKitType,
}) => {
  const {
    employees,
    inventory,
    inventoryMatrix,
    addDelivery,
    addStockEntrega,
    addStockIngreso,
    updateEmployee,
  } = useUniforms();

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [kitType, setKitType] = useState<'estival' | 'permanente' | 'reposicion'>('estival');

  // Sub-mode when kitType === 'reposicion'
  const [individualMode, setIndividualMode] = useState<'reposicion' | 'cambio'>('reposicion');

  // State for Reposición individual (Entrega directa)
  const [repGarment, setRepGarment] = useState('Camisa hombre M/C');
  const [repSize, setRepSize] = useState('L');
  const [repQuantity, setRepQuantity] = useState(1);
  const [repReason, setRepReason] = useState('Reposición por desgaste natural');

  // State for Cambio de Prenda (Devolución + Entrega de reemplazo)
  const [returnGarment, setReturnGarment] = useState('Camisa hombre M/C');
  const [returnSize, setReturnSize] = useState('L');
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('Talla chica (requiere cambio)');

  const [deliverGarment, setDeliverGarment] = useState('Camisa hombre M/C');
  const [deliverSize, setDeliverSize] = useState('XL');
  const [deliverQuantity, setDeliverQuantity] = useState(1);
  const [updateWorkerProfileSize, setUpdateWorkerProfileSize] = useState(true);

  // Delivery metadata
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

  // Determine helper category from garment name
  const getGarmentCategory = (name: string): 'superior' | 'inferior' | 'calzado' | 'abrigo' | 'proteccion' => {
    const low = name.toLowerCase();
    if (low.includes('pantalón') || low.includes('pantalon')) return 'inferior';
    if (low.includes('zapato') || low.includes('calzado') || low.includes('bota')) return 'calzado';
    if (low.includes('parka') || low.includes('polar') || low.includes('sweater') || low.includes('chaqueta') || low.includes('abrigo') || low.includes('softshell')) return 'abrigo';
    if (low.includes('corbata') || low.includes('epp')) return 'proteccion';
    return 'superior';
  };

  // Get worker's registered size for a given garment name
  const getWorkerRegisteredSize = (garmentName: string, emp: Employee | null | undefined): string => {
    if (!emp || !emp.sizes) return 'L';
    const low = garmentName.toLowerCase();
    if (low.includes('pantalón') || low.includes('pantalon')) return emp.sizes.pants || '44';
    if (low.includes('zapato') || low.includes('calzado')) return emp.sizes.footwear || '42';
    if (low.includes('parka')) return emp.sizes.parka || emp.sizes.jacket || 'L';
    if (low.includes('polar')) return emp.sizes.polar || emp.sizes.jacket || 'L';
    if (low.includes('sweater')) return emp.sizes.sweater || emp.sizes.shirt || 'L';
    if (low.includes('blusa')) return emp.sizes.blusa || emp.sizes.shirt || 'M';
    if (low.includes('camisa')) return emp.sizes.camisa || emp.sizes.shirt || 'L';
    return emp.sizes.shirt || 'L';
  };

  // Catalog of all available garments in the company (strictly official tables)
  const availableGarments = useMemo(() => {
    const base = [
      'Camisa hombre M/C',
      'Camisa hombre M/L',
      'Blusa mujer M/C',
      'Blusa mujer M/L',
      'Pantalón hombre',
      'Pantalón mujer',
      'Parka unisex',
      'Polar mujer',
      'Polar hombre',
      'Sweater unisex M/L',
      'Sweater unisex M/C',
      'Corbata',
    ];

    const fromInv = inventory.map((i) => i.name);
    const fromMatrix = inventoryMatrix.map((m) => m.garmentName);
    const set = new Set([...base, ...fromInv, ...fromMatrix]);
    return Array.from(set)
      .filter(Boolean)
      .filter((name) => !/jockey|dry-fit|dry fit|cargo/i.test(name));
  }, [inventory, inventoryMatrix]);

  // Helper to fetch size options & stock for a specific garment
  const getGarmentSizeOptions = (garmentName: string) => {
    const stockMap = new Map<string, number>();

    inventory
      .filter((i) => i.name.toLowerCase() === garmentName.toLowerCase())
      .forEach((i) => {
        stockMap.set(i.size, (stockMap.get(i.size) || 0) + i.currentStock);
      });

    inventoryMatrix
      .filter((m) => m.garmentName.toLowerCase() === garmentName.toLowerCase())
      .forEach((m) => {
        Object.entries(m.sizes || {}).forEach(([sz, qty]) => {
          if (!stockMap.has(sz)) {
            stockMap.set(sz, Number(qty || 0));
          }
        });
      });

    const cat = getGarmentCategory(garmentName);
    const standardFallback =
      cat === 'inferior'
        ? ['38', '40', '42', '44', '46', '48', '50', '52', '54', '56']
        : cat === 'calzado'
        ? ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46']
        : cat === 'proteccion'
        ? ['Estándar', 'Única']
        : ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];

    standardFallback.forEach((sz) => {
      if (!stockMap.has(sz)) stockMap.set(sz, 0);
    });

    return Array.from(stockMap.entries()).map(([size, stock]) => ({
      size,
      stock,
    }));
  };

  // Sync initial values on open or employee change
  useEffect(() => {
    if (preselectedEmployee) {
      setSelectedEmployeeId(preselectedEmployee.id);
      if (initialKitType) {
        setKitType(initialKitType);
      } else {
        setKitType(preselectedEmployee.type === 'estival' ? 'estival' : 'permanente');
      }
    } else if (employees.length > 0 && !selectedEmployeeId) {
      setSelectedEmployeeId(employees[0].id);
      if (initialKitType) {
        setKitType(initialKitType);
      } else {
        setKitType(employees[0].type === 'estival' ? 'estival' : 'permanente');
      }
    }
  }, [preselectedEmployee, employees, isOpen, initialKitType]);

  // Adjust default garment and sizes according to active employee gender and registered sizes
  useEffect(() => {
    if (currentEmp) {
      const defaultShirt = isFemale ? 'Blusa mujer M/C' : 'Camisa hombre M/C';
      setRepGarment(defaultShirt);
      setRepSize(getWorkerRegisteredSize(defaultShirt, currentEmp));

      setReturnGarment(defaultShirt);
      setReturnSize(getWorkerRegisteredSize(defaultShirt, currentEmp));

      setDeliverGarment(defaultShirt);
      // Give next size as default suggestion for delivery in change (e.g. L -> XL, or 44 -> 46)
      const currentRegistered = getWorkerRegisteredSize(defaultShirt, currentEmp);
      const sizes = getGarmentSizeOptions(defaultShirt);
      const curIndex = sizes.findIndex((s) => s.size === currentRegistered);
      const nextSize = curIndex >= 0 && curIndex + 1 < sizes.length ? sizes[curIndex + 1].size : currentRegistered;
      setDeliverSize(nextSize);
    }
  }, [selectedEmployeeId, isFemale]);

  // Items for standard kits
  const standardKitItems: DeliveryItem[] = useMemo(() => {
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
    }
    return [];
  }, [currentEmp, kitType, isFemale, shirtOrBlusaSize, pantsSize, parkaSize, polarSize, sweaterSize, hasCorbata]);

  if (!isOpen) return null;

  // Options for sizes of currently selected garments
  const repGarmentSizes = getGarmentSizeOptions(repGarment);
  const returnGarmentSizes = getGarmentSizeOptions(returnGarment);
  const deliverGarmentSizes = getGarmentSizeOptions(deliverGarment);

  const selectedDeliverStock = deliverGarmentSizes.find((s) => s.size === deliverSize)?.stock ?? 0;
  const selectedRepStock = repGarmentSizes.find((s) => s.size === repSize)?.stock ?? 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmp) return;

    const rutClean = currentEmp.rut ? currentEmp.rut.split('-')[0].replace(/\./g, '') : currentEmp.id;

    // CASE 1: REPOSICIÓN INDIVIDUAL O CAMBIO DE PRENDA
    if (kitType === 'reposicion') {
      if (individualMode === 'reposicion') {
        // --- REPOSICIÓN DIRECTA (ENTREGA) ---
        addStockEntrega({
          garmentName: repGarment,
          category: getGarmentCategory(repGarment),
          size: repSize,
          quantity: repQuantity,
          documentRef: `REP-${rutClean}`,
          employeeId: currentEmp.id,
          employeeName: `${currentEmp.fullName} (RUT ${currentEmp.rut})`,
          responsible: dispatcherName,
          notes: `Reposición de prenda individual: ${repReason}`,
          company: currentEmp.company,
        });

        addDelivery({
          employeeId: currentEmp.id,
          employeeName: currentEmp.fullName,
          employeeRut: currentEmp.rut,
          employeeType: currentEmp.type,
          department: currentEmp.department,
          workLocation: currentEmp.workLocation,
          kitName: `Reposición: ${repGarment} (Talla ${repSize})`,
          items: [
            {
              id: `rep-${Date.now()}`,
              name: repGarment,
              size: repSize,
              quantity: repQuantity,
              delivered: true,
              notes: repReason,
            },
          ],
          status,
          deliveryDate,
          dispatcherName,
          receiverSignature: 'Entrega de reposición firmada conforme',
          signedAt: status === 'entregada' ? `${deliveryDate} 10:30` : undefined,
          comments: `Reposición individual de ${repQuantity} unidad(es) de ${repGarment} talla ${repSize}. Motivo: ${repReason}. ${comments}`,
        });
      } else {
        // --- CAMBIO DE PRENDA: DEVOLUCIÓN (INGRESO) + ENTREGA DE REEMPLAZO (ENTREGA) ---

        // 1. Registrar como INGRESO la prenda que devuelve el trabajador
        addStockIngreso({
          garmentName: returnGarment,
          category: getGarmentCategory(returnGarment),
          size: returnSize,
          quantity: returnQuantity,
          documentRef: `DEV-CAMBIO-${rutClean}`,
          supplier: `${currentEmp.fullName} (RUT ${currentEmp.rut}) - Devolución de Trabajador`,
          responsible: dispatcherName,
          notes: `Devolución por cambio de prenda: ${returnReason} (Talla devuelta: ${returnSize})`,
          company: currentEmp.company,
        });

        // 2. Registrar como ENTREGA la prenda nueva que se le entrega al trabajador
        addStockEntrega({
          garmentName: deliverGarment,
          category: getGarmentCategory(deliverGarment),
          size: deliverSize,
          quantity: deliverQuantity,
          documentRef: `ENT-CAMBIO-${rutClean}`,
          employeeId: currentEmp.id,
          employeeName: `${currentEmp.fullName} (RUT ${currentEmp.rut})`,
          responsible: dispatcherName,
          notes: `Entrega por cambio de prenda: entrega de ${deliverGarment} talla ${deliverSize} a cambio de ${returnGarment} talla ${returnSize} (${returnReason})`,
          company: currentEmp.company,
        });

        // 3. Si se marcó actualizar la talla en la ficha del trabajador
        if (updateWorkerProfileSize) {
          const cat = getGarmentCategory(deliverGarment);
          const low = deliverGarment.toLowerCase();
          const currentSizes = { ...(currentEmp.sizes || {}) };

          if (low.includes('pantalón') || low.includes('pantalon') || cat === 'inferior') {
            currentSizes.pants = deliverSize;
          } else if (low.includes('calzado') || low.includes('zapato') || cat === 'calzado') {
            currentSizes.footwear = deliverSize;
          } else if (low.includes('parka')) {
            currentSizes.parka = deliverSize;
            currentSizes.jacket = deliverSize;
          } else if (low.includes('polar')) {
            currentSizes.polar = deliverSize;
          } else if (low.includes('sweater')) {
            currentSizes.sweater = deliverSize;
          } else if (low.includes('blusa')) {
            currentSizes.blusa = deliverSize;
            currentSizes.shirt = deliverSize;
          } else if (low.includes('camisa') || low.includes('polera') || cat === 'superior') {
            currentSizes.camisa = deliverSize;
            currentSizes.shirt = deliverSize;
          }

          updateEmployee(currentEmp.id, {
            sizes: currentSizes,
            lastDeliveryDate: deliveryDate,
          });
        }

        // 4. Registrar en el historial de entregas
        addDelivery({
          employeeId: currentEmp.id,
          employeeName: currentEmp.fullName,
          employeeRut: currentEmp.rut,
          employeeType: currentEmp.type,
          department: currentEmp.department,
          workLocation: currentEmp.workLocation,
          kitName: `Cambio de Prenda: Devuelve ${returnGarment} (${returnSize}) ➔ Recibe ${deliverGarment} (${deliverSize})`,
          items: [
            {
              id: `item-dev-${Date.now()}`,
              name: `(Devuelta a Bodega) ${returnGarment}`,
              size: returnSize,
              quantity: returnQuantity,
              delivered: false,
              notes: `Prenda devuelta: ${returnReason}`,
            },
            {
              id: `item-ent-${Date.now()}`,
              name: `(Nueva Entrega) ${deliverGarment}`,
              size: deliverSize,
              quantity: deliverQuantity,
              delivered: true,
              notes: `Entregada por cambio`,
            },
          ],
          status,
          deliveryDate,
          dispatcherName,
          receiverSignature: 'Cambio de prenda realizado y firmado conforme',
          signedAt: status === 'entregada' ? `${deliveryDate} 10:30` : undefined,
          comments: `Cambio de prenda realizado con éxito. Devuelve ${returnGarment} talla ${returnSize} (motivo: ${returnReason}) y recibe ${deliverGarment} talla ${deliverSize}. ${comments}`,
        });
      }
    } else {
      // CASE 2: KITS ESTÁNDAR (ESTIVAL / PLANTA PERMANENTE)
      const kitTitleMap = {
        estival: 'Kit Estival (Camisa/Blusa M/C + Pantalón)',
        permanente: `Kit Planta Permanente (M/L, Pantalón, Parka, Polar, Sweater${standardKitItems.some((i) => i.name === 'Corbata') ? ', Corbata' : ''})`,
        reposicion: 'Reposición / Cambio de Prenda Individual',
      };

      addDelivery({
        employeeId: currentEmp.id,
        employeeName: currentEmp.fullName,
        employeeRut: currentEmp.rut,
        employeeType: currentEmp.type,
        department: currentEmp.department,
        workLocation: currentEmp.workLocation,
        kitName: kitTitleMap[kitType],
        items: standardKitItems,
        status,
        deliveryDate,
        dispatcherName,
        receiverSignature: 'Entrega Registrada en Bodega',
        signedAt: status === 'entregada' ? `${deliveryDate} 10:30` : undefined,
        comments,
      });

      if (status === 'entregada') {
        standardKitItems.forEach((item) => {
          if (item.delivered) {
            addStockEntrega({
              garmentName: item.name,
              category: getGarmentCategory(item.name),
              size: item.size,
              quantity: item.quantity,
              documentRef: `Acta-ENT-${rutClean}`,
              employeeId: currentEmp.id,
              employeeName: `${currentEmp.fullName} (RUT ${currentEmp.rut})`,
              responsible: dispatcherName,
              notes: `Entrega de dotación ${kitTitleMap[kitType]}`,
              company: currentEmp.company,
            });
          }
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-6 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                {kitType === 'reposicion'
                  ? individualMode === 'cambio'
                    ? 'Cambio de Prenda / Talla de Uniforme'
                    : 'Reposición Individual de Prenda'
                  : 'Registrar Entrega de Dotación'}
              </h2>
              <p className="text-xs text-slate-500">
                Control de bodega para dotación estival, permanente, reposiciones y cambios
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Employee & Mode Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Colaborador <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => {
                  setSelectedEmployeeId(e.target.value);
                  const found = employees.find((emp) => emp.id === e.target.value);
                  if (found && kitType !== 'reposicion') {
                    setKitType(found.type === 'estival' ? 'estival' : 'permanente');
                  }
                }}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium bg-slate-50/50"
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
                Tipo de Operación de Dotación
              </label>
              <select
                value={kitType}
                onChange={(e) => setKitType(e.target.value as any)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-semibold bg-slate-50/50 text-slate-900"
              >
                <option value="estival">Kit Estival Completo (Camisa/Blusa M/C + Pantalón)</option>
                <option value="permanente">Kit Planta Permanente (M/L, Pantalón, Parka, Polar, Sweater)</option>
                <option value="reposicion">🔄 Reposición / Cambio de Prenda Individual</option>
              </select>
            </div>
          </div>

          {/* Worker Info Pill */}
          {currentEmp && (
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900">{currentEmp.fullName}</span>
                <p className="text-slate-500 text-[11px]">
                  {currentEmp.company || 'General'} • {currentEmp.workLocation} • {currentEmp.department} •{' '}
                  <span className="font-semibold text-slate-700">{isFemale ? 'Femenino' : 'Masculino'}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                  {isFemale ? 'Blusa' : 'Camisa'}: <strong>{shirtOrBlusaSize}</strong>
                </span>
                <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                  Pantalón: <strong>{pantsSize}</strong>
                </span>
                {currentEmp.sizes.footwear && (
                  <span className="bg-white px-2 py-0.5 rounded border border-slate-200">
                    Calzado: <strong>{currentEmp.sizes.footwear}</strong>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CASE A: REPOSICIÓN / CAMBIO DE PRENDA INDIVIDUAL          */}
          {/* ======================================================== */}
          {kitType === 'reposicion' && (
            <div className="space-y-4 pt-1">
              {/* Sub-mode Tabs: Reposición Directa vs Cambio de Prenda */}
              <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setIndividualMode('reposicion')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    individualMode === 'reposicion'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <PackagePlus className="w-4 h-4 text-emerald-600" />
                  <span>1. Reposición (Entrega directa)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIndividualMode('cambio')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    individualMode === 'cambio'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                  <span>2. Cambio de Prenda (Devolución + Entrega)</span>
                </button>
              </div>

              {/* ---------------------------------------------------- */}
              {/* SUBMODE 1: REPOSICIÓN INDIVIDUAL (SOLO ENTREGA)      */}
              {/* ---------------------------------------------------- */}
              {individualMode === 'reposicion' && (
                <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                        <ArrowUpRight className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">
                          Prenda a Entregar al Trabajador (Salida de Bodega)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Se descontará del stock disponible y se registrará como ENTREGA
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase">
                      Entrega
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Prenda */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Prenda a Reponer
                      </label>
                      <select
                        value={repGarment}
                        onChange={(e) => {
                          const g = e.target.value;
                          setRepGarment(g);
                          setRepSize(getWorkerRegisteredSize(g, currentEmp));
                        }}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        {availableGarments.map((g) => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Talla */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Talla
                      </label>
                      <select
                        value={repSize}
                        onChange={(e) => setRepSize(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      >
                        {repGarmentSizes.map((s) => (
                          <option key={s.size} value={s.size}>
                            Talla {s.size} ({s.stock} disp.)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Cantidad */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Cantidad a Entregar
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        required
                        value={repQuantity}
                        onChange={(e) => setRepQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-center text-slate-900"
                      />
                    </div>

                    {/* Motivo de reposición */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Motivo de la Reposición
                      </label>
                      <select
                        value={repReason}
                        onChange={(e) => setRepReason(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800"
                      >
                        <option value="Reposición por desgaste natural">Reposición por desgaste natural</option>
                        <option value="Deterioro o rasgadura en faena">Deterioro o rasgadura en faena</option>
                        <option value="Extravío o pérdida justificada">Extravío o pérdida justificada</option>
                        <option value="Prenda adicional requerida por jefatura">Prenda adicional autorizada</option>
                      </select>
                    </div>
                  </div>

                  {/* Stock notice */}
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-emerald-200 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Shirt className="w-4 h-4 text-emerald-600" />
                      <span>
                        Stock actual en bodega para <strong>{repGarment}</strong> (Talla {repSize}):
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded ${
                        selectedRepStock >= repQuantity
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedRepStock} disponibles
                    </span>
                  </div>
                </div>
              )}

              {/* ---------------------------------------------------- */}
              {/* SUBMODE 2: CAMBIO DE PRENDA (DEVOLUCIÓN + ENTREGA)   */}
              {/* ---------------------------------------------------- */}
              {individualMode === 'cambio' && (
                <div className="space-y-3.5">
                  {/* SECCIÓN 1: PRENDA DEVUELTA (INGRESO) */}
                  <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center">
                          <ArrowDownLeft className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-950 text-xs">
                            1. Prenda que Entrega de Vuelta el Trabajador
                          </h4>
                          <p className="text-[11px] text-amber-800/80">
                            Reingresará a bodega y se registrará como INGRESO en el historial
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 uppercase flex items-center gap-1">
                        <span>+ Ingreso</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Prenda Devuelta
                        </label>
                        <select
                          value={returnGarment}
                          onChange={(e) => {
                            const g = e.target.value;
                            setReturnGarment(g);
                            setReturnSize(getWorkerRegisteredSize(g, currentEmp));
                            // Also update deliver garment default to match
                            setDeliverGarment(g);
                          }}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                        >
                          {availableGarments.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Talla que Devuelve
                        </label>
                        <select
                          value={returnSize}
                          onChange={(e) => setReturnSize(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-900"
                        >
                          {returnGarmentSizes.map((s) => (
                            <option key={s.size} value={s.size}>
                              Talla {s.size}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Cantidad Devuelta
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          required
                          value={returnQuantity}
                          onChange={(e) => setReturnQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-center text-slate-900"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Motivo del Cambio / Estado de Prenda
                        </label>
                        <select
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-800"
                        >
                          <option value="Talla chica (requiere talla más grande)">Talla chica (requiere talla más grande)</option>
                          <option value="Talla grande (requiere talla más chica)">Talla grande (requiere talla más chica)</option>
                          <option value="Falla o defecto de fábrica en confección">Falla o defecto de fábrica en confección</option>
                          <option value="Cambio de modelo o corte de prenda">Cambio de modelo o corte de prenda</option>
                          <option value="Ajuste de dotación por faena">Ajuste de dotación por faena</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 2: PRENDA NUEVA A ENTREGAR (ENTREGA) */}
                  <div className="bg-blue-50/50 border border-blue-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-blue-200/60">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 flex items-center justify-center">
                          <ArrowUpRight className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-blue-950 text-xs">
                            2. Prenda Nueva a Entregar al Trabajador
                          </h4>
                          <p className="text-[11px] text-blue-800/80">
                            Se descontará de bodega y se registrará como ENTREGA en el historial
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase flex items-center gap-1">
                        <span>- Entrega</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Prenda a Entregar
                        </label>
                        <select
                          value={deliverGarment}
                          onChange={(e) => {
                            const g = e.target.value;
                            setDeliverGarment(g);
                            setDeliverSize(getWorkerRegisteredSize(g, currentEmp));
                          }}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                        >
                          {availableGarments.map((g) => (
                            <option key={g} value={g}>
                              {g}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nueva Talla a Entregar
                        </label>
                        <select
                          value={deliverSize}
                          onChange={(e) => setDeliverSize(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold text-slate-900"
                        >
                          {deliverGarmentSizes.map((s) => (
                            <option key={s.size} value={s.size}>
                              Talla {s.size} ({s.stock} disp.)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-blue-200 text-[11px]">
                      <div className="flex items-center gap-2">
                        <Shirt className="w-4 h-4 text-blue-600" />
                        <span>
                          Stock disponible para <strong>{deliverGarment}</strong> (Talla {deliverSize}):
                        </span>
                      </div>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded ${
                          selectedDeliverStock >= deliverQuantity
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {selectedDeliverStock} disponibles
                      </span>
                    </div>

                    {/* Checkbox: Actualizar talla en ficha del trabajador */}
                    <div className="pt-2">
                      <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={updateWorkerProfileSize}
                          onChange={(e) => setUpdateWorkerProfileSize(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <div>
                          <span className="font-semibold text-slate-900">
                            Actualizar automáticamente la talla en la ficha del trabajador a "{deliverSize}"
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Recomendado para cambios de talla, asegurando que las próximas compras y kits consideren su nueva medida.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div className="p-3 bg-slate-900 text-slate-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-amber-400 block text-[11px] uppercase tracking-wider">
                      Resumen del Cambio en el Libro de Movimientos:
                    </span>
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span>1. INGRESO a bodega:</span>
                      <strong className="text-emerald-400">+{returnQuantity} u. {returnGarment} ({returnSize})</strong>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span>2. ENTREGA a trabajador:</span>
                      <strong className="text-blue-400">-{deliverQuantity} u. {deliverGarment} ({deliverSize})</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* CASE B: KITS ESTÁNDAR (ESTIVAL / PLANTA PERMANENTE)       */}
          {/* ======================================================== */}
          {kitType !== 'reposicion' && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="bg-slate-100/80 px-3.5 py-2 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                <span>Prendas Incluidas en la Dotación</span>
                <span className="text-[11px] text-slate-500 lowercase font-normal">
                  {standardKitItems.length} prendas
                </span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {standardKitItems.map((it, idx) => (
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
          )}

          {/* Status, Date & Dispatcher */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Estado</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as DeliveryStatus)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg font-semibold bg-white"
              >
                <option value="entregada">Entregada Conforme</option>
                <option value="requiere_cambio">Requiere Cambio Posterior</option>
                <option value="programada">Programada para Faena</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Responsable Bodega</label>
              <input
                type="text"
                value={dispatcherName}
                onChange={(e) => setDispatcherName(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones Adicionales
            </label>
            <input
              type="text"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="Ej: Prenda revisada en mesón conforme, firma en registro físico..."
              className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
            />
          </div>

          {/* Action Buttons */}
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
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs flex items-center gap-1.5"
            >
              <Check className="w-4 h-4 text-amber-400" />
              <span>
                {kitType === 'reposicion'
                  ? individualMode === 'cambio'
                    ? 'Confirmar Cambio de Prenda (+ Ingreso / - Entrega)'
                    : 'Confirmar Reposición (- Entrega)'
                  : 'Confirmar y Guardar Entrega'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
