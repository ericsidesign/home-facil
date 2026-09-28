'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from '../auth.module.css';

export default function SignupCustomer() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'PROFESSIONAL',
        },
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      // Supabase auto-logins after signup if email confirmation is disabled
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
          <img src="/icon.png" alt="Home Fácil" style={{ height: '64px', width: 'auto' }} />
          <span style={{ fontSize: '0.875rem', fontWeight: 'bold', letterSpacing: '2px', color: '#3B82F6', marginTop: '8px' }}>PRO</span>
        </div>
        <h1 className={styles.title}>Crie sua conta profissional</h1>
        <p className={styles.subtitle}>E comece a receber os melhores serviços</p>
      </header>

      <form className={styles.form} onSubmit={handleSignup}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="name">Nome Completo</label>
          <input
            id="name"
            type="text"
            className={styles.input}
            placeholder="João da Silva"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>

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
            placeholder="No mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        {errorMsg && <div className={styles.errorMsg}>{errorMsg}</div>}

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? 'Criando conta...' : 'Cadastrar'}
        </button>
      </form>

      <div className={styles.footer}>
        Já tem uma conta? <Link href="/login" className={styles.link}>Entrar</Link>
      </div>
    </div>
  );
}
