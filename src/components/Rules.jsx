import React, { useState } from 'react';
import { Flame, Backpack, Clock, ShieldAlert } from 'lucide-react';

export default function Rules() {
  const [subTab, setSubTab] = useState('turns');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Священный Кодекс</h1>
        <p className="page-subtitle">"Буква закона мертва без духа приключения"</p>
      </div>

      {/* Кнопки переключения подвкладок */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button 
          className={`osr-button ${subTab === 'turns' ? '' : 'danger'}`} 
          style={{ background: subTab === 'turns' ? 'var(--gold-dark)' : '', color: subTab === 'turns' ? '#fff' : '' }}
          onClick={() => setSubTab('turns')}
        >
          <Clock size={16} /> Процедура Хода (Turn)
        </button>
        <button 
          className={`osr-button ${subTab === 'encumbrance' ? '' : 'danger'}`} 
          style={{ background: subTab === 'encumbrance' ? 'var(--gold-dark)' : '', color: subTab === 'encumbrance' ? '#fff' : '' }}
          onClick={() => setSubTab('encumbrance')}
        >
          <Backpack size={16} /> Слоты Нагрузки
        </button>
        <button 
          className={`osr-button ${subTab === 'light' ? '' : 'danger'}`} 
          style={{ background: subTab === 'light' ? 'var(--gold-dark)' : '', color: subTab === 'light' ? '#fff' : '' }}
          onClick={() => setSubTab('light')}
        >
          <Flame size={16} /> Свет и Факелы
        </button>
      </div>

      {/* Пергаментный свиток правил */}
      <div className="scroll-panel">
        {subTab === 'turns' && (
          <div>
            <h2>Исследование подземелий (Dungeon Crawling)</h2>
            <p style={{ marginBottom: '1rem' }}>
              Основной игровой цикл OSR строится вокруг <strong>Ходов исследования (Turns)</strong>. Один ход равен примерно 10 минутам игрового времени. За это время партия может переместиться на базовую скорость (около 120 футов) и тщательно исследовать одну комнату или коридор.
            </p>
            
            <h3 style={{ marginTop: '1.5rem' }}>Цикл Хода (The Dungeon Turn Procedure):</h3>
            <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Заявление действий:</strong> Игроки описывают, куда они двигаются или что исследуют.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Случайные встречи:</strong> Раз в два хода Ведущий бросает <strong>1d6</strong>. При результате <strong>1</strong> происходит случайная встреча с блуждающими монстрами.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Продвижение времени:</strong> Счетчик ходов увеличивается на 1.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Учет ресурсов:</strong> Вычитается прочность факелов/масла. Напоминается о необходимости отдыха (каждые 6 ходов партии нужен 1 ход отдыха, иначе они получат штрафы от утомления).
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Описание исхода:</strong> Ведущий описывает, что игроки видят, слышат или находят по завершении действий.
              </li>
            </ol>

            <div className="osr-rule-box" style={{ background: 'rgba(74, 51, 25, 0.05)', padding: '1rem', borderLeftColor: '#8b5a2b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                <ShieldAlert size={18} style={{ color: '#8b5a2b' }} />
                <span>Закон Старой Школы:</span>
              </div>
              Не тратьте время зря! Каждый лишний ход в подземелье приближает угасание факелов, заставляет героев голодать и увеличивает шанс встретить блуждающую тварь. Скорость и планирование — ваши лучшие друзья.
            </div>
          </div>
        )}

        {subTab === 'encumbrance' && (
          <div>
            <h2>Система нагрузки по слотам (Slot Encumbrance)</h2>
            <p style={{ marginBottom: '1rem' }}>
              Вместо утомительного подсчета веса в фунтах или килограммах, OSR использует простую и наглядную систему слотов инвентаря.
            </p>

            <h3 style={{ marginTop: '1.5rem' }}>Базовые принципы:</h3>
            <ul style={{ paddingLeft: '1.5rem', marginBottom: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Грузоподъемность:</strong> Персонаж может нести без штрафов количество предметов (слотов), равное его значению <strong>Силы (STR)</strong> (обычно от 8 до 18).
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Размер предметов:</strong>
                <ul style={{ paddingLeft: '1.2rem', marginTop: '0.25rem' }}>
                  <li>Большинство обычных предметов (факел, рацион питания, веревка, фляга) занимают <strong>1 слот</strong>.</li>
                  <li>Одноручное оружие и легкий доспех — <strong>1 слот</strong>.</li>
                  <li>Двуручное оружие, тяжелый доспех, щит — <strong>2-3 слота</strong>.</li>
                  <li>Мелкие предметы (монеты, отмычки, кольца) складываются по 100 штук в 1 слот.</li>
                </ul>
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Штрафы за перегруз:</strong> Превышение лимита слотов снижает скорость перемещения персонажа. В случае сильного превышения персонаж может передвигаться только шагом или полностью теряет мобильность.
              </li>
            </ul>

            <div className="osr-rule-box" style={{ background: 'rgba(74, 51, 25, 0.05)', padding: '1rem', borderLeftColor: '#8b5a2b' }}>
              <strong>Выбор золота:</strong> Мешок с золотом занимает драгоценные слоты. Готовы ли вы бросить латы ради лишних ста золотых монет, рискуя умереть от первого же удара кобольда? Это и есть суть OSR.
            </div>
          </div>
        )}

        {subTab === 'light' && (
          <div>
            <h2>Свет, Огонь и Тьма в глубинах земли</h2>
            <p style={{ marginBottom: '1rem' }}>
              Подземелья погружены в абсолютную, непроглядную тьму. Это не просто декорация, а полноценный противник. Без источников света персонажи слепы и беспомощны.
            </p>

            <h3 style={{ marginTop: '1.5rem' }}>Источники света:</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem', marginBottom: '1.5rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #4a3319', textAlign: 'left' }}>
                  <th style={{ padding: '0.5rem' }}>Источник</th>
                  <th style={{ padding: '0.5rem' }}>Время горения</th>
                  <th style={{ padding: '0.5rem' }}>Радиус освещения</th>
                  <th style={{ padding: '0.5rem' }}>Особенности</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid rgba(74, 51, 25, 0.2)' }}>
                  <td style={{ padding: '0.5rem' }}><strong>Факел</strong></td>
                  <td style={{ padding: '0.5rem' }}>6 ходов (1 час)</td>
                  <td style={{ padding: '0.5rem' }}>30 футов</td>
                  <td style={{ padding: '0.5rem' }}>Может погаснуть от воды или сильного ветра. Легко поджечь.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(74, 51, 25, 0.2)' }}>
                  <td style={{ padding: '0.5rem' }}><strong>Фонарь (масляный)</strong></td>
                  <td style={{ padding: '0.5rem' }}>24 хода (4 часа)</td>
                  <td style={{ padding: '0.5rem' }}>30-50 футов</td>
                  <td style={{ padding: '0.5rem' }}>Требует масло. Можно закрывать заслонку для маскировки.</td>
                </tr>
                <tr style={{ borderBottom: '1px solid rgba(74, 51, 25, 0.2)' }}>
                  <td style={{ padding: '0.5rem' }}><strong>Заклинание света</strong></td>
                  <td style={{ padding: '0.5rem' }}>В зависимости от уровня</td>
                  <td style={{ padding: '0.5rem' }}>60 футов</td>
                  <td style={{ padding: '0.5rem' }}>Магический свет. Нельзя потушить обычной водой.</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: '1.5rem' }}>Правила Тьмы:</h3>
            <ul style={{ paddingLeft: '1.5rem' }}>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Полная тьма:</strong> Персонажи без инфразрения (Infravision) не могут атаковать прицельно, читать свитки, искать ловушки или карту. Они передвигаются со скоростью 1/3 от нормальной.
              </li>
              <li style={{ marginBottom: '0.5rem' }}>
                <strong>Слух в темноте:</strong> Тьма обостряет другие чувства. Шанс услышать шум за дверью или шаги монстров повышается на 1 (например, 2 из 6 на d6 вместо 1 из 6).
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
