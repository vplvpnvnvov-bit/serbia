// === Firebase Sync ===

const firebaseConfig = {
  apiKey: "AIzaSyBOZ-ou8bBnJ6HoubfxFiDNlJ6wiiX8vOk",
  authDomain: "serbia-checklist-sync.firebaseapp.com",
  projectId: "serbia-checklist-sync",
  storageBucket: "serbia-checklist-sync.firebasestorage.app",
  messagingSenderId: "780888147702",
  appId: "1:780888147702:web:1d724f0ba1f5ff1eb90ed7",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

let userId = null;
let syncCode = null;
window.syncPending = false;
let syncLoading = false;
let _unsubSnapshot = null;
let _localWritePending = false;

window.registerUser = async function(email, password) {
  const cred = await firebase.auth().createUserWithEmailAndPassword(email, password);
  return cred.user;
};

window.loginUser = async function(email, password) {
  const cred = await firebase.auth().signInWithEmailAndPassword(email, password);
  return cred.user;
};

window.logoutUser = async function() {
  await firebase.auth().signOut();
};

function generateSecureSyncCode() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint32Array(12);
  window.crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < 12; i++) code += chars[array[i] % chars.length];
  return code;
}

window.generateSecureSyncCode = generateSecureSyncCode;

window.generateNewSyncCode = function() {
  const code = generateSecureSyncCode();
  localStorage.setItem('sync-code', code);
  syncCode = code;
  document.getElementById('display-sync-code').textContent = code;
  setupSnapshotListener();
  return code;
};

firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    userId = user.uid;

    syncCode = localStorage.getItem('sync-code');
    if (!syncCode) {
      window.hideSplash();
      document.getElementById('auth-screen').classList.add('hidden');
      document.getElementById('company-screen').classList.remove('hidden');
      return;
    }
    window.hideSplash();
    document.getElementById('display-sync-code').textContent = syncCode;
    updateCloudStatus();
    setupSnapshotListener();
    window.dispatchEvent(new CustomEvent('auth-ready'));
  } else {
    window.hideSplash();
    userId = null;
    if (_unsubSnapshot) { _unsubSnapshot(); _unsubSnapshot = null; }
    window.dispatchEvent(new CustomEvent('auth-logout'));
  }
});

function updateSyncStatusUI() {
  const displaySyncCode = document.getElementById('display-sync-code');
  const syncCodeVal = localStorage.getItem('sync-code');
  if (displaySyncCode) {
    displaySyncCode.textContent = syncCodeVal ? syncCodeVal : 'Не установлен';
  }
}

function setupSnapshotListener() {
  if (_unsubSnapshot) { _unsubSnapshot(); _unsubSnapshot = null; }
  if (!syncCode || !userId) return;

  _unsubSnapshot = db.collection('users').doc(syncCode).onSnapshot(snapshot => {
    if (!snapshot.exists) { console.log('[sync] snapshot: doc does not exist'); return; }
    if (snapshot.metadata.hasPendingWrites) { console.log('[sync] snapshot: pending writes (own)'); return; }
    if (_localWritePending) { console.log('[sync] snapshot: local write pending'); return; }
    if (window._localPlanDirty) { console.log('[sync] snapshot: local plan dirty'); return; }

    const data = snapshot.data();
    if (!data || !data.lastUpdated) { console.log('[sync] snapshot: no data or lastUpdated'); return; }

    const localVersion = parseInt(localStorage.getItem('plan-local-version') || '0', 10) || 0;
    if (data.plan && data.planVersion !== undefined && data.planVersion <= localVersion) {
      console.log(`[sync] snapshot: version skip (cloud=${data.planVersion} local=${localVersion})`);
      return;
    }

    const serverTs = data.lastUpdated.toMillis ? data.lastUpdated.toMillis() : data.lastUpdated;
    const localTs = parseInt(localStorage.getItem('plan-state-last-updated') || '0', 10);

    if (!data.plan) { console.log('[sync] snapshot: no plan in data'); return; }

    if (serverTs > localTs) {
      console.log(`[sync] ACCEPT: ts=${serverTs} localTs=${localTs} ver=${data.planVersion}`);
      if (data.plan && data.plan.tasks) console.log('[sync] dentist in snapshot:', JSON.stringify(data.plan.tasks.dentist));
      if (data._diag_dentist !== undefined) console.log('[diag] dentist WRITTEN BY PHONE:', data._diag_dentist);
      localStorage.setItem('plan-state', JSON.stringify(data.plan));
      localStorage.setItem('plan-state-last-updated', String(serverTs));
      if (data.planVersion !== undefined) {
        localStorage.setItem('plan-local-version', String(data.planVersion));
      }
      localStorage.setItem('last-sync-time', new Date().toLocaleString());
      updateSyncStatusUI();
      updateCloudStatus();
      window.dispatchEvent(new CustomEvent('sync-loaded'));
    } else {
      console.log(`[sync] snapshot: ts skip (serverTs=${serverTs} <= localTs=${localTs})`);
    }
  }, err => {
    if (err.code !== 'permission-denied') console.warn('Snapshot error:', err.message);
  });
}

