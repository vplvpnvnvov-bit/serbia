window.APP_CONFIG = {
  VERSION: "1.3.0",
  BUILD: "660fd0c",
  CACHE_NAME: "relocation-v1.3.0-660fd0c"
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
    textDiv.textContent = '📝 ' + val;
    ns.classList.remove('hidden');
  } else {
    textDiv.textContent = '';
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

// === CHECKLIST ===
const CHECKLIST = [
  { cat: "📄 Выезд из РФ", items: [
    { id:"p10", text:"Загранпаспорт мужа (10 лет)", price:"5000", hasDate:true, expires:120, tip:"Оформить через Госуслуги." },
    { id:"p5w", text:"Загранпаспорт жены (10 лет)", price:"5000", hasDate:true, expires:120, tip:"Оформить через Госуслуги." },
    { id:"p5d", text:"Загранпаспорт ребёнка (5 лет, старый образец)", price:"3000", hasDate:true, expires:60, tip:"Оформить через Госуслуги после проставления штампа о гражданстве." },
    { id:"stamp", text:"Штамп о гражданстве РФ на свидетельство о рождении ребёнка", price:"", tip:"Обратиться в МВД по месту жительства. Ставят в день обращения." },
    { id:"nocrim_h", text:"Справка о несудимости (муж) — электронная с ЭЦП или бумажная", price:"", hasDate:true, expires:6, tip:"Заказать на Госуслугах электронную версию с ЭЦП ведомства." },
    { id:"nocrim_w", text:"Справка о несудимости (жена) — электронная с ЭЦП или бумажная", price:"", hasDate:true, expires:6, tip:"Заказать на Госуслугах электронную версию с ЭЦП ведомства." },
    { id:"nocrim_apost_h", text:"Апостиль на справку о несудимости (муж)", price:"2500", hasDate:true, expires:6, tip:"Требуется только для бумажной версии справки." },
    { id:"nocrim_apost_w", text:"Апостиль на справку о несудимости (жена)", price:"2500", hasDate:true, expires:6, tip:"Требуется только для бумажной версии справки." },
    { id:"child_consent", text:"Нотариальное согласие на выезд ребёнка (если едет один родитель)", price:"2000", tip:"Сделать у нотариуса в РФ, если едете не всей семьей." },
  ]},
  { cat: "📄 Апостили и легализация", items: [
    { id:"apost_marr", text:"Апостиль на свидетельство о браке (оригинал)", price:"2500", tip:"Потребуется для ВНЖ супруги по воссоединению семьи." },
    { id:"apost_birth", text:"Апостиль на свидетельство о рождении ребёнка", price:"2500", tip:"Потребуется для ВНЖ ребенка и записи в школу/сад." },
    { id:"translation_copies", text:"Переводы личных документов на сербский язык", price:"", tip:"Делает только судебный переводчик (sudski tumač) в Сербии." },
  ]},
  { cat: "📚 Образование и нострификация", items: [
    { id:"diploma", text:"Оригинал диплома об образовании (с вкладышем оценок)", price:"", tip:"Апостиль на диплом в РФ для Сербии НЕ НУЖЕН." },
    { id:"diploma_eng", text:"Перевод диплома у сербского судебного переводчика", price:"", tip:"Перевод диплома и приложения на сербский язык." },
    { id:"talent_nostrification", text:"Подача на нострификацию диплома онлайн", price:"7500 RSD", tip:"Подача через портал Агентства по квалификациям (AZK) Сербии." },
  ]},
  { cat: "📄 Документы в Сербии", items: [
    { id:"reg", text:"Регистрация пребывания (белый картон / Beli karton)", price:"", tip:"Оформить в полиции или через eTurista в течение 24 часов после въезда." },
    { id:"pediatrician_check", text:"Осмотр ребенка у сербского педиатра", price:"около 50 €", tip:"Получение справки для зачисления в частный или государственный детский сад." },
    { id:"vnd", text:"Единое разрешение (ВНЖ + разрешение на работу)", price:"18000 RSD", tip:"Онлайн-подача через eUprava по основанию «Талант» или «ИП»." },
    { id:"preduzetnik", text:"Регистрация ИП в Сербии (Предузетник)", price:"1500 RSD", tip:"Оформление через Агентство APR." },
    { id:"virtual_office", text:"Аренда виртуального офиса (юридического адреса) для ИП", price:"от 15 €/мес", tip:"Необходимо, если хозяин квартиры против регистрации ИП на его адрес." },
  ]},
  { cat: "🏦 Финансы и налоги", items: [
    { id:"bank", text:"Открытие личного и бизнес-счёта в сербском банке", price:"", tip:"Открытие счетов в Alta Bank, Poštanska Štedionica или API Bank." },
    { id:"tax_decl", text:"Налоговые декларации из РФ (3-НДФЛ / 2-НДФЛ)", price:"", tip:"Для подтверждения легальности доходов при комплаенсе в банке." },
    { id:"bank_stat", text:"Выписки по банковским счетам из РФ за 3–6 месяцев", price:"", tip:"Выписки на английском языке из мобильных приложений банков РФ." },
    { id:"power", text:"Генеральная доверенность на близкого человека в РФ", price:"2000", hasDate:true, expires:120, tip:"Оформить у нотариуса в РФ до отъезда на срок от 5 до 10 лет." },
    { id:"pay_first_taxes", text:"Уплата первых фиксированных налогов по ИП (Паушал)", price:"около 350 €", tip:"Ежемесячный обязательный платеж в налоговую Сербии." },
  ]},
  { cat: "🏠 Жильё", items: [
    { id:"rent", text:"Договор аренды жилья (Ugovor o zakupu)", price:"от 500 €/мес", hasDate:true, tip:"Письменный договор аренды с собственником квартиры минимум на 1 год." },
  ]},
  { cat: "❤️ Здоровье и медицина", items: [
    { id:"insure", text:"Коммерческая медицинская страховка для ВНЖ", price:"100-200 €", hasDate:true, expires:12, tip:"Локальный полис (Dunav, Globos, Triglav) под подачу на ВНЖ." },
    { id:"vaccine", text:"Карта профилактических прививок ребёнка (форма 063/у)", price:"", tip:"Оригинал карты прививок (особенно корь/MMR) для зачисления в сад." },
    { id:"med_cards", text:"Медицинские выписки при хронических заболеваниях", price:"", tip:"Выписки с латинскими названиями действующих веществ (МНН)." },
    { id:"dentist", text:"Пройти стоматологов всей семьёй в РФ", price:"", tip:"Рекомендуется вылечить зубы в РФ до переезда." },
    { id:"pharm", text:"Собрать аптечку с привычными лекарствами", price:"", tip:"Запас специфических рецептурных препаратов на первые 3-6 месяцев." },
    { id:"state_health_insurance", text:"Оформление государственной медстраховки (здравственная книжица)", price:"", tip:"Оформляется на всю семью через ваше работающее ИП бесплатно." },
  ]},
  { cat: "🚗 Транспорт / Автомобиль", items: [
    { id:"license", text:"Перевод водительских прав на сербский язык", price:"", tip:"Сделать у судебного переводчика для законного вождения после первых 6 месяцев." },
    { id:"car_power", text:"Нотариальная доверенность на выезд за границу на авто", price:"", tip:"Если машина оформлена не на вас." },
    { id:"kbm", text:"Справка из страховой о безаварийном стаже (КБМ) на английском", price:"", tip:"Для получения скидки на автострахование в Сербии." },
    { id:"car_docs", text:"СТС и ПТС (оригиналы на машину)", price:"", hasDate:true, tip:"Оригиналы документов для прохождения границ." },
  ]},
  { cat: "📱 Прочее", items: [
    { id:"sim", text:"Сим-карта сербского оператора (A1 / Yettel / mts)", price:"1000 RSD", tip:"Купить prepaid-симкарту в любом киоске без паспорта." },
    { id:"kindergarten_enroll", text:"Зачисление ребенка в частный детский сад", price:"около 400 €/мес", tip:"Подача документов и справки от педиатра в выбранный сад." },
  ]},
];

function getValidChecklistIds() {
  const ids = new Set();
  CHECKLIST.forEach(group => group.items.forEach(item => ids.add(item.id)));
  return ids;
}

function migrateChecklist(saved) {
  const valid = getValidChecklistIds();
  const clean = {};
  Object.keys(saved).forEach(id => {
    if (valid.has(id)) clean[id] = saved[id];
  });
  return clean;
}

window.getValidChecklistIds = getValidChecklistIds;
window.migrateChecklist = migrateChecklist;

const TIMELINE_PLAN = {
  section: "relocation_4_months_plan",
  title: "📅 Пошаговый план (4 месяца)",
  description: "План переезда в Белград для семьи из 3 человек: ВНЖ «Талант» ➔ ИП.",
  timeline: [
    {
      id: "m0",
      title: "Месяц 0: Подготовка в РФ",
      focus: "Сбор документов, которые невозможно получить удаленно",
      steps: [
        { text: "Заказать справку об отсутствии судимости (Госуслуги).", linked_ids: ["nocrim_h","nocrim_w"] },
        { text: "Поставить апостили на справки о несудимости (бумажные версии).", linked_ids: ["nocrim_apost_h","nocrim_apost_w"] },
        { text: "Поставить апостиль на свидетельство о браке.", linked_ids: ["apost_marr"] },
        { text: "Поставить апостиль на свидетельство о рождении ребенка.", linked_ids: ["apost_birth"] },
        { text: "Оформить или обновить загранпаспорта семьи.", linked_ids: ["p10","p5w","p5d"] },
        { text: "Проставить штамп о гражданстве на св-во о рождении ребенка.", linked_ids: ["stamp"] },
        { text: "Оформить нотариальное согласие на выезд ребенка (если едет один родитель).", linked_ids: ["child_consent"] },
        { text: "Взять в поликлинике карту прививок ребенка.", linked_ids: ["vaccine"] },
        { text: "Сделать генеральную доверенность на близкого человека в РФ.", linked_ids: ["power"] },
        { text: "Пройти стоматологов всей семьей, собрать аптечку.", linked_ids: ["dentist","pharm"] },
        { text: "Подготовить оригиналы диплома + вкладыш.", linked_ids: ["diploma"] },
        { text: "Выгрузить налоговые декларации и банковские выписки.", linked_ids: ["tax_decl","bank_stat"] },
        { text: "Взять медвыписки (если есть хроника).", linked_ids: ["med_cards"] },
        { text: "Оформить доверенность на выезд авто и КБМ справку.", linked_ids: ["car_power","kbm"] },
        { text: "Подготовить СТС/ПТС на машину.", linked_ids: ["car_docs"] },
      ],
      cost_eur: "80 €",
    },
    {
      id: "m1",
      title: "Месяц 1: Прилет и ВНЖ «Талант»",
      focus: "Перелет, адаптация, запуск нострификации, подача на ВНЖ",
      steps: [
        { text: "Перелет в Белград, заселение, регистрация (белый картон).", linked_ids: ["reg"] },
        { text: "Перевод документов у сербского судебного переводчика.", linked_ids: ["translation_copies","diploma_eng"] },
        { text: "Подача на нострификацию диплома онлайн (AZK).", linked_ids: ["talent_nostrification"] },
        { text: "Покупка медстраховок на семью для ВНЖ.", linked_ids: ["insure"] },
        { text: "Осмотр ребенка у педиатра для справки в сад.", linked_ids: ["pediatrician_check"] },
        { text: "Онлайн-подача на Единое разрешение (Талант + воссоединение).", linked_ids: ["vnd"] },
        { text: "Купить сербские сим-карты.", linked_ids: ["sim"] },
        { text: "Открыть личный банковский счет.", linked_ids: ["bank"] },
      ],
      cost_eur: "3435 €",
    },
    {
      id: "m2",
      title: "Месяц 2: Жилье и сад",
      focus: "Поиск квартиры и устройство ребенка",
      steps: [
        { text: "Найти квартиру, заключить договор аренды на год, подтвердить регистрацию.", linked_ids: ["rent"] },
        { text: "Зачислить ребенка в частный детский сад.", linked_ids: ["kindergarten_enroll"] },
      ],
      cost_eur: "2650 €",
    },
    {
      id: "m3",
      title: "Месяц 3: ИП и смена статуса",
      focus: "Регистрация Предузетника и переход на новое основание",
      steps: [
        { text: "Зарегистрировать ИП в APR (Предузетник).", linked_ids: ["preduzetnik"] },
        { text: "Арендовать виртуальный офис для ИП.", linked_ids: ["virtual_office"] },
        { text: "Открыть бизнес-счет в банке (комплаенс).", linked_ids: ["bank"] },
        { text: "Подать онлайн-заявление на смену основания ВНЖ (Талант → ИП).", linked_ids: ["vnd"] },
      ],
      cost_eur: "2200 €",
    },
    {
      id: "m4",
      title: "Месяц 4: Первые налоги и госстраховка",
      focus: "Регулярная работа ИП, налоги, оформление гос. медицины",
      steps: [
        { text: "Уплатить первые фиксированные налоги ИП (Паушал).", linked_ids: ["pay_first_taxes"] },
        { text: "Оформить государственную медстраховку (здравственная книжица) на семью.", linked_ids: ["state_health_insurance"] },
      ],
      cost_eur: "2100 €",
    },
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
        const esc = s => s.replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'})[c] || c);
        const dd = st.date ? esc(st.date.split('.')[0] || '') : '';
        const dm = st.date ? esc(st.date.split('.')[1] || '') : '';
        const dy = st.date ? esc(st.date.split('.')[2] || '') : '';
        inputGroup.innerHTML = `<input type="text" class="cl-date-d" placeholder="ДД" maxlength="2" inputmode="numeric" value="${dd}">.<input type="text" class="cl-date-m" placeholder="ММ" maxlength="2" inputmode="numeric" value="${dm}">.<input type="text" class="cl-date-y" placeholder="ГГ" maxlength="2" inputmode="numeric" value="${dy}">`;
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
              renderTimeline();
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
          renderTimeline();
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
        renderTimeline();
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
      nsText.textContent = st.note ? '📝 ' + st.note : '';
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
          (tip.dataset.link ? `<a href="${safeUrl(tip.dataset.link)}" target="_blank" class="cl-tip-link">🔗 Открыть ссылку</a>` : '');
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
const updateBtn = document.getElementById('btn-check-app-update');
if (updateBtn) {
  updateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    updateBtn.disabled = true;
    const originalText = updateBtn.innerHTML;
    updateBtn.innerHTML = '⏳ Проверяю наличие новой версии...';
    updateBtn.style.opacity = '0.7';

    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.update();
        setTimeout(() => {
          updateBtn.innerHTML = '✨ У вас установлена актуальная версия!';
          updateBtn.style.background = '#28a745';
          updateBtn.style.color = 'white';
          updateBtn.style.opacity = '1';
          setTimeout(() => {
            updateBtn.disabled = false;
            updateBtn.innerHTML = originalText;
            updateBtn.style.background = '';
            updateBtn.style.color = '';
          }, 2000);
        }, 1200);
      } catch (err) {
        console.error('Ошибка при проверке обновлений:', err);
        updateBtn.innerHTML = '❌ Ошибка проверки';
        updateBtn.disabled = false;
        setTimeout(() => { updateBtn.innerHTML = originalText; }, 2000);
      }
    } else {
      updateBtn.innerHTML = '✕ Не поддерживается браузером';
      setTimeout(() => { updateBtn.innerHTML = originalText; updateBtn.disabled = false; }, 2000);
    }
  });
}

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
function getLinkedProgress(ids) {
  const saved = JSON.parse(localStorage.getItem('checklist') || '{}');
  let done = 0;
  ids.forEach(id => {
    if (getItem(saved, id).done) done++;
  });
  return { done, total: ids.length, percent: ids.length ? Math.round(done / ids.length * 100) : 0 };
}

