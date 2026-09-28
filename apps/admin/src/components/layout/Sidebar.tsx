'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Home, Layers, Settings, Users, FileText, CheckSquare, Grid, Bell, LogOut } from 'lucide-react';
import styles from './Sidebar.module.css';
import { createClient } from '@/lib/supabase/client';

export function Sidebar() {
  const router = useRouter();
  const [adminEmail, setAdminEmail] = useState('admin@homefacil.com');

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setAdminEmail(user.email);
      }
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  };
  const menuItems = [
    { name: 'Dashboard', icon: Home, href: '/dashboard' },
    { 
      name: 'Profissionais', 
      icon: Users, 
      href: '/dashboard/professionals',
      children: [
        { name: 'Todos', href: '/dashboard/professionals' },
        { name: 'Fila de Verificação', href: '/dashboard/verifications' },
      ]
    },
    { name: 'Clientes', icon: Users, href: '/dashboard/customers' },
    { 
      name: 'Catálogo', 
      icon: Layers, 
      href: '/dashboard/catalog',
      children: [
        { name: 'Categorias', href: '/dashboard/catalog/categories' },
        { name: 'Serviços', href: '/dashboard/catalog/services' },
        { name: 'Adicionais', href: '/dashboard/catalog/addons' },
      ]
    },
    { name: 'Agendamentos', icon: CheckSquare, href: '/dashboard/bookings' },
    { 
      name: 'Financeiro', 
      icon: FileText, 
      href: '/dashboard/payouts',
      children: [
        { name: 'Pedidos de Saque', href: '/dashboard/payouts' }
      ]
    },
    { name: 'Relatórios', icon: FileText, href: '/dashboard/reports' },
    { name: 'Notificações', icon: Bell, href: '/dashboard/notifications' },
    { name: 'Configurações', icon: Settings, href: '/dashboard/settings' },
  ];

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <img src="/logo.png" alt="Home Fácil Admin" style={{ height: '32px', width: 'auto' }} />
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item, index) => (
          <div key={index} className={styles.menuGroup}>
            <Link href={item.href} className={styles.menuItem}>
              <item.icon size={20} className={styles.icon} />
              <span>{item.name}</span>
            </Link>
            {item.children && (
              <div className={styles.submenu}>
                {item.children.map((child, childIndex) => (
                  <Link key={childIndex} href={child.href} className={styles.submenuItem}>
                    {child.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userProfile}>
          <div className={styles.avatar}>A</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>Administrador</span>
            <span className={styles.userRole}>{adminEmail}</span>
          </div>
        </div>
        <button className={styles.logoutBtn} onClick={handleLogout} title="Sair">
          <LogOut size={20} />
        </button>
      </div>
    </aside>
  );
}
