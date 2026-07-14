window.APP_CONFIG = {
  VERSION: "1.15.0",
  BUILD: "ca8523e",
  CACHE_NAME: "relocation-v1.15.0-ca8523e"
};



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

const baseLayers = {};
function addBaseLayer(name, url, opts) {
  const layer = L.tileLayer(url, { maxZoom: 19, ...opts });
  baseLayers[name] = layer;
  return layer;
}

const tileCarto = addBaseLayer('carto', 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
}).addTo(map);
addBaseLayer('osm', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://openstreetmap.org">OSM</a>',
});
addBaseLayer('satellite', 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
  attribution: '&copy; Esri',
});

// === POI LAYER ===
const poiLayer = L.layerGroup().addTo(map);
const poiMarkers = [];

MAP_POINTS.forEach(pt => {
  const emoji = pt.category === 'gov' ? '🏢' : pt.category === 'culture' ? '🎭' : '👶';
  const marker = L.marker(pt.coords, {
    icon: L.divIcon({
      html: `<div style="font-size:18px;cursor:pointer;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.3))">${emoji}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: 'poi-marker',
    }),
  });
  marker.bindPopup(`
    <div style="font-family:sans-serif;max-width:220px">
      <b>${emoji} ${pt.name}</b><br>
      <span style="color:#555;font-size:12px">${pt.desc}</span>
      ${pt.linked ? `<br><button class="poi-link-btn" data-linked="${pt.linked}" style="margin-top:6px;padding:4px 10px;border:none;border-radius:6px;background:#1a237e;color:#fff;cursor:pointer;font-size:11px">✅ Показать в чек-листе</button>` : ''}
    </div>
  `, { maxWidth: 280 });
  marker._poiCat = pt.category;
  marker._pt = pt;
  marker.on('popupopen', () => {
    const btn = marker.getPopup().getElement()?.querySelector('.poi-link-btn');
    if (btn) {
      btn.onclick = () => {
        const id = btn.dataset.linked;
        scrollToChecklistItem(id);
        map.closePopup();
      };
    }
  });
  poiMarkers.push(marker);
  poiLayer.addLayer(marker);
});

// === DISTRICT POLYGONS ===
const polygons = {};
const labelMarkers = {};
let activePreset = 'family';
let urbanHide = false;

function getScore(d, preset) {
  if (preset === 'budget') return d.budgetScore;
  if (preset === 'vibe') return d.vibeScore;
  return d.familyScore;
}

function scoreColor(score) {
  return score >= 8 ? '#2e7d32' : score >= 5 ? '#e65100' : '#c62828';
}

function scoreBg(score) {
  return score >= 8 ? '#e8f5e9' : score >= 5 ? '#fff3e0' : '#ffebee';
}

function darkenHex(hex, amt) {
  if (!hex || hex[0] !== '#') return '#888';
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, (n >> 16) - amt);
  const g = Math.max(0, ((n >> 8) & 0xff) - amt);
  const b = Math.max(0, (n & 0xff) - amt);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function scoreMax() { return 10; }
function safeUrl(url) {
  if (!url) return '#';
  if (/^\s*(javascript|data):/i.test(url)) return '#';
  return url;
}

function presetEmoji(preset) {
  return preset === 'family' ? '👶' : preset === 'budget' ? '💰' : '⚡';
}

function presetName(preset) {
  return preset === 'family' ? 'С детьми' : preset === 'budget' ? 'Бюджетно' : 'Движ';
}

function updateMapColors(preset) {
  activePreset = preset;
  DISTRICTS.forEach(d => {
    const p = polygons[d.name];
    if (!p) return;
    const sc = getScore(d, preset);
    const fill = scoreColor(sc);
    const edge = darkenHex(fill, 30);
    p.setStyle({ fillColor: fill, color: edge });
    if (labelMarkers[d.name]) {
      labelMarkers[d.name].setIcon(L.divIcon({
        html: districtLabel(d.name, d.price, sc),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }));
    }
  });
  updateLegend(preset);
  // update info panel if open
  const nameEl = document.getElementById('d-name');
  if (nameEl && nameEl.textContent) {
    const d = DISTRICTS.find(x => x.name === nameEl.textContent);
    if (d) showDistrictPanel(d, true);
  }
}

function updateLegend(preset) {
  let filtered = urbanHide ? DISTRICTS.filter(d => d.isUrban) : [...DISTRICTS];
  const sorted = filtered.sort((a, b) => getScore(b, preset) - getScore(a, preset));
  const listEl = document.getElementById('legend-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  const emoji = presetEmoji(preset);
  sorted.forEach((d, i) => {
    const sc = getScore(d, preset);
    const color = scoreColor(sc);
    const bg = scoreBg(sc);
    const row = document.createElement('div');
    row.className = 'll-row';
    row.innerHTML = `
      <span class="ll-rank">${i+1}</span>
      <span class="ll-name">${d.name}</span>
      <span class="ll-score" style="background:${bg};color:${color}">${emoji} ${sc}/10</span>
    `;
    row.dataset.district = d.name;
    row.addEventListener('click', () => {
      showDistrictPanel(d);
      listEl.classList.add('hidden');
    });
    listEl.appendChild(row);
  });
  document.getElementById('legend-toggle').textContent =
    `${emoji} Сортировка: ${presetName(preset)}`;
}

function updateUrbanFilter(hide) {
  urbanHide = hide;
  DISTRICTS.forEach(d => {
    const p = polygons[d.name];
    const m = labelMarkers[d.name];
    if (!p) return;
    const visible = !hide || d.isUrban;
    if (visible) {
      p.setStyle({ fillOpacity: 0.35, weight: 3, interactive: true });
      if (m) map.addLayer(m);
    } else {
      p.setStyle({ fillOpacity: 0, weight: 0, interactive: false, opacity: 0 });
      if (m) map.removeLayer(m);
    }
  });
  if (hide) {
    const urban = DISTRICTS.filter(d => d.isUrban && polygons[d.name]);
    if (urban.length) {
      const bounds = urban.reduce((b, d) => b.extend(polygons[d.name].getBounds()), L.latLngBounds([]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 12 });
    }
  }
  updateLegend(activePreset);
}

// Preset switcher
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    updateMapColors(btn.dataset.preset);
  });
});

// Urban toggle
document.getElementById('urban-toggle')?.addEventListener('change', e => {
  updateUrbanFilter(e.target.checked);
});

function highlightDistrict(name) {
  Object.keys(polygons).forEach(k => {
    const p = polygons[k];
    const d = DISTRICTS.find(x => x.name === k);
    if (urbanHide && d && !d.isUrban) {
      p.setStyle({ fillOpacity: 0, weight: 0, opacity: 0, interactive: false });
    } else {
      p.setStyle({ fillOpacity: 0.35, weight: 3, interactive: true });
    }
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

function showDistrictPanel(d, noFit) {
  document.getElementById('d-name').textContent = d.name;
  // Carousel gallery
  const gallery = document.getElementById('d-gallery');
  gallery.innerHTML = '';
  if (d.images && d.images.length) {
    d.images.forEach((url, idx) => {
      const img = document.createElement('img');
      img.dataset.idx = idx;
      img.loading = 'lazy';
      img.onerror = function() {
        this.onerror = null;
        const ph = document.createElement('div');
        ph.className = 'img-placeholder';
        ph.textContent = d.name;
        ph.dataset.idx = idx;
        this.parentNode.replaceChild(ph, this);
      };
      img.src = url;
      gallery.appendChild(img);
    });
  }
  const prevBtn = document.getElementById('car-prev');
  const nextBtn = document.getElementById('car-next');
  const scrollCarousel = (dir) => {
    const scrollAmt = gallery.clientWidth * 0.8;
    gallery.scrollBy({ left: dir * scrollAmt, behavior: 'smooth' });
  };
  prevBtn.onclick = () => scrollCarousel(-1);
  nextBtn.onclick = () => scrollCarousel(1);
  // swipe support
  let startX = 0, startY = 0;
  gallery.ontouchstart = e => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
  gallery.ontouchend = e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
      scrollCarousel(dx > 0 ? -1 : 1);
    }
  };
  document.getElementById('d-price').textContent = d.price;
  document.getElementById('d-score').innerHTML =
    `👶 С детьми: <b>${d.familyScore}</b>/10 &nbsp;|&nbsp; ` +
    `💰 Бюджетно: <b>${d.budgetScore}</b>/10 &nbsp;|&nbsp; ` +
    `⚡ Движ: <b>${d.vibeScore}</b>/10`;
  document.getElementById('d-family-desc').textContent = d.familyDesc || '';
  document.getElementById('d-desc').textContent = d.desc;
  setList('d-pros', '✅ Плюсы', d.pros);
  setList('d-cons', '⚠️ Минусы', d.cons);
  setList('d-places', '📍 Ключевые места', d.key_places);
  setSection('d-transport', '🚌 Транспорт', d.transport);
  const linksEl = document.getElementById('d-links');
  if (d.links && d.links.length) {
    linksEl.innerHTML = '<strong>🔗 Ссылки по району</strong><br>' +
      d.links.map(l => `<a href="${safeUrl(l.url)}" target="_blank">${l.title}</a>`).join('<br>');
    linksEl.style.display = 'block';
  } else {
    linksEl.style.display = 'none';
  }
  document.getElementById('district-info').classList.remove('hidden');
  if (!noFit) highlightDistrict(d.name);
}

function districtLabel(name, price, score) {
  let color = score >= 8 ? '#2e7d32' : score >= 5 ? '#f9a825' : '#c62828';
  return `<div style="font-family:sans-serif;font-size:11px;font-weight:bold;
    color:#1a1a1a;text-align:center;white-space:nowrap;
    background:rgba(255,255,255,0.9);border-radius:4px;
    padding:3px 7px;border:1px solid #bbb;
    box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    ${name} <span style="color:#d32f2f">${price}</span>
    <span style="color:${color};font-size:10px"> (${score}/10)</span>
  </div>`;
}

function popupHTML(d) {
  const sc = getScore(d, activePreset);
  const color = scoreColor(sc);
  const emoji = presetEmoji(activePreset);
  const label = presetName(activePreset);
  return `<div style="font-family:sans-serif;width:200px">
    <b style="font-size:15px">${d.name}</b><br>
    <span style="color:#d32f2f;font-size:14px;font-weight:bold">${d.price}</span><br>
    <span style="font-size:11px;color:${color}">${emoji} ${sc}/10 — ${label}</span><br>
    <span style="color:#555;font-size:11px">${d.desc}</span>
  </div>`;
}

DISTRICTS.forEach(d => {
  if (!d.coords || d.coords.length < 3) return;

  const initScore = getScore(d, activePreset);
  const initFill = scoreColor(initScore);
  const polygon = L.polygon(d.coords, {
    color: darkenHex(initFill, 30),
    fillColor: initFill,
    fillOpacity: 0.35,
    weight: 3,
  }).addTo(map);
  polygons[d.name] = polygon;

  polygon.bindPopup(popupHTML(d), { maxWidth: 220 });
  polygon.bindTooltip(d.name, { sticky: true });

  polygon.on('click', () => showDistrictPanel(d));

  const lats = d.coords.map(p => p[0]);
  const lons = d.coords.map(p => p[1]);
  const cx = (Math.min(...lats) + Math.max(...lats)) / 2;
  const cy = (Math.min(...lons) + Math.max(...lons)) / 2;

  labelMarkers[d.name] = L.marker([cx, cy], {
    icon: L.divIcon({
      html: districtLabel(d.name, d.price, initScore),
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
const listEl = document.getElementById('legend-list');
document.getElementById('legend-toggle')?.addEventListener('click', () => {
  listEl.classList.toggle('hidden');
  document.getElementById('legend-arrow')?.classList.toggle('open');
});

updateLegend(activePreset);

// === LAYER CONTROL ===
// Base map switch
document.getElementById('base-map-select')?.addEventListener('change', e => {
  const key = e.target.value;
  Object.keys(baseLayers).forEach(k => {
    if (k === key) map.addLayer(baseLayers[k]);
    else map.removeLayer(baseLayers[k]);
  });
});
// Opacity slider
document.getElementById('opacity-slider')?.addEventListener('input', e => {
  const val = parseInt(e.target.value);
  document.getElementById('opacity-val').textContent = val + '%';
  const opacity = val / 100;
  DISTRICTS.forEach(d => {
    const p = polygons[d.name];
    if (!p) return;
    p.setStyle({ fillOpacity: opacity });
  });
  const labelVis = val > 8;
  DISTRICTS.forEach(d => {
    const m = labelMarkers[d.name];
    if (!m) return;
    if (labelVis && !urbanHide) { if (!map.hasLayer(m)) map.addLayer(m); }
    else if (!labelVis || urbanHide) { if (map.hasLayer(m)) map.removeLayer(m); }
  });
});
// Layer control toggle
document.getElementById('lc-toggle')?.addEventListener('click', () => {
  document.getElementById('lc-body')?.classList.toggle('hidden');
  document.getElementById('lc-arrow')?.classList.toggle('open');
});
// POI category filters
document.querySelectorAll('[data-poi-cat]').forEach(cb => {
  cb.addEventListener('change', () => {
    const cat = cb.dataset.poiCat;
    const visible = cb.checked;
    poiMarkers.forEach(m => {
      if (m._poiCat === cat) {
        if (visible) poiLayer.addLayer(m);
        else poiLayer.removeLayer(m);
      }
    });
  });
});

const masterTimeline = [
  {
    month: 0,
    title: "Месяц 0: Подготовка в Москве",
    focus: "Сбор документов, которые невозможно получить в Сербии",
    tasks: [
      { id: "p10", name: "Загранпаспорт мужа (10 лет)", cost: 50, currency: "EUR", desc: "Оформить через Госуслуги", tip: "Делается до 1 месяца.", hasDate: true, expires: 120 },
      { id: "p5w", name: "Загранпаспорт жены (10 лет)", cost: 50, currency: "EUR", desc: "Оформить через Госуслуги", tip: "Делается до 1 месяца.", hasDate: true, expires: 120 },
      { id: "p5d", name: "Загранпаспорт ребёнка", cost: 30, currency: "EUR", desc: "Старый образец на 5 лет", tip: "Оформить после штампа о гражданстве.", hasDate: true, expires: 60 },
      { id: "stamp", name: "Штамп о гражданстве РФ на свидетельство о рождении", cost: 0, currency: "EUR", desc: "Штамп на обратную сторону свидетельства", tip: "Ставят в МВД по месту жительства в день обращения." },
      { id: "m0_apostille", name: "Апостиль на справку о несудимости (муж + жена)", cost: 60, currency: "EUR", desc: "Пошлина 2500 руб за один апостиль", tip: "Обязательно делать на бумажные оригиналы справок в МВД.", hasDate: true, expires: 6 },
      { id: "apost_marr", name: "Апостиль на свидетельство о браке", cost: 30, currency: "EUR", desc: "Пошлина 2500 руб", tip: "Необходим для ВНЖ супруги по воссоединению." },
      { id: "apost_birth", name: "Апостиль на свидетельство о рождении ребенка", cost: 30, currency: "EUR", desc: "Пошлина 2500 руб", tip: "Потребуется для ВНЖ ребенка и записи в школу/сад." },
      { id: "power", name: "Генеральная доверенность в РФ на близкого человека", cost: 20, currency: "EUR", desc: "Оформить у нотариуса до отъезда", tip: "Сделайте на срок от 5 до 10 лет с правом передоверия.", hasDate: true, expires: 120 },
      { id: "dentist", name: "Пройти стоматологов всей семьёй в РФ", cost: 0, currency: "EUR", desc: "Санация полости рта", tip: "В РФ стоматология выйдет привычнее и дешевле перед стартом." }
    ]
  },
  {
    month: 1,
    title: "Месяц 1: Прилет и ВНЖ «Талант»",
    focus: "Перелет, адаптация на Airbnb, подача на первый ВНЖ и нострификация",
    tasks: [
      { id: "m1_flight", name: "Прямой перелет Air Serbia (3 чел. с багажом)", cost: 1350, currency: "EUR", desc: "Рейс Москва — Белград" },
      { id: "m1_airbnb", name: "Жилье на Airbnb (1-й месяц, всё включено)", cost: 950, currency: "EUR", desc: "Временный дом и получение белого картона от хоста" },
      { id: "reg", name: "Получение белого картона (Beli karton)", cost: 0, currency: "EUR", desc: "Регистрация в полиции в течение 24 часов", tip: "Хозяин Airbnb обязан зарегистрировать вас онлайн или лично в полиции." },
      { id: "sim", name: "Покупка местной сим-карты", cost: 10, currency: "EUR", desc: "Симка в любом киоске без паспорта", tip: "Операторы A1, Yettel или mts. Для начала берите prepaid-пакет." },
      { id: "m1_translate", name: "Судебные переводы документов", cost: 200, currency: "EUR", desc: "Перевод диплома, свидетельств судебным переводчиком", tip: "Делается строго у сертифицированных судебных переводчиков (sudski tumač) в Сербии." },
      { id: "talent_nostrification", name: "Подача диплома на нострификацию онлайн", cost: 65, currency: "EUR", desc: "Пошлина в AZK (около 7500 RSD)", tip: "Подача через портал Агентства по квалификациям." },
      { id: "m1_insurance", name: "Обязательные медстраховки на 1 год (на троих)", cost: 250, currency: "EUR", desc: "Для подачи в полицию на ВНЖ", tip: "Локальный полис (Dunav, Globos, Triglav).", hasDate: true, expires: 12 },
      { id: "m1_vnz", name: "Пошлины МУП за ВНЖ «Талант» на троих", cost: 600, currency: "EUR", desc: "Сборы за подачу документов на Единое разрешение", tip: "Подача происходит онлайн через eUprava." },
      { id: "m1_living", name: "Еда, связь, базовый быт", cost: 600, currency: "EUR", desc: "Текущие расходы на первый месяц" },
      { id: "m1_pediatrician", name: "Осмотр ребенка у педиатра для садика", cost: 50, currency: "EUR", desc: "Получение справки" }
    ]
  },
  {
    month: 2,
    title: "Месяц 2: Постоянное жилье и детский сад",
    focus: "Поиск долгосрочной квартиры и устройство дочки в садик",
    tasks: [
      { id: "m2_rent", name: "Аренда квартиры (1-й месяц)", cost: 600, currency: "EUR", desc: "Двушка на долгий срок", tip: "Договор аренды (Ugovor o zakupu) нужен минимум на 1 год.", hasDate: true },
      { id: "m2_deposit", name: "Залог хозяину квартиры (100%)", cost: 600, currency: "EUR", desc: "Депозит" },
      { id: "m2_agency", name: "Комиссия риелтору (50% единоразово)", cost: 300, currency: "EUR", desc: "Оплата услуг агентства" },
      { id: "m2_utility", name: "Коммунальные услуги (Инфостан, свет, интернет)", cost: 150, currency: "EUR", desc: "Ежемесячные платежи по счетам" },
      { id: "m2_kindergarten", name: "Частный детский сад (1-й месяц)", cost: 400, currency: "EUR", desc: "Оплата за дочку", tip: "Для зачисления обязательно нужна синяя прививочная карта (форма 063/у)." },
      { id: "m2_living", name: "Еда, быт, семейные расходы", cost: 600, currency: "EUR", desc: "Текущие расходы на жизнь" }
    ]
  },
  {
    month: 3,
    title: "Месяц 3: Запуск ИП и смена статуса ВНЖ",
    focus: "Регистрация бизнеса и подготовка к первым доходам",
    tasks: [
      { id: "m3_rent", name: "Аренда квартиры + коммуналка", cost: 750, currency: "EUR", desc: "Арендная плата и счета" },
      { id: "m3_kindergarten", name: "Частный детский сад (2-й месяц)", cost: 400, currency: "EUR", desc: "Оплата сада" },
      { id: "m3_living", name: "Еда и базовые расходы", cost: 600, currency: "EUR", desc: "Расходы на жизнь" },
      { id: "preduzetnik", name: "Регистрация ИП в APR (Предузетник)", cost: 15, currency: "EUR", desc: "Оформление бизнеса в Агентстве APR", tip: "Потребуются выписки по счетам из РФ за 3–6 месяцев для комплаенса." },
      { id: "m3_office", name: "Виртуальный офис для ИП (на год вперед)", cost: 185, currency: "EUR", desc: "Адрес для регистрации бизнеса", tip: "Нужен, если хозяин арендуемой квартиры против регистрации ИП на его адрес." },
      { id: "bank", name: "Открытие личного и бизнес-счёта в банке", cost: 0, currency: "EUR", desc: "Счета в Alta, Поштанска или API банке", tip: "Потребуются налоговые декларации 2-НДФЛ/3-НДФЛ для подтверждения легальности доходов." },
      { id: "m3_lawyer", name: "Услуги юриста (помощь с комплаенсом в банке и МУП)", cost: 200, currency: "EUR", desc: "Прохождение банковских проверок и пошлина за смену ВНЖ" }
    ]
  },
  {
    month: 4,
    title: "Месяц 4: Жизнь на рельсах бизнеса",
    focus: "Полноценная работа, оплата первых налогов",
    tasks: [
      { id: "m4_rent", name: "Аренда квартиры + коммуналка", cost: 750, currency: "EUR", desc: "Арендная плата и счета" },
      { id: "m4_kindergarten", name: "Частный детский сад (3-й месяц)", cost: 400, currency: "EUR", desc: "Оплата сада" },
      { id: "m4_pausal", name: "Первые фиксированные налоги по ИП (Паушал)", cost: 350, currency: "EUR", desc: "Обязательный ежемесячный платеж в налоговую Сербии" },
      { id: "state_health_insurance", name: "Оформление государственной медстраховки (здравственная книжица)", cost: 0, currency: "EUR", desc: "Бесплатная медицина на всю семью через ИП", tip: "После оформления здравственной книжицы годовая коммерческая страховка больше не нужна." },
      { id: "m4_living", name: "Еда и быт", cost: 600, currency: "EUR", desc: "Стандартный ежемесячный бюджет семьи" }
    ]
  }
];

// === СИСТЕМА УПРАВЛЕНИЯ ОБНОВЛЕНИЯМИ PWA ===

// 1. Регистрация Service Worker с защитой от Race Condition
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {

      // Сценарий А: Новая версия уже скачана браузером в фоне и ждет активации
      if (reg.waiting && navigator.serviceWorker.controller) {
        showUpdateNotification(reg.waiting);
      }

      // Сценарий Б: Обновление обнаружилось и скачивается в процессе текущей сессии
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateNotification(installingWorker);
            }
          };
        }
      };
    }).catch(err => {
      console.error('Ошибка регистрации Service Worker:', err);
    });
  });
}

// Функция мягкого уведомления пользователя об обновлении
function showUpdateNotification(worker) {
  setTimeout(() => {
    const userAccepted = confirm('Доступна новая версия приложения с улучшениями! Обновить сейчас?');
    if (userAccepted) {
      if (worker) {
        worker.postMessage({ action: 'skipWaiting' });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
        setTimeout(() => window.location.reload(), 2000);
      } else {
        window.location.reload();
      }
    }
  }, 800);
}

// 2. Обработчик кнопки ручной проверки обновлений
const updateBtn = document.getElementById('btn-check-app-update');
if (updateBtn) {
  updateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    updateBtn.disabled = true;
    updateBtn.innerHTML = '🔍 Проверяю сервер...';

    try {
      const reg = await navigator.serviceWorker.ready;

      await reg.update();

      await new Promise(resolve => setTimeout(resolve, 800));

      if (!reg.installing && !reg.waiting) {
        updateBtn.innerHTML = '✨ У вас установлена актуальная версия!';
      } else {
        updateBtn.innerHTML = '🚀 Найдено обновление! Устанавливаю...';
      }
    } catch (err) {
      console.error('Ошибка при ручной проверке обновлений:', err);
      updateBtn.innerHTML = '❌ Ошибка проверки';
    } finally {
      setTimeout(() => {
        updateBtn.disabled = false;
        updateBtn.innerHTML = '🔄 Проверить обновления';
      }, 3000);
    }
  });
}

function scrollToChecklistItem(id) {
  const el = document.getElementById('plan-' + id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1500);
  }
  const tab = document.querySelector('[data-tab="plan"]');
  if (tab) tab.click();
}

function getPlanState() {
  try { return JSON.parse(localStorage.getItem('plan-state') || 'null'); } catch { return null; }
}

function setPlanState(state) {
  localStorage.setItem('plan-state', JSON.stringify(state));
}

function renderPlan() {
  const root = document.getElementById('timeline-root');
  if (!root) return;

  let state = getPlanState();
  if (!state) {
    const tasks = {};
    masterTimeline.forEach(m => m.tasks.forEach(t => { tasks[t.id] = { checked: false, customCost: null }; }));
    state = { tasks };
    setPlanState(state);
  }

  root.innerHTML = '';
  const h = document.createElement('h2');
  h.textContent = '📅 Пошаговый план переезда (5 месяцев)';
  root.appendChild(h);
  const desc = document.createElement('p');
  desc.className = 'tl-desc';
  desc.textContent = 'Отмечайте выполненные задачи (тумблером) — потраченные деньги зафиксируются. Нажмите ▶ для деталей, дат и заметок.';
  root.appendChild(desc);

  let grandPlanned = 0;
  let grandSpent = 0;
  let grandMonth4Planned = 0;
  let grandMonth4Spent = 0;

  masterTimeline.forEach(m => {
    const card = document.createElement('div');
    card.className = 'tl-card';
    const header = document.createElement('div');
    header.className = 'tl-header';
    header.innerHTML = `<span class="tl-month">${m.title}</span>`;
    card.appendChild(header);
    const focusEl = document.createElement('div');
    focusEl.className = 'tl-focus';
    focusEl.textContent = '🎯 ' + m.focus;
    card.appendChild(focusEl);

    let totalPlanned = 0;
    let spent = 0;

    m.tasks.forEach(t => {
      const s = state.tasks[t.id] || { checked: false, customCost: null };
      const cost = (s.customCost != null ? s.customCost : t.cost);
      totalPlanned += cost;
      if (s.checked === true) spent += cost;
    });

    const remaining = totalPlanned - spent;
    const pct = totalPlanned > 0 ? Math.round((spent / totalPlanned) * 100) : 0;

    const stats = document.createElement('div');
    stats.className = 'plan-month-stats';
    stats.innerHTML =
      `<div class="plan-stat-row"><span>📋 Всего запланировано:</span> <strong>${totalPlanned.toLocaleString('ru-RU')} €</strong></div>` +
      `<div class="plan-stat-row plan-stat-spent" style="color: #2e7d32;"><span>✅ Уже потрачено:</span> <strong>${spent.toLocaleString('ru-RU')} €</strong></div>` +
      `<div class="plan-stat-row plan-stat-remain" style="color: #1565c0;"><span>📅 Осталось потратить:</span> <strong>${remaining.toLocaleString('ru-RU')} €</strong></div>`;
    card.appendChild(stats);

    const barWrap = document.createElement('div');
    barWrap.className = 'plan-progress-bar';
    const barFill = document.createElement('div');
    barFill.className = 'plan-progress-fill';
    barFill.style.width = pct + '%';
    if (pct === 100) barFill.classList.add('done');
    barWrap.appendChild(barFill);
    const barLabel = document.createElement('span');
    barLabel.className = 'plan-progress-label';
    barLabel.textContent = pct + '%';
    barWrap.appendChild(barLabel);
    card.appendChild(barWrap);

    const ul = document.createElement('ul');
    ul.className = 'tl-steps';

    m.tasks.forEach(t => {
      const s = state.tasks[t.id] || { checked: false, customCost: null };
      const checked = s.checked === true;
      const cost = (s.customCost != null ? s.customCost : t.cost);

      const li = document.createElement('li');
      li.className = 'tl-step' + (checked ? ' done' : ' plan-pending');
      li.id = 'plan-' + t.id;

      const label = document.createElement('label');
      label.className = 'plan-toggle';

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'plan-task-cb';
      cb.checked = checked;
      cb.dataset.planId = t.id;
      label.appendChild(cb);

      const slider = document.createElement('span');
      slider.className = 'plan-toggle-slider';
      label.appendChild(slider);

      li.appendChild(label);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'plan-task-name';
      nameSpan.textContent = t.name;
      li.appendChild(nameSpan);

      const costSpan = document.createElement('span');
      costSpan.className = 'plan-task-cost';
      costSpan.textContent = cost > 0 ? cost.toLocaleString('ru-RU') + ' €' : 'Бесплатно';
      li.appendChild(costSpan);

      if (t.desc) {
        const descSpan = document.createElement('span');
        descSpan.className = 'plan-task-desc';
        descSpan.textContent = t.desc;
        li.appendChild(descSpan);
      }

      const hasTip = !!t.tip;
      const hasDate = !!t.hasDate;
      if (hasTip || hasDate) {
        const tipBtn = document.createElement('button');
        tipBtn.className = 'plan-tip-toggle';
        tipBtn.textContent = '▶';
        tipBtn.dataset.planTip = t.id;
        li.appendChild(tipBtn);

        const tipBody = document.createElement('div');
        tipBody.className = 'plan-tip-body hidden';
        tipBody.dataset.planTipBody = t.id;

        if (hasTip) {
          const tipText = document.createElement('div');
          tipText.className = 'plan-tip-text';
          tipText.textContent = '💡 ' + t.tip;
          tipBody.appendChild(tipText);
        }

        if (hasDate) {
          const dateVal = s.date || '';
          const expiresMonths = t.expires || 0;

          const dateRow = document.createElement('div');
          dateRow.className = 'plan-date-row';

          const dateLabel = document.createElement('span');
          dateLabel.className = 'plan-date-label';
          dateLabel.textContent = '📅 Сделано:';
          dateRow.appendChild(dateLabel);

          const dateCompact = document.createElement('span');
          dateCompact.className = 'plan-date-compact';
          dateCompact.id = 'plan-dc-' + t.id;
          dateCompact.textContent = dateVal || 'не указана';
          dateRow.appendChild(dateCompact);

          const dateInputs = document.createElement('span');
          dateInputs.className = 'plan-date-inputs hidden';
          dateInputs.id = 'plan-di-' + t.id;

          const parts = dateVal ? dateVal.split('.') : [];
          const dInp = document.createElement('input');
          dInp.className = 'plan-date-d';
          dInp.placeholder = 'ДД';
          dInp.value = parts[0] || '';
          dInp.maxLength = 2;
          dateInputs.appendChild(dInp);
          dateInputs.appendChild(document.createTextNode('.'));

          const mInp = document.createElement('input');
          mInp.className = 'plan-date-m';
          mInp.placeholder = 'ММ';
          mInp.value = parts[1] || '';
          mInp.maxLength = 2;
          dateInputs.appendChild(mInp);
          dateInputs.appendChild(document.createTextNode('.'));

          const yInp = document.createElement('input');
          yInp.className = 'plan-date-y';
          yInp.placeholder = 'ГГГГ';
          yInp.value = parts[2] || '';
          yInp.maxLength = 4;
          dateInputs.appendChild(yInp);

          const saveDateBtn = document.createElement('button');
          saveDateBtn.className = 'plan-date-save';
          saveDateBtn.textContent = '💾';
          saveDateBtn.dataset.planDateSave = t.id;
          dateInputs.appendChild(saveDateBtn);

          dateRow.appendChild(dateInputs);

          const editDateBtn = document.createElement('button');
          editDateBtn.className = 'plan-date-edit';
          editDateBtn.textContent = '✏️';
          editDateBtn.dataset.planDateEdit = t.id;
          dateRow.appendChild(editDateBtn);

          if (dateVal && expiresMonths > 0) {
            const dp = dateVal.split('.');
            if (dp.length === 3) {
              const doneDate = new Date(+dp[2], +dp[1] - 1, +dp[0]);
              const expDate = new Date(doneDate);
              expDate.setMonth(expDate.getMonth() + expiresMonths);
              const now = new Date();
              const daysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));

              const rem = document.createElement('span');
              rem.className = 'plan-date-remaining';
              if (daysLeft < 0) { rem.classList.add('expired'); rem.textContent = '⚠️ Просрочено на ' + Math.abs(daysLeft) + ' дн.'; }
              else if (daysLeft <= 30) { rem.classList.add('warn'); rem.textContent = '⚠️ Осталось ' + daysLeft + ' дн.'; }
              else { rem.classList.add('ok'); rem.textContent = '✅ Ещё ' + daysLeft + ' дн.'; }
              dateRow.appendChild(rem);
            }
          }

          tipBody.appendChild(dateRow);
        }

        const noteVal = s.note || '';
        const noteSection = document.createElement('div');
        noteSection.className = 'plan-note-section';

        const noteDisplay = document.createElement('div');
        noteDisplay.style.display = noteVal ? 'block' : 'none';

        if (noteVal) {
          const noteText = document.createElement('span');
          noteText.className = 'plan-note-text';
          noteText.textContent = '📝 ' + noteVal;
          noteDisplay.appendChild(noteText);
        }

        const noteEditBtn = document.createElement('button');
        noteEditBtn.className = 'plan-note-edit';
        noteEditBtn.textContent = noteVal ? '✏️' : '➕ Заметка';
        noteEditBtn.dataset.planNoteEdit = t.id;
        noteDisplay.appendChild(noteEditBtn);
        noteSection.appendChild(noteDisplay);

        const noteEditBlock = document.createElement('div');
        noteEditBlock.className = 'plan-note-edit-block hidden';
        noteEditBlock.id = 'plan-ne-' + t.id;

        const noteTa = document.createElement('textarea');
        noteTa.className = 'plan-note-ta';
        noteTa.rows = 2;
        noteTa.value = noteVal;
        noteEditBlock.appendChild(noteTa);

        const noteSaveBtn = document.createElement('button');
        noteSaveBtn.className = 'plan-note-save';
        noteSaveBtn.textContent = '💾';
        noteSaveBtn.dataset.planNoteSave = t.id;
        noteEditBlock.appendChild(noteSaveBtn);

        if (noteVal) {
          const noteDelBtn = document.createElement('button');
          noteDelBtn.className = 'plan-note-delete';
          noteDelBtn.textContent = '🗑️';
          noteDelBtn.dataset.planNoteDelete = t.id;
          noteEditBlock.appendChild(noteDelBtn);
        }

        noteSection.appendChild(noteEditBlock);
        tipBody.appendChild(noteSection);

        li.appendChild(tipBody);
      }

      ul.appendChild(li);
    });

    card.appendChild(ul);
    root.appendChild(card);

    if (m.month >= 0 && m.month <= 3) {
      grandPlanned += totalPlanned;
      grandSpent += spent;
    }
    if (m.month === 4) {
      grandMonth4Planned += totalPlanned;
      grandMonth4Spent += spent;
    }
  });

  const grandRemaining = grandPlanned - grandSpent;
  const summary = document.createElement('div');
  summary.className = 'tl-summary';
  summary.innerHTML =
    `<div class="tl-summary-row" style="font-size:1.2em">💰 Финансовый итог для старта (Месяцы 0–3): <strong>${grandPlanned.toLocaleString('ru-RU')} €</strong></div>` +
    `<div class="tl-summary-row" style="font-size:1em;margin-top:6px;color:#81c784">✅ Фактически потрачено: <strong>${grandSpent.toLocaleString('ru-RU')} €</strong></div>` +
    `<div class="tl-summary-row" style="font-size:1.05em;margin-top:4px;font-weight:bold;color:#64b5f6">📅 Осталось потратить до запуска ИП: <strong>${grandRemaining.toLocaleString('ru-RU')} €</strong> из ${grandPlanned.toLocaleString('ru-RU')} €</div>` +
    `<div class="tl-summary-row" style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.2)">🔄 Ежемесячный бюджет на рельсах (Месяц 4): <strong>${grandMonth4Planned.toLocaleString('ru-RU')} €</strong>` +
    (grandMonth4Spent > 0 ? ` <span style="font-size:0.85em;color:#81c784">(потрачено ${grandMonth4Spent.toLocaleString('ru-RU')} €)</span>` : '') +
    `</div>`;
  root.appendChild(summary);
}

if (!window.planListenerAdded) {
  document.getElementById('timeline-root')?.addEventListener('change', e => {
    const cb = e.target;
    if (!cb.classList.contains('plan-task-cb')) return;
    const id = cb.dataset.planId;
    if (!id) return;
    const st = getPlanState() || { tasks: {} };
    if (!st.tasks[id]) st.tasks[id] = { checked: false, customCost: null };
    st.tasks[id].checked = cb.checked;
    setPlanState(st);
    renderPlan();
    if (window.saveToCloud) {
      window.saveToCloud().catch(err => console.error('Фоновое сохранение не удалось:', err));
    }
  });

  document.getElementById('timeline-root')?.addEventListener('click', e => {
    const el = e.target;

    // Tip toggle
    if (el.classList.contains('plan-tip-toggle')) {
      const id = el.dataset.planTip;
      if (!id) return;
      const body = document.querySelector('[data-plan-tip-body="' + id + '"]');
      if (body) {
        const isHidden = body.classList.contains('hidden');
        body.classList.toggle('hidden');
        el.classList.toggle('open', isHidden);
        el.textContent = isHidden ? '▼' : '▶';
      }
      return;
    }

    // Date edit
    if (el.classList.contains('plan-date-edit')) {
      const id = el.dataset.planDateEdit;
      if (!id) return;
      const compact = document.getElementById('plan-dc-' + id);
      const inputs = document.getElementById('plan-di-' + id);
      if (compact) compact.classList.add('hidden');
      if (inputs) inputs.classList.remove('hidden');
      el.classList.add('hidden');
      return;
    }

    // Date save
    if (el.classList.contains('plan-date-save')) {
      const id = el.dataset.planDateSave;
      if (!id) return;
      const inputs = document.getElementById('plan-di-' + id);
      if (!inputs) return;
      const dEl = inputs.querySelector('.plan-date-d');
      const mEl = inputs.querySelector('.plan-date-m');
      const yEl = inputs.querySelector('.plan-date-y');
      const dd = dEl ? dEl.value.trim().padStart(2, '0') : '';
      const mm = mEl ? mEl.value.trim().padStart(2, '0') : '';
      const yy = yEl ? yEl.value.trim() : '';
      if (dd && mm && yy && dd.length === 2 && mm.length === 2 && yy.length === 4) {
        const st = getPlanState() || { tasks: {} };
        if (!st.tasks[id]) st.tasks[id] = { checked: false, customCost: null };
        st.tasks[id].date = dd + '.' + mm + '.' + yy;
        setPlanState(st);
      }
      renderPlan();
      return;
    }

    // Note edit
    if (el.classList.contains('plan-note-edit')) {
      const id = el.dataset.planNoteEdit;
      if (!id) return;
      const block = document.getElementById('plan-ne-' + id);
      if (block) block.classList.remove('hidden');
      const ta = block ? block.querySelector('.plan-note-ta') : null;
      if (ta) { ta.focus(); ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
      return;
    }

    // Note save
    if (el.classList.contains('plan-note-save')) {
      const id = el.dataset.planNoteSave;
      if (!id) return;
      const block = document.getElementById('plan-ne-' + id);
      const ta = block ? block.querySelector('.plan-note-ta') : null;
      const val = ta ? ta.value.trim() : '';
      const st = getPlanState() || { tasks: {} };
      if (!st.tasks[id]) st.tasks[id] = { checked: false, customCost: null };
      st.tasks[id].note = val || undefined;
      setPlanState(st);
      renderPlan();
      return;
    }

    // Note delete
    if (el.classList.contains('plan-note-delete')) {
      const id = el.dataset.planNoteDelete;
      if (!id) return;
      const st = getPlanState() || { tasks: {} };
      if (!st.tasks[id]) st.tasks[id] = { checked: false, customCost: null };
      delete st.tasks[id].note;
      setPlanState(st);
      renderPlan();
      return;
    }
  });

  window.planListenerAdded = true;
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

  const code = localStorage.getItem('sync-code');
  localStorage.clear();
  if (code) localStorage.setItem('sync-code', code);

  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('relocation-v')).map(k => caches.delete(k)));
  } catch (e) {}
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  if (window.migrateLegacyData) window.migrateLegacyData();
  renderPlan();
  updateSyncStatusUI();
  const versionEl = document.getElementById('app-version-display');
  if (versionEl && window.APP_CONFIG) {
    versionEl.textContent = `v${window.APP_CONFIG.VERSION} (${window.APP_CONFIG.BUILD})`;
  }

  document.getElementById('btn-upload')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-upload');
    btn.disabled = true;
    btn.innerHTML = '⏳ Выгружаю...';
    try {
      await window.saveToCloud();
      btn.innerHTML = '✅ Выгружено';
    } catch (e) {
      btn.innerHTML = '❌ ' + (e.message || 'Ошибка');
    }
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '📤 Выгрузить в облако';
    }, 2500);
  });

  document.getElementById('btn-download')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-download');
    btn.disabled = true;
    btn.innerHTML = '⏳ Загружаю...';
    try {
      await window.loadFromCloud();
      btn.innerHTML = '✅ Загружено';
    } catch (e) {
      btn.innerHTML = '❌ ' + (e.message || 'Ошибка');
    }
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '📥 Загрузить из облака';
    }, 2500);
  });

  document.getElementById('btn-change-code')?.addEventListener('click', () => {
    window.changeSyncCode();
  });

  document.getElementById('btn-delete-cloud')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-delete-cloud');
    if (!confirm('Это физически удалит все данные из облака по вашему коду. Данные на этом устройстве останутся нетронутыми. Продолжить?')) return;
    btn.disabled = true;
    btn.innerHTML = '⏳ Удаляю...';
    try {
      await window.deleteCloudData();
      btn.innerHTML = '✅ Данные удалены из облака';
    } catch (e) {
      btn.innerHTML = '❌ ' + (e.message || 'Ошибка');
    }
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '🗑️ Удалить данные из облака';
    }, 3000);
  });

  document.getElementById('btn-new-code')?.addEventListener('click', () => {
    if (confirm('Сгенерировать новый код синхронизации? Старый код перестанет быть доступен на этом устройстве.')) {
      window.generateNewSyncCode();
    }
  });

  const resetBtn = document.getElementById('btn-hard-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm("Это сбросит все локальные данные: чек-лист, план переезда, настройки. Сам код синхронизации сохранится. Продолжить?")) {
        try {
          await window.factoryReset();
        } catch (err) {
          console.error("Ошибка при сбросе:", err);
        }
      }
    });
  }
});
document.querySelector('[data-tab="plan"]')?.addEventListener('click', () => {
  setTimeout(renderPlan, 50);
});

// Sync: обновление после загрузки из облака
window.addEventListener('sync-loaded', () => {
  renderPlan();
});


