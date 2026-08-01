window.APP_CONFIG = {
  VERSION: "6.40.16",
  BUILD: "6bad02c",
  CACHE_NAME: "relocation-v6.40.16-6bad02c",
  MIN_SPLASH_MS: 5000
};

window._MIN_SPLASH_MS = Number(window.APP_CONFIG.MIN_SPLASH_MS) || 5000;
// === AUTH SCREEN ===
let authMode = 'login';

function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  setTimeout(() => {
    if (!document.getElementById('tab-schema')?.classList.contains('active')) return;
    try {
      const toggle = document.getElementById('toggle-schema-editor');
      if (toggle) toggle.checked = localStorage.getItem('schema-editor-enabled') === 'true';
      updateSchemaToolbar();
      renderSchema();
    } catch (e) { showUserError(e, 'Инициализация приложения'); }
  }, 150);
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function showAuthError(msg) {
  const el = document.getElementById('auth-error');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}

function hideAuthError() {
  const el = document.getElementById('auth-error');
  if (el) { el.classList.add('hidden'); el.textContent = ''; }
}

function setAuthLoading(loading) {
  const btn = document.getElementById('auth-submit');
  const email = document.getElementById('auth-email');
  const pass = document.getElementById('auth-password');
  if (btn) { btn.disabled = loading; btn.textContent = loading ? '⏳ Подождите...' : (authMode === 'login' ? 'Войти' : 'Создать аккаунт'); }
  if (email) email.disabled = loading;
  if (pass) pass.disabled = loading;
}

document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    authMode = tab.dataset.authTab;
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('auth-submit').textContent = authMode === 'login' ? 'Войти' : 'Создать аккаунт';
    hideAuthError();
  });
});

document.getElementById('auth-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  hideAuthError();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;

  if (!email || !password) {
    showAuthError('Заполните email и пароль.');
    return;
  }
  if (password.length < 6) {
    showAuthError('Пароль должен быть не менее 6 символов.');
    return;
  }

  setAuthLoading(true);
  try {
    if (authMode === 'register') {
      await window.registerUser(email, password);
    } else {
      await window.loginUser(email, password);
    }
  } catch (err) {
    const code = err.code || '';
    if (code === 'auth/email-already-in-use') showAuthError('Этот email уже зарегистрирован. Войдите вместо регистрации.');
    else if (code === 'auth/invalid-email') showAuthError('Некорректный email.');
    else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') showAuthError('Неверный email или пароль.');
    else if (code === 'auth/too-many-requests') showAuthError('Слишком много попыток. Попробуйте позже.');
    else showAuthError('Ошибка: ' + (err.message || 'неизвестная ошибка'));
  } finally {
    setAuthLoading(false);
  }
});

window.addEventListener('auth-ready', () => {
  showApp();
  const user = firebase.auth().currentUser;
  const emailEl = document.getElementById('display-email');
  if (emailEl && user) emailEl.textContent = user.email;
});

window.addEventListener('auth-logout', () => {
  showAuthScreen();
});

