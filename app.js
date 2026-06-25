const STORAGE_KEY = 'bodyweight_records';
const GOAL_KEY = 'bodyweight_goal';
const THEME_KEY = 'bodyweight_theme';
const CHECKS_KEY = 'bodyweight_daily_checks';
const MISSION_CFG_KEY = 'bodyweight_mission_cfg';
const DIARY_KEY = 'bodyweight_diary';
const TABATA_LOG_KEY = 'bodyweight_tabata_log';

let currentPeriod = '3m';

// Bonus mission pool (12 missions, 2 picked per day by date seed)
const BONUS_MISSION_POOL = [
  { id:'streak3',     icon:'📅', label:'3일 연속 기록',   type:'auto' },
  { id:'streak7',     icon:'🔥', label:'7일 연속 기록',   type:'auto' },
  { id:'weekly3ex',   icon:'🏋️', label:'이번 주 운동 3회', type:'auto' },
  { id:'weekly3sober',icon:'🚭', label:'이번 주 금주 3일', type:'auto' },
  { id:'lowestweek',  icon:'📊', label:'이번 주 최저 체중', type:'auto' },
  { id:'water',       icon:'💧', label:'물 2L 마시기',    type:'manual' },
  { id:'veggies',     icon:'🥗', label:'채소 챙겨 먹기',   type:'manual' },
  { id:'walk',        icon:'🚶', label:'30분 이상 걷기',   type:'manual' },
  { id:'sleep',       icon:'😴', label:'11시 전에 수면',   type:'manual' },
  { id:'nosnack',     icon:'🍱', label:'야식 참기',        type:'manual' },
  { id:'stretch',     icon:'🧘', label:'스트레칭 5분',     type:'manual' },
  { id:'measure',     icon:'📏', label:'몸 상태 체크',     type:'manual' },
];

// Daily manual checks storage
function getDailyChecks(dateStr) {
  const all = JSON.parse(localStorage.getItem(CHECKS_KEY) || '{}');
  return new Set(all[dateStr] || []);
}

function toggleDailyCheck(dateStr, missionId) {
  const all = JSON.parse(localStorage.getItem(CHECKS_KEY) || '{}');
  const set = new Set(all[dateStr] || []);
  if (set.has(missionId)) set.delete(missionId);
  else set.add(missionId);
  all[dateStr] = [...set];
  // Clean up entries older than 7 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  for (const key of Object.keys(all)) {
    if (key < cutoffStr) delete all[key];
  }
  localStorage.setItem(CHECKS_KEY, JSON.stringify(all));
  updateMissions();
}

// Mission config: which defaults are disabled, custom missions added by user
function getMissionCfg() {
  return JSON.parse(localStorage.getItem(MISSION_CFG_KEY) || '{"disabled":[],"custom":[]}');
}
function saveMissionCfg(cfg) {
  localStorage.setItem(MISSION_CFG_KEY, JSON.stringify(cfg));
}

// Pick 2 bonus missions deterministically from today's date
function getDailyBonusMissions() {
  const cfg = getMissionCfg();
  const disabled = new Set(cfg.disabled || []);
  const custom = cfg.custom || [];
  const pool = [
    ...BONUS_MISSION_POOL.filter(m => !disabled.has(m.id)),
    ...custom,
  ];
  if (pool.length === 0) return [];
  if (pool.length === 1) return [pool[0]];
  const seed = parseInt(today().replace(/-/g, ''), 10);
  const i1 = seed % pool.length;
  let i2 = (seed * 31 + 17) % pool.length;
  if (i2 === i1) i2 = (i1 + 1) % pool.length;
  return [pool[i1], pool[i2]];
}

// Overlay helpers
function openOverlay(id, lockScroll = true) {
  document.getElementById(id).classList.add('open');
  if (lockScroll) document.body.style.overflow = 'hidden';
}
function closeOverlay(id, lockScroll = true) {
  document.getElementById(id).classList.remove('open');
  if (lockScroll) document.body.style.overflow = '';
}

// Mission settings overlay
function openMissionSettings() {
  renderMissionSettings();
  openOverlay('missionSettings');
}
function closeMissionSettings() {
  closeOverlay('missionSettings');
}

function renderMissionSettings() {
  const cfg = getMissionCfg();
  const disabled = new Set(cfg.disabled || []);
  const custom = cfg.custom || [];

  const defaultRows = BONUS_MISSION_POOL.map(m => {
    const on = !disabled.has(m.id);
    return `<div class="ms-row">
      <span class="ms-icon">${m.icon}</span>
      <span class="ms-label">${m.label}</span>
      <span class="ms-type">${m.type === 'auto' ? '자동' : '수동'}</span>
      <button class="ms-toggle ${on ? 'ms-toggle--on' : 'ms-toggle--off'}" data-id="${m.id}">${on ? 'ON' : 'OFF'}</button>
    </div>`;
  }).join('');

  const customRows = custom.length
    ? custom.map(m => `<div class="ms-row">
        <span class="ms-icon">${m.icon}</span>
        <span class="ms-label">${m.label}</span>
        <span class="ms-type">수동</span>
        <button class="ms-delete" data-id="${m.id}">삭제</button>
      </div>`).join('')
    : '<p class="ms-empty">추가된 미션이 없어요</p>';

  document.getElementById('msDefaultList').innerHTML = defaultRows;
  document.getElementById('msCustomList').innerHTML = customRows;
}

// Storage
function getRecords() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}
function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}
function getGoal() {
  const v = localStorage.getItem(GOAL_KEY);
  return v !== null ? parseFloat(v) : null;
}
function saveGoal(val) {
  if (val !== null && !isNaN(val)) localStorage.setItem(GOAL_KEY, val.toString());
  else localStorage.removeItem(GOAL_KEY);
}

// Helpers
function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function today() { return toISODate(new Date()); }
function formatDateShort(s) { const [,m,d] = s.split('-'); return `${m}/${d}`; }
function formatDateFull(s)  { const [y,m,d] = s.split('-'); return `${y}.${m}.${d}`; }

function filterByPeriod(records, period) {
  if (period === 'all') return records;
  const cutoff = new Date();
  if (period === '1w') cutoff.setDate(cutoff.getDate() - 7);
  else if (period === '1m') cutoff.setMonth(cutoff.getMonth() - 1);
  else if (period === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  return records.filter(r => r.date >= cutoffStr);
}

function niceYTicks(min, max) {
  const range = max - min || 1;
  let step;
  if (range <= 1) step = 0.2;
  else if (range <= 3) step = 0.5;
  else if (range <= 8) step = 1;
  else if (range <= 20) step = 2;
  else step = 5;
  const start = Math.floor(min / step) * step;
  const ticks = [];
  for (let v = start; v <= max + step * 0.01; v = Math.round((v + step) * 100) / 100) {
    ticks.push(Math.round(v * 100) / 100);
  }
  return ticks;
}

// Dark mode
function isDark() {
  return document.documentElement.dataset.theme === 'dark';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.getElementById('themeBtn').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

// Toast
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2500);
}

// Chart
function chartColors() {
  const dark = isDark();
  return {
    grid:        dark ? '#1e3a5f' : '#f0f0f0',
    tick:        dark ? '#64748b' : '#9ca3af',
    pointStroke: dark ? '#1e293b' : '#ffffff',
  };
}

