// === TABS ===
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    btn.classList.add('active');
    if (tab === 'map') setTimeout(() => map.invalidateSize(), 100);
  });
});

// === HELPERS ===
function getItem(saved, id) {
  const v = saved[id];
  if (typeof v === 'boolean') return { done: v, date: '', note: '', progress: false };
  if (v && typeof v === 'object') return { done: !!v.done, date: v.date || '', note: v.note || '', progress: !!v.progress };
  return { done: false, date: '', note: '', progress: false };
}
function setItem(saved, id, done, date, progress) {
  const prev = saved[id] || {};
  saved[id] = { done, date: date || '', note: prev.note || '', progress: !!progress };
  localStorage.setItem('checklist', JSON.stringify(saved));
}
function cycleItem(saved, id) {
  const st = getItem(saved, id);
  if (!st.done && !st.progress) return { done: false, progress: true };
  if (st.progress) return { done: true, progress: false };
  return { done: false, progress: false };
}
function editNote(id) {
  const ns = document.getElementById('note-section-' + id);
  if (!ns) return;
  ns.classList.remove('hidden');
  const textDiv = ns.querySelector('.note-section-text');
  const editDiv = ns.querySelector('.note-section-edit');
  const ta = ns.querySelector('.cl-note-ta');
  if (!editDiv || !ta) return;
  const saved = JSON.parse(localStorage.getItem('checklist') || '{}');
  const st = getItem(saved, id);
  ta.value = st.note || '';
  if (textDiv) textDiv.classList.add('hidden');
  editDiv.classList.remove('hidden');
  ta.focus();
  ta.style.height = 'auto';
  ta.style.height = ta.scrollHeight + 'px';
}
function saveNote(id) {
  const ns = document.getElementById('note-section-' + id);
  if (!ns) return;
  const textDiv = ns.querySelector('.note-section-text');
  const editDiv = ns.querySelector('.note-section-edit');
  const ta = ns.querySelector('.cl-note-ta');
  if (!editDiv || !ta || !textDiv) return;
  const val = ta.value.trim();
  const saved = JSON.parse(localStorage.getItem('checklist') || '{}');
  saved[id] = saved[id] || {};
  saved[id].note = val;
  localStorage.setItem('checklist', JSON.stringify(saved));
  textDiv.classList.remove('hidden');
  editDiv.classList.add('hidden');
  if (val) {
    textDiv.innerHTML = '📝 ' + val;
    ns.classList.remove('hidden');
  } else {
    textDiv.innerHTML = '';
    ns.classList.add('hidden');
  }
}
function setList(id, title, items) {
  const el = document.getElementById(id);
  if (!items || items.length === 0) { el.style.display = 'none'; return; }
  el.innerHTML = '<strong>' + title + '</strong><br>' + items.join('<br>');
  el.style.display = 'block';
}

function setSection(id, title, text) {
  const el = document.getElementById(id);
  if (!text) { el.style.display = 'none'; return; }
  el.innerHTML = '<strong>' + title + '</strong><br>' + text;
  el.style.display = 'block';
}

// === MAP ===
const map = L.map('map', {
  center: [44.76, 20.48],
  zoom: 10,
  zoomControl: true,
  attributionControl: true,
});

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
  maxZoom: 19,
}).addTo(map);

// === DISTRICT POLYGONS ===
const polygons = {};

function highlightDistrict(name) {
  Object.keys(polygons).forEach(k => {
    const p = polygons[k];
    p.setStyle({ fillOpacity: 0.35, weight: 3 });
  });
  const p = polygons[name];
  if (p) {
    p.setStyle({ fillOpacity: 0.55, weight: 4 });
    const size = map.getSize();
    map.fitBounds(p.getBounds(), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 40 + size.y * 0.55],
      maxZoom: 13,
    });
  }
  // указатель
  if (window.arrowMarker) map.removeLayer(window.arrowMarker);
  const d = DISTRICTS.find(x => x.name === name);
  if (d && d.coords && d.coords.length > 0) {
    const lats = d.coords.map(c => c[0]);
    const lons = d.coords.map(c => c[1]);
    const cx = (Math.min(...lats) + Math.max(...lats)) / 2;
    const cy = (Math.min(...lons) + Math.max(...lons)) / 2;
    window.arrowMarker = L.marker([cx, cy], {
      icon: L.divIcon({
        html: '<div class="arrow-bounce">⬇️</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: 'arrow-marker',
      }),
      interactive: false,
      zIndexOffset: 10000,
    }).addTo(map);
  }
}

map.on('dragstart', () => {
  if (window.arrowMarker) {
    map.removeLayer(window.arrowMarker);
    window.arrowMarker = null;
  }
});

function showDistrictPanel(d) {
  document.getElementById('d-name').textContent = d.name;
  const gallery = document.getElementById('d-gallery');
  gallery.innerHTML = '';
  if (d.images && d.images.length) {
    d.images.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.loading = 'lazy';
      gallery.appendChild(img);
    });
  }
  document.getElementById('d-price').textContent = d.price;
  document.getElementById('d-score').textContent = '👶 ' + d.familyScore + '/17 — пригодность для семьи с детьми';
  document.getElementById('d-family-desc').textContent = d.familyDesc || '';
  document.getElementById('d-desc').textContent = d.desc;
  setList('d-pros', '✅ Плюсы', d.pros);
  setList('d-cons', '⚠️ Минусы', d.cons);
  setList('d-places', '📍 Ключевые места', d.key_places);
  setSection('d-transport', '🚌 Транспорт', d.transport);
  const linksEl = document.getElementById('d-links');
  if (d.links && d.links.length) {
    linksEl.innerHTML = '<strong>🔗 Ссылки по району</strong><br>' +
      d.links.map(l => `<a href="${l.url}" target="_blank">${l.title}</a>`).join('<br>');
    linksEl.style.display = 'block';
  } else {
    linksEl.style.display = 'none';
  }
  document.getElementById('district-info').classList.remove('hidden');
  highlightDistrict(d.name);
}

