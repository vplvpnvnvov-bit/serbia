// === Firebase Sync ===
const CURRENT_DATA_VERSION = "2026.1";

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
let syncPending = false;
let syncLoading = false;
let _unsubSnapshot = null; // real-time listener

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
      syncCode = generateSecureSyncCode();
      localStorage.setItem('sync-code', syncCode);
    }
    document.getElementById('display-sync-code').textContent = syncCode;
    updateCloudStatus();
    setupSnapshotListener();
    window.dispatchEvent(new CustomEvent('auth-ready'));
  } else {
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
    if (!snapshot.exists) return;
    if (snapshot.metadata.hasPendingWrites) return; // our own write, ignore

    const data = snapshot.data();
    if (!data || !data.lastUpdated) return;

    const serverTs = data.lastUpdated.toMillis ? data.lastUpdated.toMillis() : data.lastUpdated;
    const localTs = parseInt(localStorage.getItem('plan-state-last-updated') || '0', 10);

    if (serverTs > localTs && data.plan) {
      localStorage.setItem('plan-state', JSON.stringify(data.plan));
      localStorage.setItem('plan-state-last-updated', String(serverTs));
      localStorage.setItem('last-sync-time', new Date().toLocaleString());
      updateSyncStatusUI();
      updateCloudStatus();
      window.dispatchEvent(new CustomEvent('sync-loaded'));
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
    if (!doc.exists) { el.textContent = '❌ Данные в облаке не найдены'; return; }
    const data = doc.data();
    if (data.updatedAt) {
      const ts = data.updatedAt.toDate ? data.updatedAt.toDate().toLocaleString() : 'есть данные';
      el.textContent = `✅ Данные есть в облаке (${ts})`;
    } else {
      el.textContent = '✅ Данные есть в облаке';
    }
  } catch (_) {
    el.textContent = '⚠️ Нет соединения с сервером';
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
      const rawTs = data.lastUpdated || 0;
      const serverTs = rawTs && rawTs.toMillis ? rawTs.toMillis() : rawTs;
      const localTs = parseInt(localStorage.getItem('plan-state-last-updated') || '0', 10);
      if (serverTs > localTs) {
        localStorage.setItem('plan-state', JSON.stringify(data.plan));
        localStorage.setItem('plan-state-last-updated', String(serverTs));
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
  if (syncPending) throw new Error('Синхронизация уже выполняется');
  syncPending = true;
  try {
    const data = {
      plan: getPlanValues(),
      version: CURRENT_DATA_VERSION,
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

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
  } finally {
    syncPending = false;
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

  const state = { tasks };
  localStorage.setItem('plan-state', JSON.stringify(state));
  localStorage.removeItem('checklist');
  localStorage.removeItem('checklist-locked');
  localStorage.removeItem('calc-state');
  return true;
}

window.migrateLegacyData = migrateLegacyData;


window.changeSyncCode = function() {
  const raw = prompt('Введите код синхронизации с другого устройства:', syncCode || '');
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