function updateChart(records, period) {
  const filtered = filterByPeriod(records, period);
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  const goal = getGoal();
  const wrapper = document.getElementById('chartWrapper');

  if (sorted.length === 0) {
    wrapper.innerHTML = '<div class="chart-empty">기록을 추가하면 그래프가 표시됩니다.</div>';
    return;
  }

  const W = 760, H = 240;
  const PAD = { top: 24, right: goal !== null ? 42 : 20, bottom: 40, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const weights = sorted.map(r => r.weight);
  if (goal !== null) weights.push(goal);
  const dataMin = Math.min(...weights);
  const dataMax = Math.max(...weights);
  const pad = (dataMax - dataMin) * 0.15 || 0.5;
  const minW = dataMin - pad;
  const maxW = dataMax + pad;

  const xOf = i => PAD.left + (sorted.length === 1 ? cW / 2 : (i / (sorted.length - 1)) * cW);
  const yOf = w => PAD.top + (1 - (w - minW) / (maxW - minW)) * cH;
  const pts = sorted.map((r, i) => ({ x: xOf(i), y: yOf(r.weight), r }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length-1].x.toFixed(1)},${(PAD.top+cH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top+cH).toFixed(1)}Z`;
  const yTicks = niceYTicks(minW, maxW);
  const maxXLabels = Math.min(sorted.length, 8);
  const xLabelIdxs = sorted.length === 1
    ? [0]
    : Array.from({ length: maxXLabels }, (_, i) => Math.round(i * (sorted.length - 1) / (maxXLabels - 1)));
  const goalY = goal !== null ? yOf(goal) : null;
  const c = chartColors();

  const svg = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block">
  <defs>
    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02"/>
    </linearGradient>
    <clipPath id="chartArea">
      <rect x="${PAD.left}" y="${PAD.top}" width="${cW}" height="${cH}"/>
    </clipPath>
  </defs>

  ${yTicks.map(w => {
    const y = yOf(w);
    if (y < PAD.top - 2 || y > PAD.top + cH + 2) return '';
    return `<line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${(PAD.left+cW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="${c.grid}" stroke-width="1"/>
    <text x="${(PAD.left-8).toFixed(1)}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" fill="${c.tick}" font-size="11" font-family="-apple-system,sans-serif">${w % 1 === 0 ? w : w.toFixed(1)}</text>`;
  }).join('')}

  ${goalY !== null ? `
  <line x1="${PAD.left}" y1="${goalY.toFixed(1)}" x2="${(PAD.left+cW).toFixed(1)}" y2="${goalY.toFixed(1)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 4" clip-path="url(#chartArea)"/>
  <text x="${(PAD.left+cW+5).toFixed(1)}" y="${goalY.toFixed(1)}" dominant-baseline="middle" fill="#ef4444" font-size="10" font-family="-apple-system,sans-serif" font-weight="500">목표</text>
  ` : ''}

  <g clip-path="url(#chartArea)">
    <path d="${areaPath}" fill="url(#areaGrad)"/>
    <path d="${linePath}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  </g>

  ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#3b82f6" stroke="${c.pointStroke}" stroke-width="2"/>`).join('')}

  ${xLabelIdxs.map(i => {
    const p = pts[i];
    return `<text x="${p.x.toFixed(1)}" y="${(PAD.top+cH+18).toFixed(1)}" text-anchor="middle" fill="${c.tick}" font-size="11" font-family="-apple-system,sans-serif">${formatDateShort(sorted[i].date)}</text>`;
  }).join('')}

  ${pts.map((p, i) => `<rect class="chart-hit" data-idx="${i}" x="${(p.x-24).toFixed(1)}" y="${PAD.top}" width="48" height="${cH}" fill="transparent" style="cursor:default"/>`).join('')}
</svg>`;

  wrapper.innerHTML = svg;

  wrapper.querySelectorAll('.chart-hit').forEach(el => {
    const update = e => {
      const { r } = pts[parseInt(el.dataset.idx, 10)];
      showTooltip(e, r.weight, r.date, r.memo, r.exercise, r.drink);
    };
    el.addEventListener('mouseenter', update);
    el.addEventListener('mousemove', update);
    el.addEventListener('mouseleave', hideTooltip);
  });
}

function showTooltip(e, weight, date, memo, exercise, drink) {
  const tt = document.getElementById('chartTooltip');
  const card = document.querySelector('.chart-card');
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const badges = [
    exercise ? '<span style="color:#16a34a">🏃 운동</span>' : '',
    drink    ? '<span style="color:#d97706">🍺 음주</span>' : '',
  ].filter(Boolean).join('  ');
  tt.innerHTML = `<strong>${formatDateFull(date)}</strong><br>${weight.toFixed(1)} kg${memo ? `<br><span style="opacity:.7">${memo}</span>` : ''}${badges ? `<br>${badges}` : ''}`;

  const ttW = 150;
  tt.style.left = `${x + 14 + ttW > rect.width ? x - ttW - 6 : x + 14}px`;
  tt.style.top  = `${Math.max(4, y - 44)}px`;
  tt.style.display = 'block';
}

function hideTooltip() {
  document.getElementById('chartTooltip').style.display = 'none';
}

// Stats
function updateStats(records) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const goal = getGoal();
  const current = sorted.length ? sorted[sorted.length-1].weight : null;
  const start   = sorted.length ? sorted[0].weight : null;
  const change  = current !== null && start !== null ? current - start : null;

  document.getElementById('currentWeight').textContent = current !== null ? current.toFixed(1) : '—';
  document.getElementById('startWeight').textContent   = start   !== null ? start.toFixed(1)   : '—';
  document.getElementById('goalWeight').textContent    = goal    !== null ? goal.toFixed(1)     : '—';

  const changeEl   = document.getElementById('weightChange');
  const changeCard = document.getElementById('changeCard');
  if (change !== null) {
    changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
    changeCard.className = 'stat-card ' + (change > 0 ? 'negative' : change < 0 ? 'positive' : '');
  } else {
    changeEl.textContent = '—';
    changeCard.className = 'stat-card';
  }
}

// Records list
function recordsHTML(records) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  if (!sorted.length) return '<p class="empty-msg">아직 기록이 없어요.</p>';
  return sorted.map(r => `
    <div class="record-item">
      <div class="record-left">
        <span class="record-date">${formatDateFull(r.date)}</span>
        <span>
          <span class="record-weight">${parseFloat(r.weight).toFixed(1)}</span>
          <span class="record-unit">kg</span>
          ${r.memo ? `<span class="record-memo">· ${r.memo}</span>` : ''}
        </span>
      </div>
      <div class="record-badges">
        <span class="badge ${r.exercise ? 'badge-exercise' : 'badge-off'}">🏃<span class="badge-text">&nbsp;운동</span></span>
        <span class="badge ${r.drink    ? 'badge-drink'    : 'badge-off'}">🍺<span class="badge-text">&nbsp;음주</span></span>
      </div>
      <button class="record-delete" data-id="${r.id}" title="삭제">×</button>
    </div>
  `).join('');
}

function renderRecords(records) {
  document.getElementById('recordsList').innerHTML = recordsHTML(records);
  const fs = document.getElementById('recordsFullscreen');
  if (fs.classList.contains('open')) {
    document.getElementById('recordsFullList').innerHTML = recordsHTML(records);
    document.getElementById('recordsCount').textContent = `${records.length}개`;
  }
}

// Daily missions
function getMissionStates() {
  const records = getRecords();
  const todayStr = today();
  const todayRecord = records.find(r => r.date === todayStr);

  const yDate = new Date();
  yDate.setDate(yDate.getDate() - 1);
  const yStr = toISODate(yDate);
  const yRecord = records.find(r => r.date === yStr);

  const goal = getGoal();
  const has = !!todayRecord;

  // Week start (Monday)
  const now = new Date();
  const dow = (now.getDay() + 6) % 7; // 0=Mon
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dow);
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const thisWeek = records.filter(r => r.date >= weekStartStr);

  // Streak helpers
  function calcStreak() {
    let count = 0;
    for (let i = 0; i < 99; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      if (records.find(r => r.date === toISODate(d))) count++;
      else break;
    }
    return count;
  }
  const streak = calcStreak();

  const exCount    = thisWeek.filter(r => r.exercise).length;
  const soberCount = thisWeek.filter(r => !r.drink).length;

  const autoDone = {
    streak3:      streak >= 3,
    streak7:      streak >= 7,
    weekly3ex:    exCount >= 3,
    weekly3sober: soberCount >= 3,
    lowestweek:   has && thisWeek.length > 0 && todayRecord.weight <= Math.min(...thisWeek.map(r => r.weight)),
  };

  const autoProgress = {
    streak3:      { cur: Math.min(streak, 3), max: 3 },
    streak7:      { cur: Math.min(streak, 7), max: 7 },
    weekly3ex:    { cur: Math.min(exCount,    3), max: 3 },
    weekly3sober: { cur: Math.min(soberCount, 3), max: 3 },
  };

  const fixed = [
    { id:'record',   icon:'📝', label:'오늘 체중 기록',   done: has,                                                    locked: false, visible: true },
    { id:'exercise', icon:'🏃', label:'오늘 운동 완료',   done: has && todayRecord.exercise === true,                   locked: !has,  visible: true },
    { id:'nodrink',  icon:'🚫', label:'오늘 금주 성공',   done: has && todayRecord.drink === false,                     locked: !has,  visible: true },
    { id:'lighter',  icon:'📉', label:'어제보다 가벼움',   done: has && !!yRecord && todayRecord.weight < yRecord.weight, locked: !has,  visible: !!yRecord },
    { id:'goal',     icon:'🎯', label:'목표 달성!',       done: has && goal !== null && todayRecord.weight <= goal,     locked: !has,  visible: goal !== null },
  ].filter(m => m.visible);

  const checks = getDailyChecks(todayStr);

  const bonus = getDailyBonusMissions().map(m => ({
    ...m,
    done:     m.type === 'auto' ? (autoDone[m.id] ?? false) : checks.has(m.id),
    locked:   false,
    visible:  true,
    progress: m.type === 'auto' ? (autoProgress[m.id] ?? null) : null,
  }));

  return [...fixed, ...bonus];
}

function updateMissions() {
  const el = document.getElementById('dailyMissions');
  if (!el) return;

  const missions = getMissionStates();
  const completedCount = missions.filter(m => m.done).length;
  const total = missions.length;
  const allDone = completedCount === total;
  const hasRecord = missions.find(m => m.id === 'record')?.done ?? false;

  const todayStr = today();
  const rowsHTML = missions.map(m => {
    let stateClass, circleHTML;
    if (m.locked) {
      stateClass = 'mission-locked';
      circleHTML = '<span class="mission-circle mission-circle--locked">🔒</span>';
    } else if (m.done) {
      stateClass = 'mission-done';
      circleHTML = '<span class="mission-circle mission-circle--done">✓</span>';
    } else if (m.type === 'manual') {
      stateClass = 'mission-incomplete';
      circleHTML = '<span class="mission-circle mission-circle--manual"></span>';
    } else {
      stateClass = 'mission-incomplete';
      circleHTML = '<span class="mission-circle mission-circle--empty"></span>';
    }
    const chipHTML = m.progress
      ? `<span class="mission-progress-chip ${m.done ? 'mission-progress-chip--done' : ''}">${m.progress.cur}/${m.progress.max}</span>`
      : (m.type === 'manual' && !m.done ? '<span class="mission-tap-hint">탭하여 완료</span>' : '');
    const manualAttrs = m.type === 'manual' ? `data-mission-id="${m.id}" class="mission-row ${stateClass} mission-row--manual"` : `class="mission-row ${stateClass}"`;
    return `<div ${manualAttrs}>${circleHTML}<span class="mission-label">${m.icon} ${m.label}</span>${chipHTML}</div>`;
  }).join('');

  // Attach click handlers after innerHTML is set (done below)

  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const bottomHTML = allDone
    ? `<div class="mission-celebration">🎉 오늘 미션 완료! 대단해요, 정말 멋진 하루예요!</div>`
    : `<div class="mission-progress-wrap"><div class="mission-progress-bar" style="width:${pct}%"></div></div>
       <span class="mission-progress-label">${completedCount}/${total} 완료</span>`;

  const subtitleHTML = !hasRecord
    ? `<p class="mission-subtitle">체중을 기록하면 미션이 활성화돼요 ✍️</p>`
    : '';

  el.innerHTML = `
    <div class="mission-header">
      <h2>일일 미션</h2>
      <span class="mission-badge">${completedCount}/${total}</span>
    </div>
    ${subtitleHTML}
    <div class="mission-list">${rowsHTML}</div>
    ${bottomHTML}`;

  el.querySelectorAll('[data-mission-id]').forEach(row => {
    row.addEventListener('click', () => toggleDailyCheck(todayStr, row.dataset.missionId));
  });
}

// ── Streak Calendar ──────────────────────────────────────────────────────────
let streakViewYear  = new Date().getFullYear();
let streakViewMonth = new Date().getMonth(); // 0-based

function buildActivityMap() {
  const map = {}; // 'YYYY-MM-DD' → Set of 'pushup'|'tabata'|'exercise'
  const add = (date, type) => {
    if (!map[date]) map[date] = new Set();
    map[date].add(type);
  };
  getPushupLog().forEach(r => add(r.date, 'pushup'));
  try {
    const tlog = JSON.parse(localStorage.getItem(TABATA_LOG_KEY) || '[]');
    tlog.forEach(r => add(r.date, 'tabata'));
  } catch(_) {}
  getRecords().filter(r => r.exercise).forEach(r => add(r.date, 'exercise'));
  return map;
}

// 날짜별 운동량 (팔굽혀펴기 총 개수, 타바타 총 분)
function buildVolumeMap() {
  const map = {}; // 'YYYY-MM-DD' → { pushup, tabataMin }
  const ensure = d => (map[d] = map[d] || { pushup: 0, tabataMin: 0 });
  getPushupLog().forEach(r => { ensure(r.date).pushup += r.count || 0; });
  try {
    const tlog = JSON.parse(localStorage.getItem(TABATA_LOG_KEY) || '[]');
    tlog.forEach(r => { ensure(r.date).tabataMin += (r.durationSec || 0) / 60; });
  } catch(_) {}
  return map;
}

// 운동량이 많으면(팔굽혀펴기 50개 이상 또는 타바타 20분 이상) true
function isHighVolume(vol) {
  if (!vol) return false;
  return vol.pushup >= 50 || vol.tabataMin >= 20;
}

function calcStreakDays(activityMap) {
  let streak = 0;
  const d = new Date();
  // 오늘 활동 없으면 어제부터 체크
  if (!activityMap[toISODate(d)]) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 365; i++) {
    if (activityMap[toISODate(d)]) { streak++; d.setDate(d.getDate() - 1); }
    else break;
  }
  return streak;
}

function renderStreakCalendar() {
  const y = streakViewYear, m = streakViewMonth;
  const actMap = buildActivityMap();
  const volMap = buildVolumeMap();
  const todayStr = today();

  document.getElementById('streakMonthLabel').textContent =
    `${y}년 ${m + 1}월`;

  // 이번 달 첫날 요일 (월=0 … 일=6)
  const firstDay  = new Date(y, m, 1);
  const startDow  = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const cells = [];
  // 앞 빈칸
  for (let i = 0; i < startDow; i++) cells.push(null);
  // 날짜
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const grid = document.getElementById('streakGrid');
  grid.innerHTML = cells.map(d => {
    if (d === null) return '<div class="streak-cell streak-cell--empty"></div>';
    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const acts    = actMap[dateStr] || new Set();
    const isToday  = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const hasAny   = acts.size > 0;

    const dots = ['pushup','tabata','exercise']
      .filter(t => acts.has(t))
      .map(t => `<span class="streak-cell-dot streak-cell-dot--${t}"></span>`)
      .join('');

    // GitHub streak처럼 운동량에 따라 점점 진한 초록.
    // 팔굽혀펴기 50개↑ 또는 타바타 20분↑ 이면 최고 단계(진하게)로.
    let level = Math.min(acts.size, 3);
    if (isHighVolume(volMap[dateStr])) level = 3;
    const cls = [
      'streak-cell',
      isToday  ? 'streak-cell--today'   : '',
      isFuture ? 'streak-cell--future'  : '',
      hasAny   ? `streak-cell--has-activity streak-cell--level${level}` : '',
    ].filter(Boolean).join(' ');

    return `<div class="${cls}" title="${dateStr}">
      <span class="streak-cell-day">${d}</span>
      <div class="streak-cell-dots">${dots}</div>
    </div>`;
  }).join('');

  // 요약 통계
  const streak = calcStreakDays(actMap);
  const monthDates = Object.keys(actMap).filter(k => k.startsWith(`${y}-${String(m+1).padStart(2,'0')}`));
  const monthActive = monthDates.length;
  const totalDays   = Object.keys(actMap).length;

  document.getElementById('streakSummary').innerHTML = `
    <div class="streak-stat">
      <span class="streak-stat-val">${streak}</span>
      <span class="streak-stat-label">연속 운동일</span>
    </div>
    <div class="streak-stat">
      <span class="streak-stat-val">${monthActive}</span>
      <span class="streak-stat-label">이번 달 활동일</span>
    </div>
    <div class="streak-stat">
      <span class="streak-stat-val">${totalDays}</span>
      <span class="streak-stat-label">누적 활동일</span>
    </div>
  `;
}

document.getElementById('streakPrev').addEventListener('click', () => {
  streakViewMonth--;
  if (streakViewMonth < 0) { streakViewMonth = 11; streakViewYear--; }
  renderStreakCalendar();
});
document.getElementById('streakNext').addEventListener('click', () => {
  streakViewMonth++;
  if (streakViewMonth > 11) { streakViewMonth = 0; streakViewYear++; }
  renderStreakCalendar();
});

function render() {
  const records = getRecords();
  updateStats(records);
  updateChart(records, currentPeriod);
  renderRecords(records);
  updateMissions();
  renderStreakCalendar();
}

// Export
function exportRecords() {
  const data = { records: getRecords(), goal: getGoal(), exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `body-weight-${today()}.json` });
  a.click();
  URL.revokeObjectURL(url);
}

// Import
function importRecords(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      const records = Array.isArray(data) ? data : (data.records || []);
      if (!Array.isArray(records) || !records.every(r => r.date && typeof r.weight === 'number')) {
        throw new Error('invalid');
      }
      saveRecords(records);
      if (!Array.isArray(data) && data.goal != null) saveGoal(data.goal);
      render();
      showToast(`${records.length}개 기록을 가져왔습니다.`);
    } catch {
      showToast('파일 형식이 올바르지 않아요.');
    }
  };
  reader.readAsText(file);
}

// Events
document.getElementById('recordForm').addEventListener('submit', e => {
  e.preventDefault();
  const date   = document.getElementById('date').value;
  const weight = parseFloat(document.getElementById('weight').value);
  const memo   = document.getElementById('memo').value.trim();
  if (!date || isNaN(weight) || weight <= 0) return;

  const exercise = document.getElementById('exerciseBtn').classList.contains('active');
  const drink    = document.getElementById('drinkBtn').classList.contains('active');

  const records = getRecords();
  const idx = records.findIndex(r => r.date === date);
  if (idx !== -1) {
    Object.assign(records[idx], { weight, memo, exercise, drink });
  } else {
    records.push({ id: Date.now(), date, weight, memo, exercise, drink });
  }
  saveRecords(records);

  document.getElementById('weight').value = '';
  document.getElementById('memo').value   = '';
  document.getElementById('exerciseBtn').classList.remove('active');
  document.getElementById('drinkBtn').classList.remove('active');
  render();
});

document.getElementById('recordsList').addEventListener('click', e => {
  const btn = e.target.closest('.record-delete');
  if (!btn) return;
  saveRecords(getRecords().filter(r => r.id !== parseInt(btn.dataset.id, 10)));
  render();
});

document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPeriod = btn.dataset.period;
    updateChart(getRecords(), currentPeriod);
  });
});

document.getElementById('goalBtn').addEventListener('click', () => {
  const goal = getGoal();
  document.getElementById('goalInput').value = goal !== null ? goal : '';
  openOverlay('goalModal', false);
});
document.getElementById('cancelGoal').addEventListener('click', () => {
  closeOverlay('goalModal', false);
});
document.getElementById('saveGoal').addEventListener('click', () => {
  const raw = document.getElementById('goalInput').value;
  saveGoal(raw !== '' ? parseFloat(raw) : null);
  closeOverlay('goalModal', false);
  render();
});
document.getElementById('goalModal').addEventListener('click', e => {
  if (e.target === document.getElementById('goalModal')) closeOverlay('goalModal', false);
});

document.getElementById('expandRecordsBtn').addEventListener('click', () => {
  const records = getRecords();
  document.getElementById('recordsFullList').innerHTML = recordsHTML(records);
  document.getElementById('recordsCount').textContent = `${records.length}개`;
  openOverlay('recordsFullscreen');
});

document.getElementById('closeFullscreen').addEventListener('click', () => {
  closeOverlay('recordsFullscreen');
});

document.getElementById('recordsFullList').addEventListener('click', e => {
  const btn = e.target.closest('.record-delete');
  if (!btn) return;
  saveRecords(getRecords().filter(r => r.id !== parseInt(btn.dataset.id, 10)));
  render();
});

['exerciseBtn', 'drinkBtn'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    document.getElementById(id).classList.toggle('active');
  });
});

document.getElementById('themeBtn').addEventListener('click', () => {
  applyTheme(isDark() ? 'light' : 'dark');
  updateChart(getRecords(), currentPeriod);
});

document.getElementById('exportBtn').addEventListener('click', exportRecords);

document.getElementById('importBtn').addEventListener('click', () => {
  document.getElementById('importFile').value = '';
  document.getElementById('importFile').click();
});
document.getElementById('importFile').addEventListener('change', e => {
  if (e.target.files[0]) importRecords(e.target.files[0]);
});

// Mission settings — long-press on card header to open
(function () {
  const header = document.querySelector('#dailyMissions');
  let timer;
  const start = () => { timer = setTimeout(openMissionSettings, 600); };
  const cancel = () => clearTimeout(timer);
  header.addEventListener('touchstart', e => { if (e.target.closest('h2')) start(); }, { passive: true });
  header.addEventListener('touchend', cancel);
  header.addEventListener('touchmove', cancel);
  header.addEventListener('mousedown', e => { if (e.target.closest('h2')) start(); });
  header.addEventListener('mouseup', cancel);
  header.addEventListener('mouseleave', cancel);
})();

document.getElementById('closeMissionSettings').addEventListener('click', closeMissionSettings);
document.getElementById('missionSettings').addEventListener('click', e => {
  if (e.target === document.getElementById('missionSettings')) closeMissionSettings();
});

document.getElementById('msDefaultList').addEventListener('click', e => {
  const btn = e.target.closest('.ms-toggle');
  if (!btn) return;
  const cfg = getMissionCfg();
  const s = new Set(cfg.disabled || []);
  if (s.has(btn.dataset.id)) s.delete(btn.dataset.id); else s.add(btn.dataset.id);
  cfg.disabled = [...s];
  saveMissionCfg(cfg);
  renderMissionSettings();
  updateMissions();
});
document.getElementById('msCustomList').addEventListener('click', e => {
  const btn = e.target.closest('.ms-delete');
  if (!btn) return;
  const cfg = getMissionCfg();
  cfg.custom = (cfg.custom || []).filter(m => m.id !== btn.dataset.id);
  saveMissionCfg(cfg);
  renderMissionSettings();
  updateMissions();
});

document.getElementById('msAddForm').addEventListener('submit', e => {
  e.preventDefault();
  const icon  = document.getElementById('msNewIcon').value.trim() || '⭐';
  const label = document.getElementById('msNewLabel').value.trim();
  if (!label) return;
  const cfg = getMissionCfg();
  cfg.custom = cfg.custom || [];
  cfg.custom.push({ id: `custom_${Date.now()}`, icon, label, type: 'manual' });
  saveMissionCfg(cfg);
  document.getElementById('msNewIcon').value  = '';
  document.getElementById('msNewLabel').value = '';
  renderMissionSettings();
  updateMissions();
  showToast('미션이 추가됐어요!');
});

// ── Tabata Timer ──────────────────────────────────────────────────────────────
const TABATA_KEY = 'bodyweight_tabata';
const PRESETS_KEY = 'bodyweight_tabata_presets';

// Wake Lock
let wakeLock = null;
async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch(_) {}
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release(); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && tabata.intervalId !== null) requestWakeLock();
});

// Presets
function getPresets() {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || []; } catch { return []; }
}
function savePresetsData(arr) { localStorage.setItem(PRESETS_KEY, JSON.stringify(arr)); }

function syncSettingsDisplay() {
  document.getElementById('exTimeSec').textContent       = tabata.settings.exTime;
  document.getElementById('restTimeSec').textContent     = tabata.settings.restTime;
  document.getElementById('roundCount').textContent      = tabata.settings.rounds;
  document.getElementById('warmupTimeSec').textContent   = tabata.settings.warmupTime;
  document.getElementById('cooldownTimeSec').textContent = tabata.settings.cooldownTime;
}

function renderPresets() {
  const presets = getPresets();
  const list = document.getElementById('tabataPresetsList');
  if (!presets.length) {
    list.innerHTML = '<span class="presets-empty">저장된 프리셋이 없어요</span>';
    return;
  }
  list.innerHTML = presets.map((p, i) => `
    <div class="preset-chip" data-idx="${i}">
      <span class="preset-chip-name">${p.name}</span>
      <button class="preset-chip-del" data-idx="${i}">×</button>
    </div>`).join('');
}

// Web Audio beeps
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}
function beep(freq, dur, vol = 0.4) {
  try {
    const ctx = getAudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.start(); o.stop(ctx.currentTime + dur);
  } catch(_) {}
}
function bellStrike(freq, duration, vol = 0.5) {
  try {
    const ctx = getAudioCtx();
    [freq, freq * 2.0, freq * 2.76].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f;
      g.gain.setValueAtTime([vol, vol * 0.4, vol * 0.2][i], ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      o.start(); o.stop(ctx.currentTime + duration);
    });
  } catch(_) {}
}
function soundTick()     { bellStrike(1100, 0.06, 0.35); }
function soundExercise() { bellStrike(650, 1.8, 0.6); }
function soundRest()     { bellStrike(500, 1.5, 0.45); setTimeout(() => bellStrike(500, 1.5, 0.35), 400); }
function soundDone()     { [0, 180, 360, 540].forEach(t => setTimeout(() => bellStrike(580, 1.2, 0.5), t)); }
function soundWarmup()   { bellStrike(750, 2.0, 0.5); setTimeout(() => bellStrike(820, 1.8, 0.4), 500); }
function soundCooldown() { bellStrike(600, 2.0, 0.45); setTimeout(() => bellStrike(520, 2.0, 0.35), 600); }
function soundSetRest()  { bellStrike(450, 1.8, 0.5); setTimeout(() => bellStrike(450, 1.5, 0.4), 450); setTimeout(() => bellStrike(450, 1.2, 0.3), 900); }

const DEFAULT_PHRASES = [
  "Good boy~",
  "Amazing work!",
  "You crushed it!",
  "Absolutely killing it!",
  "That's what I'm talking about!",
  "You're on fire!",
];
const PHRASES_KEY = 'bodyweight_phrases';
function getPhrases() {
  const saved = localStorage.getItem(PHRASES_KEY);
  return saved ? JSON.parse(saved) : [...DEFAULT_PHRASES];
}
function savePhrases(arr) {
  localStorage.setItem(PHRASES_KEY, JSON.stringify(arr));
}
function speakDone() {
  if (!window.speechSynthesis) return;
  const phrases = getPhrases();
  if (!phrases.length) return;
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  const utt = new SpeechSynthesisUtterance(phrase);
  utt.lang = 'en-US';
  utt.rate = 0.9;
  utt.pitch = 1.1;
  speechSynthesis.cancel();
  speechSynthesis.speak(utt);
}

// Phrases panel
function renderPhrasesList() {
  const phrases = getPhrases();
  const list = document.getElementById('phrasesList');
  list.innerHTML = phrases.length
    ? phrases.map((p, i) => `<div class="ms-row">
        <span class="ms-label">${p}</span>
        <button class="ms-delete" data-idx="${i}">삭제</button>
      </div>`).join('')
    : '<p class="ms-empty">등록된 멘트가 없어요</p>';
}
function openPhrasesPanel() {
  renderPhrasesList();
  openOverlay('phrasesPanel');
}
function closePhrasesPanel() {
  closeOverlay('phrasesPanel');
}

// State
const tabata = {
  phase: 'idle', // idle | warmup | prepare | exercise | rest | cooldown | done
  round: 1,
  timeLeft: 3,
  settings: { exTime: 40, restTime: 10, rounds: 8, warmupTime: 60, cooldownTime: 60, warmupEnabled: false, cooldownEnabled: false },
  paused: false,
  intervalId: null,
};

function loadTabataSettings() {
  try { return JSON.parse(localStorage.getItem(TABATA_KEY)) || {}; } catch { return {}; }
}
function saveTabataSettings() {
  localStorage.setItem(TABATA_KEY, JSON.stringify(tabata.settings));
}

function applyToggleUI(enabledKey, stepperRowId, btnId) {
  const isOn = tabata.settings[enabledKey];
  const btn = document.getElementById(btnId);
  btn.textContent = isOn ? 'ON' : 'OFF';
  btn.classList.toggle('on', isOn);
  document.getElementById(stepperRowId).style.display = isOn ? '' : 'none';
}

function openTabata() {
  const saved = loadTabataSettings();
  tabata.settings = { exTime: 40, restTime: 10, rounds: 8, warmupTime: 60, cooldownTime: 60, warmupEnabled: false, cooldownEnabled: false, ...saved };
  syncSettingsDisplay();
  applyToggleUI('warmupEnabled',   'warmupStepperRow',   'warmupToggle');
  applyToggleUI('cooldownEnabled', 'cooldownStepperRow', 'cooldownToggle');
  renderPresets();
  showTabataView('idle');
  openOverlay('tabataOverlay');
}
function closeTabata() {
  stopTabataTimer();
  closePhrasesPanel();
  document.getElementById('tabataOverlay').style.background = '';
  closeOverlay('tabataOverlay');
}
function showTabataView(view) {
  document.getElementById('tabataIdle').style.display    = view === 'idle'    ? 'flex' : 'none';
  document.getElementById('tabataRunning').style.display = view === 'running' ? 'flex' : 'none';
  document.getElementById('tabataDone').style.display    = view === 'done'    ? 'flex' : 'none';
}

function startTabataTimer() {
  tabata.round  = 1;
  tabata.paused = false;
  document.getElementById('tabataPause').textContent = '일시정지';
  if (tabata.settings.warmupEnabled && tabata.settings.warmupTime > 0) {
    tabata.phase    = 'warmup';
    tabata.timeLeft = tabata.settings.warmupTime;
    soundWarmup();
  } else {
    tabata.phase    = 'prepare';
    tabata.timeLeft = 3;
    soundTick();
  }
  showTabataView('running');
  updateTabataDisplay();
  tabata.intervalId = setInterval(tickTabata, 1000);
  requestWakeLock();
}
function stopTabataTimer() {
  clearInterval(tabata.intervalId);
  tabata.intervalId = null;
  releaseWakeLock();
}

function finishTabata() {
  stopTabataTimer();
  tabata.phase = 'done';
  soundDone();
  setTimeout(speakDone, 700);
  document.getElementById('tabataDoneSub').textContent =
    `${tabata.settings.rounds}라운드 모두 완료했어요 💪`;
  showTabataView('done');
  document.getElementById('tabataOverlay').style.background = '';
  // 타바타 완료 기록 저장 (운동량 표시용으로 총 소요 시간(초)도 저장)
  const s = tabata.settings;
  let durationSec = 3 + s.rounds * s.exTime + Math.max(0, s.rounds - 1) * s.restTime;
  if (s.warmupEnabled)   durationSec += s.warmupTime;
  if (s.cooldownEnabled) durationSec += s.cooldownTime;
  const tlog = JSON.parse(localStorage.getItem(TABATA_LOG_KEY) || '[]');
  tlog.push({ id: Date.now(), date: today(), rounds: s.rounds, durationSec });
  localStorage.setItem(TABATA_LOG_KEY, JSON.stringify(tlog));
  renderStreakCalendar();
}

function tickTabata() {
  if (tabata.paused) return;
  tabata.timeLeft--;

  if (tabata.timeLeft > 0 && tabata.timeLeft <= 3) soundTick();

  if (tabata.timeLeft <= 0) {
    const { settings } = tabata;

    if (tabata.phase === 'warmup') {
      tabata.phase    = 'prepare';
      tabata.timeLeft = 3;
      soundTick();
    } else if (tabata.phase === 'prepare') {
      tabata.phase    = 'exercise';
      tabata.timeLeft = settings.exTime;
      soundExercise();
    } else if (tabata.phase === 'exercise') {
      if (tabata.round >= settings.rounds) {
        if (settings.cooldownEnabled && settings.cooldownTime > 0) {
          tabata.phase    = 'cooldown';
          tabata.timeLeft = settings.cooldownTime;
          soundCooldown();
        } else {
          finishTabata();
          return;
        }
      } else {
        tabata.phase    = 'rest';
        tabata.timeLeft = settings.restTime;
        soundRest();
      }
    } else if (tabata.phase === 'rest') {
      tabata.round++;
      tabata.phase    = 'exercise';
      tabata.timeLeft = settings.exTime;
      soundExercise();
    } else if (tabata.phase === 'cooldown') {
      finishTabata();
      return;
    }
  }
  updateTabataDisplay();
}

function updateTabataDisplay() {
  const { phase, round, timeLeft, settings } = tabata;
  const phaseEl = document.getElementById('tabataPhaseLabel');
  const roundEl = document.getElementById('tabataRoundLabel');
  const timeEl  = document.getElementById('tabataTimeDisplay');

  const labels  = { prepare: '준비', exercise: '운동', rest: '휴식', warmup: '웜업', cooldown: '쿨다운' };
  const classes = { prepare: 'phase-prepare', exercise: 'phase-exercise', rest: 'phase-rest', warmup: 'phase-warmup', cooldown: 'phase-cooldown' };
  const bgLight = { exercise: '#f0fdf4', rest: '#eff6ff', prepare: '', warmup: '#fff7ed', cooldown: '#faf5ff' };
  const bgDark  = { exercise: '#052e16', rest: '#0c1a3a', prepare: '', warmup: '#431407', cooldown: '#1e1b4b' };

  const roundText = {
    prepare: '시작 준비',
    warmup: '웜업 중',
    cooldown: '쿨다운 중',
  };

  phaseEl.textContent = labels[phase] || '';
  phaseEl.className   = `tabata-phase-label ${classes[phase] || ''}`;
  roundEl.textContent = roundText[phase] || `${round} / ${settings.rounds}`;
  timeEl.textContent  = timeLeft;
  timeEl.className    = `tabata-time-display ${classes[phase] || ''}`;

  const bg = isDark() ? bgDark[phase] : bgLight[phase];
  document.getElementById('tabataOverlay').style.background = bg || '';
}

// Stepper helper
function makeStepper(decId, incId, key, displayId, step, min, max, bigDecId, bigIncId, bigStep) {
  function update(delta) {
    tabata.settings[key] = Math.min(max, Math.max(min, tabata.settings[key] + delta));
    document.getElementById(displayId).textContent = tabata.settings[key];
  }
  document.getElementById(decId).addEventListener('click', () => update(-step));
  document.getElementById(incId).addEventListener('click', () => update(step));
  if (bigDecId && bigIncId && bigStep) {
    document.getElementById(bigDecId).addEventListener('click', () => update(-bigStep));
    document.getElementById(bigIncId).addEventListener('click', () => update(bigStep));
  }
}
makeStepper('exDec',       'exInc',       'exTime',      'exTimeSec',       15, 15, 300);
makeStepper('restDec',     'restInc',     'restTime',    'restTimeSec',     15, 15, 300);
makeStepper('roundDec',    'roundInc',    'rounds',      'roundCount',       1,  1,  99);
makeStepper('warmupDec',   'warmupInc',   'warmupTime',  'warmupTimeSec',   30, 30, 300);
makeStepper('cooldownDec', 'cooldownInc', 'cooldownTime','cooldownTimeSec', 30, 30, 300);

document.getElementById('warmupToggle').addEventListener('click', () => {
  tabata.settings.warmupEnabled = !tabata.settings.warmupEnabled;
  applyToggleUI('warmupEnabled', 'warmupStepperRow', 'warmupToggle');
});
document.getElementById('cooldownToggle').addEventListener('click', () => {
  tabata.settings.cooldownEnabled = !tabata.settings.cooldownEnabled;
  applyToggleUI('cooldownEnabled', 'cooldownStepperRow', 'cooldownToggle');
});

document.getElementById('tabataFab').addEventListener('click', openTabata);
document.getElementById('tabataClose').addEventListener('click', closeTabata);
document.getElementById('tabataOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('tabataOverlay')) closeTabata();
});
document.getElementById('tabataStart').addEventListener('click', () => {
  saveTabataSettings();
  startTabataTimer();
});
document.getElementById('tabataAgain').addEventListener('click', () => {
  document.getElementById('tabataOverlay').style.background = '';
  showTabataView('idle');
});
document.getElementById('tabataPause').addEventListener('click', () => {
  tabata.paused = !tabata.paused;
  document.getElementById('tabataPause').textContent = tabata.paused ? '계속하기' : '일시정지';
});
document.getElementById('tabataReset').addEventListener('click', () => {
  stopTabataTimer();
  document.getElementById('tabataOverlay').style.background = '';
  showTabataView('idle');
});
document.getElementById('tabataAddTime').addEventListener('click', () => {
  if (tabata.phase === 'prepare' || tabata.phase === 'idle' || tabata.phase === 'done') return;
  tabata.timeLeft += 30;
  updateTabataDisplay();
});

// Preset events
document.getElementById('tabataPresetsList').addEventListener('click', e => {
  const del = e.target.closest('.preset-chip-del');
  if (del) {
    const presets = getPresets();
    presets.splice(parseInt(del.dataset.idx, 10), 1);
    savePresetsData(presets);
    renderPresets();
    return;
  }
  const chip = e.target.closest('.preset-chip');
  if (chip) {
    const presets = getPresets();
    const p = presets[parseInt(chip.dataset.idx, 10)];
    if (!p) return;
    tabata.settings = { ...tabata.settings, ...p };
    syncSettingsDisplay();
    showToast('프리셋을 불러왔어요!');
  }
});
document.getElementById('tabataPresetSaveBtn').addEventListener('click', () => {
  document.getElementById('presetNameForm').style.display = 'flex';
  document.getElementById('presetNameInput').focus();
});
document.getElementById('presetNameConfirm').addEventListener('click', () => {
  const name = document.getElementById('presetNameInput').value.trim();
  if (!name) return;
  const { exTime, restTime, rounds, warmupTime, cooldownTime } = tabata.settings;
  const presets = getPresets();
  presets.push({ name, exTime, restTime, rounds, warmupTime, cooldownTime });
  savePresetsData(presets);
  document.getElementById('presetNameInput').value = '';
  document.getElementById('presetNameForm').style.display = 'none';
  renderPresets();
  showToast('프리셋이 저장됐어요!');
});
document.getElementById('presetNameCancel').addEventListener('click', () => {
  document.getElementById('presetNameInput').value = '';
  document.getElementById('presetNameForm').style.display = 'none';
});
document.getElementById('presetNameForm').addEventListener('submit', e => e.preventDefault());

// Phrases panel events
document.getElementById('closePhrases').addEventListener('click', closePhrasesPanel);
document.getElementById('phrasesPanel').addEventListener('click', e => {
  if (e.target === document.getElementById('phrasesPanel')) closePhrasesPanel();
});
document.getElementById('phrasesList').addEventListener('click', e => {
  const btn = e.target.closest('.ms-delete');
  if (!btn) return;
  const phrases = getPhrases();
  phrases.splice(parseInt(btn.dataset.idx, 10), 1);
  savePhrases(phrases);
  renderPhrasesList();
});
document.getElementById('phrasesAddForm').addEventListener('submit', e => {
  e.preventDefault();
  const text = document.getElementById('phrasesNewText').value.trim();
  if (!text) return;
  const phrases = getPhrases();
  phrases.push(text);
  savePhrases(phrases);
  document.getElementById('phrasesNewText').value = '';
  renderPhrasesList();
  showToast('멘트가 추가됐어요!');
});

document.getElementById('tabataPhrasesBtn').addEventListener('click', openPhrasesPanel);

// ── 긍정 확언 플레이리스트 ────────────────────────────────────────────────────
const AFFIRMATION_KEY = 'bodyweight_affirmations';

function getAffirmations() {
  const raw = JSON.parse(localStorage.getItem(AFFIRMATION_KEY) || '[]');
  // 이전 버전(string 배열) 마이그레이션
  return raw.map(item => typeof item === 'string' ? { text: item, voiceName: '' } : item);
}
function saveAffirmations(arr) {
  localStorage.setItem(AFFIRMATION_KEY, JSON.stringify(arr));
}

// 최면/명상 배경음 노드 참조
let hypnoNodes = null;
let hypnoMasterGain = null;

function startHypnoticMusic(volume) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    hypnoMasterGain = ctx.createGain();
    hypnoMasterGain.gain.setValueAtTime(0, ctx.currentTime);
    hypnoMasterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3);
    hypnoMasterGain.connect(ctx.destination);

    // 드론음 A: 432 Hz
    const osc1 = ctx.createOscillator();
    const g1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 432;
    g1.gain.value = 0.35;
    osc1.connect(g1); g1.connect(hypnoMasterGain);
    osc1.start();

    // 드론음 B: 436 Hz (binaural beat 4 Hz — 세타파)
    const osc2 = ctx.createOscillator();
    const g2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 436;
    g2.gain.value = 0.35;
    osc2.connect(g2); g2.connect(hypnoMasterGain);
    osc2.start();

    // 저주파 서브 베이스 (128 Hz)
    const osc3 = ctx.createOscillator();
    const g3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.value = 128;
    g3.gain.value = 0.15;
    osc3.connect(g3); g3.connect(hypnoMasterGain);
    osc3.start();

    // 느린 LFO (0.05 Hz) — 볼륨 천천히 맥동
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 0.08;
    lfo.connect(lfoGain); lfoGain.connect(hypnoMasterGain.gain);
    lfo.start();

    // 화이트 노이즈 (lowpass 필터로 부드럽게)
    const bufSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 200;
    const ng = ctx.createGain();
    ng.gain.value = 0.04;
    noise.connect(lpf); lpf.connect(ng); ng.connect(hypnoMasterGain);
    noise.start();

    hypnoNodes = [osc1, osc2, osc3, lfo, noise];
  } catch(_) {}
}

function stopHypnoticMusic() {
  try {
    if (hypnoMasterGain) {
      const ctx = getAudioCtx();
      hypnoMasterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
      const nodes = hypnoNodes;
      const gain  = hypnoMasterGain;
      setTimeout(() => {
        nodes?.forEach(n => { try { n.stop(); } catch(_) {} });
        gain?.disconnect();
      }, 1600);
      hypnoNodes = null;
      hypnoMasterGain = null;
    }
  } catch(_) {}
}

function setHypnoVolume(vol) {
  if (hypnoMasterGain) {
    try {
      hypnoMasterGain.gain.setTargetAtTime(vol, getAudioCtx().currentTime, 0.3);
    } catch(_) {}
  }
}

// 확언 TTS — 한국어/영어 음성만 사용
function getKoEnVoices() {
  if (!window.speechSynthesis) return [];
  return speechSynthesis.getVoices().filter(v => v.lang.startsWith('ko') || v.lang.startsWith('en'));
}

function buildVoiceOptions(selectedName) {
  const voices = getKoEnVoices();
  if (!voices.length) return '<option value="">음성 로딩 중...</option>';
  return voices.map(v => {
    const flag = v.lang.startsWith('ko') ? '🇰🇷 ' : '🇺🇸 ';
    const sel  = v.name === selectedName ? ' selected' : '';
    return `<option value="${v.name}"${sel}>${flag}${v.name} (${v.lang})</option>`;
  }).join('');
}

// 음성 목록 초기화 (브라우저가 비동기로 로드하는 경우 대응)
function populateVoiceSelects() {
  if (!window.speechSynthesis) return;
  const voices = getKoEnVoices();
  if (!voices.length) return;

  // 추가 폼의 음성 선택
  const newSel = document.getElementById('affirmationNewVoice');
  if (newSel) {
    const prev = newSel.value;
    newSel.innerHTML = buildVoiceOptions(prev);
    // 기본값: 한국어 음성 우선
    if (!prev) {
      const koVoice = voices.find(v => v.lang.startsWith('ko'));
      newSel.value = koVoice ? koVoice.name : voices[0].name;
    }
  }

  // 기존 아이템 행의 음성 선택 (렌더링 후 채움)
  document.querySelectorAll('.affirmation-item-voice').forEach(sel => {
    const current = sel.value;
    sel.innerHTML = buildVoiceOptions(current);
    if (current) sel.value = current;
  });
}

if (window.speechSynthesis) {
  populateVoiceSelects();
  speechSynthesis.addEventListener('voiceschanged', populateVoiceSelects);
}

function speakAffirmation(item, onEnd) {
  if (!window.speechSynthesis) { onEnd?.(); return; }
  speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(item.text);

  const voices = getKoEnVoices();
  const found  = voices.find(v => v.name === item.voiceName);
  if (found) {
    utt.voice = found;
  } else {
    // voiceName 미지정 시 한국어 음성 기본
    const ko = voices.find(v => v.lang.startsWith('ko'));
    if (ko) utt.voice = ko;
  }

  utt.rate   = parseFloat(document.getElementById('affirmationRate')?.value  ?? 0.75);
  utt.pitch  = parseFloat(document.getElementById('affirmationPitch')?.value ?? 0.9);
  utt.volume = parseInt(document.getElementById('affirmationSpeechVol')?.value ?? 100, 10) / 100;
  utt.onend  = () => onEnd?.();
  speechSynthesis.speak(utt);
}

// 확언 상태
const affState = {
  playing: false,
  paused: false,
  currentIndex: 0,
  items: [],
  pauseTimeout: null,
};

function renderAffirmationItems() {
  const items = getAffirmations();
  const el = document.getElementById('affirmationItems');
  if (!items.length) {
    el.innerHTML = '<p class="ms-empty">확언을 추가해보세요 🌱</p>';
    return;
  }
  el.innerHTML = items.map((item, i) => `
    <div class="affirmation-item" data-idx="${i}">
      <div class="affirmation-item-top">
        <span class="affirmation-item-num">${i + 1}</span>
        <span class="affirmation-item-text">${item.text}</span>
        <button class="affirmation-edit-btn" data-idx="${i}" title="수정">✏️</button>
        <button class="ms-delete" data-idx="${i}">삭제</button>
      </div>
      <div class="affirmation-item-voice-row">
        <span class="affirmation-voice-label">🗣️ 음성</span>
        <select class="affirmation-select affirmation-item-voice" data-idx="${i}">
          ${buildVoiceOptions(item.voiceName)}
        </select>
      </div>
    </div>`).join('');
}

function startEditAffirmation(idx) {
  const items = getAffirmations();
  const item = items[idx];
  if (!item) return;
  const el = document.querySelector(`.affirmation-item[data-idx="${idx}"]`);
  if (!el) return;
  const top = el.querySelector('.affirmation-item-top');
  top.innerHTML = `
    <span class="affirmation-item-num">${idx + 1}</span>
    <textarea class="affirmation-textarea affirmation-edit-textarea" rows="3">${item.text}</textarea>
    <button class="affirmation-edit-confirm-btn" data-idx="${idx}" title="저장">✓</button>
    <button class="affirmation-edit-cancel-btn" data-idx="${idx}" title="취소">✕</button>
  `;
  top.querySelector('.affirmation-edit-textarea').focus();
}

function confirmEditAffirmation(idx) {
  const el = document.querySelector(`.affirmation-item[data-idx="${idx}"]`);
  if (!el) return;
  const textarea = el.querySelector('.affirmation-edit-textarea');
  const newText = textarea?.value.trim();
  if (!newText) { showToast('내용을 입력해주세요'); return; }
  const items = getAffirmations();
  if (items[idx]) {
    items[idx].text = newText;
    saveAffirmations(items);
    showToast('수정됐어요 ✨');
  }
  renderAffirmationItems();
}

function showAffirmationView(view) {
  document.getElementById('affirmationList').style.display   = view === 'list'   ? 'flex' : 'none';
  document.getElementById('affirmationPlayer').style.display = view === 'player' ? 'flex' : 'none';
}

function updatePlayerDisplay() {
  const items = affState.items;
  const idx   = affState.currentIndex;

  const list = document.getElementById('affirmationPlayerList');
  if (list) {
    list.innerHTML = items.map((item, i) =>
      `<div class="affirmation-player-item${i === idx ? ' affirmation-player-item--active' : ''}" data-idx="${i}">${item.text || ''}</div>`
    ).join('');
    const active = list.querySelector('.affirmation-player-item--active');
    if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  document.getElementById('affirmationProgressLabel').textContent = `${idx + 1} / ${items.length}`;
  document.getElementById('affirmationPauseBtn').textContent = affState.paused ? '▶' : '⏸';
  updateMediaSession();
}

function playNextAffirmation() {
  if (!affState.playing) return;
  updatePlayerDisplay();

  // 확언 읽기 후 1.5초 쉬고 다음으로
  speakAffirmation(affState.items[affState.currentIndex], () => {
    if (!affState.playing || affState.paused) return;
    affState.pauseTimeout = setTimeout(() => {
      if (!affState.playing || affState.paused) return;
      affState.currentIndex = (affState.currentIndex + 1) % affState.items.length;
      playNextAffirmation();
    }, 1500);
  });
}

// 백그라운드 재생 유지: 무음 keepalive 오디오 (화면 꺼짐 시 오디오 포커스 유지)
let _keepaliveSource = null;
function startKeepalive() {
  try {
    const ctx = getAudioCtx();
    if (_keepaliveSource) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    src.connect(g); g.connect(ctx.destination);
    src.start();
    _keepaliveSource = src;
  } catch(_) {}
}
function stopKeepalive() {
  try { _keepaliveSource?.stop(); } catch(_) {}
  _keepaliveSource = null;
}

function updateMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const item = affState.items[affState.currentIndex];
  navigator.mediaSession.metadata = new MediaMetadata({
    title: item?.text || '확언',
    artist: `${affState.currentIndex + 1} / ${affState.items.length}`,
    album: '긍정 확언',
  });
  navigator.mediaSession.playbackState = affState.paused ? 'paused' : 'playing';
  navigator.mediaSession.setActionHandler('play',          () => { if (affState.paused) pauseResumeAffirmations(); });
  navigator.mediaSession.setActionHandler('pause',         () => { if (!affState.paused) pauseResumeAffirmations(); });
  navigator.mediaSession.setActionHandler('nexttrack',     () => skipAffirmation());
  navigator.mediaSession.setActionHandler('stop',          () => stopAffirmations());
}

// 화면이 다시 켜졌을 때 TTS가 끊겼으면 재시작
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && affState.playing && !affState.paused) {
    if (!speechSynthesis.speaking && !speechSynthesis.pending) {
      playNextAffirmation();
    }
  }
});

function isBgmEnabled() {
  return document.getElementById('affirmationBgmEnabled')?.checked ?? true;
}

function startAffirmations() {
  const items = getAffirmations();
  if (!items.length) { showToast('확언을 먼저 추가해주세요!'); return; }
  affState.playing      = true;
  affState.paused       = false;
  affState.currentIndex = 0;
  affState.items        = [...items];

  if (isBgmEnabled()) {
    const vol = parseInt(document.getElementById('affirmationVolume').value, 10) / 100 * 0.6;
    startHypnoticMusic(vol);
  }
  startKeepalive();
  updateMediaSession();
  showAffirmationView('player');
  playNextAffirmation();
}

function pauseResumeAffirmations() {
  if (!affState.playing) return;
  if (affState.paused) {
    affState.paused = false;
    if (isBgmEnabled()) {
      const vol = parseInt(document.getElementById('affirmationVolume').value, 10) / 100 * 0.6;
      setHypnoVolume(vol);
    }
    speechSynthesis.resume();
    // resume이 안 될 경우 현재 항목부터 다시 재생
    if (!speechSynthesis.speaking) playNextAffirmation();
    document.getElementById('affirmationPauseBtn').textContent = '⏸';
  } else {
    affState.paused = true;
    clearTimeout(affState.pauseTimeout);
    speechSynthesis.pause();
    setHypnoVolume(0.05);
    document.getElementById('affirmationPauseBtn').textContent = '▶';
  }
}

function stopAffirmations() {
  affState.playing = false;
  affState.paused  = false;
  clearTimeout(affState.pauseTimeout);
  speechSynthesis.cancel();
  stopHypnoticMusic();
  stopKeepalive();
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
  showAffirmationView('list');
}

function skipAffirmation() {
  if (!affState.playing) return;
  clearTimeout(affState.pauseTimeout);
  speechSynthesis.cancel();
  affState.currentIndex = (affState.currentIndex + 1) % affState.items.length;
  if (!affState.paused) playNextAffirmation();
  else updatePlayerDisplay();
}

function openAffirmation() {
  renderAffirmationItems();
  showAffirmationView('list');
  openOverlay('affirmationOverlay');
}
function closeAffirmation() {
  stopAffirmations();
  closeOverlay('affirmationOverlay');
}

// 확언 이벤트
document.getElementById('affirmationFab').addEventListener('click', openAffirmation);
document.getElementById('affirmationClose').addEventListener('click', closeAffirmation);
document.getElementById('affirmationOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('affirmationOverlay')) closeAffirmation();
});

document.getElementById('affirmationAddForm').addEventListener('submit', e => {
  e.preventDefault();
  const text      = document.getElementById('affirmationNewText').value.trim();
  const voiceName = document.getElementById('affirmationNewVoice').value;
  if (!text) return;
  const items = getAffirmations();
  items.push({ text, voiceName });
  saveAffirmations(items);
  document.getElementById('affirmationNewText').value = '';
  renderAffirmationItems();
  showToast('확언이 추가됐어요 ✨');
});

document.getElementById('affirmationItems').addEventListener('click', e => {
  if (e.target.closest('.ms-delete')) {
    const idx = parseInt(e.target.closest('.ms-delete').dataset.idx, 10);
    const items = getAffirmations();
    items.splice(idx, 1);
    saveAffirmations(items);
    renderAffirmationItems();
    return;
  }
  if (e.target.closest('.affirmation-edit-btn')) {
    startEditAffirmation(parseInt(e.target.closest('.affirmation-edit-btn').dataset.idx, 10));
    return;
  }
  if (e.target.closest('.affirmation-edit-confirm-btn')) {
    confirmEditAffirmation(parseInt(e.target.closest('.affirmation-edit-confirm-btn').dataset.idx, 10));
    return;
  }
  if (e.target.closest('.affirmation-edit-cancel-btn')) {
    renderAffirmationItems();
    return;
  }
});

document.getElementById('affirmationItems').addEventListener('change', e => {
  const sel = e.target.closest('.affirmation-item-voice');
  if (!sel) return;
  const items = getAffirmations();
  const idx = parseInt(sel.dataset.idx, 10);
  if (items[idx]) {
    items[idx].voiceName = sel.value;
    saveAffirmations(items);
  }
});

document.getElementById('affirmationPlay').addEventListener('click', startAffirmations);
document.getElementById('affirmationPauseBtn').addEventListener('click', pauseResumeAffirmations);
document.getElementById('affirmationStopBtn').addEventListener('click', stopAffirmations);
document.getElementById('affirmationSkipBtn').addEventListener('click', skipAffirmation);

document.getElementById('affirmationVolume').addEventListener('input', e => {
  document.getElementById('affirmationVolumeVal').textContent = `${e.target.value}%`;
  if (!isBgmEnabled()) return;
  const vol = parseInt(e.target.value, 10) / 100 * 0.6;
  if (affState.playing && !affState.paused) setHypnoVolume(vol);
});

document.getElementById('affirmationBgmEnabled').addEventListener('change', e => {
  const enabled = e.target.checked;
  document.getElementById('affirmationVolume').disabled = !enabled;
  document.getElementById('affirmationVolumeVal').style.opacity = enabled ? '' : '0.4';
  if (!affState.playing) return;
  if (enabled) {
    const vol = parseInt(document.getElementById('affirmationVolume').value, 10) / 100 * 0.6;
    startHypnoticMusic(vol);
  } else {
    stopHypnoticMusic();
  }
});

document.getElementById('affirmationRate').addEventListener('input', e => {
  document.getElementById('affirmationRateVal').textContent = parseFloat(e.target.value).toFixed(2);
});
document.getElementById('affirmationPitch').addEventListener('input', e => {
  document.getElementById('affirmationPitchVal').textContent = parseFloat(e.target.value).toFixed(2);
});
document.getElementById('affirmationSpeechVol').addEventListener('input', e => {
  document.getElementById('affirmationSpeechVolVal').textContent = e.target.value + '%';
});

// ── Emotion Diary ──────────────────────────────────────────────────────────

function getDiaryEntries() {
  try { return JSON.parse(localStorage.getItem(DIARY_KEY)) || []; } catch { return []; }
}
function saveDiaryEntries(entries) {
  localStorage.setItem(DIARY_KEY, JSON.stringify(entries));
}

const diaryState = { selectedEmotion: '', editingId: null };

function formatDiaryDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}

function openDiary() {
  showDiaryList();
  openOverlay('diaryOverlay');
}

function showDiaryList() {
  document.getElementById('diaryWriteView').style.display = 'none';
  document.getElementById('diaryDetailView').style.display = 'none';
  document.getElementById('diaryListView').style.display = '';
  renderDiaryList();
}

function showDiaryWrite(entry) {
  diaryState.editingId = entry ? entry.id : null;
  diaryState.selectedEmotion = entry ? entry.emotion : '';
  document.getElementById('diaryListView').style.display = 'none';
  document.getElementById('diaryDetailView').style.display = 'none';
  document.getElementById('diaryWriteView').style.display = '';
  document.getElementById('diaryWriteDate').textContent = formatDiaryDate(today());
  document.getElementById('diaryContent').value = entry ? entry.content : '';
  document.querySelectorAll('.emotion-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.emotion === diaryState.selectedEmotion);
  });
}

function showDiaryDetail(entry) {
  document.getElementById('diaryListView').style.display = 'none';
  document.getElementById('diaryWriteView').style.display = 'none';
  const view = document.getElementById('diaryDetailView');
  view.style.display = '';
  document.getElementById('diaryDetailDate').textContent = formatDiaryDate(entry.date);
  document.getElementById('diaryDetailEmotion').textContent = entry.emotion || '📝';
  document.getElementById('diaryDetailContent').textContent = entry.content;
  view.dataset.entryId = entry.id;
}

function renderDiaryList() {
  const entries = getDiaryEntries().sort((a, b) => b.date.localeCompare(a.date));
  const list = document.getElementById('diaryList');
  const empty = document.getElementById('diaryEmpty');
  if (entries.length === 0) {
    list.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  list.innerHTML = entries.map(e => `
    <div class="diary-item" data-id="${e.id}">
      <div class="diary-item-emotion">${e.emotion || '📝'}</div>
      <div class="diary-item-body">
        <div class="diary-item-date">${formatDiaryDate(e.date)}</div>
        <div class="diary-item-preview">${e.content || '(내용 없음)'}</div>
      </div>
    </div>
  `).join('');
  list.querySelectorAll('.diary-item').forEach(el => {
    el.addEventListener('click', () => {
      const entry = entries.find(e => e.id === el.dataset.id);
      if (entry) showDiaryDetail(entry);
    });
  });
}

document.getElementById('diaryFab').addEventListener('click', openDiary);
document.getElementById('diaryClose').addEventListener('click', () => closeOverlay('diaryOverlay'));
document.getElementById('diaryNewBtn').addEventListener('click', () => showDiaryWrite(null));
document.getElementById('diaryCancelBtn').addEventListener('click', showDiaryList);

document.querySelectorAll('.emotion-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    diaryState.selectedEmotion = btn.dataset.emotion;
    document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

document.getElementById('diarySaveBtn').addEventListener('click', () => {
  const content = document.getElementById('diaryContent').value.trim();
  if (!content && !diaryState.selectedEmotion) return;
  const entries = getDiaryEntries();
  if (diaryState.editingId) {
    const idx = entries.findIndex(e => e.id === diaryState.editingId);
    if (idx !== -1) {
      entries[idx].emotion = diaryState.selectedEmotion;
      entries[idx].content = content;
    }
  } else {
    entries.push({ id: Date.now().toString(), date: today(), emotion: diaryState.selectedEmotion, content });
  }
  saveDiaryEntries(entries);
  showDiaryList();
});

document.getElementById('diaryBackBtn').addEventListener('click', showDiaryList);

document.getElementById('diaryEditBtn').addEventListener('click', () => {
  const id = document.getElementById('diaryDetailView').dataset.entryId;
  const entry = getDiaryEntries().find(e => e.id === id);
  if (entry) showDiaryWrite(entry);
});

document.getElementById('diaryDeleteBtn').addEventListener('click', () => {
  const id = document.getElementById('diaryDetailView').dataset.entryId;
  if (!id) return;
  if (!confirm('이 일기를 삭제할까요?')) return;
  saveDiaryEntries(getDiaryEntries().filter(e => e.id !== id));
  showDiaryList();
});

// ── Pushup Diary ──────────────────────────────────────────────────────────────
const PUSHUP_LOG_KEY  = 'bodyweight_pushup_log';
const PUSHUP_GOAL_KEY = 'bodyweight_pushup_goal';
const PUSHUP_CAM_KEY  = 'bodyweight_pushup_cam';

function getPushupLog() {
  try { return JSON.parse(localStorage.getItem(PUSHUP_LOG_KEY)) || []; } catch { return []; }
}
function savePushupLog(arr) { localStorage.setItem(PUSHUP_LOG_KEY, JSON.stringify(arr)); }
function getPushupGoal() {
  const v = localStorage.getItem(PUSHUP_GOAL_KEY);
  return v !== null ? parseInt(v, 10) : 30;
}
function savePushupGoalPref(v) { localStorage.setItem(PUSHUP_GOAL_KEY, String(v)); }

const pushup = {
  goal: 30,
  count: 0,
  startMs: 0,
  elapsed: 0,
  intervalId: null,
};

function pushupFmtTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function isCamAutoEnabled() {
  return localStorage.getItem(PUSHUP_CAM_KEY) !== 'off';
}

function openPushup() {
  pushup.goal = getPushupGoal();
  document.getElementById('pushupGoalVal').textContent = pushup.goal;
  document.getElementById('pushupCamToggle').checked = isCamAutoEnabled();
  renderPushupLog();
  showPushupView('idle');
  openOverlay('pushupOverlay');
}

function closePushup() {
  stopPushupTimer();
  closeOverlay('pushupOverlay');
}

function showPushupView(view) {
  document.getElementById('pushupIdle').style.display    = view === 'idle'    ? 'flex' : 'none';
  document.getElementById('pushupRunning').style.display = view === 'running' ? 'flex' : 'none';
  document.getElementById('pushupDone').style.display    = view === 'done'    ? 'flex' : 'none';
}

function renderPushupLog() {
  const log = getPushupLog();
  const list = document.getElementById('pushupLogList');
  document.getElementById('pushupLogCount').textContent = log.length ? `${log.length}개` : '';
  if (!log.length) {
    list.innerHTML = '<p class="pushup-log-empty">아직 기록이 없어요. 지금 시작해보세요!</p>';
    return;
  }
  const sorted = [...log].sort((a, b) => b.date.localeCompare(a.date));
  list.innerHTML = sorted.map(item => `
    <div class="pushup-log-item">
      <span class="pushup-log-date">${formatDateFull(item.date)}</span>
      <span>
        <span class="pushup-log-count">${item.count}</span>
        <span class="pushup-log-unit">개</span>
      </span>
      <span class="pushup-log-time">${pushupFmtTime(item.duration || 0)}</span>
      <button class="pushup-log-delete" data-id="${item.id}">×</button>
    </div>
  `).join('');
}

// ── 카메라 자동 감지 (밝기/움직임 변화) ──────────────────────────────────────
// 폰을 화면이 위를 향하도록 바닥에 두면, 몸이 내려올 때 전면 카메라가 가려져
// 화면이 어두워짐 → 다시 밝아질 때 1회 카운트. getUserMedia는 거의 모든
// 모바일 브라우저(iOS Safari 포함)에서 동작한다.
const camState = {
  stream: null,
  video: null,
  canvas: null,
  ctx: null,
  rafId: null,
  baseline: null,       // 기준 밝기 (0~255)
  blocked: false,       // 현재 가려진(어두운) 상태
  cooldownUntil: 0,     // 연속 카운트 방지 (ms)
  maxBright: 1,         // 막대 표시용 최대값
  active: false,
};

function getSensitivity() {
  return parseInt(document.getElementById('pushupSensitivity').value, 10);
}

function brightThresholdRatio() {
  // sensitivity 50% → baseline의 50% 이하로 떨어지면 감지
  return 1 - getSensitivity() / 100;
}

function updateSensorUI(status, dot) {
  const dotEl  = document.getElementById('pushupSensorDot');
  const statEl = document.getElementById('pushupSensorStatus');
  dotEl.className = `pushup-sensor-dot${dot ? ' ' + dot : ''}`;
  statEl.textContent = status;
}

function updateBrightBar(b) {
  if (b > camState.maxBright) camState.maxBright = b;
  const pct = Math.min(100, (b / camState.maxBright) * 100);
  document.getElementById('pushupLuxBar').style.width = `${pct}%`;
  document.getElementById('pushupLuxVal').textContent = Math.round(b);
  if (camState.baseline !== null) {
    const thr = camState.baseline * brightThresholdRatio();
    document.getElementById('pushupLuxThreshold').style.left =
      `${Math.min(100, (thr / camState.maxBright) * 100)}%`;
  }
}

function onBrightReading(bright) {
  if (camState.baseline === null) {
    camState.baseline = bright;
    camState.maxBright = Math.max(bright, 1);
  } else if (!camState.blocked) {
    // 가려지지 않은 상태에서 서서히 기준값 보정 (조명 드리프트 대응)
    camState.baseline = camState.baseline * 0.97 + bright * 0.03;
  }

  updateBrightBar(bright);

  const threshold = camState.baseline * brightThresholdRatio();
  const now = Date.now();

  if (!camState.blocked && bright < threshold) {
    camState.blocked = true;
    updateSensorUI('내려가는 중... ↓', 'blocked');
  } else if (camState.blocked && bright >= threshold) {
    camState.blocked = false;
    if (now > camState.cooldownUntil) {
      camState.cooldownUntil = now + 400;
      pushup.count++;
      updatePushupDisplay();
      beep(880, 0.08, 0.3);
    }
    updateSensorUI('감지 중 ✓', 'active');
  } else if (!camState.blocked) {
    updateSensorUI('감지 중', 'active');
  }
}

function sampleBrightnessLoop() {
  if (!camState.active) return;
  const v = camState.video;
  if (v && v.readyState >= 2) {
    try {
      const { canvas, ctx } = camState;
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) {
        sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      }
      onBrightReading(sum / (data.length / 4));
    } catch (_) {}
  }
  camState.rafId = requestAnimationFrame(sampleBrightnessLoop);
}

async function startCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    updateSensorUI('카메라 미지원 — 화면을 탭해서 카운트', 'error');
    return;
  }
  try {
    camState.stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      audio: false,
    });
    const v = document.getElementById('pushupVideo');
    v.srcObject = camState.stream;
    v.setAttribute('playsinline', '');
    await v.play();
    camState.video  = v;
    camState.canvas = document.createElement('canvas');
    camState.canvas.width  = 32;
    camState.canvas.height = 24;
    camState.ctx = camState.canvas.getContext('2d', { willReadFrequently: true });
    camState.baseline  = null;
    camState.blocked   = false;
    camState.maxBright = 1;
    camState.active    = true;
    updateSensorUI('감지 중', 'active');
    camState.rafId = requestAnimationFrame(sampleBrightnessLoop);
  } catch (e) {
    updateSensorUI('카메라 권한 거부 — 화면을 탭해서 카운트', 'error');
  }
}

function stopCamera() {
  camState.active = false;
  if (camState.rafId) { cancelAnimationFrame(camState.rafId); camState.rafId = null; }
  if (camState.stream) {
    camState.stream.getTracks().forEach(t => { try { t.stop(); } catch (_) {} });
    camState.stream = null;
  }
  const v = document.getElementById('pushupVideo');
  if (v) v.srcObject = null;
  camState.video = null;
}

// ─────────────────────────────────────────────────────────────────────────────

function startPushupTimer() {
  pushup.count   = 0;
  pushup.startMs = Date.now();
  pushup.elapsed = 0;
  document.getElementById('pushupCount').textContent = '0';
  document.getElementById('pushupStopwatch').textContent = '00:00';
  document.getElementById('pushupProgressBar').style.width = '0%';
  document.getElementById('pushupGoalDisplay').textContent = `목표 ${pushup.goal}개`;
  document.getElementById('pushupSensitivity').value = 50;
  document.getElementById('pushupSensitivityVal').textContent = '50%';
  document.getElementById('pushupLuxVal').textContent = '—';
  document.getElementById('pushupLuxBar').style.width = '0%';
  document.getElementById('pushupLuxThreshold').style.left = '50%';
  showPushupView('running');
  pushup.intervalId = setInterval(() => {
    pushup.elapsed = Date.now() - pushup.startMs;
    document.getElementById('pushupStopwatch').textContent = pushupFmtTime(pushup.elapsed);
  }, 500);
  const camEnabled = isCamAutoEnabled();
  document.getElementById('pushupCamBar').style.display = camEnabled ? '' : 'none';
  if (camEnabled) {
    updateSensorUI('카메라 연결 중...', '');
    startCamera();
  }
}

function stopPushupTimer() {
  if (pushup.intervalId) {
    clearInterval(pushup.intervalId);
    pushup.intervalId = null;
  }
  stopCamera();
}

function savePushupEntry() {
  const log = getPushupLog();
  log.push({ id: Date.now(), date: today(), count: pushup.count, duration: pushup.elapsed, goal: pushup.goal });
  savePushupLog(log);
}

function updatePushupDisplay() {
  const countEl = document.getElementById('pushupCount');
  countEl.textContent = pushup.count;
  const pct = pushup.goal > 0 ? Math.min(100, Math.round((pushup.count / pushup.goal) * 100)) : 0;
  document.getElementById('pushupProgressBar').style.width = `${pct}%`;
  document.getElementById('pushupGoalDisplay').textContent = `목표 ${pushup.goal}개 (${pct}%)`;

  // pop animation
  countEl.classList.remove('pop');
  void countEl.offsetWidth;
  countEl.classList.add('pop');
  setTimeout(() => countEl.classList.remove('pop'), 150);

  if (pushup.count >= pushup.goal && pushup.goal > 0) {
    beep(880, 0.15, 0.4);
    showToast(`목표 ${pushup.goal}개 달성! 🎉`);
  }
}

// Goal stepper
document.getElementById('pushupGoalDec').addEventListener('click', () => {
  pushup.goal = Math.max(1, pushup.goal - 5);
  document.getElementById('pushupGoalVal').textContent = pushup.goal;
  savePushupGoalPref(pushup.goal);
});
document.getElementById('pushupGoalInc').addEventListener('click', () => {
  pushup.goal = Math.min(999, pushup.goal + 5);
  document.getElementById('pushupGoalVal').textContent = pushup.goal;
  savePushupGoalPref(pushup.goal);
});

document.getElementById('pushupSensitivity').addEventListener('input', e => {
  document.getElementById('pushupSensitivityVal').textContent = `${e.target.value}%`;
  // 임계선 위치 즉시 업데이트
  if (camState.baseline !== null && camState.maxBright > 0) {
    const thr = camState.baseline * brightThresholdRatio();
    const pct = Math.min(100, (thr / camState.maxBright) * 100);
    document.getElementById('pushupLuxThreshold').style.left = `${pct}%`;
  }
});

document.getElementById('pushupCamToggle').addEventListener('change', e => {
  localStorage.setItem(PUSHUP_CAM_KEY, e.target.checked ? 'on' : 'off');
});

document.getElementById('pushupStart').addEventListener('click', startPushupTimer);

// 화면 전체 탭 = 수동 +1 (카메라가 안 되거나 보정용)
document.getElementById('pushupTapzone').addEventListener('click', () => {
  pushup.count++;
  updatePushupDisplay();
});


document.getElementById('pushupStop').addEventListener('click', () => {
  stopPushupTimer();
  savePushupEntry();
  document.getElementById('pushupDoneCount').textContent = `${pushup.count}개`;
  document.getElementById('pushupDoneTime').textContent  = pushupFmtTime(pushup.elapsed);
  showPushupView('done');
  soundDone();
  renderStreakCalendar();
});

document.getElementById('pushupDoneBack').addEventListener('click', () => {
  renderPushupLog();
  showPushupView('idle');
});

document.getElementById('pushupFab').addEventListener('click', openPushup);
document.getElementById('pushupClose').addEventListener('click', closePushup);
document.getElementById('pushupOverlay').addEventListener('click', e => {
  if (e.target === document.getElementById('pushupOverlay')) closePushup();
});

document.getElementById('pushupLogList').addEventListener('click', e => {
  const btn = e.target.closest('.pushup-log-delete');
  if (!btn) return;
  const log = getPushupLog().filter(item => item.id !== parseInt(btn.dataset.id, 10));
  savePushupLog(log);
  renderPushupLog();
});

// Init
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
document.getElementById('date').value = today();
render();