function districtLabel(name, price, score) {
  let color = score >= 13 ? '#2e7d32' : score >= 9 ? '#f9a825' : '#c62828';
  return `<div style="font-family:sans-serif;font-size:11px;font-weight:bold;
    color:#1a1a1a;text-align:center;white-space:nowrap;
    background:rgba(255,255,255,0.9);border-radius:4px;
    padding:3px 7px;border:1px solid #bbb;
    box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    ${name} <span style="color:#d32f2f">${price}</span>
    <span style="color:${color};font-size:10px"> (${score}/17)</span>
  </div>`;
}

function popupHTML(d) {
  return `<div style="font-family:sans-serif;width:200px">
    <b style="font-size:15px">${d.name}</b><br>
    <span style="color:#d32f2f;font-size:14px;font-weight:bold">${d.price}</span><br>
    <span style="font-size:11px;color:#1a237e">👶 ${d.familyScore}/17 для семьи с детьми</span><br>
    <span style="color:#555;font-size:11px">${d.desc}</span>
  </div>`;
}

DISTRICTS.forEach(d => {
  if (!d.coords || d.coords.length < 3) return;

  const polygon = L.polygon(d.coords, {
    color: d.edge,
    fillColor: d.fill,
    fillOpacity: 0.35,
    weight: 3,
  }).addTo(map);
  polygons[d.name] = polygon;

  polygon.bindPopup(popupHTML(d), { maxWidth: 220 });
  polygon.bindTooltip(d.name, { sticky: true });

  polygon.on('click', () => showDistrictPanel(d));

  // Центроид для метки
  const lats = d.coords.map(p => p[0]);
  const lons = d.coords.map(p => p[1]);
  const cx = (Math.min(...lats) + Math.max(...lats)) / 2;
  const cy = (Math.min(...lons) + Math.max(...lons)) / 2;

  L.marker([cx, cy], {
    icon: L.divIcon({
      html: districtLabel(d.name, d.price, d.familyScore),
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }),
    interactive: false,
  }).addTo(map);
});

// === RIVERS ===
L.polyline(
  [[44.840, 20.345], [44.836, 20.365], [44.833, 20.385],
   [44.830, 20.405], [44.828, 20.420], [44.830, 20.440],
   [44.832, 20.458], [44.834, 20.478], [44.835, 20.498]],
  { color: '#3b82c4', weight: 5, opacity: 0.5 }
).addTo(map).bindPopup('Дунай');

L.polyline(
  [[44.776, 20.368], [44.786, 20.382], [44.796, 20.398],
   [44.806, 20.415], [44.816, 20.430], [44.825, 20.443]],
  { color: '#3b82c4', weight: 4, opacity: 0.5 }
).addTo(map).bindPopup('Сава');

// === CLOSE INFO PANEL ===
document.getElementById('close-info').addEventListener('click', () => {
  document.getElementById('district-info').classList.add('hidden');
});

// === LEGEND DROPDOWN ===
const sorted = [...DISTRICTS].sort((a, b) => b.familyScore - a.familyScore);
const listEl = document.getElementById('legend-list');
sorted.forEach((d, i) => {
  let color = d.familyScore >= 13 ? '#2e7d32' : d.familyScore >= 9 ? '#f9a825' : '#c62828';
  let bg = d.familyScore >= 13 ? '#e8f5e9' : d.familyScore >= 9 ? '#fff8e1' : '#ffebee';
  const row = document.createElement('div');
  row.className = 'll-row';
  row.innerHTML = `
    <span class="ll-rank">${i+1}</span>
    <span class="ll-name">${d.name}</span>
    <span class="ll-score" style="background:${bg};color:${color}">${d.familyScore}/17</span>
  `;
  row.dataset.district = d.name;
  row.addEventListener('click', () => {
    showDistrictPanel(d);
    listEl.classList.add('hidden');
    document.getElementById('legend-arrow').classList.remove('open');
  });
  listEl.appendChild(row);
});

document.getElementById('legend-toggle').addEventListener('click', () => {
  listEl.classList.toggle('hidden');
  document.getElementById('legend-arrow').classList.toggle('open');
});