function scrollToChecklistItem(id) {
  const el = document.getElementById('cl-' + id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 1500);
  }
  const tab = document.querySelector('[data-tab="checklist"]');
  if (tab) tab.click();
}

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

    const stepsTitle = document.createElement('div');
    stepsTitle.className = 'tl-subtitle';
    stepsTitle.textContent = '📋 Шаги';
    card.appendChild(stepsTitle);
    const ul = document.createElement('ul');
    ul.className = 'tl-steps';
    m.steps.forEach(s => {
      const prog = getLinkedProgress(s.linked_ids);
      const li = document.createElement('li');
      li.className = 'tl-step' + (prog.percent === 100 ? ' done' : '');
      const barWrap = document.createElement('span');
      barWrap.className = 'tl-bar-wrap';
      const bar = document.createElement('span');
      bar.className = 'tl-bar-fill';
      bar.style.width = prog.percent + '%';
      barWrap.appendChild(bar);
      if (prog.total > 1) {
        const count = document.createElement('span');
        count.className = 'tl-bar-count';
        count.textContent = prog.done + '/' + prog.total;
        barWrap.appendChild(count);
      }
      li.appendChild(barWrap);
      const link = document.createElement('a');
      link.className = 'tl-step-link';
      link.textContent = s.text;
      link.href = '#';
      link.addEventListener('click', e => {
        e.preventDefault();
        if (s.linked_ids.length === 1) {
          scrollToChecklistItem(s.linked_ids[0]);
        }
      });
      li.appendChild(link);
      ul.appendChild(li);
    });
    card.appendChild(ul);

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

