'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Plus, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AddressForm } from '@/components/forms/AddressForm';
import styles from './page.module.css';

export default function AddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchAddresses = async () => {
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
          .order('is_primary', { ascending: false });
        
        if (data) setAddresses(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSuccess = () => {
    setShowForm(false);
    fetchAddresses();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja remover este endereço?')) return;
    const supabase = createClient();
    await supabase
      .from('addresses')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);
    fetchAddresses();
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button onClick={() => router.back()} className={styles.backBtn}>
          <ChevronLeft size={28} />
        </button>
        <div className={styles.headerTitle}>Meus Endereços</div>
        <div style={{ width: 28 }} />
      </header>

      <main className={styles.content}>
        {showForm ? (
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 'var(--space-4)', color: 'var(--ink)' }}>
              Novo Endereço
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
              <div className={styles.emptyState}>Carregando endereços...</div>
            ) : addresses.length === 0 ? (
              <div className={styles.emptyState}>
                <MapPin size={48} style={{ opacity: 0.2, margin: '0 auto var(--space-4)' }} />
                <p>Você ainda não tem endereços salvos.</p>
              </div>
            ) : (
              <div className={styles.addressList}>
                {addresses.map((addr) => (
                  <div key={addr.id} className={`${styles.addressCard} ${addr.is_primary ? styles.primary : ''}`}>
                    <MapPin size={24} className={styles.addressIcon} />
                    <div className={styles.addressInfo}>
                      <div className={styles.addressLabel}>
                        {addr.label}
                        {addr.is_primary && <span className={styles.primaryBadge}>Principal</span>}
                      </div>
                      <div className={styles.addressText}>
                        {addr.street}, {addr.number}
                        {addr.complement && ` - ${addr.complement}`}
                        <br />
                        {addr.neighborhood} - {addr.city}/{addr.state}
                        <br />
                        CEP: {addr.zip_code}
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(addr.id)} 
                      style={{ background: 'none', border: 'none', color: 'var(--error)', padding: '0.5rem', cursor: 'pointer', marginLeft: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }}
                      title="Excluir Endereço"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button className={styles.addBtn} onClick={() => setShowForm(true)}>
              <Plus size={20} />
              Adicionar Novo Endereço
            </button>
          </>
        )}
      </main>
    </div>
  );
}
