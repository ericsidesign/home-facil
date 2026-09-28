'use client';

import React, { useState } from 'react';
import { Bell, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSending(true);
    setStatus({ type: null, message: '' });

    try {
      const supabase = createClient();
      
      // 1. Fetch all active professional profiles (or all user_profile_ids of professionals)
      const { data: professionals, error: proError } = await supabase
        .from('professional_profiles')
        .select('user_profile_id')
        .not('user_profile_id', 'is', null);

      if (proError) throw proError;
      if (!professionals || professionals.length === 0) {
        throw new Error('Nenhum profissional encontrado.');
      }

      // 2. Prepare notifications array
      const notifications = professionals.map((p) => ({
        user_profile_id: p.user_profile_id,
        type: 'SYSTEM_BROADCAST',
        title: title,
        body: message,
        channel: 'IN_APP',
        is_read: false
      }));

      // 3. Insert all at once
      const { error: insertError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (insertError) throw insertError;

      setStatus({ type: 'success', message: `Notificação enviada com sucesso para ${notifications.length} profissionais!` });
      setTitle('');
      setMessage('');
    } catch (error: any) {
      console.error('Broadcast error:', error);
      setStatus({ type: 'error', message: error.message || 'Ocorreu um erro ao enviar.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.pageTitle}>Enviar Notificações</h1>
        <p className={styles.pageDesc}>Dispare avisos, promoções e comunicados em massa para os profissionais.</p>
      </header>

      <div className={styles.content}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.iconWrapper}>
              <Bell size={24} className={styles.icon} />
            </div>
            <div>
              <h2 className={styles.cardTitle}>Nova Mensagem em Massa</h2>
              <p className={styles.cardSub}>Todos os profissionais receberão um alerta no "sininho" do app.</p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className={styles.form}>
            <div className={styles.formGroup}>
              <label htmlFor="title" className={styles.label}>Título da Notificação</label>
              <input 
                id="title"
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Promoção de Feriado!"
                className={styles.input}
                maxLength={60}
                required
              />
              <span className={styles.charCount}>{title.length}/60</span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="message" className={styles.label}>Mensagem</label>
              <textarea 
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Ganhe R$50 extra completando 5 faxinas neste fim de semana."
                className={styles.textarea}
                maxLength={200}
                required
              />
              <span className={styles.charCount}>{message.length}/200</span>
            </div>

            {status.type && (
              <div className={`${styles.statusBanner} ${status.type === 'success' ? styles.statusSuccess : styles.statusError}`}>
                {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                <span>{status.message}</span>
              </div>
            )}

            <button 
              type="submit" 
              className={styles.submitBtn} 
              disabled={isSending || !title.trim() || !message.trim()}
            >
              <Send size={18} />
              {isSending ? 'Enviando...' : 'Enviar para Todos'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
