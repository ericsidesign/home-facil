'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import styles from '../auth.module.css';

export default function LoginCustomer() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo} style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <img src="/icon.png" alt="Home Fácil" style={{ height: '64px', width: 'auto' }} />
        </div>
        <h1 className={styles.title}>Bem-vindo de volta</h1>
        <p className={styles.subtitle}>Acesse sua conta para agendar serviços</p>
      </header>

      <form className={styles.form} onSubmit={handleLogin}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            className={styles.input}
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="password">Senha</label>
          <input
            id="password"
            type="password"
            className={styles.input}
            placeholder="Sua senha secreta"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <div className={styles.footer}>
        Ainda não tem conta? <Link href="/cadastro" className={styles.link}>Cadastre-se</Link>
      </div>
    </div>
  );
}