// === CONFIRM MODAL ===
function showConfirm(title, message) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    overlay.classList.remove('hidden');

    function onKeyDown(e) {
      if (e.key === 'Escape') { cleanup(); resolve(false); return; }
      if (e.key === 'Tab') {
        const focused = document.activeElement;
        if (e.shiftKey) {
          if (focused === cancelBtn || !overlay.contains(focused)) {
            e.preventDefault();
            confirmBtn.focus();
          }
        } else {
          if (focused === confirmBtn || !overlay.contains(focused)) {
            e.preventDefault();
            cancelBtn.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    confirmBtn.focus();

    function cleanup() {
      overlay.classList.add('hidden');
      overlay.removeEventListener('click', onBgClick);
      document.removeEventListener('keydown', onKeyDown);
    }

    function onBgClick(e) {
      if (e.target === overlay) { cleanup(); resolve(false); }
    }

    overlay.addEventListener('click', onBgClick);
    cancelBtn.onclick = () => { cleanup(); resolve(false); };
    confirmBtn.onclick = () => { cleanup(); resolve(true); };
  });
}

function showPrompt(title, message, currentValue) {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-modal');
    const cancelBtn = document.getElementById('modal-cancel');
    const confirmBtn = document.getElementById('modal-confirm');
    const titleEl = document.getElementById('modal-title');
    const messageEl = document.getElementById('modal-message');
    confirmBtn.textContent = 'ОК';

    let input = document.getElementById('modal-prompt-input');
    if (!input) {
      input = document.createElement('input');
      input.type = 'password';
      input.id = 'modal-prompt-input';
      input.className = 'modal-prompt-input';
      input.style.cssText = 'width:100%;padding:10px 12px;border:1px solid #ccc;border-radius:6px;font-size:14px;margin-top:8px;box-sizing:border-box';
      messageEl.parentNode.insertBefore(input, messageEl.nextSibling);
    }
    input.value = currentValue || '';
    input.style.display = 'block';
    input.focus();

    titleEl.textContent = title;
    messageEl.textContent = message;
    overlay.classList.remove('hidden');

    function onKeyDown(e) {
      if (e.key === 'Escape') { cleanup(); resolve(null); return; }
      if (e.key === 'Enter') { cleanup(); resolve(input.value.trim()); }
    }
    document.addEventListener('keydown', onKeyDown);

    function cleanup() {
      overlay.classList.add('hidden');
      input.style.display = 'none';
      overlay.removeEventListener('click', onBgClick);
      document.removeEventListener('keydown', onKeyDown);
      confirmBtn.textContent = 'ОК';
    }

    function onBgClick(e) {
      if (e.target === overlay) { cleanup(); resolve(null); }
    }

    overlay.addEventListener('click', onBgClick);
    cancelBtn.onclick = () => { cleanup(); resolve(null); };
    confirmBtn.onclick = () => { cleanup(); resolve(input.value.trim()); };
  });
}

// === TABS ===
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.getElementById('tab-' + tab).classList.add('active');
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    if (tab === 'map') setTimeout(() => map.invalidateSize(), 100);
  });
});
// Глобальный обработчик ошибок — показывает баннер пользователю
let _errorToastTimer = null;
function showUserError(err, ctx) {
  console.error(ctx ? '[' + ctx + ']' : '', err);
  const el = document.getElementById('error-toast') || (() => {
    const div = document.createElement('div');
    div.id = 'error-toast';
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999999;background:#d32f2f;color:#fff;padding:12px 20px;text-align:center;font-size:14px;font-weight:500;transform:translateY(-100%);transition:transform 0.3s;box-shadow:0 2px 8px rgba(0,0,0,0.3)';
    document.body.appendChild(div);
    return div;
  })();
  const msg = err?.message || err || 'Произошла ошибка. Перезагрузите страницу.';
  el.textContent = '⚠️ ' + (ctx ? ctx + ': ' : '') + msg;
  el.style.transform = 'translateY(0)';
  clearTimeout(_errorToastTimer);
  _errorToastTimer = setTimeout(() => { el.style.transform = 'translateY(-100%)'; }, 8000);
}
window.addEventListener('error', e => showUserError(e.error || e.message));
window.addEventListener('unhandledrejection', e => showUserError(e.reason));
let _debounceTimer = null;
function debouncedSave() {
  if (!window.saveToCloud) return;
  clearTimeout(_debounceTimer);
  const attempt = () => {
    _debounceTimer = null;
    if (window.syncPending) {
      _debounceTimer = setTimeout(attempt, 500);
      return;
    }
    window.saveToCloud()
      .then(() => { window._localPlanDirty = false; })
      .catch(err => { showUserError(err, 'Автосохранение'); _debounceTimer = setTimeout(attempt, 5000); });
  };
  _debounceTimer = setTimeout(attempt, 800);
}

// Форсированное сохранение при скрытии страницы
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden' && _debounceTimer != null && window.saveToCloud) {
    const t = _debounceTimer;
    clearTimeout(t);
    _debounceTimer = null;
    window.saveToCloud().then(() => { window._localPlanDirty = false; }).catch(() => {});
  }
});

// === СИСТЕМА УПРАВЛЕНИЯ ОБНОВЛЕНИЯМИ PWA ===

