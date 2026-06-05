import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Users, User, Flame, Clock, Play, RotateCcw, 
  Trash2, Plus, Minus, Move, Eye, EyeOff, Brush, Info,
  Volume2, Link, Copy, Check, Radio
} from 'lucide-react';

// Размер одной ячейки сетки на карте
const GRID_SIZE = 40;
const MAP_COLS = 40;
const MAP_ROWS = 40;

// Синтез звуков с помощью Web Audio API
const playSound = (type) => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'dice') {
      // Звук катающихся кубиков (несколько быстрых щелчков с затуханием)
      for (let i = 0; i < 4; i++) {
        const time = ctx.currentTime + i * 0.08;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180 - i * 25, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.06);
        
        gain.gain.setValueAtTime(0.25 - i * 0.05, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.06);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(time);
        osc.stop(time + 0.06);
      }
    } else if (type === 'torch_on') {
      // Звук зажигания факела (шипение шума + восходящий тон)
      const bufferSize = ctx.sampleRate * 0.35;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 800;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } else if (type === 'alert') {
      // Предупреждающий гул (для случайных встреч)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.1);
      osc.frequency.linearRampToValueAtTime(70, ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch (e) {
    console.warn('Web Audio API не поддерживается или заблокирован:', e);
  }
};

export default function Vtt() {
  // --- Режимы подключения и сессии ---
  const [role, setRole] = useState(null); // 'dm' | 'player'
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [peerId, setPeerId] = useState('');
  const [connected, setConnected] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [useLocalServer, setUseLocalServer] = useState(() => {
    // По умолчанию используем локальный сигнальный сервер, если мы не на github.io
    return !window.location.hostname.includes('github.io');
  });

  // --- Сетевой слой (PeerJS) ---
  const peerRef = useRef(null);
  const connMapRef = useRef(new Map()); // Для DM: хранит активные соединения
  const connRef = useRef(null); // Для Игрока: соединение с DM

  // --- Состояние игры (синхронизируется) ---
  const [drawLines, setDrawLines] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [fogMatrix, setFogMatrix] = useState({}); // Ключ: "col,row", значение: true (скрыто)
  const [dungeonClock, setDungeonClock] = useState({
    turn: 1,
    round: 0,
    activeTorches: [] // Список факелов, каждый: { id, label, fuel: 6 } (fuel макс 6 ходов)
  });
  const [rollLog, setRollLog] = useState([
    { id: 'start', name: 'Система', text: 'Добро пожаловать в Чертог VTT. Да покровительствует вам фортуна.', time: '15:00' }
  ]);

  // --- Локальное состояние VTT холста ---
  const canvasRef = useRef(null);
  const [activeTool, setActiveTool] = useState('move'); // 'move', 'pencil', 'eraser', 'fog_on', 'fog_off'
  const [brushColor, setBrushColor] = useState('#c5a059');
  const [brushWidth, setBrushWidth] = useState(4);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 100, y: 50 });

  // Вспомогательные переменные для рисования и перемещения
  const isMouseDownRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });
  const activeLinePointsRef = useRef([]);
  const activeTokenIdRef = useRef(null);
  const isDraggingMapRef = useRef(false);

  // Список доступных цветов для рисования
  const colors = ['#c5a059', '#e63946', '#457b9d', '#ffffff', '#1d3557'];

  // Инициализация тумана войны по умолчанию (вся карта скрыта)
  useEffect(() => {
    const initialFog = {};
    for (let c = 0; c < MAP_COLS; c++) {
      for (let r = 0; r < MAP_ROWS; r++) {
        initialFog[`${c},${r}`] = true;
      }
    }
    setFogMatrix(initialFog);
  }, []);

  // --- Динамический импорт и запуск PeerJS ---
  const startPeerSession = async (selectedRole, customRoomId) => {
    if (!name.trim()) {
      alert('Пожалуйста, введите свое имя искателя приключений.');
      return;
    }

    try {
      // Загружаем PeerJS динамически, чтобы не падать, если он не установлен
      const { default: Peer } = await import('peerjs');

      const finalRoomId = selectedRole === 'dm' 
        ? (customRoomId || `osr-room-${Math.floor(1000 + Math.random() * 9000)}`)
        : customRoomId;

      setRole(selectedRole);
      setRoomId(finalRoomId);
      
      // Создаем инстанс Peer с выбором локального или глобального сервера
      let peer;
      if (useLocalServer) {
        const isHttps = window.location.protocol === 'https:';
        const hostPort = window.location.port ? parseInt(window.location.port) : (isHttps ? 443 : 80);
        peer = new Peer(selectedRole === 'dm' ? finalRoomId : undefined, {
          host: window.location.hostname,
          port: hostPort,
          path: '/peerjs-local',
          secure: isHttps,
          debug: 3
        });
        console.log(`[PeerJS] Подключение к локальному сигнальному серверу: ${window.location.hostname}:${hostPort}/peerjs-local`);
      } else {
        peer = new Peer(selectedRole === 'dm' ? finalRoomId : undefined, {
          host: '0.peerjs.com',
          port: 443,
          path: '/',
          secure: true,
          debug: 3
        });
        console.log(`[PeerJS] Подключение к глобальному сигнальному серверу 0.peerjs.com`);
      }

      peerRef.current = peer;

      peer.on('open', (id) => {
        setPeerId(id);
        setConnected(true);
        if (selectedRole === 'dm') {
          setPlayersList([{ id: 'dm', name: `${name} (DM)` }]);
          addLogMessage('Система', `Создан чертог ведущего. ID комнаты: ${id}`);
        } else {
          addLogMessage('Система', `Подключение к комнате ${finalRoomId}...`);
          // Подключаемся к DM
          const conn = peer.connect(finalRoomId);
          connRef.current = conn;
          setupPlayerConnection(conn);
        }
      });

      peer.on('error', (err) => {
        console.error('Ошибка WebRTC:', err);
        
        if (err.type === 'peer-unavailable') {
          alert('Ошибка: комната с таким ID не найдена. Убедитесь, что Ведущий создал комнату и вы правильно скопировали ID.');
          setRole(null);
          setConnected(false);
          return;
        }
        
        if (err.type === 'unavailable-id') {
          alert('Ошибка: этот ID комнаты временно занят на сервере. Пожалуйста, подождите 15 секунд или попробуйте с другим именем комнаты.');
          setRole(null);
          setConnected(false);
          return;
        }

        alert(`Сетевая ошибка (${err.type || 'unknown'}): ${err.message}. Попробуем запустить локальную сессию.`);
        startLocalSession(selectedRole);
      });

      if (selectedRole === 'dm') {
        peer.on('connection', (conn) => {
          setupDmConnection(conn);
        });
      }

    } catch (e) {
      console.error('Не удалось инициализировать PeerJS:', e);
      alert('Ошибка WebRTC. Запускаем локальный оффлайн-режим.');
      startLocalSession(selectedRole);
    }
  };

  // Оффлайн фоллбек сессия
  const startLocalSession = (selectedRole) => {
    setRole(selectedRole);
    setConnected(true);
    setRoomId('LOCAL_OFFLINE');
    setPlayersList([{ id: 'local', name: `${name} (Локально)` }]);
    addLogMessage('Система', 'Запущен локальный оффлайн-режим. Сетевая синхронизация отключена.');
  };

  // Логика подключения на стороне DM
  const setupDmConnection = (conn) => {
    conn.on('open', () => {
      connMapRef.current.set(conn.peer, conn);
      
      // Отправляем игроку начальное состояние
      conn.send({
        type: 'INIT_STATE',
        payload: {
          drawLines,
          tokens,
          fogMatrix,
          dungeonClock,
          rollLog
        }
      });

      // Запрашиваем имя игрока
      conn.send({ type: 'REQ_NAME' });
    });

    conn.on('data', (data) => {
      if (data.type === 'SEND_NAME') {
        setPlayersList(prev => {
          const newList = [...prev, { id: conn.peer, name: data.payload.name }];
          broadcastToAll({ type: 'PLAYERS_UPDATE', payload: newList });
          return newList;
        });
        addLogMessage('Система', `Игрок [${data.payload.name}] вошел в чертог.`);
      }

      if (data.type === 'PLAYER_ACTION') {
        handlePlayerAction(data.action, data.payload, conn.peer);
      }
    });

    conn.on('close', () => {
      connMapRef.current.delete(conn.peer);
      setPlayersList(prev => {
        const item = prev.find(p => p.id === conn.peer);
        const nameStr = item ? item.name : 'Неизвестный';
        const newList = prev.filter(p => p.id !== conn.peer);
        broadcastToAll({ type: 'PLAYERS_UPDATE', payload: newList });
        addLogMessage('Система', `Игрок [${nameStr}] покинул чертог.`);
        return newList;
      });
    });
  };

  // Логика подключения на стороне Игрока
  const setupPlayerConnection = (conn) => {
    conn.on('data', (data) => {
      if (data.type === 'INIT_STATE') {
        setDrawLines(data.payload.drawLines);
        setTokens(data.payload.tokens);
        setFogMatrix(data.payload.fogMatrix);
        setDungeonClock(data.payload.dungeonClock);
        setRollLog(data.payload.rollLog);
      }

      if (data.type === 'STATE_SYNC') {
        if (data.payload.drawLines) setDrawLines(data.payload.drawLines);
        if (data.payload.tokens) setTokens(data.payload.tokens);
        if (data.payload.fogMatrix) setFogMatrix(data.payload.fogMatrix);
        if (data.payload.dungeonClock) setDungeonClock(data.payload.dungeonClock);
        if (data.payload.rollLog) setRollLog(data.payload.rollLog);
      }

      if (data.type === 'REQ_NAME') {
        conn.send({ type: 'SEND_NAME', payload: { name } });
      }

      if (data.type === 'PLAYERS_UPDATE') {
        setPlayersList(data.payload);
      }

      if (data.type === 'DICE_SOUND') {
        playSound('dice');
      }

      if (data.type === 'ALERT_SOUND') {
        playSound('alert');
      }

      if (data.type === 'TORCH_SOUND') {
        playSound('torch_on');
      }
    });

    conn.on('close', () => {
      setConnected(false);
      alert('Соединение с Ведущим потеряно.');
      setRole(null);
    });
  };

  // Рассылка изменений от DM ко всем игрокам
  const broadcastToAll = (msg) => {
    connMapRef.current.forEach((conn) => {
      if (conn.open) conn.send(msg);
    });
  };

  // Обработка действий игрока на сервере DM
  const handlePlayerAction = (action, payload, senderPeer) => {
    const sender = playersList.find(p => p.id === senderPeer)?.name || 'Игрок';

    if (action === 'DRAW_LINE') {
      setDrawLines(prev => {
        const next = [...prev, payload];
        syncState({ drawLines: next });
        return next;
      });
    }
    if (action === 'MOVE_TOKEN') {
      setTokens(prev => {
        const next = prev.map(t => t.id === payload.id ? { ...t, x: payload.x, y: payload.y } : t);
        syncState({ tokens: next });
        return next;
      });
    }
    if (action === 'DICE_ROLL') {
      playSound('dice');
      broadcastToAll({ type: 'DICE_SOUND' });
      setRollLog(prev => {
        const next = [...prev, payload];
        syncState({ rollLog: next });
        return next;
      });
    }
  };

  // Синхронизация состояния (вызывается DM при локальном изменении)
  const syncState = (partialState) => {
    if (role !== 'dm') return;
    broadcastToAll({
      type: 'STATE_SYNC',
      payload: partialState
    });
  };

  // Добавление сообщения в чат-лог
  const addLogMessage = (senderName, text) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg = {
      id: `${Date.now()}-${Math.random()}`,
      name: senderName,
      text,
      time
    };
    setRollLog(prev => {
      const next = [...prev, newMsg];
      syncState({ rollLog: next });
      return next;
    });
  };

  // Копирование ID комнаты в буфер обмена
  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // --- Рендеринг Canvas и обработка мыши ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очистка холста
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Сохраняем состояние контекста
    ctx.save();
    
    // Применяем панорамирование и зум
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // 1. Отрисовка сетки
    ctx.strokeStyle = 'rgba(197, 160, 89, 0.1)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= MAP_COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * GRID_SIZE, 0);
      ctx.lineTo(c * GRID_SIZE, MAP_ROWS * GRID_SIZE);
      ctx.stroke();
    }
    for (let r = 0; r <= MAP_ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * GRID_SIZE);
      ctx.lineTo(MAP_COLS * GRID_SIZE, r * GRID_SIZE);
      ctx.stroke();
    }

    // Ограничительная рамка карты
    ctx.strokeStyle = 'var(--gold-dark)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, MAP_COLS * GRID_SIZE, MAP_ROWS * GRID_SIZE);

    // 2. Рисование нарисованных игроками линий
    drawLines.forEach((line) => {
      if (line.points.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = line.color;
      ctx.lineWidth = line.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (line.tool === 'eraser') {
        ctx.strokeStyle = 'var(--bg-primary)'; // Имитация стирания на черном фоне
        ctx.lineWidth = line.width * 2;
      }

      ctx.moveTo(line.points[0].x, line.points[0].y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    });

    // 3. Отрисовка тумана войны (Fog of War)
    // Вычисляем общую освещенность
    const totalLight = calculateTotalLight();
    
    for (let c = 0; c < MAP_COLS; c++) {
      for (let r = 0; r < MAP_ROWS; r++) {
        if (fogMatrix[`${c},${r}`]) {
          if (role === 'dm') {
            // Для DM туман полупрозрачный, чтобы видеть скрытую карту
            ctx.fillStyle = 'rgba(10, 10, 12, 0.65)';
            ctx.fillRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
            ctx.strokeStyle = 'rgba(197, 160, 89, 0.05)';
            ctx.lineWidth = 0.5;
            ctx.strokeRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
          } else {
            // Для игроков туман абсолютно черный
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(c * GRID_SIZE, r * GRID_SIZE, GRID_SIZE, GRID_SIZE);
          }
        }
      }
    }

    // Если факелов нет вовсе, для игрока наступает абсолютная темнота на открытых участках
    if (totalLight === 0 && role === 'player') {
      ctx.fillStyle = 'rgba(5, 5, 8, 0.9)';
      ctx.fillRect(0, 0, MAP_COLS * GRID_SIZE, MAP_ROWS * GRID_SIZE);
      
      ctx.fillStyle = 'var(--gold-accent)';
      ctx.font = '24px Cinzel';
      ctx.textAlign = 'center';
      ctx.fillText('ПОЛНАЯ ТЕМНОТА', (MAP_COLS * GRID_SIZE) / 2, (MAP_ROWS * GRID_SIZE) / 2);
      ctx.font = '16px Crimson Text';
      ctx.fillText('Зажгите факел, чтобы видеть окружение', (MAP_COLS * GRID_SIZE) / 2, (MAP_ROWS * GRID_SIZE) / 2 + 30);
    }

    // 4. Отрисовка токенов (персонажей и монстров)
    tokens.forEach((token) => {
      // Игрок не должен видеть токен, если он находится в тумане войны
      const tokenCol = Math.floor(token.x / GRID_SIZE);
      const tokenRow = Math.floor(token.y / GRID_SIZE);
      const inFog = fogMatrix[`${tokenCol},${tokenRow}`];
      
      if (inFog && role === 'player') return;

      // Рисуем кружок токена
      ctx.beginPath();
      ctx.arc(token.x, token.y, GRID_SIZE / 2 - 4, 0, Math.PI * 2);
      ctx.fillStyle = token.isMonster ? '#9e2a2b' : 'rgba(30, 30, 35, 0.9)';
      ctx.fill();
      
      // Кайма золотая или красная
      ctx.strokeStyle = token.isMonster ? '#ff4d4d' : 'var(--gold-accent)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Свечение от факела у игроков
      if (!token.isMonster && totalLight > 0) {
        ctx.beginPath();
        ctx.arc(token.x, token.y, GRID_SIZE * 3, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(token.x, token.y, GRID_SIZE/2, token.x, token.y, GRID_SIZE * 3);
        grad.addColorStop(0, 'rgba(197, 160, 89, 0.12)');
        grad.addColorStop(1, 'rgba(197, 160, 89, 0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Текст первой буквы имени в центре токена
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 16px Cinzel';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(token.name.substring(0, 2), token.x, token.y);

      // Маленькая подпись имени внизу
      ctx.fillStyle = 'rgba(230, 225, 218, 0.9)';
      ctx.font = '10px Crimson Text';
      ctx.fillText(token.name, token.x, token.y + GRID_SIZE / 2 + 10);
    });

    ctx.restore();
  }, [drawLines, tokens, fogMatrix, zoom, panOffset, role, dungeonClock.activeTorches]);

  // Вычисление координат мыши относительно холста с учетом сдвига и зума
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Координаты клика на экране
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    // Обратное преобразование с учетом сдвига и масштаба
    const canvasX = (screenX - panOffset.x) / zoom;
    const canvasY = (screenY - panOffset.y) / zoom;

    return { x: canvasX, y: canvasY };
  };

  const handleMouseDown = (e) => {
    const coords = getCanvasCoords(e);
    isMouseDownRef.current = true;
    lastMousePosRef.current = coords;

    // Рисование карты правой кнопкой мыши или с зажатым пробелом / Shift
    if (e.button === 2 || e.shiftKey || activeTool === 'move') {
      isDraggingMapRef.current = true;
      return;
    }

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      activeLinePointsRef.current = [coords];
      const newLine = {
        tool: activeTool,
        color: brushColor,
        width: brushWidth,
        points: [coords]
      };
      
      if (role === 'dm') {
        setDrawLines(prev => {
          const next = [...prev, newLine];
          syncState({ drawLines: next });
          return next;
        });
      } else {
        // Отправляем DM
        connRef.current?.send({
          type: 'PLAYER_ACTION',
          action: 'DRAW_LINE',
          payload: newLine
        });
        // Рисуем у себя локально
        setDrawLines(prev => [...prev, newLine]);
      }
      return;
    }

    if (activeTool === 'move') {
      // Ищем, на какой токен кликнули (погрешность 20px)
      const clickedToken = tokens.find(t => {
        const dist = Math.hypot(t.x - coords.x, t.y - coords.y);
        return dist < (GRID_SIZE / 2 + 10);
      });

      if (clickedToken) {
        // Игрокам разрешено двигать только свои токены, DM — любые
        // В рамках прототипа разрешаем всем двигать всё, либо ограничиваем по имени
        activeTokenIdRef.current = clickedToken.id;
      }
      return;
    }

    if ((activeTool === 'fog_on' || activeTool === 'fog_off') && role === 'dm') {
      const col = Math.floor(coords.x / GRID_SIZE);
      const row = Math.floor(coords.y / GRID_SIZE);
      toggleFogCell(col, row, activeTool === 'fog_on');
    }
  };

  const handleMouseMove = (e) => {
    if (!isMouseDownRef.current) return;
    const coords = getCanvasCoords(e);

    if (isDraggingMapRef.current) {
      // Движение карты на экране
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const dx = clientX - rect.left - (lastMousePosRef.current.x * zoom + panOffset.x);
      const dy = clientY - rect.top - (lastMousePosRef.current.y * zoom + panOffset.y);
      
      setPanOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      lastMousePosRef.current = coords;
      return;
    }

    if (activeTool === 'pencil' || activeTool === 'eraser') {
      activeLinePointsRef.current.push(coords);
      setDrawLines(prev => {
        if (prev.length === 0) return prev;
        const lastLine = prev[prev.length - 1];
        const updatedLine = { ...lastLine, points: [...activeLinePointsRef.current] };
        const next = [...prev.slice(0, -1), updatedLine];
        syncState({ drawLines: next });
        return next;
      });
      lastMousePosRef.current = coords;
      return;
    }

    if (activeTool === 'move' && activeTokenIdRef.current) {
      // Привязка к сетке (Snap to Grid) по желанию, либо плавное движение. Сделаем плавным, а при отпускании привяжем
      setTokens(prev => {
        const next = prev.map(t => t.id === activeTokenIdRef.current ? { ...t, x: coords.x, y: coords.y } : t);
        if (role === 'dm') {
          syncState({ tokens: next });
        } else {
          connRef.current?.send({
            type: 'PLAYER_ACTION',
            action: 'MOVE_TOKEN',
            payload: { id: activeTokenIdRef.current, x: coords.x, y: coords.y }
          });
        }
        return next;
      });
      return;
    }

    if ((activeTool === 'fog_on' || activeTool === 'fog_off') && role === 'dm') {
      const col = Math.floor(coords.x / GRID_SIZE);
      const row = Math.floor(coords.y / GRID_SIZE);
      toggleFogCell(col, row, activeTool === 'fog_on');
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    isDraggingMapRef.current = false;

    // Привязка к сетке при отпускании токена
    if (activeTool === 'move' && activeTokenIdRef.current) {
      setTokens(prev => {
        const next = prev.map(t => {
          if (t.id === activeTokenIdRef.current) {
            // Центрируем внутри ячейки сетки
            const col = Math.floor(t.x / GRID_SIZE);
            const row = Math.floor(t.y / GRID_SIZE);
            const snappedX = col * GRID_SIZE + GRID_SIZE / 2;
            const snappedY = row * GRID_SIZE + GRID_SIZE / 2;
            return { ...t, x: snappedX, y: snappedY };
          }
          return t;
        });
        if (role === 'dm') {
          syncState({ tokens: next });
        } else {
          // Игрок отправляет привязанное состояние DM
          const updatedToken = next.find(t => t.id === activeTokenIdRef.current);
          if (updatedToken) {
            connRef.current?.send({
              type: 'PLAYER_ACTION',
              action: 'MOVE_TOKEN',
              payload: updatedToken
            });
          }
        }
        return next;
      });
      activeTokenIdRef.current = null;
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = 1.1;
    if (e.deltaY < 0) {
      setZoom(prev => Math.min(2.0, prev * zoomFactor));
    } else {
      setZoom(prev => Math.max(0.5, prev / zoomFactor));
    }
  };

  // Переключение одной ячейки тумана войны (только для DM)
  const toggleFogCell = (col, row, isFogged) => {
    if (col < 0 || col >= MAP_COLS || row < 0 || row >= MAP_ROWS) return;
    const key = `${col},${row}`;
    
    setFogMatrix(prev => {
      if (prev[key] === isFogged) return prev;
      const next = { ...prev, [key]: isFogged };
      syncState({ fogMatrix: next });
      return next;
    });
  };

  // Очистка всех рисунков
  const clearDrawings = () => {
    if (window.confirm('Очистить все рисунки на карте?')) {
      setDrawLines([]);
      syncState({ drawLines: [] });
    }
  };

  // Управление туманом войны (полностью скрыть / полностью открыть)
  const setAllFog = (isFogged) => {
    const nextFog = {};
    for (let c = 0; c < MAP_COLS; c++) {
      for (let r = 0; r < MAP_ROWS; r++) {
        nextFog[`${c},${r}`] = isFogged;
      }
    }
    setFogMatrix(nextFog);
    syncState({ fogMatrix: nextFog });
  };

  // --- OSR Игровые Механики (Таймеры, Факелы, Дайсы) ---

  // Вычисление текущего уровня освещенности (количество горящих факелов)
  const calculateTotalLight = () => {
    return dungeonClock.activeTorches.filter(t => t.fuel > 0).length;
  };

  // Зажечь новый факел
  const igniteTorch = () => {
    if (role !== 'dm') return;
    playSound('torch_on');
    broadcastToAll({ type: 'TORCH_SOUND' });

    setDungeonClock(prev => {
      const newTorch = {
        id: `torch-${Date.now()}`,
        label: `Факел партии №${prev.activeTorches.length + 1}`,
        fuel: 6 // Горит 6 ходов
      };
      const next = {
        ...prev,
        activeTorches: [...prev.activeTorches, newTorch]
      };
      syncState({ dungeonClock: next });
      return next;
    });
    addLogMessage('Ведущий', 'Партия зажигает новый факел. Тьма временно отступает!');
  };

  // Сменить Ход исследования (+10 минут)
  const nextTurn = () => {
    if (role !== 'dm') return;
    
    setDungeonClock(prev => {
      // Обновляем факелы (у каждого активного отнимаем 1 ед. топлива)
      let torchDied = false;
      const updatedTorches = prev.activeTorches.map(t => {
        if (t.fuel > 0) {
          const nextFuel = t.fuel - 1;
          if (nextFuel === 0) torchDied = true;
          return { ...t, fuel: nextFuel };
        }
        return t;
      });

      const nextState = {
        ...prev,
        turn: prev.turn + 1,
        activeTorches: updatedTorches
      };
      
      syncState({ dungeonClock: nextState });

      // Если факел погас, пишем в лог
      if (torchDied) {
        setTimeout(() => {
          addLogMessage('Система', 'Один из факелов партии зашипел и окончательно погас!');
          playSound('alert');
          broadcastToAll({ type: 'ALERT_SOUND' });
        }, 100);
      }

      return nextState;
    });

    addLogMessage('Система', `Начался Ход исследования №${dungeonClock.turn + 1} (Прошло +10 мин)`);
  };

  // Бросок на Случайную Встречу (1d6)
  const rollEncounters = () => {
    if (role !== 'dm') return;
    const roll = Math.floor(Math.random() * 6) + 1;
    
    if (roll === 1) {
      playSound('alert');
      broadcastToAll({ type: 'ALERT_SOUND' });
      addLogMessage('ВНИМАНИЕ', 'Бросок случайной встречи: ВЫПАЛА 1! Из темноты доносится скрежет и шаги. Монстры близко!');
    } else {
      addLogMessage('Система', `Бросок случайной встречи: Выпало ${roll}. В подземелье по-прежнему тихо...`);
    }
  };

  // Бросок кубиков (Dice Roller)
  const rollDice = (sides) => {
    const modInput = document.getElementById('dice-modifier');
    const modifier = modInput ? parseInt(modInput.value) || 0 : 0;
    const rollResult = Math.floor(Math.random() * sides) + 1;
    const finalVal = rollResult + modifier;
    const modStr = modifier !== 0 ? (modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`) : '';
    
    const rollInfo = {
      id: `roll-${Date.now()}`,
      name: role === 'dm' ? `${name} (DM)` : name,
      text: `Бросок d${sides}${modStr}: результат [${rollResult}] => ИТОГО: [${finalVal}]`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (role === 'dm') {
      playSound('dice');
      broadcastToAll({ type: 'DICE_SOUND' });
      setRollLog(prev => {
        const next = [...prev, rollInfo];
        syncState({ rollLog: next });
        return next;
      });
    } else {
      // Игрок отправляет бросок Мастеру
      connRef.current?.send({
        type: 'PLAYER_ACTION',
        action: 'DICE_ROLL',
        payload: rollInfo
      });
      // Проигрываем звук локально
      playSound('dice');
      setRollLog(prev => [...prev, rollInfo]);
    }
  };

  // Добавить Токен на поле
  const addToken = (isMonster) => {
    if (role !== 'dm') return;
    const tokenName = isMonster 
      ? `Монстр ${tokens.filter(t => t.isMonster).length + 1}`
      : prompt('Введите имя персонажа:') || 'Герой';

    const newToken = {
      id: `token-${Date.now()}`,
      name: tokenName,
      x: GRID_SIZE * 2 + GRID_SIZE / 2,
      y: GRID_SIZE * 2 + GRID_SIZE / 2,
      isMonster,
      color: isMonster ? '#9e2a2b' : '#c5a059'
    };

    setTokens(prev => {
      const next = [...prev, newToken];
      syncState({ tokens: next });
      return next;
    });
    addLogMessage('Система', `На поле добавлен токен: ${tokenName}`);
  };

  // Удалить последний токен
  const removeLastToken = () => {
    if (role !== 'dm') return;
    if (tokens.length === 0) return;
    
    const last = tokens[tokens.length - 1];
    setTokens(prev => {
      const next = prev.slice(0, -1);
      syncState({ tokens: next });
      return next;
    });
    addLogMessage('Система', `С поля удален токен: ${last.name}`);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', height: 'calc(100vh - 6rem)', display: 'flex', flexDirection: 'column' }}>
      
      {/* 1. ЭКРАН ВХОДА / ПОДКЛЮЧЕНИЯ */}
      {!connected && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <div className="osr-card" style={{ width: '480px', padding: '2.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-title)', color: 'var(--gold-bright)', marginBottom: '1.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
              <Shield size={28} /> Врата Игрового Стола
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Имя Игрока / Ведущего</label>
                <input 
                  type="text" 
                  className="osr-input" 
                  placeholder="Введите имя..." 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>ID Комнаты (для Игрока)</label>
                <input 
                  type="text" 
                  className="osr-input" 
                  placeholder="Вставьте ID комнаты DM..." 
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}>
                <input 
                  type="checkbox" 
                  id="use-local-server"
                  checked={useLocalServer}
                  onChange={(e) => setUseLocalServer(e.target.checked)}
                  style={{ accentColor: 'var(--gold-accent)', cursor: 'pointer' }}
                />
                <label htmlFor="use-local-server" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  Локальный сигнальный сервер (обход блокировок RKN)
                </label>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                className="osr-button" 
                onClick={() => startPeerSession('dm', roomId)}
              >
                Создать (DM)
              </button>
              <button 
                className="osr-button danger" 
                onClick={() => startPeerSession('player', roomId)}
                disabled={!roomId.trim()}
              >
                Войти (Игрок)
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '1.5rem', color: 'var(--text-muted)', fontSize: '0.75rem', justifyContent: 'center' }}>
              <Info size={12} />
              <span>Мультиплеер работает напрямую через WebRTC PeerJS.</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. РАБОЧИЙ СТОЛ VTT */}
      {connected && (
        <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 340px', gap: '1rem', flex: 1, minHeight: 0 }}>
          
          {/* А. ЛЕВАЯ ПАНЕЛЬ ИНСТРУМЕНТОВ */}
          <div className="osr-card" style={{ padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase' }}>Режим</div>
            
            {/* Кнопка Перемещение */}
            <button 
              title="Перемещение фишек / карты"
              className="osr-button" 
              style={{ padding: '0.5rem', background: activeTool === 'move' ? 'var(--gold-dark)' : 'transparent', border: 'none' }}
              onClick={() => setActiveTool('move')}
            >
              <Move size={20} style={{ color: activeTool === 'move' ? '#fff' : 'var(--gold-accent)' }} />
            </button>

            {/* Кнопка Рисование карандашом */}
            <button 
              title="Карандаш"
              className="osr-button" 
              style={{ padding: '0.5rem', background: activeTool === 'pencil' ? 'var(--gold-dark)' : 'transparent', border: 'none' }}
              onClick={() => setActiveTool('pencil')}
            >
              <Brush size={20} style={{ color: activeTool === 'pencil' ? '#fff' : 'var(--gold-accent)' }} />
            </button>

            {/* Кнопка Ластик */}
            <button 
              title="Ластик"
              className="osr-button" 
              style={{ padding: '0.5rem', background: activeTool === 'eraser' ? 'var(--gold-dark)' : 'transparent', border: 'none' }}
              onClick={() => setActiveTool('eraser')}
            >
              <Trash2 size={20} style={{ color: activeTool === 'eraser' ? '#fff' : 'var(--gold-accent)' }} />
            </button>

            {/* Инструменты тумана войны для DM */}
            {role === 'dm' && (
              <>
                <div style={{ width: '100%', height: '1px', background: 'var(--border-gold)', my: '0.5rem' }}></div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>Туман</div>
                
                <button 
                  title="Закрыть туманом"
                  className="osr-button" 
                  style={{ padding: '0.5rem', background: activeTool === 'fog_on' ? 'var(--gold-dark)' : 'transparent', border: 'none' }}
                  onClick={() => setActiveTool('fog_on')}
                >
                  <EyeOff size={20} style={{ color: activeTool === 'fog_on' ? '#fff' : 'var(--gold-accent)' }} />
                </button>

                <button 
                  title="Открыть карту"
                  className="osr-button" 
                  style={{ padding: '0.5rem', background: activeTool === 'fog_off' ? 'var(--gold-dark)' : 'transparent', border: 'none' }}
                  onClick={() => setActiveTool('fog_off')}
                >
                  <Eye size={20} style={{ color: activeTool === 'fog_off' ? '#fff' : 'var(--gold-accent)' }} />
                </button>
              </>
            )}

            {/* Выбор цвета кисти (при рисовании) */}
            {(activeTool === 'pencil') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                {colors.map(c => (
                  <div 
                    key={c}
                    onClick={() => setBrushColor(c)}
                    style={{ 
                      width: '18px', 
                      height: '18px', 
                      backgroundColor: c, 
                      borderRadius: '50%', 
                      cursor: 'pointer',
                      border: brushColor === c ? '2px solid #fff' : '1px solid var(--border-gold)',
                      boxShadow: brushColor === c ? 'var(--glow-gold)' : 'none'
                    }}
                  />
                ))}
              </div>
            )}

            {/* Управление фишками для DM */}
            {role === 'dm' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
                <div style={{ width: '100%', height: '1px', background: 'var(--border-gold)' }}></div>
                <button 
                  title="Добавить героя"
                  className="osr-button" 
                  style={{ padding: '0.4rem', borderColor: 'var(--gold-accent)' }}
                  onClick={() => addToken(false)}
                >
                  <Plus size={16} /> Герой
                </button>
                <button 
                  title="Добавить монстра"
                  className="osr-button danger" 
                  style={{ padding: '0.4rem' }}
                  onClick={() => addToken(true)}
                >
                  <Plus size={16} /> Мнстр
                </button>
                <button 
                  title="Убрать последний токен"
                  className="osr-button danger" 
                  style={{ padding: '0.4rem' }}
                  onClick={removeLastToken}
                  disabled={tokens.length === 0}
                >
                  <Minus size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Б. ЦЕНТРАЛЬНАЯ КАРТА (CANVAS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minHeight: 0 }}>
            {/* Статус-бар */}
            <div className="osr-card" style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Роль: <strong style={{ color: role === 'dm' ? 'var(--gold-bright)' : '#457b9d' }}>{role === 'dm' ? 'Ведущий (DM)' : 'Игрок'}</strong>
                </span>
                <span style={{ color: 'var(--text-muted)' }}>|</span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Link size={14} /> Комната: <strong style={{ color: 'var(--gold-accent)' }}>{roomId}</strong>
                  <button onClick={copyRoomId} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                    {copiedId ? <Check size={12} style={{ color: '#4caf50' }} /> : <Copy size={12} />}
                  </button>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <Users size={16} />
                <span>В сети: <strong>{playersList.length}</strong></span>
              </div>
            </div>

            {/* Само поле карты */}
            <div 
              style={{ 
                flex: 1, 
                position: 'relative', 
                backgroundColor: 'var(--bg-primary)', 
                border: '1px solid var(--border-gold)',
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              <canvas
                ref={canvasRef}
                width={800}
                height={550}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                style={{ 
                  display: 'block', 
                  width: '100%', 
                  height: '100%', 
                  cursor: activeTool === 'move' ? 'grab' : 'crosshair'
                }}
              />

              {/* Управление масштабом прямо на карте */}
              <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.6)', padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--border-gold)' }}>
                <button className="osr-button" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}>-</button>
                <span style={{ fontSize: '0.8rem', color: '#fff', alignSelf: 'center', minWidth: '40px', textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
                <button className="osr-button" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))}>+</button>
              </div>

              {/* Быстрые команды DM по туману */}
              {role === 'dm' && (
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button className="osr-button" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setAllFog(true)}>
                    Скрыть всё
                  </button>
                  <button className="osr-button" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setAllFog(false)}>
                    Открыть всё
                  </button>
                  <button className="osr-button danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={clearDrawings}>
                    Стереть рисунки
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* В. ПРАВАЯ ПАНЕЛЬ: ЧАСЫ И ДАЙСЫ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 0 }}>
            
            {/* DUNGEON CLOCK (OSR ТАЙМЕРЫ) */}
            <div className="osr-card" style={{ padding: '1.2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold-accent)', fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-gold)', paddingBottom: '0.4rem' }}>
                <Clock size={18} /> Dungeon Clock (Ходы)
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '3px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>ХОД (10 МИН)</div>
                  <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-title)', color: 'var(--gold-bright)' }}>{dungeonClock.turn}</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '3px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>АКТИВНЫЙ СВЕТ</div>
                  <div style={{ fontSize: '1.6rem', fontFamily: 'var(--font-title)', color: calculateTotalLight() > 0 ? '#4caf50' : 'var(--blood-red)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                    <Flame size={18} style={{ animation: calculateTotalLight() > 0 ? 'torch-flicker 2s infinite alternate' : 'none' }} /> {calculateTotalLight()}
                  </div>
                </div>
              </div>

              {/* Управление часами (Только для DM) */}
              {role === 'dm' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="osr-button" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }} onClick={nextTurn}>
                      +1 Ход (+10 мин)
                    </button>
                    <button className="osr-button" style={{ flex: 1, padding: '0.4rem', fontSize: '0.8rem' }} onClick={rollEncounters}>
                      Встреча (1d6)
                    </button>
                  </div>
                  <button className="osr-button" style={{ padding: '0.4rem', fontSize: '0.8rem', borderColor: 'var(--gold-accent)' }} onClick={igniteTorch}>
                    Зажечь факел (6 х.)
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: '0.8rem', fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '1rem' }}>
                  Время и свет контролируются Ведущим.
                </div>
              )}

              {/* Пул факелов партии */}
              <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {dungeonClock.activeTorches.map(t => {
                  const percent = (t.fuel / 6) * 100;
                  return (
                    <div key={t.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(0,0,0,0.2)', padding: '0.3rem 0.5rem', borderRadius: '3px', border: '1px solid rgba(197, 160, 89, 0.1)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                        <span style={{ color: t.fuel > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>{t.label}</span>
                        <span style={{ color: t.fuel > 1 ? 'var(--gold-accent)' : 'var(--blood-red)', fontWeight: 'bold' }}>
                          {t.fuel > 0 ? `${t.fuel} ходов` : 'Погас'}
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '4px', backgroundColor: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${percent}%`, height: '100%', backgroundColor: t.fuel > 1 ? 'var(--gold-accent)' : 'var(--blood-red)', transition: 'width 0.3s ease' }}></div>
                      </div>
                    </div>
                  );
                })}
                {dungeonClock.activeTorches.length === 0 && (
                  <div style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--text-muted)', textAlign: 'center' }}>
                    Нет активных источников света. Партия во тьме!
                  </div>
                )}
              </div>
            </div>

            {/* DICE ROLLER & LOG (БРОСКИ КУБИКОВ И ЧАТ) */}
            <div className="osr-card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1.2rem', minHeight: 0 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--gold-accent)', fontSize: '1.1rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--border-gold)', paddingBottom: '0.4rem' }}>
                <Radio size={18} /> Кубы и Летопись
              </h3>

              {/* Сетка кубиков */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginBottom: '0.75rem' }}>
                {[4, 6, 8, 10, 12, 20, 100].map(sides => (
                  <button 
                    key={sides} 
                    className="osr-button" 
                    style={{ padding: '0.3rem 0', fontSize: '0.8rem', textTransform: 'none' }}
                    onClick={() => rollDice(sides)}
                  >
                    d{sides}
                  </button>
                ))}
                
                {/* Модификатор */}
                <input 
                  id="dice-modifier"
                  type="number" 
                  className="osr-input" 
                  placeholder="+/-" 
                  defaultValue={0}
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.8rem', textAlign: 'center' }}
                />
              </div>

              {/* Лог бросков */}
              <div style={{ 
                flex: 1, 
                background: 'rgba(0,0,0,0.5)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '4px',
                padding: '0.75rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                fontSize: '0.85rem'
              }}>
                {rollLog.map(log => {
                  const isSystem = log.name === 'Система';
                  const isDm = log.name.includes('DM') || log.name === 'Ведущий';
                  const isAttention = log.name === 'ВНИМАНИЕ';
                  
                  let senderColor = 'var(--text-muted)';
                  if (isDm) senderColor = 'var(--gold-accent)';
                  if (isAttention) senderColor = 'var(--blood-red)';
                  if (!isSystem && !isDm && !isAttention) senderColor = '#457b9d';

                  return (
                    <div key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '1px' }}>
                        <span style={{ color: senderColor, fontWeight: 'bold' }}>{log.name}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{log.time}</span>
                      </div>
                      <div style={{ 
                        color: isSystem ? 'var(--text-muted)' : 'var(--text-primary)',
                        fontStyle: isSystem || isAttention ? 'italic' : 'normal',
                        fontWeight: isAttention ? 'bold' : 'normal'
                      }}>
                        {log.text}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Кнопка очистки лога для DM */}
              {role === 'dm' && (
                <button 
                  className="osr-button danger" 
                  style={{ width: '100%', marginTop: '0.5rem', padding: '0.25rem', fontSize: '0.75rem' }}
                  onClick={() => {
                    setRollLog([]);
                    syncState({ rollLog: [] });
                  }}
                >
                  Очистить летопись
                </button>
              )}

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