// === CHECKLIST ===
const CHECKLIST = [
  { cat: "📄 Выезд из РФ", items: [
    { id:"p10", text:"Загранпаспорт мужа (10 лет)", price:"5000", hasDate:true, expires:120, link:"", tip:"Госуслуги → Услуги → Паспорта, регистрация → Загранпаспорт нового поколения (10 лет).\n\nШаг 1: Заполнить заявление онлайн, приложить фото из ателье.\nШаг 2: Оплатить госпошлину 5000₽.\nШаг 3: Через 5–7 дней придёт приглашение в МВД/МФЦ.\nШаг 4: Прийти с паспортом РФ, через 30 дней получить готовый." },
    { id:"p5w", text:"Загранпаспорт жены (10 лет)", price:"5000", hasDate:true, expires:120, link:"", tip:"Госуслуги → Услуги → Паспорта, регистрация → Загранпаспорт нового поколения (10 лет).\n\nШаг 1: Заполнить заявление онлайн, приложить фото из ателье.\nШаг 2: Оплатить госпошлину 5000₽.\nШаг 3: Прийти в МВД/МФЦ по приглашению, забрать через 30 дней." },
    { id:"p5d", text:"Загранпаспорт ребёнка (5 лет, старый образец)", price:"3000", hasDate:true, expires:60, link:"", tip:"Важно: сначала поставить штамп о гражданстве (см. пункт ниже).\n\nГосуслуги → Услуги → Паспорта, регистрация → Загранпаспорт старого образца (5 лет).\n\nШаг 1: Сначала сделать фото в ателье.\nШаг 2: Заполнить заявление на Госуслугах.\nШаг 3: Оплатить госпошлину 3000₽.\nШаг 4: Забрать в МВД/МФЦ через 1.5–2 недели." },
    { id:"stamp", text:"Штамп о гражданстве РФ на свидетельство о рождении ребёнка", price:"", link:"", tip:"Без красного штампа МВД на обороте свидетельства загранпаспорт ребёнку не оформят.\n\nОбратиться в МВД по месту жительства (паспортный стол). Подать: паспорт родителя + оригинал свидетельства о рождении. Ставят в день обращения." },
    { id:"nocrim_h", text:"Справка о несудимости (муж) — электронная с ЭЦП или бумажная", price:"", hasDate:true, expires:6, link:"", tip:"Госуслуги → Услуги → Справки, выписки → Справка о наличии (отсутствии) судимости.\n\nШаг 1: Заказать онлайн на Госуслугах (выбрать электронный вариант с ЭЦП ведомства).\nШаг 2: Получить файл .pdf и .sig в личный кабинет (обычно за 5–10 дней).\n\n*Лайфхак:* Распечатывать в МВД не нужно! Электронный файл с цифровой подписью принимают судебные переводчики в Сербии для официального перевода под ВНЖ. Срок действия — 6 месяцев." },
    { id:"nocrim_w", text:"Справка о несудимости (жена) — электронная с ЭЦП или бумажная", price:"", hasDate:true, expires:6, link:"", tip:"То же, что для мужа. Закажите электронную справку с цифровой подписью (ЭЦП) через Госуслуги. Сербский МУП принимает перевод такого документа без необходимости визита в МВД в России." },
    { id:"nocrim_apost_h", text:"Апостиль на справку о несудимости (муж)", price:"2500", hasDate:true, expires:6, link:"", tip:"Нужен только если вы заказывали БУМАЖНЫЙ оригинал справки в МВД/МФЦ. Сдать бумагу в МФЦ или Минюст на апостилирование. Госпошлина 2500₽. Срок — до 5 рабочих дней.\n\n*Важно:* Если вы используете электронную справку с Госуслуг с ЭЦП, апостиль на неё физически поставить нельзя (и сербский МУП примет её перевод без апостиля)." },
    { id:"nocrim_apost_w", text:"Апостиль на справку о несудимости (жена)", price:"2500", hasDate:true, expires:6, link:"", tip:"Аналогично мужу. Требуется только для бумажной версии справки. На электронную версию с ЭЦП апостиль не ставится и не требуется." },
    { id:"child_consent", text:"Нотариальное согласие на выезд ребёнка (если едет один родитель)", price:"2000", link:"", tip:"Заверяется у нотариуса в РФ. Нужны: паспорт родителя, свидетельство о рождении ребёнка. Обязательно указать Сербию как страну назначения и вписать сроки поездки. Если едете всей семьёй (оба родителя вписаны в документы) — согласие не требуется." },
  ]},
  { cat: "📄 Апостили и легализация", items: [
    { id:"apost_marr", text:"Апостиль на свидетельство о браке (оригинал)", price:"2500", link:"", tip:"Сдать оригинал свидетельства в МФЦ или ЗАГС. Госпошлина 2500₽. Срок — до 5 рабочих дней. Апостиль на свидетельство о браке обязателен для получения ВНЖ супруги по воссоединению семьи." },
    { id:"apost_birth", text:"Апостиль на свидетельство о рождении ребёнка", price:"2500", link:"", tip:"Сдать оригинал в МФЦ или ЗАГС. Госпошлина 2500₽. Потребуется для получения ВНЖ ребёнка, а также для записи в государственные школы и детские сады в Сербии." },
    { id:"translation_copies", text:"Переводы документов на сербский язык", price:"", link:"", tip:"Все переводы документов (справок, свидетельств) для подачи на ВНЖ должны выполняться исключительно официальным судебным переводчиком (sudski tumač) на территории Сербии. Переводы, сделанные в РФ, сербские ведомства не примут." },
  ]},
  { cat: "📚 Образование и нострификация", items: [
    { id:"diploma", text:"Оригинал диплома об образовании (с вкладышем оценок)", price:"", link:"", tip:"Оригинал диплома и обязательно приложения с оценками (додатак дипломи). Нужен для нострификации (официального признания) в Сербии, если вы оформляете ВНЖ «по таланту» (как специалист) или устраиваетесь на работу.\n\n*Внимание:* Апостилировать диплом в РФ для Сербии НЕ НУЖНО. Между странами действует договор о взаимном признании документов." },
    { id:"diploma_eng", text:"Перевод диплома у сербского судебного переводчика", price:"", link:"", tip:"Оригинал диплома и приложение необходимо перевести на сербский язык у местного судебного переводчика (sudski tumač) в Сербии. Переводы из РФ не подходят для процедуры нострификации." },
  ]},
  { cat: "📄 Документы в Сербии", items: [
    { id:"reg", text:"Регистрация пребывания (белый картон / Beli karton)", price:"", link:"", tip:"Оформить в течение 24 часов после пересечения границы Сербии.\n\nДелает владелец квартиры (арендодатель) в местном отделении полиции (МУП) или через онлайн-систему eTurista. На руки вы получаете заполненный бланк (potvrda o prijavi boravka). Обязательно сохраняйте его, он необходим для открытия банковских счетов и подачи на ВНЖ." },
    { id:"vnd", text:"Единое разрешение (ВНЖ + разрешение на работу)", price:"18000 RSD", link:"", tip:"Подача на ВНЖ в Сербии теперь полностью объединена с разрешением на работу в один пластик — Jedinstvena dozvola. Всё оформляется ОНЛАЙН через eUprava.\n\nГлавные пути для ИТ-специалистов:\n\n1. 🎭 ВНЖ ПО ТАЛАНТУ (Высокая квалификация):\n— Требуется: нострифицированный в Сербии диплом о высшем образовании + трудовой договор с сербским юрлицом (или сербский филиал вашей компании).\n— Плюс: не нужно платить налоги за содержание ИП, вы оформляетесь как сотрудник.\n— Минус: выдается на 1 год, продлить по этому же основанию («по таланту») на 2-й год нельзя — придется переоформляться на обычный рабочий контракт или ИП.\n\n2. 💼 ВНЖ ЧЕРЕЗ ИП (Предузетник):\n— Требуется: открытое в АПР (APR) сербское ИП.\n— Плюс: можно продлевать из года в год без ограничений.\n— Минус: ежемесячные расходы на налоги и бухгалтера (около 350–450€)." },
    { id:"talent_nostrification", text:"Нострификация диплома для ВНЖ по таланту", price:"7500 RSD", link:"", tip:"Процесс признания вашего высшего образования в Сербии (через агентство AZK).\n\nШаг 1: Сделайте перевод диплома и вкладыша с оценками у сербского судебного переводчика (sudski tumač).\nШаг 2: Зайдите на сайт azk.gov.rs, заполните анкету ENIC-NARIC и загрузите PDF-сканы документов.\nШаг 3: Оплатите пошлину (около 7500 RSD) и прикрепите квитанцию.\nШаг 4: Дождитесь одобрения онлайн, придите в офис AZK в Белграде, покажите оригиналы и заберите готовое Решение (Rešenje o priznavanju).\n\n*Напоминание:* Апостиль на дипломы РФ/РБ/Украины для Сербии НЕ ТРЕБУЕТСЯ." },
    { id:"preduzetnik", text:"Регистрация ИП в Сербии (Предузетник)", price:"1500 RSD", link:"", tip:"Регистрация фирмы происходит через Агентство по коммерческим регистрам (APR).\n\nШаг 1: Выбрать код деятельности (шифр делатности), название фирмы и адрес (можно использовать адрес арендуемой квартиры с согласия хозяина).\nШаг 2: Подать заявление в APR (лично или онлайн с сербской ЭЦП).\nШаг 3: Через 3-5 дней забрать решение о регистрации. Налоговый номер (PIB) присваивается автоматически, отдельно за ним в налоговую ходить не нужно." },
  ]},
  { cat: "🏦 Финансы и налоги", items: [
    { id:"bank", text:"Открытие личного счёта в сербском банке (Alta, Poštanska, API)", price:"", link:"", tip:"Для нерезидентов (без ВНЖ) счета сейчас открывают Alta Bank, Poštanska Štedionica, API Bank.\n\nПотребуется: загранпаспорт, «белый картон» и подтверждение происхождения средств (выписки, декларации). Крупные банки (OTP, Raiffeisen, Intesa) открывают счета физлицам в основном только после получения ВНЖ/Единого разрешения." },
    { id:"tax_decl", text:"Налоговые декларации (3-НДФЛ / 2-НДФЛ / выписка из ЛК ФНС)", price:"", link:"", tip:"Скачать из личного кабинета налогоплательщика РФ справки о доходах (2-НДФЛ) или декларации (3-НДФЛ). Эти документы могут потребоваться сербскому банку при прохождении процедуры комплаенса для открытия счета." },
    { id:"bank_stat", text:"Выписки по банковским счетам из РФ за 3–6 месяцев (на английском)", price:"", link:"", tip:"Выгрузить из приложений российских банков (Т-Банк, Сбер и др.) выписки по движению средств за последние 3-6 месяцев на английском языке. Это главный документ для подтверждения легальности ваших средств при открытии счета в Сербии." },
    { id:"power", text:"Генеральная доверенность на близкого человека в РФ (на 5–10 лет)", price:"2000", hasDate:true, expires:120, link:"", tip:"Оформить у нотариуса в РФ до отъезда. Включить права на распоряжение счетами, получение документов (включая повторные свидетельства ЗАГС и справки МВД), продажу автомобиля/недвижимости и закрытие ИП. Из Сербии сделать такую доверенность будет намного сложнее и дороже." },
  ]},
  { cat: "🏠 Жильё", items: [
    { id:"rent", text:"Договор аренды жилья (Ugovor o zakupu)", price:"от 500€/мес", hasDate:true, link:"", tip:"Заключить письменный договор аренды с собственником квартиры. Договор понадобится для оформления «белого картона», открытия банковских счетов и онлайн-подачи на ВНЖ.\n\nПопулярные сервисы поиска: CityExpert (без комиссии агенту), HaloOglasi, а также профильные Telegram-каналы по аренде в Белграде." },
  ]},
  { cat: "❤️ Здоровье и медицина", items: [
    { id:"insure", text:"Местная или международная медицинская страховка", price:"100-200€", hasDate:true, expires:12, link:"", tip:"Для подачи на ВНЖ (Единое разрешение) требуется медицинский страховой полис, покрывающий территорию Сербии на весь период запрашиваемого ВНЖ. Можно оформить недорогую локальную сербскую страховку (например, Dunav, Globos, Triglav) специально под подачу документов." },
    { id:"vaccine", text:"Карта профилактических прививок ребёнка (форма 063/у)", price:"", link:"", tip:"Взять в детской поликлинике подробную выписку со всеми прививками (критично наличие прививки MMR — корь-краснуха-паротит). Перевести у судебного переводчика в Сербии. Без этой карты ребенка не зачислят в школу или детский сад." },
    { id:"med_cards", text:"Медицинские выписки при хронических заболеваниях (все члены семьи)", price:"", link:"", tip:"Взять истории болезней, рецепты и назначения. Важно: найдите международные непатентованные наименования (МНН) ваших лекарств (действующие вещества на латыни), так как торговые марки препаратов в Сербии будут отличаться." },
    { id:"dentist", text:"Пройти стоматологов всей семьёй в РФ", price:"", link:"", tip:"Рекомендуется вылечить зубы в РФ перед отъездом. В Сербии качественные стоматологические услуги в частных клиниках стоят существенно дороже." },
    { id:"pharm", text:"Собрать аптечку с привычными лекарствами", price:"", link:"", tip:"Многие привычные лекарства (включая антибиотики и сильные обезболивающие) в Сербии отпускаются строго по рецепту врача. Возьмите с собой запас специфических или постоянно принимаемых лекарств на первые 3-6 месяцев." },
  ]},
  { cat: "🚗 Transport / Автомобиль", items: [
    { id:"license", text:"Перевод водительских прав на сербский язык", price:"", link:"", tip:"Российские водительские права действительны в Сербии в течение 6 месяцев с момента въезда. Перевод прав у судебного переводчика понадобится для аренды автомобиля, оформления местной страховки или последующего обмена прав на сербские (после получения ВНЖ)." },
    { id:"car_power", text:"Нотариальная доверенность на выезд за границу (если машина не на вас)", price:"", link:"", tip:"Если автомобиль оформлен на другого человека или юрлицо. В доверенности от нотариуса РФ обязательно должно быть прописано право вывоза ТС за пределы Российской Федерации. Рекомендуется сделать перевод на английский язык." },
    { id:"kbm", text:"Справка из страховой о безаварийном стаже (КБМ) на английском", price:"", link:"", tip:"Запросить в своей страховой компании в РФ справку о КБМ на английском языке. Некоторые сербские страховые компании учитывают её при расчете стоимости полиса ОСАГО (auto-odgovornost) и дают скидку за безаварийную езду." },
    { id:"car_docs", text:"СТС и ПТС (оригиналы на машину)", price:"", hasDate:true, link:"", tip:"Оригиналы документов обязательны для прохождения границ. На территории Сербии иностранный автомобиль может находиться до 3 месяцев без выезда, после чего требуется временный выезд (визаран автомобиля) или растаможка/регистрация на сербские номера." },
  ]},
  { cat: "📱 Прочее", items: [
    { id:"sim", text:"Сим-карта сербского оператора (A1 / Yettel / mts)", price:"1000 RSD", link:"", tip:"Купить в любом киоске (prepaid-тариф без паспорта) или оформить в официальном салоне связи по загранпаспорту.\n\n*Операторы:* A1, Yettel (бывший Telenor) и mts. Контрактные тарифы (postpaid) становятся доступны только после получения ВНЖ и предлагают гораздо более выгодные пакеты интернета." },
  ]},
];

