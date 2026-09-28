'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Sparkles, Droplets, Box, Home as HomeIcon, Package, ChevronRight, MapPin, Search, ChevronDown, RefreshCw, Shield, X, Check, Plus, Mic, Clock, MessageCircle, Bell } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

const MOCK_SERVICE_CATEGORIES = [
  { slug: 'padrao',      icon: Sparkles, label: 'Limpeza\nPadrão',  color: '#E8F7F5', iconColor: '#2BA89A' },
  { slug: 'pesada',      icon: Droplets, label: 'Faxina\nPesada',   color: '#E0EFFE', iconColor: '#4A9EE5' },
  { slug: 'pre_mudanca', icon: Box,      label: 'Pré\nMudança',     color: '#F0ECFE', iconColor: '#8B6FE5' },
  { slug: 'pos_mudanca', icon: HomeIcon, label: 'Pós\nMudança',     color: '#FEECF0', iconColor: '#E56B8A' },
  { slug: 'organizacao', icon: Package,  label: 'Organi-\nzação',    color: '#FFF4E0', iconColor: '#E5A234' },
];

const PROMOS = [
  { id: 1, title: 'Boas-vindas!', subtitle: '20% OFF na sua primeira faxina', bg: '#E8F7F5', textColor: '#1A6B62', accent: '#2BA89A', code: 'PRIMEIRA20', emoji: '🧹' },
  { id: 2, title: 'Indique amigos', subtitle: 'Ganhe R$ 30 de crédito por indicação', bg: '#F0ECFE', textColor: '#5B3EC7', accent: '#8B6FE5', code: 'INDIQUE30', emoji: '🎁' },
  { id: 3, title: 'Plano Mensal', subtitle: 'Economize 15% com agendamento recorrente', bg: '#FFF4E0', textColor: '#8B6A1E', accent: '#F5A623', code: '', emoji: '📅' },
];

const MOCK_PROFESSIONALS = [
  { id: 1, initial: 'M', name: 'Márcia S.', rating: '4.9', reviews: 127, services: 'Padrão, Pesada', color: '#2BA89A' },
  { id: 2, initial: 'A', name: 'Ana R.',    rating: '4.8', reviews: 89,  services: 'Pesada, Org.', color: '#4A9EE5' },
  { id: 3, initial: 'J', name: 'Juliana M.',rating: '5.0', reviews: 201, services: 'Padrão', color: '#8B6FE5' },
  { id: 4, initial: 'F', name: 'Fernanda L.',rating: '4.7', reviews: 64, services: 'Org.', color: '#E5A234' },
];

const ADDRESSES = [
  { id: 1, name: 'Casa', address: 'Rua das Flores, 123' },
  { id: 2, name: 'Escritório', address: 'Av. Paulista, 1000' }
];

