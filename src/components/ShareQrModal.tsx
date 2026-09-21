import React, { useState } from 'react';
import { X, QrCode, Copy, Check, Share2, Smartphone, ExternalLink, Printer } from 'lucide-react';

interface ShareQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSelfService: () => void;
}

export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  isOpen,
  onClose,
  onOpenSelfService,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://uniformes-cloud.app';
  const surveyUrl = `${currentOrigin}/#autoregistro-tallas-2026`;

  const handleCopy = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Portal de Autoregistro Móvil
              </h2>
              <p className="text-xs text-slate-500">
                Comparte este código o link con los trabajadores
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-center">
          {/* QR Code graphic */}
          <div className="p-5 bg-amber-50/50 border border-amber-200/80 rounded-2xl flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 inline-block">
              {/* SVG QR Code Simulation */}
              <svg
                viewBox="0 0 100 100"
                className="w-40 h-40 text-slate-900"
                fill="currentColor"
              >
                {/* QR Finder patterns */}
                <rect x="5" y="5" width="28" height="28" fill="#0f172a" rx="4" />
                <rect x="9" y="9" width="20" height="20" fill="#ffffff" rx="2" />
                <rect x="13" y="13" width="12" height="12" fill="#0f172a" rx="1" />

                <rect x="67" y="5" width="28" height="28" fill="#0f172a" rx="4" />
                <rect x="71" y="9" width="20" height="20" fill="#ffffff" rx="2" />
                <rect x="75" y="13" width="12" height="12" fill="#0f172a" rx="1" />

                <rect x="5" y="67" width="28" height="28" fill="#0f172a" rx="4" />
                <rect x="9" y="71" width="20" height="20" fill="#ffffff" rx="2" />
                <rect x="13" y="75" width="12" height="12" fill="#0f172a" rx="1" />

                {/* Simulated Matrix Dots */}
                <rect x="38" y="8" width="6" height="6" rx="1" />
                <rect x="48" y="12" width="6" height="6" rx="1" />
                <rect x="56" y="8" width="6" height="6" rx="1" />
                <rect x="40" y="24" width="6" height="6" rx="1" />
                <rect x="50" y="26" width="6" height="6" rx="1" />

                <rect x="10" y="40" width="6" height="6" rx="1" />
                <rect x="22" y="44" width="6" height="6" rx="1" />
                <rect x="38" y="40" width="6" height="6" rx="1" />
                <rect x="46" y="44" width="8" height="8" rx="1" fill="#d97706" />
                <rect x="60" y="40" width="6" height="6" rx="1" />
                <rect x="74" y="42" width="6" height="6" rx="1" />
                <rect x="84" y="44" width="6" height="6" rx="1" />

                <rect x="38" y="60" width="6" height="6" rx="1" />
                <rect x="50" y="64" width="6" height="6" rx="1" />
                <rect x="60" y="58" width="6" height="6" rx="1" />
                <rect x="72" y="66" width="6" height="6" rx="1" />
                <rect x="84" y="60" width="6" height="6" rx="1" />
                <rect x="44" y="76" width="6" height="6" rx="1" />
                <rect x="56" y="78" width="6" height="6" rx="1" />
                <rect x="68" y="82" width="6" height="6" rx="1" />
                <rect x="80" y="76" width="6" height="6" rx="1" />
              </svg>
            </div>

            <p className="mt-3 text-xs font-semibold text-slate-800">
              Escanea para ingresar tallas desde el celular
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Optimizado para cuadrillas agrícolas, operarios de envasado y personal de terreno sin cuenta corporativa.
            </p>
          </div>

          {/* Shareable Link Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={surveyUrl}
              className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600 truncate"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenSelfService();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Abrir Simulador Móvil</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 py-2 px-3 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Afiche</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
