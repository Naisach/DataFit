export type EmployeeType = 'permanente' | 'estival';
export type GenderFit = 'masculino' | 'femenino' | 'unisex';
export type SurveyStatus = 'completado' | 'pendiente';

export type ShirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';
export type PantsSize = '38' | '40' | '42' | '44' | '46' | '48' | '50' | '52' | '54';
export type FootwearSize = '36' | '37' | '38' | '39' | '40' | '41' | '42' | '43' | '44' | '45' | '46';
export type JacketSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL';

export interface EmployeeSizes {
  shirt: ShirtSize;
  pants: PantsSize;
  footwear: FootwearSize;
  jacket: JacketSize;
  headwear: string; // 'Estándar' | 'L/XL' | 'Legionario UV'
  gloves?: string;
}

export interface Employee {
  id: string;
  rut: string;
  fullName: string;
  email: string;
  phone: string;
  type: EmployeeType;
  department: string;
  workLocation: string;
  role: string;
  genderFit: GenderFit;
  sizes: EmployeeSizes;
  surveyStatus: SurveyStatus;
  contractStart: string;
  contractEnd?: string; // Especialmente para temporada estival
  lastDeliveryDate?: string;
  deliveryStatus: 'sin_entregar' | 'parcial' | 'completado' | 'cambio_solicitado';
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export type DeliveryStatus = 'programada' | 'entregada' | 'requiere_cambio' | 'cancelada';

export interface DeliveryItem {
  id: string;
  name: string;
  size: string;
  quantity: number;
  delivered: boolean;
  notes?: string;
}

export interface UniformDelivery {
  id: string;
  deliveryCode: string;
  employeeId: string;
  employeeName: string;
  employeeRut: string;
  employeeType: EmployeeType;
  department: string;
  workLocation: string;
  kitName: string; // e.g. "Kit Estival 2026", "Kit Planta Permanente Operaciones"
  items: DeliveryItem[];
  status: DeliveryStatus;
  deliveryDate: string;
  dispatcherName: string;
  receiverSignature: string; // Base64 o confirmación digital
  signedAt?: string;
  comments?: string;
}

export interface GarmentSpec {
  id: string;
  name: string;
  category: 'superior' | 'inferior' | 'calzado' | 'abrigo' | 'proteccion';
  allowedSizes: string[];
  unitCostCLP: number;
  seasons: ('permanente' | 'estival')[];
  leadTimeDays: number;
}

export interface PurchasePlanItem {
  garmentId: string;
  garmentName: string;
  category: string;
  size: string;
  unitCost: number;
  confirmedCount: number; // Tallas recolectadas reales
  bufferPercentage: number; // Ej: 12% para temporada estival
  bufferUnits: number;
  projectedSeasonalAddition: number; // Para temporeros previstos no fichados
  totalToOrder: number;
  totalCost: number;
}

export interface SeasonPlanningConfig {
  seasonName: string;
  targetDeliveryDate: string; // ej: 15 de Noviembre
  supplierCutoffDate: string; // Lead time calculation
  projectedSummerWorkers: number; // ej: 120 temporeros estivales proyectados
  currentSeasonalWorkers: number; // los actualmente registrados
  permanentWorkersCount: number;
  bufferPercent: number; // ej: 15%
}
