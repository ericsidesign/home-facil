'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Star, Loader2, MessageSquare } from 'lucide-react';
import styles from './page.module.css';
import { createClient } from '@/lib/supabase/client';

export default function CustomerReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [avgRating, setAvgRating] = useState('5.0');
  const [ratingCount, setRatingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [pageLimit, setPageLimit] = useState(10);

  useEffect(() => {
    const loadReviews = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Fetch user profile
        const { data: userProfile } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (userProfile) {
          // Fetch customer profile stats
          const { data: custProfile } = await supabase
            .from('customer_profiles')
            .select('id, rating_average, rating_count')
            .eq('user_profile_id', userProfile.id)
            .single();

          if (custProfile) {
            setAvgRating(custProfile.rating_average ? Number(custProfile.rating_average).toFixed(1) : '5.0');
            setRatingCount(custProfile.rating_count || 0);

            // Fetch actual reviews
            const { data: reviewsData, error } = await supabase
              .from('customer_reviews')
              .select(`
                id,
                rating,
                comment,
                created_at,
                professional_profiles (
                  user_profiles (
                    full_name
                  )
                )
              `)
              .eq('customer_profile_id', custProfile.id)
              .order('created_at', { ascending: false })
              .limit(pageLimit);

            if (!error && reviewsData) {
              setReviews(reviewsData.map(r => {
                const proProfile = Array.isArray(r.professional_profiles) ? r.professional_profiles[0] : r.professional_profiles;
                const userProf = Array.isArray(proProfile?.user_profiles) ? proProfile?.user_profiles[0] : proProfile?.user_profiles;
                return {
                  id: r.id,
                  rating: r.rating,
                  comment: r.comment,
                  date: new Date(r.created_at).toLocaleDateString('pt-BR'),
                  professionalName: userProf?.full_name || 'Profissional'
                };
              }));
            }
          }
        }
      }
      setIsLoading(false);
    };

    loadReviews();
  }, [pageLimit]);

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
            <h1 className={styles.title}>Minhas Avaliações</h1>
            <p className={styles.subtitle}>O que as profissionais dizem sobre você</p>
          </div>
        </div>
        {/* Hero inside Header */}
        <div className={styles.avgHero}>
          <div className={styles.avgNumber}>{avgRating}</div>
          <div className={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                size={20} 
                fill={star <= Math.round(Number(avgRating)) ? '#F59E0B' : 'transparent'} 
                color={star <= Math.round(Number(avgRating)) ? '#F59E0B' : 'rgba(0,0,0,0.1)'} 
              />
            ))}
          </div>
          <div className={styles.avgDesc}>Baseado em {ratingCount} avaliaç{ratingCount === 1 ? 'ão' : 'ões'}</div>
        </div>
      </header>

      <main className={styles.content}>


        <div className={styles.reviewsList}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '8px' }}>
            Histórico de Avaliações
          </h3>
          
          {reviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', background: 'white', borderRadius: '16px', color: 'var(--text-tertiary)' }}>
              <MessageSquare size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
              <p>Nenhuma avaliação recebida ainda.</p>
            </div>
          ) : (
            <div className={styles.reviewsContainer}>
              {reviews.map((review) => (
                <div key={review.id} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <div className={styles.reviewerInfo}>
                      <div className={styles.avatar}>
                        {review.professionalName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className={styles.reviewerName}>{review.professionalName}</div>
                        <div className={styles.reviewDate}>{review.date}</div>
                      </div>
                    </div>
                    <div className={styles.reviewRating}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          size={14} 
                          fill={star <= review.rating ? '#F59E0B' : 'transparent'} 
                          color={star <= review.rating ? '#F59E0B' : '#CBD5E1'} 
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <div className={styles.reviewComment}>
                      &quot;{review.comment}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {reviews.length > 0 && reviews.length < ratingCount && (
            <button 
              onClick={() => setPageLimit(prev => prev + 10)}
              style={{
                background: 'white',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                padding: '12px',
                borderRadius: '12px',
                fontWeight: 600,
                marginTop: '8px',
                cursor: 'pointer'
              }}
            >
              Carregar mais avaliações
            </button>
          )}
        </div>

      </main>
    </div>
  );
}