async function updateCloudStatus() {
  const el = document.getElementById('cloud-status');
  if (!el) return;
  if (!syncCode) { el.textContent = 'Нет кода'; return; }
  try {
    const doc = await db.collection('users').doc(syncCode).get({ source: 'default' });
    if (!doc.exists) { el.textContent = '❌ Нет данных'; return; }
    const data = doc.data();
    if (data.updatedAt) {
      const ts = data.updatedAt.toDate ? data.updatedAt.toDate().toLocaleString() : 'есть данные';
      el.textContent = `✅ ${ts}`;
    } else {
      el.textContent = '✅ Есть данные';
    }
  } catch (_) {
    el.textContent = '⚠️ Ошибка сети';
  }
}

window.loadFromCloud = async function() {
  if (!syncCode) return;
  if (syncLoading) throw new Error('Загрузка уже выполняется');
  await fetchAndLoadDoc();
};

async function fetchAndLoadDoc() {
  const ref = db.collection('users').doc(syncCode);

  let doc;
  try {
    doc = await ref.get({ source: 'server' });
  } catch (_) {
    doc = await ref.get({ source: 'cache' });
  }

  if (!doc.exists) return;
  const data = doc.data();

  if (!data) {
    console.warn('Документ существует, но он пустой.');
    return;
  }

  syncLoading = true;
  try {
    if (data.plan) {
      const localVersion = parseInt(localStorage.getItem('plan-local-version') || '0', 10) || 0;
      const rawTs = data.lastUpdated || 0;
      const serverTs = rawTs && rawTs.toMillis ? rawTs.toMillis() : rawTs;
      const localTs = parseInt(localStorage.getItem('plan-state-last-updated') || '0', 10);
      const versionOk = data.planVersion === undefined || data.planVersion > localVersion;
      if (versionOk && serverTs > localTs) {
        localStorage.setItem('plan-state', JSON.stringify(data.plan));
        localStorage.setItem('plan-state-last-updated', String(serverTs));
        if (data.planVersion !== undefined) {
          localStorage.setItem('plan-local-version', String(data.planVersion));
        }
      }
    } else if (data.checklist || data.calc) {
      localStorage.setItem('checklist', JSON.stringify(data.checklist || {}));
      if (data.locked !== undefined) localStorage.setItem('checklist-locked', String(data.locked));
      if (data.calc) localStorage.setItem('calc-state', JSON.stringify(data.calc));
      migrateLegacyData();
    }

    window.dispatchEvent(new CustomEvent('sync-loaded'));
    localStorage.setItem('last-sync-time', new Date().toLocaleString());
    updateSyncStatusUI();
    updateCloudStatus();
  } finally {
    syncLoading = false;
  }
}

