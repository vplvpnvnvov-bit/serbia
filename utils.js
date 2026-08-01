// === HELPERS ===

function formatPrice(value, currency) {
  if (!value) return '0 ' + currency;
  return value.toLocaleString('ru-RU') + ' ' + currency;
}

function safeUrl(url) {
  if (!url) return '#';
  if (/^\s*(javascript|data):/i.test(url)) return '#';
  return url;
}

function presetEmoji(preset) {
  return preset === 'family' ? '👶' : preset === 'budget' ? '💰' : '⚡';
}

function presetName(preset) {
  return preset === 'family' ? 'С детьми' : preset === 'budget' ? 'Бюджетно' : 'Движ';
}

function scoreColor(score) {
  if (score >= 9) return '#1b5e20';
  if (score >= 7) return '#43a047';
  if (score >= 5) return '#fbc02d';
  if (score >= 3) return '#f57c00';
  return '#d32f2f';
}

function scoreBg(score) {
  if (score >= 9) return '#e8f5e9';
  if (score >= 7) return '#e8f5e9';
  if (score >= 5) return '#fffde7';
  if (score >= 3) return '#fff3e0';
  return '#ffebee';
}

function getScore(d, preset) {
  if (preset === 'budget') return d.budgetScore;
  if (preset === 'vibe') return d.vibeScore;
  return d.familyScore;
}

function getNormalizedScore(d, preset, visibleDistricts, cachedMin, cachedMax) {
  if (!visibleDistricts || visibleDistricts.length <= 1) return getScore(d, preset);
  const min = cachedMin !== undefined ? cachedMin : Math.min(...visibleDistricts.map(vd => getScore(vd, preset)));
  const max = cachedMax !== undefined ? cachedMax : Math.max(...visibleDistricts.map(vd => getScore(vd, preset)));
  if (max === min) return 5;
  const raw = getScore(d, preset);
  return Math.round(1 + ((raw - min) / (max - min)) * 9);
}

