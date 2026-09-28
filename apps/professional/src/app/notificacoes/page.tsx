'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Bell, AlertCircle, CheckCircle2, DollarSign, CalendarX, Info, Check } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', session.user.id)
      .single();

    if (profile) {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (data) {
        setNotifications(data);
      }
    }
    
    setLoading(false);
  };

  const markAsRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return;

    const supabase = createClient();
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;

    const supabase = createClient();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));

    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'BOOKING_CANCELLED': return <CalendarX size={20} className={styles.iconRed} />;
      case 'PAYOUT_COMPLETED': return <DollarSign size={20} className={styles.iconGreen} />;
      case 'PAYOUT_REJECTED': return <AlertCircle size={20} className={styles.iconRed} />;
      case 'SYSTEM_BROADCAST': return <Info size={20} className={styles.iconBlue} />;
      default: return <Bell size={20} className={styles.iconGray} />;
    }
  };

  return (
    <div className={styles.page}>
      {/* Header Fixo */}
      <header className={styles.header}>
        <Link href="/" className={styles.backBtn} aria-label="Voltar">
          <ChevronLeft size={28} />
        </Link>
        <h1 className={styles.pageTitle}>Notificações</h1>
        <div style={{ width: 28 }} />
      </header>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.emptyState}>Carregando...</div>
        ) : notifications.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><Bell size={48} /></div>
            <p>Você não tem nenhuma notificação no momento.</p>
          </div>
        ) : (
          <div className={styles.listContainer}>
            <div className={styles.listHeader}>
              <span className={styles.countText}>
                {notifications.filter(n => !n.is_read).length} não lidas
              </span>
              <button className={styles.markAllBtn} onClick={markAllAsRead}>
                <Check size={16} /> Marcar todas como lidas
              </button>
            </div>
            
            <div className={styles.list}>
              {notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`${styles.notifCard} ${!notif.is_read ? styles.unread : ''}`}
                  onClick={() => markAsRead(notif.id, notif.is_read)}
                >
                  <div className={styles.notifIconWrapper}>
                    {getIconForType(notif.type)}
                  </div>
                  <div className={styles.notifContent}>
                    <div className={styles.notifHeader}>
                      <h3 className={styles.notifTitle}>{notif.title}</h3>
                      <span className={styles.notifDate}>
                        {new Date(notif.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className={styles.notifBody}>{notif.body}</p>
                  </div>
                  {!notif.is_read && <div className={styles.unreadDot} />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
