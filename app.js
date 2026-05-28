const STORAGE_KEY = 'bodyweight_records';
const GOAL_KEY = 'bodyweight_goal';

let chart = null;
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

function updateStats(records) {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const goal = getGoal();

  const current = sorted.length ? sorted[sorted.length - 1].weight : null;
  const start = sorted.length ? sorted[0].weight : null;
  const change = current !== null && start !== null ? current - start : null;

  document.getElementById('currentWeight').textContent =
    current !== null ? current.toFixed(1) : '—';
  document.getElementById('startWeight').textContent =
    start !== null ? start.toFixed(1) : '—';
  document.getElementById('goalWeight').textContent =
    goal !== null ? goal.toFixed(1) : '—';

  const changeEl = document.getElementById('weightChange');
  const changeCard = document.getElementById('changeCard');

  if (change !== null) {
    const sign = change > 0 ? '+' : '';
    changeEl.textContent = `${sign}${change.toFixed(1)}`;
    changeCard.className = 'stat-card ' + (change > 0 ? 'negative' : change < 0 ? 'positive' : '');
  } else {
    changeEl.textContent = '—';
    changeCard.className = 'stat-card';
  }
}

function buildChartDatasets(sorted, goal) {
  const labels = sorted.map(r => formatDateShort(r.date));
  const data = sorted.map(r => r.weight);

  const datasets = [
    {
      label: '체중',
      data,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.07)',
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: sorted.length > 60 ? 2 : 4,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.35,
      fill: true,
    },
  ];

  if (goal !== null) {
    datasets.push({
      label: '목표',
      data: data.map(() => goal),
      borderColor: '#ef4444',
      borderWidth: 1.5,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
    });
  }

  return { labels, datasets };
}

function updateChart(records, period) {
  const filtered = filterByPeriod(records, period);
  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  const goal = getGoal();

  const chartWrapper = document.querySelector('.chart-wrapper');

  if (sorted.length === 0) {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    chartWrapper.innerHTML = '<div class="chart-empty">기록을 추가하면 그래프가 표시됩니다.</div>';
    return;
  }

  if (!document.getElementById('weightChart')) {
    chartWrapper.innerHTML = '<canvas id="weightChart"></canvas>';
  }

  const { labels, datasets } = buildChartDatasets(sorted, goal);
  const ctx = document.getElementById('weightChart').getContext('2d');

  if (chart) {
    chart.data.labels = labels;
    chart.data.datasets = datasets;
    chart.options.plugins.legend.display = goal !== null;
    chart.update('active');
    return;
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'index' },
      plugins: {
        legend: {
          display: goal !== null,
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 16,
            font: { size: 12 },
            color: '#6b7280',
            usePointStyle: true,
          },
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#111827',
          bodyColor: '#6b7280',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: ctx => {
              if (ctx.dataset.label === '목표') return `목표: ${ctx.parsed.y.toFixed(1)} kg`;
              return `체중: ${ctx.parsed.y.toFixed(1)} kg`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#9ca3af', font: { size: 11 }, maxTicksLimit: 10 },
          border: { display: false },
        },
        y: {
          grid: { color: '#f3f4f6' },
          ticks: {
            color: '#9ca3af',
            font: { size: 11 },
            callback: v => `${v}`,
          },
          border: { display: false },
        },
      },
    },
  });
}

function renderRecords(records) {
  const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date));
  const el = document.getElementById('recordsList');

  if (!sorted.length) {
    el.innerHTML = '<p class="empty-msg">아직 기록이 없어요.</p>';
    return;
  }

  el.innerHTML = sorted
    .map(
      r => `
    <div class="record-item">
      <div class="record-left">
        <span class="record-date">${formatDateFull(r.date)}</span>
        <span>
          <span class="record-weight">${parseFloat(r.weight).toFixed(1)}</span>
          <span class="record-unit">kg</span>
          ${r.memo ? `<span class="record-memo">· ${r.memo}</span>` : ''}
        </span>
      </div>
      <button class="record-delete" data-id="${r.id}" title="삭제">×</button>
    </div>
  `
    )
    .join('');
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

  const records = getRecords();

  const existing = records.findIndex(r => r.date === date);
  if (existing !== -1) {
    records[existing].weight = weight;
    records[existing].memo = memo;
  } else {
    records.push({ id: Date.now(), date, weight, memo });
  }

  saveRecords(records);
  document.getElementById('weight').value = '';
  document.getElementById('memo').value = '';
  render();
});

document.getElementById('recordsList').addEventListener('click', e => {
  const btn = e.target.closest('.record-delete');
  if (!btn) return;
  const id = parseInt(btn.dataset.id, 10);
  const updated = getRecords().filter(r => r.id !== id);
  saveRecords(updated);
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
  const val = raw !== '' ? parseFloat(raw) : null;
  saveGoal(val);
  document.getElementById('goalModal').classList.remove('open');
  render();
});

document.getElementById('goalModal').addEventListener('click', e => {
  if (e.target === document.getElementById('goalModal')) {
    document.getElementById('goalModal').classList.remove('open');
  }
});

document.getElementById('date').value = today();
render();