const TIMELINE_PLAN = {
  section: "relocation_4_months_plan",
  title: "📅 Пошаговый план расходов и действий (4 месяца)",
  description: "Интерактивный таймлайн переезда в Белград для семьи из 3 человек с легализацией по схеме «Талант ➔ ИП».",
  timeline: [
    {
      id: "m0",
      title: "Месяц 0: Подготовка в РФ",
      focus: "Сбор документов, которые невозможно получить удаленно",
      actions: [
        "Заказать справку об отсутствии судимости из МВД РФ с Апостилем (быстрее всего через Госуслуги/МФЦ). Срок действия для Сербии — 6 месяцев.",
        "Собрать оригиналы свидетельства о браке и рождении ребенка. Поставить на них Апостиль в ЗАГСе (необходимо для воссоединения семьи).",
        "Подготовить оригиналы диплома вуза и вкладыша с оценками (Апостиль на диплом для Сербии НЕ НУЖЕН).",
        "Взять в поликлинике карту профилактических прививок ребенка (форма 063/у или синий прививочный сертификат) — без нее не примут в сербский детский сад."
      ],
      cost_eur: "80 €",
      cost_details: [
        { name: "Апостиль на справку о несудимости", cost: "2500 ₽" },
        { name: "Апостиль на свидетельство о браке", cost: "2500 ₽" },
        { name: "Апостиль на свидетельство о рождении ребенка", cost: "2500 ₽" }
      ]
    },
    {
      id: "m1",
      title: "Месяц 1: Прилет и ВНЖ «Талант»",
      focus: "Перелет, адаптация на Airbnb, запуск нострификации и онлайн-подача на первый ВНЖ",
      actions: [
        "Перелет в Белград, заселение во временное жилье и обязательное получение бумажного или электронного «белого картона» (регистрации) в течение 24 часов.",
        "Перевод личных документов и диплома у сербского судебного переводчика (sudski tumač).",
        "Подача заявления на нострификацию диплома онлайн на сайте Агентства по квалификациям (AZK). Пошлина — 7500 RSD.",
        "Покупка локальных медицинских страховок на 1 год для всей семьи.",
        "Осмотр ребенка у сербского педиатра в частной клинике для получения справки в детский сад.",
        "Онлайн-подача документов на Единое разрешение (ВНЖ по таланту для вас + воссоединение для семьи) через портал eUprava."
      ],
      cost_eur: "3435 €",
      cost_details: [
        { name: "Прямой перелет Air Serbia (3 человека с багажом)", cost: "1350 €" },
        { name: "Временное жилье Airbnb (1-й месяц, все включено)", cost: "950 €" },
        { name: "Пошлины за Единое разрешение на троих (~18000 RSD/чел)", cost: "460 €" },
        { name: "Обязательные медстраховки на 1 год под ВНЖ (на троих)", cost: "250 €" },
        { name: "Услуги судебного переводчика (диплом, свидетельства, прививки)", cost: "150 €" },
        { name: "Пошлина AZK за нострификацию диплома (7500 RSD)", cost: "65 €" },
        { name: "Продукты, мобильная связь, базовый быт", cost: "160 €" },
        { name: "Прием педиатра и справка для сада", cost: "50 €" }
      ]
    },
    {
      id: "m2",
      title: "Месяц 2: Постоянное жилье и детский сад",
      focus: "Поиск квартиры на долгосрок и устройство ребенка в сад",
      actions: [
        "Поиск постоянной двухкомнатной квартиры (двушка/1.5-собан) в Белграде по цене ~600 €/мес.",
        "Подписание договора аренды (Ugovor o zakupu) минимум на год и оформление нового «белого картона» по постоянному адресу.",
        "Устройство ребенка в частный детский сад (с получением субсидии от города Белград, если применимо, или полностью за свой счет)."
      ],
      cost_eur: "2650 €",
      cost_details: [
        { name: "Аренда постоянной квартиры (первый месяц)", cost: "600 €" },
        { name: "Залог арендодателю (депозит 100%)", cost: "600 €" },
        { name: "Комиссия сербского риелтора (единоразово 50%)", cost: "300 €" },
        { name: "Частный детский сад (первый месяц)", cost: "400 €" },
        { name: "Коммунальные услуги (Инфостан, электричество, домашний интернет)", cost: "150 €" },
        { name: "Продукты питания, бытовая химия, семейные расходы", cost: "600 €" }
      ]
    },
    {
      id: "m3",
      title: "Месяц 3: Открытие ИП и смена статуса",
      focus: "Регистрация бизнеса (ИП-Паушал) и переход на новое основание ВНЖ",
      actions: [
        "Подача документов на регистрацию ИП (Preduzetnik) в Агентство APR. Налоговый номер (PIB) присвоится автоматически.",
        "Аренда виртуального офиса (юридического адреса) для ИП, если арендодатель квартиры против регистрации бизнеса на его адрес.",
        "Открытие расчетного счета ИП в сербском банке (прохождение комплаенса).",
        "Онлайн-подача через eUprava на смену основания вашего ВНЖ — с «Таланта» на «ИП (Предузетник)»."
      ],
      cost_eur: "2200 €",
      cost_details: [
        { name: "Аренда постоянной квартиры + коммуналка", cost: "750 €" },
        { name: "Частный детский сад (второй месяц)", cost: "400 €" },
        { name: "Аренда виртуального офиса для ИП (оплата на год вперед)", cost: "185 €" },
        { name: "Пошлина за регистрацию ИП в APR и смену статуса ВНЖ", cost: "65 €" },
        { name: "Помощь юриста / бухгалтера с открытием ИП и комплаенсом в банке", cost: "200 €" },
        { name: "Продукты питания и повседневные расходы", cost: "600 €" }
      ]
    },
    {
      id: "m4",
      title: "Месяц 4: Жизнь на рельсах бизнеса",
      focus: "Регулярная работа, уплата первых налогов и переход на гос. медицину",
      actions: [
        "Ведение коммерческой деятельности через ИП.",
        "Уплата фиксированного налога ИП (Паушал) в налоговую службу.",
        "Оформление государственной медицинской страховки (здравственная книжица) на всю семью через ваше ИП. С этого момента коммерческая страховка больше не требуется."
      ],
      cost_eur: "2100 €",
      cost_details: [
        { name: "Аренда постоянной квартиры + коммуналка", cost: "750 €" },
        { name: "Частный детский сад (регулярный платеж)", cost: "400 €" },
        { name: "Ежемесячные фиксированные налоги по ИП (Паушал)", cost: "350 €" },
        { name: "Продукты питания, быт, семейные расходы", cost: "600 €" }
      ]
    }
  ],
  totals: {
    safety_buffer: "9000 €",
    monthly_burn_rate: "2100 €/мес"
  }
};

