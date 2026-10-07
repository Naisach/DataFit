import { getAccessToken } from './authService';
import { Employee, UniformDelivery, PurchasePlanItem, SeasonPlanningConfig } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  iconLink?: string;
  thumbnailLink?: string;
  parents?: string[];
}

const APP_FOLDER_NAME = 'DataFit Uniformes & EPP';

/**
 * Get or create the dedicated app folder in the user's Google Drive.
 */
export async function getOrCreateAppFolder(): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesión de Google Drive activa. Por favor inicie sesión.');

  // Search for existing folder
  const query = encodeURIComponent(
    `name = '${APP_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    const err = await searchRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al buscar la carpeta en Google Drive');
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if it doesn't exist
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: APP_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Carpeta oficial de respaldos, nóminas y órdenes de compra de DataFit',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al crear la carpeta en Google Drive');
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * List files from the dedicated DataFit folder or across user's drive.
 */
export async function listDriveFiles(
  folderId?: string,
  searchTerm?: string
): Promise<{ files: DriveFileItem[]; folderId: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesión de Google Drive activa. Por favor inicie sesión.');

  const targetFolderId = folderId || (await getOrCreateAppFolder());

  let qParts = [`'${targetFolderId}' in parents`, `trashed = false`];
  if (searchTerm && searchTerm.trim()) {
    const escaped = searchTerm.trim().replace(/'/g, "\\'");
    qParts.push(`name contains '${escaped}'`);
  }

  const q = encodeURIComponent(qParts.join(' and '));
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,modifiedTime,createdTime,webViewLink,webContentLink,iconLink,thumbnailLink,parents)&orderBy=modifiedTime desc&pageSize=50`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al listar archivos de Google Drive');
  }

  const data = await res.json();
  return { files: data.files || [], folderId: targetFolderId };
}

/**
 * Uploads a file (text, csv, json) to Google Drive using multipart upload.
 */
export async function uploadFileToDrive({
  name,
  content,
  mimeType,
  folderId,
}: {
  name: string;
  content: string | Blob;
  mimeType: string;
  folderId?: string;
}): Promise<DriveFileItem> {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesión de Google Drive activa. Por favor inicie sesión.');

  const targetFolderId = folderId || (await getOrCreateAppFolder());

  const metadata = {
    name,
    mimeType,
    parents: [targetFolderId],
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const textContent = typeof content === 'string' ? content : await content.text();

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    textContent +
    closeDelimiter;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al subir el archivo a Google Drive');
  }

  return await res.json();
}

/**
 * Deletes a file from Google Drive.
 * (MANDATORY: Caller must ensure the user has confirmed before calling this)
 */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesión de Google Drive activa. Por favor inicie sesión.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al eliminar archivo de Google Drive');
  }
}

/**
 * Downloads and reads the content of a file from Google Drive.
 */
export async function getDriveFileContent(fileId: string): Promise<string> {
  const token = await getAccessToken();
  if (!token) throw new Error('No hay sesión de Google Drive activa. Por favor inicie sesión.');

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Error al descargar el contenido del archivo desde Google Drive');
  }

  return await res.text();
}

// -------------------------------------------------------------
// Specialized Exporters to Google Drive for DataFit
// -------------------------------------------------------------

/**
 * Generates and uploads the Employees Size Register (CSV) directly to Drive.
 */
