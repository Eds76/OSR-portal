import React, { useState, useEffect } from 'react';
import { User, Sparkles, Key, RotateCcw, Copy, Check } from 'lucide-react';

// Локальные базы данных для генерации OSR-контента
const NAMES = ['Алрик', 'Бранн', 'Кадгар', 'Далин', 'Эльрик', 'Финн', 'Гаррет', 'Хорст', 'Игнис', 'Йорген', 'Конан', 'Лотар', 'Морган', 'Нильс', 'Олаф', 'Рагнар', 'Сигурд', 'Торвальд', 'Ульрих', 'Вулф'];
const SURNAMES = ['Железный', 'Серая Рука', 'Полуутопленник', 'Быстрый', 'Могильщик', 'Шрам', 'Ворон', 'Кузнец', 'Крысолов', 'Молчун', 'Следопыт', 'Кровавый', 'Тень', 'Хромой', 'Безродный'];
const TRAITS = [
  'Панически боится темноты (требуется 2 факела)',
  'Имеет татуировку с картой неизвестного подземелья на спине',
  'Постоянно шепчется сам с собой',
  'Имеет долг в 80 золотых монет местному ростовщику',
  'Не может спать в доспехах (снимает их на привалах)',
  'Всегда берет 1 лишний рацион питания и ест его тайно',
  'Один глаз стеклянный (штраф к стрельбе)',
  'Хранит при себе сушеную жабу, веря, что она приносит удачу',
  'Теряет дар речи при виде золота крупнее монеты',
  'Никогда не лжет, даже под страхом смерти'
];
const ITEM_SETS = [
  ['Меч (1d8)', 'Кожаный доспех (AC 12)', 'Веревка 50 фт', 'Факел (3 шт)', 'Сухой паек (5 дней)', 'Святая вода (1 флакон)'],
  ['Топор (1d8)', 'Кольчуга (AC 14)', 'Щит (AC +1)', 'Факел (2 шт)', 'Железный лом', 'Сухой паек (3 дня)'],
  ['Кинжал (1d4)', 'Тряпки (AC 10)', 'Воровские инструменты', 'Мел (5 кусочков)', 'Зеркальце', 'Масло для фонаря (2 бутыли)'],
  ['Посох (1d6)', 'Роба (AC 10)', 'Книга заклинаний (Сон)', 'Свечи (6 шт)', 'Чернила и перо', 'Сухой паек (7 дней)'],
  ['Святой символ', 'Булава (1d6)', 'Кольчуга (AC 14)', 'Факел (4 шт)', 'Чеснок (3 головки)', 'Фляга с вином']
];

// Списки для локальной генерации комнат подземелий
const ROOM_WALLS = ['покрытые липкой слизью', 'сложенные из грубого черного камня', 'испещренные странными светящимися рунами', 'частично обвалившиеся с торчащими корнями', 'покрытые древними барельефами, изображающими пытки'];
const ROOM_SMELLS = ['пахнет гнилой плотью и сыростью', 'наполнен тяжелым запахом серы и озона', 'пропитан ароматом старого сухого пергамента и пыли', 'несет сладковатый запах гнили и застоявшейся воды', 'пахнет гарью и расплавленным металлом'];
const ROOM_LIGHT = ['полная темнота, поглощающая свет факелов', 'тусклое фосфоресцирующее свечение плесени на потолке', 'мерцающий багровый свет из трещины в полу', 'абсолютная тьма с редкими искрами статического электричества'];
const ROOM_FEATURES = [
  'В центре стоит треснувший каменный саркофаг, из которого сочится черная жижа.',
  'На полу разбросаны сотни ржавых наконечников стрел и кости мелких грызунов.',
  'Со стены свисает железная клетка с полуистлевшим скелетом, сжимающим ржавый ключ.',
  'Огромная каменная статуя безголового воина указывает мечом на южную стену.',
  'Глубокий колодец, из глубины которого доносится эхо капающей воды и тихий шепот.'
];
const ROOM_MONSTERS = ['3 кобольда-мародера, обгладывающих чьи-то кости', 'Огромная плотоядная слизь, медленно сползающая с потолка', '2 голодных гигантских крысы с горящими красными глазами', 'Призрак древнего стражника, тихо стенающий в углу', 'Никого нет, но чувствуется чье-то незримое присутствие'];
const ROOM_TREASURES = ['старый кожаный кошель с 45 медными монетами', 'серебряный кубок с гравировкой в виде змеи (стоимостью 25 золотых)', 'ржавый кинжал, который светится тусклым синим светом вблизи гоблинов', 'флакон со странной шипящей фиолетовой жидкостью', 'сундук с хитрой ловушкой (игла с ядом), внутри 120 золотых монет'];

