import React, { createContext, useContext, useState } from 'react';
import { useFirestoreAppState } from '../hooks/useFirestoreAppState';
import {
  Employee,
  UniformDelivery,
  GarmentSpec,
  SeasonPlanningConfig,
  PurchasePlanItem,
  DeliveryStatus,
  InventoryItem,
  StockMovement,
  ActiveAppView,
  MatrixRow,
  SeasonType,
  isGarmentInSeason,
} from '../types';
import {
  INITIAL_EMPLOYEES,
  INITIAL_DELIVERIES,
  INITIAL_GARMENTS,
  INITIAL_INVENTORY,
  INITIAL_MOVEMENTS,
} from '../data/mockData';
import {
  OFFICIAL_EMPLOYEES,
  OFFICIAL_INVENTORY_ITEMS,
  OFFICIAL_INVENTORY_MATRIX,
} from '../data/jacBbbData';

export interface PurchasePlanItemWithStock extends PurchasePlanItem {
  inStock: number;
  netToOrder: number;
}

interface UniformsContextType {
  // Real-time Inventory & Matrix
  inventory: InventoryItem[];
  inventoryMatrix: MatrixRow[];
  movements: StockMovement[];
  totalStockUnits: number;
  totalStockValuation: number;
  lowStockCount: number;
  importInventoryMatrixBatch: (newRows: MatrixRow[], newItems: InventoryItem[], replaceAll?: boolean) => void;
  addStockIngreso: (data: {
    itemId?: string;
    garmentName: string;
    category: 'superior' | 'inferior' | 'calzado' | 'abrigo' | 'proteccion';
    size: string;
    quantity: number;
    documentRef: string;
    supplier: string;
    responsible: string;
    unitCostCLP?: number;
    location?: string;
    notes?: string;
    company?: string;
  }) => void;
  addStockEntrega: (data: {
    itemId?: string;
    garmentName: string;
    category: 'superior' | 'inferior' | 'calzado' | 'abrigo' | 'proteccion';
    size: string;
    quantity: number;
    documentRef: string;
    employeeId?: string;
    employeeName: string;
    responsible: string;
    notes?: string;
    signature?: string;
    company?: string;
  }) => void;
  adjustStock: (id: string, newStock: number, reason: string, responsible: string) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;
  deleteMovement: (id: string) => void;

  // Employees
  employees: Employee[];
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  importEmployeesBatch: (newEmployees: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[], replaceAll?: boolean) => void;

  // Deliveries (Historic & detailed)
  deliveries: UniformDelivery[];
  addDelivery: (delivery: Omit<UniformDelivery, 'id' | 'deliveryCode'>) => void;
  updateDeliveryStatus: (id: string, status: DeliveryStatus, comments?: string) => void;

  // Procurement Planning
  garments: GarmentSpec[];
  planningConfig: SeasonPlanningConfig;
  setPlanningConfig: React.Dispatch<React.SetStateAction<SeasonPlanningConfig>>;
  purchasePlan: PurchasePlanItemWithStock[];
  totalBudgetCLP: number;
  grossBudgetCLP: number;
  aiAnalysis: any;
  isAiLoading: boolean;
  runAiProcurementAnalysis: (notes?: string) => Promise<void>;

  // Navigation
  activeView: ActiveAppView | 'self_service';
  setActiveView: (view: ActiveAppView | 'self_service') => void;

  // Utility
  resetToSampleData: () => void;
  resetToOfficialData: () => void;
  restoreBackup: (backupData: {
    employees?: Employee[];
    inventory?: InventoryItem[];
    inventoryMatrix?: MatrixRow[];
    movements?: StockMovement[];
    deliveries?: UniformDelivery[];
    planningConfig?: SeasonPlanningConfig;
  }) => void;
}

const DEFAULT_PLANNING_CONFIG: SeasonPlanningConfig = {
  seasonName: 'Verano 2026',
  seasonType: 'verano',
  period: 'Verano 2026',
  targetDeliveryDate: '2026-11-15',
  supplierCutoffDate: '2026-10-01',
  projectedSummerWorkers: 0,
  currentSeasonalWorkers: 0,
  permanentWorkersCount: 0,
  bufferPercent: 15,
};

