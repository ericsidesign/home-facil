'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, MessageCircle, User, Plus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from './BottomNav.module.css';

const LEFT_TABS = [
  { href: '/',         icon: Home,           label: 'Início'  },
  { href: '/bookings', icon: Calendar,       label: 'Agenda'  },
];

const RIGHT_TABS = [
  { href: '/chat',     icon: MessageCircle,  label: 'Chat'    },
  { href: '/profile',  icon: User,           label: 'Perfil'  },
];

export function BottomNav() {
  const pathname = usePathname();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    let channel: any;
    let currentUserId: string;

    const setupUnreadTracking = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      currentUserId = user.id;
      
      const { data: profile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single();
      if (!profile) return;
      
      const { data: custProfile } = await supabase.from('customer_profiles').select('id').eq('user_profile_id', profile.id).single();
      if (!custProfile) return;

      const fetchUnread = async () => {
        // Buscar conversas da cliente
        const { data: convs } = await supabase.from('conversations').select('id').eq('customer_id', custProfile.id);
        if (convs && convs.length > 0) {
          const convIds = convs.map((c: any) => c.id);
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .in('conversation_id', convIds)
            .eq('is_read', false)
            .eq('sender_type', 'professional');
            
          setUnreadCount(count || 0);
        }
      };

      await fetchUnread();

      if (!isMounted) return;

      // Inscrever para atualizações em tempo real com nome de canal único
      channel = supabase.channel(`bottom_nav_customer_${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
          if (isMounted) fetchUnread();
        })
        .subscribe();
    };

    setupUnreadTracking();
    
    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Ocultar BottomNav nas páginas de autenticação e na conversa do chat (manter só na lista)
  const isDeepChat = pathname.startsWith('/chat/');
  if (pathname.startsWith('/login') || pathname.startsWith('/cadastro') || isDeepChat) {
    return null;
  }

  const renderNavItem = (tab: { href: string; icon: React.ElementType; label: string }) => {
    const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
    return (
      <Link
        key={tab.href}
        href={tab.href}
        className={`${styles.navItem} ${isActive ? styles.active : ''}`}
      >
        <div className={styles.iconWrapper}>
          <tab.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
          {tab.href === '/chat' && unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount}</span>
          )}
        </div>
        <span className={styles.navText}>{tab.label}</span>
      </Link>
    );
  };

  return (
    <div className={styles.bottomNavWrapper}>
      <nav className={styles.bottomNav}>
        {LEFT_TABS.map(renderNavItem)}

        {/* FAB Central — Agendar Faxina (Estilo HyperMart Laranja) */}
        <Link href="/bookings/new" className={styles.fabWrapper}>
          <div className={styles.fab}>
            <Plus size={24} strokeWidth={2.5} />
          </div>
          <span className={styles.fabLabel}>Agendar</span>
        </Link>

        {RIGHT_TABS.map(renderNavItem)}
      </nav>
    </div>
  );
}
