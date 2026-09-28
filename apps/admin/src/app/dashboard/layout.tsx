import React from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.layout}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h2>Painel Administrativo</h2>
        </div>
        <div className={styles.pageContent}>
          {children}
        </div>
      </main>
    </div>
  );
}