// Missing cloud documents remain empty. Sample records are never seeded on load.
const CLOUD_DEFAULTS = {
  employees: [], inventory: [], matrix: [], movements: [], deliveries: [],
  config: DEFAULT_PLANNING_CONFIG,
};

const UniformsContext = createContext<UniformsContextType | undefined>(undefined);

const detectInitialView = (): ActiveAppView | 'self_service' => {
  if (typeof window === 'undefined') return 'inventory';
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view')?.toLowerCase();
    if (viewParam === 'inventory' || viewParam === 'inventario' || viewParam === 'stock') {
      return 'inventory';
    }
    if (viewParam === 'movements' || viewParam === 'movimientos' || viewParam === 'ingresos' || viewParam === 'entregas') {
      return 'movements';
    }
    if (viewParam === 'procurement' || viewParam === 'compras') return 'procurement';
    if (viewParam === 'employees' || viewParam === 'trabajadores' || viewParam === 'empleados') return 'employees';
    if (viewParam === 'self_service' || viewParam === 'autoregistro') return 'self_service';

    const hash = (window.location.hash || '').toLowerCase();
    if (hash.includes('inventario') || hash.includes('inventory') || hash.includes('stock')) return 'inventory';
    if (hash.includes('movimientos') || hash.includes('movements') || hash.includes('ingresos')) return 'movements';
    if (hash.includes('compras') || hash.includes('procurement')) return 'procurement';
    if (hash.includes('trabajadores') || hash.includes('empleados') || hash.includes('employees')) return 'employees';
    if (hash.includes('autoregistro') || hash.includes('self_service')) return 'self_service';
  } catch (e) {
    console.warn('Error reading URL params', e);
  }
  return 'inventory';
};