export default function Generators() {
  const [character, setCharacter] = useState(null);
  const [aiType, setAiType] = useState('room');
  const [aiResult, setAiResult] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedChar, setCopiedChar] = useState(false);
  const [copiedAi, setCopiedAi] = useState(false);

  // Загрузка API-ключа из localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('osr_gemini_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const saveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('osr_gemini_api_key', key);
  };

  // Механика броска кубиков d6
  const rollDice = (count = 1, sides = 6) => {
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
  };

  // Генератор персонажа OSR (3d6 по порядку)
  const generateCharacter = () => {
    const stats = {
      STR: rollDice(3, 6),
      DEX: rollDice(3, 6),
      CON: rollDice(3, 6),
      INT: rollDice(3, 6),
      WIS: rollDice(3, 6),
      CHA: rollDice(3, 6),
    };

    // Определение классов на основе характеристик
    const classes = [];
    if (stats.STR >= 9) classes.push({ name: 'Воин', hd: 8 });
    if (stats.INT >= 9) classes.push({ name: 'Маг', hd: 4 });
    if (stats.WIS >= 9) classes.push({ name: 'Жрец', hd: 6 });
    if (stats.DEX >= 9) classes.push({ name: 'Вор', hd: 6 });
    if (stats.STR >= 9 && stats.INT >= 9) classes.push({ name: 'Эльф', hd: 6 });
    if (stats.CON >= 9 && stats.STR >= 9) classes.push({ name: 'Дварф', hd: 8 });
    if (stats.DEX >= 9 && stats.CON >= 9) classes.push({ name: 'Полурослик', hd: 6 });

    // Если ни один класс не подходит по требованиям, берем случайный из базовых четырех
    const fallbackClasses = [
      { name: 'Воин', hd: 8 },
      { name: 'Вор', hd: 6 },
      { name: 'Жрец', hd: 6 },
      { name: 'Маг', hd: 4 }
    ];
    const selectedClass = classes.length > 0 
      ? classes[Math.floor(Math.random() * classes.length)] 
      : fallbackClasses[Math.floor(Math.random() * fallbackClasses.length)];

    // Модификатор CON
    let conMod = 0;
    if (stats.CON >= 13 && stats.CON <= 15) conMod = 1;
    else if (stats.CON >= 16 && stats.CON <= 17) conMod = 2;
    else if (stats.CON === 18) conMod = 3;
    else if (stats.CON >= 6 && stats.CON <= 8) conMod = -1;
    else if (stats.CON <= 5) conMod = -2;

    const maxHp = Math.max(1, rollDice(1, selectedClass.hd) + conMod);
    const gold = rollDice(3, 6) * 10;
    const items = ITEM_SETS[Math.floor(Math.random() * ITEM_SETS.length)];
    const trait = TRAITS[Math.floor(Math.random() * TRAITS.length)];
    const name = `${NAMES[Math.floor(Math.random() * NAMES.length)]} ${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}`;

    setCharacter({
      name,
      class: selectedClass.name,
      stats,
      hp: maxHp,
      gold,
      items,
      trait,
    });
    setCopiedChar(false);
  };

  // Копирование листа персонажа в буфер
  const copyCharToClipboard = () => {
    if (!character) return;
    const text = `**Имя:** ${character.name}
**Класс:** ${character.class}
**Хиты (HP):** ${character.hp}
**Золото:** ${character.gold} gp

**Характеристики:**
- СИЛ (STR): ${character.stats.STR}
- ЛОВ (DEX): ${character.stats.DEX}
- ТЕЛ (CON): ${character.stats.CON}
- ИНТ (INT): ${character.stats.INT}
- МУД (WIS): ${character.stats.WIS}
- ХАР (CHA): ${character.stats.CHA}

**Особенность:** ${character.trait}
**Снаряжение:**
${character.items.map(i => `- ${i}`).join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedChar(true);
    setTimeout(() => setCopiedChar(false), 2000);
  };

  // Генерация контента ИИ / Локальные шаблоны
  const generateAiContent = async () => {
    setIsGenerating(true);
    setAiResult('');
    setCopiedAi(false);

    if (!apiKey) {
      // Локальный генератор по шаблонам
      setTimeout(() => {
        let result = '';
        if (aiType === 'room') {
          result = `### Сгенерированная комната подземелья\n\n`;
          result += `**Стены:** Комната средних размеров, стены ${ROOM_WALLS[Math.floor(Math.random() * ROOM_WALLS.length)]}.\n`;
          result += `**Запах:** В воздухе витает тяжелая атмосфера, помещение ${ROOM_SMELLS[Math.floor(Math.random() * ROOM_SMELLS.length)]}.\n`;
          result += `**Освещение:** Здесь царит ${ROOM_LIGHT[Math.floor(Math.random() * ROOM_LIGHT.length)]}.\n`;
          result += `**Детали:** ${ROOM_FEATURES[Math.floor(Math.random() * ROOM_FEATURES.length)]}\n`;
          result += `**Угроза:** ${ROOM_MONSTERS[Math.floor(Math.random() * ROOM_MONSTERS.length)]}.\n`;
          result += `**Сокровище:** Среди хлама скрыто следующее: ${ROOM_TREASURES[Math.floor(Math.random() * ROOM_TREASURES.length)]}.`;
        } else if (aiType === 'monster') {
          const names = ['Склизкий Грызозуб', 'Могильный Скиталец', 'Пепельный Мимик', 'Иглобрюх глубин', 'Теневой Душитель'];
          const size = ['Маленький (около 1 фута)', 'Средний (человеческий рост)', 'Огромный (заполняет полкомнаты)'];
          const weapons = ['кислотные плевки', 'острые костяные наросты', 'щупальца, парализующие жертву', 'длинные когти, пробивающие кольчугу'];
          const weakness = ['панически боится яркого огня факелов', 'замирает, если слышит звон золотых монет', 'уязвим к святой воде', 'медлителен, можно легко обойти'];
          
          result = `### Странный монстр подземелья\n\n`;
          result += `**Название:** ${names[Math.floor(Math.random() * names.length)]}\n`;
          result += `**Размер:** ${size[Math.floor(Math.random() * size.length)]}\n`;
          result += `**Оружие/Атака:** Нападает, используя ${weapons[Math.floor(Math.random() * weapons.length)]}.\n`;
          result += `**Слабость:** Имеет скрытый изъян: ${weakness[Math.floor(Math.random() * weakness.length)]}.\n\n`;
          result += `*Локальная мудрость:* Тварь притаилась в темноте и ждет, пока у исследователей догорит последний факел...`;
        } else {
          const rumors = [
            'Говорят, что на третьем уровне подземелья есть комната, где золотые монеты сами прыгают в мешок, но каждый, кто их взял, ослеп через сутки.',
            'Местный пьяница божится, что видел, как гоблины несли тяжелый окованный железом сундук в старую склеповую шахту к северу от болот.',
            'Старейшина ищет смельчаков, готовых спуститься в колодец за фамильным кольцом, но предупреждает: из колодца по ночам пахнет свежескошенной травой, что сулит беду.',
            'Проводник уверяет, что факелы горят в два раза быстрее в восточном крыле руин. Магия это или ядовитые газы — никто не знает.'
          ];
          result = `### Зацепка в таверне / Слух\n\n`;
          result += `*Старый трактирщик протирает оловянную кружку грязной тряпкой, наклоняется к вам и шепчет:*\n\n`;
          result += `«${rumors[Math.floor(Math.random() * rumors.length)]}»`;
        }
        setAiResult(result);
        setIsGenerating(false);
      }, 1000);
      return;
    }

    // Запрос к реальному Gemini API
    try {
      let prompt = '';
      if (aiType === 'room') {
        prompt = 'Создай атмосферное описание комнаты фэнтезийного подземелья в стиле старой школы OSR D&D. Опиши стены, запах, освещение, необычную деталь интерьера, возможного монстра или ловушку, а также скрытое сокровище с изъяном. Текст должен быть мрачным, лаконичным, без пафоса и клише современной фэнтези. Ограничься 100-150 словами. Выведи в формате Markdown.';
      } else if (aiType === 'monster') {
        prompt = 'Создай странного, пугающего и уникального монстра для OSR подземелья. Опиши его внешний вид, способ атаки и неочевидную слабость. Избегай банальных драконов/орков. Сделай его лаконичным и атмосферным. Выведи в формате Markdown.';
      } else {
        prompt = 'Создай таинственный слух или зацепку для приключения, который персонажи могут услышать в мрачной приграничной таверне. Напиши от лица трактирщика или раненого наемника. Слух должен намекать на опасность и сокровища в руинах. Выведи в формате Markdown.';
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 500,
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Ошибка API: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Не удалось получить ответ от ИИ.';
      setAiResult(text);
    } catch (error) {
      setAiResult(`### Ошибка ИИ-генерации\n\n${error.message}\n\n*Проверьте правильность API-ключа или сотрите его, чтобы использовать качественный офлайн-генератор по OSR-таблицам.*`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyAiResultToClipboard = () => {
    if (!aiResult) return;
    navigator.clipboard.writeText(aiResult);
    setCopiedAi(true);
    setTimeout(() => setCopiedAi(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div className="page-header">
        <h1 className="page-title">Кузня Случайностей</h1>
        <p className="page-subtitle">"Случайные таблицы — сердце старой школы. ИИ — её новое пламя"</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
        
        {/* Генератор персонажа */}
        <div className="osr-card" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--gold-accent)' }}>
            <User size={24} /> Лист Новобранца
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
            Сгенерируйте случайного искателя приключений. В OSR характеристики 3d6 кидаются строго по порядку (in order), определяя судьбу персонажа.
          </p>

          <div style={{ marginBottom: '1.5rem' }}>
            <button className="osr-button" onClick={generateCharacter} style={{ width: '100%' }}>
              Бросить 3d6 по порядку
            </button>
          </div>

          {character ? (
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              padding: '1.5rem', 
              borderRadius: '4px', 
              border: '1px solid var(--border-gold)',
              position: 'relative',
              flex: 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-gold)', paddingBottom: '0.5rem' }}>
                <div>
                  <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>ИМЯ</div>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.3rem', color: 'var(--gold-bright)' }}>{character.name}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>КЛАСС / HP</div>
                  <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem' }}>{character.class} / <span style={{ color: 'var(--blood-red)' }}>{character.hp} HP</span></div>
                </div>
              </div>

              {/* Характеристики */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem' }}>
                {Object.entries(character.stats).map(([stat, val]) => (
                  <div key={stat} style={{ background: 'rgba(30, 25, 20, 0.4)', padding: '0.4rem', borderRadius: '3px', border: '1px solid rgba(197, 160, 89, 0.15)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>{stat}</div>
                    <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.2rem', color: 'var(--text-primary)' }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>СТАРТОВОЕ СНАРЯЖЕНИЕ & ЗОЛОТО ({character.gold} gp)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.25rem' }}>
                  {character.items.map((it, idx) => (
                    <span key={idx} style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', fontSize: '0.8rem', padding: '0.1rem 0.4rem', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                      {it}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.8rem' }}>ОТЛИЧИТЕЛЬНАЯ ЧЕРТА / ИЗЪЯН</div>
                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem', marginTop: '0.25rem' }}>"{character.trait}"</div>
              </div>

              <button 
                className="osr-button" 
                onClick={copyCharToClipboard} 
                style={{ position: 'absolute', bottom: '1rem', right: '1rem', padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
              >
                {copiedChar ? <Check size={14} /> : <Copy size={14} />} {copiedChar ? 'Скопировано' : 'Копировать'}
              </button>
            </div>
          ) : (
            <div style={{ 
              border: '1px dashed var(--border-gold)', 
              borderRadius: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1, 
              color: 'var(--text-muted)',
              fontStyle: 'italic'
            }}>
              Нажмите кнопку выше, чтобы призвать авантюриста...
            </div>
          )}
        </div>

        {/* Генератор ИИ */}
        <div className="osr-card" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--gold-accent)' }}>
            <Sparkles size={24} /> ИИ-Генератор Контента
          </h2>
          
          {/* Поле для API-ключа */}
          <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.75rem 1rem', borderRadius: '4px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <Key size={14} style={{ color: 'var(--gold-accent)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Gemini API Ключ (Необязательно)</span>
            </div>
            <input 
              type="password" 
              className="osr-input" 
              placeholder="Вставьте API ключ для реальной генерации..." 
              value={apiKey}
              onChange={(e) => saveApiKey(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', padding: '0.4rem 0.75rem' }}
            />
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Ключ хранится локально в вашем браузере. Если оставить поле пустым, будет работать качественный офлайн-генератор по таблицам OSR.
            </div>
          </div>

          {/* Переключатель типа генерации */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {['room', 'monster', 'rumor'].map((type) => (
              <button
                key={type}
                className={`osr-button`}
                style={{ 
                  flex: 1, 
                  fontSize: '0.8rem', 
                  padding: '0.5rem', 
                  background: aiType === type ? 'var(--gold-dark)' : '', 
                  color: aiType === type ? '#fff' : 'var(--gold-accent)',
                  borderColor: aiType === type ? 'var(--gold-bright)' : 'var(--gold-dark)'
                }}
                onClick={() => setAiType(type)}
              >
                {type === 'room' && 'Комната'}
                {type === 'monster' && 'Монстр'}
                {type === 'rumor' && 'Слух в таверне'}
              </button>
            ))}
          </div>

          <button 
            className="osr-button" 
            onClick={generateAiContent} 
            disabled={isGenerating} 
            style={{ width: '100%', marginBottom: '1.5rem' }}
          >
            {isGenerating ? 'Призыв сил ИИ...' : 'Сгенерировать'}
          </button>

          {/* Результат генерации */}
          {aiResult ? (
            <div style={{ 
              background: 'rgba(0, 0, 0, 0.4)', 
              padding: '1.5rem', 
              borderRadius: '4px', 
              border: '1px solid var(--border-gold)',
              position: 'relative',
              flex: 1,
              maxHeight: '220px',
              overflowY: 'auto',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              lineHeight: '1.5',
              whiteSpace: 'pre-wrap'
            }}>
              {aiResult}
              <button 
                className="osr-button" 
                onClick={copyAiResultToClipboard} 
                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              >
                {copiedAi ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          ) : (
            <div style={{ 
              border: '1px dashed var(--border-gold)', 
              borderRadius: '4px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              flex: 1, 
              color: 'var(--text-muted)',
              fontStyle: 'italic'
            }}>
              Нажмите кнопку выше, чтобы запустить генерацию...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
