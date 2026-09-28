'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AddressForm } from '@/components/forms/AddressForm';
import styles from './page.module.css';

export default function ProfessionalAddressPage() {
  const router = useRouter();
  const [address, setAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAddress = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
      
      if (profile) {
        const { data } = await supabase
          .from('addresses')
          .select('*')
          .eq('user_profile_id', profile.id)
          .is('deleted_at', null)
          .order('is_primary', { ascending: false })
          .limit(1)
          .single();
        
        if (data) setAddress(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAddress();
  }, []);

  const handleSuccess = () => {
    setShowForm(false);
    fetchAddress();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover seu Endereço Base?')) return;
    const supabase = createClient();
    await supabase
      .from('addresses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    setAddress(null);
    fetchAddress();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ChevronLeft size={28} />
        </button>
        <div className={styles.headerTitle}>Meu Endereço Base</div>
        <div style={{ width: 28 }} />
      </header>

      <main className={styles.content}>
        {showForm ? (
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--ink)' }}>
              Cadastrar Endereço Base
            </h2>
            <AddressForm onSuccess={handleSuccess} />
            <button 
              onClick={() => setShowForm(false)}
              style={{ marginTop: 'var(--space-4)', width: '100%', padding: 'var(--space-3)', background: 'none', border: 'none', color: 'var(--ink-light)', fontWeight: 600 }}
            >
              Cancelar
            </button>
          </div>
        ) : (
          <>
            {loading ? (
              <div className={styles.emptyState}>Carregando endereço...</div>
            ) : !address ? (
              <div className={styles.emptyState}>
                <MapPin size={48} style={{ opacity: 0.2, margin: '0 auto var(--space-4)' }} />
                <p>Você ainda não definiu o seu endereço base.</p>
                <p style={{ fontSize: '0.875rem', marginTop: 'var(--space-2)' }}>Ele é usado para calcular a distância até as faxinas.</p>
              </div>
            ) : (
              <div className={styles.addressList}>
                <div className={styles.addressCard}>
                  <MapPin size={24} className={styles.addressIcon} />
                  <div className={styles.addressInfo}>
                    <div className={styles.addressLabel}>
                      {address.label}
                      <span className={styles.primaryBadge}>Endereço Base</span>
                    </div>
                    <div className={styles.addressText}>
                      {address.street}, {address.number}
                      {address.complement && ` - ${address.complement}`}
                      <br />
                      {address.neighborhood} - {address.city}/{address.state}
                      <br />
                      CEP: {address.zip_code}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(address.id)} 
                    style={{ background: 'none', border: 'none', color: 'var(--error)', padding: '0.5rem', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                    title="Excluir Endereço"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            )}

            {!showForm && (
              <button className={styles.addBtn} onClick={() => setShowForm(true)}>
                <Plus size={20} />
                {address ? 'Alterar Endereço Base' : 'Cadastrar Endereço Base'}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
