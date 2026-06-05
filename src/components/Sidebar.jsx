import React from 'react';
import { Shield, BookOpen, Dices, Compass, Flame } from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'hub', label: 'Святилище', icon: Compass, subtitle: 'Главная обитель' },
    { id: 'rules', label: 'Кодекс', icon: BookOpen, subtitle: 'Свод правил' },
    { id: 'generators', label: 'Кузня', icon: Dices, subtitle: 'Генераторы OSR' },
    { id: 'vtt', label: 'Чертог VTT', icon: Shield, subtitle: 'Игровой стол' },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">Пепел & Золото</div>
        <div className="sidebar-subtitle">OSR Портал & VTT</div>
        <div style={{ display: 'flex', gap: '4px', marginTop: '0.5rem' }}>
          <Flame size={14} className="gold-accent" style={{ animation: 'torch-flicker 2s infinite alternate', color: 'var(--gold-accent)' }} />
          <Flame size={14} className="gold-accent" style={{ animation: 'torch-flicker 3s infinite alternate-reverse', color: 'var(--gold-accent)' }} />
          <Flame size={14} className="gold-accent" style={{ animation: 'torch-flicker 1.5s infinite alternate', color: 'var(--gold-accent)' }} />
        </div>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <div
              key={item.id}
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={20} style={{ color: isActive ? 'var(--gold-bright)' : 'var(--text-secondary)' }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>{item.label}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'normal', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {item.subtitle}
                </span>
              </div>
            </div>
          );
        })}
      </nav>
      
      <div className="sidebar-footer">
        <div>Версия 0.1.0 (Прототип)</div>
        <div style={{ marginTop: '4px', fontSize: '0.65rem' }}>Создано для старой школы</div>
      </div>
    </aside>
  );
}