// 1. Регистрация Service Worker с защитой от Race Condition
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {

      // Проверять обновления при возвращении на вкладку
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          reg.update().catch(() => {});
        }
      });

      // Новая версия уже ждёт активации
      if (reg.waiting && navigator.serviceWorker.controller) {
        autoUpdate(reg.waiting);
      }

      // Новая версия скачивается прямо сейчас
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              autoUpdate(installingWorker);
            }
          };
        }
      };
    }).catch(err => {
      showUserError('Ошибка регистрации Service Worker: ' + err?.message);
    });
  });
}

// Автоматическое обновление через 2 секунды после обнаружения
function autoUpdate(worker) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);z-index:100002;display:flex;align-items:center;justify-content:center;animation:modalFadeIn 0.3s ease;';
  overlay.innerHTML = `
    <div style="background:linear-gradient(145deg,#fdf5c9,#f0e6b8);border:4px solid #8d6e3f;border-radius:16px;padding:28px 32px;max-width:340px;width:90%;box-shadow:0 8px 40px rgba(0,0,0,0.3);text-align:center;animation:modalSlideUp 0.35s ease;position:relative">
      <div style="position:absolute;top:0;left:0;right:0;height:4px;background:#8d6e3f;border-radius:16px 16px 0 0"></div>
      <div style="font-size:48px;margin-bottom:8px">🚀</div>
      <h3 style="font-size:18px;color:#4e342e;margin-bottom:6px">Доступно обновление</h3>
      <p style="font-size:13px;color:#6d4c41;margin-bottom:16px">Приложение обновится автоматически</p>
      <div style="width:100%;height:6px;background:#d7ccc8;border-radius:3px;overflow:hidden;margin-bottom:12px">
        <div id="update-progress" style="width:0%;height:100%;background:linear-gradient(90deg,#8d6e3f,#c9a84b);border-radius:3px;transition:width 0.1s linear"></div>
      </div>
      <p style="font-size:12px;color:#4e342e;margin-bottom:4px">Авто-обновление…</p>
    </div>`;
  document.body.appendChild(overlay);

  let remaining = 5;
  const progressEl = document.getElementById('update-progress');

  const timer = setInterval(() => {
    remaining -= 0.1;
    if (progressEl) progressEl.style.width = ((5 - remaining) / 5 * 100) + '%';
    if (remaining <= 0) {
      clearInterval(timer);
      doUpdate();
    }
  }, 100);

  function doUpdate() {
    overlay.remove();
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    worker.postMessage({ action: 'skipWaiting' });
    setTimeout(() => window.location.reload(), 1000);
  }
}

// === СБРОС ВСЕХ НАСТРОЕК И ДАННЫХ ===
function showResetOverlay() {
  const root = document.getElementById('app');
  if (root) root.style.opacity = '0.3';
  const status = document.createElement('div');
  status.textContent = '🔄 Сбрасываю данные...';
  status.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;background:#fff;padding:20px 30px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;';
  document.body.appendChild(status);
}

window.factoryReset = async function() {
  showResetOverlay();

  try { await window.deleteCloudData(); } catch (e) {}
  const keepKeys = ['app-theme', 'schema-editor-enabled', 'schema-manual-offsets', 'schema-landscape-overrides'];
  const saved = {};
  keepKeys.forEach(k => { const v = localStorage.getItem(k); if (v !== null) saved[k] = v; });
  localStorage.clear();
  Object.keys(saved).forEach(k => localStorage.setItem(k, saved[k]));
  const newCode = window.generateSecureSyncCode ? window.generateSecureSyncCode() : Math.random().toString(36).slice(2, 14);
  localStorage.setItem('sync-code', newCode);

  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('relocation-v')).map(k => caches.delete(k)));
  } catch (e) {}
  location.reload();
};

window.deleteAccount = async function() {
  showResetOverlay();
  const user = firebase.auth().currentUser;
  try { await window.deleteCloudData(); } catch (e) {}
  localStorage.clear();
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('relocation-v')).map(k => caches.delete(k)));
  } catch (e) {}
  if (user) { try { await user.delete(); } catch (e) { await firebase.auth().signOut(); } }
  else { await firebase.auth().signOut(); }
  location.reload();
};

