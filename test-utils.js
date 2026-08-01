const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function loadUtils(mocks = {}) {
  const storage = {};
  const defaultStorage = {
    _store: storage,
    getItem(key) { return mocks[key] !== undefined ? mocks[key] : (storage[key] !== undefined ? storage[key] : null); },
    setItem(key, val) { storage[key] = val; },
    removeItem(key) { delete storage[key]; },
    clear() { Object.keys(storage).forEach(k => delete storage[k]); },
  };

  const listeners = [];
  const sandbox = {
    localStorage: defaultStorage,
    window: {
      addEventListener(name, fn) { if (name === 'storage') listeners.push(fn); },
      _fireStorage(key) { listeners.forEach(fn => fn({ key })); },
    },
    console,
    setTimeout,
    clearTimeout,
    parseInt,
    Math,
    JSON,
  };

  const ctx = vm.createContext(sandbox);
  const code = fs.readFileSync(path.join(__dirname, 'utils.js'), 'utf-8');
  vm.runInContext(code, ctx);

  return {
    ...sandbox,
    _storage: storage,
    _fireStorage(key) { sandbox.window._fireStorage(key); },
    getStore() { return structuredClone(storage); },
  };
}

describe('formatPrice', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('returns "0 CUR" for falsy value', () => {
    assert.equal(fns.formatPrice(0, '€'), '0 €');
    assert.equal(fns.formatPrice(null, '₽'), '0 ₽');
    assert.equal(fns.formatPrice(undefined, '€'), '0 €');
    assert.equal(fns.formatPrice(false, '€'), '0 €');
  });

  it('formats with locale and appends currency', () => {
    const r = fns.formatPrice(1000, '€');
    assert.ok(r.includes('1'));
    assert.ok(r.endsWith(' €'));
  });

  it('formats large numbers with grouping', () => {
    const r = fns.formatPrice(100000, '₽');
    assert.ok(r.includes('100'));
    assert.ok(r.endsWith(' ₽'));
  });
});

describe('safeUrl', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('returns # for falsy', () => {
    assert.equal(fns.safeUrl(null), '#');
    assert.equal(fns.safeUrl(undefined), '#');
    assert.equal(fns.safeUrl(''), '#');
    assert.equal(fns.safeUrl(false), '#');
  });

  it('blocks javascript: protocol', () => {
    assert.equal(fns.safeUrl('javascript:alert(1)'), '#');
    assert.equal(fns.safeUrl('  JavaScript:void(0)'), '#');
  });

  it('blocks data: protocol', () => {
    assert.equal(fns.safeUrl('data:text/html,<script>alert(1)</script>'), '#');
    assert.equal(fns.safeUrl('  DATA:image/png;base64,abc'), '#');
  });

  it('passes through safe URLs', () => {
    assert.equal(fns.safeUrl('https://example.com'), 'https://example.com');
    assert.equal(fns.safeUrl('http://example.com/path?q=1'), 'http://example.com/path?q=1');
  });
});

describe('presetEmoji', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('returns correct emoji for each preset', () => {
    assert.equal(fns.presetEmoji('family'), '👶');
    assert.equal(fns.presetEmoji('budget'), '💰');
    assert.equal(fns.presetEmoji('vibe'), '⚡');
  });

  it('returns vibe emoji for unknown preset', () => {
    assert.equal(fns.presetEmoji('unknown'), '⚡');
    assert.equal(fns.presetEmoji(), '⚡');
  });
});

describe('presetName', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('returns correct name for each preset', () => {
    assert.equal(fns.presetName('family'), 'С детьми');
    assert.equal(fns.presetName('budget'), 'Бюджетно');
    assert.equal(fns.presetName('vibe'), 'Движ');
  });
});

describe('scoreColor', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('returns green for high scores', () => {
    assert.equal(fns.scoreColor(10), '#1b5e20');
    assert.equal(fns.scoreColor(9), '#1b5e20');
    assert.equal(fns.scoreColor(7), '#43a047');
  });

  it('returns yellow for mid scores', () => {
    assert.equal(fns.scoreColor(6), '#fbc02d');
    assert.equal(fns.scoreColor(5), '#fbc02d');
    assert.equal(fns.scoreColor(3), '#f57c00');
  });

  it('returns red for low scores', () => {
    assert.equal(fns.scoreColor(2), '#d32f2f');
    assert.equal(fns.scoreColor(0), '#d32f2f');
    assert.equal(fns.scoreColor(-1), '#d32f2f');
  });
});

