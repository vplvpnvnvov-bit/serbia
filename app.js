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
    { id:"p10", text:"Загранпаспорт мужа (10 лет)", price:"5000", link:"https://www.gosuslugi.ru/10087/1", tip:"Подать заявление через Госуслуги. Срок изготовления — до 30 дней." },
    { id:"p5h", text:"Загранпаспорт мужа — забрать", price:"", link:"", tip:"Забрать в МВД/МФЦ по месту жительства." },
    { id:"p5w", text:"Загранпаспорт жены (10 лет)", price:"5000", link:"https://www.gosuslugi.ru/10087/1", tip:"Подать через Госуслуги, забрать в МФЦ." },
    { id:"p5d", text:"Загранпаспорт дочки (5 лет, старый образец)", price:"3000", link:"https://www.gosuslugi.ru/10087/1", tip:"Сначала сделать фото в ателье. Подать через Госуслуги, забрать в МВД/МФЦ (1.5-2 недели)." },
    { id:"stamp", text:"Штамп о гражданстве РФ на свидетельстве о рождении дочки", price:"", link:"", tip:"Без красного штампа МВД на обороте свидетельства паспорт дочке не выдадут." },
    { id:"nocrim_h", text:"Справка о несудимости (муж) — бумажная, с печатью", price:"", link:"https://www.gosuslugi.ru/600119/1", tip:"Заказать на Госуслугах. Придёт письмом или забрать в МВД." },
    { id:"nocrim_w", text:"Справка о несудимости (жена) — бумажная, с печатью", price:"", link:"https://www.gosuslugi.ru/600119/1", tip:"Заказать на Госуслугах. Придёт письмом или забрать в МВД." },
  ]},
  { cat: "📄 Легализация (апостили)", items: [
    { id:"apost_marr", text:"Апостиль на свидетельство о браке", price:"2500", link:"", tip:"Сдать оригинал в МФЦ или ЗАГС. Госпошлина 2500 руб." },
    { id:"apost_birth", text:"Апостиль на свидетельство о рождении дочки", price:"2500", link:"", tip:"Сдать оригинал в МФЦ или ЗАГС. Госпошлина 2500 руб." },
  ]},
  { cat: "📄 Документы в Сербии", items: [
    { id:"reg", text:"Регистрация пребывания (белый картон)", price:"", link:"", tip:"В течение 24ч после въезда. Делает хозяин квартиры или арендодатель через полицию." },
    { id:"vnd", text:"Подача на ВНД (вид на жительство)", price:"", link:"", tip:"Основание: регистрация компании / работа / учёба. Срок рассмотрения 2-4 месяца." },
    { id:"pib", text:"Налоговый номер (PIB)", price:"", link:"", tip:"Получить в Налоговой службе (Poreska Uprava). Нужен для работы, аренды, банка." },
  ]},
  { cat: "🏦 Финансы", items: [
    { id:"bank", text:"Открытие счёта в сербском банке (Raiffeisen / Intesa / OTP)", price:"", link:"", tip:"Потребуется загранпаспорт, PIB, регистрация. Минимальный взнос ~10 000 RSD." },
    { id:"power", text:"Генеральная доверенность на родственника в РФ", price:"2000", link:"", tip:"Сделать у нотариуса на 5-10 лет. Чтобы родственник мог распоряжаться имуществом и счетами." },
  ]},
  { cat: "🏠 Жильё", items: [
    { id:"rent", text:"Договор аренды жилья", price:"600-800", link:"", tip:"Заключить договор с арендодателем. Задаток обычно 1 месяц + 1 месяц аренды." },
  ]},
  { cat: "❤️ Здоровье", items: [
    { id:"insure", text:"Медицинская страховка (международная)", price:"200-400", link:"", tip:"Покрытие должно включать Сербию. ~200-400€/год на семью." },
    { id:"dentist", text:"Пройти стоматологов всей семьёй в РФ", price:"", link:"", tip:"В Сербии стоматология дороже. Сделать все зубы до отъезда." },
    { id:"pharm", text:"Собрать аптечку с привычными лекарствами", price:"", link:"", tip:"Многие лекарства продаются по рецепту. Взять привычные с запасом на полгода." },
  ]},
  { cat: "🚗 Транспорт / Права", items: [
    { id:"license", text:"Перевод водительских прав на сербский", price:"", link:"", tip:"Нужен нотариальный перевод в Сербии. Российские права действуют 6 месяцев." },
  ]},
  { cat: "📱 Прочее", items: [
    { id:"sim", text:"Сим-карта сербского оператора (A1 / Telenor / mts)", price:"1000", link:"", tip:"Купить в салоне связи. Нужен загранпаспорт." },
  ]},
];

function renderChecklist() {
  const root = document.getElementById('checklist-items');
  const saved = JSON.parse(localStorage.getItem('checklist') || '{}');
  root.innerHTML = '';
  CHECKLIST.forEach(group => {
    const header = document.createElement('h3');
    header.className = 'cl-cat';
    header.textContent = group.cat;
    root.appendChild(header);
    group.items.forEach(item => {
      const checked = saved[item.id] || false;
      const label = document.createElement('label');
      label.className = 'check-item';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = checked;
      cb.addEventListener('change', () => {
        saved[item.id] = cb.checked;
        localStorage.setItem('checklist', JSON.stringify(saved));
        updateStats();
      });
      label.appendChild(cb);
      const span = document.createElement('span');
      span.className = 'cl-text';
      span.innerHTML = item.text;
      if (item.price) span.innerHTML += ` <span class="cl-price">${item.price} ₽</span>`;
      label.appendChild(span);
      const tipBtn = document.createElement('span');
      tipBtn.className = 'cl-tip';
      tipBtn.textContent = '💡';
      tipBtn.title = item.tip;
      tipBtn.addEventListener('click', e => {
        e.stopPropagation();
        alert(item.tip + (item.link ? `\n\nСсылка: ${item.link}` : ''));
      });
      label.appendChild(tipBtn);
      root.appendChild(label);
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