window.saveToCloud = async function() {
  if (!syncCode) return;
  if (window.syncPending) throw new Error('Синхронизация уже выполняется');
  window.syncPending = true;
  _localWritePending = true;
  try {
    const localVersion = parseInt(localStorage.getItem('plan-local-version') || '0', 10) || 0;
    const plan = getPlanValues();
    const data = {
      planVersion: localVersion,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (plan && plan.tasks) {
      data.plan = plan;
    }
    if (plan && plan.tasks && plan.tasks.dentist) data._diag_dentist = JSON.stringify(plan.tasks.dentist);
    if (plan && plan.tasks && plan.tasks.dentist) console.log('[sync] SAVING dentist:', JSON.stringify(plan.tasks.dentist));
    if (plan && plan.tasks && plan.tasks.dentist) console.log('[sync] SAVING dentist:', JSON.stringify(plan.tasks.dentist));

    const ref = db.collection('users').doc(syncCode);
    const existing = await ref.get({ source: 'cache' });
    if (!existing.exists || !existing.data().owner) {
      data.owner = userId;
    }

    await ref.set(data, { merge: true });

    const written = await ref.get({ source: 'server' });
    const serverTs = written.data()?.lastUpdated;
    if (serverTs && serverTs.toMillis) {
      localStorage.setItem('plan-state-last-updated', String(serverTs.toMillis()));
    }

    localStorage.setItem('last-sync-time', new Date().toLocaleString());
    updateSyncStatusUI();
    updateCloudStatus();
    await fetchAndLoadDoc();
  } finally {
    _localWritePending = false;
    window.syncPending = false;
  }
};

window.deleteCloudData = async function() {
  const code = localStorage.getItem('sync-code');
  if (!code) throw new Error('Нет кода синхронизации');
  const ref = db.collection('users').doc(code);
  await ref.delete();
  const v = await ref.get({ source: 'server' });
  if (v.exists) throw new Error('Сервер не подтвердил удаление');
  localStorage.removeItem('last-sync-time');
  updateSyncStatusUI();
  updateCloudStatus();
};

function getPlanValues() {
  try {
    const raw = JSON.parse(localStorage.getItem('plan-state') || 'null');
    if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.tasks && typeof raw.tasks === 'object') {
      return raw;
    }
    return {};
  } catch { return {}; }
}

function migrateLegacyData() {
  if (localStorage.getItem('plan-state')) return false;
  const oldRaw = localStorage.getItem('checklist');
  const oldCalc = localStorage.getItem('calc-state');
  if (!oldRaw && !oldCalc) return false;

  let oldChecklist = {};
  try { oldChecklist = JSON.parse(oldRaw || '{}'); } catch {}

  let oldCalcValues = {};
  try { oldCalcValues = JSON.parse(oldCalc || '{}'); } catch {}

  if (typeof window.masterTimeline === 'undefined') return false;

  const tasks = {};
  const timeline = window.masterTimeline;

  timeline.forEach(m => {
    m.tasks.forEach(t => {
      const old = oldChecklist[t.id];
      const entry = { checked: false, progress: false, customCost: null };
      if (old !== undefined && old !== null) {
        if (typeof old === 'boolean') {
          entry.checked = old;
        } else if (typeof old === 'object') {
          entry.checked = !!old.done;
          entry.progress = !!old.progress;
          if (old.date) entry.date = old.date;
          if (old.note) entry.note = old.note;
        }
      }
      if (oldCalcValues[t.id] !== undefined) {
        entry.customCost = oldCalcValues[t.id];
      }
      tasks[t.id] = entry;
    });
  });

  const planState = { tasks };
  if (typeof setPlanState === 'function') {
    setPlanState(planState);
  } else {
    localStorage.setItem('plan-state', JSON.stringify(planState));
    localStorage.setItem('plan-local-version', '1');
  }
  localStorage.removeItem('checklist');
  localStorage.removeItem('checklist-locked');
  localStorage.removeItem('calc-state');
  return true;
}

window.migrateLegacyData = migrateLegacyData;


window.changeSyncCode = function() {
  const raw = prompt('Введите ключ компании:', syncCode || '');
  if (raw && raw.trim()) {
    const c = raw.trim();
    if (c.length < 6 || c.length > 18) {
      window.showConfirm('Ошибка', 'Код должен быть от 6 до 18 символов.');
      return;
    }
    localStorage.setItem('sync-code', c);
    syncCode = c;
    document.getElementById('display-sync-code').textContent = c;
    updateCloudStatus();
    setupSnapshotListener();
    window.loadFromCloud().catch(() => {});
  }
};
