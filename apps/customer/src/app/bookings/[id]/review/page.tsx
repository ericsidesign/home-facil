'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, ChevronLeft } from 'lucide-react';
import styles from './review.module.css';

const QUICK_TAGS = ['Pontual', 'Detalhista', 'Educada', 'Eficiente', 'Recomendo', 'Caprichosa'];

export default function ReviewPage() {
  const [rating, setRating] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const toggleTag = (tag: string) => {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  if (submitted) {
    return (
      <div className={styles.container}>
        <div className={styles.successScreen}>
          <div className={styles.successIcon}>🎉</div>
          <h1 className={styles.successTitle}>Obrigado!</h1>
          <p className={styles.successSub}>Sua avaliação ajuda a melhorar nossos serviços.</p>
          <Link href="/" className="btn-primary" style={{ textDecoration: 'none', marginTop: '1.5rem' }}>
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/bookings" className={styles.backBtn}><ChevronLeft size={24} /></Link>
        <span className={styles.headerTitle}>Avaliar serviço</span>
        <div style={{ width: 24 }} />
      </header>

      <div className={styles.content}>
        {/* Pro Info */}
        <div className={styles.proInfo}>
          <div className={styles.proAvatar}>C</div>
          <h2 className={styles.proName}>Camila Santos</h2>
          <p className={styles.serviceInfo}>Faxina Pesada · Hoje</p>
        </div>

        {/* Star Rating */}
        <div className={styles.starsSection}>
          <p className={styles.starsLabel}>Como foi o serviço?</p>
          <div className={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} className={styles.starBtn} onClick={() => setRating(s)} aria-label={`${s} estrelas`}>
                <Star size={36} fill={s <= rating ? '#F59E0B' : 'none'} color={s <= rating ? '#F59E0B' : '#CBD5E1'} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>

        {/* Quick Tags */}
        {rating > 0 && (
          <div className={styles.tagsSection}>
            <p className={styles.tagsLabel}>O que mais gostou?</p>
            <div className={styles.tagsGrid}>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  className={`${styles.tag} ${tags.includes(tag) ? styles.tagActive : ''}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        {rating > 0 && (
          <div className={styles.commentSection}>
            <textarea
              className={styles.commentInput}
              placeholder="Deixe um comentário (opcional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
        )}
      </div>

      {/* Submit */}
      {rating > 0 && (
        <div className={styles.ctaBar}>
          <button className="btn-primary" onClick={() => setSubmitted(true)}>
            Enviar avaliação
          </button>
        </div>
      )}
    </div>
  );
}
