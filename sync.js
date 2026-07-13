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
let syncPending = false;

firebase.auth().signInAnonymously().catch(() => {});
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;
    syncCode = localStorage.getItem('sync-code');
    if (!syncCode) {
      syncCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      localStorage.setItem('sync-code', syncCode);
    }
    document.getElementById('sync-code-display').textContent = syncCode;
    loadFromCloud();
  }
});

function loadFromCloud() {
  if (!syncCode) return;
  db.collection('users').doc(syncCode).get().then(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    if (data.checklist) {
      localStorage.setItem('checklist', JSON.stringify(data.checklist));
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
  }).catch(() => {});
}

function saveToCloud() {
  if (!syncCode || syncPending) return;
  syncPending = true;
  try {
    const data = {
      checklist: JSON.parse(localStorage.getItem('checklist') || '{}'),
      locked: localStorage.getItem('checklist-locked') === 'true',
      calc: getCalcValues(),
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
  }, 500);
}

const origSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  origSetItem.call(this, key, value);
  if (key === 'checklist' || key === 'checklist-locked') {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { saveToCloud(); } catch (e) {}
    }, 500);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('sync-code-toggle').addEventListener('click', () => {
    document.getElementById('sync-code-body').classList.toggle('hidden');
  });
  document.getElementById('sync-code-copy').addEventListener('click', () => {
    const code = document.getElementById('sync-code-display').textContent;
    navigator.clipboard.writeText(code).catch(() => {});
  });
  document.getElementById('sync-code-change').addEventListener('click', () => {
    const code = prompt('Введите код синхронизации с другого устройства:', syncCode || '');
    if (code && code.trim()) {
      const c = code.trim().toUpperCase();
      localStorage.setItem('sync-code', c);
      syncCode = c;
      document.getElementById('sync-code-display').textContent = c;
      loadFromCloud();
    }
  });
});
