// === Firebase Sync ===
const CURRENT_DATA_VERSION = "2026.1";

function sanitizeChecklist(data) {
  if (!data || typeof data !== 'object') return {};
  const validIds = typeof window.getValidChecklistIds === 'function'
    ? window.getValidChecklistIds()
    : null;
  if (!validIds) return data;
  const clean = {};
  Object.keys(data).forEach(id => {
    if (validIds.has(id)) {
      clean[id] = data[id];
    }
  });
  return clean;
}

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
let syncLoading = false; // prevents write-back during loadFromCloud

firebase.auth().signInAnonymously().catch(() => {});

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
  }
});

function updateSyncStatusUI() {
  const syncTimeStatus = document.getElementById('sync-time-status');
  const displaySyncCode = document.getElementById('display-sync-code');
  const lastSync = localStorage.getItem('last-sync-time');
  const syncCode = localStorage.getItem('sync-code');

  if (displaySyncCode) {
    displaySyncCode.textContent = syncCode ? syncCode : 'Не установлен';
  }

  if (syncTimeStatus) {
    if (lastSync) {
      syncTimeStatus.textContent = lastSync;
      syncTimeStatus.className = 'status-fresh';
    } else {
      syncTimeStatus.textContent = 'Еще не синхронизировано с облаком';
      syncTimeStatus.className = 'status-none';
    }
  }
}

async function updateCloudStatus() {
  const el = document.getElementById('cloud-status');
  if (!el) return;
  if (!syncCode) { el.textContent = 'Нет кода'; return; }
  try {
    const doc = await db.collection('users').doc(syncCode).get({ source: 'server' });
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

  // Сначала читаем с сервера — чтобы не получить stale-данные из локального кеша
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
  // Санация + миграция
  if (data.checklist) {
    const version = data.version || '0';
    const needsMigration = version !== CURRENT_DATA_VERSION;
    const clean = sanitizeChecklist(data.checklist);
    if (needsMigration && typeof window.migrateChecklist === 'function') {
      const migrated = window.migrateChecklist(clean);
      localStorage.setItem('checklist', JSON.stringify(migrated));
    } else {
      localStorage.setItem('checklist', JSON.stringify(clean));
    }
  }

  if (data.locked !== undefined) {
    localStorage.setItem('checklist-locked', String(data.locked));
  }
  if (data.calc) {
    localStorage.setItem('calc-state', JSON.stringify(data.calc));
  }
  window.dispatchEvent(new CustomEvent('sync-loaded'));
  syncLoading = false;
  localStorage.setItem('last-sync-time', new Date().toLocaleString());
  updateSyncStatusUI();
  updateCloudStatus();
}

window.saveToCloud = async function() {
  if (!syncCode) return;
  if (syncPending) throw new Error('Синхронизация уже выполняется');
  syncPending = true;
  try {
    const raw = JSON.parse(localStorage.getItem('checklist') || '{}');
    const data = {
      checklist: sanitizeChecklist(raw),
      locked: localStorage.getItem('checklist-locked') === 'true',
      calc: getCalcValues(),
      version: CURRENT_DATA_VERSION,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
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

    await db.collection('users').doc(syncCode).set(data, { merge: true });
    localStorage.setItem('last-sync-time', new Date().toLocaleString());
    updateSyncStatusUI();
    updateCloudStatus();
  } finally {
    syncPending = false;
  }
};

function getCalcValues() {
  try { return JSON.parse(localStorage.getItem('calc-state') || 'null'); } catch { return {}; }
}



window.changeSyncCode = function() {
  const raw = prompt('Введите код синхронизации с другого устройства:', syncCode || '');
  if (raw && raw.trim()) {
    const c = raw.trim().toUpperCase();
    if (c.length < 6 || c.length > 18) {
      alert('Код должен быть от 6 до 18 символов.');
      return;
    }
    localStorage.setItem('sync-code', c);
    syncCode = c;
    document.getElementById('display-sync-code').textContent = c;
    updateCloudStatus();
    window.loadFromCloud().catch(() => {});
  }
};


