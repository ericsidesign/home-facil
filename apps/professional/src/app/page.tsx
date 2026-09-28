'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Clock, ArrowRight, Wallet, CheckCircle2, Bell, Sparkles, Filter, ChevronRight, AlertCircle, X } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function ProfessionalDashboard() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Profissional');
  const [proId, setProId] = useState<string | null>(null);
  const router = useRouter();

  const [walletBalance, setWalletBalance] = useState("0,00");
  const [balanceCentsState, setBalanceCentsState] = useState(0);
  const [upcomingJobs, setUpcomingJobs] = useState(0);
  const [jobsWeek, setJobsWeek] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState<string>('PENDING');
  
  const [filterType, setFilterType] = useState('TODOS');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const [payoutStatus, setPayoutStatus] = useState<'NONE' | 'PENDING' | 'REQUESTING'>('NONE');
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [userProfileId, setUserProfileId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    const supabase = createClient();
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const supabase = createClient();

    const fetchOpportunities = async (professionalId: string | null) => {
      let query = supabase
        .from('bookings')
        .select('*, service_categories(name)')
        .order('created_at', { ascending: false });

      if (professionalId) {
        query = query.or(`status.eq.PENDING,and(status.eq.AWAITING_PROFESSIONAL,professional_profile_id.eq.${professionalId})`);
      } else {
        query = query.eq('status', 'PENDING');
      }

      const { data, error } = await query;

      if (!error && data) {
        setOpportunities(data);
      }
      setLoading(false);
    };

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      let professionalId = null;
      if (user) {
        const { data: userProfile } = await supabase.from('user_profiles').select('id, full_name').eq('auth_user_id', user.id).single();
        if (userProfile) {
          setUserProfileId(userProfile.id);
          const nameToUse = userProfile.full_name || user.user_metadata?.full_name || 'Profissional';
          setUserName(nameToUse.split(' ')[0]);

          const { data: notifs } = await supabase.from('notifications')
            .select('*')
            .eq('user_profile_id', userProfile.id)
            .order('created_at', { ascending: false })
            .limit(20);
          if (notifs) setNotifications(notifs);
          const { data: proProfile } = await supabase.from('professional_profiles').select('id, verification_status').eq('user_profile_id', userProfile.id).single();
          if (proProfile) {
            professionalId = proProfile.id;
            setProId(professionalId);
            if (proProfile.verification_status) {
              setVerificationStatus(proProfile.verification_status);
            }
            
            // Buscar Estatísticas Reais
            const today = new Date();
            today.setHours(0,0,0,0);
            
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            
            const { data: bookingsData } = await supabase
              .from('bookings')
              .select('id, scheduled_at, status, total_amount')
              .eq('professional_profile_id', professionalId);
              
            if (bookingsData) {
              let upcoming = 0;
              let wJobs = 0;
              let balanceCents = 0;
              
              bookingsData.forEach(b => {
                if (!b.scheduled_at) return;
                const bDate = new Date(b.scheduled_at);
                
                if (b.status === 'COMPLETED') {
                  const netValueCents = Math.floor((b.total_amount || 0) * 0.8 * 100);
                  balanceCents += netValueCents;
                  if (bDate >= startOfWeek) wJobs++;
                }
                
                if (['ACCEPTED', 'CONFIRMED', 'PROFESSIONAL_ON_THE_WAY', 'IN_PROGRESS'].includes(b.status)) {
                    upcoming++;
                }
              });
              
              const { data: payouts } = await supabase
                .from('payout_requests')
                .select('amount_cents, status')
                .eq('professional_profile_id', professionalId);

              if (payouts) {
                payouts.forEach(p => {
                  if (p.status !== 'REJEITADO') {
                    balanceCents -= p.amount_cents;
                  }
                });
              }

              if (balanceCents < 0) balanceCents = 0;

              setUpcomingJobs(upcoming);
              setJobsWeek(wJobs);
              setBalanceCentsState(balanceCents);
              setWalletBalance((balanceCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
            }
            
            // Verificar se há saque pendente
            const { data: pendingPayout } = await supabase
              .from('payout_requests')
              .select('id')
              .eq('professional_profile_id', professionalId)
              .eq('status', 'PENDING')
              .limit(1)
              .single();
              
            if (pendingPayout) {
              setPayoutStatus('PENDING');
            }
          }
        }
      }
      fetchOpportunities(professionalId);
    };

    init();

    const subscription = supabase
      .channel('public:bookings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        // Usa o estado proId atual se possível, ou vai ter que refazer. O mais fácil é recarregar a tela ou esperar o re-render
        // Mas como é um realtime básico, vamos apenas dar um reload na página para fins de POC, ou usar window.location.reload()
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleAccept = async (bookingId: string) => {
    const supabase = createClient();
    await supabase.from('bookings').update({ status: 'ACCEPTED', professional_profile_id: proId }).eq('id', bookingId);
    setOpportunities(prev => prev.filter(b => b.id !== bookingId));
    router.push(`/servico/${bookingId}`);
  };

  const handleDecline = async (bookingId: string) => {
    const supabase = createClient();
    await supabase.from('bookings').update({ status: 'PENDING', professional_profile_id: null }).eq('id', bookingId);
    setOpportunities(prev => prev.filter(b => b.id !== bookingId));
  };

  const handleRequestPayout = () => {
    if (balanceCentsState <= 0) {
      showToast('Você não tem saldo disponível para saque.', 'error');
      return;
    }
    setPayoutAmount((balanceCentsState / 100).toFixed(2).replace('.', ','));
    setShowPayoutModal(true);
  };

  const confirmPayout = async () => {
    let requestedAmount = parseFloat(payoutAmount.replace(',', '.'));
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      showToast('Por favor, digite um valor válido.', 'error');
      return;
    }
    
    const requestedAmountCents = Math.floor(requestedAmount * 100);
    
    if (requestedAmountCents > balanceCentsState) {
      showToast('Saldo insuficiente para o valor solicitado.', 'error');
      return;
    }

    setShowPayoutModal(false);
    setPayoutStatus('REQUESTING');
    const supabase = createClient();

    try {
      // 1. Checar se a pessoa tem conta bancária/PIX
      const { data: bankAccount } = await supabase
        .from('professional_bank_accounts')
        .select('*')
        .eq('professional_profile_id', proId)
        .single();

      if (!bankAccount) {
        showToast('Por favor, cadastre sua chave PIX no seu Perfil antes de sacar.', 'error');
        setPayoutStatus('NONE');
        return;
      }

      // 2. Inserir pedido de saque
      const { error } = await supabase
        .from('payout_requests')
        .insert([{
          professional_profile_id: proId,
          amount_cents: requestedAmountCents,
          pix_key: bankAccount.pix_key,
          pix_key_type: bankAccount.pix_key_type
        }]);

      if (error) throw error;

      showToast('Saque em processamento! O valor cairá em breve na sua conta.', 'success');
      setPayoutStatus('PENDING');
    } catch (err) {
      console.error(err);
      showToast('Erro ao solicitar saque. Tente novamente mais tarde.', 'error');
      setPayoutStatus('NONE');
    }
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  })();

  const filteredOpportunities = filterType === 'TODOS' 
    ? opportunities 
    : opportunities.filter(b => b.service_categories?.name === filterType);

  return (
    <div className={styles.page}>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideDown 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}
      
      {/* ═══ HEADER (Clean & Airy) ═══ */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.greetingWrap}>
            <span className={styles.greetingSm}>{greeting},</span>
            <h1 className={styles.greetingName}>{userName} 👋</h1>
          </div>
          <div className={styles.headerActions} style={{ position: 'relative' }}>
            <button className={styles.iconBtn} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={20} />
              {unreadCount > 0 && <span className={styles.notifDot} />}
            </button>
            <div className={styles.avatar}>{userName.charAt(0)}</div>

            {/* Dropdown de Notificações */}
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 12px)',
                right: '0',
                width: '320px',
                maxHeight: '400px',
                backgroundColor: 'white',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Notificações</h3>
                  <button onClick={() => setShowNotifications(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="var(--text-tertiary)" /></button>
                </div>
                
                <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
                  {notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)' }}>
                      <Bell size={28} style={{ opacity: 0.2, marginBottom: '12px' }} />
                      <p style={{ fontSize: '14px' }}>Você não tem notificações.</p>
                    </div>
                  ) : (
                    notifications.slice(0, 5).map(notif => (
                      <div 
                        key={notif.id} 
                        onClick={() => {
                          if (!notif.is_read) markAsRead(notif.id);
                          router.push('/notificacoes');
                        }}
                        style={{ 
                          padding: '12px', 
                          borderRadius: '12px', 
                          backgroundColor: notif.is_read ? '#F8FAFC' : '#EFF6FF',
                          border: notif.is_read ? '1px solid #E2E8F0' : '1px solid #BFDBFE',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <strong style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{notif.title}</strong>
                          {!notif.is_read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-500)', marginTop: '4px', flexShrink: 0 }}></span>}
                        </div>
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)', 
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>{notif.body}</p>
                        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', display: 'block', marginTop: '6px' }}>
                          {new Date(notif.created_at).toLocaleDateString('pt-BR')} • {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Ver todas Button */}
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '12px', textAlign: 'center' }}>
                  <Link 
                    href="/notificacoes" 
                    style={{ fontSize: '14px', fontWeight: 600, color: 'var(--brand-600)', textDecoration: 'none' }}
                  >
                    Ver todas as notificações
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className={styles.walletCard}>
          <div className={styles.walletLeft}>
            <div className={styles.walletIconWrap}>
              <Wallet size={20} color="var(--brand-500)" />
            </div>
            <div>
              <p className={styles.walletLabel}>Saldo Disponível</p>
              <p className={styles.walletValue}>R$ {walletBalance}</p>
            </div>
          </div>
          <button 
            className={styles.walletBtn} 
            onClick={handleRequestPayout}
            disabled={payoutStatus === 'REQUESTING' || payoutStatus === 'PENDING'}
            style={{ opacity: (payoutStatus === 'REQUESTING' || payoutStatus === 'PENDING') ? 0.7 : 1 }}
          >
            {payoutStatus === 'REQUESTING' ? 'Processando...' : payoutStatus === 'PENDING' ? 'Em análise' : 'Sacar'}
          </button>
        </div>
      </header>

      {/* ═══ STATS ═══ */}
      <section className={styles.section}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statTitle}>Próximas</p>
            <p className={styles.statNum}>{upcomingJobs}</p>
            <p className={styles.statDesc}>{upcomingJobs === 1 ? 'faxina agendada' : 'faxinas agendadas'}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statTitle}>Semana</p>
            <p className={styles.statNum}>{jobsWeek}</p>
            <p className={styles.statDesc}>{jobsWeek === 1 ? 'serviço concluído' : 'serviços concluídos'}</p>
          </div>
        </div>
      </section>

      {/* ═══ NOVIDADES / PROMOS ═══ */}
      <section className={styles.promoSection}>
         <div className={styles.promoCard}>
           <div className={styles.promoIcon}>
             <Sparkles size={24} color="#F5A623" />
           </div>
           <div className={styles.promoInfo}>
             <h3 className={styles.promoTitle}>Bônus de Indicação</h3>
             <p className={styles.promoSub}>Convide amigas e ganhe R$ 50.</p>
           </div>
           <ChevronRight size={18} color="var(--text-tertiary)" />
         </div>
      </section>

      {/* ═══ OPORTUNIDADES ═══ */}
      <section className={styles.section}>
        <div className={styles.sectionHeader} style={{ position: 'relative' }}>
          <h2 className={styles.sectionTitle}>Novas Solicitações</h2>
          <div style={{ position: 'relative' }}>
            <button 
              className={styles.filterBtn}
              onClick={() => setShowFilterModal(!showFilterModal)}
              style={filterType !== 'TODOS' ? { backgroundColor: 'var(--brand-100)', color: 'var(--brand-600)', borderColor: 'var(--brand-200)' } : {}}
            >
              <Filter size={14} /> {filterType === 'TODOS' ? 'Filtros' : filterType}
            </button>
            
            {showFilterModal && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowFilterModal(false)} />
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: '0',
                  width: '240px',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  zIndex: 50,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  border: '1px solid var(--border-color)'
                }}>
                  {['TODOS', 'Limpeza Padrão', 'Faxina Pesada', 'Pré Mudança', 'Pós Mudança'].map((type) => (
                    <button
                      key={type}
                      onClick={() => { setFilterType(type); setShowFilterModal(false); }}
                      style={{
                        padding: '12px 16px',
                        border: 'none',
                        borderBottom: type !== 'Pós Mudança' ? '1px solid var(--border-light)' : 'none',
                        background: filterType === type ? 'var(--brand-50)' : 'white',
                        color: filterType === type ? 'var(--brand-600)' : 'var(--text-primary)',
                        fontWeight: filterType === type ? '600' : '400',
                        fontSize: '13px',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      {type === 'TODOS' ? 'Todos os serviços' : type}
                      {filterType === type && <CheckCircle2 size={16} />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.jobList}>
          {verificationStatus !== 'APPROVED' ? (
             <div className={styles.emptyState}>
               <div className={styles.emptyIcon}>
                 <AlertCircle size={32} color="var(--brand-500)" />
               </div>
               <p className={styles.emptyTitle}>Perfil em Análise</p>
               <p className={styles.emptySub}>Você precisa aguardar a aprovação dos seus documentos para receber solicitações de faxina.</p>
             </div>
          ) : loading ? (
             <div className={styles.emptyState}>
               <p>Buscando oportunidades...</p>
             </div>
          ) : filteredOpportunities.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <CheckCircle2 size={32} color="var(--brand-500)" />
              </div>
              <p className={styles.emptyTitle}>Tudo tranquilo por aqui!</p>
              <p className={styles.emptySub}>Nenhuma solicitação {filterType !== 'TODOS' ? `de ${filterType} ` : ''}nova no momento.</p>
            </div>
          ) : (
            filteredOpportunities.map((booking) => {
              const date = new Date(booking.scheduled_at);
              const isToday = new Date().toDateString() === date.toDateString();
              
              return (
                <div key={booking.id} className={styles.jobCard} style={booking.status === 'AWAITING_PROFESSIONAL' ? { border: '2px solid #F5A623', background: '#FFFDF9' } : {}}>
                  {booking.status === 'AWAITING_PROFESSIONAL' && (
                    <div style={{ background: '#F5A623', color: 'white', fontSize: '11px', fontWeight: 600, padding: '4px 8px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px' }}>
                      ⭐ Exclusivo para Você
                    </div>
                  )}
                  <div className={styles.jobTop}>
                    <div className={styles.jobLeft}>
                      <div className={styles.serviceAvatar}>
                        <Sparkles size={18} color="var(--brand-500)" />
                      </div>
                      <div>
                        <p className={styles.serviceName}>{booking.service_categories?.name || 'Limpeza'}</p>
                        <p className={styles.jobTime}>
                           {isToday ? <span className={styles.urgentText}>Hoje</span> : date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} • {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className={styles.jobPrice} style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--brand-500)' }}>
                        R$ {(Number(booking.total_amount) * 0.8).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        Ganho Líquido
                      </div>
                    </div>
                  </div>

                  <div className={styles.jobAddressRow}>
                    <MapPin size={14} color="var(--text-tertiary)" />
                    <span>{booking.address_snapshot?.street || 'Endereço não informado'}</span>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                    <button 
                      onClick={() => handleDecline(booking.id)} 
                      style={{ 
                        flex: 1, 
                        padding: '16px', 
                        background: 'var(--bg-tertiary)', 
                        color: 'var(--text-secondary)', 
                        borderRadius: '100px', 
                        fontWeight: 700, 
                        border: 'none', 
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Recusar
                    </button>
                    <button 
                      onClick={() => handleAccept(booking.id)} 
                      style={{ 
                        flex: 1.5, 
                        padding: '16px', 
                        background: 'var(--brand-500)', 
                        color: 'white', 
                        borderRadius: '100px', 
                        fontWeight: 700, 
                        border: 'none', 
                        cursor: 'pointer',
                        boxShadow: '0 8px 24px rgba(124, 58, 237, 0.3)',
                        transition: 'all 0.2s'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      Aceitar Solicitação
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Modal de Saque */}
      {showPayoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', width: '90%', maxWidth: '350px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>Solicitar Saque</h3>
              <button onClick={() => setShowPayoutModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} color="var(--text-tertiary)" /></button>
            </div>
            <p style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Seu saldo disponível é de <strong>R$ {(balanceCentsState / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-tertiary)' }}>
                VALOR DO SAQUE (R$)
              </label>
              <input 
                type="text" 
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="0,00"
                style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)', fontSize: '16px', outline: 'none' }}
              />
            </div>
            <button 
              onClick={confirmPayout}
              style={{ width: '100%', backgroundColor: 'var(--brand-500)', color: 'white', padding: '14px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '16px', cursor: 'pointer' }}
            >
              Confirmar Saque
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
