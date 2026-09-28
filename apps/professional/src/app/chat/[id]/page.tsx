'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, Send, Phone, MoreVertical, Trash2 } from 'lucide-react';
import styles from './chat_detail.module.css';
import { createClient } from '@/lib/supabase/client';

export default function ChatDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState('Cliente');
  const [customerAvatarUrl, setCustomerAvatarUrl] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [chatChannel, setChatChannel] = useState<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    
    const loadChat = async () => {
      // Buscar Detalhes da Conversa
      const { data: conv } = await supabase
        .from('conversations')
        .select('customer_id')
        .eq('id', id)
        .single();
        
      let activeCustomerId = conv?.customer_id;

      if (!conv) {
        const { data: booking } = await supabase
          .from('bookings')
          .select('customer_id, professional_profile_id, professional_id')
          .eq('id', id)
          .single();
          
        if (booking && booking.customer_id) {
          activeCustomerId = booking.customer_id;
          let profProfileIdToUse = booking.professional_profile_id;
          
          if (!profProfileIdToUse && booking.professional_id) {
            const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', booking.professional_id).single();
            if (userProfile) {
              const { data: proProfile } = await supabase.from('professional_profiles').select('id').eq('user_profile_id', userProfile.id).single();
              if (proProfile) profProfileIdToUse = proProfile.id;
            }
          }

          if (profProfileIdToUse) {
            await supabase.from('conversations').insert({
              id: id,
              customer_id: booking.customer_id,
              professional_profile_id: profProfileIdToUse
            });
            await supabase.from('bookings').update({ professional_profile_id: profProfileIdToUse }).eq('id', id);
          }
        }
      }

      if (activeCustomerId) {
        const { data: customer } = await supabase
          .from('customer_profiles')
          .select('user_profile_id, user_profiles(full_name, avatar_url)')
          .eq('id', activeCustomerId)
          .single();
          
        const cust = Array.isArray(customer?.user_profiles) ? customer?.user_profiles[0] : customer?.user_profiles;
        if (cust?.full_name) {
          setCustomerName(cust.full_name);
        }
        if (cust?.avatar_url) {
          setCustomerAvatarUrl(cust.avatar_url);
        }
      }

      // Buscar Mensagens
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true });
        
      if (!error && data) {
        setMessages(data);
        
        // Marcar mensagens recebidas como lidas
        const unreadIds = data.filter((m: any) => !m.is_read && m.sender_type === 'customer').map((m: any) => m.id);
        if (unreadIds.length > 0) {
          await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        }
      }
    };
    
    loadChat();

    // Inscrever-se no Realtime
    const channel = supabase
      .channel(`chat_${id}`, {
        config: { broadcast: { self: false } },
      })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${id}`
        },
        async (payload) => {
          setMessages((prev) => [...prev, payload.new]);
          if (payload.new.sender_type === 'customer') {
            await supabase.from('messages').update({ is_read: true }).eq('id', payload.new.id);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'typing' },
        (payload) => {
          if (payload.payload.sender_type === 'customer') {
            setIsTyping(payload.payload.isTyping);
          }
        }
      )
      .subscribe();
      
    setChatChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    if (chatChannel) {
      chatChannel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { isTyping: true, sender_type: 'professional' },
      });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        chatChannel.send({
          type: 'broadcast',
          event: 'typing',
          payload: { isTyping: false, sender_type: 'professional' },
        });
      }, 2000);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !id) return;
    
    const tempText = message;
    setMessage(''); 
    
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const { error } = await supabase.from('messages').insert({
      conversation_id: id,
      sender_type: 'professional',
      sender_id: user.id,
      content: tempText
    });

    if (error) {
      console.warn('Erro ao salvar mensagem:', error.message);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        sender_type: 'professional',
        content: tempText,
        created_at: new Date().toISOString()
      }]);
    }
  };

  const handleDeleteChat = async () => {
    if (confirm('Tem certeza que deseja apagar esta conversa? Esta ação não pode ser desfeita.')) {
      const supabase = createClient();
      await supabase.from('conversations').delete().eq('id', id);
      router.push('/chat');
    }
  };

  // Função para formatar a data (WhatsApp style)
  const formatDateGroup = (dateString: string) => {
    const msgDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return msgDate.toLocaleDateString('pt-BR');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link href="/chat" className={styles.backBtn}>
            <ChevronLeft size={24} />
          </Link>
          <div className={styles.proInfo}>
            {customerAvatarUrl ? (
              <div className={styles.proAvatar} style={{ backgroundImage: `url(${customerAvatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'transparent', color: 'transparent' }}>
                {customerName.charAt(0).toUpperCase()}
              </div>
            ) : (
              <div className={styles.proAvatar} style={{backgroundColor: '#8B5CF6'}}>
                {customerName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className={styles.proName}>{customerName}</h1>
              <span className={styles.proStatus}>Online agora</span>
            </div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.iconBtn}><Phone size={20} /></button>
          <div style={{ position: 'relative' }}>
            <button className={styles.iconBtn} onClick={() => setShowOptions(!showOptions)}>
              <MoreVertical size={20} />
            </button>
            {showOptions && (
              <div style={{ position: 'absolute', right: 0, top: '100%', background: 'white', borderRadius: '12px', boxShadow: 'var(--shadow-md)', padding: '8px', zIndex: 100, minWidth: '150px' }}>
                <button 
                  onClick={handleDeleteChat}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '10px', background: 'transparent', border: 'none', color: 'var(--error)', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', borderRadius: '8px' }}
                >
                  <Trash2 size={16} /> Apagar conversa
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className={styles.messagesArea}>
        
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', fontSize: '0.85rem', marginTop: '1rem' }}>
            Nenhuma mensagem ainda. Diga olá! 👋
          </div>
        )}

        {messages.map((msg, index) => {
          const isProfessional = msg.sender_type === 'professional';
          const time = new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          
          // Lógica do separador de data
          const currentDateGroup = formatDateGroup(msg.created_at);
          const previousMsg = index > 0 ? messages[index - 1] : null;
          const previousDateGroup = previousMsg ? formatDateGroup(previousMsg.created_at) : null;
          const showDateDivider = currentDateGroup !== previousDateGroup;
          
          return (
            <React.Fragment key={msg.id}>
              {showDateDivider && (
                <div className={styles.dateDivider}>{currentDateGroup}</div>
              )}
              <div className={`${styles.messageWrapper} ${isProfessional ? styles.messageProfessional : styles.messageCustomer}`}>
                <div className={styles.messageBubble}>
                  <p className={styles.messageText}>{msg.content}</p>
                  <span className={styles.messageTime}>{time}</span>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {isTyping && (
          <div className={`${styles.messageWrapper} ${styles.messageCustomer}`}>
            <div className={`${styles.messageBubble} ${styles.messageTyping}`}>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
              <span className={styles.dot}></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form className={styles.inputArea} onSubmit={handleSend}>
        <input 
          type="text" 
          placeholder="Digite uma mensagem..." 
          className={styles.inputField}
          value={message}
          onChange={handleMessageChange}
        />
        <button 
          type="submit" 
          className={styles.sendBtn}
          disabled={!message.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
