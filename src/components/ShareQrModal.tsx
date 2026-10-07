import React, { useState, useMemo, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  X,
  QrCode,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Printer,
  Download,
  Globe,
  Radio,
  CheckCircle2,
} from 'lucide-react';

interface ShareQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSelfService: () => void;
}

const DATAFIT_STUDIO_URL = 'https://datafit.ai.studio';
const SHARED_APP_URL = 'https://ais-pre-jgaj5xmtsu2q2mp3oeisym-373755366912.us-east1.run.app';

export const ShareQrModal: React.FC<ShareQrModalProps> = ({
  isOpen,
  onClose,
  onOpenSelfService,
}) => {
  const [copied, setCopied] = useState(false);
  const [urlMode, setUrlMode] = useState<'datafit' | 'preview'>('datafit');
  const [downloadDataUrl, setDownloadDataUrl] = useState<string | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : SHARED_APP_URL;

  const baseOrigin = urlMode === 'datafit' ? DATAFIT_STUDIO_URL : currentOrigin;
  const surveyUrl = `${baseOrigin}/?view=self_service#autoregistro`;

  // Generate real ISO/IEC compliant QR Code vector path
  const qrResult = useMemo(() => {
    try {
      const qr = QRCode.create(surveyUrl, { errorCorrectionLevel: 'M' });
      const size = qr.modules.size;
      const margin = 3;
      let d = '';
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (qr.modules.get(r, c)) {
            d += `M${c + margin},${r + margin}h1v1h-1z `;
          }
        }
      }
      return {
        size: size + margin * 2,
        path: d,
      };
    } catch (err) {
      console.error('Error generating QR code:', err);
      return null;
    }
  }, [surveyUrl]);

  // Generate high-resolution PNG for download or printing
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(surveyUrl, {
      width: 800,
      margin: 3,
      color: { dark: '#0f172a', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    })
      .then((dataUrl) => {
        if (isMounted) setDownloadDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate PNG QR', err);
      });

    return () => {
      isMounted = false;
    };
  }, [surveyUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(surveyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenExternal = () => {
    window.open(surveyUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Portal de Autoregistro Móvil
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  QR Real Activo
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Escanea con la cámara del celular para ingresar directamente
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4 text-center">
          {/* QR Code graphic box matching exact CSS hierarchy */}
          <div className="p-5 bg-amber-50/50 border border-amber-200/80 rounded-2xl flex flex-col items-center">
            <div className="bg-white p-4 rounded-xl shadow-xs border border-slate-200 inline-block">
              {/* Real SVG QR Code */}
              <svg
                viewBox={`0 0 ${qrResult?.size || 47} ${qrResult?.size || 47}`}
                className="w-44 h-44 text-slate-900 mx-auto"
                shapeRendering="crispEdges"
              >
                <rect width="100%" height="100%" fill="#ffffff" />
                {qrResult ? (
                  <path fill="#0f172a" d={qrResult.path} />
                ) : (
                  <rect x="0" y="0" width="10" height="10" fill="#0f172a" />
                )}
              </svg>
            </div>

            <div className="mt-3 space-y-1">
              <p className="text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5">
                <Smartphone className="w-4 h-4 text-amber-600" />
                <span>Escanea para abrir en https://datafit.ai.studio</span>
              </p>
              <p className="text-[11px] text-slate-500 max-w-sm">
                Al escanear este código QR con tu celular, te llevará directamente a <strong>https://datafit.ai.studio</strong> a la misma ventana de registro de tallas que se abre al presionar el botón de abajo.
              </p>
            </div>
          </div>

          {/* URL Mode Selector */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-left space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                Destino del Enlace QR:
              </span>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Abre la ventana de autoregistro
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setUrlMode('datafit')}
                className={`px-2.5 py-1.5 rounded-lg border text-left flex flex-col transition-all ${
                  urlMode === 'datafit'
                    ? 'bg-amber-100/70 border-amber-400 text-amber-950 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-[11px] font-bold">https://datafit.ai.studio</span>
                <span className="text-[10px] text-slate-500 truncate">Dominio Oficial DataFit</span>
              </button>

              <button
                type="button"
                onClick={() => setUrlMode('preview')}
                className={`px-2.5 py-1.5 rounded-lg border text-left flex flex-col transition-all ${
                  urlMode === 'preview'
                    ? 'bg-amber-100/70 border-amber-400 text-amber-950 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className="text-[11px] font-bold">Entorno Actual en Ejecución</span>
                <span className="text-[10px] text-slate-500 truncate">{currentOrigin}</span>
              </button>
            </div>
          </div>

          {/* Shareable Link Input with Quick Actions */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={surveyUrl}
              className="w-full text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 truncate select-all"
            />
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              onClick={handleOpenExternal}
              title="Probar en nueva pestaña"
              className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg shrink-0 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2">
            <button
              id="btn-open-mobile-simulator-modal"
              onClick={() => {
                onClose();
                onOpenSelfService();
              }}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-xs ring-2 ring-amber-300/60"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Abrir Simulador Móvil</span>
            </button>

            {downloadDataUrl && (
              <a
                href={downloadDataUrl}
                download="qr-autoregistro-tallas-datafit.png"
                className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Descargar PNG</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Imprimir Afiche</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
