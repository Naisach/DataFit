import React, { useState, useRef } from 'react';
import { useUniforms } from '../context/UniformsContext';
import {
  parseEmployeesCsv,
  parseInventoryMatrixCsv,
  detectCsvType,
} from '../services/csvParserService';
import {
  X,
  Upload,
  FileSpreadsheet,
  Users,
  Boxes,
  CheckCircle2,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'employees' | 'inventory';
}

const SAMPLE_EMPLOYEES_CSV = `Marca temporal;Empresa;Identificador;Genero;Cargo;Talla de blusa;Talla de camisa;  Talla de sweater;  Talla de polar  ;  Talla de parka  ;Talla de pantalón;Corbata
30-07-2026 17:51:22;Buses Bio Bio SpA;1;Mujer;Cajero/a;XL;;M;XL;L;48;No aplica
30-07-2026 17:53:53;Buses Bio Bio SpA;2;Mujer;Cajero/a;S;;XS;S;XS;42;No aplica
30-07-2026 17:54:45;Buses Bio Bio SpA;3;Hombre;Cajero/a;;M;M;M;L;46;Si aplica
31-07-2026 11:31:34;Cia. Jac Transportes SpA;258;Hombre;Operador servicio al cliente;;M;M;M;S;44;Si aplica
31-07-2026 11:32:32;Cia. Jac Transportes SpA;259;Mujer;Cajero/a;L;;L;L;M;44;No aplica`;

const SAMPLE_INVENTORY_CSV = `EMP;Ubicación;PRENDA;XS;S;M;L;XL;2XL;3XL;4XL;-;36;38;40;42;44;46;48;50;52;54;56;58;60;62;64;Total
JAC;Caja;Camisa hombre M/C; - ; 2 ; 45 ; 79 ; 75 ; 69 ; 15 ; 11 ;;;;;;;;;;;;;;;;; 296
JAC;Caja;Blusa mujer M/C; 5 ; 21 ; 16 ; 25 ; 16 ; 21 ; 7 ; 9 ;;;;;;;;;;;;;;;;; 120
BBB;Caja;Camisa hombre M/C; - ; 51 ; 188 ; 130 ; 70 ; 150 ; 39 ; 28 ;;;;;;;;;;;;;;;;; 656
BBB;Caja;Sweater unisex M/C; 3 ; 15 ; 54 ; 45 ; 30 ; 16 ; 16 ; 4 ;;;;;;;;;;;;;;;;; 183
;Caja;Pantalón hombre;;;;;;;;;; - ; - ; - ; 20 ; - ; 15 ; 22 ; 40 ; 15 ; 20 ; 5 ; - ; 4 ; - ; 2 ; 143`;