function renderChecklist() {
  const root = document.getElementById('checklist-items');
  const saved = JSON.parse(localStorage.getItem('checklist') || '{}');
  const locked = localStorage.getItem('checklist-locked') === 'true';
  root.innerHTML = '';
  CHECKLIST.forEach(group => {
    const header = document.createElement('h3');
    header.className = 'cl-cat';
    header.textContent = group.cat;
    root.appendChild(header);
    group.items.forEach(item => {
      const st = getItem(saved, item.id);
      const checked = st.done;
      const prog = st.progress;
      const row = document.createElement('div');
      row.className = 'check-item' + (checked ? ' done' : '') + (prog ? ' progress' : '');
      const btn = document.createElement('button');
      btn.className = 'cl-btn' + (checked ? ' on' : '') + (prog ? ' half' : '');
      btn.setAttribute('aria-label', checked ? 'Отметить как невыполненное' : 'Отметить как выполненное');
      let dateRow, dInput, mInput, yInput, compactSpan, inputGroup;
      const getDateStr = () => {
        if (!dInput) return '';
        const d = dInput.value.trim();
        const m = mInput.value.trim();
        const y = yInput.value.trim();
        return d && m && y ? `${d.padStart(2,'0')}.${m.padStart(2,'0')}.${y.padStart(2,'0')}` : '';
      };
      if (item.hasDate) {
        dateRow = document.createElement('div');
        dateRow.className = 'cl-date-row' + (checked ? '' : ' hidden');
        const label = document.createElement('span');
        label.className = 'cl-date-label';
        label.textContent = '📅';
        dateRow.appendChild(label);
        compactSpan = document.createElement('span');
        compactSpan.className = 'cl-date-compact';
        dateRow.appendChild(compactSpan);
        inputGroup = document.createElement('span');
        inputGroup.className = 'cl-date-inputs';
        inputGroup.innerHTML = `<input type="text" class="cl-date-d" placeholder="ДД" maxlength="2" inputmode="numeric" value="${st.date ? st.date.split('.')[0] || '' : ''}">.<input type="text" class="cl-date-m" placeholder="ММ" maxlength="2" inputmode="numeric" value="${st.date ? st.date.split('.')[1] || '' : ''}">.<input type="text" class="cl-date-y" placeholder="ГГ" maxlength="2" inputmode="numeric" value="${st.date ? st.date.split('.')[2] || '' : ''}">`;
        dateRow.appendChild(inputGroup);
        const rem = document.createElement('span');
        rem.className = 'cl-date-remaining';
        dateRow.appendChild(rem);
        const editBtn = document.createElement('button');
        editBtn.className = 'cl-date-edit hidden';
        editBtn.textContent = '✏️';
        dateRow.appendChild(editBtn);
        dInput = inputGroup.querySelector('.cl-date-d');
        mInput = inputGroup.querySelector('.cl-date-m');
        yInput = inputGroup.querySelector('.cl-date-y');
        const updateRemaining = () => {
          const rem = dateRow.querySelector('.cl-date-remaining');
          const ds = getDateStr();
          if (!ds || !item.expires) { rem.textContent = ''; return; }
          const parts = ds.split('.');
          const issued = new Date('20' + parts[2], parts[1] - 1, parts[0]);
          const exp = new Date(issued);
          exp.setMonth(exp.getMonth() + item.expires);
          const now = new Date();
          const msLeft = exp - now;
          if (msLeft <= 0) { rem.textContent = '⚠️ Просрочен'; rem.className = 'cl-date-remaining expired'; return; }
          const daysLeft = Math.ceil(msLeft / 86400000);
          let totalMonths = Math.floor(daysLeft / 30);
          const dd = daysLeft % 30;
          const years = Math.floor(totalMonths / 12);
          const monthsLeft = totalMonths % 12;
          let remainingText = '';
          if (years > 0) {
            const yEnd = years % 10, yEnd100 = years % 100;
            const ySuffix = (yEnd === 1 && yEnd100 !== 11) || (yEnd >= 2 && yEnd <= 4 && (yEnd100 < 10 || yEnd100 >= 20)) ? 'г' : 'л';
            remainingText += `${years}${ySuffix} `;
          }
          if (monthsLeft > 0 || years === 0) remainingText += `${monthsLeft}мес `;
          if (dd > 0) remainingText += `${dd}дн`;
          rem.textContent = `✅ до окончания: ${remainingText.trim()}`;
          rem.className = 'cl-date-remaining ' + (years >= 1 ? 'ok' : totalMonths >= 1 ? 'warn' : 'expired');
        };
        let dateSaving = false;
        const lockDate = () => {
          if (!getDateStr()) return;
          compactSpan.textContent = getDateStr();
          inputGroup.classList.add('hidden');
          compactSpan.classList.remove('hidden');
          editBtn.textContent = '✏️';
          editBtn.classList.remove('hidden');
          updateRemaining();
        };
        const unlockDate = () => {
          inputGroup.classList.remove('hidden');
          compactSpan.classList.add('hidden');
          editBtn.textContent = '✅';
          editBtn.classList.remove('hidden');
          dInput.focus();
        };
        editBtn.addEventListener('pointerdown', (e) => {
          if (editBtn.textContent === '✅') {
            dateSaving = true;
          }
        });
        editBtn.addEventListener('click', () => {
          if (editBtn.textContent === '✅') {
            if (getDateStr()) {
              setItem(saved, item.id, true, getDateStr());
              lockDate();
              updateStats();
            }
            dateSaving = false;
          } else {
            unlockDate();
          }
        });
        const onDateChange = () => {
          if (dateSaving) return;
          setItem(saved, item.id, true, getDateStr());
          lockDate();
          updateStats();
        };
        if (st.date) {
          lockDate();
        } else {
          editBtn.textContent = '✅';
          editBtn.classList.remove('hidden');
        }
        editBtn.addEventListener('click', unlockDate);
        [dInput, mInput, yInput].forEach((el, i) => {
          el.addEventListener('input', () => {
            if (el.value.length >= 2 && i < 2) {
              const next = [dInput, mInput, yInput][i + 1];
              if (next) next.focus();
            }
          });
          el.addEventListener('change', onDateChange);
        });
      }
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (localStorage.getItem('checklist-locked') === 'true') return;
        const st = getItem(saved, item.id);
        const next = cycleItem(saved, item.id);
        setItem(saved, item.id, next.done, next.done ? (dInput ? getDateStr() : '') : (next.progress ? '' : ''), next.progress);
        btn.classList.remove('half', 'on');
        if (next.done) btn.classList.add('on');
        else if (next.progress) btn.classList.add('half');
        const isActive = next.done || next.progress;
        btn.setAttribute('aria-label', isActive ? 'Отметить как невыполненное' : 'Отметить как выполненное');
        row.classList.toggle('done', next.done);
        row.classList.toggle('progress', next.progress);
        if (dateRow) dateRow.classList.toggle('hidden', !next.done);
        updateStats();
      });
      row.appendChild(btn);
      const textSpan = document.createElement('span');
      textSpan.className = 'cl-text';
      textSpan.innerHTML = item.text;
      if (item.price) textSpan.innerHTML += ` <span class="cl-price">${item.price} ₽</span>`;
      textSpan.addEventListener('click', e => toggleTip(textSpan, e));
      row.appendChild(textSpan);
      const tipBtn = document.createElement('span');
      tipBtn.className = 'cl-tip';
      tipBtn.textContent = '▶';
      tipBtn.dataset.tip = item.tip;
      tipBtn.dataset.link = item.link || '';
      tipBtn.addEventListener('click', e => toggleTip(tipBtn, e));
      row.appendChild(tipBtn);
      const itemId = item.id;
      // Note section
      const ns = document.createElement('div');
      ns.id = 'note-section-' + itemId;
      ns.className = 'note-section' + (st.note ? '' : ' hidden');
      const nsText = document.createElement('div');
      nsText.className = 'note-section-text';
      nsText.innerHTML = st.note ? '📝 ' + st.note : '';
      ns.appendChild(nsText);
      const nsEdit = document.createElement('div');
      nsEdit.className = 'note-section-edit hidden';
      const nsTA = document.createElement('textarea');
      nsTA.className = 'cl-note-ta';
      nsTA.placeholder = 'Заметка...';
      nsTA.rows = 1;
      nsTA.value = st.note || '';
      const nsSave = document.createElement('button');
      nsSave.className = 'note-section-save';
      nsSave.textContent = '✅';
      nsSave.addEventListener('click', e => { e.stopPropagation(); saveNote(itemId); });
      nsEdit.addEventListener('click', e => { e.stopPropagation(); });
      nsTA.addEventListener('input', () => {
        nsTA.style.height = 'auto';
        nsTA.style.height = nsTA.scrollHeight + 'px';
      });
      nsEdit.appendChild(nsTA);
      nsEdit.appendChild(nsSave);
      ns.appendChild(nsEdit);
      const toggleTip = (el, e) => {
        e.stopPropagation();
        const row = el.closest('.check-item');
        const tip = row.querySelector('.cl-tip');
        const existing = row.nextElementSibling;
        if (existing && existing.classList.contains('cl-tip-body')) {
          existing.remove();
          tip.textContent = '▶';
          tip.classList.remove('open');
          return;
        }
        const body = document.createElement('div');
        body.className = 'cl-tip-body';
        body.innerHTML =
          `<div class="cl-tip-text">${tip.dataset.tip.replace(/\n/g, '<br>')}</div>` +
          (tip.dataset.link ? `<a href="${tip.dataset.link}" target="_blank" class="cl-tip-link">🔗 Открыть ссылку</a>` : '');
        const s = JSON.parse(localStorage.getItem('checklist') || '{}');
        const n = getItem(s, itemId).note || '';
        const addBtn = document.createElement('button');
        addBtn.className = 'cl-tip-add-note';
        addBtn.textContent = n ? '✎ Редактировать комментарий' : '＋ Добавить комментарий';
        addBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          editNote(itemId);
        });
        body.appendChild(addBtn);
        row.after(body);
        tip.textContent = '▼';
        tip.classList.add('open');
      };
      root.appendChild(row);
      if (dateRow) root.appendChild(dateRow);
      root.appendChild(ns);
    });
  });
  updateStats();
}

