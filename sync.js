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
const settings = { cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED };
db.settings(settings);
db.enablePersistence({ synchronizeTabs: true }).catch(() => {});

let userId = null;
let syncPending = false;

firebase.auth().signInAnonymously().catch(e => console.warn('Auth error:', e));
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    userId = user.uid;
    loadFromCloud();
  }
});

function loadFromCloud() {
  if (!userId) return;
  db.collection('users').doc(userId).get().then(doc => {
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
  if (!userId || syncPending) return;
  syncPending = true;
  const data = {
    checklist: JSON.parse(localStorage.getItem('checklist') || '{}'),
    locked: localStorage.getItem('checklist-locked') === 'true',
    calc: getCalcValues(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  db.collection('users').doc(userId).set(data, { merge: true })
    .then(() => { syncPending = false; })
    .catch(() => { syncPending = false; });
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
  saveTimer = setTimeout(saveToCloud, 500);
}

const origSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  origSetItem.call(this, key, value);
  if (key === 'checklist' || key === 'checklist-locked') {
    scheduleSync();
  }
};
