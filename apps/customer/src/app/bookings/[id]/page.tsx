'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Star, Phone, MessageCircle, MapPin, Navigation, Hammer, CheckCircle2 } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

// ─── Status timeline ────────────────────────────────────────────────────────

type BookingStatus = 'confirmed' | 'en_route' | 'in_progress' | 'completed' | 'cancelled';

const STEPS: { key: BookingStatus; label: string }[] = [
  { key: 'confirmed',    label: 'Confirmado'  },
  { key: 'en_route',    label: 'A caminho'    },
  { key: 'in_progress', label: 'Em andamento' },
  { key: 'completed',   label: 'Concluído'    },
];

const STATUS_INDEX: Record<BookingStatus, number> = {
  confirmed: 0, en_route: 1, in_progress: 2, completed: 3, cancelled: -1
};

const STATUS_MESSAGES: Record<BookingStatus, string> = {
  confirmed:    'A profissional confirmou o serviço e está se preparando.',
  en_route:     'A profissional está a caminho. Chega em breve.',
  in_progress:  'O serviço está em andamento. Fique à vontade! ☕',
  completed:    'Serviço concluído! Tudo pronto, sua casa está impecável.',
  cancelled:    'Este agendamento foi cancelado.',
};

export default function BookingTrackingPage() {
  const params = useParams();
  const id = params?.id as string;
  
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proName, setProName] = useState<string | null>(null);
  const [proAvatar, setProAvatar] = useState<string | null>(null);
  const [proRating, setProRating] = useState<string>('5,0');
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // For demo tracking visualization we cycle through statuses
  const [status, setStatus] = useState<BookingStatus>('confirmed');
  const [progress, setProgress] = useState(20);
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isReviewSubmitted, setIsReviewSubmitted] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    
    async function fetchBooking() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('bookings')
        .select('*, service_categories(name)')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setBooking(data);
        
        if (data.professional_profile_id) {
          const { data: proProfileData } = await supabase
            .from('professional_profiles')
            .select('user_profile_id, rating_average, user_profiles(full_name, avatar_url)')
            .eq('id', data.professional_profile_id)
            .single();
            
          const prof = Array.isArray(proProfileData?.user_profiles) ? proProfileData?.user_profiles[0] : proProfileData?.user_profiles;
          if (prof && prof.full_name) {
            setProName(prof.full_name);
          }
          if (prof && prof.avatar_url) {
            setProAvatar(prof.avatar_url);
          }
          if (proProfileData && proProfileData.rating_average !== undefined) {
            setProRating(Number(proProfileData.rating_average || 5).toFixed(1).replace('.', ','));
          }
        }

        // Map DB status to Tracking status
        let newStatus: BookingStatus = 'confirmed';
        if (data.status === 'PROFESSIONAL_ON_THE_WAY') newStatus = 'en_route';
        if (data.status === 'IN_PROGRESS') newStatus = 'in_progress';
        if (data.status === 'COMPLETED') newStatus = 'completed';
        if (data.status === 'CANCELLED') newStatus = 'cancelled';
        
        // Para o modelo Uber, PENDING significa que a profissional ainda não aceitou.
        // Confirmado significa que ela aceitou e está a caminho/preparando.
        if (data.status === 'PENDING') {
          // Mantemos PENDING no frontend como "Aguardando", mas aqui vamos mapear para "confirmed" visualmente e tratar o UI abaixo
          newStatus = 'confirmed'; 
        }
        
        setStatus(newStatus);
      }
      setLoading(false);
    }
    fetchBooking();

    const subscription = supabase
      .channel('public:bookings')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `id=eq.${id}` }, () => {
        fetchBooking();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [id]);

  const [reviewError, setReviewError] = useState<string | null>(null);

  const submitReview = async () => {
    setIsSubmittingReview(true);
    setReviewError(null);
    const supabase = createClient();
    
    // Pegar o ID do usuário logado para garantir que não dê erro de chave estrangeira (FK)
    const { data: { user } } = await supabase.auth.getUser();
    let realCustomerProfileId = booking.customer_profile_id || booking.customer_id;
    
    if (user) {
      const { data: profile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single();
      if (profile) {
        const { data: customerProfile } = await supabase.from('customer_profiles').select('id').eq('user_profile_id', profile.id).single();
        if (customerProfile) {
          realCustomerProfileId = customerProfile.id;
        }
      }
    }

    // Pegar o ID correto da profissional (já que o agendamento pode ter salvo o ID de autenticação)
    let realProfessionalProfileId = booking.professional_profile_id;
    if (!realProfessionalProfileId && booking.professional_id) {
      const { data: proUser } = await supabase.from('user_profiles').select('id').eq('auth_user_id', booking.professional_id).single();
      if (proUser) {
        const { data: proProfile } = await supabase.from('professional_profiles').select('id').eq('user_profile_id', proUser.id).single();
        if (proProfile) {
          realProfessionalProfileId = proProfile.id;
        }
      }
    }
    
    const { error } = await supabase.from('reviews').insert({
      booking_id: booking.id,
      customer_profile_id: realCustomerProfileId,
      professional_profile_id: realProfessionalProfileId || booking.professional_id,
      overall_rating: rating,
      comment: reviewText
    });

    if (!error) {
      setIsReviewSubmitted(true);
    } else {
      setReviewError(error.message || 'Ocorreu um erro ao enviar sua avaliação. Tente novamente.');
      console.error('Submit review error:', error);
    }
    setIsSubmittingReview(false);
  };

  const confirmCancel = async () => {
    setIsCancelling(true);
    const supabase = createClient();
    const { error } = await supabase.from('bookings').update({ status: 'CANCELLED' }).eq('id', id);
    if (!error) {
      setStatus('cancelled');
      setShowCancelModal(false);
    } else {
      console.error('Erro ao cancelar:', error);
      alert('Erro: ' + (error.message || 'Não foi possível cancelar o serviço no momento.'));
    }
    setIsCancelling(false);
  };

  // Animate progress bar
  useEffect(() => {
    if (status === 'en_route') {
      setProgress(65);
    } else if (status === 'in_progress') {
      setProgress(40);
      const timer = setInterval(() => {
        setProgress((p) => Math.min(p + 1, 100));
      }, 300);
      return () => clearInterval(timer);
    } else if (status === 'completed') {
      setProgress(100);
    } else {
      setProgress(20);
    }
  }, [status]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando detalhes...</div>;
  }

  if (!booking) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Agendamento não encontrado.</div>;
  }

  const currentIndex = STATUS_INDEX[status];
  const isCompleted = status === 'completed';

  const scheduledDate = new Date(booking.scheduled_at);
  const formattedDate = scheduledDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedTime = scheduledDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <Link href="/bookings" className={styles.backBtn} aria-label="Voltar">
          <ChevronLeft size={24} />
        </Link>
      </header>

      {/* Fixed Background Map */}
      <div className={styles.mapContainer}>
        {status !== 'cancelled' ? (
          <iframe 
            width="100%" 
            height="100%" 
            frameBorder="0" 
            scrolling="no" 
            src="https://www.openstreetmap.org/export/embed.html?bbox=-46.6666%2C-23.5765%2C-46.6566%2C-23.5665&amp;layer=mapnik&amp;marker=-23.5715%2C-46.6616" 
            style={{ border: 0 }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
            Serviço Cancelado
          </div>
        )}
      </div>

      {/* Main Bottom Sheet */}
      <div className={styles.bottomSheet} style={{ marginTop: status === 'cancelled' ? '12vh' : '38vh' }}>
        
        {/* Status banner */}
        <div className={`${styles.statusBanner} ${isCompleted ? styles.statusBannerCompleted : ''} ${status === 'cancelled' ? styles.statusBannerCancelled : ''}`}>
          <div className={styles.statusBannerText}>
            <div className={styles.statusBannerTitle}>
              {status === 'cancelled' ? 'Cancelado' : (isCompleted ? 'Concluído! 🎉' : STEPS[currentIndex]?.label)}
            </div>
            <div className={styles.statusBannerSub}>{STATUS_MESSAGES[status]}</div>
          </div>
          {status === 'en_route' && (
            <div className={styles.etaBadge}>
              <Navigation size={14} /> ≈ 12 min
            </div>
          )}
          {status === 'in_progress' && (
            <div className={styles.etaBadge}>
              <Hammer size={14} /> Em andamento
            </div>
          )}
        </div>

        {/* Professional Header */}
        {booking.status === 'PENDING' ? (
          <div className={styles.sheetSection} style={{ textAlign: 'center' }}>
            <h2 className={styles.proName}>Buscando profissional...</h2>
            <p style={{ color: 'var(--ink-light)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Aguardando uma profissional da sua região aceitar a faxina.
            </p>
          </div>
        ) : (
          <div className={`${styles.proHeader} ${styles.sheetSection}`}>
            {proAvatar ? (
              <div className={styles.proAvatar} style={{ backgroundImage: `url(${proAvatar})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent', color: 'transparent' }} />
            ) : (
              <div className={styles.proAvatar} style={{ backgroundColor: '#0EA5E9' }}>
                {proName ? proName.charAt(0).toUpperCase() : 'P'}
              </div>
            )}
            <div className={styles.proInfo}>
              <h2 className={styles.proName}>{proName || 'Profissional'}</h2>
              <div className={styles.proMeta}>
                <Star size={12} fill="currentColor" /> {proRating} · Profissional Parceira
              </div>
            </div>
            <div className={styles.proActions}>
              <button className={styles.proBtn} aria-label="Ligar"><Phone size={18} /></button>
              <Link href={`/chat/${booking.id}`}>
                <button className={styles.proBtn} aria-label="Mensagem"><MessageCircle size={18} /></button>
              </Link>
            </div>
          </div>
        )}

        {/* Timeline */}
        {status !== 'cancelled' && (
          <div className={styles.sheetSection}>
            <div className={styles.verticalTimeline}>
              {STEPS.map((step, i) => {
                const done = i < currentIndex || (isCompleted && i === currentIndex);
                const active = i === currentIndex && !isCompleted;
                const timeStr = done || active ? new Date(Date.now() - (3 - i) * 900000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
                return (
                  <div key={step.key} className={styles.timelineStepVertical}>
                    <div className={styles.stepIconColumn}>
                      <div className={`${styles.stepDotVertical} ${done ? styles.dotDoneVertical : ''} ${active ? styles.dotActiveVertical : ''}`}>
                        {done && <CheckCircle2 size={14} color="white" />}
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`${styles.stepLineVertical} ${done ? styles.lineDoneVertical : ''}`} />
                      )}
                    </div>
                    <div className={styles.stepContentVertical}>
                      <div className={`${styles.stepLabelVertical} ${done ? styles.labelDoneVertical : ''} ${active ? styles.labelActiveVertical : ''}`}>
                        {step.label}
                      </div>
                      {(done || active) && <div className={styles.stepTimeVertical}>{timeStr}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating Section (Only show when completed) */}
        {isCompleted && (
          <div className={styles.sheetSection} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
            {isReviewSubmitted ? (
              <div style={{ padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={48} color="var(--brand-500)" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Avaliação enviada!</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Muito obrigado pelo seu feedback.</p>
              </div>
            ) : (
              <>
                <div style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Como foi o serviço de {proName?.split(' ')[0] || 'Profissional'}?
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => setRating(star)}
                      style={{ 
                        background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem',
                        color: star <= rating ? '#F5A623' : 'var(--border)',
                        transition: 'color 0.2s, transform 0.15s',
                        transform: star <= rating ? 'scale(1.1)' : 'scale(1)'
                      }}
                    >
                      <Star size={36} fill={star <= rating ? 'currentColor' : 'none'} strokeWidth={1.5} />
                    </button>
                  ))}
                </div>

                <textarea 
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Conte o que achou do serviço (opcional)"
                  style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.875rem', fontFamily: 'inherit', resize: 'vertical' }}
                />

                {reviewError && (
                  <div style={{ backgroundColor: 'var(--error-light)', color: 'var(--error)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', width: '100%', textAlign: 'left', border: '1px solid var(--error)' }}>
                    <strong>Erro:</strong> {reviewError}
                  </div>
                )}

                {rating > 0 && (
                  <button 
                    className={styles.cancelBtn} 
                    style={{ backgroundColor: 'var(--brand-500)', color: 'white', borderColor: 'var(--brand-500)', width: '100%', marginTop: '0.5rem', opacity: isSubmittingReview ? 0.7 : 1 }}
                    onClick={submitReview}
                    disabled={isSubmittingReview}
                  >
                    {isSubmittingReview ? 'Enviando...' : 'Enviar Avaliação'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Booking Details */}
        <div className={styles.sheetSection}>
          <h3 className={styles.sectionTitle}>Detalhes do serviço</h3>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Serviço</span>
            <span className={styles.detailValue}>{booking.service_categories?.name || 'Serviço Agendado'}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Data e Hora</span>
            <span className={styles.detailValue} style={{ textTransform: 'capitalize' }}>
              {formattedDate} às {formattedTime}
            </span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Endereço</span>
            <span className={styles.detailValue}>
              {booking.address_snapshot?.street || 'Seu endereço'}
            </span>
          </div>
          <div className={styles.detailRow} style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            <span className={styles.detailLabel}>Valor Total</span>
            <span className={styles.detailPrice}>
              R$ {Number(booking.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Cancellation Button */}
        {(status === 'confirmed' || status === 'en_route') && (
          <div className={styles.sheetSection} style={{ borderBottom: 'none' }}>
            <button 
              className={styles.cancelBtn} 
              onClick={() => setShowCancelModal(true)}
              disabled={isCancelling}
            >
              {isCancelling ? 'Cancelando...' : 'Cancelar Serviço'}
            </button>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3 className={styles.modalTitle}>Cancelar Serviço</h3>
            <p className={styles.modalDesc}>Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.</p>
            <div className={styles.modalActions}>
              <button className={styles.modalBtnCancel} onClick={() => setShowCancelModal(false)} disabled={isCancelling}>
                Voltar
              </button>
              <button className={styles.modalBtnConfirm} onClick={confirmCancel} disabled={isCancelling}>
                {isCancelling ? 'Cancelando...' : 'Sim, Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
