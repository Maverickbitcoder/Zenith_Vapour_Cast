'use client';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from './AuthContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
          {children}
      </AuthProvider>
    </SessionProvider>
  );
}