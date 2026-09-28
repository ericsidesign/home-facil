'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './chat.module.css';
import { createClient } from '@/lib/supabase/client';

export default function ChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!userProfile) return;

      const { data: proProfile } = await supabase
        .from('professional_profiles')
        .select('id')
        .eq('user_profile_id', userProfile.id)
        .single();

      if (!proProfile) return;

      // Buscar conversas deste profissional
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          customer_id,
          messages (
            content,
            created_at
          )
        `)
        .eq('professional_profile_id', proProfile.id);

      if (!error && data) {
        // Enriquecer com os dados da cliente e formatar a última mensagem
        const enriched = await Promise.all(data.map(async (conv: any, index: number) => {
          const { data: customer } = await supabase
            .from('customer_profiles')
            .select('user_profile_id, user_profiles(full_name, avatar_url)')
            .eq('id', conv.customer_id)
            .single();

          const cProfile = Array.isArray(customer?.user_profiles) ? customer?.user_profiles[0] : customer?.user_profiles;
          const name = cProfile?.full_name || 'Cliente';
          const msgs = conv.messages || [];
          const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
          const avatarColors = ['#7C3AED', '#3B82F6', '#EC4899', '#F59E0B', '#10B981'];

          return {
            id: conv.id,
            name: name,
            initial: name.charAt(0).toUpperCase(),
            color: avatarColors[index % avatarColors.length],
            avatarUrl: cProfile?.avatar_url || null,
            lastMsg: lastMsg ? lastMsg.content : 'Nova conversa iniciada.',
            time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
            unread: 0,
            service: 'Atendimento'
          };
        }));
        
        setConversations(enriched);
      }
      setLoading(false);
    };

    fetchConversations();
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mensagens</h1>
        <p className={styles.subtitle}>Suas conversas com clientes.</p>
      </header>

      <div className={styles.chatList}>
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Carregando conversas...</p>
        ) : conversations.length === 0 ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>Nenhuma conversa encontrada.</p>
        ) : (
          conversations.map((conv) => (
            <Link href={`/chat/${conv.id}`} key={conv.id} className={styles.chatItemLink}>
              <div className={styles.chatItem}>
                {conv.avatarUrl ? (
                  <div className={styles.chatAvatar} style={{ backgroundImage: `url(${conv.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: conv.color, color: 'transparent' }}>
                    {conv.initial}
                  </div>
                ) : (
                  <div className={styles.chatAvatar} style={{ backgroundColor: conv.color }}>
                    {conv.initial}
                  </div>
                )}
                <div className={styles.chatContent}>
                  <div className={styles.chatTop}>
                    <h3 className={styles.chatName}>{conv.name}</h3>
                    <span className={styles.chatTime}>{conv.time}</span>
                  </div>
                  <div className={styles.chatBottom}>
                    <p className={styles.chatMsg}>{conv.lastMsg}</p>
                    {conv.unread > 0 && <span className={styles.chatBadge}>{conv.unread}</span>}
                  </div>
                  <span className={styles.chatService}>{conv.service}</span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
