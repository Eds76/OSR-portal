import React from 'react';
import { BookOpen, Skull, Sparkles, Feather } from 'lucide-react';

export default function Dashboard() {
  const articles = [
    {
      title: 'Смерть — это начало новой истории',
      desc: 'В OSR смерть персонажа — не проигрыш игрока, а естественный конец авантюриста, рискнувшего зайти в бездну. Как сделать гибель героя легендарной и не демотивировать команду.',
      readTime: '6 мин',
      date: '04 Июн 2026',
    },
    {
      title: 'Искусство случайных таблиц',
      desc: 'Как уйти от банальных "2d6 гоблинов" к встречам, меняющим ландшафт кампании. Создаем динамические таблицы с фракциями, погодой и странными находками.',
      readTime: '8 мин',
      date: '28 Май 2026',
    },
    {
      title: 'Решения игрока вместо бросков навыков',
      desc: 'Почему отсутствие навыка "Поиск ловушек" делает игру глубже. Как описывать окружение так, чтобы игроки исследовали его своим разумом, а не кубиками.',
      readTime: '5 мин',
      date: '15 Май 2026',
    },
  ];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Святилище Старой Школы</h1>
        <p className="page-subtitle">"Здесь золото платится кровью, а факелы светят ярче надежды"</p>
      </div>

      {/* Hero-баннер */}
      <div className="osr-card" style={{ padding: '0', marginBottom: '3rem', border: '1px solid var(--gold-dark)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'relative', height: '320px', overflow: 'hidden', backgroundColor: '#000' }}>
          <img 
            src={`${import.meta.env.BASE_URL}osr_hero_banner.png`} 
            alt="OSR Dungeon Art" 
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: '0.6', mixBlendMode: 'luminosity' }}
          />
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            background: 'linear-gradient(to top, rgba(10, 10, 12, 1) 0%, rgba(10, 10, 12, 0.4) 60%, transparent 100%)',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'end'
          }}>
            <span style={{ color: 'var(--gold-accent)', textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '0.8rem', fontWeight: 'bold' }}>
              Философия OSR
            </span>
            <h2 style={{ fontSize: '2rem', fontFamily: 'var(--font-fancy)', margin: '0.5rem 0', color: 'var(--gold-bright)', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              Свод Законов Подземелья
            </h2>
          </div>
        </div>
        <div style={{ padding: '2rem', borderTop: '1px solid var(--border-gold)' }}>
          <p style={{ fontStyle: 'italic', fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
            «OSR — это не ностальгия по плохому дизайну 70-х. Это стремление к играм, где выбор игрока имеет значение, мир безразличен к силе героев, а выживание — это заслуга, а не гарантированный сюжетный рельс».
          </p>
        </div>
      </div>

      {/* Манифест OSR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
        <div className="osr-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Skull size={28} style={{ color: 'var(--blood-red)', filter: 'drop-shadow(0 0 5px var(--blood-red))' }} />
            <h3>Высокие ставки</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            Мир смертоносен. Монстры не подстраиваются под уровень партии. Бегство — часто лучшее решение, а умный обход препятствий ценится выше, чем лобовой штурм.
          </p>
        </div>

        <div className="osr-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Sparkles size={28} style={{ color: 'var(--gold-accent)', filter: 'drop-shadow(var(--glow-gold))' }} />
            <h3>Находчивость игрока</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            У вашего персонажа нет кнопки "Найти скрытый проход". Опишите, как вы простукиваете стены шестом, заглядываете под ковры или проверяете тягу воздуха, чтобы найти тайник.
          </p>
        </div>

        <div className="osr-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <Feather size={28} style={{ color: 'var(--gold-accent)' }} />
            <h3>Правила — инструменты, а не законы</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            "Rulings, not Rules" (Решения ведущего вместо строгих правил). Мастер адаптирует логику мира под конкретные ситуации, делая игровой процесс гибким и живым.
          </p>
        </div>
      </div>

      {/* Разделитель */}
      <div className="osr-divider">
        <BookOpen className="osr-divider-icon" size={24} />
      </div>

      {/* Список статей */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontFamily: 'var(--font-title)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <BookOpen style={{ color: 'var(--gold-accent)' }} /> Последние свитки знаний
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {articles.map((art, idx) => (
            <div key={idx} className="osr-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 style={{ color: 'var(--gold-accent)', fontSize: '1.3rem' }}>{art.title}</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{art.date} • {art.readTime} чтения</span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>{art.desc}</p>
              <div style={{ marginTop: '0.5rem' }}>
                <a href="#read" onClick={(e) => e.preventDefault()} style={{ fontSize: '0.95rem', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  Развернуть свиток →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
