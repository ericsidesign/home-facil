import React from 'react';
import Link from 'next/link';
import { ChevronLeft, MessageCircle, HelpCircle, PhoneCall } from 'lucide-react';
import styles from '../subpage.module.css';

export default function SupportPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link href="/profile" className={styles.backBtn}>
            <ChevronLeft size={24} />
          </Link>
          <h1 className={styles.title}>Ajuda e Suporte</h1>
        </div>
        <p className={styles.subtitle}>Como podemos ajudar você hoje?</p>
      </header>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <MessageCircle size={20} color="var(--brand-500)" /> Chat com Suporte
          </div>
          <p className={styles.cardText}>Tempo médio de resposta: 5 minutos.</p>
          <button className={styles.button}>
            Iniciar Atendimento
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <HelpCircle size={20} color="var(--brand-500)" /> Central de Ajuda (FAQ)
          </div>
          <p className={styles.cardText}>Respostas para as dúvidas mais comuns sobre repasses, clientes e uso do aplicativo.</p>
          <button className={styles.button} style={{ background: 'var(--brand-50)', color: 'var(--brand-600)', boxShadow: 'none' }}>
            Ver Artigos
          </button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <PhoneCall size={20} color="var(--brand-500)" /> Contato de Emergência
          </div>
          <p className={styles.cardText}>Disponível 24h apenas para incidentes graves durante a realização de serviços.</p>
          <button className={styles.button} style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', boxShadow: 'none' }}>
            Ligar Agora
          </button>
        </div>
      </div>
    </div>
  );
}
