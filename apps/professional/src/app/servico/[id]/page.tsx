'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Calendar, Clock, Navigation, CheckCircle2, AlertCircle, X, MessageCircle, Star } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

export default function ProfessionalServiceDetail() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, status: string, title: string, desc: string} | null>(null);

  // Rating State
  const [hasRated, setHasRated] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    async function fetchBooking() {
      if (!id) return;
      const supabase = createClient();
      const { data, error } = await supabase
        .from('bookings')
        .select('*, service_categories(name)')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setBooking(data);
        
        // Verifica se a profissional já avaliou esse cliente
        const { data: review } = await supabase
          .from('customer_reviews')
          .select('id')
          .eq('booking_id', id)
          .maybeSingle();
          
        if (review) {
          setHasRated(true);
        }
      }
      setLoading(false);
    }
    fetchBooking();
  }, [id]);

  const requestStatusUpdate = (newStatus: string) => {
    let title = '';
    let desc = '';
    if (newStatus === 'CONFIRMED') {
      title = 'Aceitar Serviço?';
      desc = 'Você será a profissional responsável por esta faxina.';
    } else if (newStatus === 'PROFESSIONAL_ON_THE_WAY') {
      title = 'A Caminho?';
      desc = 'Avisar a cliente que você já está a caminho do local?';
    } else if (newStatus === 'IN_PROGRESS') {
      title = 'Chegou no local?';
      desc = 'Avisar a cliente que você chegou e vai iniciar o serviço?';
    } else if (newStatus === 'COMPLETED') {
      title = 'Finalizar Serviço?';
      desc = 'Você já concluiu a faxina e deseja finalizar o serviço?';
    } else if (newStatus === 'PENDING') {
      title = 'Devolver Faxina?';
      desc = 'Ao devolver esta faxina, ela voltará para a lista de novas solicitações para que outros profissionais possam aceitá-la. Tem certeza?';
    }
    setConfirmModal({ isOpen: true, status: newStatus, title, desc });
  };

  const handleUpdateStatus = async () => {
    if (!confirmModal) return;
    const newStatus = confirmModal.status;
    
    setUpdating(true);
    setConfirmModal(null);
    const supabase = createClient();
    
    let updatePayload: any = { status: newStatus };

    // Se estiver aceitando a faxina (modelo Uber), "trava" a faxina para esta profissional
    if (newStatus === 'CONFIRMED' || newStatus === 'ACCEPTED') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updatePayload.professional_id = user.id;
        
        // Buscar o professional_profile_id para vincular corretamente o chat e os perfis
        const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single();
        if (userProfile) {
          const { data: proProfile } = await supabase.from('professional_profiles').select('id').eq('user_profile_id', userProfile.id).single();
          if (proProfile) {
            updatePayload.professional_profile_id = proProfile.id;
          }
        }
      }
    } else if (newStatus === 'PENDING') {
      // Devolver a faxina para a "piscina" de profissionais
      updatePayload.professional_id = null;
      updatePayload.professional_profile_id = null;
    }
    
    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', id);

    if (!error) {
      setBooking({ ...booking, status: newStatus });
      if (newStatus === 'COMPLETED' && !hasRated) {
        setShowRatingModal(true);
      }
    } else {
      alert('Erro ao atualizar o status.');
    }
    setUpdating(false);
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Carregando detalhes...</div>;
  }

  if (!booking) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Serviço não encontrado.</div>;
  }

  const date = new Date(booking.scheduled_at);
  const status = booking.status;

  const translateStatus = (s: string) => {
    switch(s) {
      case 'PENDING': return 'Pendente';
      case 'ACCEPTED': return 'Aceito pela Profissional';
      case 'CONFIRMED': return 'Confirmado';
      case 'PROFESSIONAL_ON_THE_WAY': return 'A Caminho';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'COMPLETED': return 'Concluído';
      case 'CANCELLED': return 'Cancelado';
      default: return s;
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn} aria-label="Voltar">
          <ChevronLeft size={28} />
        </button>
        <div className={styles.headerTitle}>Detalhes do Serviço</div>
        <Link href={`/chat/${booking.id}`} style={{ color: 'var(--brand-500)', display: 'flex' }}>
          <MessageCircle size={24} />
        </Link>
      </header>

      <div className={styles.statusBanner}>
        <div className={styles.statusTitle}>
          Status Atual: {translateStatus(status)}
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-4)', margin: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            {booking.service_categories?.name || 'Limpeza Padrão'}
          </h3>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.125rem', fontWeight: 'bold', color: 'var(--brand-500)' }}>
              R$ {(Number(booking.total_amount) * 0.8).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Ganho Líquido</div>
          </div>
        </div>
        
        <div className={styles.detailRow}>
          <div className={styles.iconBox}><Calendar size={18} /></div>
          <div>
            <div className={styles.label}>Data</div>
            <div className={styles.value}>{date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.iconBox}><Clock size={18} /></div>
          <div>
            <div className={styles.label}>Horário</div>
            <div className={styles.value}>{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        </div>

        <div className={styles.detailRow}>
          <div className={styles.iconBox}><MapPin size={18} /></div>
          <div>
            <div className={styles.label}>Endereço do Cliente</div>
            <div className={styles.value}>{booking.address_snapshot?.street || 'Rua das Flores, 123'}</div>
          </div>
        </div>
      </div>

      <div className={styles.actionsContainer}>
        {status === 'PENDING' && (
          <button 
            className={`${styles.actionBtn} ${styles.btnAccept}`} 
            onClick={() => requestStatusUpdate('CONFIRMED')}
            disabled={updating}
          >
            <CheckCircle2 size={20} />
            {updating ? 'Processando...' : 'Aceitar Serviço'}
          </button>
        )}

        {(status === 'CONFIRMED' || status === 'ACCEPTED') && (
          <>
            <button 
              className={`${styles.actionBtn} ${styles.btnEnRoute}`} 
              onClick={() => requestStatusUpdate('PROFESSIONAL_ON_THE_WAY')}
              disabled={updating}
            >
              <Navigation size={20} />
              {updating ? 'Processando...' : 'Estou a Caminho'}
            </button>
            <button 
              className={styles.actionBtn} 
              onClick={() => requestStatusUpdate('PENDING')}
              disabled={updating}
              style={{ backgroundColor: '#F1F5F9', color: '#64748B', borderColor: '#E2E8F0', marginTop: '1rem' }}
            >
              <AlertCircle size={20} />
              Tive um imprevisto (Devolver)
            </button>
          </>
        )}

        {status === 'PROFESSIONAL_ON_THE_WAY' && (
          <button 
            className={`${styles.actionBtn} ${styles.btnEnRoute}`} 
            onClick={() => requestStatusUpdate('IN_PROGRESS')}
            disabled={updating}
            style={{ backgroundColor: 'var(--brand-400)', borderColor: 'var(--brand-400)' }}
          >
            <MapPin size={20} />
            {updating ? 'Processando...' : 'Cheguei no Local'}
          </button>
        )}

        {status === 'IN_PROGRESS' && (
          <button 
            className={`${styles.actionBtn} ${styles.btnComplete}`} 
            onClick={() => requestStatusUpdate('COMPLETED')}
            disabled={updating}
          >
            <CheckCircle2 size={20} />
            {updating ? 'Processando...' : 'Finalizar Serviço'}
          </button>
        )}

        {status === 'COMPLETED' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            <div className={styles.completedMessage}>
              🎉 Serviço concluído com sucesso!
            </div>
            
            {!hasRated ? (
              <button 
                className={styles.actionBtn} 
                onClick={() => setShowRatingModal(true)}
                style={{ backgroundColor: 'var(--brand-500)', color: 'white', borderColor: 'var(--brand-500)' }}
              >
                <Star size={20} />
                Avaliar Cliente
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="var(--brand-500)" /> Cliente já avaliado. Obrigado!
              </div>
            )}
          </div>
        )}

        {status === 'CANCELLED' && (
          <div className={styles.cancelledMessage}>
            <AlertCircle size={20} />
            Este serviço foi cancelado.
          </div>
        )}
      </div>

      {/* Modal de Confirmação */}
      {confirmModal && confirmModal.isOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{confirmModal.title}</h3>
              <button className={styles.modalCloseBtn} onClick={() => setConfirmModal(null)}>
                <X size={24} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <p>{confirmModal.desc}</p>
            </div>
            <div className={styles.modalFooter}>
              <button 
                className={styles.modalCancelBtn} 
                onClick={() => setConfirmModal(null)}
                disabled={updating}
              >
                Cancelar
              </button>
              <button 
                className="btn-primary" 
                onClick={handleUpdateStatus}
                disabled={updating}
              >
                {updating ? 'Aguarde...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Rating */}
      {showRatingModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Avaliar Cliente</h2>
              <button className={styles.modalCloseBtn} onClick={() => setShowRatingModal(false)}>
                <X size={24} />
              </button>
            </div>
            
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Como foi atender este cliente? Sua avaliação ajuda a manter a comunidade segura!
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '24px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button 
                  key={star} 
                  onClick={() => setRatingValue(star)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Star 
                    size={36} 
                    fill={star <= ratingValue ? '#F59E0B' : 'transparent'} 
                    color={star <= ratingValue ? '#F59E0B' : '#CBD5E1'} 
                  />
                </button>
              ))}
            </div>

            <textarea 
              placeholder="Deixe um comentário (opcional)..." 
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '80px', marginBottom: '16px', fontFamily: 'inherit', resize: 'vertical' }}
            />

            <div className={styles.modalActions}>
              <button 
                className={styles.modalCancelBtn} 
                onClick={() => setShowRatingModal(false)}
                disabled={submittingRating}
              >
                Pular
              </button>
              <button 
                className={styles.modalConfirmBtn}  
                onClick={async () => {
                  if (ratingValue === 0) return alert('Selecione uma nota de 1 a 5 estrelas.');
                  setSubmittingRating(true);
                  const supabase = createClient();
                  
                  // Inserir avaliação
                  let profProfileIdToUse = booking.professional_profile_id;
                  
                  if (!profProfileIdToUse) {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single();
                      if (userProfile) {
                        const { data: proProfile } = await supabase.from('professional_profiles').select('id').eq('user_profile_id', userProfile.id).single();
                        if (proProfile) profProfileIdToUse = proProfile.id;
                      }
                    }
                  }

                  if (!profProfileIdToUse) {
                    alert('Erro: Perfil profissional não encontrado.');
                    setSubmittingRating(false);
                    return;
                  }

                  const { error } = await supabase.from('customer_reviews').insert({
                    booking_id: booking.id,
                    customer_profile_id: booking.customer_id,
                    professional_profile_id: profProfileIdToUse,
                    rating: ratingValue,
                    comment: ratingComment
                  });

                  if (!error) {
                    // Update profile via RPC or direct (if fails, we ignore for now to not block the user)
                    const { data: cust } = await supabase.from('customer_profiles').select('rating_average, rating_count').eq('id', booking.customer_id).single();
                    if (cust) {
                      const newCount = cust.rating_count + 1;
                      const newAvg = ((Number(cust.rating_average) * cust.rating_count) + ratingValue) / newCount;
                      await supabase.from('customer_profiles').update({
                        rating_average: newAvg,
                        rating_count: newCount
                      }).eq('id', booking.customer_id);
                    }
                    
                    setHasRated(true);
                    setShowRatingModal(false);
                  } else {
                    console.error('Submit review error:', error);
                    alert(`Erro ao enviar avaliação: ${error.message || 'Desconhecido'}`);
                  }
                  setSubmittingRating(false);
                }}
                disabled={submittingRating || ratingValue === 0}
              >
                {submittingRating ? 'Enviando...' : 'Enviar Avaliação'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
