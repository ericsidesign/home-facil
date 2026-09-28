'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Bell, Shield, Moon, LogOut, ChevronRight, Loader2 } from 'lucide-react';
import styles from '../profile.module.css';
import { createClient } from '@/lib/supabase/client';

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (e: any) => void }) => (
  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
    <input type="checkbox" checked={checked} onChange={onChange} style={{ opacity: 0, width: 0, height: 0 }} />
    <span style={{ 
      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, 
      backgroundColor: checked ? 'var(--brand-500)' : '#cbd5e1', 
      transition: '.3s', borderRadius: '24px' 
    }}>
      <span style={{
        position: 'absolute', height: '18px', width: '18px', 
        left: checked ? '23px' : '3px', bottom: '3px', backgroundColor: 'white', 
        transition: '.3s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }} />
    </span>
  </label>
);

export default function SettingsPage() {
  const router = useRouter();
  const [pushEnabled, setPushEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [darkEnabled, setDarkEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userProfileId, setUserProfileId] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('id, push_notifications_enabled, email_notifications_enabled, dark_mode_enabled')
          .eq('auth_user_id', user.id)
          .single();
          
        if (profile) {
          setUserProfileId(profile.id);
          setPushEnabled(profile.push_notifications_enabled);
          setEmailEnabled(profile.email_notifications_enabled);
          setDarkEnabled(profile.dark_mode_enabled);
        }
      }
      setIsLoading(false);
    };
    loadSettings();
  }, []);

  const updateSetting = async (field: string, value: boolean) => {
    if (!userProfileId) return;
    const supabase = createClient();
    await supabase.from('user_profiles').update({ [field]: value }).eq('id', userProfileId);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <Loader2 size={32} className="spin" color="var(--brand-500)" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link href="/profile" className={styles.backBtn}>
            <ChevronLeft size={24} />
          </Link>
          <h1 className={styles.title}>Configurações</h1>
        </div>
      </header>

      <main className={styles.content} style={{ marginTop: '24px' }}>
        
        <div className={styles.menuSection}>
          <div className={styles.menuItem}>
            <div className={styles.menuLeft}>
              <div className={styles.menuIconWrap}>
                <Bell size={20} />
              </div>
              <span className={styles.menuLabel}>Notificações Push</span>
            </div>
            <div className={styles.menuRight}>
              <Toggle 
                checked={pushEnabled} 
                onChange={(e) => {
                  setPushEnabled(e.target.checked);
                  updateSetting('push_notifications_enabled', e.target.checked);
                }} 
              />
            </div>
          </div>

          <div className={styles.menuItem}>
            <div className={styles.menuLeft}>
              <div className={styles.menuIconWrap}>
                <Bell size={20} />
              </div>
              <span className={styles.menuLabel}>Notificações por Email</span>
            </div>
            <div className={styles.menuRight}>
              <Toggle 
                checked={emailEnabled} 
                onChange={(e) => {
                  setEmailEnabled(e.target.checked);
                  updateSetting('email_notifications_enabled', e.target.checked);
                }} 
              />
            </div>
          </div>

          <div className={styles.menuItem}>
            <div className={styles.menuLeft}>
              <div className={styles.menuIconWrap}>
                <Moon size={20} />
              </div>
              <span className={styles.menuLabel}>Modo Escuro (Beta)</span>
            </div>
            <div className={styles.menuRight}>
              <Toggle 
                checked={darkEnabled} 
                onChange={(e) => {
                  setDarkEnabled(e.target.checked);
                  updateSetting('dark_mode_enabled', e.target.checked);
                }} 
              />
            </div>
          </div>

          <div className={styles.menuItem} style={{ cursor: 'pointer' }}>
            <div className={styles.menuLeft}>
              <div className={styles.menuIconWrap}>
                <Shield size={20} />
              </div>
              <span className={styles.menuLabel}>Privacidade e Segurança</span>
            </div>
            <div className={styles.menuRight}>
              <ChevronRight size={20} color="var(--text-tertiary)" />
            </div>
          </div>
        </div>

        <div className={styles.logoutSection} style={{ padding: '32px 0' }}>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>

      </main>
    </div>
  );
}
