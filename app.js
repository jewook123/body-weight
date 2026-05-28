const STORAGE_KEY = 'bodyweight_records';
const GOAL_KEY = 'bodyweight_goal';

let currentPeriod = '3m';

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
  if (val !== null && !isNaN(val)) {
    localStorage.setItem(GOAL_KEY, val.toString());
  } else {
    localStorage.removeItem(GOAL_KEY);
  }
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDateShort(dateStr) {
  const [, m, d] = dateStr.split('-');
  return `${m}/${d}`;
}

function formatDateFull(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${y}.${m}.${d}`;
}

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
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + cH).toFixed(1)} L${pts[0].x.toFixed(1)},${(PAD.top + cH).toFixed(1)}Z`;

  const yTicks = niceYTicks(minW, maxW);

  const maxXLabels = Math.min(sorted.length, 8);
  const xLabelIdxs = sorted.length === 1
    ? [0]
    : Array.from({ length: maxXLabels }, (_, i) => Math.round(i * (sorted.length - 1) / (maxXLabels - 1)));

  const goalY = goal !== null ? yOf(goal) : null;

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
    return `<line x1="${PAD.left}" y1="${y.toFixed(1)}" x2="${(PAD.left + cW).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#f0f0f0" stroke-width="1"/>
    <text x="${(PAD.left - 8).toFixed(1)}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" fill="#9ca3af" font-size="11" font-family="-apple-system,sans-serif">${w % 1 === 0 ? w : w.toFixed(1)}</text>`;
  }).join('')}

  ${goalY !== null ? `
  <line x1="${PAD.left}" y1="${goalY.toFixed(1)}" x2="${(PAD.left + cW).toFixed(1)}" y2="${goalY.toFixed(1)}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 4" clip-path="url(#chartArea)"/>
  <text x="${(PAD.left + cW + 5).toFixed(1)}" y="${goalY.toFixed(1)}" dominant-baseline="middle" fill="#ef4444" font-size="10" font-family="-apple-system,sans-serif" font-weight="500">목표</text>
  ` : ''}

  <g clip-path="url(#chartArea)">
    <path d="${areaPath}" fill="url(#areaGrad)"/>
    <path d="${linePath}" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
  </g>

  ${pts.map(p => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#3b82f6" stroke="#fff" stroke-width="2"/>`).join('')}

  ${xLabelIdxs.map(i => {
    const p = pts[i];
    return `<text x="${p.x.toFixed(1)}" y="${(PAD.top + cH + 18).toFixed(1)}" text-anchor="middle" fill="#9ca3af" font-size="11" font-family="-apple-system,sans-serif">${formatDateShort(sorted[i].date)}</text>`;
  }).join('')}

  ${pts.map((p, i) => `<rect class="chart-hit" data-idx="${i}" x="${(p.x - 24).toFixed(1)}" y="${PAD.top}" width="48" height="${cH}" fill="transparent" style="cursor:default"/>`).join('')}
</svg>`;

  wrapper.innerHTML = svg;

  wrapper.querySelectorAll('.chart-hit').forEach(el => {
    el.addEventListener('mouseenter', e => {
      const idx = parseInt(el.dataset.idx, 10);
      const { r } = pts[idx];
      showTooltip(e, r.weight, r.date, r.memo, r.exercise, r.drink);
    });
    el.addEventListener('mousemove', e => {
      const idx = parseInt(el.dataset.idx, 10);
      const { r } = pts[idx];
      showTooltip(e, r.weight, r.date, r.memo, r.exercise, r.drink);
    });
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
    exercise ? '<span style="color:#15803d">🏃 운동</span>' : '',
    drink ? '<span style="color:#b45309">🍺 음주</span>' : '',
  ].filter(Boolean).join('  ');
  tt.innerHTML = `<strong>${formatDateFull(date)}</strong><br>${weight.toFixed(1)} kg${memo ? `<br><span style="color:#9ca3af">${memo}</span>` : ''}${badges ? `<br>${badges}` : ''}`;

  const ttW = 140;
  const left = x + 14 + ttW > rect.width ? x - ttW - 6 : x + 14;
  tt.style.left = `${left}px`;
  tt.style.top = `${Math.max(4, y - 44)}px`;
  tt.style.display = 'block';
}

function hideTooltip() {
  document.getElementById('chartTooltip').style.display = 'none';
}

function updateStats(records) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const goal = getGoal();

  const current = sorted.length ? sorted[sorted.length - 1].weight : null;
  const start = sorted.length ? sorted[0].weight : null;
  const change = current !== null && start !== null ? current - start : null;

  document.getElementById('currentWeight').textContent = current !== null ? current.toFixed(1) : '—';
  document.getElementById('startWeight').textContent = start !== null ? start.toFixed(1) : '—';
  document.getElementById('goalWeight').textContent = goal !== null ? goal.toFixed(1) : '—';

  const changeEl = document.getElementById('weightChange');
  const changeCard = document.getElementById('changeCard');

  if (change !== null) {
    changeEl.textContent = `${change > 0 ? '+' : ''}${change.toFixed(1)}`;
    changeCard.className = 'stat-card ' + (change > 0 ? 'negative' : change < 0 ? 'positive' : '');
  } else {
    changeEl.textContent = '—';
    changeCard.className = 'stat-card';
  }
}

function renderRecords(records) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const el = document.getElementById('recordsList');

  if (!sorted.length) {
    el.innerHTML = '<p class="empty-msg">아직 기록이 없어요.</p>';
    return;
  }

  el.innerHTML = sorted.map(r => `
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
        ${r.exercise ? '<span class="badge badge-exercise">🏃&nbsp;운동</span>' : ''}
        ${r.drink ? '<span class="badge badge-drink">🍺&nbsp;음주</span>' : ''}
      </div>
      <button class="record-delete" data-id="${r.id}" title="삭제">×</button>
    </div>
  `).join('');
}

function render() {
  const records = getRecords();
  updateStats(records);
  updateChart(records, currentPeriod);
  renderRecords(records);
}

document.getElementById('recordForm').addEventListener('submit', e => {
  e.preventDefault();
  const date = document.getElementById('date').value;
  const weight = parseFloat(document.getElementById('weight').value);
  const memo = document.getElementById('memo').value.trim();

  if (!date || isNaN(weight) || weight <= 0) return;

  const exercise = document.getElementById('exerciseBtn').classList.contains('active');
  const drink = document.getElementById('drinkBtn').classList.contains('active');

  const records = getRecords();
  const existing = records.findIndex(r => r.date === date);
  if (existing !== -1) {
    records[existing].weight = weight;
    records[existing].memo = memo;
    records[existing].exercise = exercise;
    records[existing].drink = drink;
  } else {
    records.push({ id: Date.now(), date, weight, memo, exercise, drink });
  }

  saveRecords(records);
  document.getElementById('weight').value = '';
  document.getElementById('memo').value = '';
  document.getElementById('exerciseBtn').classList.remove('active');
  document.getElementById('drinkBtn').classList.remove('active');
  render();
});

document.getElementById('recordsList').addEventListener('click', e => {
  const btn = e.target.closest('.record-delete');
  if (!btn) return;
  const id = parseInt(btn.dataset.id, 10);
  saveRecords(getRecords().filter(r => r.id !== id));
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
  if (e.target === document.getElementById('goalModal')) {
    document.getElementById('goalModal').classList.remove('open');
  }
});

['exerciseBtn', 'drinkBtn'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    document.getElementById(id).classList.toggle('active');
  });
});

document.getElementById('date').value = today();
render();