export const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'employees',
}) => {
  const {
    importEmployeesBatch,
    importInventoryMatrixBatch,
    resetToOfficialData,
  } = useUniforms();

  const [activeTab, setActiveTab] = useState<'employees' | 'inventory'>(defaultTab);
  const [csvContent, setCsvContent] = useState('');
  const [targetSeason, setTargetSeason] = useState<string>('auto');
  const [replaceAll, setReplaceAll] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setErrorMessage(null);
    setSuccessMessage(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCsvContent(text);
        // Auto-detect type
        const detected = detectCsvType(text);
        if (detected === 'inventory_matrix') {
          setActiveTab('inventory');
        } else if (detected === 'employees') {
          setActiveTab('employees');
        }
      }
    };
    reader.onerror = () => {
      setErrorMessage('Error al leer el archivo seleccionado.');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleProcessImport = () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!csvContent.trim()) {
      setErrorMessage('Por favor ingresa o sube un archivo CSV antes de procesar.');
      return;
    }

    setIsProcessing(true);

    try {
      if (activeTab === 'employees') {
        const result = parseEmployeesCsv(csvContent);
        if (!result.success || result.data.length === 0) {
          setErrorMessage('No se pudieron encontrar registros válidos de trabajadores en el CSV.');
          setIsProcessing(false);
          return;
        }

        importEmployeesBatch(result.data, replaceAll);
        setSuccessMessage(
          `¡Éxito! Se han importado ${result.data.length} registros de trabajadores (${
            replaceAll ? 'reemplazando' : 'añadiendo a'
          } la lista).`
        );
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        // Inventory Matrix
        const seasonParam = targetSeason === 'auto' ? undefined : targetSeason;
        const { matrixRows, inventoryItems } = parseInventoryMatrixCsv(csvContent, seasonParam);
        if (matrixRows.length === 0) {
          setErrorMessage('No se pudieron encontrar filas de matriz de inventario válidas en el CSV.');
          setIsProcessing(false);
          return;
        }

        importInventoryMatrixBatch(matrixRows, inventoryItems, replaceAll);
        setSuccessMessage(
          `¡Éxito! Se han importado ${matrixRows.length} filas de matriz (${inventoryItems.length} ítems de stock) asociadas a "${seasonParam || 'temporada auto-detectada'}".`
        );
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMessage(`Error al procesar el archivo CSV: ${err.message || 'Formato desconocido'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadOfficialDefault = () => {
    resetToOfficialData();
    setSuccessMessage('¡Se han restaurado los datos oficiales completos de Buses Bío Bío y JAC Transportes (513 trabajadores y matriz de inventario)!');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Carga Masiva de Datos por CSV
              </h2>
              <p className="text-xs text-slate-500">
                Importa planillas de registros de trabajadores o matriz de inventario (Buses Bío Bío / JAC)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 mb-4 gap-2">
          <button
            onClick={() => {
              setActiveTab('employees');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'employees'
                ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Nómina de Trabajadores y Tallas</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('inventory');
              setErrorMessage(null);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'inventory'
                ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span>Matriz de Inventario (Prendas / Tallas)</span>
          </button>
        </div>

        {/* Guidance and Template helper */}
        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <div className="space-y-1">
              <span className="font-bold text-slate-800">
                Formato reconocido ({activeTab === 'employees' ? 'Trabajadores' : 'Inventario'}):
              </span>
              <p className="text-[11px] text-slate-600 font-mono">
                {activeTab === 'employees'
                  ? 'Marca temporal; Empresa; Identificador; Genero; Cargo; Talla de blusa; Talla de camisa; Talla de sweater; Talla de polar; Talla de parka; Talla de pantalón; Corbata'
                  : 'EMP; Ubicación; PRENDA; XS; S; M; L; XL; 2XL; 3XL; 4XL; -; 36; 38; ...; 64; Total'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setCsvContent(activeTab === 'employees' ? SAMPLE_EMPLOYEES_CSV : SAMPLE_INVENTORY_CSV);
                setFileName(activeTab === 'employees' ? 'ejemplo_trabajadores.csv' : 'ejemplo_inventario.csv');
                setErrorMessage(null);
              }}
              className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-[11px] whitespace-nowrap shadow-xs"
            >
              Insertar ejemplo
            </button>
          </div>

          {/* File Picker & Drag-Drop area */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-4 text-center cursor-pointer bg-slate-50/50 hover:bg-amber-50/20 transition-colors"
            >
              <FileSpreadsheet className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700">
                Haz clic aquí para seleccionar un archivo CSV desde tu computador
              </p>
              <p className="text-[11px] text-slate-500">
                Compatible con separadores punto y coma (;), coma (,) o tabulaciones
              </p>
              {fileName && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md font-semibold text-xs">
                  <FileText className="w-3.5 h-3.5" />
                  <span>{fileName}</span>
                </div>
              )}
            </div>
          </div>

          {/* Text Area for pasting */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">
                O pega directamente el contenido CSV:
              </label>
              {csvContent && (
                <span className="text-[11px] text-slate-500">
                  {csvContent.split('\n').filter((l) => l.trim()).length} líneas detectadas
                </span>
              )}
            </div>
            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Pega aquí las filas de tu hoja de cálculo o archivo CSV..."
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Season Selector for Inventory */}
          {activeTab === 'inventory' && (
            <div className="flex items-center justify-between bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
              <div>
                <span className="font-semibold text-slate-800 text-xs block">
                  Temporada asignada a esta planilla:
                </span>
                <span className="text-[11px] text-slate-500">
                  Selecciona la temporada correspondiente para clasificar las tablas
                </span>
              </div>
              <select
                value={targetSeason}
                onChange={(e) => setTargetSeason(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="auto">⚡ Auto-detectar según archivo / prendas</option>
                <option value="2025 verano">☀️ 2025 Verano (VERANO2025.csv)</option>
                <option value="2025 invierno">❄️ 2025 Invierno</option>
                <option value="2026 invierno">❄️ 2026 Invierno (INVIERNO2026.csv)</option>
              </select>
            </div>
          )}

          {/* Mode Option: Replace or Append */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="font-semibold text-slate-700">Modo de importación:</span>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="importMode"
                  checked={!replaceAll}
                  onChange={() => setReplaceAll(false)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-800">Añadir a los existentes</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                <input
                  type="radio"
                  name="importMode"
                  checked={replaceAll}
                  onChange={() => setReplaceAll(true)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-slate-800 font-semibold text-rose-700">
                  Reemplazar datos actuales
                </span>
              </label>
            </div>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleLoadOfficialDefault}
              className="w-full sm:w-auto px-3.5 py-2 text-xs font-bold text-amber-800 bg-amber-100/70 hover:bg-amber-200 rounded-lg transition-colors flex items-center justify-center gap-1.5"
              title="Restaura la nómina completa de 513 trabajadores y toda la matriz de inventario provista"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Cargar Nómina Oficial Completa (513 trab. + Matriz)</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cerrar
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleProcessImport}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessing ? 'Procesando...' : 'Procesar e Importar CSV'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
