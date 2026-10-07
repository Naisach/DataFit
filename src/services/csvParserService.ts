import { Employee, InventoryItem, MatrixRow, ShirtSize, PantsSize, FootwearSize, JacketSize } from '../types';

export interface ParseResult<T> {
  success: boolean;
  data: T[];
  errors: string[];
  totalParsed: number;
}

export const SIZE_COLUMNS = [
  'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '-',
  '36', '38', '40', '42', '44', '46', '48', '50', '52', '54', '56', '58', '60', '62', '64'
];

/**
 * Normaliza delimitadores (soporta ';' y ',')
 */
export function splitCsvLines(csvText: string): string[] {
  return csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export function detectDelimiter(line: string): string {
  const semicolonCount = (line.match(/;/g) || []).length;
  const commaCount = (line.match(/,/g) || []).length;
  const tabCount = (line.match(/\t/g) || []).length;
  if (tabCount > semicolonCount && tabCount > commaCount) return '\t';
  return semicolonCount >= commaCount ? ';' : ',';
}

/**
 * Detecta automáticamente si el CSV corresponde a Nómina de Trabajadores o a Matriz de Inventario
 */
export function detectCsvType(csvContent: string): 'employees' | 'inventory_matrix' | 'unknown' {
  const lines = splitCsvLines(csvContent);
  if (lines.length === 0) return 'unknown';

  const firstLine = lines[0].toLowerCase();
  if (
    firstLine.includes('marca temporal') ||
    firstLine.includes('identificador') ||
    firstLine.includes('talla de camisa') ||
    firstLine.includes('talla de blusa') ||
    firstLine.includes('corbata') ||
    firstLine.includes('cargo')
  ) {
    return 'employees';
  }

  if (
    firstLine.includes('ubicaci') ||
    firstLine.includes('prenda') ||
    firstLine.includes('emp') ||
    firstLine.includes('repisa') ||
    firstLine.includes('caja')
  ) {
    return 'inventory_matrix';
  }

  return 'unknown';
}

/**
 * Parsea CSV de Trabajadores / Registros de Tallas
 */
export function parseEmployeesCsv(csvText: string): ParseResult<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>> {
  const lines = splitCsvLines(csvText);
  const errors: string[] = [];
  const parsedEmployees: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[] = [];

  if (lines.length === 0) {
    return { success: false, data: [], errors: ['El archivo CSV está vacío.'], totalParsed: 0 };
  }

  const delimiter = detectDelimiter(lines[0]);
  let startIndex = 0;

  // Check if first row is header
  const headerLower = lines[0].toLowerCase();
  if (
    headerLower.includes('empresa') ||
    headerLower.includes('identificador') ||
    headerLower.includes('rut') ||
    headerLower.includes('marca') ||
    headerLower.includes('nombre')
  ) {
    startIndex = 1;
  }

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = rawLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));

    if (cols.length < 3) continue;

    // Detect format:
    // User format: Marca temporal;Empresa;Identificador;Genero;Cargo;Talla de blusa;Talla de camisa;Talla de sweater;Talla de polar;Talla de parka;Talla de pantalón;Corbata
    if (cols.length >= 6 && (cols[1]?.toLowerCase().includes('buses') || cols[1]?.toLowerCase().includes('jac') || !isNaN(Number(cols[2])))) {
      const timestamp = cols[0] || '';
      const empresa = cols[1] || 'Empresa';
      const identificador = cols[2] || String(i);
      const genero = cols[3] || 'Hombre';
      const cargo = cols[4] || 'Personal';
      const blusa = cols[5] || '';
      const camisa = cols[6] || '';
      const sweater = cols[7] || '';
      const polar = cols[8] || '';
      const parka = cols[9] || '';
      const pantalon = cols[10] || '';
      const corbata = cols[11] || '';

      const isFemale = genero.toLowerCase().includes('mujer') || genero.toLowerCase().includes('fem');
      const shirt = (camisa || blusa || sweater || 'M').toUpperCase();

      parsedEmployees.push({
        identifier: identificador,
        rut: `${identificador}.000.000-${identificador.slice(-1) || 'K'}`,
        fullName: `Funcionario #${identificador} - ${cargo}`,
        company: empresa,
        email: `${identificador}@${empresa.toLowerCase().includes('jac') ? 'jac' : 'biobio'}.cl`,
        phone: '+56 9 7000 0000',
        workLocation: empresa.toLowerCase().includes('jac') ? 'Terminal JAC' : 'Terminal Bio Bio',
        department: cargo.toLowerCase().includes('conductor')
          ? 'Operaciones / Ruta'
          : cargo.toLowerCase().includes('cajero')
          ? 'Comercial / Cajas'
          : 'Atención Pasajeros',
        role: cargo,
        gender: isFemale ? 'Mujer' : 'Hombre',
        genderFit: isFemale ? 'femenino' : 'masculino',
        type: 'permanente',
        sizes: {
          shirt: shirt || 'L',
          pants: pantalon || '46',
          footwear: '42',
          jacket: (parka || polar || 'L').toUpperCase(),
          headwear: 'Estándar',
          blusa,
          camisa,
          sweater,
          polar,
          parka,
          corbata: corbata || (isFemale ? 'No aplica' : 'Si aplica'),
        },
        surveyStatus: 'completado',
        deliveryStatus: 'sin_entregar',
        contractStart: '2026-08-01',
        timestamp: timestamp || new Date().toLocaleString('es-CL'),
        notes: timestamp === 'No solicita tallas' ? 'No solicita tallas' : timestamp.startsWith('MANUAL') ? 'Registro Manual' : undefined,
      });
    } else {
      // Legacy format: RUT, Nombre Completo, Tipo, Polera, Pantalón, etc.
      const [rut, fullName, typeRaw, shirtRaw, pantsRaw, footRaw, jacketRaw, headRaw, deptRaw, locRaw, roleRaw] = cols;
      parsedEmployees.push({
        identifier: rut ? rut.replace(/[^0-9]/g, '').slice(0, 5) : String(i),
        rut: rut || `20.${100 + i}.000-K`,
        fullName: fullName || `Trabajador #${i}`,
        company: 'Buses Bio Bio SpA',
        email: `${(rut || 'trabajador').replace(/[^0-9]/g, '')}@empresa.com`,
        phone: '+56 9 7000 0000',
        workLocation: locRaw || 'Planta Operacional',
        department: deptRaw || 'Operaciones',
        role: roleRaw || 'Operador',
        gender: 'Hombre',
        genderFit: 'unisex',
        type: typeRaw === 'permanente' ? 'permanente' : 'estival',
        sizes: {
          shirt: (shirtRaw || 'L') as ShirtSize,
          pants: (pantsRaw || '42') as PantsSize,
          footwear: (footRaw || '42') as FootwearSize,
          jacket: (jacketRaw || 'L') as JacketSize,
          headwear: headRaw || 'Estándar',
          blusa: '',
          camisa: shirtRaw || '',
          sweater: '',
          polar: '',
          parka: jacketRaw || '',
          corbata: 'Si aplica',
        },
        surveyStatus: 'completado',
        deliveryStatus: 'sin_entregar',
        contractStart: '2026-08-01',
        timestamp: new Date().toLocaleString('es-CL'),
      });
    }
  }

  return {
    success: parsedEmployees.length > 0,
    data: parsedEmployees,
    errors,
    totalParsed: parsedEmployees.length,
  };
}

