import React from 'react';
import { Users, FileText, CheckSquare, TrendingUp } from 'lucide-react';
import styles from './page.module.css';

import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function DashboardHome() {
  const [bookingsRes, prosRes, customersRes, recentRes] = await Promise.all([
    supabaseAdmin.from('bookings').select('status, created_at, price_quotes(total_cents)'),
    supabaseAdmin.from('professional_profiles').select('id', { count: 'exact' }).eq('verification_status', 'APPROVED'),
    supabaseAdmin.from('user_profiles').select('id', { count: 'exact' }).eq('role', 'CUSTOMER'),
    supabaseAdmin.from('bookings')
      .select('id, status, created_at, customer_profiles(user_profiles(full_name))')
      .order('created_at', { ascending: false })
      .limit(5)
  ]);

  const allBookings = bookingsRes.data || [];
  const activeBookingsCount = allBookings.filter(b => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(b.status)).length;
  
  const completedBookings = allBookings.filter(b => b.status === 'COMPLETED');
  const totalRevenue = completedBookings.reduce((acc, curr) => acc + ((curr.price_quotes as any)?.total_cents ?? 0) / 100, 0);

  const stats = [
    { name: 'Agendamentos Ativos', value: activeBookingsCount.toString(), icon: CheckSquare, trend: 'Agora' },
    { name: 'Profissionais Aprovados', value: (prosRes.count || 0).toString(), icon: Users, trend: 'Na plataforma' },
    { name: 'Clientes Ativos', value: (customersRes.count || 0).toString(), icon: Users, trend: 'Na plataforma' },
    { name: 'Receita Total', value: `R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, trend: 'Histórico' },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Visão Geral</h1>
        <p className={styles.subtitle}>Bem-vindo ao painel administrativo do Home Fácil.</p>
      </div>

      <div className={styles.statsGrid}>
        {stats.map((stat, index) => (
          <div key={index} className={`glass-panel ${styles.statCard}`}>
            <div className={styles.statHeader}>
              <h3 className={styles.statName}>{stat.name}</h3>
              <stat.icon size={20} className={styles.statIcon} />
            </div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statTrend}>{stat.trend}</div>
          </div>
        ))}
      </div>
      
      <div className={`glass-panel ${styles.recentActivity}`}>
        <h3 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0F172A', marginBottom: '1.5rem' }}>Atividade Recente</h3>
        {(!recentRes.data || recentRes.data.length === 0) ? (
          <p className={styles.emptyState}>Nenhuma atividade recente encontrada.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentRes.data.map((b: any) => (
              <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                <div>
                  <p style={{ fontWeight: '600', color: '#0F172A' }}>Novo agendamento de {(b.customer_profiles?.user_profiles as any)?.full_name || 'Cliente'}</p>
                  <p style={{ fontSize: '0.8rem', color: '#64748B' }}>{new Date(b.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', padding: '4px 8px', borderRadius: '6px', backgroundColor: '#EFF6FF', color: '#3B82F6', height: 'fit-content' }}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
