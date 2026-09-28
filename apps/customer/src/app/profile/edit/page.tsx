'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Camera, Save, Loader2, User } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // User State
  const [userId, setUserId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();
          
        if (profile) {
          setProfileId(profile.id);
          setFullName(profile.full_name || '');
          setPhone(profile.phone || '');
          setAvatarUrl(profile.avatar_url || null);
        }
      }
      setIsLoading(false);
    };
    
    loadProfile();
  }, []);

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('A imagem deve ter no máximo 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      
      // We will resize the image to save space (since we are saving as base64 for MVP simplicity)
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Export to low quality jpeg
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setAvatarUrl(compressedBase64);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!profileId) return;
    if (!fullName.trim()) {
      setErrorMsg('O nome é obrigatório.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          avatar_url: avatarUrl
        })
        .eq('id', profileId);

      if (error) throw error;

      setSuccessMsg('Perfil salvo com sucesso!');
      setTimeout(() => {
        router.push('/profile');
        router.refresh();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setErrorMsg('Ocorreu um erro ao salvar o perfil.');
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
          <h1 className={styles.title}>Editar Perfil</h1>
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

        <div className={styles.avatarSection}>
          <div className={styles.avatarWrapper} onClick={handlePhotoClick}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Sua foto" className={styles.avatarImg} />
            ) : (
              <User size={40} className={styles.avatarFallback} />
            )}
            <div className={styles.cameraBtn}>
              <Camera size={16} />
            </div>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Toque para alterar a foto
          </p>
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileChange}
            className={styles.hiddenInput}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Nome Completo</label>
          <input 
            type="text" 
            className={styles.input} 
            placeholder="Seu nome completo" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Telefone / WhatsApp</label>
          <input 
            type="tel" 
            className={styles.input} 
            placeholder="(11) 99999-9999" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <button 
          className={styles.button} 
          onClick={handleSave} 
          disabled={isSaving}
        >
          {isSaving ? <Loader2 size={20} className={styles.spin} /> : <Save size={20} />}
          {isSaving ? 'Salvando...' : 'Salvar Perfil'}
        </button>

      </main>
    </div>
  );
}