describe('scoreBg', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('returns light bg matching score tiers', () => {
    assert.equal(fns.scoreBg(9), '#e8f5e9');
    assert.equal(fns.scoreBg(7), '#e8f5e9');
    assert.equal(fns.scoreBg(5), '#fffde7');
    assert.equal(fns.scoreBg(3), '#fff3e0');
    assert.equal(fns.scoreBg(0), '#ffebee');
  });
});

describe('getScore', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  const d = { familyScore: 8, budgetScore: 4, vibeScore: 6 };

  it('returns correct score per preset', () => {
    assert.equal(fns.getScore(d, 'family'), 8);
    assert.equal(fns.getScore(d, 'budget'), 4);
    assert.equal(fns.getScore(d, 'vibe'), 6);
  });

  it('defaults to family score for unknown preset', () => {
    assert.equal(fns.getScore(d, 'unknown'), 8);
    assert.equal(fns.getScore(d), 8);
  });
});

describe('getNormalizedScore', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  const d1 = { familyScore: 9, budgetScore: 3, vibeScore: 7 };
  const d2 = { familyScore: 4, budgetScore: 8, vibeScore: 2 };
  const d3 = { familyScore: 7, budgetScore: 5, vibeScore: 9 };

  it('returns raw score when only 1 district', () => {
    assert.equal(fns.getNormalizedScore(d1, 'family', [d1]), 9);
    assert.equal(fns.getNormalizedScore(d1, 'family', null), 9);
  });

  it('returns 5 when all scores equal', () => {
    const d = { familyScore: 6, budgetScore: 6, vibeScore: 6 };
    const d2 = { familyScore: 6, budgetScore: 6, vibeScore: 6 };
    assert.equal(fns.getNormalizedScore(d, 'family', [d, d2]), 5);
    assert.equal(fns.getNormalizedScore(d2, 'family', [d, d2]), 5);
  });

  it('normalizes across range correctly', () => {
    const districts = [d1, d2, d3];
    const s1 = fns.getNormalizedScore(d1, 'family', districts);
    const s2 = fns.getNormalizedScore(d2, 'family', districts);
    const s3 = fns.getNormalizedScore(d3, 'family', districts);
    assert.equal(s1, 10);
    assert.equal(s2, 1);
    assert.ok(s3 > 1 && s3 < 10);
  });

  it('uses cached min/max when provided', () => {
    const districts = [d1, d2, d3];
    const raw = districts.map(vd => fns.getScore(vd, 'family'));
    const rmin = Math.min(...raw);
    const rmax = Math.max(...raw);
    const s1 = fns.getNormalizedScore(d1, 'family', districts, rmin, rmax);
    assert.equal(s1, 10);
  });
});

describe('darkenHex', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('darkens a hex color', () => {
    const result = fns.darkenHex('#ffffff', 30);
    assert.ok(result.startsWith('#'));
    assert.notEqual(result, '#ffffff');
  });

  it('returns #888 for invalid hex', () => {
    assert.equal(fns.darkenHex(null, 30), '#888');
    assert.equal(fns.darkenHex('', 30), '#888');
    assert.equal(fns.darkenHex('rgb(1,2,3)', 30), '#888');
  });

  it('clamps to 0', () => {
    const result = fns.darkenHex('#111111', 999);
    assert.equal(result, '#000000');
  });
});

describe('lightenHex', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('lightens a hex color', () => {
    const result = fns.lightenHex('#000000', 30);
    assert.ok(result.startsWith('#'));
    assert.notEqual(result, '#000000');
  });

  it('returns #aaa for invalid hex', () => {
    assert.equal(fns.lightenHex(null, 30), '#aaa');
    assert.equal(fns.lightenHex('', 30), '#aaa');
  });

  it('clamps to 255', () => {
    const result = fns.lightenHex('#eeeeee', 999);
    assert.equal(result, '#ffffff');
  });
});

describe('scoreMax', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });
  it('returns 10', () => { assert.equal(fns.scoreMax(), 10); });
});

describe('districtLabel', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('generates label with price and color', () => {
    const r = fns.districtLabel('Test', '600 – 800 €', 7);
    assert.ok(r.includes('от 600€'));
    assert.ok(r.includes('map-price-badge'));
  });

  it('uses red for high price', () => {
    const r = fns.districtLabel('Test', '700 – 900 €', 7);
    assert.ok(r.includes('#d32f2f'));
  });

  it('uses orange for mid price', () => {
    const r = fns.districtLabel('Test', '500 €', 7);
    assert.ok(r.includes('#f57c00'));
  });

  it('uses green for low price', () => {
    const r = fns.districtLabel('Test', '300 €', 7);
    assert.ok(r.includes('#388e3c'));
  });
});

