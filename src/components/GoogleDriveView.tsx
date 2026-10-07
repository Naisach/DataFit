import React, { useState, useEffect } from 'react';
import { useUniforms } from '../context/UniformsContext';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken,
  DRIVE_SCOPES,
} from '../services/authService';
import {
  listDriveFiles,
  deleteDriveFile,
  getDriveFileContent,
  exportEmployeesToDrive,
  exportProcurementPlanToDrive,
  exportDeliveriesToDrive,
  exportFullBackupToDrive,
  uploadFileToDrive,
  DriveFileItem,
} from '../services/googleDriveService';
import { User } from 'firebase/auth';
import {
  HardDrive,
  UploadCloud,
  FileSpreadsheet,
  FileText,
  PackageCheck,
  ShieldCheck,
  ExternalLink,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  LogOut,
  Database,
  ArrowDownToLine,
  FilePlus2,
  Lock,
} from 'lucide-react';

export const GoogleDriveView: React.FC = () => {
  const {
    employees,
    deliveries,
    purchasePlan,
    planningConfig,
    totalBudgetCLP,
    restoreBackup,
  } = useUniforms();

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Files state
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Operation loading state
  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Delete confirmation modal state (MANDATORY User confirmation for destructive operations)
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Restore confirmation modal state
  const [fileToRestore, setFileToRestore] = useState<{ id: string; name: string } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Custom file upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
        setIsLoadingAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setIsLoadingAuth(false);
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Fetch files when user is logged in
  useEffect(() => {
    if (token) {
      loadFiles();
    }
  }, [token]);

  const loadFiles = async (search?: string) => {
    setIsLoadingFiles(true);
    try {
      const res = await listDriveFiles(undefined, search !== undefined ? search : searchTerm);
      setFiles(res.files);
    } catch (err: any) {
      console.error('Error al cargar archivos de Drive:', err);
      setNotification({
        type: 'error',
        message: err.message || 'No se pudieron listar los archivos de Google Drive.',
      });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setNotification(null);
    try {
      const res = await googleSignIn();
      setUser(res.user);
      setToken(res.accessToken);
      setNotification({
        type: 'success',
        message: `Conectado exitosamente con Google Drive como ${res.user.displayName || res.user.email}.`,
      });
    } catch (err: any) {
      console.error('Error signing in:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Error al iniciar sesión con Google.',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setFiles([]);
      setNotification({
        type: 'info',
        message: 'Sesión de Google Drive cerrada.',
      });
    } catch (err: any) {
      console.error('Error logging out:', err);
    }
  };

  // Generic wrapper for export tasks
  const runDriveAction = async (actionName: string, task: () => Promise<DriveFileItem>) => {
    if (!token) {
      setNotification({
        type: 'error',
        message: 'Por favor inicia sesión con Google para sincronizar con Drive.',
      });
      return;
    }

    setBusyAction(actionName);
    setNotification(null);
    try {
      const uploaded = await task();
      setNotification({
        type: 'success',
        message: `¡Archivo "${uploaded.name}" guardado exitosamente en Google Drive!`,
      });
      await loadFiles();
    } catch (err: any) {
      console.error(`Error en acción ${actionName}:`, err);
      setNotification({
        type: 'error',
        message: err.message || 'Error al guardar el archivo en Google Drive.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  // Delete handler with explicit confirmation
  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDriveFile(fileToDelete.id);
      setNotification({
        type: 'success',
        message: `El archivo "${fileToDelete.name}" fue eliminado de Google Drive.`,
      });
      setFileToDelete(null);
      await loadFiles();
    } catch (err: any) {
      console.error('Error al eliminar archivo:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Error al eliminar el archivo de Google Drive.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Restore handler for full JSON backup
  const confirmRestoreFile = async () => {
    if (!fileToRestore) return;
    setIsRestoring(true);
    try {
      const content = await getDriveFileContent(fileToRestore.id);
      const parsed = JSON.parse(content);
      if (!parsed.data && !parsed.employees) {
        throw new Error('El formato del archivo de respaldo no es válido para DataFit.');
      }

      const employeesData = parsed.data?.employees || parsed.employees || [];
      const deliveriesData = parsed.data?.deliveries || parsed.deliveries || [];
      const planningData = parsed.planningConfig;

      restoreBackup({
        employees: employeesData,
        deliveries: deliveriesData,
        planningConfig: planningData,
      });

      setNotification({
        type: 'success',
        message: `¡Datos restaurados con éxito! Se cargaron ${employeesData.length} trabajadores y ${deliveriesData.length} despachos desde Google Drive.`,
      });
      setFileToRestore(null);
    } catch (err: any) {
      console.error('Error al restaurar respaldo:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Error al procesar el archivo de respaldo seleccionado.',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // Custom file upload handler
  const handleCustomUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setBusyAction('custom_upload');
    setNotification(null);
    try {
      await uploadFileToDrive({
        name: uploadFile.name,
        content: uploadFile,
        mimeType: uploadFile.type || 'application/octet-stream',
      });

      setNotification({
        type: 'success',
        message: `Archivo "${uploadFile.name}" subido exitosamente a la carpeta de Google Drive.`,
      });
      setUploadFile(null);
      await loadFiles();
    } catch (err: any) {
      console.error('Error en subida:', err);
      setNotification({
        type: 'error',
        message: err.message || 'Error al subir archivo a Google Drive.',
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <HardDrive className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight font-display">
                Integración con Google Drive
              </h1>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                Workspace API Activa
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Respalde nóminas de tallas, actas de entrega de EPP y órdenes de compra de uniformes directamente en su nube corporativa.
            </p>
          </div>
        </div>

        {/* Auth status or Google Sign-In button */}
        <div className="shrink-0 w-full md:w-auto">
          {isLoadingAuth ? (
            <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
              <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
              <span>Verificando credenciales...</span>
            </div>
          ) : user && token ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 pl-3 rounded-xl">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Usuario'}
                  className="w-8 h-8 rounded-full border border-slate-300"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                  {user.email?.[0].toUpperCase() || 'U'}
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800 leading-tight">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-500 leading-tight truncate max-w-[160px]">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión de Google Drive"
                className="ml-2 text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-google-drive-signin"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full md:w-auto flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-medium px-4 py-2.5 rounded-xl border border-slate-300 shadow-xs hover:shadow transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span className="text-xs font-semibold">
                {isSigningIn ? 'Conectando con Google...' : 'Conectar con Google Drive'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start gap-3 border ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : 'bg-blue-50 text-blue-900 border-blue-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 font-medium">{notification.message}</div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quick Export Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <FolderSync className="w-4 h-4 text-amber-600" />
          Exportar & Sincronizar en Google Drive
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Nómina de Tallas */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-400/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Nómina de Tallas</h3>
              <p className="text-xs text-slate-500 mt-1">
                Exporta la base completa de {employees.length} colaboradores con sus tallas de camisa, pantalón, calzado y protección solar.
              </p>
            </div>
            <button
              id="btn-drive-export-employees"
              disabled={!token || busyAction !== null}
              onClick={() =>
                runDriveAction('employees', () => exportEmployeesToDrive(employees))
              }
              className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {busyAction === 'employees' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>Guardar en Drive</span>
            </button>
          </div>

          {/* Card 2: Plan de Compras */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-400/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Plan de Adquisiciones</h3>
              <p className="text-xs text-slate-500 mt-1">
                Genera la orden de compra con buffer estival y presupuesto total estimado (${(totalBudgetCLP / 1000000).toFixed(1)}M CLP).
              </p>
            </div>
            <button
              id="btn-drive-export-procurement"
              disabled={!token || busyAction !== null}
              onClick={() =>
                runDriveAction('procurement', () =>
                  exportProcurementPlanToDrive(purchasePlan, planningConfig, totalBudgetCLP)
                )
              }
              className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {busyAction === 'procurement' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>Guardar en Drive</span>
            </button>
          </div>

          {/* Card 3: Actas de Entrega */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-400/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <PackageCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Actas de Entrega y EPP</h3>
              <p className="text-xs text-slate-500 mt-1">
                Registro de trazabilidad y firmas de {deliveries.length} despachos para auditorías laborales y normativas de seguridad.
              </p>
            </div>
            <button
              id="btn-drive-export-deliveries"
              disabled={!token || busyAction !== null}
              onClick={() =>
                runDriveAction('deliveries', () => exportDeliveriesToDrive(deliveries))
              }
              className="mt-4 w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {busyAction === 'deliveries' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>Guardar en Drive</span>
            </button>
          </div>

          {/* Card 4: Backup Completo JSON */}
          <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs hover:border-amber-400/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Respaldo Integral (JSON)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Copia total de seguridad restaurable con dotación completa, despachos y parámetros de campaña.
              </p>
            </div>
            <button
              id="btn-drive-export-backup"
              disabled={!token || busyAction !== null}
              onClick={() =>
                runDriveAction('backup', () =>
                  exportFullBackupToDrive({ employees, deliveries, planningConfig })
                )
              }
              className="mt-4 w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors disabled:opacity-50 shadow-xs"
            >
              {busyAction === 'backup' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>Crear Respaldo en Drive</span>
            </button>
          </div>
        </div>
      </div>

      {/* Drive File Browser & Management */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                Archivos en Google Drive
              </h2>
              <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Carpeta: DataFit Uniformes & EPP
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulte, previsualice o descargue los documentos generados en su almacenamiento de Google Drive.
            </p>
          </div>

          {/* Search and Refresh controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadFiles()}
                placeholder="Buscar archivo en Drive..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={() => loadFiles()}
              disabled={!token || isLoadingFiles}
              title="Recargar archivos"
              className="p-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Upload Custom File to Drive bar */}
        {token && (
          <form
            onSubmit={handleCustomUpload}
            className="bg-slate-50/70 px-5 py-3 border-b border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-2 text-slate-700 w-full sm:w-auto">
              <FilePlus2 className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-medium">Subir archivo adicional a Google Drive:</span>
              <input
                type="file"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-white file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>
            <button
              type="submit"
              disabled={!uploadFile || busyAction === 'custom_upload'}
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              {busyAction === 'custom_upload' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              <span>Subir a Carpeta</span>
            </button>
          </form>
        )}

        {/* File List Table */}
        {!token ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Conexión a Google Drive requerida</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              Inicie sesión con su cuenta de Google para acceder a los archivos guardados, generar nóminas en la nube y sincronizar datos.
            </p>
            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-xs"
            >
              <span>Conectar con Google Drive</span>
            </button>
          </div>
        ) : isLoadingFiles ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <span>Consultando archivos en su Google Drive...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3 text-amber-600">
              <HardDrive className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No hay archivos en la carpeta de DataFit</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Utilice los botones superiores para exportar su primera nómina de tallas, orden de compra o copia de seguridad.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Nombre del Archivo</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Última Modificación</th>
                  <th className="py-3 px-4">Tamaño</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file) => {
                  const isJsonBackup = file.name.endsWith('.json') || file.name.includes('Backup');
                  const isCsv = file.name.endsWith('.csv');

                  return (
                    <tr key={file.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2.5">
                          {isJsonBackup ? (
                            <Database className="w-4 h-4 text-purple-600 shrink-0" />
                          ) : isCsv ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                          <span className="font-mono text-[12px] truncate max-w-xs md:max-w-md">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {isJsonBackup ? (
                          <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded font-medium border border-purple-200">
                            Respaldo DataFit
                          </span>
                        ) : isCsv ? (
                          <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium border border-emerald-200">
                            Planilla CSV
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                            {file.mimeType.split('/')[1] || 'Archivo'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                        {file.modifiedTime
                          ? new Date(file.modifiedTime).toLocaleString('es-CL', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {file.size ? `${(parseInt(file.size, 10) / 1024).toFixed(1)} KB` : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Open in Drive Link */}
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir en Google Drive"
                              className="inline-flex items-center gap-1 text-slate-600 hover:text-amber-700 bg-slate-100 hover:bg-amber-50 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Ver en Drive</span>
                            </a>
                          )}

                          {/* Restore Button (if it's a JSON backup) */}
                          {isJsonBackup && (
                            <button
                              onClick={() => setFileToRestore({ id: file.id, name: file.name })}
                              title="Restaurar datos desde este respaldo"
                              className="inline-flex items-center gap-1 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
                            >
                              <ArrowDownToLine className="w-3 h-3" />
                              <span>Restaurar</span>
                            </button>
                          )}

                          {/* Delete Button (triggers explicit confirmation dialog) */}
                          <button
                            onClick={() => setFileToDelete(file)}
                            title="Eliminar de Google Drive"
                            className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security & Scopes Information Footer */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Seguridad & Permisos OAuth:</strong> Los tokens de acceso de Google Drive se mantienen exclusivamente en memoria durante su sesión activa y nunca se guardan en almacenamiento no seguro.
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Proyecto Google Cloud: pure-run-9mn89
        </div>
      </div>

      {/* ============================================================== */}
      {/* MANDATORY CONFIRMATION MODAL: Destructive Delete Operation     */}
      {/* ============================================================== */}
      {fileToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                ¿Eliminar archivo de Google Drive?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Está a punto de eliminar de forma permanente el siguiente archivo de su cuenta de Google Drive:
              </p>
              <div className="bg-slate-100 p-2.5 rounded-lg text-xs font-mono text-slate-800 mt-3 break-all text-left border border-slate-200">
                📄 {fileToDelete.name}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                id="btn-confirm-delete-drive-file"
                onClick={confirmDeleteFile}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>Confirmar Eliminación</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* RESTORE CONFIRMATION MODAL                                     */}
      {/* ============================================================== */}
      {fileToRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
              <ArrowDownToLine className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900">
                ¿Restaurar respaldo desde Google Drive?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Se actualizarán la nómina de trabajadores, el historial de despachos y la configuración de adquisiciones con los datos contenidos en:
              </p>
              <div className="bg-purple-50 p-2.5 rounded-lg text-xs font-mono text-purple-900 mt-3 break-all text-left border border-purple-200">
                💾 {fileToRestore.name}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setFileToRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRestoreFile}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRestoring ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                <span>Restaurar Datos</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
