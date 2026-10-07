import React, { createContext, useContext, useState, useEffect } from 'react';
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
  }) => void;
  adjustStock: (id: string, newStock: number, reason: string, responsible: string) => void;
  updateInventoryItem: (id: string, updates: Partial<InventoryItem>) => void;

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
    movements?: StockMovement[];
    deliveries?: UniformDelivery[];
    planningConfig?: SeasonPlanningConfig;
  }) => void;
}

const STORAGE_KEY_EMPLOYEES = 'uniforms_app_employees_v4';
const STORAGE_KEY_DELIVERIES = 'uniforms_app_deliveries_v4';
const STORAGE_KEY_CONFIG = 'uniforms_app_config_v4';
const STORAGE_KEY_INVENTORY = 'uniforms_app_inventory_v4';
const STORAGE_KEY_MATRIX = 'uniforms_app_matrix_v4';
const STORAGE_KEY_MOVEMENTS = 'uniforms_app_movements_v4';

const DEFAULT_PLANNING_CONFIG: SeasonPlanningConfig = {
  seasonName: 'Campaña Estival 2026-2027',
  targetDeliveryDate: '2026-11-15',
  supplierCutoffDate: '2026-10-01',
  projectedSummerWorkers: 65,
  currentSeasonalWorkers: 8,
  permanentWorkersCount: 7,
  bufferPercent: 15,
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
  // Inventory State
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_INVENTORY);
      return saved ? JSON.parse(saved) : OFFICIAL_INVENTORY_ITEMS;
    } catch {
      return OFFICIAL_INVENTORY_ITEMS;
    }
  });

  // Inventory Matrix State
  const [inventoryMatrix, setInventoryMatrix] = useState<MatrixRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MATRIX);
      return saved ? JSON.parse(saved) : OFFICIAL_INVENTORY_MATRIX;
    } catch {
      return OFFICIAL_INVENTORY_MATRIX;
    }
  });

  // Movements State (Ingresos y Entregas)
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MOVEMENTS);
      return saved ? JSON.parse(saved) : INITIAL_MOVEMENTS;
    } catch {
      return INITIAL_MOVEMENTS;
    }
  });

  // Employees State
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      return saved ? JSON.parse(saved) : OFFICIAL_EMPLOYEES;
    } catch {
      return OFFICIAL_EMPLOYEES;
    }
  });

  // Deliveries State
  const [deliveries, setDeliveries] = useState<UniformDelivery[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DELIVERIES);
      return saved ? JSON.parse(saved) : INITIAL_DELIVERIES;
    } catch {
      return INITIAL_DELIVERIES;
    }
  });

  const [garments] = useState<GarmentSpec[]>(INITIAL_GARMENTS);

  const [planningConfig, setPlanningConfig] = useState<SeasonPlanningConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
      return saved ? JSON.parse(saved) : DEFAULT_PLANNING_CONFIG;
    } catch {
      return DEFAULT_PLANNING_CONFIG;
    }
  });

  const [activeView, setActiveView] = useState<ActiveAppView | 'self_service'>(detectInitialView);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(inventory));
    } catch (e) {
      console.warn('Failed to save inventory to localStorage', e);
    }
  }, [inventory]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(inventoryMatrix));
    } catch (e) {
      console.warn('Failed to save matrix to localStorage', e);
    }
  }, [inventoryMatrix]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.warn('Failed to save movements to localStorage', e);
    }
  }, [movements]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
    } catch (e) {
      console.warn('Failed to save employees to localStorage', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DELIVERIES, JSON.stringify(deliveries));
    } catch (e) {
      console.warn('Failed to save deliveries to localStorage', e);
    }
  }, [deliveries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(planningConfig));
    } catch (e) {
      console.warn('Failed to save config to localStorage', e);
    }
  }, [planningConfig]);

  // Keep employee counts in sync in planning config
  useEffect(() => {
    const perm = employees.filter((e) => e.type === 'permanente').length;
    const seas = employees.filter((e) => e.type === 'estival').length;
    setPlanningConfig((prev) => ({
      ...prev,
      permanentWorkersCount: perm,
      currentSeasonalWorkers: seas,
    }));
  }, [employees]);

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
    };

    setMovements((prev) => [newMovement, ...prev]);
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
    };
    setMovements((prev) => [newMovement, ...prev]);

    // 3. Update worker delivery status if employeeId provided
    if (data.employeeId) {
      updateEmployee(data.employeeId, {
        deliveryStatus: 'completado',
        lastDeliveryDate: nowStr.split(' ')[0],
      });
    }
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

  // Purchase Planning with Real-Time Stock Subtraction
  const calculatePurchasePlan = (): {
    items: PurchasePlanItemWithStock[];
    totalCost: number;
    grossCost: number;
  } => {
    const items: PurchasePlanItemWithStock[] = [];
    let totalNetCost = 0;
    let totalGrossCost = 0;

    const seasonalTotalProjected = planningConfig.projectedSummerWorkers;
    const seasonalCurrent = employees.filter((e) => e.type === 'estival');
    const seasonalRegisteredCount = seasonalCurrent.length;

    const getDistributionRatios = (category: string): Record<string, number> => {
      const counts: Record<string, number> = {};
      let total = 0;

      employees.forEach((emp) => {
        let size = '';
        if (category === 'superior' || category === 'abrigo') size = emp.sizes.shirt;
        else if (category === 'inferior') size = emp.sizes.pants;
        else if (category === 'calzado') size = emp.sizes.footwear;
        else if (category === 'proteccion') size = emp.sizes.headwear;

        if (size) {
          counts[size] = (counts[size] || 0) + 1;
          total++;
        }
      });

      const ratios: Record<string, number> = {};
      if (total > 0) {
        Object.entries(counts).forEach(([sz, c]) => {
          ratios[sz] = c / total;
        });
      }
      return ratios;
    };

    garments.forEach((garment) => {
      const targetEmployees = employees.filter((emp) => garment.seasons.includes(emp.type));
      const distRatios = getDistributionRatios(garment.category);
      const qtyPerPerson = garment.category === 'superior' ? 2 : garment.category === 'inferior' ? 2 : 1;

      garment.allowedSizes.forEach((size) => {
        let confirmedCount = 0;
        targetEmployees.forEach((emp) => {
          let empSize = '';
          if (garment.category === 'superior' || garment.category === 'abrigo') empSize = emp.sizes.shirt;
          else if (garment.category === 'inferior') empSize = emp.sizes.pants;
          else if (garment.category === 'calzado') empSize = emp.sizes.footwear;
          else if (garment.category === 'proteccion') empSize = emp.sizes.headwear;

          if (empSize === size) {
            confirmedCount += qtyPerPerson;
          }
        });

        let projectedAddition = 0;
        if (garment.seasons.includes('estival')) {
          const ratio = distRatios[size] || 1 / garment.allowedSizes.length;
          const additionalWorkersNeeded = Math.max(0, seasonalTotalProjected - seasonalRegisteredCount);
          projectedAddition = Math.round(additionalWorkersNeeded * ratio * qtyPerPerson);
        }

        const baseNeeded = confirmedCount + projectedAddition;
        const bufferUnits = Math.ceil(baseNeeded * (planningConfig.bufferPercent / 100));
        const totalGrossToOrder = baseNeeded + bufferUnits;

        // Check real-time inventory in stock
        const matchingStock = inventory.find(
          (inv) =>
            inv.category === garment.category &&
            inv.size.toLowerCase() === size.toLowerCase() &&
            (inv.name.toLowerCase().includes(garment.name.slice(0, 10).toLowerCase()) ||
              garment.name.toLowerCase().includes(inv.name.slice(0, 10).toLowerCase()))
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
            confirmedCount,
            bufferPercentage: planningConfig.bufferPercent,
            bufferUnits,
            projectedSeasonalAddition: projectedAddition,
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
    setInventory(INITIAL_INVENTORY);
    setMovements(INITIAL_MOVEMENTS);
    setEmployees(INITIAL_EMPLOYEES);
    setDeliveries(INITIAL_DELIVERIES);
    setPlanningConfig(DEFAULT_PLANNING_CONFIG);
    localStorage.removeItem(STORAGE_KEY_INVENTORY);
    localStorage.removeItem(STORAGE_KEY_MATRIX);
    localStorage.removeItem(STORAGE_KEY_MOVEMENTS);
    localStorage.removeItem(STORAGE_KEY_EMPLOYEES);
    localStorage.removeItem(STORAGE_KEY_DELIVERIES);
    localStorage.removeItem(STORAGE_KEY_CONFIG);
  };

  const resetToOfficialData = () => {
    setInventory(OFFICIAL_INVENTORY_ITEMS);
    setInventoryMatrix(OFFICIAL_INVENTORY_MATRIX);
    setEmployees(OFFICIAL_EMPLOYEES);
    localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(OFFICIAL_INVENTORY_ITEMS));
    localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(OFFICIAL_INVENTORY_MATRIX));
    localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(OFFICIAL_EMPLOYEES));
  };

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