function darkenHex(hex, amt) {
  if (!hex || hex[0] !== '#') return '#888';
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function lightenHex(hex, amt) {
  if (!hex || hex[0] !== '#') return '#aaa';
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, (n >> 16) + amt);
  const g = Math.min(255, ((n >> 8) & 0xff) + amt);
  const b = Math.min(255, (n & 0xff) + amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function scoreMax() { return 10; }

function districtLabel(name, price, score) {
  const short = price.replace(/^(\d+).*/, 'от $1€');
  const lower = parseInt(price, 10);
  let textColor;
  if (lower >= 600) textColor = '#d32f2f';
  else if (lower >= 450) textColor = '#f57c00';
  else textColor = '#388e3c';
  return `<div class="map-price-badge" style="color:${textColor}">${short}</div>`;
}

function calculateMonthMetrics(tasks, state) {
  let totalPlanned = 0, spent = 0, spentInProgress = 0;
  let taskDone = 0, taskProgress = 0, taskTotal = 0;

  if (!Array.isArray(tasks)) {
    return { totalPlanned: 0, spent: 0, spentInProgress: 0, taskDone: 0, taskProgress: 0, taskTotal: 0,
      spentPct: 0, pendingSpentPct: 0, donePct: 0, progPct: 0,
      combinedTaskPct: 0, combinedBudgetPct: 0, pendingTasksCount: 0 };
  }

  tasks.forEach(t => {
    if (!t) return;
    const s = (state && state.tasks && state.tasks[t.id]) || { checked: false, progress: false, customCost: null };
    const cost = (s.customCost != null ? s.customCost : t.cost) || 0;
    totalPlanned += cost;
    if (s.checked === true) spent += cost;
    else if (s.progress === true) spentInProgress += cost;
    taskTotal++;
    if (s.checked === true) taskDone++;
    else if (s.progress === true) taskProgress++;
  });

  const spentPct = totalPlanned > 0 ? Math.round((spent / totalPlanned) * 100) : 0;
  const pendingSpentPct = totalPlanned > 0 ? Math.round((spentInProgress / totalPlanned) * 100) : 0;
  const donePct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const progPct = taskTotal > 0 ? Math.round((taskProgress / taskTotal) * 100) : 0;

  return {
    totalPlanned, spent, spentInProgress,
    taskDone, taskProgress, taskTotal,
    spentPct, pendingSpentPct, donePct, progPct,
    combinedTaskPct: Math.round(donePct + (progPct * 0.5)),
    combinedBudgetPct: spentPct + pendingSpentPct,
    pendingTasksCount: taskTotal - taskDone - taskProgress
  };
}

function buildMonthMetricsHTML(M, monthCurSym) {
  return '<div class="plan-metric-wrapper">'
    + '<div class="plan-metric-header">'
    + '<span class="plan-metric-title">💶 Финансовый бюджет</span>'
    + '<span class="plan-metric-percentage">' + M.combinedBudgetPct + '%</span>'
    + '</div>'
    + '<div class="plan-metric-details">'
    + '<div class="metric-detail-item"><span>📋 Запланировано</span><span class="metric-num">' + formatPrice(M.totalPlanned, monthCurSym) + '</span></div>'
    + '<div class="metric-detail-item spent"><span>🔵 Потрачено</span><span class="metric-num">' + formatPrice(M.spent, monthCurSym) + ' (' + M.spentPct + '%)</span></div>'
    + '<div class="metric-detail-item pending"><span>🔷 В работе</span><span class="metric-num">' + formatPrice(M.spentInProgress, monthCurSym) + ' (' + M.pendingSpentPct + '%)</span></div>'
    + '</div>'
    + '<div class="plan-progress-track budget-combined">'
    + '<div class="plan-progress-segment segment-spent" style="width:' + M.spentPct + '%"></div>'
    + (M.pendingSpentPct > 0 ? '<div class="plan-progress-segment segment-pending-spent" style="left:' + M.spentPct + '%;width:' + M.pendingSpentPct + '%"></div>' : '')
    + '</div>'
    + '</div>'
    + '<div class="plan-metric-wrapper">'
    + '<div class="plan-metric-header">'
    + '<span class="plan-metric-title">📋 Физический прогресс</span>'
    + '<span class="plan-metric-percentage">' + M.combinedTaskPct + '%</span>'
    + '</div>'
    + '<div class="plan-metric-details">'
    + '<div class="metric-detail-item"><span>🎯 Всего задач</span><span class="metric-num">' + M.taskTotal + '</span></div>'
    + '<div class="metric-detail-item done"><span>🟢 Готово</span><span class="metric-num">' + M.taskDone + ' из ' + M.taskTotal + ' (' + M.donePct + '%)</span></div>'
    + '<div class="metric-detail-item progress"><span>🟡 В процессе</span><span class="metric-num">' + M.taskProgress + ' (' + M.progPct + '%)</span></div>'
    + '</div>'
    + '<div class="plan-progress-track tasks-combined">'
    + '<div class="plan-progress-segment segment-done" style="width:' + M.donePct + '%"></div>'
    + (M.progPct > 0 ? '<div class="plan-progress-segment segment-progress" style="left:' + M.donePct + '%;width:' + M.progPct + '%"></div>' : '')
    + '</div>'
    + '</div>';
}

function buildSummaryHTML(rubPlanned, rubSpent, rubInProgress, eurPlanned013, eurSpent013, eurInProgress013, eurPlanned4, eurSpent4, globalTaskDone, globalTaskProgress, globalTaskTotal) {
  const rubRemaining = rubPlanned - rubSpent;
  const eurRemaining013 = eurPlanned013 - eurSpent013;
  const rubSpentPct = rubPlanned > 0 ? Math.round((rubSpent / rubPlanned) * 100) : 0;
  const rubProgPct = rubPlanned > 0 ? Math.round((rubInProgress / rubPlanned) * 100) : 0;
  const eurSpentPct = eurPlanned013 > 0 ? Math.round((eurSpent013 / eurPlanned013) * 100) : 0;
  const eurProgPct = eurPlanned013 > 0 ? Math.round((eurInProgress013 / eurPlanned013) * 100) : 0;
  const globalDonePct = globalTaskTotal > 0 ? Math.round((globalTaskDone / globalTaskTotal) * 100) : 0;
  const globalProgPct = globalTaskTotal > 0 ? Math.round((globalTaskProgress / globalTaskTotal) * 100) : 0;
  return '<div class="tl-summary-row" style="font-size:1.2em">💰 Стартовая подушка (Месяцы 0–3)</div>'
    + '<div class="tl-summary-row" style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.08);border-radius:6px">'
    + '<div>🇷🇺 <b>Расходы в РФ (Месяц 0):</b></div>'
    + '<div style="margin-top:4px;font-size:0.95em">Запланировано: <strong>' + rubPlanned.toLocaleString('ru-RU') + ' ₽</strong></div>'
    + '<div style="font-size:0.9em;color:#81c784">✅ Потрачено: <strong>' + rubSpent.toLocaleString('ru-RU') + ' ₽</strong></div>'
    + '<div style="font-size:0.9em;color:#64b5f6">📅 Осталось: <strong>' + rubRemaining.toLocaleString('ru-RU') + ' ₽</strong></div>'
    + '</div>'
    + '<div class="tl-summary-row" style="margin-top:10px;padding:8px 10px;background:rgba(255,255,255,0.08);border-radius:6px">'
    + '<div style="font-weight:bold;margin-bottom:6px">📈 Готовность к переезду</div>'
    + '<div class="plan-metric-details" style="margin-bottom:6px">'
    + '<div class="metric-detail-item"><span>🎯 Всего задач</span><span class="metric-num">' + globalTaskTotal + '</span></div>'
    + '<div class="metric-detail-item done"><span>🟢 Готово</span><span class="metric-num">' + globalTaskDone + ' (' + globalDonePct + '%)</span></div>'
    + '<div class="metric-detail-item progress"><span>🟡 В процессе</span><span class="metric-num">' + globalTaskProgress + ' (' + globalProgPct + '%)</span></div>'
    + '</div>'
    + '<div class="plan-progress-track tasks-combined">'
    + '<div class="plan-progress-segment segment-done" style="width:' + globalDonePct + '%"></div>'
    + (globalProgPct > 0 ? '<div class="plan-progress-segment segment-progress" style="left:' + globalDonePct + '%;width:' + globalProgPct + '%"></div>' : '')
    + '</div>'
    + '</div>'
    + '<div class="tl-summary-row" style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.08);border-radius:6px">'
    + '<div>🇷🇸 <b>Расходы в Сербии (Месяцы 1–3):</b></div>'
    + '<div style="margin-top:4px;font-size:0.95em">Запланировано: <strong>' + eurPlanned013.toLocaleString('ru-RU') + ' €</strong></div>'
    + '<div style="font-size:0.9em;color:#81c784">✅ Потрачено: <strong>' + eurSpent013.toLocaleString('ru-RU') + ' €</strong></div>'
    + '<div style="font-size:0.9em;color:#64b5f6">📅 Осталось: <strong>' + eurRemaining013.toLocaleString('ru-RU') + ' €</strong></div>'
    + '</div>'
    + '<div class="tl-summary-row" style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.2)">🔄 Ежемесячный бюджет на рельсах (Месяц 4): <strong>' + eurPlanned4.toLocaleString('ru-RU') + ' €</strong>'
    + (eurSpent4 > 0 ? ' <span style="font-size:0.85em;color:#81c784">(потрачено ' + eurSpent4.toLocaleString('ru-RU') + ' €)</span>' : '')
    + '</div>';
}

let _planStateCache = null;
let _planStateCacheKey = '';
window.addEventListener('storage', (e) => {
  if (e.key === 'plan-state') { _planStateCache = null; _planStateCacheKey = ''; }
});

function getPlanState() {
  try {
    const raw = localStorage.getItem('plan-state');
    if (raw === _planStateCacheKey) return _planStateCache;
    const parsed = JSON.parse(raw || 'null');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && parsed.tasks && typeof parsed.tasks === 'object') {
      _planStateCache = parsed;
      _planStateCacheKey = raw;
      return parsed;
    }
    _planStateCache = null;
    _planStateCacheKey = raw || '';
    return null;
  } catch {
    _planStateCache = null;
    _planStateCacheKey = '';
    return null;
  }
}

function setPlanState(state) {
  const json = JSON.stringify(state);
  const hadPlan = !!localStorage.getItem('plan-state');
  localStorage.setItem('plan-state', json);
  _planStateCache = state;
  _planStateCacheKey = json;
  const ver = hadPlan ? (parseInt(localStorage.getItem('plan-local-version') || '0', 10) || 0) + 1 : 1;
  localStorage.setItem('plan-local-version', String(ver));
}
