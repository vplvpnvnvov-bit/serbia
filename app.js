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
    { id:"p10", text:"Загранпаспорт мужа (10 лет)", price:"5000", link:"https://www.gosuslugi.ru/10087/1", tip:"Подать через Госуслуги, фото в ателье. Срок изготовления до 30 дней. Забрать в МВД/МФЦ." },
    { id:"p5w", text:"Загранпаспорт жены (10 лет)", price:"5000", link:"https://www.gosuslugi.ru/10087/1", tip:"Подать через Госуслуги, забрать в МФЦ." },
    { id:"p5d", text:"Загранпаспорт ребёнка (5 лет, старый образец)", price:"3000", link:"https://www.gosuslugi.ru/10087/1", tip:"Сначала фото в ателье. Подать через Госуслуги, забрать в МВД/МФЦ (1.5–2 недели). Нужен штамп о гражданстве на свидетельстве о рождении." },
    { id:"stamp", text:"Штамп о гражданстве РФ на свидетельстве о рождении ребёнка", price:"", link:"", tip:"Без красного штампа МВД на обороте свидетельства загранпаспорт ребёнку не сделают. Обратиться в МВД по месту жительства." },
    { id:"nocrim_h", text:"Справка о несудимости (муж) — бумажная, с живой печатью", price:"", link:"https://www.gosuslugi.ru/600119/1", tip:"Заказать на Госуслугах. Придёт письмом или забрать в МВД. ОБЯЗАТЕЛЬНО с синей печатью — распечатка с Госуслуг не подойдёт. Срок действия 6 месяцев. Рекомендуется сразу поставить апостиль." },
    { id:"nocrim_w", text:"Справка о несудимости (жена) — бумажная, с живой печатью", price:"", link:"https://www.gosuslugi.ru/600119/1", tip:"Аналогично мужу. Срок действия 6 месяцев. При подаче на ВНЖ сербский МУП может потребовать апостилированную справку." },
    { id:"nocrim_apost", text:"Апостиль на справки о несудимости (муж + жена)", price:"5000", link:"", tip:"Сдать оригинал справки в МФЦ или Минюст. Госпошлина ~2500₽ за каждую. В 2026 году сербские банки и МУП всё чаще требуют апостилированные справки." },
    { id:"child_consent", text:"Нотариальное согласие на выезд ребёнка (если едет один родитель)", price:"2000", link:"", tip:"Заверяется у нотариуса. Указать страны и срок. Если едете всей семьёй — не нужно." },
  ]},
  { cat: "📄 Апостили и легализация", items: [
    { id:"apost_marr", text:"Апостиль на свидетельство о браке (оригинал)", price:"2500", link:"", tip:"Сдать оригинал в МФЦ или ЗАГС. Госпошлина 2500₽. Без апостиля супруге могут отказать в ВНЖ на основании вашего ИП." },
    { id:"apost_birth", text:"Апостиль на свидетельство о рождении ребёнка", price:"2500", link:"", tip:"Сдать оригинал в МФЦ или ЗАГС. Потребуется для ВНЖ и в будущем для записи в сад/школу." },
    { id:"apost_diploma", text:"Апостиль на диплом об образовании (с приложением)", price:"2500", link:"", tip:"Нужен для нострификации (подтверждения диплома) в Сербии. Заказать в Минобрнауки или МФЦ. Госпошлина 2500₽. Срок ~30 дней." },
    { id:"translation_copies", text:"Нотариальные копии и переводы документов на сербский язык", price:"", link:"", tip:"Переводы делает судебный переводчик (судски тумач) уже в Сербии. Нотариальное заверение копий — в РФ." },
  ]},
  { cat: "📚 Образование и нострификация", items: [
    { id:"diploma", text:"Диплом об образовании (с приложением с оценками)", price:"", link:"", tip:"Оригинал или нотариально заверенная копия. Нужен для нострификации, если ИП требует подтверждения квалификации или для ВНЖ как специалист." },
    { id:"diploma_eng", text:"Перевод диплома на английский/сербский", price:"", link:"", tip:"Заказать у судебного переводчика в Сербии или в бюро переводов в РФ." },
  ]},
  { cat: "📄 Документы в Сербии", items: [
    { id:"reg", text:"Регистрация пребывания (белый картон)", price:"", link:"", tip:"В течение 24 часов после въезда. Делает хозяин квартиры / арендодатель через полицию (МУП). Хранить при себе." },
    { id:"vnd", text:"Подача на ВНД (вид на жительство)", price:"", link:"", tip:"Основание: открытие ИП (предузетник), работа по контракту, учёба или недвижимость. Срок рассмотрения 2–4 месяца." },
    { id:"pib", text:"Налоговый номер (PIB)", price:"", link:"", tip:"Получить в Налоговой службе (Poreska Uprava). Нужен для работы, аренды, открытия счёта в банке, таможни." },
    { id:"preduzetnik", text:"Открытие ИП (предузетник)", price:"", link:"", tip:"Регистрация через АПР (Agencija za privredne registre) или ЦРС (Centralni registar). Потребуется загранпаспорт, PIB, адрес регистрации." },
  ]},
  { cat: "🏦 Финансы и налоги", items: [
    { id:"bank", text:"Открытие счёта в сербском банке (Raiffeisen / Intesa / OTP)", price:"", link:"", tip:"Потребуется загранпаспорт, PIB, регистрация. Минимальный взнос ~10 000 RSD. Комплаенс строгий — могут запросить происхождение средств." },
    { id:"tax_decl", text:"Налоговые декларации (3-НДФЛ / 2-НДФЛ / выписка из ЛК ФНС)", price:"", link:"", tip:"Скачать с Госуслуг или из личного кабинета ФНС. Нужны для подтверждения легальности доходов сербскому банку. Желательно на русском + английский." },
    { id:"bank_stat", text:"Выписки по банковским счетам в РФ за 3–6 месяцев (на английском)", price:"", link:"", tip:"Запросить в мобильном приложении или отделении банка. Многие банки РФ выгружают на английском. Понадобятся при комплаенсе в сербском банке." },
    { id:"power", text:"Генеральная доверенность на родственника в РФ (на 5–10 лет)", price:"2000", link:"", tip:"Сделать у нотариуса. Чтобы родственник мог распоряжаться имуществом, закрывать счета, получать документы." },
  ]},
  { cat: "🏠 Жильё", items: [
    { id:"rent", text:"Договор аренды жилья", price:"от 500€/мес", link:"", tip:"Заключить договор с арендодателем. Задаток обычно 1 месяц + 1 месяц аренды. Договор нужен для регистрации пребывания." },
  ]},
  { cat: "❤️ Здоровье и медицина", items: [
    { id:"insure", text:"Медицинская страховка (международная, покрывает Сербию)", price:"200-400€", link:"", tip:"Покрытие ~200–400€/год на семью. Проверить, входит ли Сербия. Карту иметь с собой." },
    { id:"vaccine", text:"Карта профилактических прививок ребёнка (форма 063/у)", price:"", link:"", tip:"Запросить в детской поликлинике подробную выписку со всеми прививками (корь, краснуха паротит — критично). Перевести у судебного переводчика в Сербии." },
    { id:"med_cards", text:"Медицинские выписки при хронических заболеваниях (все члены семьи)", price:"", link:"", tip:"Взять истории болезней, рецепты, назначения. Торговые названия лекарств в Сербии другие — нужны действующие вещества." },
    { id:"dentist", text:"Пройти стоматологов всей семьёй в РФ", price:"", link:"", tip:"В Сербии стоматология дороже. Сделать все зубы до отъезда." },
    { id:"pharm", text:"Собрать аптечку с привычными лекарствами", price:"", link:"", tip:"Многие лекарства в Сербии продаются по рецепту. Взять привычные (жаропонижающие, обезболивающие, от аллергии и т.д.) с запасом на полгода." },
  ]},
  { cat: "🚗 Транспорт / Автомобиль", items: [
    { id:"license", text:"Перевод водительских прав на сербский язык", price:"", link:"", tip:"Сделать у судебного переводчика (судски тумач) в Сербии. Российские права действуют 6 месяцев." },
    { id:"car_power", text:"Нотариальная доверенность на выезд за границу (если машина не на вас)", price:"", link:"", tip:"Если автомобиль на юрлицо или родственника — оформить доверенность с правом выезда за границу, желательно на английском языке." },
    { id:"kbm", text:"Справка из страховой о безаварийном стаже (КБМ) на английском", price:"", link:"", tip:"Обратиться в свою страховую компанию. Справка поможет получить скидку на ОСАГО (осигурање) в Сербии." },
    { id:"car_docs", text:"СТС и ПТС (оригиналы на машину)", price:"", link:"", tip:"Для ввоза или перерегистрации авто в Сербии. Сделать копии." },
  ]},
  { cat: "📱 Прочее", items: [
    { id:"sim", text:"Сим-карта сербского оператора (A1 / Telenor / mts)", price:"1000 RSD", link:"", tip:"Купить в салоне связи. Нужен загранпаспорт. Есть prepaid и контрактные тарифы." },
  ]},
];

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
      const checked = saved[item.id] || false;
      const row = document.createElement('div');
      row.className = 'check-item' + (checked ? ' done' : '');
      const btn = document.createElement('button');
      btn.className = 'cl-btn' + (checked ? ' on' : '');
      btn.setAttribute('aria-label', checked ? 'Отметить как невыполненное' : 'Отметить как выполненное');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (localStorage.getItem('checklist-locked') === 'true') return;
        const newChecked = !(saved[item.id] || false);
        saved[item.id] = newChecked;
        localStorage.setItem('checklist', JSON.stringify(saved));
        btn.classList.toggle('on', newChecked);
        btn.setAttribute('aria-label', newChecked ? 'Отметить как невыполненное' : 'Отметить как выполненное');
        row.classList.toggle('done', newChecked);
        updateStats();
      });
      row.appendChild(btn);
      const tipBtn = document.createElement('span');
      tipBtn.className = 'cl-tip';
      tipBtn.textContent = '▶';
      tipBtn.dataset.tip = item.tip;
      tipBtn.dataset.link = item.link || '';
      tipBtn.addEventListener('click', e => {
        e.stopPropagation();
        const row = tipBtn.closest('.check-item');
        const existing = row.nextElementSibling;
        if (existing && existing.classList.contains('cl-tip-body')) {
          existing.remove();
          tipBtn.textContent = '▶';
          tipBtn.classList.remove('open');
          return;
        }
        const body = document.createElement('div');
        body.className = 'cl-tip-body';
        body.innerHTML =
          `<div class="cl-tip-text">${tipBtn.dataset.tip}</div>` +
          (tipBtn.dataset.link ? `<a href="${tipBtn.dataset.link}" target="_blank" class="cl-tip-link">🔗 Открыть ссылку</a>` : '');
        row.after(body);
        tipBtn.textContent = '▼';
        tipBtn.classList.add('open');
      });
      row.appendChild(tipBtn);
      const textSpan = document.createElement('span');
      textSpan.className = 'cl-text';
      textSpan.innerHTML = item.text;
      if (item.price) textSpan.innerHTML += ` <span class="cl-price">${item.price} ₽</span>`;
      row.appendChild(textSpan);
      root.appendChild(row);
    });
  });
  updateStats();
}

