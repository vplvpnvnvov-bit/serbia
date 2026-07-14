# Техническая справка: структура Firebase и обработка loadFromCloud

## 1. Структура объекта, уходящего в Firebase при сохранении

**Файл:** `sync.js:91–97`

```js
{
  checklist: {
    // { id: { done, progress, note, date, expires }, … }
    sim: { done: true, note: "купил" },
    kindergarten_enroll: { done: false, progress: true },
    …
  },
  locked: true,              // true / false
  calc: {                    // значения калькулятора расходов
    rent: "600",
    food: "300",
    transport: "60",
    utils: "120",
    other: "150"
  },
  version: "2026.1",         // CURRENT_DATA_VERSION
  updatedAt: FieldValue.serverTimestamp()  // Firestore Timestamp (серверный)
}
```

Хранятся **оба** поля: `version` (строка версии данных) и `updatedAt` (серверный таймстамп последнего изменения).

---

## 2. Обработка пустого / повреждённого документа в loadFromCloud()

**Файл:** `sync.js:52–84`

```js
function loadFromCloud() {
  if (!syncCode) return;
  db.collection('users').doc(syncCode).get().then(doc => {
    if (!doc.exists) return;          // (1)
    const data = doc.data();          // (2) undefined, если полей нет

    syncLoading = true;
    if (data.checklist) {             // (3) TypeError при пустом документе
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
    // ...
  }).catch(() => { syncLoading = false; });
}
```

### Сценарий A: документ существует, но пустой (0 полей)

- `doc.exists` → `true` — проверка (1) **не срабатывает**
- `doc.data()` → `undefined`
- Строка (3): `if (data.checklist)` → **TypeError: Cannot read properties of undefined**
- Ошибка молча съедается `.catch(() => { syncLoading = false; })` на строке 83
- Пользователь не получает ни данных, ни сообщения об ошибке

**Вердикт:** уязвимость есть. Нужна дополнительная проверка `if (!data) return;` после строки (2).

---

### Сценарий B: документ повреждён (checklist — не объект)

`sanitizeChecklist()` на строке 4 имеет защиту:

```js
function sanitizeChecklist(data) {
  if (!data || typeof data !== 'object') return {};
  const validIds = typeof window.getValidChecklistIds === 'function'
    ? window.getValidChecklistIds()
    : null;
  if (!validIds) return data;
  const clean = {};
  Object.keys(data).forEach(id => {
    if (validIds.has(id)) clean[id] = data[id];
  });
  return clean;
}
```

Если `checklist` — не объект, `sanitizeChecklist` вернёт `{}`. **Безопасно** — код не упадёт.

---

### Сценарий C: документ повреждён (locked / calc — невалидны)

- `data.locked` проверяется через `!== undefined` — безопасно
- `data.calc` проверяется через `if (data.calc)` — безопасно
- `Object.entries(data.calc).forEach(...)` — если `calc` не объект, `Object.entries` не бросит исключения

**Вердикт:** повреждение locked/calc не критично.

---

### Итоговая таблица

| Сценарий | Падает? | Silent fail? | Поправить |
|---|---|---|---|
| Документ не существует | Нет | Нет | Не требуется |
| Документ пустой (0 полей) | **Да** (TypeError) | **Да** (catch глотает) | Добавить `if (!data) return` после `doc.data()` |
| checklist — не объект | Нет | Нет | Уже защищено |
| locked — невалидный | Нет | Нет | Уже защищено |
| calc — не объект | Нет | Нет | Безопасно (Object.entries) |

**Единственная проблема:** пустой документ с `doc.exists === true`, но без единого поля.
