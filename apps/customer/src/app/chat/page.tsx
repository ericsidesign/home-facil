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

      const { data: customerProfile } = await supabase
        .from('customer_profiles')
        .select('id')
        .eq('user_profile_id', userProfile.id)
        .single();

      if (!customerProfile) return;

      // Buscar conversas deste cliente
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          professional_profile_id,
          messages (
            content,
            created_at
          )
        `)
        .eq('customer_id', customerProfile.id);

      if (!error && data) {
        // Enriquecer com os dados da profissional e formatar a última mensagem
        const enriched = await Promise.all(data.map(async (conv: any, index: number) => {
          const { data: pro } = await supabase
            .from('professional_profiles')
            .select('user_profile_id, user_profiles(full_name, avatar_url)')
            .eq('id', conv.professional_profile_id)
            .single();

          // Ignorar se user_profiles for array ou nulo
          const proProfile = Array.isArray(pro?.user_profiles) ? pro?.user_profiles[0] : pro?.user_profiles;
          const name = proProfile?.full_name || 'Profissional';
          const msgs = conv.messages || [];
          const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
          const avatarColors = ['#2BA89A', '#4A9EE5', '#8B6FE5', '#E5A234', '#E56B8A'];

          return {
            id: conv.id,
            name: name,
            initial: name.charAt(0).toUpperCase(),
            color: avatarColors[index % avatarColors.length],
            avatarUrl: proProfile?.avatar_url || null,
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
        <p className={styles.subtitle}>Suas conversas com profissionais.</p>
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
