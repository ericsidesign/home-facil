'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, MapPin, Wallet, Settings, HelpCircle, LogOut, ChevronRight, Star, ShieldCheck, Briefcase } from 'lucide-react';
import styles from './profile.module.css';
import { createClient } from '@/lib/supabase/client';

const MENU_ITEMS = [
  { icon: User,        label: 'Editar Perfil e Portfólio',href: '/profile/edit', badge: 'Novo' },
  { icon: Wallet,      label: 'Dados bancários e Ganhos', href: '/profile/bank', badge: '' },
  { icon: Briefcase,   label: 'Serviços e Região',        href: '/profile/services-region', badge: 'Novo' },
  { icon: MapPin,      label: 'Área de atuação',          href: '/profile/address', badge: '' },
  { icon: ShieldCheck, label: 'Documentos e Verificação', href: '/profile/documents', badge: '100%' },
  { icon: Settings,    label: 'Configurações',            href: '/profile/settings', badge: '' },
  { icon: HelpCircle,  label: 'Ajuda e suporte',          href: '/profile/support', badge: '' },
];

export default function ProfessionalProfilePage() {
  const [userName, setUserName] = useState('Profissional');
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [reviews, setReviews] = useState<any[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>('');
  
  // Real Stats States
  const [totalJobs, setTotalJobs] = useState(0);
  const [averageRating, setAverageRating] = useState('5.0');
  const [successRate, setSuccessRate] = useState('100%');
  
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndReviews = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.user_metadata?.full_name || 'Profissional');
        setUserEmail(user.email || '');
        
        // Fetch do profile id, nome e avatar da tabela correta
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .eq('auth_user_id', user.id)
          .single();

        let profileIdToSearch = null;
          
        if (userProfile) {
          setUserName(userProfile.full_name || user.user_metadata?.full_name || 'Profissional');
          setAvatarUrl(userProfile.avatar_url || '');

          const { data: profile } = await supabase
            .from('professional_profiles')
            .select('id, verification_status')
            .eq('user_profile_id', userProfile.id)
            .single();
            
          if (profile) {
            profileIdToSearch = profile.id;
            setVerificationStatus(profile.verification_status);
          }
        }
          
        if (profileIdToSearch) {
          // Fetch das reviews
          const { data: revs } = await supabase
            .from('reviews')
            .select(`
              overall_rating,
              comment,
              created_at,
              customer_profiles (
                user_profiles (
                  full_name
                )
              ),
              bookings (
                service_categories (
                  name
                )
              )
            `)
            .eq('professional_profile_id', profileIdToSearch)
            .order('created_at', { ascending: false })
            .limit(10);
            
          if (revs && revs.length > 0) {
            setReviews(revs.map(r => ({
              name: r.customer_profiles?.user_profiles?.full_name || 'Cliente',
              rating: r.overall_rating,
              text: r.comment || '',
              service: r.bookings?.service_categories?.name || 'Serviço',
              time: new Date(r.created_at).toLocaleDateString()
            })));
            
            // Calculate Average Rating
            const totalRating = revs.reduce((acc, curr) => acc + curr.overall_rating, 0);
            const avg = (totalRating / revs.length).toFixed(1);
            setAverageRating(avg);
          }

          // Fetch Stats (Bookings)
          const { data: bookingsData } = await supabase
            .from('bookings')
            .select('status')
            .eq('professional_profile_id', profileIdToSearch);
            
          if (bookingsData && bookingsData.length > 0) {
            const completed = bookingsData.filter(b => b.status === 'COMPLETED').length;
            const cancelled = bookingsData.filter(b => b.status === 'CANCELLED').length;
            
            setTotalJobs(completed);
            
            // Calculate Success Rate: Completed / (Completed + Cancelled)
            const totalActionable = completed + cancelled;
            if (totalActionable > 0) {
              const rate = Math.round((completed / totalActionable) * 100);
              setSuccessRate(`${rate}%`);
            } else {
              setSuccessRate('100%');
            }
          }
        }
      }
    };
    fetchUserAndReviews();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className={styles.page}>
      {/* Header Padrão */}
      <header className={styles.header}>
        <h1 className={styles.title}>Meu Perfil</h1>
        <p className={styles.subtitle}>Gerencie sua conta profissional.</p>
      </header>

      {/* User Hero */}
      <div className={styles.userHero}>
        {avatarUrl ? (
          <div className={styles.userAvatar} style={{ backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent', color: 'transparent' }} />
        ) : (
          <div className={styles.userAvatar}>{userName.charAt(0).toUpperCase()}</div>
        )}
        <h1 className={styles.userName}>{userName}</h1>
        <p className={styles.userEmail}>{userEmail}</p>

        {/* Verification Badge */}
        {verificationStatus && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            marginBottom: '16px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: 600,
            color: verificationStatus === 'APPROVED' ? 'var(--success)' : 
                   verificationStatus === 'BLOCKED' ? 'var(--error)' : 
                   verificationStatus === 'REJECTED' ? 'var(--error)' : 'var(--warning)',
            backgroundColor: verificationStatus === 'APPROVED' ? 'rgba(34, 197, 94, 0.1)' : 
                             verificationStatus === 'BLOCKED' ? 'rgba(239, 68, 68, 0.1)' : 
                             verificationStatus === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          }}>
            {verificationStatus === 'APPROVED' && <><ShieldCheck size={14} /> Perfil 100% Verificado</>}
            {verificationStatus === 'PENDING_VERIFICATION' && <><Settings size={14} /> Em Análise</>}
            {verificationStatus === 'REJECTED' && <><HelpCircle size={14} /> Problema nos Documentos</>}
            {verificationStatus === 'BLOCKED' && <><LogOut size={14} /> Conta Desativada</>}
            {verificationStatus === 'DRAFT' && <><ShieldCheck size={14} /> Perfil Incompleto</>}
          </div>
        )}
        
        {/* Loyalty Banner - Só aparece se a pessoa for muito boa (Nota >= 4.8 e mais de 10 faxinas) */}
        {(parseFloat(averageRating) >= 4.8 && totalJobs >= 10) && (
          <div className={styles.loyaltyBanner}>
            <div className={styles.loyaltyTop}>
              <Star size={18} className={styles.loyaltyIcon} />
              <span className={styles.loyaltyTitle}>Profissional Super Estrela</span>
            </div>
            <p className={styles.loyaltyHint} style={{ marginTop: '4px' }}>Você está entre as 10% melhores profissionais da plataforma!</p>
          </div>
        )}
        
        {/* Se ela for novata mas tiver nota boa, a gente pode dar um incentivo */}
        {(parseFloat(averageRating) >= 4.5 && totalJobs < 10 && totalJobs > 0) && (
          <div className={styles.loyaltyBanner} style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
            <div className={styles.loyaltyTop}>
              <Star size={18} color="var(--success)" className={styles.loyaltyIcon} style={{ background: 'rgba(34, 197, 94, 0.2)' }} />
              <span className={styles.loyaltyTitle} style={{ color: 'var(--success)' }}>Profissional em Ascensão</span>
            </div>
            <p className={styles.loyaltyHint} style={{ marginTop: '4px' }}>Você está recebendo ótimas avaliações nos seus primeiros serviços!</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className={styles.statsCard}>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{totalJobs}</span>
            <span className={styles.statLabel}>Faxinas</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{successRate}</span>
            <span className={styles.statLabel}>Taxa Acerto</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{averageRating}</span>
            <span className={styles.statLabel}>Nota</span>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <section className={styles.reviewsSection}>
        <h2 className={styles.sectionTitle}>Minhas Avaliações</h2>
        {reviews.length > 0 ? (
          <div className={styles.reviewsScroll}>
            {reviews.map((r, i) => (
              <div key={i} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <span className={styles.reviewName}>{r.name}</span>
                  <div className={styles.reviewStars}>
                    {Array.from({ length: r.rating }).map((_, j) => (
                      <Star key={j} size={14} fill="#F59E0B" color="#F59E0B" />
                    ))}
                  </div>
                </div>
                <p className={styles.reviewText}>"{r.text}"</p>
                <span className={styles.reviewMeta}>{r.service} · {r.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginTop: '8px' }}>Você ainda não possui avaliações. Continue fazendo um ótimo trabalho!</p>
        )}
      </section>

      {/* Menu */}
      <section className={styles.menuSection}>
        {MENU_ITEMS.map((item) => (
          <Link href={item.href} key={item.label} className={styles.menuItemLink}>
            <div className={styles.menuItem}>
              <div className={styles.menuLeft}>
                <div className={styles.menuIconWrap}>
                  <item.icon size={18} />
                </div>
                <span className={styles.menuLabel}>{item.label}</span>
              </div>
              <div className={styles.menuRight}>
                {item.badge && <span className={styles.menuBadge}>{item.badge}</span>}
                <ChevronRight size={18} color="var(--text-tertiary)" />
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* Logout */}
      <div className={styles.logoutSection}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={18} />
          Sair da conta
        </button>
      </div>
    </div>
  );
}