function updateStats() {
  const saved = JSON.parse(localStorage.getItem('checklist') || '{}');
  let total = 0, done = 0, progress = 0;
  CHECKLIST.forEach(g => g.items.forEach(i => {
    total++;
    const st = getItem(saved, i.id);
    if (st.done) done++;
    else if (st.progress) progress++;
  }));
  document.getElementById('checklist-stats').innerHTML =
    `✅ Выполнено: <b>${done}</b> / <b>${total}</b>` +
    (progress ? ` · ⌛️ в процессе: <b>${progress}</b>` : '');
}

// Lock toggle
function updateLockUI() {
  const lockBtn = document.getElementById('lock-btn');
  if (!lockBtn) return;
  const locked = localStorage.getItem('checklist-locked') === 'true';
  lockBtn.textContent = locked ? '🔒' : '🔓';
  lockBtn.classList.toggle('locked', locked);
}
document.addEventListener('DOMContentLoaded', () => {
  updateLockUI();
  document.getElementById('lock-btn')?.addEventListener('click', () => {
    const locked = localStorage.getItem('checklist-locked') === 'true';
    localStorage.setItem('checklist-locked', locked ? 'false' : 'true');
    updateLockUI();
  });
});

document.addEventListener('DOMContentLoaded', renderChecklist);
// Если вкладка чеклиста открывается динамически
document.querySelector('[data-tab="checklist"]')?.addEventListener('click', () => {
  setTimeout(updateStats, 50);
});

