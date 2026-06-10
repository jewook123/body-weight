const STORAGE_KEY = 'bodyweight_records';
const GOAL_KEY = 'bodyweight_goal';
const THEME_KEY = 'bodyweight_theme';

let currentPeriod = '3m';

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
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
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
  const yStr = `${yDate.getFullYear()}-${String(yDate.getMonth()+1).padStart(2,'0')}-${String(yDate.getDate()).padStart(2,'0')}`;
  const yRecord = records.find(r => r.date === yStr);

  const goal = getGoal();
  const has = !!todayRecord;

  return [
    { id:'record',   icon:'📝', label:'오늘 체중 기록',   done: has,                                                    locked: false, visible: true },
    { id:'exercise', icon:'🏃', label:'오늘 운동 완료',   done: has && todayRecord.exercise === true,                   locked: !has,  visible: true },
    { id:'nodrink',  icon:'🚫', label:'오늘 금주 성공',   done: has && todayRecord.drink === false,                     locked: !has,  visible: true },
    { id:'lighter',  icon:'📉', label:'어제보다 가벼움',   done: has && !!yRecord && todayRecord.weight < yRecord.weight, locked: !has,  visible: !!yRecord },
    { id:'goal',     icon:'🎯', label:'목표 달성!',       done: has && goal !== null && todayRecord.weight <= goal,     locked: !has,  visible: goal !== null },
  ].filter(m => m.visible);
}

function updateMissions() {
  const el = document.getElementById('dailyMissions');
  if (!el) return;

  const missions = getMissionStates();
  const completedCount = missions.filter(m => m.done).length;
  const total = missions.length;
  const allDone = completedCount === total;
  const hasRecord = missions.find(m => m.id === 'record')?.done ?? false;

  const rowsHTML = missions.map(m => {
    let stateClass, circleHTML;
    if (m.locked) {
      stateClass = 'mission-locked';
      circleHTML = '<span class="mission-circle mission-circle--locked">🔒</span>';
    } else if (m.done) {
      stateClass = 'mission-done';
      circleHTML = '<span class="mission-circle mission-circle--done">✓</span>';
    } else {
      stateClass = 'mission-incomplete';
      circleHTML = '<span class="mission-circle mission-circle--empty"></span>';
    }
    return `<div class="mission-row ${stateClass}">${circleHTML}<span class="mission-label">${m.icon} ${m.label}</span></div>`;
  }).join('');

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
}

function render() {
  const records = getRecords();
  updateStats(records);
  updateChart(records, currentPeriod);
  renderRecords(records);
  updateMissions();
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
  document.getElementById('goalModal').classList.add('open');
});
document.getElementById('cancelGoal').addEventListener('click', () => {
  document.getElementById('goalModal').classList.remove('open');
});
document.getElementById('saveGoal').addEventListener('click', () => {
  const raw = document.getElementById('goalInput').value;
  saveGoal(raw !== '' ? parseFloat(raw) : null);
  document.getElementById('goalModal').classList.remove('open');
  render();
});
document.getElementById('goalModal').addEventListener('click', e => {
  if (e.target === document.getElementById('goalModal'))
    document.getElementById('goalModal').classList.remove('open');
});

document.getElementById('expandRecordsBtn').addEventListener('click', () => {
  const records = getRecords();
  document.getElementById('recordsFullList').innerHTML = recordsHTML(records);
  document.getElementById('recordsCount').textContent = `${records.length}개`;
  document.getElementById('recordsFullscreen').classList.add('open');
  document.body.style.overflow = 'hidden';
});

document.getElementById('closeFullscreen').addEventListener('click', () => {
  document.getElementById('recordsFullscreen').classList.remove('open');
  document.body.style.overflow = '';
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

// Init
applyTheme(localStorage.getItem(THEME_KEY) || 'light');
document.getElementById('date').value = today();
render();