describe('calculateMonthMetrics', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('handles non-array input', () => {
    const r = fns.calculateMonthMetrics(null, {});
    assert.equal(r.totalPlanned, 0);
    assert.equal(r.taskTotal, 0);
    assert.equal(r.combinedTaskPct, 0);
    assert.equal(r.combinedBudgetPct, 0);
    assert.equal(r.pendingTasksCount, 0);
  });

  it('handles null state gracefully', () => {
    const tasks = [{ id: 'a', cost: 100 }];
    const r = fns.calculateMonthMetrics(tasks, null);
    assert.equal(r.totalPlanned, 100);
    assert.equal(r.spent, 0);
    assert.equal(r.taskTotal, 1);
  });

  it('counts checked tasks as spent', () => {
    const tasks = [
      { id: 'a', cost: 100 },
      { id: 'b', cost: 200 },
    ];
    const state = { tasks: { a: { checked: true, progress: false }, b: { checked: false, progress: false } } };
    const r = fns.calculateMonthMetrics(tasks, state);
    assert.equal(r.totalPlanned, 300);
    assert.equal(r.spent, 100);
    assert.equal(r.taskDone, 1);
    assert.equal(r.spentPct, 33);
  });

  it('counts progress tasks in spentInProgress', () => {
    const tasks = [
      { id: 'a', cost: 100 },
      { id: 'b', cost: 200 },
    ];
    const state = { tasks: { a: { checked: false, progress: true }, b: { checked: false, progress: false } } };
    const r = fns.calculateMonthMetrics(tasks, state);
    assert.equal(r.spentInProgress, 100);
    assert.equal(r.taskProgress, 1);
  });

  it('uses customCost when set', () => {
    const tasks = [{ id: 'a', cost: 100 }];
    const state = { tasks: { a: { checked: false, progress: false, customCost: 500 } } };
    const r = fns.calculateMonthMetrics(tasks, state);
    assert.equal(r.totalPlanned, 500);
  });

  it('handles zero-cost tasks without division by zero', () => {
    const tasks = [{ id: 'a', cost: 0 }];
    const state = { tasks: {} };
    const r = fns.calculateMonthMetrics(tasks, state);
    assert.equal(r.spentPct, 0);
    assert.equal(r.combinedBudgetPct, 0);
    assert.equal(r.donePct, 0);
  });

  it('calculates combined percentages correctly', () => {
    const tasks = [
      { id: 'a', cost: 100 },
      { id: 'b', cost: 100 },
    ];
    const state = { tasks: { a: { checked: true }, b: { progress: true } } };
    const r = fns.calculateMonthMetrics(tasks, state);
    assert.equal(r.donePct, 50);
    assert.equal(r.progPct, 50);
    assert.equal(r.combinedTaskPct, 75);
    assert.equal(r.combinedBudgetPct, 100);
  });

  it('returns correct pendingTasksCount', () => {
    const tasks = [
      { id: 'a', cost: 100 },
      { id: 'b', cost: 100 },
      { id: 'c', cost: 100 },
    ];
    const state = { tasks: { a: { checked: true }, b: { progress: true } } };
    const r = fns.calculateMonthMetrics(tasks, state);
    assert.equal(r.pendingTasksCount, 1);
  });

  it('skips null tasks in array', () => {
    const tasks = [null, { id: 'a', cost: 100 }];
    const r = fns.calculateMonthMetrics(tasks, {});
    assert.equal(r.taskTotal, 1);
    assert.equal(r.totalPlanned, 100);
  });
});