// === UPDATE BUTTON ===
document.getElementById('update-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('update-btn');
  const label = document.getElementById('update-label');
  btn.disabled = true;
  btn.textContent = '⏳';
  label.textContent = 'Проверка...';
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) {
    if (reg.waiting) {
      label.textContent = '🆕 Обновление готово';
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      btn.textContent = '🆕';
      setTimeout(() => location.reload(), 800);
      return;
    }
    await reg.update();
    const found = await new Promise(resolve => {
      const timer = setTimeout(() => resolve(false), 3000);
      if (reg.installing) {
        clearTimeout(timer);
        resolve(true);
        return;
      }
      reg.addEventListener('updatefound', () => {
        clearTimeout(timer);
        resolve(true);
      }, { once: true });
    });
    if (found) {
      label.textContent = '🆕 Обновление загружается';
      btn.textContent = '⏳';
      const newWorker = reg.installing;
      if (newWorker) {
        await new Promise(resolve => {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              resolve();
            }
          });
        });
      }
      btn.textContent = '🆕';
      setTimeout(() => location.reload(), 800);
      return;
    }
  }
  label.textContent = '✅ Актуально';
  btn.textContent = '🔄';
  btn.disabled = false;
  setTimeout(() => { label.textContent = 'Проверить обновления'; }, 3000);
});