export default function MobileHome() {
  const [greeting, setGreeting] = useState('Olá');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('Buscando endereço...');
  const [categories, setCategories] = useState(MOCK_SERVICE_CATEGORIES);
  const [professionals, setProfessionals] = useState<any[]>(MOCK_PROFESSIONALS);
  const [userName, setUserName] = useState('Cliente');
  const [addresses, setAddresses] = useState<any[]>([]);
  
  const MOCK_ACTIVE_BOOKING = {
    id: 'mock-1',
    status: 'IN_PROGRESS',
    service_categories: { name: 'Limpeza Padrão', id: 'padrao' },
    professional_profiles: { 
      user_profiles: { 
        full_name: 'Lucia Almeida', 
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150' 
      } 
    }
  };

  const MOCK_LAST_BOOKING = {
    id: 'mock-2',
    status: 'COMPLETED',
    scheduled_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    service_categories: { name: 'Faxina Pesada', id: 'pesada' },
    professional_profiles: { user_profiles: { full_name: 'Marcia Campelo', avatar_url: null } }
  };

  // Real Data States
  const [activeBooking, setActiveBooking] = useState<any>(null);
  const [lastBooking, setLastBooking] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndAddress = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name?.split(' ')[0] || 'Cliente');
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        if (profile) {
          // Addr
          const { data: addrs } = await supabase
            .from('addresses')
            .select('*')
            .eq('user_profile_id', profile.id)
            .is('deleted_at', null)
            .order('is_primary', { ascending: false });
          
          if (addrs && addrs.length > 0) {
            setAddresses(addrs);
            setSelectedAddress(`${addrs[0].street}, ${addrs[0].number}`);
          } else {
            setSelectedAddress('Adicionar endereço');
          }

          // Customer Profile
          const { data: custProfile } = await supabase.from('customer_profiles').select('id').eq('user_profile_id', profile.id).single();
          if (custProfile) {
             // Active Booking
             const { data: activeB, error: err1 } = await supabase.from('bookings')
              .select('id, status, scheduled_at, professional_profile_id, service_categories(name, id)')
              .eq('customer_id', custProfile.id)
              .in('status', ['DRAFT', 'REQUESTED', 'AWAITING_PROFESSIONAL', 'ACCEPTED', 'PAYMENT_PENDING', 'CONFIRMED', 'PROFESSIONAL_ON_THE_WAY', 'CHECKED_IN', 'IN_PROGRESS', 'CHECKED_OUT', 'AWAITING_CUSTOMER_CONFIRMATION'])
              .order('scheduled_at', { ascending: true })
              .limit(1)
              .maybeSingle();
             
             if (activeB) {
                if (activeB.professional_profile_id) {
                    const { data: proProfile } = await supabase.from('professional_profiles').select('user_profiles(full_name, avatar_url)').eq('id', activeB.professional_profile_id).single();
                    activeB.professional_profiles = proProfile;
                }
                setActiveBooking(activeB);
             } else {
                setActiveBooking(null);
             }

             // Last Booking
             const { data: lastB, error: err2 } = await supabase.from('bookings')
              .select('id, status, scheduled_at, professional_profile_id, service_categories(name, id)')
              .eq('customer_id', custProfile.id)
              .eq('status', 'COMPLETED')
              .order('scheduled_at', { ascending: false })
              .limit(1)
              .maybeSingle();
             
             if (lastB) {
                if (lastB.professional_profile_id) {
                    const { data: proProfile } = await supabase.from('professional_profiles').select('user_profiles(full_name, avatar_url)').eq('id', lastB.professional_profile_id).single();
                    lastB.professional_profiles = proProfile;
                }
                setLastBooking(lastB);
             } else {
                setLastBooking(null);
             }
          }
        }
      } else {
        setSelectedAddress('Rua dos Jambeiros, 1025'); // fallback
        setActiveBooking(MOCK_ACTIVE_BOOKING);
        setLastBooking(MOCK_LAST_BOOKING);
      }
    };
    fetchUserAndAddress();

    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) setGreeting('Bom dia');
    else if (hour >= 12 && hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    const fetchCategories = async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from('service_categories').select('*').eq('is_active', true);
      if (!error && data && data.length > 0) {
        const getStyle = (name: string) => {
          if (name.includes('Padrão')) return { icon: Sparkles, color: '#E8F7F5', iconColor: '#2BA89A' };
          if (name.includes('Pesada')) return { icon: Droplets, color: '#E0EFFE', iconColor: '#4A9EE5' };
          if (name.includes('Pré')) return { icon: Box, color: '#F0ECFE', iconColor: '#8B6FE5' };
          if (name.includes('Pós')) return { icon: HomeIcon, color: '#FEECF0', iconColor: '#E56B8A' };
          if (name.includes('Organização')) return { icon: Package, color: '#FFF4E0', iconColor: '#E5A234' };
          return { icon: Sparkles, color: '#E8F7F5', iconColor: '#2BA89A' };
        };
        setCategories(data.map(c => {
          const s = getStyle(c.name);
          return { slug: c.id, icon: s.icon, label: c.name, color: s.color, iconColor: s.iconColor };
        }));
      }
    };
    const fetchProfessionals = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('professional_profiles')
        .select(`
          id,
          rating_average,
          rating_count,
          user_profiles!inner ( full_name, avatar_url )
        `)
        .eq('is_available', true)
        .eq('verification_status', 'APPROVED')
        .order('rating_average', { ascending: false })
        .order('rating_count', { ascending: false })
        .limit(5);

      if (!error && data && data.length > 0) {
        const colors = ['#2BA89A', '#4A9EE5', '#8B6FE5', '#E5A234'];
        const mapped = data.map((pro, index) => {
          const name = pro.user_profiles?.full_name || 'Profissional';
          return {
            id: pro.id,
            initial: name.charAt(0).toUpperCase(),
            name: name,
            rating: (pro.rating_average || 5.0).toFixed(1),
            reviews: pro.rating_count || 0,
            services: 'Limpeza, Faxina', // Placeholder para serviços
            color: colors[index % colors.length],
            avatarUrl: pro.user_profiles?.avatar_url || null
          };
        });
        setProfessionals(mapped);
      }
    };
    fetchProfessionals();
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(cat =>
    cat.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const translateStatusToText = (status: string, proName: string) => {
    switch (status) {
      case 'DRAFT': return 'Rascunho';
      case 'REQUESTED': return 'Aguardando profissionais';
      case 'AWAITING_PROFESSIONAL': return 'Buscando profissional...';
      case 'ACCEPTED': return `${proName !== 'Profissional' ? proName : 'Profissional'} aceitou o serviço`;
      case 'PAYMENT_PENDING': return 'Aguardando pagamento';
      case 'CONFIRMED': return `Agendado com ${proName !== 'Profissional' ? proName : 'sucesso'}`;
      case 'PROFESSIONAL_ON_THE_WAY': return `${proName !== 'Profissional' ? proName : 'O profissional'} está a caminho`;
      case 'CHECKED_IN': return 'Profissional chegou';
      case 'IN_PROGRESS': return `Serviço em andamento`;
      case 'CHECKED_OUT': return 'Finalizando serviço...';
      case 'AWAITING_CUSTOMER_CONFIRMATION': return 'Aguardando sua confirmação';
      default: return 'Em breve';
    }
  };

  const getStepFromStatus = (status: string) => {
    switch (status) {
      case 'DRAFT':
      case 'REQUESTED':
      case 'AWAITING_PROFESSIONAL': return 0;
      case 'ACCEPTED':
      case 'PAYMENT_PENDING':
      case 'CONFIRMED': return 1;
      case 'PROFESSIONAL_ON_THE_WAY': return 2;
      case 'CHECKED_IN':
      case 'IN_PROGRESS': return 3;
      case 'CHECKED_OUT':
      case 'AWAITING_CUSTOMER_CONFIRMATION':
      case 'COMPLETED': return 4;
      default: return 0;
    }
  };

  return (
    <div className={styles.page}>

      {/* ═══ HEADER ═══ */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.locationBlock} onClick={() => setIsLocationModalOpen(true)}>
            <span className={styles.greetingText}>{greeting}, {userName} 👋</span>
            <div className={styles.locationSelect}>
              <span className={styles.locationLabel}>Limpeza em:</span>
              <span className={styles.locationText}>{selectedAddress}</span>
              <ChevronDown size={16} color="var(--brand-500)" />
            </div>
          </div>
          <button className={styles.notificationBtn} aria-label="Notificações">
            <Bell size={20} color="var(--text-secondary)" />
            <span className={styles.notificationBadge}></span>
          </button>
        </div>

        <div className={styles.searchRow}>
          <Search size={16} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Buscar serviço (ex: Faxina)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm ? (
            <button className={styles.searchBtn} onClick={() => setSearchTerm('')}><X size={14} /></button>
          ) : (
            <button className={styles.searchBtn}><Mic size={14} /></button>
          )}
        </div>
      </header>

      {/* ═══ PROMO BANNER ═══ */}
      {!searchTerm && (
        <section className={styles.promoSection}>
          <div className={styles.promoScroll}>
            {PROMOS.map(p => (
              <div key={p.id} className={styles.promoCard} style={{ background: p.bg }}>
                <div className={styles.promoContent}>
                  <span className={styles.promoEmoji}>{p.emoji}</span>
                  <h3 className={styles.promoTitle} style={{ color: p.textColor }}>{p.title}</h3>
                  <p className={styles.promoSub} style={{ color: p.textColor + 'cc' }}>{p.subtitle}</p>
                  {p.code && (
                    <span className={styles.promoCode} style={{ background: p.accent, color: 'white' }}>{p.code}</span>
                  )}
                </div>
                <div className={styles.promoDecor} style={{ background: p.accent + '15' }} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══ CATEGORIAS ═══ */}
      <section className={styles.catSection}>
        <div className={styles.sectionRow}>
          <h2 className={styles.sectionTitle}>{searchTerm ? 'Resultados' : 'Categorias'}</h2>
          {!searchTerm && <Link href="/bookings/new" className={styles.seeAll}><ChevronRight size={16} /></Link>}
        </div>
        {filteredCategories.length > 0 ? (
          <div className={styles.catGrid}>
            {filteredCategories.map(cat => (
              <Link href={`/bookings/new?tipo=${cat.slug}`} key={cat.slug} className={styles.catItem}>
                <div className={styles.catCircle} style={{ background: cat.color }}>
                  <cat.icon size={24} strokeWidth={1.6} color={cat.iconColor} />
                </div>
                <span className={styles.catLabel}>{cat.label}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.emptySearch}><p>Nenhum serviço encontrado</p></div>
        )}
      </section>

      {/* ═══ AGENDAMENTO ATIVO ═══ */}
      {!searchTerm && activeBooking && (
        <section className={styles.section}>
          <div className={styles.dynamicBanner}>
            <div className={styles.dynamicTop}>
              <div className={styles.dynamicAvatarWrap}>
                {activeBooking.professional_profiles?.user_profiles?.avatar_url ? (
                  <img 
                    src={activeBooking.professional_profiles.user_profiles.avatar_url} 
                    alt="Profissional" 
                    className={styles.dynamicAvatar} 
                  />
                ) : (
                  <Sparkles size={20} color="var(--brand-500)" />
                )}
                <div className={styles.dynamicPulse} />
              </div>
              <div className={styles.dynamicInfo}>
                <p className={styles.dynamicTitle}>
                  {activeBooking.status === 'PROFESSIONAL_ON_THE_WAY' ? `🚗 ${activeBooking.professional_profiles?.user_profiles?.full_name?.split(' ')[0] || 'A profissional'} está a caminho` :
                   activeBooking.status === 'IN_PROGRESS' ? `✨ ${activeBooking.professional_profiles?.user_profiles?.full_name?.split(' ')[0] || 'A profissional'} está limpando` :
                   translateStatusToText(activeBooking.status, activeBooking.professional_profiles?.user_profiles?.full_name?.split(' ')[0] || 'Profissional')}
                </p>
                <p className={styles.dynamicSub}>
                  {activeBooking.service_categories?.name || 'Limpeza Residencial'} 
                  {activeBooking.scheduled_at ? (
                    (() => {
                      const date = new Date(activeBooking.scheduled_at);
                      date.setHours(date.getHours() + 4); // Estimativa de 4h
                      const endStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                      return ` · Previsão: ${endStr}`;
                    })()
                  ) : (
                    ' · Previsão: 14:15'
                  )}
                </p>
              </div>
              <Link href={`/chat/${activeBooking.id}`} className={styles.dynamicChat}>
                <MessageCircle size={18} />
              </Link>
            </div>
            
            <Link href={`/bookings/${activeBooking.id}`} className={styles.dynamicBarWrap}>
              <div className={styles.dynamicBarBg}>
                <div 
                  className={styles.dynamicBarFill} 
                  style={{ width: `${(getStepFromStatus(activeBooking.status) / 4) * 100}%` }} 
                />
              </div>
              <div className={styles.dynamicActionText}>
                <span>Acompanhar serviço</span>
                <ChevronRight size={14} />
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* ═══ ÚLTIMO SERVIÇO ═══ */}
      {!searchTerm && lastBooking && (
        <section className={styles.section}>
          <div className={styles.sectionRow}>
            <h2 className={styles.sectionTitle}>Último Serviço</h2>
          </div>
          <div className={styles.rebookCard}>
            <div className={styles.rebookRow}>
              <div className={styles.rebookAvatar}>
                {(lastBooking.professional_profiles?.user_profiles?.full_name || 'P').charAt(0)}
              </div>
              <div className={styles.rebookInfo}>
                <p className={styles.rebookName}>{lastBooking.professional_profiles?.user_profiles?.full_name || 'Profissional'}</p>
                <p className={styles.rebookMeta}>
                  <Clock size={12} /> {lastBooking?.scheduled_at ? new Date(lastBooking.scheduled_at).toLocaleDateString('pt-BR') : ''} · {lastBooking.service_categories?.name || 'Limpeza'}
                </p>
              </div>
            </div>
            <Link href={`/bookings/new?tipo=${lastBooking.service_categories?.id || 'padrao'}&proId=${lastBooking.professional_profile_id}`} className={styles.rebookBtn}>
              <RefreshCw size={14} /> Reagendar com {lastBooking.professional_profiles?.user_profiles?.full_name?.split(' ')[0] || 'profissional'}
            </Link>
          </div>
        </section>
      )}

      {/* ═══ PROFISSIONAIS ═══ */}
      {!searchTerm && (
        <section className={styles.section}>
          <div className={styles.sectionRow}>
            <h2 className={styles.sectionTitle}>Profissionais em Destaque</h2>
            <Link href="#" className={styles.seeAll}><ChevronRight size={16} /></Link>
          </div>
          <div className={styles.proScroll}>
            {professionals.map(pro => (
              <Link href={`/pro/${pro.id}`} key={pro.id} className={styles.proCard}>
                <div className={styles.proAvatarWrap}>
                  {pro.avatarUrl ? (
                    <div className={styles.proAvatar} style={{ backgroundImage: `url(${pro.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent', color: 'transparent' }} />
                  ) : (
                    <div className={styles.proAvatar} style={{ background: pro.color }}>{pro.initial}</div>
                  )}
                  <div className={styles.proBadge}><Shield size={8} fill="white" color="white" /></div>
                </div>
                <p className={styles.proName}>{pro.name}</p>
                <div className={styles.proRating}>
                  <Star size={11} fill="#F5A623" color="#F5A623" />
                  <span>{pro.rating}</span>
                  <span className={styles.proReviewCount}>({pro.reviews})</span>
                </div>
                <p className={styles.proServices}>{pro.services}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ═══ MODAL DE ENDEREÇO ═══ */}
      {isLocationModalOpen && (
        <div className={styles.overlay} onClick={() => setIsLocationModalOpen(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <h3 className={styles.sheetTitle}>Onde será a limpeza?</h3>
            <div className={styles.addrList}>
              {addresses.length === 0 ? (
                <p style={{ textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: '16px 0' }}>Nenhum endereço cadastrado.</p>
              ) : (
                addresses.map(a => (
                  <div key={a.id} className={`${styles.addrItem} ${selectedAddress === `${a.street}, ${a.number}` ? styles.addrSelected : ''}`}
                    onClick={() => { setSelectedAddress(`${a.street}, ${a.number}`); setIsLocationModalOpen(false); }}>
                    <div className={styles.addrIcon}><MapPin size={16} /></div>
                    <div className={styles.addrInfo}>
                      <p className={styles.addrName}>{a.name || 'Endereço'}</p>
                      <p className={styles.addrText}>{a.street}, {a.number}</p>
                    </div>
                    {selectedAddress === `${a.street}, ${a.number}` && <Check size={16} color="var(--brand-500)" />}
                  </div>
                ))
              )}
              <Link href="/profile/addresses" className={styles.addrAdd} style={{ textDecoration: 'none' }}>
                <Plus size={16} /> Adicionar novo endereço
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
