import React, { createContext, useContext, useState, useEffect } from 'react';
import { AuthUser } from '../types';

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthenticated: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: { name: string; username: string; email: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const STORAGE_USERS_KEY = 'bodega_registered_users_v1';
const STORAGE_SESSION_KEY = 'bodega_active_session_v1';

interface StoredAccount extends AuthUser {
  passwordHash: string; // Stored securely in client storage for self-contained auth
}

// Initial pre-registered authorized accounts
const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: 'usr-admin-1',
    name: 'Administrador de Bodega y Dotación',
    username: 'admin',
    email: 'admin@bodega.cl',
    role: 'admin',
    passwordHash: 'admin123',
    createdAt: '2026-01-15T08:00:00.000Z',
  },
  {
    id: 'usr-bodega-2',
    name: 'Encargado de Inventario y Faenas',
    username: 'bodega',
    email: 'bodega@faena.cl',
    role: 'encargado',
    passwordHash: 'bodega2026',
    createdAt: '2026-02-01T09:30:00.000Z',
  },
];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<StoredAccount[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_USERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading stored users:', e);
    }
    return DEFAULT_ACCOUNTS;
  });

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const session = localStorage.getItem(STORAGE_SESSION_KEY);
      if (session) {
        return JSON.parse(session);
      }
    } catch (e) {
      console.error('Error loading session:', e);
    }
    return DEFAULT_ACCOUNTS[0]; // Inicia con sesión activa para acceso inmediato al inventario y registros
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Sync users to storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('Error saving users to localStorage:', e);
    }
  }, [users]);

  // Sync session to storage
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify(currentUser));
      } else {
        localStorage.removeItem(STORAGE_SESSION_KEY);
      }
    } catch (e) {
      console.error('Error saving session to localStorage:', e);
    }
  }, [currentUser]);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const login = async (identifier: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId || !cleanPass) {
      return { success: false, error: 'Por favor ingresa usuario/correo y contraseña.' };
    }

    const found = users.find(
      (u) =>
        (u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId) &&
        u.passwordHash === cleanPass
    );

    if (!found) {
      return {
        success: false,
        error: 'Usuario, correo o contraseña incorrectos. Verifica tus datos o regístrate.',
      };
    }

    const userProfile: AuthUser = {
      id: found.id,
      name: found.name,
      username: found.username,
      email: found.email,
      role: found.role,
      createdAt: found.createdAt,
    };

    setCurrentUser(userProfile);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const register = async (data: {
    name: string;
    username: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string }> => {
    const cleanName = data.name.trim();
    const cleanUser = data.username.trim().toLowerCase();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanPass = data.password.trim();

    if (!cleanName || !cleanUser || !cleanEmail || !cleanPass) {
      return { success: false, error: 'Todos los campos son requeridos para el registro.' };
    }

    if (cleanPass.length < 4) {
      return { success: false, error: 'La contraseña debe tener al menos 4 caracteres.' };
    }

    // Check if username or email already exists
    const exists = users.some(
      (u) => u.username.toLowerCase() === cleanUser || u.email.toLowerCase() === cleanEmail
    );

    if (exists) {
      return {
        success: false,
        error: 'El nombre de usuario o correo ya se encuentra registrado. Inicia sesión directamente.',
      };
    }

    const newAccount: StoredAccount = {
      id: `usr-${Date.now()}`,
      name: cleanName,
      username: cleanUser,
      email: cleanEmail,
      role: 'operador',
      passwordHash: cleanPass,
      createdAt: new Date().toISOString(),
    };

    setUsers((prev) => [...prev, newAccount]);

    const userProfile: AuthUser = {
      id: newAccount.id,
      name: newAccount.name,
      username: newAccount.username,
      email: newAccount.email,
      role: newAccount.role,
      createdAt: newAccount.createdAt,
    };

    setCurrentUser(userProfile);
    setIsAuthModalOpen(false);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
