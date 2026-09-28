'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Wallet, Landmark, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from '../subpage.module.css';
import { createClient } from '@/lib/supabase/client';

export default function BankPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  
  // States do formulário
  const [hasAccount, setHasAccount] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [bankName, setBankName] = useState('');
  const [agency, setAgency] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('CHECKING');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState('CPF');
  const [documentNumber, setDocumentNumber] = useState('');
  
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchBankData();
  }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBankData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase.from('user_profiles').select('id').eq('auth_user_id', user.id).single();
      if (!userProfile) return;

      const { data: profile } = await supabase.from('professional_profiles').select('id').eq('user_profile_id', userProfile.id).single();
      if (!profile) return;
      
      setProfileId(profile.id);

      const { data: bankData } = await supabase
        .from('professional_bank_accounts')
        .select('*')
        .eq('professional_profile_id', profile.id)
        .single();

      if (bankData) {
        setHasAccount(true);
        setBankName(bankData.bank_name || '');
        setAgency(bankData.agency || '');
        setAccountNumber(bankData.account_number || '');
        setAccountType(bankData.account_type || 'CHECKING');
        setPixKey(bankData.pix_key || '');
        setPixKeyType(bankData.pix_key_type || 'CPF');
        setDocumentNumber(bankData.document_number || '');
      } else {
        setIsEditing(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileId) return;

    setSaving(true);
    const supabase = createClient();

    const payload = {
      professional_profile_id: profileId,
      bank_name: bankName,
      agency,
      account_number: accountNumber,
      account_type: accountType,
      pix_key: pixKey,
      pix_key_type: pixKeyType,
      document_number: documentNumber
    };

    try {
      if (hasAccount) {
        const { error } = await supabase
          .from('professional_bank_accounts')
          .update(payload)
          .eq('professional_profile_id', profileId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('professional_bank_accounts')
          .insert([payload]);
        if (error) throw error;
        setHasAccount(true);
      }
      setIsEditing(false);
      showToast('Dados bancários salvos com sucesso!', 'success');
    } catch (error: any) {
      console.error(error);
      showToast('Erro ao salvar os dados. Verifique as informações.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <Link href="/profile" className={styles.backBtn}>
            <ChevronLeft size={24} />
          </Link>
          <h1 className={styles.title}>Dados bancários</h1>
        </div>
        <p className={styles.subtitle}>Gerencie como você recebe seus pagamentos.</p>
      </header>

      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: toast.type === 'success' ? 'var(--success)' : 'var(--error)',
          color: 'white', padding: '12px 24px', borderRadius: 'var(--radius-full)',
          boxShadow: 'var(--shadow-lg)', fontSize: '0.875rem', fontWeight: 600, zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '8px', animation: 'slideDown 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {toast.message}
        </div>
      )}

      <div className={styles.content}>
        {loading ? (
          <p style={{ textAlign: 'center', padding: '20px' }}>Carregando dados...</p>
        ) : (
          <>
            {/* Saldo Mockado para MVP */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <Wallet size={20} color="var(--brand-500)" /> Saldo Disponível
              </div>
              <span className={styles.valueLarge}>R$ 0,00</span>
              <p className={styles.cardText} style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                Os saques estarão disponíveis quando você concluir sua primeira faxina.
              </p>
            </div>

            <div className={styles.card}>
              <div className={styles.cardHeader} style={{ justifyContent: 'space-between', display: 'flex' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Landmark size={20} color="var(--brand-500)" /> Conta Cadastrada
                </div>
                {hasAccount && !isEditing && (
                  <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: 'var(--brand-500)', fontWeight: 600, cursor: 'pointer' }}>
                    Editar
                  </button>
                )}
              </div>

              {!isEditing && hasAccount ? (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                  <p><strong>Banco:</strong> {bankName}</p>
                  <p><strong>Agência:</strong> {agency} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Conta:</strong> {accountNumber} ({accountType === 'CHECKING' ? 'Corrente' : 'Poupança'})</p>
                  <p><strong>Chave PIX:</strong> {pixKey} ({pixKeyType})</p>
                  <p><strong>CPF/CNPJ do Titular:</strong> {documentNumber}</p>
                  <div style={{ marginTop: '8px', padding: '12px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', color: 'var(--success)', display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '0.85rem' }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>Conta configurada para receber os repasses automaticamente via PIX.</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSave} style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Nome/Código do Banco</label>
                    <input required value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ex: Nubank (260), Itaú (341)" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Agência</label>
                      <input required value={agency} onChange={e => setAgency(e.target.value)} placeholder="0001" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 2 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Número da Conta</label>
                      <input required value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="1234567-8" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipo de Conta</label>
                    <select value={accountType} onChange={e => setAccountType(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                      <option value="CHECKING">Conta Corrente</option>
                      <option value="SAVINGS">Conta Poupança</option>
                    </select>
                  </div>

                  <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '8px 0' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>CPF ou CNPJ do Titular (Obrigatório)</label>
                    <input required value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="Digite apenas números" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>A conta bancária deve pertencer ao mesmo CPF cadastrado no aplicativo.</span>
                  </div>

                  <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Tipo de PIX</label>
                      <select value={pixKeyType} onChange={e => setPixKeyType(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', backgroundColor: 'white' }}>
                        <option value="CPF">CPF/CNPJ</option>
                        <option value="PHONE">Celular</option>
                        <option value="EMAIL">E-mail</option>
                        <option value="RANDOM">Chave Aleatória</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 2 }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Chave PIX</label>
                      <input required value={pixKey} onChange={e => setPixKey(e.target.value)} placeholder="Sua chave PIX" style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)' }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                    {hasAccount && (
                      <button type="button" onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid var(--border-light)', background: 'white', fontWeight: 600, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    )}
                    <button type="submit" disabled={saving} style={{ flex: 2, padding: '14px', borderRadius: '8px', border: 'none', background: 'var(--brand-500)', color: 'white', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      {saving ? 'Salvando...' : <><Save size={18} /> Salvar Dados</>}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