/**
 * Parsea CSV de Matriz de Inventario y genera filas de matriz e ítems individuales
 */
export function parseInventoryMatrixCsv(
  csvText: string,
  targetSeason?: string
): {
  matrixRows: MatrixRow[];
  inventoryItems: InventoryItem[];
} {
  const lines = splitCsvLines(csvText);
  const matrixRows: MatrixRow[] = [];
  const inventoryItems: InventoryItem[] = [];

  if (lines.length === 0) {
    return { matrixRows, inventoryItems };
  }

  // Auto-detect season if not provided
  let detectedSeason = targetSeason;
  if (!detectedSeason) {
    const lowerText = csvText.toLowerCase();
    if (lowerText.includes('verano') || lowerText.includes('m/c')) {
      detectedSeason = '2025 verano';
    } else if (lowerText.includes('2025') && lowerText.includes('invierno')) {
      detectedSeason = '2025 invierno';
    } else if (lowerText.includes('2026') || lowerText.includes('invierno') || lowerText.includes('m/l') || lowerText.includes('polar') || lowerText.includes('parka')) {
      detectedSeason = '2026 invierno';
    } else {
      detectedSeason = '2026 invierno';
    }
  }

  const delimiter = detectDelimiter(lines[0]);
  let rowId = 1;
  let itemId = 1;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (
      rawLine.toLowerCase().startsWith('emp;ubicaci') ||
      rawLine.toLowerCase().startsWith('emp,ubicaci') ||
      rawLine.toLowerCase().startsWith('emp\tubicaci')
    ) {
      continue; // encabezado
    }

    const parts = rawLine.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
    if (parts.length < 3) continue;

    const company = parts[0] || 'General';
    const storageType = parts[1] || 'General';
    const garmentName = parts[2] || '';
    if (!garmentName) continue;

    // Determine row-level season if garment specifically indicates M/C vs M/L and no forced targetSeason
    let rowSeason = detectedSeason;
    if (!targetSeason) {
      if (garmentName.toLowerCase().includes('m/c')) {
        rowSeason = '2025 verano';
      } else if (garmentName.toLowerCase().includes('m/l') || garmentName.toLowerCase().includes('polar') || garmentName.toLowerCase().includes('parka')) {
        rowSeason = '2026 invierno';
      }
    }

    const sizeStocks: Record<string, number> = {};
    let totalCalculated = 0;

    for (let c = 0; c < SIZE_COLUMNS.length; c++) {
      const colName = SIZE_COLUMNS[c];
      const rawVal = parts[3 + c] || '';
      const cleanNum = rawVal.replace(/-/g, '').trim();
      const qty = cleanNum ? parseInt(cleanNum, 10) : 0;
      if (!isNaN(qty) && qty > 0) {
        sizeStocks[colName] = qty;
        totalCalculated += qty;

        // Generar InventoryItem
        let category: 'superior' | 'inferior' | 'abrigo' | 'proteccion' = 'superior';
        const gLow = garmentName.toLowerCase();
        if (gLow.includes('pantal')) category = 'inferior';
        else if (gLow.includes('polar') || gLow.includes('parka') || gLow.includes('sweater')) category = 'abrigo';
        else if (gLow.includes('corbata')) category = 'proteccion';

        const code = `${company.toUpperCase().slice(0, 3)}-${garmentName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)}-${colName}-${storageType.slice(0, 3).toUpperCase()}`;

        inventoryItems.push({
          id: `inv-imp-${itemId++}`,
          code,
          name: garmentName,
          category,
          size: colName,
          currentStock: qty,
          minStock: Math.max(2, Math.floor(qty * 0.15)),
          unitCostCLP: category === 'inferior' ? 24900 : category === 'abrigo' ? 28900 : 14900,
          location: `${company} - ${storageType}`,
          lastUpdated: new Date().toLocaleString('es-CL'),
          company,
          storageType,
          season: rowSeason,
        });
      }
    }

    const rawTotal = parts[parts.length - 1] ? parts[parts.length - 1].replace(/-/g, '').trim() : '';
    const parsedTotal = rawTotal ? parseInt(rawTotal, 10) : totalCalculated;

    matrixRows.push({
      id: `mat-imp-${rowId++}`,
      season: rowSeason,
      company,
      storageType,
      garmentName,
      sizes: sizeStocks,
      total: parsedTotal || totalCalculated,
    });
  }

  return { matrixRows, inventoryItems };
}
