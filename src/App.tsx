import React, { useState } from 'react';
import { UniformsProvider, useUniforms } from './context/UniformsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginPage } from './components/LoginPage';
import { InventoryView } from './components/InventoryView';
import { EmployeesView } from './components/EmployeesView';
import { ProcurementPlanView } from './components/ProcurementPlanView';
import { MovementsView } from './components/MovementsView';
import { DeliveryModal } from './components/DeliveryModal';
import { Employee } from './types';

function MainContent() {
  const { activeView } = useUniforms();
  const { isAuthenticated } = useAuth();
  const [deliveryTargetEmployee, setDeliveryTargetEmployee] = useState<Employee | null>(null);
  const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

  const handleOpenDeliveryForEmployee = (employee: Employee) => {
    setDeliveryTargetEmployee(employee);
    setIsDeliveryModalOpen(true);
  };

  // Si no ha iniciado sesión, mostrar única y exclusivamente el menú de inicio de sesión
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderCurrentView = () => {
    switch (activeView) {
      case 'inventory':
      case 'dashboard':
        return <InventoryView />;
      case 'employees':
        return <EmployeesView onOpenDeliveryForEmployee={handleOpenDeliveryForEmployee} />;
      case 'procurement':
        return <ProcurementPlanView />;
      case 'movements':
      case 'deliveries':
        return <MovementsView />;
      default:
        return <InventoryView />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderCurrentView()}
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
      <footer className="border-t border-slate-200 bg-white/60 py-3 px-6 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span>DataFit · Control de Uniformes y Dotación</span>
          <span>JAC Transportes & Buses Bío Bío</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <UniformsProvider>
        <MainContent />
      </UniformsProvider>
    </AuthProvider>
  );
}