function updateStats() {
  const saved = JSON.parse(localStorage.getItem('checklist') || '{}');
  let total = 0, done = 0;
  CHECKLIST.forEach(g => g.items.forEach(i => {
    total++;
    if (saved[i.id]) done++;
  }));
  const pct = total ? Math.round(done / total * 100) : 0;
  document.getElementById('checklist-stats').innerHTML =
    `✅ Выполнено: <b>${done}</b> / <b>${total}</b> (${pct}%)`;
}

// Lock toggle
document.addEventListener('DOMContentLoaded', () => {
  const lockBtn = document.getElementById('lock-btn');
  if (!lockBtn) return;
  const updateLock = () => {
    const locked = localStorage.getItem('checklist-locked') === 'true';
    lockBtn.textContent = locked ? '🔒' : '🔓';
    lockBtn.classList.toggle('locked', locked);
  };
  lockBtn.addEventListener('click', () => {
    const locked = localStorage.getItem('checklist-locked') === 'true';
    localStorage.setItem('checklist-locked', locked ? 'false' : 'true');
    updateLock();
  });
  updateLock();
});

document.addEventListener('DOMContentLoaded', renderChecklist);
// Если вкладка чеклиста открывается динамически
document.querySelector('[data-tab="checklist"]')?.addEventListener('click', () => {
  setTimeout(updateStats, 50);
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
  inp.addEventListener('input', calcTotal);
});
calcTotal();
