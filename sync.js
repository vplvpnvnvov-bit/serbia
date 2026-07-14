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
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;
    syncCode = localStorage.getItem('sync-code');
    if (!syncCode) {
      syncCode = crypto.randomUUID().split('-').slice(0,2).join('').toUpperCase();
      localStorage.setItem('sync-code', syncCode);
    }
    document.getElementById('display-sync-code').textContent = syncCode;
    loadFromCloud();
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

function loadFromCloud() {
  if (!syncCode) return Promise.resolve();
  return db.collection('users').doc(syncCode).get().then(doc => {
    if (!doc.exists) return;
    const data = doc.data();

    if (!data) {
      console.warn('Документ существует, но он пустой.');
      return;
    }

    if (data.isDeleted === true) {
      console.warn('Попытка подключиться к удаленному коду синхронизации.');
      alert('Этот код связи был ранее удален и больше недействителен. Будет сгенерирован новый чистый код.');
      syncLoading = true;
      window.localHardResetWithoutCloud();
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
      Object.entries(data.calc).forEach(([k, v]) => {
        const el = document.getElementById('calc-' + k);
        if (el) el.value = v;
      });
    }
    window.dispatchEvent(new CustomEvent('sync-loaded'));
    syncLoading = false;
    localStorage.setItem('last-sync-time', new Date().toLocaleString());
    updateSyncStatusUI();
  }).catch(() => { syncLoading = false; });
}

function saveToCloud() {
  if (!syncCode || syncPending) return;
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
    db.collection('users').doc(syncCode).set(data, { merge: true })
      .then(() => { syncPending = false; })
      .catch(() => { syncPending = false; });
  } catch (e) {
    syncPending = false;
  }
}

function getCalcValues() {
  const ids = ['rent', 'utils', 'food', 'transport', 'other'];
  const vals = {};
  ids.forEach(id => {
    const el = document.getElementById('calc-' + id);
    if (el) vals[id] = el.value;
  });
  return vals;
}

let saveTimer = null;
function scheduleSync() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { saveToCloud(); } catch (e) {}
  }, 1000);
}

const origSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  origSetItem.call(this, key, value);
  if (syncLoading) return;
  if (key === 'checklist' || key === 'checklist-locked') {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { saveToCloud(); } catch (e) {}
    }, 1000);
  }
};

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
    loadFromCloud();
  }
};

window.deleteCloudData = async function() {
  const code = localStorage.getItem('sync-code');
  if (!code) return;
  try {
    await db.collection('users').doc(code).set({
      isDeleted: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    // нет сети — не фатально
  }
};