export const UniformsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cloud = useFirestoreAppState(CLOUD_DEFAULTS);
  const employees = cloud.values.employees as Employee[];
  const inventory = cloud.values.inventory as InventoryItem[];
  const inventoryMatrix = cloud.values.matrix as MatrixRow[];
  const movements = cloud.values.movements as StockMovement[];
  const deliveries = cloud.values.deliveries as UniformDelivery[];
  const setEmployees: React.Dispatch<React.SetStateAction<Employee[]>> = (value) => cloud.setField('employees', value);
  const setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>> = (value) => cloud.setField('inventory', value);
  const setInventoryMatrix: React.Dispatch<React.SetStateAction<MatrixRow[]>> = (value) => cloud.setField('matrix', value);
  const setMovements: React.Dispatch<React.SetStateAction<StockMovement[]>> = (value) => cloud.setField('movements', value);
  const setDeliveries: React.Dispatch<React.SetStateAction<UniformDelivery[]>> = (value) => cloud.setField('deliveries', value);
  const employeeCounts = {
    permanentWorkersCount: employees.filter((employee) => employee.type === 'permanente').length,
    currentSeasonalWorkers: employees.filter((employee) => employee.type === 'estival').length,
  };
  // Derived counts update the UI without writing to Firestore during hydration.
  const rawConfig = cloud.values.config || {};
  const resolvedSeasonType: SeasonType =
    rawConfig.seasonType ||
    (rawConfig.seasonName?.toLowerCase().includes('invierno') ? 'invierno' : 'verano');
  const planningConfig: SeasonPlanningConfig = {
    ...DEFAULT_PLANNING_CONFIG,
    ...rawConfig,
    seasonType: resolvedSeasonType,
    ...employeeCounts,
  };
  const setPlanningConfig: React.Dispatch<React.SetStateAction<SeasonPlanningConfig>> = (action) => {
    cloud.setField('config', (previous: SeasonPlanningConfig) => {
      const next = typeof action === 'function' ? action({ ...DEFAULT_PLANNING_CONFIG, ...previous, ...employeeCounts }) : action;
      if (!next.seasonType) {
        next.seasonType = next.seasonName?.toLowerCase().includes('invierno') ? 'invierno' : 'verano';
      }
      return next;
    });
  };
  const [garments] = useState<GarmentSpec[]>(INITIAL_GARMENTS);
  const [activeView, setActiveView] = useState<ActiveAppView | 'self_service'>(detectInitialView);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // URL hash sync
  const handleSetActiveView = (view: ActiveAppView | 'self_service') => {
    setActiveView(view);
    try {
      if (typeof window !== 'undefined') {
        const hashMap: Record<string, string> = {
          inventory: 'inventario',
          employees: 'trabajadores',
          procurement: 'compras',
          movements: 'movimientos',
          self_service: 'autoregistro',
        };
        const targetHash = `#${hashMap[view] || view}`;
        if (window.location.hash !== targetHash) {
          window.history.pushState(null, '', targetHash);
        }
      }
    } catch {
      // Ignore in iframe
    }
  };

  // Inventory Calculations
  const totalStockUnits = inventory.reduce((acc, curr) => acc + curr.currentStock, 0);
  const totalStockValuation = inventory.reduce((acc, curr) => acc + curr.currentStock * curr.unitCostCLP, 0);
  const lowStockCount = inventory.filter((item) => item.currentStock <= item.minStock).length;

  // Real-Time Action: Registrar Ingreso de Bodega (Recepción)
  const addStockIngreso = (data: {
    itemId?: string;
    garmentName: string;
    category: 'superior' | 'inferior' | 'calzado' | 'abrigo' | 'proteccion';
    size: string;
    quantity: number;
    documentRef: string;
    supplier: string;
    responsible: string;
    unitCostCLP?: number;
    location?: string;
    notes?: string;
    company?: string;
  }) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const codeNum = movements.filter((m) => m.type === 'ingreso').length + 47;
    const movCode = `ING-2026-${String(codeNum).padStart(3, '0')}`;

    // 1. Update or create inventory item
    setInventory((prev) => {
      let matchIndex = -1;
      if (data.itemId) {
        matchIndex = prev.findIndex((item) => item.id === data.itemId);
      } else {
        matchIndex = prev.findIndex(
          (item) =>
            item.name.toLowerCase() === data.garmentName.toLowerCase() &&
            item.size.toLowerCase() === data.size.toLowerCase()
        );
      }

      if (matchIndex >= 0) {
        const updated = [...prev];
        const current = updated[matchIndex];
        updated[matchIndex] = {
          ...current,
          currentStock: current.currentStock + data.quantity,
          unitCostCLP: data.unitCostCLP || current.unitCostCLP,
          location: data.location || current.location,
          lastUpdated: nowStr,
        };
        return updated;
      } else {
        // Create new inventory item
        const newItem: InventoryItem = {
          id: `inv-${Date.now()}`,
          code: `${data.category.slice(0, 3).toUpperCase()}-${data.size}-${Date.now().toString().slice(-3)}`,
          name: data.garmentName,
          category: data.category,
          size: data.size,
          currentStock: data.quantity,
          minStock: Math.max(5, Math.round(data.quantity * 0.2)),
          unitCostCLP: data.unitCostCLP || 15000,
          location: data.location || 'Bodega General',
          lastUpdated: nowStr,
        };
        return [newItem, ...prev];
      }
    });

    // 2. Add StockMovement record
    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      code: movCode,
      type: 'ingreso',
      date: nowStr,
      itemId: data.itemId,
      garmentName: data.garmentName,
      category: data.category,
      size: data.size,
      quantity: data.quantity,
      documentRef: data.documentRef,
      party: data.supplier,
      responsible: data.responsible,
      notes: data.notes,
      company:
        data.company ||
        (data.itemId ? inventory.find((i) => i.id === data.itemId)?.company : undefined) ||
        (data.garmentName.toUpperCase().includes('JAC')
          ? 'JAC'
          : data.garmentName.toUpperCase().includes('BÍO') || data.garmentName.toUpperCase().includes('BBB')
          ? 'BBB'
          : 'General'),
    };

    setMovements((prev) => [newMovement, ...prev]);

    // 3. Update inventoryMatrix row
    setInventoryMatrix((prev) => {
      const gLow = data.garmentName.toLowerCase();
      const season = gLow.includes('m/c') ? '2025 verano' : '2026 invierno';
      const company = data.company || (data.garmentName.toUpperCase().includes('JAC') ? 'JAC' : data.garmentName.toUpperCase().includes('BBB') ? 'BBB' : 'General');
      const idx = prev.findIndex((r) =>
        r.garmentName.toLowerCase() === gLow &&
        r.company.toLowerCase() === company.toLowerCase() &&
        (r.season || '').toLowerCase() === season
      );
      if (idx >= 0) {
        const next = [...prev];
        const row = { ...next[idx] };
        const sizes = { ...row.sizes };
        sizes[data.size] = (sizes[data.size] || 0) + data.quantity;
        row.sizes = sizes;
        row.total = Object.values(sizes).reduce((a, b) => a + Number(b || 0), 0);
        next[idx] = row;
        return next;
      }
      return prev;
    });
  };

  // Real-Time Action: Registrar Entrega a Trabajador (Despacho / Salida)
  const addStockEntrega = (data: {
    itemId?: string;
    garmentName: string;
    category: 'superior' | 'inferior' | 'calzado' | 'abrigo' | 'proteccion';
    size: string;
    quantity: number;
    documentRef: string;
    employeeId?: string;
    employeeName: string;
    responsible: string;
    notes?: string;
    signature?: string;
    company?: string;
  }) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const codeNum = movements.filter((m) => m.type === 'entrega').length + 99;
    const movCode = `ENT-2026-${String(codeNum).padStart(3, '0')}`;

    // 1. Decrement inventory
    setInventory((prev) => {
      return prev.map((item) => {
        const isMatch = data.itemId
          ? item.id === data.itemId
          : item.name.toLowerCase() === data.garmentName.toLowerCase() &&
            item.size.toLowerCase() === data.size.toLowerCase();

        if (isMatch) {
          return {
            ...item,
            currentStock: Math.max(0, item.currentStock - data.quantity),
            lastUpdated: nowStr,
          };
        }
        return item;
      });
    });

    // 2. Add Movement
    const empMatch = data.employeeId ? employees.find((e) => e.id === data.employeeId) : undefined;
    const itemMatch = data.itemId ? inventory.find((i) => i.id === data.itemId) : undefined;
    const resolvedCompany =
      data.company ||
      empMatch?.company ||
      itemMatch?.company ||
      (data.garmentName.toUpperCase().includes('JAC')
        ? 'JAC'
        : data.garmentName.toUpperCase().includes('BÍO') || data.garmentName.toUpperCase().includes('BBB')
        ? 'BBB'
        : 'General');

    const newMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      code: movCode,
      type: 'entrega',
      date: nowStr,
      itemId: data.itemId,
      garmentName: data.garmentName,
      category: data.category,
      size: data.size,
      quantity: data.quantity,
      documentRef: data.documentRef,
      party: data.employeeName,
      responsible: data.responsible,
      notes: data.notes,
      signature: data.signature,
      company: resolvedCompany,
    };
    setMovements((prev) => [newMovement, ...prev]);

    // 3. Update worker delivery status if employeeId provided
    if (data.employeeId) {
      updateEmployee(data.employeeId, {
        deliveryStatus: 'completado',
        lastDeliveryDate: nowStr.split(' ')[0],
      });
    }

    // 4. Update inventoryMatrix row
    setInventoryMatrix((prev) => {
      const gLow = data.garmentName.toLowerCase();
      const season = gLow.includes('m/c') ? '2025 verano' : '2026 invierno';
      const company = resolvedCompany;
      const idx = prev.findIndex((r) =>
        r.garmentName.toLowerCase() === gLow &&
        r.company.toLowerCase() === company.toLowerCase() &&
        (r.season || '').toLowerCase() === season
      );
      if (idx >= 0) {
        const next = [...prev];
        const row = { ...next[idx] };
        const sizes = { ...row.sizes };
        sizes[data.size] = Math.max(0, (sizes[data.size] || 0) - data.quantity);
        row.sizes = sizes;
        row.total = Object.values(sizes).reduce((a, b) => a + Number(b || 0), 0);
        next[idx] = row;
        return next;
      }
      return prev;
    });
  };

  // Real-Time Action: Ajuste manual de stock
  const adjustStock = (id: string, newStock: number, reason: string, responsible: string) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const targetItem = inventory.find((i) => i.id === id);
    if (!targetItem) return;

    const diff = newStock - targetItem.currentStock;
    const movCode = `AJU-2026-${Date.now().toString().slice(-4)}`;

    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, currentStock: Math.max(0, newStock), lastUpdated: nowStr } : item))
    );

    setInventoryMatrix((prev) => {
      const gLow = targetItem.name.toLowerCase();
      const season = targetItem.season ? targetItem.season.toLowerCase() : (gLow.includes('m/c') ? '2025 verano' : '2026 invierno');
      const company = targetItem.company || 'General';
      const storageType = targetItem.storageType || 'Caja';
      const idx = prev.findIndex((r) =>
        r.garmentName.toLowerCase() === gLow &&
        r.company.toLowerCase() === company.toLowerCase() &&
        r.storageType.toLowerCase() === storageType.toLowerCase() &&
        (r.season || '').toLowerCase() === season
      );
      if (idx >= 0) {
        const next = [...prev];
        const row = { ...next[idx] };
        const sizes = { ...row.sizes };
        sizes[targetItem.size] = Math.max(0, newStock);
        row.sizes = sizes;
        row.total = Object.values(sizes).reduce((a, b) => a + Number(b || 0), 0);
        next[idx] = row;
        return next;
      }
      return prev;
    });

    const adjustmentMovement: StockMovement = {
      id: `mov-${Date.now()}`,
      code: movCode,
      type: 'ajuste',
      date: nowStr,
      itemId: id,
      garmentName: targetItem.name,
      category: targetItem.category,
      size: targetItem.size,
      quantity: Math.abs(diff),
      documentRef: `Ajuste Auditoría Inventario: ${diff >= 0 ? `+${diff}` : diff} unidades`,
      party: 'Bodega Central',
      responsible: responsible || 'Auditor de Inventario',
      notes: reason || 'Ajuste de inventario físico',
    };
    setMovements((prev) => [adjustmentMovement, ...prev]);
  };

  const updateInventoryItem = (id: string, updates: Partial<InventoryItem>) => {
    const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 16);
    setInventory((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates, lastUpdated: nowStr } : item))
    );
  };

  const deleteMovement = (id: string) => {
    setMovements((prev) => prev.filter((m) => m.id !== id));
  };

  // Employee Actions
  const addEmployee = (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEmp: Employee = {
      ...data,
      id: `emp-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setEmployees((prev) => [newEmp, ...prev]);
  };

  const updateEmployee = (id: string, updates: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((emp) =>
        emp.id === id
          ? {
              ...emp,
              ...updates,
              updatedAt: new Date().toISOString().split('T')[0],
            }
          : emp
      )
    );
  };

  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  };

  const importEmployeesBatch = (
    newEmps: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[],
    replaceAll: boolean = false
  ) => {
    const formatted: Employee[] = newEmps.map((data, idx) => ({
      ...data,
      id: `emp-import-${Date.now()}-${idx}`,
      createdAt: data.timestamp || new Date().toISOString().split('T')[0],
      updatedAt: data.timestamp || new Date().toISOString().split('T')[0],
    }));

    if (replaceAll) {
      setEmployees(formatted);
    } else {
      setEmployees((prev) => [...formatted, ...prev]);
    }
  };

  const importInventoryMatrixBatch = (
    newRows: MatrixRow[],
    newItems: InventoryItem[],
    replaceAll: boolean = true
  ) => {
    if (replaceAll) {
      setInventoryMatrix(newRows);
      setInventory(newItems);
    } else {
      setInventoryMatrix((prev) => [...newRows, ...prev]);
      setInventory((prev) => [...newItems, ...prev]);
    }
  };

  // Historic Delivery Actions
  const addDelivery = (data: Omit<UniformDelivery, 'id' | 'deliveryCode'>) => {
    const codeNum = deliveries.length + 101;
    const newDel: UniformDelivery = {
      ...data,
      id: `del-${Date.now()}`,
      deliveryCode: `ENT-2026-${codeNum}`,
    };
    setDeliveries((prev) => [newDel, ...prev]);

    const statusMap = {
      entregada: 'completado' as const,
      requiere_cambio: 'cambio_solicitado' as const,
      programada: 'parcial' as const,
      cancelada: 'sin_entregar' as const,
    };
    updateEmployee(data.employeeId, {
      deliveryStatus: statusMap[data.status],
      lastDeliveryDate: data.deliveryDate,
    });
  };

  const updateDeliveryStatus = (id: string, status: DeliveryStatus, comments?: string) => {
    setDeliveries((prev) =>
      prev.map((del) => {
        if (del.id === id) {
          const updated = {
            ...del,
            status,
            comments: comments !== undefined ? comments : del.comments,
          };
          if (status === 'entregada' && !del.signedAt) {
            updated.signedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
          }
          return updated;
        }
        return del;
      })
    );
  };

  // Purchase Planning with Real-Time Stock Subtraction and Seasonal Garments Filter
  const calculatePurchasePlan = (): {
    items: PurchasePlanItemWithStock[];
    totalCost: number;
    grossCost: number;
  } => {
    const items: PurchasePlanItemWithStock[] = [];
    let totalNetCost = 0;
    let totalGrossCost = 0;

    const activeSeason: SeasonType =
      planningConfig.seasonType ||
      (planningConfig.seasonName?.toLowerCase().includes('invierno') ? 'invierno' : 'verano');

    // Filter strictly to garments defined for the selected season (Verano vs Invierno)
    const seasonalGarments = garments.filter((g) => isGarmentInSeason(g.name, activeSeason));

    seasonalGarments.forEach((garment) => {
      const gNameLow = garment.name.toLowerCase();
      const isFemaleOnly = gNameLow.includes('mujer') || gNameLow.includes('blusa');
      const isMaleOnly = gNameLow.includes('hombre');

      // Filter employees matching garment gender profile
      const targetEmployees = employees.filter((emp) => {
        const isEmpFemale = emp.genderFit === 'femenino' || emp.gender?.toLowerCase() === 'mujer';
        if (isFemaleOnly) return isEmpFemale;
        if (isMaleOnly) return !isEmpFemale;
        return true; // unisex items
      });

      // Standard dotation quotas per person:
      // Camisas / Blusas: 2 units per worker
      // Pantalones: 2 units per worker
      // Sweaters, Polar, Parka, Corbata: 1 unit per worker
      const qtyPerPerson = (garment.category === 'superior' || garment.category === 'inferior') ? 2 : 1;

      // Helper to extract the worker's size for this exact garment type
      const getWorkerGarmentSize = (emp: Employee): string => {
        const s = emp.sizes;
        let val = '';
        if (gNameLow.includes('blusa')) val = s.blusa || s.shirt;
        else if (gNameLow.includes('camisa')) val = s.camisa || s.shirt;
        else if (gNameLow.includes('sweater')) val = s.sweater || s.shirt;
        else if (gNameLow.includes('polar')) val = s.polar || s.jacket || s.shirt;
        else if (gNameLow.includes('parka')) val = s.parka || s.jacket || s.shirt;
        else if (gNameLow.includes('pantalón') || gNameLow.includes('pantalon')) val = s.pants;
        else if (gNameLow.includes('corbata')) {
          if (s.corbata && s.corbata.toLowerCase() !== 'no aplica') return s.corbata;
          return 'Estándar';
        }
        else if (garment.category === 'superior' || garment.category === 'abrigo') val = s.shirt;
        else if (garment.category === 'inferior') val = s.pants;
        else if (garment.category === 'calzado') val = s.footwear;
        else if (garment.category === 'proteccion') val = s.headwear;

        val = (val || '').trim();
        if (val.toUpperCase() === 'XXL') return '2XL';
        if (val.toUpperCase() === 'XXXL') return '3XL';
        if (val.toUpperCase() === 'XXXXL') return '4XL';
        return val;
      };

      // Collect all sizes: union of garment.allowedSizes and employee survey sizes
      const sizeSet = new Set<string>(garment.allowedSizes);
      targetEmployees.forEach((emp) => {
        const sz = getWorkerGarmentSize(emp);
        if (sz && sz.toLowerCase() !== 'no aplica') {
          sizeSet.add(sz);
        }
      });

      const sizesToEvaluate = Array.from(sizeSet);

      sizesToEvaluate.forEach((size) => {
        let confirmedWorkersCount = 0;
        targetEmployees.forEach((emp) => {
          const empSize = getWorkerGarmentSize(emp);
          if (empSize.toLowerCase() === size.toLowerCase()) {
            confirmedWorkersCount++;
          }
        });

        const confirmedUnits = confirmedWorkersCount * qtyPerPerson;
        const bufferUnits = Math.ceil(confirmedUnits * (planningConfig.bufferPercent / 100));
        const totalGrossToOrder = confirmedUnits + bufferUnits;

        // Check real-time inventory in warehouse
        const matchingStock = inventory.find(
          (inv) =>
            inv.size.toLowerCase() === size.toLowerCase() &&
            (inv.name.toLowerCase() === garment.name.toLowerCase() ||
              (inv.category === garment.category &&
                inv.name.toLowerCase().includes(garment.name.slice(0, 10).toLowerCase())))
        );

        const inStockUnits = matchingStock ? matchingStock.currentStock : 0;
        const netToOrder = Math.max(0, totalGrossToOrder - inStockUnits);

        const grossCost = totalGrossToOrder * garment.unitCostCLP;
        const netCost = netToOrder * garment.unitCostCLP;

        if (totalGrossToOrder > 0 || inStockUnits > 0) {
          items.push({
            garmentId: garment.id,
            garmentName: garment.name,
            category: garment.category,
            size,
            unitCost: garment.unitCostCLP,
            confirmedCount: confirmedUnits,
            bufferPercentage: planningConfig.bufferPercent,
            bufferUnits,
            projectedSeasonalAddition: 0,
            totalToOrder: totalGrossToOrder,
            totalCost: grossCost,
            inStock: inStockUnits,
            netToOrder,
          });
          totalGrossCost += grossCost;
          totalNetCost += netCost;
        }
      });
    });

    return { items, totalCost: totalNetCost, grossCost: totalGrossCost };
  };

  const { items: purchasePlan, totalCost: totalBudgetCLP, grossCost: grossBudgetCLP } = calculatePurchasePlan();

  const runAiProcurementAnalysis = async (notes?: string) => {
    setIsAiLoading(true);
    try {
      const categorySummaries = garments.map((g) => {
        const relatedItems = purchasePlan.filter((p) => p.garmentId === g.id);
        const totalUnits = relatedItems.reduce((acc, curr) => acc + curr.netToOrder, 0);
        return {
          garment: g.name,
          category: g.category,
          unitCost: g.unitCostCLP,
          leadTimeDays: g.leadTimeDays,
          totalUnits,
          breakdownBySize: relatedItems.map((r) => ({ size: r.size, units: r.netToOrder })),
        };
      });

      const response = await fetch('/api/ai/procurement-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permanentCount: planningConfig.permanentWorkersCount,
          seasonalRegistered: planningConfig.currentSeasonalWorkers,
          seasonalProjected: planningConfig.projectedSummerWorkers,
          bufferPercent: planningConfig.bufferPercent,
          targetDeliveryDate: planningConfig.targetDeliveryDate,
          leadTimeDays: 45,
          categorySummaries,
          notes,
        }),
      });

      const data = await response.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const restoreBackup = (backupData: {
    employees?: Employee[];
    inventory?: InventoryItem[];
    inventoryMatrix?: MatrixRow[];
    movements?: StockMovement[];
    deliveries?: UniformDelivery[];
    planningConfig?: SeasonPlanningConfig;
  }) => {
    if (backupData.employees && Array.isArray(backupData.employees)) {
      setEmployees(backupData.employees);
    }
    if (backupData.inventory && Array.isArray(backupData.inventory)) {
      setInventory(backupData.inventory);
    }
    if (backupData.inventoryMatrix && Array.isArray(backupData.inventoryMatrix)) {
      setInventoryMatrix(backupData.inventoryMatrix);
    }
    if (backupData.movements && Array.isArray(backupData.movements)) {
      setMovements(backupData.movements);
    }
    if (backupData.deliveries && Array.isArray(backupData.deliveries)) {
      setDeliveries(backupData.deliveries);
    }
    if (backupData.planningConfig) {
      setPlanningConfig(backupData.planningConfig);
    }
  };

  const resetToSampleData = () => {
    if (!window.confirm("Esto reemplazará los datos compartidos en Firestore por datos de ejemplo. ¿Continuar?")) return;
    setInventory(INITIAL_INVENTORY);
    setInventoryMatrix([]);
    setMovements(INITIAL_MOVEMENTS);
    setEmployees(INITIAL_EMPLOYEES);
    setDeliveries(INITIAL_DELIVERIES);
    setPlanningConfig(DEFAULT_PLANNING_CONFIG);
  };

  const resetToOfficialData = () => {
    if (!window.confirm("Esto reemplazará trabajadores e inventario compartidos por los datos incluidos en el código. ¿Continuar?")) return;
    setInventory(OFFICIAL_INVENTORY_ITEMS);
    setInventoryMatrix(OFFICIAL_INVENTORY_MATRIX);
    setEmployees(OFFICIAL_EMPLOYEES);
  };

  const downloadPendingBackup = () => {
    const blob = new Blob([JSON.stringify({ employees, inventory, inventoryMatrix, movements, deliveries, planningConfig }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'datafit-cambios-pendientes.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!cloud.ready || cloud.error) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="max-w-xl bg-white rounded-xl shadow p-6 space-y-4">
          <h1 className="text-lg font-semibold">{cloud.error ? 'No se pudieron sincronizar los datos' : 'Cargando datos de DataFit…'}</h1>
          <p role={cloud.error ? 'alert' : 'status'}>{cloud.error || 'Recuperando trabajadores e inventario guardados.'}</p>
          {cloud.error && (
            <div className="flex flex-wrap gap-3">
              {cloud.ready && cloud.pending && <button className="rounded bg-amber-500 px-4 py-2" onClick={downloadPendingBackup}>Descargar cambios pendientes</button>}
              <button className="rounded bg-slate-800 text-white px-4 py-2" onClick={() => {
                if (!cloud.pending || window.confirm('Descarga primero tus cambios pendientes. Al recargar se descartarán los cambios que no se guardaron. ¿Recargar?')) window.location.reload();
              }}>Volver a cargar</button>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <UniformsContext.Provider
      value={{
        inventory,
        inventoryMatrix,
        movements,
        totalStockUnits,
        totalStockValuation,
        lowStockCount,
        importInventoryMatrixBatch,
        addStockIngreso,
        addStockEntrega,
        adjustStock,
        updateInventoryItem,
        deleteMovement,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        importEmployeesBatch,
        deliveries,
        addDelivery,
        updateDeliveryStatus,
        garments,
        planningConfig,
        setPlanningConfig,
        purchasePlan,
        totalBudgetCLP,
        grossBudgetCLP,
        aiAnalysis,
        isAiLoading,
        runAiProcurementAnalysis,
        activeView,
        setActiveView: handleSetActiveView,
        resetToSampleData,
        resetToOfficialData,
        restoreBackup,
      }}
    >
      {cloud.pending && <div role="status" className="fixed bottom-4 right-4 z-50 rounded-lg bg-amber-100 border border-amber-300 px-4 py-2 text-sm text-amber-900 shadow">Guardando cambios…</div>}
      {children}
    </UniformsContext.Provider>
  );
};

export const useUniforms = () => {
  const context = useContext(UniformsContext);
  if (!context) {
    throw new Error('useUniforms must be used within a UniformsProvider');
  }
  return context;
};
