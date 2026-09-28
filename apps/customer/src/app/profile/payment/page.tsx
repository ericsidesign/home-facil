'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, CreditCard, Plus, Trash2, X, Loader2, Save } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function PaymentPage() {
  const [methods, setMethods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [customerId, setCustomerId] = useState<string | null>(null);

  // Form
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getBrand = (num: string) => {
    const clean = num.replace(/\D/g, '');
    if (clean.startsWith('4')) return 'VISA';
    if (clean.startsWith('5')) return 'MASTERCARD';
    if (clean.startsWith('3')) return 'AMEX';
    if (clean.startsWith('6')) return 'DISCOVER';
    return null;
  };

  const detectedBrand = getBrand(cardNumber);

  const loadMethods = async () => {
    setIsLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userProfile) {
        const { data: custProfile } = await supabase
          .from('customer_profiles')
          .select('id')
          .eq('user_profile_id', userProfile.id)
          .single();

        if (custProfile) {
          setCustomerId(custProfile.id);
          const { data: cards, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('customer_profile_id', custProfile.id)
            .order('created_at', { ascending: false });
            
          if (!error && cards) {
            setMethods(cards);
          }
        }
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadMethods();
  }, []);

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente remover este cartão?')) {
      const supabase = createClient();
      await supabase.from('payment_methods').delete().eq('id', id);
      setMethods(prev => prev.filter(m => m.id !== id));
    }
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const handleSaveCard = async () => {
    if (!customerId) return;
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    if (cleanNumber.length < 15) {
      setErrorMsg('Número de cartão inválido.');
      return;
    }
    if (!cardName || !expiry || !cvv) {
      setErrorMsg('Preencha todos os campos.');
      return;
    }

    const [month, year] = expiry.split('/');
    if (!month || !year) {
      setErrorMsg('Validade inválida (MM/AA).');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    const supabase = createClient();
    
    // Identificar bandeira basica
    let brand = 'Cartão de Crédito';
    if (cleanNumber.startsWith('4')) brand = 'Visa';
    else if (cleanNumber.startsWith('5')) brand = 'Mastercard';
    else if (cleanNumber.startsWith('3')) brand = 'Amex';

    const lastFour = cleanNumber.slice(-4);
    
    // Se for o primeiro, marca como default
    const isDefault = methods.length === 0;

    const { error } = await supabase.from('payment_methods').insert({
      customer_profile_id: customerId,
      card_brand: brand,
      last_four: lastFour,
      expiry_month: parseInt(month),
      expiry_year: parseInt(year),
      cardholder_name: cardName,
      is_default: isDefault
    });

    if (error) {
      console.error(error);
      setErrorMsg('Erro ao salvar cartão.');
      setIsSaving(false);
    } else {
      setIsModalOpen(false);
      setIsSaving(false);
      setCardNumber('');
      setCardName('');
      setExpiry('');
      setCvv('');
      loadMethods();
    }
  };

  if (isLoading) {
    return (
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <Loader2 size={32} className={styles.spin} color="var(--brand-500)" />
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
          <div>
            <h1 className={styles.title}>Pagamento</h1>
            <p className={styles.subtitle}>Gerencie seus cartões e métodos</p>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        {methods.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-sm)', color: 'var(--text-secondary)' }}>
            <CreditCard size={48} color="var(--brand-300)" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Nenhum cartão salvo</p>
            <p style={{ fontSize: '0.875rem' }}>Adicione um método de pagamento para agendar serviços.</p>
          </div>
        ) : (
          methods.map((method) => (
            <div key={method.id} className={`${styles.cardItem} ${method.is_default ? styles.default : ''}`}>
              <div className={styles.cardLeft}>
                <div className={styles.cardIcon}>
                  <CreditCard size={20} />
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.cardTitle}>
                    {method.card_brand} {method.is_default && <span className={styles.defaultBadge}>Principal</span>}
                  </div>
                  <div className={styles.cardDesc}>
                    Final {method.last_four} • Validade {method.expiry_month.toString().padStart(2,'0')}/{method.expiry_year}
                  </div>
                </div>
              </div>
              <button className={styles.deleteBtn} onClick={() => handleDelete(method.id)}>
                <Trash2 size={20} />
              </button>
            </div>
          ))
        )}

        <button className={styles.addBtn} onClick={() => setIsModalOpen(true)}>
          <Plus size={24} />
          Adicionar novo cartão
        </button>
      </main>

      {/* Modal Adicionar Cartão */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Novo Cartão</h2>
              <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            
            {errorMsg && (
              <div style={{ padding: '12px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '12px', fontSize: '0.875rem' }}>
                {errorMsg}
              </div>
            )}

            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label className={styles.label}>Número do Cartão</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="0000 0000 0000 0000" 
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  maxLength={19}
                  style={{ paddingRight: detectedBrand ? '100px' : '16px' }}
                />
                {detectedBrand && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'white',
                    borderRadius: '4px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    {detectedBrand === 'VISA' && (
                      <svg width="36" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="36" height="24" rx="4" fill="#1A1F71"/>
                        <path d="M15.4 17L17.2 6H19.7L17.9 17H15.4ZM27 6.4C26.5 6.2 25.4 6 24.3 6C21.7 6 19.9 7.4 19.9 9.6C19.9 11.2 21.3 12.1 22.4 12.6C23.5 13.1 23.9 13.4 23.9 13.9C23.9 14.6 23.1 14.9 22.2 14.9C20.8 14.9 20 14.5 19.4 14.2L18.9 16.5C19.6 16.8 21.1 17.1 22.5 17.1C25.4 17.1 27.2 15.6 27.2 13.5C27.2 11 24.1 10.9 24.1 9.4C24.1 8.9 24.6 8.3 25.7 8.1C26.2 8 27.1 8 28.1 8.5L27 6.4ZM29.5 17H31.7L29.6 6H27.7C27.1 6 26.6 6.3 26.4 6.9L22.5 17H25L25.5 15.6H28.6L28.9 17H29.5ZM26.2 13.7L27.4 10.2L28.1 13.7H26.2ZM14.1 17L10.3 8.3C10 7.5 9.4 6.8 8.4 6.5L4.4 6V6.9C5.4 7.2 6.5 7.6 7.4 8.2L8.6 17H11.2L16.2 6H13.6L14.1 17Z" fill="white"/>
                      </svg>
                    )}
                    {detectedBrand === 'MASTERCARD' && (
                      <svg width="36" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="36" height="24" rx="4" fill="#F8F9FA"/>
                        <circle cx="14" cy="12" r="6.5" fill="#EA001B"/>
                        <circle cx="22" cy="12" r="6.5" fill="#F79E1B" fillOpacity="0.9"/>
                      </svg>
                    )}
                    {detectedBrand === 'AMEX' && (
                      <svg width="36" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="36" height="24" rx="4" fill="#002663"/>
                        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif">AMEX</text>
                      </svg>
                    )}
                    {detectedBrand === 'DISCOVER' && (
                      <svg width="36" height="24" viewBox="0 0 36 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="36" height="24" rx="4" fill="#FF6000"/>
                        <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="sans-serif">DISCOVER</text>
                      </svg>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Nome no Cartão</label>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="NOME COMO ESTÁ NO CARTÃO" 
                value={cardName}
                onChange={(e) => setCardName(e.target.value.toUpperCase())}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>Validade</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="MM/AA" 
                  value={expiry}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g,'');
                    if (v.length > 2) v = v.substring(0,2) + '/' + v.substring(2,4);
                    setExpiry(v);
                  }}
                  maxLength={5}
                />
              </div>
              <div className={styles.formGroup} style={{ flex: 1 }}>
                <label className={styles.label}>CVV</label>
                <input 
                  type="text" 
                  className={styles.input} 
                  placeholder="123" 
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g,''))}
                  maxLength={4}
                />
              </div>
            </div>

            <button 
              className={styles.saveBtn} 
              onClick={handleSaveCard} 
              disabled={isSaving}
            >
              {isSaving ? <Loader2 size={20} className={styles.spin} /> : <Save size={20} />}
              {isSaving ? 'Salvando...' : 'Salvar Cartão'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