let _appInitialized = false;
function initApp() {
  if (_appInitialized) return;
  _appInitialized = true;
  if (window.migrateLegacyData) {
    try { window.migrateLegacyData(); } catch (e) { showUserError(e, 'Миграция старых данных'); }
  }
  try { renderPlan(); } catch (e) { showUserError(e, 'Загрузка плана'); }
  updateSyncStatusUI();
  const versionEl = document.getElementById('app-version-display');
  if (versionEl && window.APP_CONFIG) {
    versionEl.textContent = `v${window.APP_CONFIG.VERSION} (${window.APP_CONFIG.BUILD})`;
  }
  setTimeout(() => {
    if (typeof map !== 'undefined' && map.invalidateSize) map.invalidateSize();
  }, 200);
}

document.addEventListener('DOMContentLoaded', () => {
  window.addEventListener('auth-ready', () => {
    initApp();
  });
  if (firebase.auth().currentUser) initApp();

  document.getElementById('btn-change-code')?.addEventListener('click', () => {
    window.changeSyncCode();
  });

  const resetBtn = document.getElementById('btn-hard-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (await showConfirm('Сброс устройства', 'Удалить все локальные данные, очистить облако и создать новый код синхронизации?')) {
        try {
          await window.factoryReset();
        } catch (err) {
          showUserError(err, 'Сброс устройства');
        }
      }
    });
  }

  document.getElementById('btn-delete-account')?.addEventListener('click', async (e) => {
    e.preventDefault();
    if (await showConfirm('Удаление аккаунта', 'Аккаунт, все данные в облаке и на устройстве будут удалены безвозвратно. Продолжить?')) {
      try { await window.deleteAccount(); } catch (err) { showUserError(err, 'Удаление аккаунта'); }
    }
  });

  document.getElementById('btn-logout')?.addEventListener('click', async () => {
    if (await showConfirm('Выход из аккаунта', 'Выйти из аккаунта? Локальные данные сохранятся на устройстве.')) {
      await window.logoutUser();
    }
  });

  const editorToggle = document.getElementById('toggle-schema-editor');
  if (editorToggle) {
    editorToggle.checked = localStorage.getItem('schema-editor-enabled') === 'true';
  }

  // Click on sync code to change it
  document.getElementById('display-sync-code')?.addEventListener('click', () => {
    window.changeSyncCode();
  });

  // Collapsible settings cards
  document.querySelectorAll('.settings-card .card-header').forEach(header => {
    header.addEventListener('click', e => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input') || e.target.closest('label')) return;
      const body = header.nextElementSibling;
      const btn = header.querySelector('.card-collapse-btn');
      if (body && body.classList.contains('card-body')) {
        body.classList.toggle('hidden');
        if (btn) btn.classList.toggle('open');
      }
    });
  });

  // Company buttons
  document.getElementById('btn-company-create')?.addEventListener('click', () => {
    window.generateNewSyncCode();
    document.getElementById('company-screen').classList.add('hidden');
    window.dispatchEvent(new CustomEvent('auth-ready'));
  });

  document.getElementById('btn-company-join')?.addEventListener('click', () => {
    window.changeSyncCode();
    document.getElementById('company-screen').classList.add('hidden');
    window.dispatchEvent(new CustomEvent('auth-ready'));
  });

  // Share company code
  document.getElementById('btn-share-company')?.addEventListener('click', () => {
    const code = localStorage.getItem('sync-code') || '—';
    if (navigator.share) {
      navigator.share({ title: 'Моя компания', text: 'Ключ моей компании: ' + code }).catch(() => {});
    } else {
      navigator.clipboard.writeText(code).then(() => alert('Ключ скопирован: ' + code)).catch(() => {});
    }
  });
});

document.querySelector('[data-tab="plan"]')?.addEventListener('click', () => {
  setTimeout(() => { try { renderPlan(); } catch (e) { showUserError(e, 'Переключение вкладки'); } }, 50);
});

// === Theme toggle ===
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn?.querySelector('.theme-icon');

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (currentTileLayer && mapTiles) currentTileLayer.setUrl(mapTiles.dark);
  } else {
    document.body.classList.remove('dark-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
    if (currentTileLayer && mapTiles) currentTileLayer.setUrl(mapTiles.light);
  }
  localStorage.setItem('app-theme', theme);
}

themeToggleBtn?.addEventListener('click', () => {
  const isDark = document.body.classList.contains('dark-theme');
  applyTheme(isDark ? 'light' : 'dark');
});

const savedTheme = localStorage.getItem('app-theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);


