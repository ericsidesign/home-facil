'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Clock, CheckCircle2, Plus, ChevronRight, XCircle, RotateCcw, Sparkles, Droplets, Package, Home, LayoutGrid } from 'lucide-react';
import styles from './bookings.module.css';
import { createClient } from '@/lib/supabase/client';

const getServiceIcon = (name: string) => {
  if (!name) return <Sparkles size={24} />;
  const n = name.toLowerCase();
  if (n.includes('pesada')) return <Droplets size={24} />;
  if (n.includes('pré')) return <Package size={24} />;
  if (n.includes('pós')) return <Home size={24} />;
  if (n.includes('org')) return <LayoutGrid size={24} />;
  return <Sparkles size={24} />;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  useEffect(() => {
    async function fetchBookings() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select('*, service_categories(name)')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Erro ao buscar bookings:", error);
      }
      
      if (!error && data) {
        // Busca os nomes das profissionais manualmente para evitar erros de Join
        const proIds = [...new Set(data.map((b) => b.professional_profile_id).filter(Boolean))];
        if (proIds.length > 0) {
          const { data: pros } = await supabase
            .from('professional_profiles')
            .select('id, user_profiles(full_name)')
            .in('id', proIds);
            
          const proMap = new Map();
          if (pros) {
            pros.forEach((p: any) => proMap.set(p.id, p.user_profiles?.full_name));
          }
          
          const enriched = data.map((b) => ({
            ...b,
            proName: proMap.get(b.professional_profile_id)
          }));
          setBookings(enriched);
        } else {
          setBookings(data);
        }
      }
      setLoading(false);
    }
    fetchBookings();
  }, []);

  const activeBookings = bookings.filter(b => 
    b.status === 'PENDING' || 
    b.status === 'AWAITING_PROFESSIONAL' || 
    b.status === 'ACCEPTED' || 
    b.status === 'CONFIRMED' || 
    b.status === 'IN_PROGRESS' || 
    b.status === 'EN_ROUTE' || 
    b.status === 'PROFESSIONAL_ON_THE_WAY'
  );
  const pastBookings = bookings.filter(b => b.status === 'COMPLETED' || b.status === 'CANCELLED');

  return (
    <div className={styles.page}>
      {/* Header Limpo */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>Minha Agenda</h1>
          <Link href="/bookings/new" className={styles.newBtn} aria-label="Novo agendamento">
            <Plus size={20} />
          </Link>
        </div>
        <p className={styles.subtitle}>Acompanhe seus próximos serviços.</p>
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'active' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Em andamento
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Histórico
          </button>
        </div>
      </header>

      {loading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Carregando...</div>
      ) : (
        <>
          {activeTab === 'active' && (
            <section className={styles.section}>
              {activeBookings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9375rem', marginBottom: '1rem' }}>
                    Você não tem nenhum agendamento em andamento.
                  </p>
                  <Link href="/bookings/new" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
                    Agendar limpeza
                  </Link>
                </div>
              ) : (
                activeBookings.map((booking) => (
                  <Link key={booking.id} href={`/bookings/${booking.id}`} style={{ textDecoration: 'none' }}>
                    <div className={styles.activeCard} style={{ marginBottom: '12px' }}>
                      <div className={styles.activeCardTop}>
                        <div>
                          <h3 className={styles.activeCardService}>{booking.service_categories?.name || 'Serviço Agendado'}</h3>
                          <p className={styles.activeCardDate}>
                            {new Date(booking.scheduled_at).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })} às{' '}
                            {new Date(booking.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className={styles.statusChip}>
                          <Clock size={14} />
                          {booking.status === 'PENDING' && 'Buscando'}
                          {booking.status === 'AWAITING_PROFESSIONAL' && 'Aguardando'}
                          {booking.status === 'ACCEPTED' && 'Aceito'}
                          {booking.status === 'CONFIRMED' && 'Confirmado'}
                          {booking.status === 'PROFESSIONAL_ON_THE_WAY' && 'A Caminho'}
                          {booking.status === 'IN_PROGRESS' && 'Em andamento'}
                        </div>
                      </div>
                      <hr className={styles.divider} />
                      <div className={styles.activeCardPro}>
                        <div className={styles.proAvatarSmall}>
                          {booking.professional_profile_id ? 'P' : 'H'}
                        </div>
                        <div>
                          <p className={styles.proName}>
                            {booking.proName || 'Profissional Home Fácil'}
                          </p>
                          <p className={styles.proEta}>R$ {booking.total_amount}</p>
                        </div>
                      </div>
                      <div className={styles.trackBtn}>
                        Acompanhar pedido
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </section>
          )}

          {activeTab === 'history' && (
            <section className={styles.section}>
              {pastBookings.length === 0 ? (
                <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                  Nenhum histórico encontrado.
                </p>
              ) : (
                pastBookings.map((booking) => (
                  <div key={booking.id} className={styles.historyCard} style={{ marginBottom: '12px' }}>
                    <div className={styles.historyTop}>
                      <div className={styles.historyIcon}>
                        {getServiceIcon(booking.service_categories?.name)}
                      </div>
                      <div className={styles.historyInfo}>
                        <h3 className={styles.historyService}>{booking.service_categories?.name || 'Serviço'}</h3>
                        <p className={styles.historyDate}>
                          {new Date(booking.scheduled_at).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className={styles.historyPrice}>
                          R$ {booking.total_amount?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                          <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '4px' }}>
                            • Com {booking.proName ? booking.proName.split(' ')[0] : 'Profissional'}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <hr className={styles.divider} />
                    
                    <div className={styles.historyActions}>
                      <div className={`${styles.statusBadge} ${booking.status === 'COMPLETED' ? styles.statusBadgeDone : styles.statusBadgeCancelled}`}>
                        {booking.status === 'COMPLETED' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                        {booking.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                      </div>
                      
                      {booking.status === 'COMPLETED' && (
                        <Link href={`/bookings/new?proId=${booking.professional_profile_id || ''}`} className={styles.rebookBtn}>
                          <RotateCcw size={16} />
                          Reagendar
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
