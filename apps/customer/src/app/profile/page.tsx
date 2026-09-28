'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, MapPin, CreditCard, Gift, Settings, HelpCircle, LogOut, ChevronRight, Star, Shield } from 'lucide-react';
import styles from './profile.module.css';
import { createClient } from '@/lib/supabase/client';

const MENU_ITEMS = [
  { icon: MapPin,     label: 'Endereços salvos',   href: '/profile/addresses', badge: '' },
  { icon: CreditCard, label: 'Pagamento',          href: '/profile/payment', badge: '' },
  { icon: Gift,       label: 'Programa de fidelidade', href: '/profile/loyalty', badge: '0 pts' },
  { icon: Star,       label: 'Minhas avaliações',  href: '/profile/reviews', badge: '' },
  { icon: Settings,   label: 'Configurações',      href: '/profile/settings', badge: '' },
  { icon: HelpCircle, label: 'Ajuda e suporte',    href: '/profile/support', badge: '' },
];

export default function ProfilePage() {
  const [userName, setUserName] = useState('Cliente');
  const [userEmail, setUserEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ bookings: 0, favorites: 0, rating: '5.0', loyaltyPoints: 0 });
  const [primaryAddress, setPrimaryAddress] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const loadProfileData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setUserName(user.user_metadata?.full_name || 'Cliente');
      setUserEmail(user.email || '');

      // Get user profile
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id, avatar_url')
        .eq('auth_user_id', user.id)
        .single();
        
      if (userProfile) {
        if (userProfile.avatar_url) {
          setAvatarUrl(userProfile.avatar_url);
        }
        const { data: custProfile } = await supabase
          .from('customer_profiles')
          .select('id, loyalty_points, rating_average')
          .eq('user_profile_id', userProfile.id)
          .single();
          
        if (custProfile) {
          // Count Bookings
          const { count: bCount } = await supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('customer_profile_id', custProfile.id);
            
          // Count Favorites
          const { count: fCount } = await supabase
            .from('favorites')
            .select('id', { count: 'exact', head: true })
            .eq('customer_profile_id', custProfile.id);
            
          setStats({
            bookings: bCount || 0,
            favorites: fCount || 0,
            rating: custProfile.rating_average ? Number(custProfile.rating_average).toFixed(1) : '5.0',
            loyaltyPoints: custProfile.loyalty_points || 0
          });
        }

        // Get primary address (just the first one since is_default doesn't exist yet)
        const { data: addresses, error: addrErr } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_profile_id', userProfile.id)
          .order('created_at', { ascending: true })
          .limit(1);
          
        if (!addrErr && addresses && addresses.length > 0) {
          setPrimaryAddress(addresses[0]);
        }
      }
    };
    
    loadProfileData();
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
        <p className={styles.subtitle}>Gerencie sua conta e preferências.</p>
      </header>

      {/* User Hero */}
      <div className={styles.userHero}>
        <div style={{ position: 'relative' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Foto de perfil" className={styles.userAvatarImage} />
          ) : (
            <div className={styles.userAvatar}>{userName.charAt(0).toUpperCase()}</div>
          )}
          <Link href="/profile/edit" className={styles.editAvatarBtn}>
            <Settings size={14} />
          </Link>
        </div>
        <h1 className={styles.userName}>{userName}</h1>
        <p className={styles.userEmail}>{userEmail}</p>
        
        <div className={styles.loyaltyBanner}>
          <div className={styles.loyaltyTop}>
            <Gift size={18} className={styles.loyaltyIcon} />
            <span className={styles.loyaltyTitle}>{stats.loyaltyPoints} pontos de fidelidade</span>
          </div>
          <div className={styles.loyaltyProgress}>
            <div className={styles.loyaltyBar} style={{ width: `${Math.min(100, (stats.loyaltyPoints / 250) * 100)}%` }} />
          </div>
          <span className={styles.loyaltyHint}>
            {stats.loyaltyPoints >= 250 
              ? 'Você tem uma limpeza grátis!' 
              : `Faltam ${250 - stats.loyaltyPoints} pts para limpeza grátis!`}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className={styles.statsCard}>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.bookings}</span>
            <span className={styles.statLabel}>Limpezas</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.favorites}</span>
            <span className={styles.statLabel}>Favoritas</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.rating}</span>
            <span className={styles.statLabel}>Nota</span>
          </div>
        </div>
      </div>

      {/* Addresses */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Endereços principais</h2>
        {primaryAddress ? (
          <div className={styles.addressCard}>
            <div className={styles.addressIconWrap}>
              <MapPin size={20} />
            </div>
            <div>
              <p className={styles.addressName}>{primaryAddress.label || 'Meu Endereço'}</p>
              <p className={styles.addressText}>
                {primaryAddress.street}, {primaryAddress.number} 
                {primaryAddress.complement ? ` — ${primaryAddress.complement}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className={styles.addressCard} style={{ cursor: 'pointer' }} onClick={() => router.push('/profile/addresses')}>
            <div className={styles.addressIconWrap}>
              <MapPin size={20} />
            </div>
            <div>
              <p className={styles.addressName}>Adicionar Endereço</p>
              <p className={styles.addressText}>Você ainda não cadastrou nenhum endereço.</p>
            </div>
          </div>
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
                {item.badge && <span className={styles.menuBadge}>{item.label === 'Programa de fidelidade' ? `${stats.loyaltyPoints} pts` : item.badge}</span>}
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
