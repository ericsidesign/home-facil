'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Grid } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    
    // First, authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError('Credenciais inválidas. Tente novamente.');
      setLoading(false);
      return;
    }

    if (authData.user) {
      // Then, check if the user is an ADMIN in user_profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('auth_user_id', authData.user.id)
        .single();

      if (profileError || !profile || (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN')) {
        // Not an admin. Sign out and show error.
        await supabase.auth.signOut();
        setError('Acesso negado. Esta conta não possui privilégios de administrador.');
        setLoading(false);
        return;
      }

      // Success
      router.push('/dashboard');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <div className={styles.logo}>
          <img src="/logo.png" alt="Home Fácil" style={{ height: '48px', width: 'auto' }} />
        </div>
        
        <h2 className={styles.title}>Porta-Forte Administrativa</h2>
        
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>E-mail Corporativo</label>
            <input 
              type="email" 
              id="email" 
              className={styles.input}
              placeholder="admin@homefacil.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Senha Mestra</label>
            <input 
              type="password" 
              id="password" 
              className={styles.input}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? 'Acessando Sistema...' : 'Entrar no Painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
