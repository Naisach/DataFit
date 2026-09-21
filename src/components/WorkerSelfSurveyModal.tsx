import React, { useState } from 'react';
import { useUniforms } from '../context/UniformsContext';
import {
  Shirt,
  Ruler,
  CheckCircle2,
  Smartphone,
  Shield,
  Sun,
  User,
  ArrowRight,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { EmployeeType, GenderFit, ShirtSize, PantsSize, FootwearSize, JacketSize } from '../types';

export const WorkerSelfSurveyModal: React.FC = () => {
  const { employees, addEmployee, updateEmployee, setActiveView } = useUniforms();

  const [step, setStep] = useState<'identify' | 'sizing' | 'confirmed'>('identify');
  const [rutInput, setRutInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [workerType, setWorkerType] = useState<EmployeeType>('estival');
  const [department, setDepartment] = useState('Operaciones Agrícolas & Terreno');
  const [location, setLocation] = useState('Fundo Alto Jahuel');
  const [genderFit, setGenderFit] = useState<GenderFit>('unisex');

  // Sizes
  const [shirt, setShirt] = useState<ShirtSize>('L');
  const [pants, setPants] = useState<PantsSize>('42');
  const [footwear, setFootwear] = useState<FootwearSize>('42');
  const [jacket, setJacket] = useState<JacketSize>('L');
  const [headwear, setHeadwear] = useState('Legionario UV');
  const [existingEmployeeId, setExistingEmployeeId] = useState<string | null>(null);

  // Measure guide tabs
  const [activeGuide, setActiveGuide] = useState<'shirt' | 'pants' | 'footwear'>('shirt');

  const handleIdentify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rutInput.trim()) return;

    // Check if worker already exists
    const cleanRut = rutInput.trim().toLowerCase();
    const found = employees.find(
      (emp) => emp.rut.toLowerCase().replace(/[^0-9k]/g, '') === cleanRut.replace(/[^0-9k]/g, '')
    );

    if (found) {
      setExistingEmployeeId(found.id);
      setNameInput(found.fullName);
      setPhoneInput(found.phone);
      setWorkerType(found.type);
      setDepartment(found.department);
      setLocation(found.workLocation);
      setGenderFit(found.genderFit);
      setShirt(found.sizes.shirt);
      setPants(found.sizes.pants);
      setFootwear(found.sizes.footwear);
      setJacket(found.sizes.jacket);
      setHeadwear(found.sizes.headwear);
    } else {
      setExistingEmployeeId(null);
    }

    setStep('sizing');
  };

  const handleSaveSizes = (e: React.FormEvent) => {
    e.preventDefault();

    if (existingEmployeeId) {
      updateEmployee(existingEmployeeId, {
        fullName: nameInput || 'Colaborador',
        phone: phoneInput,
        genderFit,
        sizes: {
          shirt,
          pants,
          footwear,
          jacket,
          headwear: workerType === 'estival' ? 'Legionario UV' : headwear,
        },
        surveyStatus: 'completado',
      });
    } else {
      addEmployee({
        rut: rutInput,
        fullName: nameInput || 'Colaborador Autoregistro',
        email: `${rutInput.replace(/[^0-9]/g, '')}@trabajador.com`,
        phone: phoneInput || '+56 9 9999 9999',
        type: workerType,
        department,
        workLocation: location,
        role: workerType === 'estival' ? 'Operario Temporada Estival' : 'Colaborador Permanente',
        genderFit,
        sizes: {
          shirt,
          pants,
          footwear,
          jacket,
          headwear: workerType === 'estival' ? 'Legionario UV' : headwear,
        },
        surveyStatus: 'completado',
        contractStart: '2026-11-01',
        deliveryStatus: 'sin_entregar',
        notes: 'Registro autónomo vía Portal Móvil de Tallas.',
      });
    }

    setStep('confirmed');
  };

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 px-4">
      {/* Container simulating a worker self-service app */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 p-6 text-white text-center relative">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center mx-auto mb-3 text-white">
            <Smartphone className="w-6 h-6" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-display">
            Portal de Registro de Tallas de Uniforme
          </h1>
          <p className="text-xs text-amber-100 max-w-md mx-auto mt-1">
            Garantiza que recibas tu uniforme y calzado de seguridad en tu talla exacta para la temporada
          </p>
        </div>

        {/* Step 1: Identification */}
        {step === 'identify' && (
          <form onSubmit={handleIdentify} className="p-6 space-y-4 text-xs">
            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200/80 text-amber-900">
              <span className="font-bold block mb-0.5">Bienvenido colaborador:</span>
              Ingresa tu RUT para consultar tu ficha o registrar tus medidas por primera vez.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                RUT / Cédula de Identidad <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 19.876.543-2"
                value={rutInput}
                onChange={(e) => setRutInput(e.target.value)}
                className="w-full text-base px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Completo (si es tu primer registro)
              </label>
              <input
                type="text"
                placeholder="Tu Nombre y Apellido"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Teléfono de Contacto (WhatsApp)
              </label>
              <input
                type="text"
                placeholder="+56 9 8765 4321"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="w-full text-xs px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                ¿Cuál es tu tipo de contratación?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWorkerType('estival')}
                  className={`py-3 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    workerType === 'estival'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-500/20'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Sun className="w-4 h-4 text-amber-300" />
                  <span>Temporada Estival (Verano)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWorkerType('permanente')}
                  className={`py-3 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    workerType === 'permanente'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs ring-2 ring-slate-800/20'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Planta Permanente</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 mt-4"
            >
              <span>Continuar a Selección de Tallas</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: Sizing Form with Interactive Measurement Guide */}
        {step === 'sizing' && (
          <form onSubmit={handleSaveSizes} className="p-6 space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-bold text-slate-900 text-sm">
                  {nameInput ? `${nameInput} (${rutInput})` : rutInput}
                </span>
                <p className="text-slate-500 text-[11px]">
                  Tipo: <strong className="uppercase text-amber-800">{workerType}</strong> • Calce: {genderFit}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep('identify')}
                className="text-xs text-amber-700 font-semibold hover:underline"
              >
                Cambiar RUT
              </button>
            </div>

            {/* Visual Measurement Aid Tabs */}
            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                <div className="flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-amber-600" />
                  <span>Guía Rápida para Elegir tu Talla Correcta</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveGuide('shirt')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      activeGuide === 'shirt' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    Polera
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuide('pants')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      activeGuide === 'pants' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    Pantalón
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveGuide('footwear')}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      activeGuide === 'footwear' ? 'bg-amber-600 text-white' : 'bg-white text-slate-600'
                    }`}
                  >
                    Calzado
                  </button>
                </div>
              </div>

              {activeGuide === 'shirt' && (
                <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  👕 <strong>Poleras y Camisas:</strong> Mide el contorno de tu pecho bajo los brazos.
                  <br />• <strong>S:</strong> 92-96 cm • <strong>M:</strong> 100-104 cm • <strong>L:</strong> 108-112 cm • <strong>XL:</strong> 116-120 cm • <strong>XXL:</strong> 124+ cm.
                </p>
              )}

              {activeGuide === 'pants' && (
                <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  👖 <strong>Pantalón Cargo:</strong> Corresponde a tu talla habitual de jeans nacional (38 al 54). Si dudas entre dos tallas, prefiere la mayor para faena cómoda.
                </p>
              )}

              {activeGuide === 'footwear' && (
                <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                  🥾 <strong>Calzado de Seguridad:</strong> Si usas calcetines gruesos de faena o plantilla ortopédica, te sugerimos solicitar <strong>1 número más</strong> que tu zapato de vestir habitual.
                </p>
              )}
            </div>

            {/* Gender Cut Selection */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">Preferencia de Corte / Calce</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGenderFit('unisex')}
                  className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold ${
                    genderFit === 'unisex'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Unisex
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFit('masculino')}
                  className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold ${
                    genderFit === 'masculino'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Corte Hombre
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFit('femenino')}
                  className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold ${
                    genderFit === 'femenino'
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Corte Mujer
                </button>
              </div>
            </div>

            {/* Sizing Selectors */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Talla de Polera / Camisa <span className="text-rose-500">*</span>
                </label>
                <select
                  value={shirt}
                  onChange={(e) => setShirt(e.target.value as ShirtSize)}
                  className="w-full text-sm font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  {(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as ShirtSize[]).map((s) => (
                    <option key={s} value={s}>Talla {s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Talla de Pantalón <span className="text-rose-500">*</span>
                </label>
                <select
                  value={pants}
                  onChange={(e) => setPants(e.target.value as PantsSize)}
                  className="w-full text-sm font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  {(['38', '40', '42', '44', '46', '48', '50', '52', '54'] as PantsSize[]).map((p) => (
                    <option key={p} value={p}>Talla {p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Número de Calzado de Seguridad <span className="text-rose-500">*</span>
                </label>
                <select
                  value={footwear}
                  onChange={(e) => setFootwear(e.target.value as FootwearSize)}
                  className="w-full text-sm font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  {(['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] as FootwearSize[]).map((f) => (
                    <option key={f} value={f}>N° {f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Chaqueta / Softshell Térmico
                </label>
                <select
                  value={jacket}
                  onChange={(e) => setJacket(e.target.value as JacketSize)}
                  className="w-full text-sm font-bold px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                  {(['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] as JacketSize[]).map((j) => (
                    <option key={j} value={j}>Talla {j}</option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 mt-4"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar y Registrar mis Tallas</span>
            </button>
          </form>
        )}

        {/* Step 3: Success Confirmation */}
        {step === 'confirmed' && (
          <div className="p-8 text-center space-y-4 text-xs">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">
                ¡Tallas Registradas con Éxito!
              </h2>
              <p className="text-slate-500 text-xs max-w-sm mx-auto">
                Tu información fue guardada en el sistema de adquisiciones. Tu kit de uniforme será preparado para la fecha de inicio de temporada.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-w-sm mx-auto text-left space-y-1 text-slate-700 text-xs">
              <p><strong>Colaborador:</strong> {nameInput || 'Colaborador Registrado'}</p>
              <p><strong>RUT:</strong> {rutInput}</p>
              <p><strong>Kit Asignado:</strong> {workerType === 'estival' ? 'Kit Temporada Estival (Protección Solar)' : 'Kit Planta Permanente'}</p>
              <p><strong>Polera:</strong> {shirt} • <strong>Pantalón:</strong> {pants} • <strong>Calzado:</strong> N° {footwear}</p>
            </div>

            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep('identify');
                  setRutInput('');
                  setNameInput('');
                }}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-semibold"
              >
                Registrar a Otro Colaborador
              </button>
              <button
                type="button"
                onClick={() => setActiveView('dashboard')}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 font-bold shadow-xs"
              >
                Volver al Tablero Principal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