describe('buildMonthMetricsHTML', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  const M = {
    totalPlanned: 1000, spent: 300, spentInProgress: 200,
    taskDone: 2, taskProgress: 1, taskTotal: 5,
    spentPct: 30, pendingSpentPct: 20, donePct: 40, progPct: 20,
    combinedTaskPct: 50, combinedBudgetPct: 50,
  };

  it('includes budget section', () => {
    const html = fns.buildMonthMetricsHTML(M, ' €');
    assert.ok(html.includes('Финансовый бюджет'));
    assert.ok(html.includes(fns.formatPrice(1000, ' €')));
  });

  it('includes task progress section', () => {
    const html = fns.buildMonthMetricsHTML(M, ' €');
    assert.ok(html.includes('Физический прогресс'));
    assert.ok(html.includes('2 из 5'));
  });

  it('includes pending segment when pendingSpentPct > 0', () => {
    const html = fns.buildMonthMetricsHTML(M, ' €');
    assert.ok(html.includes('segment-pending-spent'));
  });

  it('omits pending segment when pendingSpentPct = 0', () => {
    const m = { ...M, pendingSpentPct: 0, progPct: 0 };
    const html = fns.buildMonthMetricsHTML(m, ' €');
    assert.ok(!html.includes('segment-pending-spent'));
  });

  it('omits progress segment when progPct = 0', () => {
    const m = { ...M, progPct: 0 };
    const html = fns.buildMonthMetricsHTML(m, ' €');
    assert.ok(!html.includes('segment-progress'));
  });
});

describe('buildSummaryHTML', () => {
  let fns;
  beforeEach(() => { fns = loadUtils(); });

  it('generates summary with all sections', () => {
    const html = fns.buildSummaryHTML(
      50000, 20000, 10000, 3000, 1000, 500, 750, 0,
      8, 5, 20
    );
    assert.ok(html.includes('Стартовая подушка'));
    assert.ok(html.includes('Расходы в РФ'));
    assert.ok(html.includes('Готовность к переезду'));
    assert.ok(html.includes('Расходы в Сербии'));
    assert.ok(html.includes('Ежемесячный бюджет'));
  });

  it('handles zero values without NaN', () => {
    const html = fns.buildSummaryHTML(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert.ok(!html.includes('NaN'));
    assert.ok(!html.includes('undefined'));
  });

  it('includes remaining values', () => {
    const html = fns.buildSummaryHTML(1000, 300, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    assert.ok(html.includes('700'));
  });

  it('shows eurSpent4 detail when > 0', () => {
    const html = fns.buildSummaryHTML(0, 0, 0, 0, 0, 0, 1000, 300, 0, 0, 0);
    assert.ok(html.includes('потрачено'));
  });

  it('does not show spent detail when eurSpent4 = 0', () => {
    const html = fns.buildSummaryHTML(0, 0, 0, 0, 0, 0, 1000, 0, 0, 0, 0);
    assert.ok(!html.includes('потрачено'));
  });
});

describe('getPlanState / setPlanState', () => {
  let env;
  beforeEach(() => { env = loadUtils(); });

  it('returns null when no state stored', () => {
    assert.equal(env.getPlanState(), null);
  });

  it('returns stored state after setPlanState', () => {
    const state = { tasks: { a: { checked: true, progress: false, customCost: null } } };
    env.setPlanState(state);
    const r = env.getPlanState();
    assert.deepEqual(r, state);
  });

  it('returns null for invalid state shape', () => {
    env.localStorage.setItem('plan-state', JSON.stringify({ foo: 'bar' }));
    assert.equal(env.getPlanState(), null);
  });

  it('returns null for non-object state', () => {
    env.localStorage.setItem('plan-state', '"string"');
    assert.equal(env.getPlanState(), null);
  });

  it('returns null for array state', () => {
    env.localStorage.setItem('plan-state', '[1,2,3]');
    assert.equal(env.getPlanState(), null);
  });

  it('uses cache on repeated calls', () => {
    const state = { tasks: { x: { checked: false } } };
    env.setPlanState(state);
    const r1 = env.getPlanState();
    const r2 = env.getPlanState();
    assert.equal(r1, r2);
  });

  it('invalidates cache when localStorage changes through storage event', () => {
    const state = { tasks: { x: { checked: false } } };
    env.setPlanState(state);
    assert.notEqual(env.getPlanState(), null);

    env._fireStorage('plan-state');
    env._planStateCache = null;
    env._planStateCacheKey = '';

    env.localStorage.setItem('plan-state', JSON.stringify({ tasks: { y: { checked: true } } }));
    const r = env.getPlanState();
    assert.deepEqual(r, { tasks: { y: { checked: true } } });
  });

  it('increments plan-local-version on setPlanState', () => {
    env.localStorage.setItem('plan-local-version', '5');
    env.setPlanState({ tasks: {} });
    assert.equal(env.localStorage.getItem('plan-local-version'), '6');
  });

  it('starts plan-local-version at 1 when not set', () => {
    env.setPlanState({ tasks: {} });
    assert.equal(env.localStorage.getItem('plan-local-version'), '1');
  });
});
