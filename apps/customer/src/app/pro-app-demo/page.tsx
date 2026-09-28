import React from 'react';
import { MapPin, Clock, Calendar as CalendarIcon, CheckCircle, XCircle } from 'lucide-react';
import styles from '../page.module.css';

export default function ProfessionalAppDemo() {
  return (
    <div className={styles.container} style={{ backgroundColor: '#1E2A22', color: 'white', minHeight: '100vh', paddingBottom: '2rem' }}>
      <header className={styles.header} style={{ textAlign: 'center', paddingTop: '2rem' }}>
        <h1 style={{ color: 'var(--bg-linen)', fontSize: '1.25rem' }}>Painel da Profissional</h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--success)', boxShadow: '0 0 8px var(--success)' }}></div>
          <span style={{ fontSize: '0.875rem', color: '#A3B1A7' }}>Você está Online e disponível</span>
        </div>
      </header>

      {/* Alerta de Nova Solicitação (Estilo Uber) */}
      <section style={{ marginTop: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ 
          backgroundColor: 'var(--surface)', 
          color: 'var(--ink)', 
          borderRadius: 'var(--radius-card)', 
          padding: '1.5rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          border: '4px solid var(--accent-citrus)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Radar effect background */}
          <div style={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'radial-gradient(circle, var(--accent-citrus) 0%, transparent 70%)', opacity: 0.1, borderRadius: '50%' }}></div>

          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <span style={{ backgroundColor: 'var(--accent-citrus)', color: '#1E2A22', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              Nova Solicitação
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.75rem', color: 'var(--primary-forest)' }}>R$ 138,00</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)' }}>Ganhos estimados (já com taxas descontadas)</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <MapPin color="var(--primary-forest)" size={20} style={{ marginTop: 2 }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>A 3,2 km de você</p>
                <p style={{ fontSize: '0.875rem', color: 'var(--ink-muted)' }}>Bairro Jardins (Endereço exato após aceite)</p>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CalendarIcon color="var(--primary-forest)" size={20} />
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Hoje, às 14:30</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Clock color="var(--primary-forest)" size={20} />
              <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>Faxina Pesada • 4 horas</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button style={{ 
              flex: 1, 
              padding: '1rem', 
              borderRadius: 'var(--radius-button)', 
              border: '1px solid var(--line)', 
              backgroundColor: 'transparent',
              color: 'var(--ink-muted)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <XCircle size={20} /> Recusar
            </button>
            <button className="btn-primary" style={{ flex: 2, fontSize: '1.125rem' }}>
              Aceitar Serviço
            </button>
          </div>
        </div>
      </section>

      {/* Resumo da Semana */}
      <section style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', color: 'var(--bg-linen)', marginBottom: '1rem' }}>Resumo da Semana</h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-card)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: '#A3B1A7' }}>Saldo Disponível</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--bg-linen)', marginTop: '0.25rem' }}>R$ 450,00</p>
          </div>
          <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: 'var(--radius-card)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontSize: '0.75rem', color: '#A3B1A7' }}>Serviços Feitos</p>
            <p style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--bg-linen)', marginTop: '0.25rem' }}>3</p>
          </div>
        </div>
      </section>
    </div>
  );
}