// === CALCULATOR ===
function calcTotal() {
  const ids = ['rent', 'utils', 'food', 'transport', 'other'];
  const total = ids.reduce((sum, id) => {
    return sum + (parseFloat(document.getElementById('calc-' + id).value) || 0);
  }, 0);
  document.getElementById('calc-total').textContent =
    total.toLocaleString('ru-RU') + ' €';
}

document.querySelectorAll('#tab-calc input').forEach(inp => {
  inp.addEventListener('input', () => {
    calcTotal();
    if (typeof scheduleSync === 'function') scheduleSync();
  });
});
calcTotal();

// === TIMELINE PLAN ===
function renderTimeline() {
  const root = document.getElementById('timeline-root');
  if (!root) return;
  root.innerHTML = '';
  const h = document.createElement('h2');
  h.textContent = TIMELINE_PLAN.title;
  root.appendChild(h);
  const desc = document.createElement('p');
  desc.className = 'tl-desc';
  desc.textContent = TIMELINE_PLAN.description;
  root.appendChild(desc);

  TIMELINE_PLAN.timeline.forEach(m => {
    const card = document.createElement('div');
    card.className = 'tl-card';
    const header = document.createElement('div');
    header.className = 'tl-header';
    header.innerHTML = `<span class="tl-month">${m.title}</span> <span class="tl-cost">${m.cost_eur}</span>`;
    card.appendChild(header);
    const focusEl = document.createElement('div');
    focusEl.className = 'tl-focus';
    focusEl.textContent = '🎯 ' + m.focus;
    card.appendChild(focusEl);

    const actionsTitle = document.createElement('div');
    actionsTitle.className = 'tl-subtitle';
    actionsTitle.textContent = '📋 Действия';
    card.appendChild(actionsTitle);
    const ul = document.createElement('ul');
    ul.className = 'tl-actions';
    m.actions.forEach(a => {
      const li = document.createElement('li');
      li.textContent = a;
      ul.appendChild(li);
    });
    card.appendChild(ul);

    const costsTitle = document.createElement('div');
    costsTitle.className = 'tl-subtitle';
    costsTitle.textContent = '💰 Расходы';
    card.appendChild(costsTitle);
    const table = document.createElement('table');
    table.className = 'tl-costs';
    m.cost_details.forEach(d => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${d.name}</td><td class="tl-amt">${d.cost}</td>`;
      table.appendChild(tr);
    });
    card.appendChild(table);

    root.appendChild(card);
  });

  const totals = TIMELINE_PLAN.totals;
  const summary = document.createElement('div');
  summary.className = 'tl-summary';
  summary.innerHTML =
    `<div class="tl-summary-row">🧳 Рекомендуемая подушка безопасности: <strong>${totals.safety_buffer}</strong></div>` +
    `<div class="tl-summary-row">📊 Постоянный расход с 4-го месяца: <strong>${totals.monthly_burn_rate}</strong></div>`;
  root.appendChild(summary);
}

document.addEventListener('DOMContentLoaded', renderTimeline);
document.querySelector('[data-tab="timeline"]')?.addEventListener('click', () => {
  setTimeout(renderTimeline, 50);
});

// Sync: обновление после загрузки из облака
window.addEventListener('sync-loaded', () => {
  renderChecklist();
  calcTotal();
  updateLockUI();
});
