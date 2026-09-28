'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, MessageCircle, Phone, Mail, FileText, ExternalLink } from 'lucide-react';
import styles from '../profile.module.css';

export default function SupportPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link href="/profile" className={styles.backBtn} style={{ color: 'var(--text-primary)' }}>
            <ChevronLeft size={24} />
          </Link>
          <h1 className={styles.title}>Ajuda e Suporte</h1>
        </div>
      </header>

      <main className={styles.content} style={{ marginTop: '24px' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>Como podemos ajudar?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
            Nossa equipe está pronta para tirar suas dúvidas.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className={styles.addressCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: '12px', cursor: 'pointer' }}>
            <div style={{ background: '#E0E7FF', padding: '16px', borderRadius: '50%', color: '#4F46E5' }}>
              <MessageCircle size={28} />
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>Chat Online</span>
          </div>

          <div className={styles.addressCard} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', gap: '12px', cursor: 'pointer' }}>
            <div style={{ background: '#DCFCE7', padding: '16px', borderRadius: '50%', color: '#16A34A' }}>
              <Phone size={28} />
            </div>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>Ligar</span>
          </div>
        </div>

        <div className={styles.menuSection} style={{ marginTop: '24px', marginInline: '0' }}>
          <div className={styles.menuItem} style={{ padding: '16px 20px', cursor: 'pointer', justifyContent: 'flex-start', gap: '16px' }}>
            <Mail size={24} color="var(--brand-500)" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Email</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>suporte@homefacil.com.br</div>
            </div>
          </div>
          
          <div className={styles.menuItem} style={{ padding: '16px 20px', cursor: 'pointer', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
              <FileText size={24} color="var(--brand-500)" />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Termos de Uso</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Leia nossas políticas</div>
              </div>
            </div>
            <ExternalLink size={18} color="var(--text-tertiary)" />
          </div>

          <div className={styles.menuItem} style={{ padding: '16px 20px', cursor: 'pointer', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
              <FileText size={24} color="var(--brand-500)" />
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Perguntas Frequentes</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Dúvidas comuns (FAQ)</div>
              </div>
            </div>
            <ExternalLink size={18} color="var(--text-tertiary)" />
          </div>
        </div>

      </main>
    </div>
  );
}
