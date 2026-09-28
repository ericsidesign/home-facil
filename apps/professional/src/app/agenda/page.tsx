'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Calendar, Clock, ArrowRight, CheckCircle2, Navigation, XCircle } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function ProfessionalAgenda() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single();
      if (!userProfile) return;

      const { data: proProfile } = await supabase.from('professional_profiles').select('id').eq('user_profile_id', userProfile.id).single();
      if (!proProfile) return;

      const { data, error } = await supabase
        .from('bookings')
        .select('*, service_categories(name)')
        .in('status', ['ACCEPTED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'PROFESSIONAL_ON_THE_WAY'])
        .eq('professional_profile_id', proProfile.id)
        .order('scheduled_at', { ascending: true });

      if (!error && data) {
        setBookings(data);
      }
      setLoading(false);
    };

    fetchBookings();
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Minha Agenda</h1>
        <p className={styles.subtitle}>Acompanhe seus próximos serviços</p>
      </header>

      <div className={styles.listContainer}>
        {loading ? (
          <div className={styles.emptyState}>Carregando agenda...</div>
        ) : bookings.length === 0 ? (
          <div className={styles.emptyState}>
            <Calendar size={40} color="var(--text-tertiary)" style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Sua agenda está livre!</p>
            <span style={{ fontSize: '0.8125rem', marginTop: '4px' }}>
              Vá ao Painel para aceitar novas oportunidades.
            </span>
          </div>
        ) : (
          bookings.map((booking) => {
            const date = new Date(booking.scheduled_at);
            const isCompleted = booking.status === 'COMPLETED';
            const isInProgress = booking.status === 'IN_PROGRESS';
            const isEnRoute = booking.status === 'PROFESSIONAL_ON_THE_WAY';
            const isCancelled = booking.status === 'CANCELLED';
            const isAccepted = booking.status === 'ACCEPTED';
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            
            const jobDate = new Date(date);
            jobDate.setHours(0, 0, 0, 0);
            
            const isToday = jobDate.getTime() === today.getTime();
            const isTomorrow = jobDate.getTime() === tomorrow.getTime();
            
            return (
              <div key={booking.id} className={`card ${isCompleted || isCancelled ? styles.cardCompleted : ''}`} style={{ padding: '20px', position: 'relative', borderRadius: '20px', boxShadow: 'var(--shadow-card)' }}>
                
                {isInProgress && <div className={styles.activeBadge}><Navigation size={12} /> Em andamento</div>}
                {isEnRoute && <div className={styles.activeBadge} style={{ backgroundColor: 'var(--brand-500)' }}><Navigation size={12} /> A caminho</div>}
                {isCompleted && <div className={styles.completedBadge}><CheckCircle2 size={12} /> Concluído</div>}
                {isCancelled && <div className={styles.cancelledBadge}><XCircle size={12} /> Cancelado</div>}

                <div className={styles.jobHeader}>
                  <div className={styles.jobService}>
                    {booking.service_categories?.name || 'Serviço de Limpeza'}
                    {isToday && !isCompleted && !isCancelled && (
                      <span style={{ marginLeft: '8px', padding: '3px 6px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#FEE2E2', color: '#DC2626', borderRadius: '4px', verticalAlign: 'middle', textTransform: 'uppercase' }}>HOJE</span>
                    )}
                    {isTomorrow && !isCompleted && !isCancelled && (
                      <span style={{ marginLeft: '8px', padding: '3px 6px', fontSize: '10px', fontWeight: 'bold', backgroundColor: '#FEF9C3', color: '#CA8A04', borderRadius: '4px', verticalAlign: 'middle', textTransform: 'uppercase' }}>AMANHÃ</span>
                    )}
                  </div>
                  <div className={styles.jobPrice}>
                    R$ {(Number(booking.total_amount) * 0.8).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className={styles.jobDetails}>
                  <div className={styles.jobDetailRow}>
                    <Calendar size={16} />
                    <span>{date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  </div>
                  <div className={styles.jobDetailRow}>
                    <Clock size={16} />
                    <span>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={styles.jobDetailRow}>
                    <MapPin size={16} />
                    <span>{booking.address_snapshot?.street || 'Endereço não informado'}</span>
                  </div>
                </div>

                <Link href={`/servico/${booking.id}`} className={styles.actionBtn}>
                  {isCompleted ? 'Ver Recibo' : 'Gerenciar Serviço'} <ArrowRight size={18} />
                </Link>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
