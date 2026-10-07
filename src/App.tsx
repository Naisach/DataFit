import React, { useState } from 'react';
import { UniformsProvider, useUniforms } from './context/UniformsContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { InventoryView } from './components/InventoryView';
import { EmployeesView } from './components/EmployeesView';
import { ProcurementPlanView } from './components/ProcurementPlanView';
import { MovementsView } from './components/MovementsView';
import { DeliveryModal } from './components/DeliveryModal';
import { AuthModal } from './components/AuthModal';
import { ProtectedViewGuard } from './components/ProtectedViewGuard';
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

  const renderCurrentView = () => {
    // If user is not authenticated as a registered user, show the protected view guard
    if (!isAuthenticated) {
      switch (activeView) {
        case 'inventory':
        case 'dashboard':
          return (
            <ProtectedViewGuard
              moduleName="Inventario a Tiempo Real"
              moduleDescription="Existencias físicas en bodega, niveles de stock, SKU y ajustes de inventario"
            />
          );
        case 'employees':
          return (
            <ProtectedViewGuard
              moduleName="Registros de Trabajadores"
              moduleDescription="Nómina de colaboradores, tallas registradas, asignación de dotación y firmas"
            />
          );
        case 'procurement':
          return (
            <ProtectedViewGuard
              moduleName="Planificación de Compra"
              moduleDescription="Demanda de temporada, cruce de bodega, cálculo de compra neta y presupuestos"
            />
          );
        case 'movements':
        case 'deliveries':
          return (
            <ProtectedViewGuard
              moduleName="Registro de Ingresos y Entregas"
              moduleDescription="Libro auditable de ingresos a bodega, entregas a trabajadores y ajustes de stock"
            />
          );
        default:
          return (
            <ProtectedViewGuard
              moduleName="Sistema de Gestión y Control"
              moduleDescription="Datos operativos de inventario, dotación y compras"
            />
          );
      }
    }

    // Authenticated users have full view and edit capabilities
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

      {/* Global Auth Modal for login and registration */}
      <AuthModal />

      {/* Direct Delivery Modal invoked from Employee row */}
      {isDeliveryModalOpen && isAuthenticated && (
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
            Sistema de Inventario en Tiempo Real, Control de Dotación y Registro de Ingresos/Entregas
          </p>
          <p className="text-[11px] text-slate-400">
            Control de Acceso: Visualización y Edición Restringida a Personal Registrado
          </p>
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
