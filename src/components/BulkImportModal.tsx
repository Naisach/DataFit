import React, { useState } from 'react';
import { Employee, ShirtSize, PantsSize, FootwearSize, JacketSize } from '../types';
import { X, Upload, FileText, Check, AlertCircle } from 'lucide-react';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (newEmployees: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

const SAMPLE_CSV = `23.456.789-1,Rodrigo Esteban Tapia Mella,estival,L,44,42,L,Legionario UV,Operaciones Agrícolas,Fundo Alto Jahuel,Recolector
22.987.654-3,Francisca Belén Morales Cruz,estival,M,40,38,M,Legionario UV,Línea de Envasado,Planta Paine,Operaria Empaque
21.876.543-2,Cristián Alejandro Silva Toro,estival,XL,46,43,XL,Legionario UV,Bodega & Despacho,San Bernardo,Auxiliar Bodega
20.765.432-8,Constanza Nicole Vera Ortiz,estival,S,38,37,S,Legionario UV,Control Calidad,Planta Paine,Inspectora
19.654.321-9,Fabián Andrés Pizarro Ramos,estival,M,42,41,M,Legionario UV,Operaciones Agrícolas,Fundo Alto Jahuel,Cuadrillero`;

export const BulkImportModal: React.FC<BulkImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [csvText, setCsvText] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleParseAndImport = () => {
    setError(null);
    if (!csvText.trim()) {
      setError('Por favor ingresa datos en formato CSV.');
      return;
    }

    try {
      const lines = csvText.trim().split('\n');
      const parsed: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>[] = [];

      lines.forEach((line, idx) => {
        const parts = line.split(',').map((p) => p.trim());
        if (parts.length >= 6) {
          const [rut, fullName, typeRaw, shirtRaw, pantsRaw, footRaw, jacketRaw, headRaw, deptRaw, locRaw, roleRaw] = parts;
          parsed.push({
            rut: rut || `20.${Math.floor(Math.random() * 899 + 100)}.${Math.floor(Math.random() * 899 + 100)}-${idx}`,
            fullName: fullName || `Trabajador Temporada ${idx + 1}`,
            email: `${(rut || 'trabajador').replace(/[^0-9]/g, '')}@temporada.com`,
            phone: '+56 9 7000 0000',
            type: (typeRaw === 'permanente' ? 'permanente' : 'estival'),
            department: deptRaw || 'Operaciones & Faena',
            workLocation: locRaw || 'Planta Operacional',
            role: roleRaw || 'Operario de Temporada',
            genderFit: 'unisex',
            sizes: {
              shirt: (shirtRaw || 'L') as ShirtSize,
              pants: (pantsRaw || '42') as PantsSize,
              footwear: (footRaw || '42') as FootwearSize,
              jacket: (jacketRaw || 'L') as JacketSize,
              headwear: headRaw || 'Legionario UV',
            },
            surveyStatus: 'completado',
            contractStart: '2026-11-01',
            contractEnd: '2027-03-31',
            deliveryStatus: 'sin_entregar',
            notes: 'Importado por carga masiva.',
          });
        }
      });

      if (parsed.length === 0) {
        setError('No se pudo reconocer ninguna fila válida. Revisa el formato.');
        return;
      }

      onImport(parsed);
      onClose();
    } catch (e: any) {
      setError('Error al procesar el texto CSV: ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Carga Masiva de Cuadrillas y Temporeros
              </h2>
              <p className="text-xs text-slate-500">
                Pega la nómina de trabajadores de temporada estival con sus tallas
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

        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-slate-600 space-y-1">
            <p className="font-semibold text-slate-800">
              Formato esperado por línea (separado por comas):
            </p>
            <code className="text-[11px] block bg-white p-1.5 rounded border border-slate-200 text-slate-700 font-mono">
              RUT, Nombre Completo, Tipo(estival/permanente), Polera(S/M/L), Pantalón(40/42), Calzado(41/42), Chaqueta, Gorro, Departamento, Sede, Cargo
            </code>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-semibold text-slate-700">Contenido CSV / Texto</label>
              <button
                type="button"
                onClick={() => setCsvText(SAMPLE_CSV)}
                className="text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Cargar plantilla de 5 temporeros de prueba
              </button>
            </div>
            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Pega aquí las filas de Excel o CSV..."
              className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleParseAndImport}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all shadow-xs flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Procesar e Importar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
