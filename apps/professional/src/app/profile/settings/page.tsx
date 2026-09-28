'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bell, Lock, Smartphone, CheckCircle2, AlertCircle, X } from 'lucide-react';
import styles from '../subpage.module.css';

export default function SettingsPage() {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handlePasswordChange = () => {
    showToast('Um link de alteração de senha foi enviado para o seu e-mail.', 'success');
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setShowDeleteModal(false);
    showToast('Sua solicitação de exclusão foi recebida e será processada em 48h.', 'success');
  };

  return (
    <div className={styles.page}>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: 'white', padding: '12px 24px', borderRadius: '100px',
          boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideDown 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link href="/profile" className={styles.backBtn}>
            <ChevronLeft size={24} />
          </Link>
          <h1 className={styles.title}>Configurações</h1>
        </div>
        <p className={styles.subtitle}>Ajuste as preferências do seu aplicativo.</p>
      </header>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Bell size={20} color="var(--brand-500)" /> Notificações
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span className={styles.cardText}>Novos serviços disponíveis</span>
            <input type="checkbox" defaultChecked style={{ accentColor: 'var(--brand-500)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <span className={styles.cardText}>Lembretes de agenda</span>
            <input type="checkbox" defaultChecked style={{ accentColor: 'var(--brand-500)' }} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Lock size={20} color="var(--brand-500)" /> Segurança
          </div>
          <button 
            className={styles.button} 
            style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', boxShadow: 'none' }}
            onClick={handlePasswordChange}
          >
            Alterar Senha
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Smartphone size={20} color="var(--error)" /> Zona de Perigo
          </div>
          <p className={styles.cardText}>Ao excluir sua conta, todos os seus dados e histórico serão apagados permanentemente.</p>
          <button 
            className={styles.button} 
            style={{ background: 'var(--error-light)', color: 'var(--error)', boxShadow: 'none' }}
            onClick={handleDeleteAccount}
          >
            Excluir Minha Conta
          </button>
        </div>
      </div>

      {/* Modal de Exclusão */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--error)' }}>Excluir Conta</h3>
              <button onClick={() => setShowDeleteModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-tertiary)" /></button>
            </div>
            <p style={{ marginBottom: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              ATENÇÃO: Você tem certeza que deseja excluir sua conta permanentemente? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                style={{ flex: 1, backgroundColor: '#F1F5F9', color: '#64748B', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                style={{ flex: 1, backgroundColor: 'var(--error)', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