export async function exportEmployeesToDrive(employees: Employee[]): Promise<DriveFileItem> {
  const headers = [
    'RUT',
    'Nombre Completo',
    'Tipo Dotación',
    'Departamento / Fundo',
    'Ubicación / Faena',
    'Cargo',
    'Corte Género',
    'Talla Camisa/Polera',
    'Talla Pantalón',
    'Calzado Seguridad',
    'Talla Parka/Abrigo',
    'Protección Solar Cabeza',
    'Estado Tallas',
    'Estado Entrega',
    'Fecha Inicio Contrato',
    'Fecha Término (Estival)',
    'Fecha Última Actualización',
  ];

  const rows = employees.map((e) => [
    `"${e.rut}"`,
    `"${e.fullName}"`,
    `"${e.type === 'permanente' ? 'Permanente' : 'Temporada Estival'}"`,
    `"${e.department}"`,
    `"${e.workLocation}"`,
    `"${e.role}"`,
    `"${e.genderFit}"`,
    `"${e.sizes.shirt}"`,
    `"${e.sizes.pants}"`,
    `"${e.sizes.footwear}"`,
    `"${e.sizes.jacket}"`,
    `"${e.sizes.headwear}"`,
    `"${e.surveyStatus === 'completado' ? 'Completado' : 'Pendiente'}"`,
    `"${e.deliveryStatus}"`,
    `"${e.contractStart}"`,
    `"${e.contractEnd || 'Indefinido'}"`,
    `"${e.updatedAt}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const fileName = `Nomina_Tallas_Uniformes_DataFit_${new Date().toISOString().split('T')[0]}.csv`;

  return await uploadFileToDrive({
    name: fileName,
    content: csvContent,
    mimeType: 'text/csv',
  });
}

/**
 * Generates and uploads the Procurement & Purchase Order (CSV) directly to Drive.
 */
export async function exportProcurementPlanToDrive(
  purchasePlan: PurchasePlanItem[],
  planningConfig: SeasonPlanningConfig,
  totalBudgetCLP: number
): Promise<DriveFileItem> {
  const headers = [
    'Categoría',
    'Prenda / EPP',
    'Talla',
    'Tallas Confirmadas',
    'Buffer Desviación (%)',
    'Unidades Buffer Talla',
    'Proyección Temporada Estival',
    'Total a Comprar (Unidades)',
    'Costo Unitario (CLP)',
    'Subtotal Presupuesto (CLP)',
  ];

  const rows = purchasePlan.map((item) => [
    `"${item.category.toUpperCase()}"`,
    `"${item.garmentName}"`,
    `"${item.size}"`,
    item.confirmedCount,
    `${item.bufferPercentage}%`,
    item.bufferUnits,
    item.projectedSeasonalAddition,
    item.totalToOrder,
    item.unitCost,
    item.totalCost,
  ]);

  const summary = [
    [],
    ['"RESUMEN PLANIFICACIÓN DE COMPRAS"', '""', '""'],
    [`"Campaña"`, `"${planningConfig.seasonName}"`],
    [`"Fecha Límite Taller Textil (Lead Time)"`, `"${planningConfig.supplierCutoffDate}"`],
    [`"Fecha Objetivo Entrega en Faena"`, `"${planningConfig.targetDeliveryDate}"`],
    [`"Presupuesto Total Estimado CLP"`, `"$${totalBudgetCLP.toLocaleString('es-CL')} CLP"`],
    [`"Fecha Generación Reporte Google Drive"`, `"${new Date().toLocaleString('es-CL')}"`],
  ];

  const csvContent =
    '\uFEFF' +
    [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
      ...summary.map((r) => r.join(',')),
    ].join('\n');

  const fileName = `Orden_Compra_Uniformes_${planningConfig.seasonName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;

  return await uploadFileToDrive({
    name: fileName,
    content: csvContent,
    mimeType: 'text/csv',
  });
}

/**
 * Generates and uploads Deliveries & Dispatch report to Drive.
 */
export async function exportDeliveriesToDrive(deliveries: UniformDelivery[]): Promise<DriveFileItem> {
  const headers = [
    'Código Despacho',
    'Colaborador',
    'RUT',
    'Tipo Dotación',
    'Departamento / Fundo',
    'Kit Entregado',
    'Prendas y Tallas Detalladas',
    'Estado Entrega',
    'Fecha de Despacho',
    'Despachador Responsable',
    'Firma Digital Receptor',
    'Observaciones',
  ];

  const rows = deliveries.map((d) => [
    `"${d.deliveryCode}"`,
    `"${d.employeeName}"`,
    `"${d.employeeRut}"`,
    `"${d.employeeType === 'permanente' ? 'Permanente' : 'Temporada Estival'}"`,
    `"${d.department}"`,
    `"${d.kitName}"`,
    `"${d.items.map((i) => `${i.name} [Talla ${i.size}]`).join(' | ')}"`,
    `"${d.status.toUpperCase()}"`,
    `"${d.deliveryDate}"`,
    `"${d.dispatcherName}"`,
    `"${d.signedAt ? `Firmado digitalmente el ${d.signedAt}` : 'Pendiente firma'}"`,
    `"${d.comments || ''}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const fileName = `Actas_Entregas_EPP_Uniformes_${new Date().toISOString().split('T')[0]}.csv`;

  return await uploadFileToDrive({
    name: fileName,
    content: csvContent,
    mimeType: 'text/csv',
  });
}

/**
 * Creates a complete JSON backup file in Google Drive.
 */
export async function exportFullBackupToDrive(data: {
  employees: Employee[];
  deliveries: UniformDelivery[];
  planningConfig: SeasonPlanningConfig;
}): Promise<DriveFileItem> {
  const backupObject = {
    version: '1.0.0',
    app: 'DataFit Uniformes & EPP',
    timestamp: new Date().toISOString(),
    planningConfig: data.planningConfig,
    employeesCount: data.employees.length,
    deliveriesCount: data.deliveries.length,
    data: {
      employees: data.employees,
      deliveries: data.deliveries,
    },
  };

  const jsonContent = JSON.stringify(backupObject, null, 2);
  const fileName = `DataFit_Backup_Completo_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

  return await uploadFileToDrive({
    name: fileName,
    content: jsonContent,
    mimeType: 'application/json',
  });
}
