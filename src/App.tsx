import React, { useState } from 'react';
import { UniformsProvider, useUniforms } from './context/UniformsContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { EmployeesView } from './components/EmployeesView';
import { DeliveriesView } from './components/DeliveriesView';
import { ProcurementPlanView } from './components/ProcurementPlanView';
import { WorkerSelfSurveyModal } from './components/WorkerSelfSurveyModal';
import { DeliveryModal } from './components/DeliveryModal';
import { Employee } from './types';

function MainContent() {
  const { activeView, setActiveView } = useUniforms();
  const [deliveryTargetEmployee, setDeliveryTargetEmployee] = useState<Employee | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  const handleOpenDeliveryForEmployee = (employee: Employee) => {
    setDeliveryTargetEmployee(employee);
    setIsDeliveryModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'employees' && (
          <EmployeesView onOpenDeliveryForEmployee={handleOpenDeliveryForEmployee} />
        )}
        {activeView === 'deliveries' && <DeliveriesView />}
        {activeView === 'procurement' && <ProcurementPlanView />}
        {activeView === 'self_service' && <WorkerSelfSurveyModal />}
      </main>

      {/* Direct Delivery Modal invoked from Employee row */}
      {isDeliveryModalOpen && (
        <DeliveryModal
          isOpen={isDeliveryModalOpen}
          onClose={() => {
            setIsDeliveryModalOpen(false);
            setDeliveryTargetEmployee(null);
          }}
          preselectedEmployee={deliveryTargetEmployee}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            Plataforma Cloud de Tallas, Adquisiciones y Entregas de Uniformes Corporativos
          </p>
          <p className="text-[11px] text-slate-400">
            Planta Permanente & Personal de Temporada Estival • Cumplimiento Normativo UV y EPP
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <UniformsProvider>
      <MainContent />
    </UniformsProvider>
  );
}
