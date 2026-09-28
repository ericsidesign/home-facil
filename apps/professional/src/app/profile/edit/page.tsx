'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Camera, Loader2, Save, Trash2, Plus } from 'lucide-react';
import styles from '../profile.module.css';
import { createClient } from '@/lib/supabase/client';

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfileId, setUserProfileId] = useState('');
  const [proProfileId, setProProfileId] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [experience, setExperience] = useState('');
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: up } = await supabase
        .from('user_profiles')
        .select('id, full_name, avatar_url')
        .eq('auth_user_id', user.id)
        .single();

      if (up) {
        setUserProfileId(up.id);
        setFullName(up.full_name || '');
        setAvatarUrl(up.avatar_url || '');

        const { data: pp } = await supabase
          .from('professional_profiles')
          .select('id, bio, experience_description, portfolio_urls')
          .eq('user_profile_id', up.id)
          .single();

        if (pp) {
          setProProfileId(pp.id);
          setBio(pp.bio || '');
          setExperience(pp.experience_description || '');
          setPortfolioUrls(pp.portfolio_urls || []);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, [router]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const supabase = createClient();
    
    // Simulate upload for now (if bucket not ready)
    // Normally: await supabase.storage.from('avatars').upload(...)
    // Here we use a fake URL or base64 if needed, but assuming bucket is ready:
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${userProfileId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      alert('Erro ao fazer upload da imagem. Certifique-se de que rodou o SQL de Storage.');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(publicUrl);
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const supabase = createClient();
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${proProfileId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('portfolios')
      .upload(filePath, file);

    if (uploadError) {
      alert('Erro ao fazer upload da imagem.');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('portfolios').getPublicUrl(filePath);
      setPortfolioUrls([...portfolioUrls, publicUrl]);
    }
  };

  const removePortfolioImage = (indexToRemove: number) => {
    setPortfolioUrls(portfolioUrls.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSave = async () => {
    if (!avatarUrl) {
      alert('Por favor, adicione uma foto de perfil.');
      return;
    }
    if (!bio || !experience) {
      alert('Por favor, preencha sua biografia e experiência.');
      return;
    }

    setSaving(true);
    const supabase = createClient();

    // Atualiza nome e avatar
    await supabase.from('user_profiles')
      .update({ full_name: fullName, avatar_url: avatarUrl })
      .eq('id', userProfileId);

    // Atualiza bio, experiencia e portfólio
    await supabase.from('professional_profiles')
      .update({ 
        bio, 
        experience_description: experience,
        portfolio_urls: portfolioUrls,
        verification_status: 'APPROVED' // Força aprovado para testes
      })
      .eq('id', proProfileId);

    setSaving(false);
    router.push('/profile');
    router.refresh();
  };

  if (loading) {
    return (
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 className={styles.spinner} size={32} color="var(--brand-500)" />
      </div>
    );
  }

  return (
    <div className={styles.page} style={{ paddingBottom: '100px' }}>
      <header className={styles.header}>
        <Link href="/profile" className={styles.backBtn}><ChevronLeft size={24} /></Link>
        <span className={styles.headerTitle}>Editar Perfil</span>
        <div style={{ width: 24 }} />
      </header>

      <div style={{ padding: '24px 16px' }}>
        
        {/* Foto de Perfil */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div 
            onClick={() => avatarInputRef.current?.click()}
            style={{ 
              width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--bg-secondary)',
              display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', cursor: 'pointer',
              border: '2px dashed var(--brand-500)', position: 'relative'
            }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Camera size={32} color="var(--brand-500)" />
            )}
            <div style={{ position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', fontSize: '10px', textAlign: 'center', padding: '4px 0' }}>Editar</div>
          </div>
          <input type="file" accept="image/*" hidden ref={avatarInputRef} onChange={handleAvatarUpload} />
          <p style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Obrigatório</p>
        </div>

        {/* Informações Básicas */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Nome Completo</label>
          <input 
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', fontSize: '1rem' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Biografia Curta</label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Uma frase chamativa para o seu perfil.</p>
          <input 
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Ex: Amo o que faço! Cuido da sua casa..."
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', fontSize: '1rem' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Experiência</label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Descreva seus serviços e anos de experiência.</p>
          <textarea 
            value={experience}
            onChange={e => setExperience(e.target.value)}
            rows={4}
            placeholder="Ex: Tenho 5 anos de experiência com faxina pesada e limpeza pós-obra..."
            style={{ width: '100%', padding: '14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', fontSize: '1rem', resize: 'vertical' }}
          />
        </div>

        {/* Galeria de Fotos */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, marginBottom: '8px' }}>Portfólio de Trabalhos</label>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Adicione fotos do seu trabalho (Antes e Depois, etc).</p>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {portfolioUrls.map((url, idx) => (
              <div key={idx} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden' }}>
                <img src={url} alt={`Portfolio ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  onClick={() => removePortfolioImage(idx)}
                  style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,0,0,0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            
            <button 
              onClick={() => portfolioInputRef.current?.click()}
              style={{ width: '80px', height: '80px', borderRadius: '8px', border: '2px dashed var(--brand-300)', backgroundColor: 'var(--brand-50)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-500)', cursor: 'pointer' }}
            >
              <Plus size={24} />
              <span style={{ fontSize: '0.7rem', marginTop: '4px' }}>Adicionar</span>
            </button>
            <input type="file" accept="image/*" hidden ref={portfolioInputRef} onChange={handlePortfolioUpload} />
          </div>
        </div>

      </div>

      <div style={{ position: 'fixed', bottom: '65px', left: 0, width: '100%', padding: '16px 24px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderTop: '1px solid var(--border)', zIndex: 10, display: 'flex', justifyContent: 'center' }}>
        <button 
          onClick={handleSave}
          disabled={saving}
          style={{ width: '100%', maxWidth: '500px', background: 'var(--brand-500)', color: 'white', padding: '16px', borderRadius: 'var(--radius-full)', fontWeight: 600, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', border: 'none', boxShadow: '0 4px 12px rgba(43, 168, 154, 0.3)', cursor: 'pointer', transition: 'all 0.2s' }}
        >
          {saving ? <Loader2 className={styles.spinner} size={20} /> : <Save size={20} />}
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </button>
      </div>

    </div>
  );
}