// === HARD RESET (GDPR) ===
function showResetOverlay() {
  const root = document.getElementById('app');
  if (root) root.style.opacity = '0.3';
  const status = document.createElement('div');
  status.textContent = '🗑️ Удаляю данные...';
  status.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:20px;background:#fff;padding:20px 30px;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.3);z-index:9999;';
  document.body.appendChild(status);
}

window.localHardResetWithoutCloud = async function() {
  showResetOverlay();
  localStorage.clear();
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('relocation-v')).map(k => caches.delete(k)));
  } catch (e) {}
  location.reload();
};

window.hardResetApplication = async function() {
  showResetOverlay();
  await window.deleteCloudData();
  localStorage.clear();
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('relocation-v')).map(k => caches.delete(k)));
  } catch (e) {}
  location.reload();
};

document.addEventListener('DOMContentLoaded', () => {
  renderTimeline();
  updateSyncStatusUI();
  const versionEl = document.getElementById('app-version-display');
  if (versionEl && window.APP_CONFIG) {
    versionEl.textContent = `v${window.APP_CONFIG.VERSION} (${window.APP_CONFIG.BUILD})`;
  }

  document.getElementById('btn-sync-now')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync-now');
    btn.disabled = true;
    btn.textContent = '⏳ Синхронизирую...';
    try {
      await loadFromCloud();
    } catch (e) {
      // ошибка уже обработана в loadFromCloud
    }
    btn.textContent = '🔄 Синхронизировать сейчас';
    btn.disabled = false;
  });

  document.getElementById('btn-change-code')?.addEventListener('click', () => {
    window.changeSyncCode();
  });

  const resetBtn = document.getElementById('btn-hard-reset');
  if (resetBtn) {
    resetBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (confirm("Внимание! Это действие навсегда удалит ваши данные из облака и этого устройства. Восстановить их будет невозможно. Продолжить?")) {
        try {
          await window.hardResetApplication();
        } catch (err) {
          console.error("Ошибка при сбросе данных:", err);
          alert("Произошла ошибка при удалении данных. Попробуйте еще раз.");
        }
      }
    });
  }
});
document.querySelector('[data-tab="timeline"]')?.addEventListener('click', () => {
  setTimeout(renderTimeline, 50);
});

// Sync: обновление после загрузки из облака
window.addEventListener('sync-loaded', () => {
  renderChecklist();
  calcTotal();
  updateLockUI();
  renderTimeline();
});

// === AUTO PWA UPDATE DETECTION ===
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.onupdatefound = () => {
        const installingWorker = reg.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('Новая версия успешно скачана в кэш.');
                alert('Успешно скачана новая версия приложения! Страница будет перезагружена для обновления кода.');
                window.location.reload();
              }
            }
          };
        }
      };
    });
  });
}
