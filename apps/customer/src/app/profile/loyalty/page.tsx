'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Gift, Star, CheckCircle, Sparkles } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function LoyaltyPage() {
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPoints = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userProfile) {
        const { data: custProfile } = await supabase
          .from('customer_profiles')
          .select('loyalty_points')
          .eq('user_profile_id', userProfile.id)
          .single();

        if (custProfile) {
          setLoyaltyPoints(custProfile.loyalty_points || 0);
        }
      }
      setIsLoading(false);
    };

    loadPoints();
  }, []);

  const MAX_POINTS = 250;
  const progressPercent = Math.min(100, (loyaltyPoints / MAX_POINTS) * 100);
  const pointsRemaining = Math.max(0, MAX_POINTS - loyaltyPoints);

  if (isLoading) {
    return (
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', paddingTop: '100px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #E5E7EB', borderTopColor: 'var(--brand-500)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
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
          <h1 className={styles.title}>HomeFácil Fidelidade</h1>
        </div>
      </header>

      <main className={styles.content}>
        <div className={styles.pointsCard}>
          <Gift size={32} color="var(--brand-500)" />
          <div style={{ textAlign: 'center' }}>
            <div className={styles.pointsNumber}>{loyaltyPoints}</div>
            <div className={styles.pointsLabel}>Seus Pontos</div>
          </div>

          <div className={styles.progressBarContainer}>
            <div className={styles.progressBarBg}>
              <div className={styles.progressBarFill} style={{ width: `${progressPercent}%` }} />
            </div>
            <div className={styles.progressText}>
              {loyaltyPoints >= MAX_POINTS 
                ? 'Parabéns! Você já pode resgatar uma limpeza grátis!' 
                : `Faltam ${pointsRemaining} pontos para sua próxima limpeza grátis.`}
            </div>
          </div>
        </div>

        <section className={styles.infoSection}>
          <h2 className={styles.sectionTitle}>Como funciona?</h2>
          <div className={styles.rulesContainer}>
            <div className={styles.ruleCard}>
              <div className={styles.ruleIcon}>
                <Star size={20} />
              </div>
              <div className={styles.ruleContent}>
                <h3>Ganhe a cada agendamento</h3>
                <p>A cada faxina concluída e paga através do nosso aplicativo, você acumula pontos na sua carteira digital.</p>
              </div>
            </div>

            <div className={styles.ruleCard}>
              <div className={styles.ruleIcon}>
                <CheckCircle size={20} />
              </div>
              <div className={styles.ruleContent}>
                <h3>Valores dos Pontos</h3>
                <p>
                  • <strong>Limpeza Padrão:</strong> ganhe 25 pontos<br/>
                  • <strong>Faxina Pesada:</strong> ganhe 40 pontos<br/>
                  • <strong>Pós-Obra:</strong> ganhe 50 pontos
                </p>
              </div>
            </div>

            <div className={styles.ruleCard}>
              <div className={styles.ruleIcon}>
                <Sparkles size={20} />
              </div>
              <div className={styles.ruleContent}>
                <h3>Resgate sua recompensa</h3>
                <p>Ao atingir <strong>250 pontos</strong>, você ganha 1 voucher de 100% de desconto na contratação de uma Limpeza Padrão com a profissional que desejar.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
