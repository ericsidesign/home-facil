import React from 'react';
import { supabaseAdmin } from '@/lib/supabase';
import styles from './page.module.css';
import { TrendingUp, Users, CheckSquare, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  // Fetch aggregate data
  const [bookingsRes, professionalsRes, customersRes] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('status, scheduled_date, created_at, price_quotes(total_cents)')
      .eq('status', 'COMPLETED'),
    supabaseAdmin
      .from('professional_profiles')
      .select('id, rating_average, completed_bookings_count, user_profiles(full_name)')
      .eq('verification_status', 'APPROVED')
      .order('completed_bookings_count', { ascending: false })
      .limit(5),
    supabaseAdmin.from('user_profiles').select('id', { count: 'exact' }).eq('role', 'CUSTOMER'),
  ]);

  const bookings = bookingsRes.data || [];
  const topPros = professionalsRes.data || [];
  const customerCount = customersRes.count ?? 0;

  const completed = bookings.filter((b) => b.status === 'COMPLETED');
  const totalRevenue = completed.reduce((sum, b) => sum + ((b.price_quotes as any)?.total_cents ?? 0) / 100, 0);
  const avgTicket = completed.length > 0 ? totalRevenue / completed.length : 0;

  const formatCurrency = (val: number) =>
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const summaryCards = [
    { label: 'Receita Total', value: formatCurrency(totalRevenue), icon: TrendingUp, color: '#2E6B4F' },
    { label: 'Agendamentos Concluídos', value: completed.length.toString(), icon: CheckSquare, color: '#3b82f6' },
    { label: 'Ticket Médio', value: formatCurrency(avgTicket), icon: TrendingUp, color: '#8b5cf6' },
    { label: 'Total de Clientes', value: customerCount.toString(), icon: Users, color: '#f59e0b' },
  ];

  // Group revenue by month (last 6 months)
  const monthlyMap: Record<string, number> = {};
  for (const b of completed) {
    if (!b.scheduled_date) continue;
    const d = new Date(b.scheduled_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyMap[key] = (monthlyMap[key] ?? 0) + ((b.price_quotes as any)?.total_cents ?? 0) / 100;
  }
  const monthlyData = Object.entries(monthlyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6);

  const maxMonthly = Math.max(...monthlyData.map(([, v]) => v), 1);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Relatórios</h1>
          <p className={styles.subtitle}>Visão consolidada do desempenho da plataforma.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        {summaryCards.map((card, i) => (
          <div key={i} className={`glass-panel ${styles.summaryCard}`}>
            <div className={styles.summaryIcon} style={{ backgroundColor: `${card.color}20` }}>
              <card.icon size={20} style={{ color: card.color }} />
            </div>
            <div className={styles.summaryValue}>{card.value}</div>
            <div className={styles.summaryLabel}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className={styles.twoCol}>
        {/* Receita por Mês */}
        <div className={`glass-panel ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Receita por Mês</h2>
          {monthlyData.length === 0 ? (
            <p className={styles.empty}>Nenhum dado disponível ainda.</p>
          ) : (
            <div className={styles.barChart}>
              {monthlyData.map(([month, value]) => {
                const [year, m] = month.split('-');
                const label = new Date(Number(year), Number(m) - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' });
                const height = Math.max((value / maxMonthly) * 120, 4);
                return (
                  <div key={month} className={styles.barGroup}>
                    <div className={styles.barValue}>{formatCurrency(value)}</div>
                    <div className={styles.bar} style={{ height }} />
                    <div className={styles.barLabel}>{label}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Profissionais */}
        <div className={`glass-panel ${styles.panel}`}>
          <h2 className={styles.panelTitle}>Top Profissionais</h2>
          {topPros.length === 0 ? (
            <p className={styles.empty}>Nenhum dado disponível ainda.</p>
          ) : (
            <div className={styles.proList}>
              {topPros.map((pro: any, i) => (
                <div key={pro.id} className={styles.proRow}>
                  <div className={styles.proRank}>#{i + 1}</div>
                  <div className={styles.proAvatar}>
                    {(pro.user_profiles?.full_name || 'P')[0].toUpperCase()}
                  </div>
                  <div className={styles.proInfo}>
                    <div className={styles.proName} style={{ fontWeight: '600', color: '#0F172A', fontSize: '0.875rem' }}>
                      {pro.user_profiles?.full_name || '—'}
                    </div>
                    <div className={styles.proMeta} style={{ color: '#64748B', fontSize: '0.75rem', marginTop: '4px' }}>
                      {pro.completed_bookings_count ?? 0} serviços •{' '}
                      <Star size={12} style={{ display: 'inline', color: '#F59E0B', verticalAlign: 'text-top' }} />{' '}
                      {pro.rating_average ? Number(pro.rating_average).toFixed(1) : '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
