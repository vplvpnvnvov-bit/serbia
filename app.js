window.APP_CONFIG = {
  VERSION: "1.28.0",
  BUILD: "a894bbc",
  CACHE_NAME: "relocation-v1.28.0-a894bbc"
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

function formatPrice(value, currency) {
  if (!value) return '0 ' + currency;
  return value.toLocaleString('ru-RU') + ' ' + currency;
}

let _debounceTimer = null;
function debouncedSave() {
  if (!window.saveToCloud) return;
  clearTimeout(_debounceTimer);
  _debounceTimer = setTimeout(() => {
    window.saveToCloud().catch(err => console.error('Фоновое сохранение не удалось:', err));
  }, 1500);
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
      { id: "p10", name: "Загранпаспорт мужа (10 лет)", cost: 6000, currency: "RUB", desc: "Оформить через Госуслуги или МФЦ", tip: "<p><b>Где делать:</b> Подать заявление на <a href='https://www.gosuslugi.ru/newsearch/gosposhlina-za-zagranpasport' target='_blank' rel='noopener'>Госуслугах РФ</a> или в любом МФЦ. Биометрический паспорт нового образца на 10 лет.</p><p><b>Документы:</b> Внутренний паспорт РФ, старое загранпаспортное удостоверение (если есть), фото на месте в МФЦ.</p><p><b>Срок:</b> 1 месяц (по месту регистрации), до 3 месяцев (не по месту регистрации).</p><p><b>Пошлина:</b> 6 000 руб (актуально на 2026 год для граждан от 14 лет).</p>", hasDate: true, expires: 120 },
      { id: "p5w", name: "Загранпаспорт жены (10 лет)", cost: 6000, currency: "RUB", desc: "Оформить через Госуслуги или МФЦ", tip: "<p><b>Где делать:</b> Аналогично — через <a href='https://www.gosuslugi.ru/newsearch/gosposhlina-za-zagranpasport' target='_blank' rel='noopener'>Госуслуги РФ</a> или МФЦ. Биометрический паспорт на 10 лет.</p><p><b>Документы:</b> Внутренний паспорт РФ, старый загран (если есть), свидетельство о браке (если меняли фамилию).</p><p><b>Срок:</b> 1 месяц (по прописке), до 3 месяцев (не по прописке).</p><p><b>Пошлина:</b> 6 000 руб.</p><p><b>⚠️ Важно:</b> Проверьте, чтобы написание имени и фамилии латиницей строго совпадало во всех будущих документах на ВНЖ.</p>", hasDate: true, expires: 120 },
      { id: "p5d", name: "Загранпаспорт ребёнка (5 лет)", cost: 1000, currency: "RUB", desc: "Обычный паспорт старого образца на 5 лет", tip: "<p><b>Где делать:</b> Через <a href='https://www.gosuslugi.ru/newsearch/gosposhlina-za-zagranpasport' target='_blank' rel='noopener'>Госуслуги РФ</a> или МФЦ. Для ребенка до 14 лет оформляется паспорт старого образца без биометрии на 5 лет.</p><p><b>Обязательное условие:</b> На свидетельстве о рождении должен стоять официальный штамп о гражданстве РФ (красная печать МВД на обратной стороне).</p><p><b>Пошлина:</b> 1 000 руб (за паспорт без чипа на 5 лет для детей до 14 лет).</p><p><b>Срок:</b> 1 месяц.</p>", hasDate: true, expires: 60 },
      { id: "stamp", name: "Штамп о гражданстве РФ на свидетельство о рождении", cost: 0, currency: "RUB", desc: "Красная печать на обратной стороне свидетельства", tip: "<p><b>Где делать:</b> В территориальном органе МВД по вопросам миграции по месту жительства.</p><p><b>Документы:</b> Оригинал свидетельства о рождении ребенка, оригиналы и копии паспортов обоих родителей.</p><p><b>Срок:</b> Штамп ставится в день обращения (обычно за 15–30 минут).</p><p><b>⚠️ Критично важно:</b> Без этого штампа ребенку не оформят загранпаспорт.</p>" },
      { id: "nocrim_h", name: "Справка о несудимости (муж)", cost: 0, currency: "RUB", desc: "Электронная с ЭЦП через Госуслуги", tip: "<p><b>Где делать:</b> Заказать на <a href='https://www.gosuslugi.ru' target='_blank' rel='noopener'>Госуслугах РФ</a>. Обязательно выбирать электронную версию с электронной цифровой подписью (ЭЦП) ведомства.</p><p><b>Срок:</b> 1–3 рабочих дня в электронном виде.</p><p><b>Стоимость:</b> Бесплатно.</p><p><b>⚠️ Юридическая справка:</b> Согласно ст. 15 Договора между СССР и ФНРЮ о правовой помощи от 24.02.1962 (действует между РФ и Сербией), официальные документы принимаются <b>без легализации и апостиля</b>. Электронная справка с ЭЦП полностью легитимна для судебного переводчика в Сербии.</p>", hasDate: true, expires: 6 },
      { id: "nocrim_w", name: "Справка о несудимости (жена)", cost: 0, currency: "RUB", desc: "Электронная с ЭЦП через Госуслуги", tip: "<p><b>Где делать:</b> Заказать электронную справку с ЭЦП на <a href='https://www.gosuslugi.ru' target='_blank' rel='noopener'>Госуслугах РФ</a>. Нужна для подачи на ВНЖ по воссоединению семьи или по собственному ИП.</p><p><b>Срок:</b> 1–3 рабочих дня.</p><p><b>Стоимость:</b> Бесплатно.</p>", hasDate: true, expires: 6 },
      { id: "apost_marr", name: "Апостиль на свидетельство о браке", cost: 2500, currency: "RUB", desc: "Пошлина за оригинал (рекомендуется)", tip: "<p><b>Где делать:</b> В архиве ЗАГС, выдавшем документ, либо через МФЦ.</p><p><b>Срок:</b> 5–7 рабочих дней.</p><p><b>Пошлина:</b> 2 500 руб (согласно ст. 333.33 НК РФ).</p><p><b>⚠️ Важно:</b> Юридически между РФ и Сербией действует соглашение о взаимном признании документов без апостиля. Тем не менее, на практике инспекторы МУП Сербии часто требуют апостили на свидетельства о браке/рождении, поэтому настоятельно рекомендуется перестраховаться и поставить его на оригинал.</p>" },
      { id: "apost_birth", name: "Апостиль на свидетельство о рождении ребёнка", cost: 2500, currency: "RUB", desc: "Пошлина за оригинал (рекомендуется)", tip: "<p><b>Где делать:</b> В ЗАГСе по месту выдачи или через МФЦ.</p><p><b>Срок:</b> 5–7 рабочих дней.</p><p><b>Пошлина:</b> 2 500 руб.</p><p><b>Зачем:</b> Потребуется для ВНЖ ребенка и зачисления в образовательные учреждения Сербии.</p>" },
      { id: "power", name: "Генеральная доверенность в РФ на близкого", cost: 2000, currency: "RUB", desc: "Оформить у нотариуса до отъезда", tip: "<p><b>Где делать:</b> У любого нотариуса в РФ.</p><p><b>Срок:</b> Рекомендуется оформить на 5–10 лет с правом передоверия.</p><p><b>Пошлина/Тариф:</b> Около 2 000 руб.</p><p><b>Что включить:</b> Получение почты, взаимодействие с ФНС, банками, МФЦ, ЗАГС, ГИБДД, право подачи заявлений от вашего имени.</p>", hasDate: true, expires: 120 },
      { id: "child_consent", name: "Нотариальное согласие на выезд ребёнка", cost: 2000, currency: "RUB", desc: "Оформить у нотариуса (если выезжают раздельно)", tip: "<p><b>Когда нужно:</b> Если ребенок пересекает границу РФ с одним из родителей. Если летите вместе всей семьей — согласие по закону не требуется, но рекомендуется иметь для бесконфликтного прохождения пограничного контроля.</p>" },
      { id: "dentist", name: "Пройти стоматологов всей семьёй в РФ", cost: 0, currency: "RUB", desc: "Санация полости рта перед отъездом", tip: "<p>Проведите полное лечение зубов в РФ — в Сербии качественная частная стоматология стоит существенно дороже, а государственная страховка покрывает лишь экстренные случаи.</p>" },
      { id: "pharm", name: "Собрать аптечку с привычными лекарствами", cost: 0, currency: "RUB", desc: "Запас рецептурных препаратов на 3–6 месяцев", tip: "<p>Соберите базовый набор медикаментов. Для рецептурных препаратов обязательно имейте при себе рецепты или назначения врача с указанием Международного непатентованного наименования (МНН) на латинице, чтобы фармацевт в Сербии мог подобрать аналог.</p>" },
      { id: "med_vyps", name: "Медицинские выписки при хронических заболеваниях", cost: 0, currency: "RUB", desc: "Выписки с МНН для продолжения лечения в Сербии", tip: "<p>Запросите у своего лечащего врача подробные выписки из истории болезни. Названия всех действующих веществ и лекарственных схем должны быть указаны на латыни (МНН).</p>" },
    ]
  },
  {
    month: 1,
    title: "Месяц 1: Прилет и ВНЖ «Талант»",
    focus: "Перелет, адаптация на Airbnb, подача на первый ВНЖ и нострификация",
    tasks: [
      { id: "m1_flight", name: "Прямой перелет Air Serbia (3 чел. с багажом)", cost: 1350, currency: "EUR", desc: "Рейс Москва — Белград", tip: "<p>Прямые регулярные рейсы выполняет авиакомпания <a href='https://www.airserbia.com' target='_blank' rel='noopener'>Air Serbia</a> из аэропорта Шереметьево.</p>" },
      { id: "m1_airbnb", name: "Жилье на Airbnb (1-й месяц)", cost: 950, currency: "EUR", desc: "Временное жилье и получение белого картона от хоста", tip: "<p>При бронировании на срок от 30 дней сервисы аренды часто предоставляют скидки до 30-50%. Важнейшее условие — хозяин жилья обязан оформить вам белый картон (регистрацию) в течение 24 часов.</p>" },
      { id: "reg", name: "Белый картон (Beli karton) — регистрация", cost: 0, currency: "EUR", desc: "Регистрация в полиции в течение 24 часов после въезда", tip: "<p><b>Что это:</b> <a href='https://mup.gov.rs' target='_blank' rel='noopener'>Beli karton</a> — подтверждение регистрации иностранного гражданина по адресу пребывания.</p><p><b>Срок:</b> Должен быть оформлен владельцем недвижимости в течение 24 часов с момента пересечения границы. Возможна онлайн-регистрация владельцем через систему <a href='https://etourist.gov.rs' target='_blank' rel='noopener'>eTurista</a>.</p>", hasDate: true },
      { id: "sim", name: "Сим-карта сербского оператора", cost: 10, currency: "EUR", desc: "Prepaid-пакет в любом киоске без паспорта", tip: "<p>Предоплаченные (prepaid) тарифные карты операторов Yettel, A1 или mts можно свободно приобрести в газетных киосках (Moj Kiosk) без предъявления документов.</p>" },
      { id: "m1_translate", name: "Судебные переводы документов", cost: 200, currency: "EUR", desc: "Перевод диплома, свидетельств, прививок", tip: "<p><b>Правило:</b> Все переводы иностранных документов для государственных органов Сербии должны выполняться исключительно сертифицированным сербским судебным переводчиком (<b>sudski tumač</b>).</p>" },
      { id: "talent_nostrification", name: "Нострификация диплома онлайн", cost: 64, currency: "EUR", desc: "Пошлина ENIC/NARIC (7 500 RSD)", tip: "<p><b>Где подавать:</b> Онлайн-заявление на профессиональное признание на официальном портале <a href='https://azk.gov.rs/' target='_blank' rel='noopener'>Агентства по квалификациям (AZK) Сербии</a>.</p><p><b>Пошлина:</b> Административный сбор составляет 7 500 RSD (около 64 €). Апостиль на оригиналы российских дипломов не требуется.</p>" },
      { id: "m1_insurance", name: "Медстраховки на 1 год (на троих)", cost: 250, currency: "EUR", desc: "Локальный полис Dunav/Globos/Triglav для ВНЖ", tip: "<p>Годовой полис медицинского страхования от сербской страховой компании (Dunav, Globos, Triglav, Generali) является обязательным документом для подачи заявления на ВНЖ.</p>", hasDate: true, expires: 12 },
      { id: "m1_vnz", name: "Пошлины МУП за ВНЖ «Талант» на троих", cost: 600, currency: "EUR", desc: "Пошлина за Единое разрешение (~22 000 RSD за человека)", tip: "<p><b>Подача:</b> Заявление на Единое разрешение (Jedinstvena dozvola) подается в электронном виде через портал <a href='https://euprava.gov.rs' target='_blank' rel='noopener'>eUprava Сербии</a>.</p><p><b>Оплата:</b> Пошлина генерируется через систему Plati eUprava и оплачивается исключительно в банке или на почте Pošta Srbije по квитанции.</p>" },
      { id: "m1_living", name: "Еда, связь, базовый быт", cost: 600, currency: "EUR", desc: "Текущие расходы на первый месяц", tip: "<p>Базовые траты на продукты, транспорт и мобильную связь для семьи из 3 человек на время адаптации.</p>" },
      { id: "m1_pediatrician", name: "Осмотр ребёнка у педиатра для сада", cost: 50, currency: "EUR", desc: "Медицинская справка для зачисления в садик", tip: "<p>Для зачисления ребенка в детский сад требуется справка от сербского педиатра из частной (MediGroup, Euromedik) или государственной клиники (Dom Zdravlja). Срок действия справки — 1 месяц.</p>" },
    ]
  },
  {
    month: 2,
    title: "Месяц 2: Постоянное жилье и детский сад",
    focus: "Поиск долгосрочной квартиры и устройство дочки в садик",
    tasks: [
      { id: "m2_rent", name: "Аренда квартиры (1-й месяц)", cost: 600, currency: "EUR", desc: "Двушка на долгий срок", tip: "<p><b>Поиск:</b> Основные платформы — <a href='https://cityexpert.rs' target='_blank' rel='noopener'>CityExpert</a> (без комиссии для арендатора) и <a href='https://www.halooglasi.com/nekretnine/izdavanje-stanova/beograd' target='_blank' rel='noopener'>HaloOglasi</a>.</p><p><b>Договор (Ugovor o zakupu):</b> Заключается письменно минимум на 1 год. Обязательно должен содержать пункт о согласии владельца на регистрацию проживающих (белый картон).</p>", hasDate: true },
      { id: "m2_deposit", name: "Залог хозяину квартиры (100%)", cost: 600, currency: "EUR", desc: "Возвратный депозит за сохранность", tip: "<p>Стандартный страховой депозит составляет размер одной месячной платы. Сделайте подробную фото- и видеофиксацию состояния комнат при заселении.</p>" },
      { id: "m2_agency", name: "Комиссия риелтору (50%)", cost: 300, currency: "EUR", desc: "Единоразовая оплата услуг агентства", tip: "<p>При поиске через классические агентства комиссия составляет 50% от стоимости одного месяца аренды.</p>" },
      { id: "m2_utility", name: "Коммунальные услуги", cost: 150, currency: "EUR", desc: "Инфостан, свет, интернет", tip: "<p>Включает коммунальный платеж Infostan (отопление, вода, вывоз мусора), счет за электричество (EPS) и интернет. Сохраняйте оплаченные квитанции.</p>" },
      { id: "m2_kindergarten", name: "Частный детский сад (1-й месяц)", cost: 400, currency: "EUR", desc: "Ежемесячная оплата садика", tip: "<p>В частных садах (Privatni vrtić) места есть круглый год. Обязательное условие приема — наличие прививочной карты с обязательной вакцинацией MMR (корь-краснуха-паротит).</p>" },
      { id: "m2_living", name: "Еда, быт, семейные расходы", cost: 600, currency: "EUR", desc: "Текущие расходы на жизнь", tip: "<p>Планируемые расходы на продукты питания, мелкий быт и транспортные издержки семьи.</p>" },
    ]
  },
  {
    month: 3,
    title: "Месяц 3: Запуск ИП и смена статуса ВНЖ",
    focus: "Регистрация бизнеса и подготовка к первым доходам",
    tasks: [
      { id: "m3_rent", name: "Аренда квартиры + коммуналка", cost: 750, currency: "EUR", desc: "Арендная плата и счета", tip: "<p>Ежемесячные регулярные расходы на содержание постоянного жилья.</p>" },
      { id: "m3_kindergarten", name: "Частный детский сад (2-й месяц)", cost: 400, currency: "EUR", desc: "Оплата сада", tip: "<p>Регулярный платеж за детский сад ребенка.</p>" },
      { id: "m3_living", name: "Еда и базовые расходы", cost: 600, currency: "EUR", desc: "Расходы на жизнь", tip: "<p>Стандартный семейный бюджет на питание и повседневные нужды.</p>" },
      { id: "preduzetnik", name: "Регистрация ИП в APR (Предузетник)", cost: 21, currency: "EUR", desc: "Госпошлина APR за регистрацию предпринимателя (2 500 RSD)", tip: "<p><b>Где делать:</b> Регистрация осуществляется в <a href='https://www.apr.gov.rs' target='_blank' rel='noopener'>Агентстве по хозяйственным регистрам (APR)</a>.</p><p><b>Пошлина:</b> Административный сбор за регистрацию предпринимателя составляет 2 500 RSD. Код деятельности для IT-разработки — 62.01.</p>" },
      { id: "m3_office", name: "Виртуальный офис для ИП (на год)", cost: 185, currency: "EUR", desc: "Юридический адрес для регистрации бизнеса", tip: "<p>Необходим в случае, если владелец арендуемой квартиры не дает согласия на регистрацию юридического адреса вашего ИП по месту вашего проживания.</p>" },
      { id: "bank", name: "Открытие личного и бизнес-счёта в банке", cost: 0, currency: "EUR", desc: "Счета для жизни и бизнеса", tip: "<p>Открытие бизнес-счета для ИП. Банки, активно работающие с иностранными предпринимателями — Alta Bank, API Bank, Poštanska Štedionica. Требуется прохождение комплаенса (KYC).</p>" },
      { id: "tax_decl_bank", name: "Подготовка налоговых деклараций из РФ для банка", cost: 0, currency: "EUR", desc: "2-НДФЛ и 3-НДФЛ для комплаенса", tip: "<p>Справки 2-НДФЛ, декларации 3-НДФЛ или банковские выписки из РФ за последние 3–6 месяцев. Служат подтверждением легальности ваших стартовых накоплений для службы комплаенса сербского банка.</p>" },
      { id: "m3_lawyer", name: "Услуги юриста (банк, комплаенс, смена ВНЖ)", cost: 200, currency: "EUR", desc: "Помощь с банковскими проверками и пошлиной за смену ВНЖ", tip: "<p>Профессиональное сопровождение процесса открытия счетов и перехода на новое основание ВНЖ (с 'Таланта' на 'ИП').</p>" },
    ]
  },
  {
    month: 4,
    title: "Месяц 4: Жизнь на рельсах бизнеса",
    focus: "Полноценная работа, оплата первых налогов",
    tasks: [
      { id: "m4_rent", name: "Аренда квартиры + коммуналка", cost: 750, currency: "EUR", desc: "Арендная плата и счета", tip: "<p>Регулярные расходы на аренду жилья.</p>" },
      { id: "m4_kindergarten", name: "Частный детский сад (3-й месяц)", cost: 400, currency: "EUR", desc: "Оплата сада", tip: "<p><b>Лайфхак:</b> Запросите в саду официальную справку о посещении (Potvrda o pohađanju vrtića) — она может служить дополнительным подтверждением интеграции вашей семьи при последующем продлении ВНЖ.</p>" },
      { id: "m4_pausal", name: "Первые фиксированные налоги ИП (Паушал)", cost: 350, currency: "EUR", desc: "Ежемесячный обязательный платёж ~350 €", tip: "<p><b>Оплата:</b> Фиксированный ежемесячный паушальный налог. Включает пенсионные и медицинские отчисления. Налоги необходимо уплачивать строго до 15-го числа каждого месяца.</p>" },
      { id: "state_health_insurance", name: "Оформление гос. медстраховки (здравственная книжица)", cost: 0, currency: "EUR", desc: "Бесплатная медицина на всю семью через ИП", tip: "<p><b>Здравственная книжица:</b> Получение государственной медицинской страховки (Zdravstvena knjižica) через уплату налогов ИП в фонде <a href='https://www.rfzo.rs/' target='_blank' rel='noopener'>RFZO</a>. Позволяет бесплатно обслуживаться в государственных клиниках всей семье.</p>" },
      { id: "m4_living", name: "Еда и быт", cost: 600, currency: "EUR", desc: "Стандартный ежемесячный бюджет семьи", tip: "<p>Регулярные базовые семейные расходы в Белграде.</p>" },
      { id: "license", name: "Перевод водительских прав на сербский", cost: 30, currency: "EUR", desc: "Сделать у судебного переводчика", tip: "<p><b>Правила:</b> Иностранные водительские права действуют в Сербии на протяжении 6 месяцев с даты получения первого ВНЖ. После этого срока права необходимо обменять на сербские национальные.</p>" },
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

function calculateMonthMetrics(tasks, state) {
  let totalPlanned = 0, spent = 0, spentInProgress = 0;
  let taskDone = 0, taskProgress = 0, taskTotal = 0;

  if (!Array.isArray(tasks)) {
    return { totalPlanned: 0, spent: 0, spentInProgress: 0, taskDone: 0, taskProgress: 0, taskTotal: 0,
      spentPct: 0, pendingSpentPct: 0, donePct: 0, progPct: 0,
      combinedTaskPct: 0, combinedBudgetPct: 0, pendingTasksCount: 0 };
  }

  tasks.forEach(t => {
    if (!t) return;
    const s = (state && state.tasks && state.tasks[t.id]) || { checked: false, progress: false, customCost: null };
    const cost = (s.customCost != null ? s.customCost : t.cost) || 0;
    totalPlanned += cost;
    if (s.checked === true) spent += cost;
    else if (s.progress === true) spentInProgress += cost;
    taskTotal++;
    if (s.checked === true) taskDone++;
    else if (s.progress === true) taskProgress++;
  });

  const spentPct = totalPlanned > 0 ? Math.round((spent / totalPlanned) * 100) : 0;
  const pendingSpentPct = totalPlanned > 0 ? Math.round((spentInProgress / totalPlanned) * 100) : 0;
  const donePct = taskTotal > 0 ? Math.round((taskDone / taskTotal) * 100) : 0;
  const progPct = taskTotal > 0 ? Math.round((taskProgress / taskTotal) * 100) : 0;

  return {
    totalPlanned, spent, spentInProgress,
    taskDone, taskProgress, taskTotal,
    spentPct, pendingSpentPct, donePct, progPct,
    combinedTaskPct: Math.round(donePct + (progPct * 0.5)),
    combinedBudgetPct: spentPct + pendingSpentPct,
    pendingTasksCount: taskTotal - taskDone - taskProgress
  };
}

function renderPlan() {
  const root = document.getElementById('timeline-root');
  if (!root) return;

  let state = getPlanState();
  if (!state || !state.tasks || typeof state.tasks !== 'object') {
    state = null;
  }

  if (!state) {
    const tasks = {};
    if (Array.isArray(masterTimeline)) {
      masterTimeline.forEach(m => {
        if (m && Array.isArray(m.tasks)) {
          m.tasks.forEach(t => { if (t && t.id) tasks[t.id] = { checked: false, progress: false, customCost: null }; });
        }
      });
    }
    state = { tasks };
    setPlanState(state);
  } else {
    let reconciled = false;
    if (Array.isArray(masterTimeline)) {
      masterTimeline.forEach(m => {
        if (m && Array.isArray(m.tasks)) {
          m.tasks.forEach(t => {
            if (t && t.id && !state.tasks[t.id]) {
              state.tasks[t.id] = { checked: false, progress: false, customCost: null };
              reconciled = true;
            }
          });
        }
      });
    }
    if (reconciled) setPlanState(state);
  }

  const locked = localStorage.getItem('plan-locked') === 'true';
  root.innerHTML = '';
  root.className = 'tab-content' + (!locked ? ' plan-edit-mode' : '');

  const h = document.createElement('h2');
  h.textContent = '📅 Пошаговый план переезда (5 месяцев)';
  root.appendChild(h);

  const lockBar = document.createElement('div');
  lockBar.className = 'plan-lock-bar';
  const lockBtn = document.createElement('button');
  lockBtn.className = 'plan-lock-btn' + (locked ? '' : ' unlocked');
  lockBtn.textContent = locked ? '🔎 Только просмотр' : '✏️ Редактирование';
  lockBtn.dataset.planLock = '1';
  lockBar.appendChild(lockBtn);
  root.appendChild(lockBar);

  let rubPlanned = 0, rubSpent = 0, rubInProgress = 0;
  let eurPlanned013 = 0, eurSpent013 = 0, eurInProgress013 = 0;
  let eurPlanned4 = 0, eurSpent4 = 0;
  let globalTaskDone = 0, globalTaskProgress = 0, globalTaskTotal = 0;

  if (!Array.isArray(masterTimeline)) { root.appendChild(document.createTextNode('Ошибка данных.')); return; }

  masterTimeline.forEach(m => {
    if (!m || !Array.isArray(m.tasks)) return;

    const card = document.createElement('div');
    card.className = 'tl-card';
    const header = document.createElement('div');
    header.className = 'tl-header';
    header.innerHTML = `<span class="tl-month">${m.title || ''}</span>`;
    card.appendChild(header);
    const focusEl = document.createElement('div');
    focusEl.className = 'tl-focus';
    focusEl.textContent = '🎯 ' + (m.focus || '');
    card.appendChild(focusEl);

    const firstTask = m.tasks.length > 0 ? m.tasks[0] : null;
    const monthCur = (firstTask && firstTask.currency) || 'EUR';
    const monthSym = monthCur === 'RUB' ? ' ₽' : ' €';

    const M = calculateMonthMetrics(m.tasks, state);
    const totalPlanned = M.totalPlanned, spent = M.spent, spentInProgress = M.spentInProgress;
    const taskDone = M.taskDone, taskProgress = M.taskProgress, taskTotal = M.taskTotal;
    const spentPct = M.spentPct, pendingSpentPct = M.pendingSpentPct;
    const donePct = M.donePct, progPct = M.progPct;
    const pendingTasksCount = M.pendingTasksCount;
    const combinedBudgetPct = M.combinedBudgetPct;
    const combinedTaskPct = M.combinedTaskPct;

    const metricsGroup = document.createElement('div');
    metricsGroup.className = 'plan-metrics-group';

    const budgetWrapper = document.createElement('div');
    budgetWrapper.className = 'plan-metric-wrapper';
    const budgetHeader = document.createElement('div');
    budgetHeader.className = 'plan-metric-header';
    budgetHeader.innerHTML = '<span class="plan-metric-title">💶 Финансовый бюджет</span>' +
      '<span class="plan-metric-percentage">' + combinedBudgetPct + '%</span>';
    budgetWrapper.appendChild(budgetHeader);

    const budgetDetails = document.createElement('div');
    budgetDetails.className = 'plan-metric-details';
    budgetDetails.innerHTML =
      '<div class="metric-detail-item"><span>📋 Запланировано</span><span class="metric-num">' + formatPrice(totalPlanned, monthCur === 'RUB' ? '₽' : '€') + '</span></div>' +
      '<div class="metric-detail-item spent"><span>🔵 Потрачено</span><span class="metric-num">' + formatPrice(spent, monthCur === 'RUB' ? '₽' : '€') + ' (' + spentPct + '%)</span></div>' +
      '<div class="metric-detail-item pending"><span>🔷 В работе</span><span class="metric-num">' + formatPrice(spentInProgress, monthCur === 'RUB' ? '₽' : '€') + ' (' + pendingSpentPct + '%)</span></div>';
    budgetWrapper.appendChild(budgetDetails);

    const budgetTrack = document.createElement('div');
    budgetTrack.className = 'plan-progress-track budget-combined';
    const segSpent = document.createElement('div');
    segSpent.className = 'plan-progress-segment segment-spent';
    segSpent.style.width = spentPct + '%';
    budgetTrack.appendChild(segSpent);
    if (pendingSpentPct > 0) {
      const segPendingSpent = document.createElement('div');
      segPendingSpent.className = 'plan-progress-segment segment-pending-spent';
      segPendingSpent.style.left = spentPct + '%';
      segPendingSpent.style.width = pendingSpentPct + '%';
      budgetTrack.appendChild(segPendingSpent);
    }
    budgetWrapper.appendChild(budgetTrack);
    metricsGroup.appendChild(budgetWrapper);

    const taskWrapper = document.createElement('div');
    taskWrapper.className = 'plan-metric-wrapper';
    const taskHeader = document.createElement('div');
    taskHeader.className = 'plan-metric-header';
    taskHeader.innerHTML = '<span class="plan-metric-title">📋 Физический прогресс</span>' +
      '<span class="plan-metric-percentage">' + combinedTaskPct + '%</span>';
    taskWrapper.appendChild(taskHeader);

    const taskDetails = document.createElement('div');
    taskDetails.className = 'plan-metric-details';
    taskDetails.innerHTML =
      '<div class="metric-detail-item"><span>🎯 Всего задач</span><span class="metric-num">' + taskTotal + '</span></div>' +
      '<div class="metric-detail-item done"><span>🟢 Готово</span><span class="metric-num">' + taskDone + ' из ' + taskTotal + ' (' + donePct + '%)</span></div>' +
      '<div class="metric-detail-item progress"><span>🟡 В процессе</span><span class="metric-num">' + taskProgress + ' (' + progPct + '%)</span></div>';
    taskWrapper.appendChild(taskDetails);

    const taskTrack = document.createElement('div');
    taskTrack.className = 'plan-progress-track tasks-combined';
    const segDone = document.createElement('div');
    segDone.className = 'plan-progress-segment segment-done';
    segDone.style.width = donePct + '%';
    taskTrack.appendChild(segDone);
    if (progPct > 0) {
      const segProg = document.createElement('div');
      segProg.className = 'plan-progress-segment segment-progress';
      segProg.style.left = donePct + '%';
      segProg.style.width = progPct + '%';
      taskTrack.appendChild(segProg);
    }
    taskWrapper.appendChild(taskTrack);
    metricsGroup.appendChild(taskWrapper);

    card.appendChild(metricsGroup);

    const ul = document.createElement('ul');
    ul.className = 'tl-steps';

    m.tasks.forEach(t => {
      if (!t || !t.id) return;
      const s = state.tasks[t.id] || { checked: false, progress: false, customCost: null };
      const checked = s.checked === true;
      const prog = s.progress === true;
      const cost = (s.customCost != null ? s.customCost : t.cost);
      const hasTip = !!t.tip;
      const hasDate = !!t.hasDate;
      const dateVal = s.date || '';
      const noteVal = s.note || '';

      let statusClass = '';
      let statusEmoji = '🔵';
      if (checked) { statusClass = ' status-done'; statusEmoji = '🟢'; }
      else if (prog) { statusClass = ' status-in-progress'; statusEmoji = '🟡'; }
      else { statusEmoji = '⚪'; }

      const li = document.createElement('li');
      li.className = 'tl-step' + statusClass;
      li.id = 'plan-' + t.id;

      const statusBtn = document.createElement('button');
      statusBtn.className = 'plan-status-btn' + (checked ? ' done' : prog ? ' progress' : '');
      statusBtn.textContent = statusEmoji;
      statusBtn.dataset.planStatus = t.id;
      if (locked) statusBtn.disabled = true;
      li.appendChild(statusBtn);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'plan-task-name';
      nameSpan.textContent = t.name;
      li.appendChild(nameSpan);

      const costSpan = document.createElement('span');
      costSpan.className = 'plan-task-cost';
      const curSym = t.currency === 'RUB' ? ' ₽' : ' €';
      costSpan.textContent = cost > 0 ? cost.toLocaleString('ru-RU') + curSym : 'Бесплатно';
      li.appendChild(costSpan);

      if (t.desc) {
        const descSpan = document.createElement('span');
        descSpan.className = 'plan-task-desc';
        descSpan.textContent = t.desc;
        li.appendChild(descSpan);
      }

      // Date block — visible when done AND hasDate
      if (checked && hasDate) {
        const expiresMonths = t.expires || 0;

        const dateBlock = document.createElement('div');
        dateBlock.className = 'plan-date-inline';

        const dateLabel = document.createElement('span');
        dateLabel.className = 'plan-date-label';
        dateLabel.textContent = '📅 Получено:';
        dateBlock.appendChild(dateLabel);

        const dateValEl = document.createElement('span');
        dateValEl.className = 'plan-date-val';
        dateValEl.id = 'plan-dv-' + t.id;
        dateValEl.textContent = dateVal || 'не указана';
        dateBlock.appendChild(dateValEl);

        const editBtn = document.createElement('button');
        editBtn.className = 'plan-date-edit-btn';
        editBtn.textContent = '✏️';
        editBtn.dataset.planDateEdit = t.id;
        if (!locked) dateBlock.appendChild(editBtn);

        const dateInputsWrap = document.createElement('span');
        dateInputsWrap.className = 'plan-date-inputs-wrap hidden';
        dateInputsWrap.id = 'plan-di-' + t.id;

        const parts = dateVal ? dateVal.split('.') : [];
        const dInp = document.createElement('input');
        dInp.className = 'plan-date-d';
        dInp.placeholder = 'ДД'; dInp.value = parts[0] || ''; dInp.maxLength = 2;
        if (locked) dInp.disabled = true;
        dateInputsWrap.appendChild(dInp);
        dateInputsWrap.appendChild(document.createTextNode('.'));
        const mInp = document.createElement('input');
        mInp.className = 'plan-date-m';
        mInp.placeholder = 'ММ'; mInp.value = parts[1] || ''; mInp.maxLength = 2;
        if (locked) mInp.disabled = true;
        dateInputsWrap.appendChild(mInp);
        dateInputsWrap.appendChild(document.createTextNode('.'));
        const yInp = document.createElement('input');
        yInp.className = 'plan-date-y';
        yInp.placeholder = 'ГГГГ'; yInp.value = parts[2] || ''; yInp.maxLength = 4;
        if (locked) yInp.disabled = true;
        dateInputsWrap.appendChild(yInp);
        const saveBtn = document.createElement('button');
        saveBtn.className = 'plan-date-save-btn';
        saveBtn.textContent = '💾';
        saveBtn.dataset.planDateSave = t.id;
        if (!locked) dateInputsWrap.appendChild(saveBtn);

        dateBlock.appendChild(dateInputsWrap);

        if (dateVal && expiresMonths > 0) {
          const dp = dateVal.split('.');
          if (dp.length === 3) {
            const doneDate = new Date(+dp[2], +dp[1] - 1, +dp[0]);
            const expDate = new Date(doneDate);
            expDate.setMonth(expDate.getMonth() + expiresMonths);
            const now = new Date();
            const totalDaysLeft = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
            const monthsLeft = Math.floor(totalDaysLeft / 30);
            const daysLeft = totalDaysLeft - monthsLeft * 30;
            let remText;
            if (totalDaysLeft < 0) {
              remText = 'Просрочено на ' + Math.abs(totalDaysLeft) + ' дн.';
            } else if (monthsLeft > 0) {
              remText = 'Ещё ' + monthsLeft + ' мес. ' + daysLeft + ' дн.';
            } else {
              remText = 'Ещё ' + daysLeft + ' дн.';
            }
            const rem = document.createElement('span');
            rem.className = 'plan-date-remaining';
            if (totalDaysLeft < 0) { rem.classList.add('expired'); rem.textContent = '⏳ ' + remText; }
            else if (totalDaysLeft <= 30) { rem.classList.add('warn'); rem.textContent = '⏳ Действует до: ' + expDate.toLocaleDateString('ru-RU') + ' (' + remText + ')'; }
            else { rem.classList.add('ok'); rem.textContent = '⏳ Действует до: ' + expDate.toLocaleDateString('ru-RU') + ' (' + remText + ')'; }
            dateBlock.appendChild(rem);
          }
        }

        li.appendChild(dateBlock);
      }

      // Note block — always visible
      {
        const noteBlock = document.createElement('div');
        noteBlock.className = 'plan-note-inline';

        const noteDisplay = document.createElement('span');
        noteDisplay.className = 'plan-note-display' + (noteVal ? '' : ' hidden');
        noteDisplay.id = 'plan-nd-' + t.id;
        if (noteVal) {
          noteDisplay.textContent = '📝 ' + noteVal;
        }
        noteBlock.appendChild(noteDisplay);

        const noteEditBtn = document.createElement('button');
        noteEditBtn.className = 'plan-note-edit-btn';
        noteEditBtn.textContent = noteVal ? '✏️' : '➕ Заметка';
        noteEditBtn.dataset.planNoteEdit = t.id;
        if (!locked) noteBlock.appendChild(noteEditBtn);

        const noteEditWrap = document.createElement('span');
        noteEditWrap.className = 'plan-note-edit-wrap hidden';
        noteEditWrap.id = 'plan-ne-' + t.id;
        const noteTa = document.createElement('textarea');
        noteTa.className = 'plan-note-ta';
        noteTa.rows = 2;
        noteTa.value = noteVal;
        if (locked) noteTa.disabled = true;
        noteEditWrap.appendChild(noteTa);
        const noteSaveBtn = document.createElement('button');
        noteSaveBtn.className = 'plan-note-save-btn';
        noteSaveBtn.textContent = '💾';
        noteSaveBtn.dataset.planNoteSave = t.id;
        if (!locked) noteEditWrap.appendChild(noteSaveBtn);
        if (noteVal) {
          const noteDelBtn = document.createElement('button');
          noteDelBtn.className = 'plan-note-del-btn';
          noteDelBtn.textContent = '🗑️';
          noteDelBtn.dataset.planNoteDel = t.id;
          if (!locked) noteEditWrap.appendChild(noteDelBtn);
        }
        noteBlock.appendChild(noteEditWrap);

        li.appendChild(noteBlock);
      }

      // Tip toggle — only reference info in spoiler
      if (hasTip) {
        const tipBtn = document.createElement('button');
        tipBtn.className = 'plan-tip-toggle';
        tipBtn.textContent = '▶';
        tipBtn.dataset.planTip = t.id;
        li.appendChild(tipBtn);

        const tipBody = document.createElement('div');
        tipBody.className = 'plan-tip-body hidden';
        tipBody.dataset.planTipBody = t.id;
        const tipText = document.createElement('div');
        tipText.className = 'plan-tip-text';
        tipText.innerHTML = '💡 ' + t.tip;
        tipBody.appendChild(tipText);
        li.appendChild(tipBody);
      }

      ul.appendChild(li);
    });

    card.appendChild(ul);
    root.appendChild(card);

    if (m.month === 0) { rubPlanned += totalPlanned; rubSpent += spent; rubInProgress += spentInProgress; }
    if (m.month >= 1 && m.month <= 3) { eurPlanned013 += totalPlanned; eurSpent013 += spent; eurInProgress013 += spentInProgress; }
    if (m.month === 4) { eurPlanned4 += totalPlanned; eurSpent4 += spent; }
    if (m.month >= 0 && m.month <= 3) { globalTaskDone += taskDone; globalTaskProgress += taskProgress; globalTaskTotal += taskTotal; }
  });

  const rubRemaining = rubPlanned - rubSpent;
  const eurRemaining013 = eurPlanned013 - eurSpent013;
  const rubSpentPct = rubPlanned > 0 ? Math.round((rubSpent / rubPlanned) * 100) : 0;
  const rubProgPct = rubPlanned > 0 ? Math.round((rubInProgress / rubPlanned) * 100) : 0;
  const eurSpentPct = eurPlanned013 > 0 ? Math.round((eurSpent013 / eurPlanned013) * 100) : 0;
  const eurProgPct = eurPlanned013 > 0 ? Math.round((eurInProgress013 / eurPlanned013) * 100) : 0;
  const globalDonePct = globalTaskTotal > 0 ? Math.round((globalTaskDone / globalTaskTotal) * 100) : 0;
  const globalProgPct = globalTaskTotal > 0 ? Math.round((globalTaskProgress / globalTaskTotal) * 100) : 0;
  const globalPending = globalTaskTotal - globalTaskDone - globalTaskProgress;
  const globalTaskCombined = Math.round(globalDonePct + (globalProgPct * 0.5));
  const rubCombined = rubSpentPct + rubProgPct;
  const eurCombined = eurSpentPct + eurProgPct;
  const summary = document.createElement('div');
  summary.className = 'tl-summary';
  summary.innerHTML =
    `<div class="tl-summary-row" style="font-size:1.2em">💰 Стартовая подушка (Месяцы 0–3)</div>` +
    `<div class="tl-summary-row" style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.08);border-radius:6px">` +
      `<div>🇷🇺 <b>Расходы в РФ (Месяц 0):</b></div>` +
      `<div style="margin-top:4px;font-size:0.95em">Запланировано: <strong>${rubPlanned.toLocaleString('ru-RU')} ₽</strong></div>` +
      `<div style="font-size:0.9em;color:#81c784">✅ Потрачено: <strong>${rubSpent.toLocaleString('ru-RU')} ₽</strong></div>` +
      `<div style="font-size:0.9em;color:#64b5f6">📅 Осталось: <strong>${rubRemaining.toLocaleString('ru-RU')} ₽</strong></div>` +
    `</div>` +
    `<div class="tl-summary-row" style="margin-top:10px;padding:8px 10px;background:rgba(255,255,255,0.08);border-radius:6px">` +
      `<div style="font-weight:bold;margin-bottom:6px">📈 Готовность к переезду</div>` +
      `<div class="plan-metric-details" style="margin-bottom:6px">` +
        `<div class="metric-detail-item"><span>🎯 Всего задач</span><span class="metric-num">${globalTaskTotal}</span></div>` +
        `<div class="metric-detail-item done"><span>🟢 Готово</span><span class="metric-num">${globalTaskDone} (${globalDonePct}%)</span></div>` +
        `<div class="metric-detail-item progress"><span>🟡 В процессе</span><span class="metric-num">${globalTaskProgress} (${globalProgPct}%)</span></div>` +
      `</div>` +
      `<div class="plan-progress-track tasks-combined">` +
        `<div class="plan-progress-segment segment-done" style="width:${globalDonePct}%"></div>` +
        (globalProgPct > 0 ? `<div class="plan-progress-segment segment-progress" style="left:${globalDonePct}%;width:${globalProgPct}%"></div>` : '') +
      `</div>` +
    `</div>` +
    `<div class="tl-summary-row" style="margin-top:8px;padding:8px 10px;background:rgba(255,255,255,0.08);border-radius:6px">` +
      `<div>🇷🇸 <b>Расходы в Сербии (Месяцы 1–3):</b></div>` +
      `<div style="margin-top:4px;font-size:0.95em">Запланировано: <strong>${eurPlanned013.toLocaleString('ru-RU')} €</strong></div>` +
      `<div style="font-size:0.9em;color:#81c784">✅ Потрачено: <strong>${eurSpent013.toLocaleString('ru-RU')} €</strong></div>` +
      `<div style="font-size:0.9em;color:#64b5f6">📅 Осталось: <strong>${eurRemaining013.toLocaleString('ru-RU')} €</strong></div>` +
    `</div>` +
    `<div class="tl-summary-row" style="margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.2)">🔄 Ежемесячный бюджет на рельсах (Месяц 4): <strong>${eurPlanned4.toLocaleString('ru-RU')} €</strong>` +
    (eurSpent4 > 0 ? ` <span style="font-size:0.85em;color:#81c784">(потрачено ${eurSpent4.toLocaleString('ru-RU')} €)</span>` : '') +
    `</div>`;
  root.appendChild(summary);
}

if (!window.planListenerAdded) {
  document.getElementById('timeline-root')?.addEventListener('click', e => {
    const el = e.target;

    // Lock button
    if (el.classList.contains('plan-lock-btn') || el.closest('.plan-lock-btn')) {
      const btn = el.classList.contains('plan-lock-btn') ? el : el.closest('.plan-lock-btn');
      const isLocked = localStorage.getItem('plan-locked') === 'true';
      localStorage.setItem('plan-locked', isLocked ? 'false' : 'true');
      try { renderPlan(); } catch (e) { console.error(e); }
      return;
    }

    // Three-state status button
    if (el.classList.contains('plan-status-btn')) {
      if (el.disabled) return;
      const id = el.dataset.planStatus;
      if (!id) return;
      const st = getPlanState() || { tasks: {} };
      if (!st.tasks[id]) st.tasks[id] = { checked: false, progress: false, customCost: null };
      const cur = st.tasks[id];
      if (!cur.checked && !cur.progress) {
        cur.progress = true;
      } else if (!cur.checked && cur.progress) {
        cur.progress = false;
        cur.checked = true;
      } else {
        cur.checked = false;
        cur.progress = false;
      }
      setPlanState(st);
      try { renderPlan(); } catch (e) { console.error(e); }
      debouncedSave();
      return;
    }

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
    if (el.classList.contains('plan-date-edit-btn')) {
      const id = el.dataset.planDateEdit;
      if (!id) return;
      const valEl = document.getElementById('plan-dv-' + id);
      const inputs = document.getElementById('plan-di-' + id);
      if (valEl) valEl.style.display = 'none';
      if (inputs) inputs.classList.remove('hidden');
      el.style.display = 'none';
      return;
    }

    // Date save
    if (el.classList.contains('plan-date-save-btn')) {
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
        if (!st.tasks[id]) st.tasks[id] = { checked: false, progress: false, customCost: null };
        st.tasks[id].date = dd + '.' + mm + '.' + yy;
        setPlanState(st);
      }
      try { renderPlan(); } catch (e) { console.error(e); }
      return;
    }

    // Note edit
    if (el.classList.contains('plan-note-edit-btn')) {
      const id = el.dataset.planNoteEdit;
      if (!id) return;
      const wrap = document.getElementById('plan-ne-' + id);
      if (wrap) wrap.classList.remove('hidden');
      const ta = wrap ? wrap.querySelector('.plan-note-ta') : null;
      if (ta) { ta.focus(); ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }
      return;
    }

    // Note save
    if (el.classList.contains('plan-note-save-btn')) {
      const id = el.dataset.planNoteSave;
      if (!id) return;
      const wrap = document.getElementById('plan-ne-' + id);
      const ta = wrap ? wrap.querySelector('.plan-note-ta') : null;
      const val = ta ? ta.value.trim() : '';
      const st = getPlanState() || { tasks: {} };
      if (!st.tasks[id]) st.tasks[id] = { checked: false, progress: false, customCost: null };
      st.tasks[id].note = val || undefined;
      setPlanState(st);
      try { renderPlan(); } catch (e) { console.error(e); }
      return;
    }

    // Note delete
    if (el.classList.contains('plan-note-del-btn')) {
      const id = el.dataset.planNoteDel;
      if (!id) return;
      const st = getPlanState() || { tasks: {} };
      if (!st.tasks[id]) st.tasks[id] = { checked: false, progress: false, customCost: null };
      delete st.tasks[id].note;
      setPlanState(st);
      try { renderPlan(); } catch (e) { console.error(e); }
      return;
    }

    // Catch-all: click on task row toggles tip (skip interactive elements)
    const step = el.closest('.tl-step');
    if (step) {
      if (el.closest('input') || el.closest('textarea') || el.closest('a')) return;
      const btn = el.closest('button');
      if (btn && !btn.classList.contains('plan-tip-toggle')) return;
      const tipBtn = step.querySelector('.plan-tip-toggle');
      const tipBody = step.querySelector('.plan-tip-body');
      if (tipBody && tipBtn) {
        const isHidden = tipBody.classList.contains('hidden');
        tipBody.classList.toggle('hidden');
        tipBtn.classList.toggle('open', isHidden);
        tipBtn.textContent = isHidden ? '▼' : '▶';
      }
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
  if (window.migrateLegacyData) {
    try { window.migrateLegacyData(); } catch (e) { console.error('migrateLegacyData error:', e); }
  }
  try { renderPlan(); } catch (e) { console.error('renderPlan error:', e); }
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
  setTimeout(() => { try { renderPlan(); } catch (e) { console.error(e); } }, 50);
});

// Sync: обновление после загрузки из облака
window.addEventListener('sync-loaded', () => {
  try { renderPlan(); } catch (e) { console.error(e); }
});


