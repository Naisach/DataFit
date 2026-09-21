import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Employee,
  UniformDelivery,
  GarmentSpec,
  SeasonPlanningConfig,
  PurchasePlanItem,
  DeliveryStatus,
} from '../types';
import { INITIAL_EMPLOYEES, INITIAL_DELIVERIES, INITIAL_GARMENTS } from '../data/mockData';

interface UniformsContextType {
  employees: Employee[];
  deliveries: UniformDelivery[];
  garments: GarmentSpec[];
  planningConfig: SeasonPlanningConfig;
  setPlanningConfig: React.Dispatch<React.SetStateAction<SeasonPlanningConfig>>;
  activeView: 'dashboard' | 'employees' | 'deliveries' | 'procurement' | 'self_service';
  setActiveView: (view: 'dashboard' | 'employees' | 'deliveries' | 'procurement' | 'self_service') => void;
  // Employee actions
  addEmployee: (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEmployee: (id: string, updates: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  importEmployeesBatch: (newEmployees: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
  // Delivery actions
  addDelivery: (delivery: Omit<UniformDelivery, 'id' | 'deliveryCode'>) => void;
  updateDeliveryStatus: (id: string, status: DeliveryStatus, comments?: string) => void;
  // Procurement & calculations
  purchasePlan: PurchasePlanItem[];
  totalBudgetCLP: number;
  aiAnalysis: any;
  isAiLoading: boolean;
  runAiProcurementAnalysis: (notes?: string) => Promise<void>;
  resetToSampleData: () => void;
}

const STORAGE_KEY_EMPLOYEES = 'uniforms_app_employees_v1';
const STORAGE_KEY_DELIVERIES = 'uniforms_app_deliveries_v1';
const STORAGE_KEY_CONFIG = 'uniforms_app_config_v1';

const DEFAULT_PLANNING_CONFIG: SeasonPlanningConfig = {
  seasonName: 'Campaña Estival 2026-2027',
  targetDeliveryDate: '2026-11-15',
  supplierCutoffDate: '2026-10-01',
  projectedSummerWorkers: 65, // adicionales proyectados
  currentSeasonalWorkers: 8,
  permanentWorkersCount: 7,
  bufferPercent: 15,
};

const UniformsContext = createContext<UniformsContextType | undefined>(undefined);

export const UniformsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EMPLOYEES);
      return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
    } catch {
      return INITIAL_EMPLOYEES;
    }
  });

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

  const [activeView, setActiveView] = useState<'dashboard' | 'employees' | 'deliveries' | 'procurement' | 'self_service'>('dashboard');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_EMPLOYEES, JSON.stringify(employees));
    } catch (e) {
      console.warn('Failed to save employees to local storage', e);
    }
  }, [employees]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_DELIVERIES, JSON.stringify(deliveries));
    } catch (e) {
      console.warn('Failed to save deliveries to local storage', e);
    }
  }, [deliveries]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(planningConfig));
    } catch (e) {
      console.warn('Failed to save config to local storage', e);
    }
  }, [planningConfig]);

  // Keep counts in sync
  useEffect(() => {
    const perm = employees.filter((e) => e.type === 'permanente').length;
    const seas = employees.filter((e) => e.type === 'estival').length;
    setPlanningConfig((prev) => ({
      ...prev,
      permanentWorkersCount: perm,
      currentSeasonalWorkers: seas,
    }));
  }, [employees]);

  // Add Employee
  const addEmployee = (data: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newEmp: Employee = {
      ...data,
      id: `emp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setEmployees((prev) => [newEmp, ...prev]);
  };

  // Update Employee
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

  // Delete Employee
  const deleteEmployee = (id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id));
  };

  // Batch Import
  const importEmployeesBatch = (newEmps: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    const formatted: Employee[] = newEmps.map((data, idx) => ({
      ...data,
      id: `emp-import-${Date.now()}-${idx}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    }));
    setEmployees((prev) => [...formatted, ...prev]);
  };

  // Add Delivery
  const addDelivery = (data: Omit<UniformDelivery, 'id' | 'deliveryCode'>) => {
    const codeNum = deliveries.length + 101;
    const newDel: UniformDelivery = {
      ...data,
      id: `del-${Date.now()}`,
      deliveryCode: `ENT-2026-${codeNum}`,
    };
    setDeliveries((prev) => [newDel, ...prev]);

    // Update employee status
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

  // Update delivery status
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

  // Calculate Purchase Plan based on recorded sizes + projected seasonal additions + buffer percentage
  const calculatePurchasePlan = (): { items: PurchasePlanItem[]; totalCost: number } => {
    const items: PurchasePlanItem[] = [];
    let totalCost = 0;

    const seasonalTotalProjected = planningConfig.projectedSummerWorkers;
    const seasonalCurrent = employees.filter((e) => e.type === 'estival');
    const seasonalRegisteredCount = seasonalCurrent.length;

    // Ratio distribution helper based on current survey or standard curve
    const getDistributionRatios = (category: string): Record<string, number> => {
      // Analyze current employees
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
      // Find relevant employees for this garment based on season
      const targetEmployees = employees.filter((emp) => garment.seasons.includes(emp.type));
      const distRatios = getDistributionRatios(garment.category);

      // Quantities per person: seasonal workers typically get 2 shirts, 2 pants, 1 footwear, 1 cap
      const qtyPerPerson = garment.category === 'superior' ? 2 : garment.category === 'inferior' ? 2 : 1;

      garment.allowedSizes.forEach((size) => {
        // Count confirmed in current staff
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

        // If this garment is used by seasonal workers, compute projected addition
        let projectedAddition = 0;
        if (garment.seasons.includes('estival')) {
          const ratio = distRatios[size] || (1 / garment.allowedSizes.length);
          // Additional seasonal workers to be hired
          const additionalWorkersNeeded = Math.max(0, seasonalTotalProjected - seasonalRegisteredCount);
          projectedAddition = Math.round(additionalWorkersNeeded * ratio * qtyPerPerson);
        }

        const baseNeeded = confirmedCount + projectedAddition;
        const bufferUnits = Math.ceil(baseNeeded * (planningConfig.bufferPercent / 100));
        const totalToOrder = baseNeeded + bufferUnits;
        const itemTotalCost = totalToOrder * garment.unitCostCLP;

        if (totalToOrder > 0) {
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
            totalToOrder,
            totalCost: itemTotalCost,
          });
          totalCost += itemTotalCost;
        }
      });
    });

    return { items, totalCost };
  };

  const { items: purchasePlan, totalCost: totalBudgetCLP } = calculatePurchasePlan();

  // Run AI Procurement Analysis with Gemini
  const runAiProcurementAnalysis = async (notes?: string) => {
    setIsAiLoading(true);
    try {
      // Prepare compact summary of sizes for prompt
      const categorySummaries = garments.map((g) => {
        const relatedItems = purchasePlan.filter((p) => p.garmentId === g.id);
        const totalUnits = relatedItems.reduce((acc, curr) => acc + curr.totalToOrder, 0);
        return {
          garment: g.name,
          category: g.category,
          unitCost: g.unitCostCLP,
          leadTimeDays: g.leadTimeDays,
          totalUnits,
          breakdownBySize: relatedItems.map((r) => ({ size: r.size, units: r.totalToOrder })),
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
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const resetToSampleData = () => {
    setEmployees(INITIAL_EMPLOYEES);
    setDeliveries(INITIAL_DELIVERIES);
    setPlanningConfig(DEFAULT_PLANNING_CONFIG);
    localStorage.removeItem(STORAGE_KEY_EMPLOYEES);
    localStorage.removeItem(STORAGE_KEY_DELIVERIES);
    localStorage.removeItem(STORAGE_KEY_CONFIG);
  };

  return (
    <UniformsContext.Provider
      value={{
        employees,
        deliveries,
        garments,
        planningConfig,
        setPlanningConfig,
        activeView,
        setActiveView,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        importEmployeesBatch,
        addDelivery,
        updateDeliveryStatus,
        purchasePlan,
        totalBudgetCLP,
        aiAnalysis,
        isAiLoading,
        runAiProcurementAnalysis,
        resetToSampleData,
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
