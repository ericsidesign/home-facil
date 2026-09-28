'use client';

import React, { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { stateNameToUF } from '@/utils/states';
import styles from './AddressForm.module.css';

interface AddressFormProps {
  onSuccess?: () => void;
}

export function AddressForm({ onSuccess }: AddressFormProps) {
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [form, setForm] = useState({
    label: 'Casa',
    zip_code: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
    latitude: '',
    longitude: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  const handleCEPBlur = async () => {
    const cep = form.zip_code.replace(/\D/g, '');
    if (cep.length === 8) {
      setLoadingCEP(true);
      setErrorMsg('');
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setForm((prev) => ({
            ...prev,
            street: data.logradouro,
            neighborhood: data.bairro,
            city: data.localidade,
            state: data.uf,
          }));
        }
      } catch (err) {
        console.error('Erro ao buscar CEP', err);
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const handleGPS = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Seu navegador não suporta geolocalização.');
      return;
    }

    setLoadingGPS(true);
    setErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setForm((prev) => ({ ...prev, latitude: String(latitude), longitude: String(longitude) }));

        // Reverse Geocoding usando Nominatim (OpenStreetMap)
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          if (data && data.address) {
            const stateRaw = data.address.state || prev.state;
            const uf = stateNameToUF[stateRaw] || stateRaw; // Converte "Amazonas" para "AM"
            
            setForm((prev) => ({
              ...prev,
              street: data.address.road || prev.street,
              neighborhood: data.address.suburb || data.address.neighbourhood || prev.neighborhood,
              city: data.address.city || data.address.town || data.address.village || prev.city,
              state: uf.substring(0, 2).toUpperCase(),
              zip_code: data.address.postcode || prev.zip_code,
            }));
          }
        } catch (err) {
          console.error('Erro no reverse geocoding', err);
        } finally {
          setLoadingGPS(false);
        }
      },
      (error) => {
        setErrorMsg('Não foi possível obter sua localização.');
        setLoadingGPS(false);
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSubmit(true);
    setErrorMsg('');
    setSuccessMsg('');

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setErrorMsg('Você precisa estar logado!');
      setLoadingSubmit(false);
      return;
    }

    // Obter o user_profile_id usando o auth_user_id
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (profileErr || !profile) {
      setErrorMsg(`Perfil não encontrado. Erro: ${profileErr?.message || 'Desconhecido'}`);
      setLoadingSubmit(false);
      return;
    }

    const { error } = await supabase.from('addresses').insert({
      user_profile_id: profile.id,
      label: form.label,
      zip_code: form.zip_code,
      street: form.street,
      number: form.number,
      complement: form.complement,
      neighborhood: form.neighborhood,
      city: form.city,
      state: form.state,
      latitude: form.latitude ? parseFloat(form.latitude) : null,
      longitude: form.longitude ? parseFloat(form.longitude) : null,
      is_primary: true, // Força esse como principal ao cadastrar
    });

    if (error) {
      console.error(error);
      setErrorMsg(`Erro ao salvar endereço no banco: ${error.message}`);
    } else {
      setSuccessMsg('Endereço salvo com sucesso!');
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    }
    setLoadingSubmit(false);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      {errorMsg && (
        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--error-light)', color: 'var(--error)', borderRadius: 'var(--radius-button)', fontWeight: 600, fontSize: '0.875rem' }}>
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: 'var(--space-3)', backgroundColor: 'var(--success-light)', color: 'var(--success)', borderRadius: 'var(--radius-button)', fontWeight: 600, fontSize: '0.875rem' }}>
          {successMsg}
        </div>
      )}
      <button
        type="button"
        className={styles.gpsBtn}
        onClick={handleGPS}
        disabled={loadingGPS}
      >
        <MapPin size={20} />
        {loadingGPS ? 'Buscando...' : 'Usar minha localização atual'}
      </button>

      <div className={styles.divider}>ou preencha manualmente</div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Apelido do Endereço</label>
        <input
          type="text"
          name="label"
          className={styles.input}
          placeholder="Ex: Casa, Escritório"
          value={form.label}
          onChange={handleChange}
          required
        />
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>CEP</label>
          <input
            type="text"
            name="zip_code"
            className={styles.input}
            placeholder="00000-000"
            value={form.zip_code}
            onChange={handleChange}
            onBlur={handleCEPBlur}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Estado (UF)</label>
          <input
            type="text"
            name="state"
            className={styles.input}
            placeholder="SP"
            maxLength={2}
            value={form.state}
            onChange={handleChange}
            disabled={loadingCEP || loadingGPS}
            required
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Rua</label>
        <input
          type="text"
          name="street"
          className={styles.input}
          placeholder="Nome da rua"
          value={form.street}
          onChange={handleChange}
          disabled={loadingCEP || loadingGPS}
          required
        />
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Número</label>
          <input
            type="text"
            name="number"
            className={styles.input}
            placeholder="123"
            value={form.number}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Complemento</label>
          <input
            type="text"
            name="complement"
            className={styles.input}
            placeholder="Apt 42"
            value={form.complement}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Bairro</label>
          <input
            type="text"
            name="neighborhood"
            className={styles.input}
            placeholder="Centro"
            value={form.neighborhood}
            onChange={handleChange}
            disabled={loadingCEP || loadingGPS}
            required
          />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Cidade</label>
          <input
            type="text"
            name="city"
            className={styles.input}
            placeholder="São Paulo"
            value={form.city}
            onChange={handleChange}
            disabled={loadingCEP || loadingGPS}
            required
          />
        </div>
      </div>

      <button type="submit" className={styles.submitBtn} disabled={loadingSubmit}>
        {loadingSubmit ? 'Salvando...' : 'Salvar Endereço'}
      </button>
    </form>
  );
}
