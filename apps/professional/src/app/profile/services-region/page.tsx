'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Briefcase, MapPin, Check, Save, Loader2 } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function ServicesRegionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  
  // Data Options
  const [availableServices, setAvailableServices] = useState<any[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setErrorMsg('');
      const supabase = createClient();

      try {
        // 1. Check user auth & professional profile
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado.');

        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (!userProfile) throw new Error('Perfil de usuário não encontrado.');

        const { data: proProfile } = await supabase
          .from('professional_profiles')
          .select('id')
          .eq('user_profile_id', userProfile.id)
          .single();

        if (!proProfile) throw new Error('Perfil profissional não encontrado.');
        setProfileId(proProfile.id);

        // 2. Fetch available services from global table
        const { data: allServices, error: sError } = await supabase
          .from('services')
          .select('id, name, description, service_categories(name)')
          .eq('is_active', true);
          
        if (!sError && allServices) {
          setAvailableServices(allServices);
        } else {
          // If the tables don't exist yet, we can fallback or handle it gracefully
          throw new Error('As tabelas de serviços não estão disponíveis. Por favor, execute o script SQL no Supabase.');
        }

        // 3. Fetch professional's currently selected services
        const { data: profServices } = await supabase
          .from('professional_services')
          .select('service_id')
          .eq('professional_profile_id', proProfile.id)
          .eq('is_active', true);
          
        if (profServices) {
          setSelectedServices(profServices.map(ps => ps.service_id));
        }

        // 4. Fetch professional's service area
        const { data: area } = await supabase
          .from('service_areas')
          .select('city, state')
          .eq('professional_profile_id', proProfile.id)
          .maybeSingle();

        if (area) {
          setCity(area.city || '');
          setStateCode(area.state || '');
        }

      } catch (err: any) {
        console.error(err);
        setErrorMsg(err.message || 'Ocorreu um erro ao carregar os dados.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSave = async () => {
    if (!profileId) return;
    if (!city.trim() || !stateCode.trim()) {
      setErrorMsg('Por favor, preencha a cidade e o estado.');
      return;
    }
    if (stateCode.length !== 2) {
      setErrorMsg('O estado deve ter exatamente 2 letras (Ex: SP).');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    const supabase = createClient();

    try {
      // 1. Upsert Service Area
      // First, check if one exists
      const { data: existingArea } = await supabase
        .from('service_areas')
        .select('id')
        .eq('professional_profile_id', profileId)
        .maybeSingle();

      if (existingArea) {
        const { error: updErr } = await supabase
          .from('service_areas')
          .update({ city: city.trim(), state: stateCode.toUpperCase() })
          .eq('id', existingArea.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from('service_areas')
          .insert({
            professional_profile_id: profileId,
            city: city.trim(),
            state: stateCode.toUpperCase()
          });
        if (insErr) throw insErr;
      }

      // 2. Update Services
      // Simplest approach: delete all current and insert new ones
      const { error: delErr } = await supabase
        .from('professional_services')
        .delete()
        .eq('professional_profile_id', profileId);
      if (delErr) throw delErr;

      if (selectedServices.length > 0) {
        const inserts = selectedServices.map(id => ({
          professional_profile_id: profileId,
          service_id: id,
          is_active: true
        }));
        const { error: srvErr } = await supabase.from('professional_services').insert(inserts);
        if (srvErr) throw srvErr;
      }

      setSuccessMsg('Dados salvos com sucesso!');
      
      // Go back after 1.5s
      setTimeout(() => {
        router.push('/profile');
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocorreu um erro ao salvar os dados.');
    } finally {
      setIsSaving(false);
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
            <h1 className={styles.title}>Serviços e Região</h1>
            <p className={styles.subtitle}>Configure onde e no que você trabalha</p>
          </div>
        </div>
      </header>

      <main className={styles.content}>
        
        {errorMsg && (
          <div style={{ padding: '12px', background: '#FEE2E2', color: '#B91C1C', borderRadius: '12px', fontSize: '0.875rem' }}>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '12px', background: '#D1FAE5', color: '#047857', borderRadius: '12px', fontSize: '0.875rem' }}>
            {successMsg}
          </div>
        )}

        {/* Region */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <MapPin size={20} color="var(--brand-500)" />
            <h2>Região de Atuação</h2>
          </div>
          <p className={styles.cardText}>
            Informe a cidade principal onde você atende os clientes.
          </p>
          
          <div className={styles.row}>
            <div className={styles.formGroup} style={{ flex: 2 }}>
              <label className={styles.label}>Cidade</label>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="Ex: São Paulo" 
                value={city}
                onChange={e => setCity(e.target.value)}
              />
            </div>
            <div className={styles.formGroup} style={{ flex: 1 }}>
              <label className={styles.label}>Estado</label>
              <input 
                type="text" 
                className={styles.input} 
                placeholder="Ex: SP" 
                maxLength={2}
                value={stateCode}
                onChange={e => setStateCode(e.target.value)}
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>
        </section>

        {/* Services */}
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <Briefcase size={20} color="var(--brand-500)" />
            <h2>Serviços Oferecidos</h2>
          </div>
          <p className={styles.cardText}>
            Selecione todos os tipos de limpeza que você está disposta a realizar.
          </p>
          
          <div className={styles.serviceList}>
            {availableServices.length > 0 ? (
              availableServices.map(service => {
                const isActive = selectedServices.includes(service.id);
                return (
                  <div 
                    key={service.id} 
                    className={`${styles.serviceItem} ${isActive ? styles.active : ''}`}
                    onClick={() => toggleService(service.id)}
                  >
                    <div className={styles.checkbox}>
                      {isActive && <Check size={14} color="white" />}
                    </div>
                    <div className={styles.serviceInfo}>
                      <span className={styles.serviceName}>{service.name}</span>
                      {service.description && (
                        <span className={styles.serviceDesc}>{service.description}</span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>Nenhum serviço disponível no momento.</p>
            )}
          </div>
        </section>

        <button 
          className={styles.button} 
          onClick={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? <Loader2 size={20} className={styles.spin} /> : <Save size={20} />}
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>

      </main>
    </div>
  );
}
