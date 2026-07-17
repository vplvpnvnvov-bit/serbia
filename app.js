window.APP_CONFIG = {
  VERSION: "6.3.1",
  BUILD: "0501054",
  CACHE_NAME: "relocation-v6.3.1-0501054"
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
const mapTiles = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
};

const map = L.map('map', {
  center: [44.76, 20.48],
  zoom: 10,
  zoomControl: false,
  attributionControl: true,
});
L.control.zoom({ position: 'bottomleft' }).addTo(map);

let currentTileLayer = L.tileLayer(mapTiles.light, {
  maxZoom: 19,
  attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
}).addTo(map);

const baseLayers = {};
function addBaseLayer(name, url, opts) {
  const layer = L.tileLayer(url, { maxZoom: 19, ...opts });
  baseLayers[name] = layer;
  return layer;
}

baseLayers['carto'] = currentTileLayer;
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
  let emoji = '📍';
  const cat = pt.category;
  if (cat === 'police') emoji = '👮';
  else if (cat === 'post') emoji = '✉️';
  else if (cat === 'apr') emoji = '📄';
  else if (cat === 'clinic') emoji = '🏥';
  else if (cat === 'rfzo') emoji = '💊';
  else if (cat === 'tax') emoji = '📋';
  else if (cat === 'embassy') emoji = '🇷🇺';
  else if (cat === 'bank') emoji = '🏦';
  else if (cat === 'school') emoji = '🏫';
  else if (cat === 'kindergarten') emoji = '👶';
  else if (cat === 'playground') emoji = '🎮';
  else if (cat === 'zoo') emoji = '🦁';
  else if (cat === 'park') emoji = '🌳';
  else if (cat === 'food') emoji = '🍽️';
  else if (cat === 'shop') emoji = '🛒';
  else if (cat === 'secret') emoji = '🔮';
  else if (cat === 'museum') emoji = '🏛️';
  else if (cat === 'theater') emoji = '🎭';
  else if (cat === 'monument') emoji = '🗿';
  else if (cat === 'cinema') emoji = '🎬';
  else if (cat === 'sport') emoji = '🏟️';
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
      <div style="display:flex;flex-direction:column;gap:4px;margin-top:8px">
        ${pt.linked ? `<button class="poi-link-btn" data-linked="${pt.linked}" style="padding:6px;border:none;border-radius:6px;background:#1a237e;color:#fff;cursor:pointer;font-size:11px;font-weight:bold">✅ Показать в плане</button>` : ''}
        ${pt.streetViewUrl ? `<a href="${pt.streetViewUrl}" target="_blank" rel="noopener noreferrer" class="poi-streetview-btn" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:6px;border-radius:6px;background:#e91e63;color:#fff;text-decoration:none;font-size:11px;font-weight:bold;box-shadow:0 2px 5px rgba(233,30,99,0.3)">👁️ Посмотреть в Street View</a>` : ''}
      </div>
    </div>
  `, { maxWidth: 280 });
  marker._poiCat = pt.category;
  marker._pt = pt;
  marker._poiEmoji = emoji;
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

// POI reest list
function buildPoiReestr() {
  const listEl = document.getElementById('poi-reestr-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  MAP_POINTS.forEach(pt => {
    const item = document.createElement('div');
    item.className = 'poi-reestr-item';
    const marker = poiMarkers.find(m => m._pt === pt);
    item.textContent = (marker ? marker._poiEmoji : '📍') + ' ' + pt.name;
    item.addEventListener('click', () => {
      map.setView(pt.coords, 14);
      if (marker) marker.openPopup();
    });
    listEl.appendChild(item);
  });
}
buildPoiReestr();

document.getElementById('poi-reestr-toggle')?.addEventListener('click', () => {
  document.getElementById('poi-reestr-list')?.classList.toggle('hidden');
  document.getElementById('poi-reestr-arrow')?.classList.toggle('open');
});

// === DISTRICT POLYGONS ===
const polygons = {};
const labelMarkers = {};
let activePreset = 'family';
let urbanHide = true;

function getScore(d, preset) {
  if (preset === 'budget') return d.budgetScore;
  if (preset === 'vibe') return d.vibeScore;
  return d.familyScore;
}

function scoreColor(score) {
  if (score >= 9) return '#1b5e20';
  if (score >= 7) return '#43a047';
  if (score >= 5) return '#fbc02d';
  if (score >= 3) return '#f57c00';
  return '#d32f2f';
}

function scoreBg(score) {
  if (score >= 9) return '#e8f5e9';
  if (score >= 7) return '#e8f5e9';
  if (score >= 5) return '#fffde7';
  if (score >= 3) return '#fff3e0';
  return '#ffebee';
}

function getNormalizedScore(d, preset, visibleDistricts) {
  if (!visibleDistricts || visibleDistricts.length <= 1) return getScore(d, preset);
  const scores = visibleDistricts.map(vd => getScore(vd, preset));
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  if (max === min) return 5;
  const raw = getScore(d, preset);
  return Math.round(1 + ((raw - min) / (max - min)) * 9);
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
  const visible = urbanHide ? DISTRICTS.filter(d => d.isUrban) : [...DISTRICTS];
  DISTRICTS.forEach(d => {
    const p = polygons[d.name];
    if (!p) return;
    const sc = getNormalizedScore(d, preset, visible);
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
}

function updateLegend(preset) {
  let filtered = urbanHide ? DISTRICTS.filter(d => d.isUrban) : [...DISTRICTS];
  const sorted = filtered.sort((a, b) => getNormalizedScore(b, preset, filtered) - getNormalizedScore(a, preset, filtered));
  const listEl = document.getElementById('legend-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const legendBar = document.createElement('div');
  legendBar.className = 'legend-score-bar';
  legendBar.innerHTML = '<span>Лучше</span><span class="legend-grad-drop"></span><span>Хуже</span>';
  listEl.appendChild(legendBar);

  const emoji = presetEmoji(preset);
  sorted.forEach((d, i) => {
    const sc = getNormalizedScore(d, preset, filtered);
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
      document.getElementById('legend-arrow')?.classList.remove('open');
    });
    listEl.appendChild(row);
  });
  document.getElementById('legend-toggle').innerHTML =
    `🏆 Рейтинг <span id="legend-arrow">▶</span>`;
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

let activeSubDistrictLayers = L.layerGroup().addTo(map);

function highlightDistrict(name) {
  activeSubDistrictLayers.clearLayers();

  Object.keys(polygons).forEach(k => {
    const p = polygons[k];
    const d = DISTRICTS.find(x => x.name === k);
    if (urbanHide && d && !d.isUrban) {
      p.setStyle({ fillOpacity: 0, weight: 0, opacity: 0, interactive: false });
    } else if (k === name) {
      p.setStyle({ fillOpacity: 0.65, weight: 4, opacity: 1, interactive: true });
    } else {
      p.setStyle({ fillOpacity: 0.05, weight: 1, opacity: 0.2, interactive: true });
    }
  });

  const p = polygons[name];
  if (p) {
    const size = map.getSize();
    map.fitBounds(p.getBounds(), {
      paddingTopLeft: [20, 20],
      paddingBottomRight: [20, size.y * 0.4],
      maxZoom: 14,
    });
  }

  const subs = SUB_DISTRICTS.filter(s => s.parent === (DISTRICT_LATIN[name] || name));
  subs.forEach(sub => {
    const subPoly = L.polygon(sub.coords, {
      color: '#ffffff',
      dashArray: '5, 5',
      fillColor: '#673ab7',
      fillOpacity: 0.25,
      weight: 2,
    });
    subPoly.bindTooltip(`<div style="font-family:sans-serif;padding:4px"><strong style="color:#673ab7;font-size:13px">${sub.name}</strong><br><span style="font-size:11px;color:#555">${sub.desc}</span></div>`, { permanent: false, sticky: true });
    activeSubDistrictLayers.addLayer(subPoly);

    const slats = sub.coords.map(c => c[0]);
    const slons = sub.coords.map(c => c[1]);
    const cx = (Math.min(...slats) + Math.max(...slats)) / 2;
    const cy = (Math.min(...slons) + Math.max(...slons)) / 2;
    const labelMarker = L.marker([cx, cy], {
      icon: L.divIcon({
        html: `<div style="text-shadow:0 0 4px #fff, 0 0 4px #fff;font-weight:bold;color:#4a148c;font-size:11px;text-align:center;transform:translate(-50%,-50%)">${sub.name}</div>`,
        iconSize: [100, 20],
        iconAnchor: [50, 10],
        className: 'sub-district-label',
      }),
      interactive: false,
    });
    activeSubDistrictLayers.addLayer(labelMarker);
  });

  if (window.arrowMarker) { map.removeLayer(window.arrowMarker); window.arrowMarker = null; }
  const d = DISTRICTS.find(x => x.name === name);
  if (d && d.coords && d.coords.length > 0) {
    const lats = d.coords.map(c => c[0]);
    const lons = d.coords.map(c => c[1]);
    const cx = (Math.min(...lats) + Math.max(...lats)) / 2;
    const cy = (Math.min(...lons) + Math.max(...lons)) / 2;
    window.arrowMarker = L.marker([cx, cy], {
      icon: L.divIcon({
        html: '<div class="map-pulse-ring"></div><div class="map-pulse-dot"></div>',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: 'pulse-marker',
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
  if (activeSubDistrictLayers) activeSubDistrictLayers.clearLayers();
  updateMapColors(activePreset);
});

map.on('zoomend', () => {
  const zoom = map.getZoom();
  DISTRICTS.forEach(d => {
    const marker = labelMarkers[d.name];
    if (!marker) return;
    if (zoom < 11 || (urbanHide && !d.isUrban)) {
      if (map.hasLayer(marker)) map.removeLayer(marker);
    } else {
      if (!map.hasLayer(marker)) map.addLayer(marker);
    }
  });
});

function showDistrictPanel(d, noFit) {
  if (!document.getElementById('d-name')) return;
  document.getElementById('d-name').textContent = d.name;
  // Carousel gallery & Lightbox
  const gallery = document.getElementById('d-gallery');
  gallery.innerHTML = '';

  let captionContainer = document.getElementById('d-gallery-caption');
  if (!captionContainer) {
    captionContainer = document.createElement('div');
    captionContainer.id = 'd-gallery-caption';
    captionContainer.className = 'carousel-caption';
    gallery.parentNode.insertBefore(captionContainer, gallery.nextSibling);
  }
  captionContainer.textContent = '';

  let dotsContainer = document.getElementById('d-gallery-dots');
  if (!dotsContainer) {
    dotsContainer = document.createElement('div');
    dotsContainer.id = 'd-gallery-dots';
    dotsContainer.className = 'carousel-dots';
    gallery.parentNode.insertBefore(dotsContainer, captionContainer);
  }
  dotsContainer.innerHTML = '';

  if (d.images && d.images.length) {
    const frag = document.createDocumentFragment();
    d.images.forEach((imgObj, idx) => {
      const url = typeof imgObj === 'string' ? imgObj : imgObj.url;
      const title = typeof imgObj === 'string' ? '' : (imgObj.title || '');

      const img = document.createElement('img');
      img.dataset.idx = idx;
      img.loading = 'lazy';
      img.src = url;
      img.className = 'carousel-slide';
      img.dataset.caption = title;
      img.addEventListener('click', () => openLightbox(url, title));
      img.onerror = function() {
        this.onerror = null;
        const ph = document.createElement('div');
        ph.className = 'img-placeholder carousel-slide';
        ph.textContent = d.name;
        this.parentNode.replaceChild(ph, this);
      };
      frag.appendChild(img);

      const dot = document.createElement('span');
      dot.className = 'carousel-dot' + (idx === 0 ? ' active' : '');
      dot.addEventListener('click', () => {
        gallery.scrollTo({ left: img.offsetLeft, behavior: 'smooth' });
      });
      dotsContainer.appendChild(dot);
    });
    gallery.appendChild(frag);

    const firstImg = d.images[0];
    captionContainer.textContent = typeof firstImg === 'string' ? '' : (firstImg.title || '');
  } else {
    const ph = document.createElement('div');
    ph.className = 'img-placeholder carousel-slide';
    ph.style.cssText = 'display:flex;align-items:center;justify-content:center;height:150px;color:#999;font-size:14px;';
    ph.textContent = '📷 Нет фото';
    gallery.appendChild(ph);
    captionContainer.textContent = '';
  }

  gallery.onscroll = () => {
    const scrollPos = gallery.scrollLeft;
    const width = gallery.clientWidth;
    if (width <= 0) return;
    const activeIdx = Math.round(scrollPos / width);
    const dots = dotsContainer.querySelectorAll('.carousel-dot');
    dots.forEach((dot, idx) => {
      dot.classList.toggle('active', idx === activeIdx);
    });
    const slides = gallery.querySelectorAll('.carousel-slide');
    if (slides[activeIdx]) {
      captionContainer.textContent = slides[activeIdx].dataset.caption || '';
    }
  };

  const prevBtn = document.getElementById('car-prev');
  const nextBtn = document.getElementById('car-next');
  if (prevBtn && nextBtn) {
    prevBtn.onclick = () => gallery.scrollBy({ left: -gallery.clientWidth, behavior: 'smooth' });
    nextBtn.onclick = () => gallery.scrollBy({ left: gallery.clientWidth, behavior: 'smooth' });
  }

  let startX = 0, startY = 0;
  gallery.ontouchstart = e => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; };
  gallery.ontouchend = e => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy)) {
      gallery.scrollBy({ left: dx > 0 ? -gallery.clientWidth : gallery.clientWidth, behavior: 'smooth' });
    }
  };
  document.getElementById('d-price').textContent = d.price;
  const visible = urbanHide ? DISTRICTS.filter(x => x.isUrban) : [...DISTRICTS];
  const fs = getNormalizedScore(d, 'family', visible);
  const bs = getNormalizedScore(d, 'budget', visible);
  const vs = getNormalizedScore(d, 'vibe', visible);
  document.getElementById('d-score').innerHTML = `
    <div class="score-cards-container">
      <div class="score-card">
        <span class="sc-emoji">👶</span>
        <div class="sc-info">
          <span class="sc-label">С детьми</span>
          <div class="sc-bar-wrap"><div class="sc-bar family" style="width:${fs*10}%"></div></div>
        </div>
        <span class="sc-num">${fs}</span>
      </div>
      <div class="score-card">
        <span class="sc-emoji">💰</span>
        <div class="sc-info">
          <span class="sc-label">Бюджет</span>
          <div class="sc-bar-wrap"><div class="sc-bar budget" style="width:${bs*10}%"></div></div>
        </div>
        <span class="sc-num">${bs}</span>
      </div>
      <div class="score-card">
        <span class="sc-emoji">⚡</span>
        <div class="sc-info">
          <span class="sc-label">Движ</span>
          <div class="sc-bar-wrap"><div class="sc-bar vibe" style="width:${vs*10}%"></div></div>
        </div>
        <span class="sc-num">${vs}</span>
      </div>
    </div>
  `;
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

function openLightbox(url, title) {
  let box = document.getElementById('lightbox-overlay');
  if (!box) {
    box = document.createElement('div');
    box.id = 'lightbox-overlay';
    box.className = 'lightbox-hidden';
    box.innerHTML = '<span class="lightbox-close">&times;</span><div class="lightbox-content-wrapper"><img id="lightbox-img" src="" alt="View"><div id="lightbox-caption" class="lightbox-caption-text"></div></div>';
    document.body.appendChild(box);
    box.addEventListener('click', (e) => {
      if (e.target.id === 'lightbox-overlay' || e.target.classList.contains('lightbox-close')) {
        box.className = 'lightbox-hidden';
      }
    });
  }
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox-caption').textContent = title || '';
  box.className = 'lightbox-visible';
}

function districtLabel(name, price, score) {
  let dotColor = score >= 8 ? '#43a047' : score >= 5 ? '#fbc02d' : '#d32f2f';
  return `<div class="map-price-badge"><span class="badge-status-dot" style="background-color:${dotColor}"></span><span class="badge-price">${price}</span></div>`;
}

function popupHTML(d) {
  const visible = urbanHide ? DISTRICTS.filter(x => x.isUrban) : [...DISTRICTS];
  const sc = getNormalizedScore(d, activePreset, visible);
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

  const initVisible = urbanHide ? DISTRICTS.filter(x => x.isUrban) : [...DISTRICTS];
  const initScore = getNormalizedScore(d, activePreset, initVisible);
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

  polygon.on('mouseover', () => {
    const marker = labelMarkers[d.name];
    if (marker) {
      const el = marker.getElement();
      if (el) {
        const badge = el.querySelector('.map-price-badge');
        if (badge) badge.classList.add('active');
      }
    }
  });
  polygon.on('mouseout', () => {
    const marker = labelMarkers[d.name];
    if (marker) {
      const el = marker.getElement();
      if (el) {
        const badge = el.querySelector('.map-price-badge');
        if (badge) badge.classList.remove('active');
      }
    }
  });

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

// === MICRO-DISTRICTS ===
const SUB_DISTRICTS = [
  { parent:"Vračar", name:"Savinac / Cvetni Trg", desc:"Элитное историческое ядро Врачара вокруг Храма Св. Саввы.", coords:[[44.8025,20.4655],[44.8005,20.4725],[44.7965,20.4695],[44.7985,20.4645]] },
  { parent:"Vračar", name:"Čubura", desc:"Богемный Врачар с узкими улочками и Чубурским парком.", coords:[[44.7995,20.4735],[44.7965,20.4835],[44.7925,20.4775],[44.7955,20.4715]] },
  { parent:"Vračar", name:"Crveni Krst", desc:"Тихий квартал, новые дома, Белградский драматический театр.", coords:[[44.7985,20.4835],[44.7955,20.4905],[44.7915,20.4845],[44.7945,20.4795]] },
  { parent:"Vračar", name:"Neimar", desc:"Зелёная вилловая зона, тихий семейный премиум на холме.", coords:[[44.7945,20.4655],[44.7935,20.4725],[44.7885,20.4695],[44.7905,20.4625]] },
  { parent:"Palilula", name:"Hadžipopovac", desc:"Старый уютный спальный район рядом со Старым градом.", coords:[[44.8145,20.4755],[44.8115,20.4865],[44.8075,20.4825],[44.8105,20.4715]] },
  { parent:"Palilula", name:"Profesorska Kolonija", desc:"Охраняемый памятник культуры, профессорские виллы в садах.", coords:[[44.8125,20.4825],[44.8095,20.4895],[44.8065,20.4855],[44.8085,20.4795]] },
  { parent:"Palilula", name:"Bogoslovija", desc:"Площадь Богословия, парк, ледовый дворец Пионер.", coords:[[44.8155,20.4885],[44.8155,20.4955],[44.8105,20.4955],[44.8095,20.4885]] },
  { parent:"Stari Grad", name:"Dorćol", desc:"Культовый район: нижний — модный у Дуная, верхний — исторический.", coords:[[44.8295,20.4535],[44.8215,20.4695],[44.8195,20.4585],[44.8235,20.4485]] },
  { parent:"Stari Grad", name:"Kosančićev Venac", desc:"Самая старая часть Белграда, брусчатка, вид на Саву.", coords:[[44.8185,20.4485],[44.8165,20.4525],[44.8135,20.4495],[44.8155,20.4445]] },
  { parent:"Novi Beograd", name:"Savski Blokovi (44, 45, 70)", desc:"Зелёные советские блоки у Савского Кея, рай для прогулок с детьми.", coords:[[44.7995,20.3755],[44.7915,20.3995],[44.7965,20.4045],[44.8045,20.3805]] },
  { parent:"Novi Beograd", name:"Bežanijska Kosa", desc:"Возвышенность с таунхаусами, частными школами и садами.", coords:[[44.8185,20.3655],[44.8085,20.3855],[44.8045,20.3755],[44.8145,20.3555]] }
];

const DISTRICT_LATIN = { "Врачар":"Vračar", "Палилула":"Palilula", "Стари Град":"Stari Grad", "Нови Београд":"Novi Beograd" };

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
  if (activeSubDistrictLayers) activeSubDistrictLayers.clearLayers();
  if (window.arrowMarker) { map.removeLayer(window.arrowMarker); window.arrowMarker = null; }
  updateMapColors(activePreset);
  map.setView([44.76, 20.48], 11);
});

// === LEGEND DROPDOWN ===
const listEl = document.getElementById('legend-list');
document.getElementById('legend-toggle')?.addEventListener('click', () => {
  listEl.classList.toggle('hidden');
  const arrow = document.getElementById('legend-arrow');
  if (arrow) {
    const isHidden = listEl.classList.contains('hidden');
    arrow.textContent = isHidden ? '▶' : '▼';
  }
});

updateLegend(activePreset);
setTimeout(() => updateUrbanFilter(true), 100);
setTimeout(() => map.fire('zoomend'), 200);

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

document.getElementById('poi-toggle-all')?.addEventListener('change', (e) => {
  const on = e.target.checked;
  document.querySelectorAll('[data-poi-cat]').forEach(cb => {
    cb.checked = on;
    const cat = cb.dataset.poiCat;
    poiMarkers.forEach(m => {
      if (m._poiCat === cat) {
        if (on) poiLayer.addLayer(m);
        else poiLayer.removeLayer(m);
      }
    });
  });
});

const masterTimeline = [
  {
    month: 0,
    title: "Месяц 0: Подготовка в Москве",
    focus: "Сбор документов, которые невозможно получить за границей, подготовка здоровья и аптечки",
    tasks: [
      { 
        id: "p10", 
        name: "Загранпаспорт мужа (10 лет)", 
        cost: 6000, 
        currency: "RUB", 
        desc: "Оформить биометрический паспорт нового образца", 
        tip: "<p><b>Где делать:</b> Подать заявление через <a href='https://www.gosuslugi.ru/600101/1/form' target='_blank' rel='noopener noreferrer'>Госуслуги РФ</a> или в районном МФЦ 'Мои Документы'. Обязательно выбирайте биометрический паспорт на 10 лет (с чипом).</p><p><b>Документы с собой на подачу:</b> Внутренний паспорт РФ, действующий загранпаспорт (при наличии), военный билет или справка по форме 32 (для мужчин до 30 лет), цифровое фото для анкеты (на месте в МФЦ сделают физическое биометрическое фото в кабине).</p><p><b>Сроки:</b> Строго 1 месяц при подаче по месту регистрации (прописке) и до 3 месяцев при подаче по месту пребывания (без прописки).</p><p><b>Пошлина:</b> 6 000 руб. согласно ст. 333.28 НК РФ.</p><p><b>⚠️ Подводный камень:</b> Обязательно делайте именно 10-летний паспорт. В отличие от 5-летнего, в него можно вписать сербские ВНЖ-наклейки (бороваки) на много лет вперед, и его гораздо охотнее принимают местные банки при открытии долгосрочных бизнес-счетов.</p><p><b>💡 Банковский лайфхак:</b> Делайте строго 10-летний паспорт. Местные банки (особенно Raiffeisen и OTP) крайне неохотно открывают счета для ИП по 5-летним паспортам, так как срок действия документа должен с запасом перекрывать потенциальные долгосрочные контракты.</p>", 
        hasDate: true, 
        expires: 120 
      },
      { 
        id: "p5w", 
        name: "Загранпаспорт жены (10 лет)", 
        cost: 6000, 
        currency: "RUB", 
        desc: "Оформить биометрический паспорт нового образца", 
        tip: "<p><b>Где делать:</b> Подать заявление через <a href='https://www.gosuslugi.ru/600101/1/form' target='_blank' rel='noopener noreferrer'>Госуслуги РФ</a> или МФЦ.</p><p><b>⚠️ Важнейший нюанс транслитерации:</b> При заполнении заявления проверьте автоматическую латинскую транслитерацию имени и фамилии. Она должна буква в букву совпадать с написанием в свидетельстве о браке (если менялась фамилия) и в паспорте мужа. Расхождение даже в одну букву (например, Iia vs Iya или Evgeniia vs Evgeniya) создаст колоссальные проблемы в Сербии при оформлении ВНЖ по воссоединению семьи (Spajanje porodice).</p><p><b>Пошлина:</b> 6 000 руб.</p>", 
        hasDate: true, 
        expires: 120 
      },
      { 
        id: "p5d", 
        name: "Загранпаспорт ребёнка (5 лет)", 
        cost: 1000, 
        currency: "RUB", 
        desc: "Обычный паспорт старого образца на 5 лет", 
        tip: "<p><b>Где делать:</b> Подать заявление на паспорт старого образца (без биометрии) для ребенка до 14 лет через <a href='https://www.gosuslugi.ru/600101/1/form' target='_blank' rel='noopener noreferrer'>Госуслуги РФ</a> или МФЦ.</p><p><b>Почему старого образца:</b> Маленькие дети быстро растут и внешне меняются. Граничная полиция Сербии или РФ может придраться к биометрическому паспорту, выданному младенцу 3 года назад. Паспорт старого образца делается быстрее (зачастую за 1.5–2 недели) и стоит дешевле.</p><p><b>Пошлина:</b> 1 000 руб. (согласно ст. 333.28 НК РФ).</p><p><b>⚠️ Критическое условие:</b> Для подачи заявления на свидетельство о рождении ребенка в обязательном порядке должен быть нанесен официальный штамп о гражданстве РФ (красная печать МВД на обороте).</p>", 
        hasDate: true, 
        expires: 60 
      },
      { 
        id: "stamp", 
        name: "Штамп о гражданстве РФ на свидетельство о рождении", 
        cost: 0, 
        currency: "RUB", 
        desc: "Красная печать МВД на обратной стороне свидетельства", 
        tip: "<p><b>Где делать:</b> В районном отделении МВД по вопросам миграции (бывший УФМС) по месту жительства или регистрации родителя. Найти контакты своего отделения можно на <a href='https://мвд.рф/mvd/structure1/Glavnie_upravlenija/guvm' target='_blank' rel='noopener noreferrer'>официальном сайте ГУВМ МВД РФ</a>.</p><p><b>С собой иметь:</b> Оригинал свидетельства о рождении ребенка, оригиналы паспортов РФ обоих родителей + их качественные копии (первая страница и прописка).</p><p><b>Срок и стоимость:</b> Ставится абсолютно бесплатно в день обращения. Обычно занимает от 15 до 30 минут прямо при вас.</p><p><b>⚠️ Почему это приоритет №1:</b> Без этой красной печати на обороте свидетельства вашему ребенку легально откажут в оформлении загранпаспорта, а также не выпустят из РФ на паспортном контроле.</p>" 
      },
      { 
        id: "nocrim_h", 
        name: "Справка о несудимости (муж)", 
        cost: 0, 
        currency: "RUB", 
        desc: "Заказать электронную версию с ЭЦП МВД", 
        tip: "<p><b>Где делать:</b> Заказать строго в электронном виде на портале <a href='https://www.gosuslugi.ru/600103/1/form' target='_blank' rel='noopener noreferrer'>Госуслуг РФ</a>. В графе 'Способ получения' выберите 'Электронный документ, подписанный усиленной квалифицированной электронной подписью (ЭЦП)' сотрудника МВД.</p><p><b>Срок:</b> От 1 до 5 рабочих дней (в разы быстрее бумажной версии, которая может изготавливаться до 30 дней).</p><p><b>Юридический щит:</b> Между РФ и Сербией продолжает действовать Договор между СССР и ФНРЮ о правовой помощи от 24.02.1962 (опубликован на <a href='https://www.mid.ru/ru/foreign_policy/international_contracts/international_contracts/2_contract/53462/' target='_blank' rel='noopener noreferrer'>официальном портале МИД РФ</a>). Статья 15 договора официально освобождает документы с гербовыми печатями и цифровыми подписями ведомств от необходимости проставления Апостиля. Сербские судебные переводчики (sudski tumači) без проблем принимают распечатку электронной справки вместе с файлом цифровой подписи (.sig).</p>", 
        hasDate: true, 
        expires: 6 
      },
      { 
        id: "nocrim_w", 
        name: "Справка о несудимости (жена)", 
        cost: 0, 
        currency: "RUB", 
        desc: "Заказать электронную версию с ЭЦП МВД", 
        tip: "<p><b>Где делать:</b> Точно так же заказать электронную справку с ЭЦП через <a href='https://www.gosuslugi.ru/600103/1/form' target='_blank' rel='noopener noreferrer'>Госуслуги РФ</a>.</p><p><b>Зачем она нужна жене:</b> Справка обязательна для получения ВНЖ. Даже если жена подается по воссоединению семьи с вашим будущим ИП, сербское МВД (МУП) затребует подтверждение отсутствия судимости на территории РФ.</p><p><b>Срок действия:</b> Сербские органы принимают справку, если с момента ее выдачи в РФ прошло <b>не более 6 месяцев</b> на день подачи документов в Сербии.</p>", 
        hasDate: true, 
        expires: 6 
      },
      { 
        id: "apost_marr", 
        name: "Апостиль на свидетельство о браке", 
        cost: 2500, 
        currency: "RUB", 
        desc: "Пошлина за оригинал (рекомендуется как страховка)", 
        tip: "<p><b>Где делать:</b> В Главном управлении ЗАГС вашего региона (например, ЗАГС Московской области или Москвы) или через МФЦ 'Мои Документы'. Обратите внимание, что МФЦ выступает лишь посредником, поэтому срок увеличивается на 2-3 рабочих дня.</p><p><b>Срок:</b> 5 рабочих дней через ЗАГС напрямую.</p><p><b>Пошлина:</b> 2 500 руб. (согласно ст. 333.33 НК РФ, тарифы проверяйте на <a href='https://www.nalog.gov.ru' target='_blank' rel='noopener noreferrer'>сайте ФНС РФ</a>).</p><p><b>⚠️ Практическая правда:</b> Юридически апостиль не требуется благодаря соглашению 1962 года. Но на практике сербские инспекторы МУП (особенно в небольших общинах Белграда или Нови-Сада) плохо знают международное право и могут 'по привычке' требовать апостилированный оригинал свидетельства о браке для одобрения ВНЖ по воссоединению. Поставьте его, чтобы избежать долгих споров в полиции.</p>" 
      },
      { 
        id: "apost_birth", 
        name: "Апостиль на свидетельство о рождении ребёнка", 
        cost: 2500, 
        currency: "RUB", 
        desc: "Пошлина за оригинал (рекомендуется для школы/сада)", 
        tip: "<p><b>Где делать:</b> В архиве ЗАГС по месту регистрации рождения ребенка или через МФЦ.</p><p><b>Срок:</b> 5–7 рабочих дней.</p><p><b>Пошлина:</b> 2 500 руб.</p><p><b>Зачем:</b> Свидетельство о рождении с апостилем потребуется не только для оформления ВНЖ ребенку в полиции <a href='https://mup.gov.rs' target='_blank' rel='noopener noreferrer'>МВД Сербии</a>, но и для обязательной процедуры нострификации школьных документов или при зачислении в государственный детский сад, где требования департаментов образования гораздо жестче, чем в миграционной полиции.</p>" 
      },
      { 
        id: "apost_nocrim_h", 
        name: "Апостиль на справку о несудимости (муж)", 
        cost: 2500, 
        currency: "RUB", 
        desc: "Пошлина за оригинал для справки мужа", 
        tip: "<p><b>Зачем это нужно:</b> Хотя договор между СССР и ФНРЮ от 1962 года освобождает документы от апостиля, на практике инспекторы МУП (особенно в Белграде и Нови-Саде) часто плохо знают международное право. Они могут 'по привычке' требовать апостилированную справку. Наличие апостиля — ваша 100% страховка от субъективного фактора конкретного инспектора.</p>" 
      },
      { 
        id: "apost_nocrim_w", 
        name: "Апостиль на справку о несудимости (жена)", 
        cost: 2500, 
        currency: "RUB", 
        desc: "Пошлина за оригинал для справки жены", 
        tip: "<p><b>Зачем это нужно:</b> Хотя договор между СССР и ФНРЮ от 1962 года освобождает документы от апостиля, на практике инспекторы МУП (особенно в Белграде и Нови-Саде) часто плохо знают международное право. Они могут 'по привычке' требовать апостилированную справку. Наличие апостиля — ваша 100% страховка от субъективного фактора конкретного инспектора.</p>" 
      },
      { 
        id: "power", 
        name: "Генеральная доверенность в РФ на близкого", 
        cost: 2000, 
        currency: "RUB", 
        desc: "Оформить у нотариуса до отъезда из РФ", 
        tip: "<p><b>Где делать:</b> У любого нотариуса в РФ. Найти реестр аккредитованных нотариусов можно на портале <a href='https://notariat.ru' target='_blank' rel='noopener noreferrer'>Федеральной нотариальной палаты РФ</a>.</p><p><b>На кого оформлять:</b> На родителей, родных братьев/сестер или близких друзей, которые физически остаются в РФ.</p><p><b>Что обязательно включить в текст:</b> Право представлять интересы в ФНС (налоговой), банках (с правом закрытия счетов, перевыпуска карт, распоряжения сейфовыми ячейками), МФЦ, ЗАГС, Пенсионном фонде, почтовых отделениях (Почта России — для получения заказных писем и судебных повесток), право распоряжения движимым/недвижимым имуществом, право подачи любых заявлений и запросов, а также право передоверия.</p><p><b>Срок:</b> Оформляйте на 5 или 10 лет.</p>", 
        hasDate: true, 
        expires: 120 
      },
      { 
        id: "child_consent", 
        name: "Нотариальное согласие на выезд ребёнка", 
        cost: 2000, 
        currency: "RUB", 
        desc: "Оформить у нотариуса (если выезд раздельный)", 
        tip: "<p><b>Правила в РФ:</b> Согласно ст. 20 Федерального закона № 114-ФЗ 'О порядке выезда из РФ...', если ребенок едет с одним из родителей, согласие второго не требуется. Однако, правила пограничного контроля могут меняться, актуальные разъяснения публикуются на <a href='https://ps.fsb.ru' target='_blank' rel='noopener noreferrer'>официальном сайте Пограничной службы ФСБ РФ</a>.</p><p><b>⚠️ Важнейшее требование Сербии:</b> Независимо от законов РФ, сербское Управление по делам иностранцев МВД Сербии при рассмотрении дела о ВНЖ (бороваке) для ребенка <b>в обязательном порядке потребует</b> письменное нотариальное согласие от второго родителя на проживание ребенка в Сербии, если этот родитель не подается на ВНЖ одновременно с ним по тому же адресу. Оформите это согласие у нотариуса в РФ заранее, чтобы не платить сотни евро за консульское заверение в Белграде.</p>" 
      },
      { 
        id: "dentist", 
        name: "Пройти стоматологов всей семьёй в РФ", 
        cost: 0, 
        currency: "RUB", 
        desc: "Санация полости рта перед отъездом", 
        tip: "<p><b>Почему это критично:</b> Государственное медицинское страхование в Сербии (здравственная книжица) покрывает для взрослых исключительно экстренное удаление зубов или неотложную помощь при острой боли. Любое плановое лечение (пломбы, чистка, каналы, протезирование) осуществляется только в частных клиниках за ваш счет. Цены на качественные стоматологические услуги в Белграде в среднем в 1.5–2 раза выше, чем в РФ. Пройдите полную санацию полости рта и сделайте панорамные снимки (ОПТГ) всех членов семьи перед вылетом.</p>" 
      },
      { 
        id: "pharm", 
        name: "Собрать аптечку с привычными лекарствами", 
        cost: 0, 
        currency: "RUB", 
        desc: "Запас необходимых препаратов на 3–6 месяцев", 
        tip: "<p><b>⚠️ Таможенный контроль:</b> Правила ввоза лекарств физическими лицами жестко регулируются. Ознакомьтесь с ограничениями на <a href='https://www.carina.rs' target='_blank' rel='noopener noreferrer'>официальном сайте Таможенной службы Сербии (Uprava carina)</a>.</p><p><b>Что собрать:</b> Специфические рецептурные препараты, которые вы принимаете на регулярной основе (с запасом на полгода), детские жаропонижающие (в Сербии тяжело найти некоторые привычные сиропы), антигистаминные средства, сорбенты. На все рецептурные лекарства обязательно возьмите бумажный рецепт от лечащего врача с печатью клиники и указанием Международного непатентованного наименования (МНН) активного вещества на латыни — это позволит сербскому фармацевту подобрать местный аналог.</p>" 
      },
      { 
        id: "med_vyps", 
        name: "Медицинские выписки при хронических заболеваниях", 
        cost: 0, 
        currency: "RUB", 
        desc: "Медицинские карты и заключения на латыни (МНН)", 
        tip: "<p><b>Что сделать:</b> Запросите у своего терапевта или профильных врачей подробную выписку из медицинской карты. Все диагнозы должны быть указаны в соответствии с международной классификацией болезней (МКБ-10/11). Заключения, схемы лечения и названия действующих медицинских веществ должны быть прописаны на латыни (МНН). Это необходимо для того, чтобы сербские терапевты в государственных Dom Zdravlja могли мгновенно выписать вам нужные рецепты на территории Сербии без прохождения повторной дорогостоящей диагностики.</p>" 
      },
      { 
        id: "airbnb_book", 
        name: "Забронировать отель на Airbnb", 
        cost: 0, 
        currency: "RUB", 
        desc: "Забронировать жильё через Airbnb на 30+ дней", 
        tip: "<p>Бронируйте апартаменты заранее, за 2–3 недели до вылета. Выбирайте жильё на срок от 28–30 дней — это автоматически активирует долгосрочные скидки Airbnb (до 40–50%).</p><p><b>⚠️ Важно:</b> Напишите владельцу в чате: <i>'Da li možete da nam uradite beli karton u policiji u roku od 24 sata?'</i> (Можете ли вы оформить нам белый картон в полиции в течение 24 часов?). Если отказывается — отменяйте бронь.</p>" 
      },
      { 
        id: "ticket_buy", 
        name: "Купить авиабилеты для всей семьи", 
        cost: 120000, 
        currency: "RUB", 
        desc: "Авиабилеты Москва — Белград", 
        tip: "<p>Покупайте билеты заранее, за 1–2 месяца до вылета — так цены значительно ниже. Рекомендуем прямые рейсы Air Serbia из Шереметьево. На каждого пассажира берите тариф с багажом (23 кг) и ручной кладью (8 кг).</p><p><b>Совет:</b> Оформляйте билеты на всех членов семьи в одном бронировании, чтобы гарантировать места рядом в салоне.</p>" 
      },
      { 
        id: "diplomas", 
        name: "Подготовка оригиналов дипломов для Сербии", 
        cost: 0, 
        currency: "RUB", 
        desc: "Взять оригиналы дипломов и вкладышей. Нотариальные копии в РФ делать НЕ нужно.", 
        tip: "<p><b>⚠️ Важнейшее юридическое предупреждение:</b> Не тратьте деньги на нотариальное заверение копий дипломов или их перевод в России. Сербское Агентство по квалификациям (AZK) при нострификации принимает переводы <b>исключительно от сербских судебных переводчиков (sudski tumači)</b>.</p><p><b>Что нужно сделать в РФ:</b> Просто найдите и возьмите с собой физические оригиналы дипломов и всех вкладышей с оценками. Убедитесь, что все печати читаемы.</p><p><b>Что будет происходить в Белграде:</b> Вы отдадите оригиналы местному судебному переводчику, он сделает официальный перевод на сербский язык, и именно эти сканы (оригинал + сербский судебный перевод) вы загрузите на онлайн-портал AZK.</p>" 
      },
      { 
        id: "driving_licenses", 
        name: "Подготовка оригиналов водительских удостоверений", 
        cost: 0, 
        currency: "RUB", 
        desc: "Взять оригиналы ВУ всех членов семьи для обмена в Сербии", 
        tip: "<p><b>🚗 Как работают права в Сербии (Развеиваем мифы):</b></p><p><b>1. Пока вы туристы (до получения ВНЖ):</b> Ваши российские пластиковые права полностью легальны с первого дня прилёта. Вы можете спокойно арендовать машины, покупать своё авто и водить без ограничений. Никаких 'международных книжек' или сербских переводов на этом этапе полиция не требует.</p><p><b>2. Как только получили ВНЖ:</b> Вы официально становитесь временным резидентом Сербии. С этого дня сербский Закон о безопасности дорожного движения (ст. 178) запускает счётчик на <b>6 месяцев</b>. В течение этого полугода вы всё ещё можете ездить по российским правам.</p><p><b>3. Ровно через 6 месяцев после ВНЖ:</b> Ваши российские права на территории Сербии полностью теряют силу. Езда по ним приравнивается к вождению вообще без прав (штраф от 20 000 до 40 000 динар). К этому моменту их нужно физически обменять на сербские национальные права в Дорожной полиции (Saobraćajna policija).</p><p><b>📋 Что конкретно нужно будет сделать в Сербии за эти 6 месяцев (это заложено в Месяце 4 вашего плана):</b></p><p>— <b>Шаг 1:</b> Сделать перевод российских прав у местного судебного переводчика (sudski tumač).</p><p>— <b>Шаг 2:</b> Пройти сербскую медкомиссию (Lekarski pregled za vozače) в государственной или частной поликлинике (например, в Dom Zdravlja или MediGroup) и получить справку <i>Lekarsko uverenje</i>. Никаких сложных обследований, стандартный быстрый осмотр.</p><p>— <b>Шаг 3:</b> Оплатить государственные пошлины (таксы) МУП за выпуск пластика.</p><p>— <b>Шаг 4:</b> Сдать все документы в Дорожную полицию (Saobraćajna policija). Российские права при этом забирают и отправляют в архив, а взамен выдают сербские.</p><p><b>⚠️ Важное предупреждение по легализации:</b> Не делайте никаких переводов или заверений ВУ в России! Сербская полиция не примет печати российских нотариусов. Все шаги по переводу и медкомиссии делаются строго в Белграде, когда у вас уже будет ВНЖ.</p><p><b>Что сделать сейчас:</b> Просто найдите и положите в документы оригиналы пластиковых удостоверений всех членов семьи, кто водит. Обязательно сфотографируйте их с двух сторон и закиньте в облако на случай утери оригиналов.</p>" 
      }
    ]
  },
  {
    month: 1,
    title: "Месяц 1: Прилет и ВНЖ «Талант»",
    focus: "Перелет, адаптация на Airbnb, подача на первый ВНЖ и нострификация диплома",
    tasks: [
      { 
        id: "m1_flight", 
        name: "Прямой перелет Air Serbia (3 чел. с багажом)", 
        cost: 0, 
        currency: "EUR", 
        desc: "Рейс Москва — Белград", 
        tip: "<p>Прямые беспересадочные рейсы осуществляет национальный перевозчик Сербии <a href='https://www.airserbia.com' target='_blank' rel='noopener noreferrer'>Air Serbia</a> из аэропорта Шереметьево (SVO) в аэропорт Никола Тесла (BEG) Белграда.</p><p><b>Правила багажа:</b> Стандартный тариф обычно включает 1 место багажа весом до 23 кг и ручную кладь до 8 кг на каждого пассажира. Внимательно проверяйте габариты ручной клади перед вылетом на сайте авиакомпании — сербские стойки регистрации часто заставляют помещать сумки в калибраторы.</p>" 
      },
      { 
        id: "m1_airbnb", 
        name: "Заселение в жилье Airbnb (1-й месяц)", 
        cost: 950, 
        currency: "EUR", 
        desc: "Временное жилье с обязательной регистрацией владельцем", 
        tip: "<p>Бронируйте апартаменты на <a href='https://www.airbnb.com' target='_blank' rel='noopener noreferrer'>Airbnb</a> на срок от 28–30 дней — это автоматически активирует долгосрочные скидки сервиса (до 40-50%).</p><p><b>⚠️ Самое главное условие:</b> До совершения оплаты напишите владельцу квартиры в чате: <i>'Da li možete da nam uradite beli karton u policiji u roku od 24 sata?'</i> (Можете ли вы оформить нам белый картон в полиции в течение 24 часов?). Если хост сомневается, отказывается или предлагает вам сделать это самостоятельно — отменяйте бронь. Без белого картона вы будете находиться в Сербии нелегально.</p>" 
      },
      { 
        id: "reg", 
        name: "Белый картон (Beli karton) — регистрация", 
        cost: 0, 
        currency: "EUR", 
        desc: "Оформление регистрации по адресу в течение 24 часов", 
        tip: "<p><b>Что это:</b> Официальный документ, подтверждающий регистрацию иностранца по месту пребывания в Сербии. Регулируется Законом об иностранцах.</p><p><b>Как оформить:</b> Владелец жилья (хозяин) обязан в течение 24 часов с момента вашего въезда зарегистрировать вас лично в местном отделении полиции (Stanica policije) по месту нахождения квартиры, либо сделать это удаленно через государственную систему <a href='https://etourist.gov.rs' target='_blank' rel='noopener noreferrer'>eTurista</a>.</p><p><b>⚠️ Что проверить на бумаге:</b> Если хост регистрирует вас онлайн, он распечатает вам лист формата А4 из системы eTurista. Внимательно проверьте правильность написания номеров ваших загранпаспортов, имен и дат рождения. Ошибка в одну цифру сделает этот документ недействительным для подачи на ВНЖ.</p>", 
        hasDate: true 
      },
      { 
        id: "sim", 
        name: "Сим-карта сербского оператора", 
        cost: 10, 
        currency: "EUR", 
        desc: "Prepaid-пакет в любом киоске", 
        tip: "<p><b>Где купить:</b> Зайдите в любой сетевой газетный киоск (Moj Kiosk) или фирменный салон оператора. Попросите prepaid-карту (на сербском: 'pripejd kartica'). Паспорт для покупки предоплаченного пакета не требуется.</p><p><b>Какого оператора выбрать:</b> Основные игроки — Yettel, A1 и mts. Для быстрого старта рекомендуем туристические пакеты от <a href='https://www.yettel.rs' target='_blank' rel='noopener noreferrer'>Yettel</a> (например, 15–50 ГБ интернета на 15–30 дней за ~600-1000 RSD). Покрытие в Белграде у всех операторов отличное. После получения ВНЖ вы сможете переоформить эту карту на выгодный контракт (postpaid).</p>" 
      },
      { 
        id: "m1_trans_base", 
        name: "Судебный перевод личных документов", 
        cost: 120, 
        currency: "EUR", 
        desc: "Перевод справок о несудимости, свидетельств о браке и рождении у Sudski Tumač.", 
        tip: "<p><b>Физический шаг:</b> Найдите сертифицированного переводчика в Белграде, отдайте оригиналы документов из Месяца 0 (свидетельства, справки и ЭЦП-распечатки). Это базовый пакет для подачи на ВНЖ всей семьи. Переводы в РФ не принимаются — только местные sudski tumači.</p>" 
      },
      { 
        id: "m1_trans_diploma", 
        name: "Судебный перевод диплома и вкладыша", 
        cost: 80, 
        currency: "EUR", 
        desc: "Отдельный перевод диплома с оценками для Агентства по квалификациям (AZK).", 
        tip: "<p><b>Физический шаг:</b> Перевод диплома оплачивается и делается отдельно, так как вкладыш содержит большой объём текста. Перевод понадобится на следующем шаге для нострификации. Список переводчиков: <a href='https://www.mpravde.gov.rs' target='_blank'>Министерство юстиции Сербии</a>.</p>" 
      },
      { 
        id: "m1_trans_vax", 
        name: "Судебный перевод прививочной карты ребёнка", 
        cost: 30, 
        currency: "EUR", 
        desc: "Перевод российской формы 063/у на сербский язык для детского сада.", 
        tip: "<p><b>Физический шаг:</b> Переведите прививочную карту сейчас, в Месяце 1. Без этого перевода в Месяце 2 частный или государственный сад на законных основаниях откажет в приёме ребёнка.</p>" 
      },
      { 
        id: "m1_azk_submit", 
        name: "Подача диплома на нострификацию в AZK", 
        cost: 64, 
        currency: "EUR", 
        desc: "Загрузка сканов и оплата пошлины 7 500 RSD на портале azk.gov.rs.", 
        tip: "<p><b>Куда подавать:</b> Заявление на профессиональное признание высшего образования (nostrifikacija) подается в электронном виде на портале <a href='https://azk.gov.rs/' target='_blank' rel='noopener noreferrer'>Агентства по квалификациям Сербии (AZK)</a>.</p><p><b>Что загрузить:</b> Скан загранпаспорта, оригинал диплома и приложения с оценками, а также их заверенные судебным переводчиком сербские переводы (из задачи m1_trans_diploma).</p><p><b>Пошлина и сроки:</b> 7 500 RSD. Срок рассмотрения — до 60 дней, для IT-специальностей быстрее (3–4 недели). Электронная квитанция о подаче — ваш легальный пропуск для получения ВНЖ 'Талант'.</p>" 
      },
      { 
        id: "m1_insurance", 
        name: "Медстраховки на 1 год (на троих)", 
        cost: 250, 
        currency: "EUR", 
        desc: "Локальный годовой полис для получения ВНЖ", 
        tip: "<p><b>Где оформлять:</b> Приобрести годовой страховой полис медицинского страхования для иностранцев можно в офисах крупных сербских страховых компаний. Наиболее лояльные цены и стандартные пакеты для ВНЖ предлагает государственная компания <a href='https://www.dunav.com' target='_blank' rel='noopener noreferrer'>Dunav Osiguranje</a>, а также компании Globos, Triglav и Generali.</p><p><b>Стоимость:</b> Около 80–100 € на взрослого человека в год. Полис для ребенка обойдется примерно в такую же сумму.</p><p><b>⚠️ Важно:</b> Этот полис является строго обязательным базовым документом для миграционной полиции. Проверьте, чтобы в полисе было четко прописано покрытие экстренной медицинской помощи (Urgentna medicinska pomoć) на сумму не менее 10 000 €.</p>", 
        hasDate: true, 
        expires: 12 
      },
      { 
        id: "m1_vnz_tax", 
        name: "Оплата пошлин МУП за Единое разрешение", 
        cost: 642, 
        currency: "EUR", 
        desc: "Физическая оплата пошлин (~22 000 RSD на человека) в кассе Pošta Srbije.", 
        tip: "<p><b>⚠️ Подводный камень:</b> Оплатить пошлины картой иностранного банка онлайн невозможно. Сгенерируйте квитанции на eUprava через систему Plati, распечатайте их, дойдите ногами до ближайшей Почты и оплатите наличными динарами. Сохраните бумажные чеки с мокрой печатью для загрузки на портал eUprava.<p><b>💶 Обратите внимание:</b> Помимо основной пошлины за рассмотрение дела (~22 000 RSD), МУП Сербии взимает отдельный сбор за изготовление самой физической пластиковой ID-карты Единого разрешения. Это еще около ~5 000 RSD (~42 €) на человека, которые нужно будет оплатить перед получением карты.</p></p>" 
      },
      { 
        id: "m1_vnz_submit", 
        name: "Электронная подача на ВНЖ «Талант» на eUprava", 
        cost: 0, 
        currency: "EUR", 
        desc: "Загрузка полного пакета документов и чеков на государственном портале.", 
        tip: "<p><b>Как подавать:</b> Оформление Единого разрешения (Jedinstvena dozvola) происходит полностью в электронном виде через портал <a href='https://euprava.gov.rs' target='_blank' rel='noopener noreferrer'>eUprava Сербии</a>. В личном кабинете прикрепите сканы белых картонов, страховок, переводов личных документов, справки из AZK и чеков с почты. Отправьте заявление — сбор составляет около 22 000 RSD на человека (оплачен на предыдущем шаге).</p>" 
      },
      { 
        id: "m1_living", 
        name: "Еда, связь, базовый быт", 
        cost: 600, 
        currency: "EUR", 
        desc: "Первоначальные бытовые расходы", 
        tip: "<p><b>Ориентировочные траты на первый месяц для семьи из 3 человек:</b></p><p>— Покупка продуктов в сетевых супермаркетах (Maxi, Idea, Roda, Lidl) или на местных рынках (Zeleni Venac, Kalenić): ~450 €.</p><p>— Проездные билеты на общественный транспорт Белграда (система Beograd Plus, оплата по SMS или через мобильное приложение): ~30 €.</p><p>— Хозяйственные мелочи для временной квартиры (химия, средства гигиены): ~70 €.</p><p>— Мобильный интернет и связь: ~50 €.</p>" 
      },
      { 
        id: "m1_pediatrician", 
        name: "Осмотр ребёнка у педиатра для сада", 
        cost: 50, 
        currency: "EUR", 
        desc: "Медицинское заключение для зачисления в детский сад", 
        tip: "<p><b>Где делать:</b> Справку о здоровье ребенка (Potvrda o zdravstvenom stanju deteta) можно получить в любом филиале крупнейшей частной медицинской сети <a href='https://www.medigroup.rs' target='_blank' rel='noopener noreferrer'>MediGroup</a> или Euromedik. Запись к педиатру обычно возможна день в день.</p><p><b>Что с собой взять:</b> Загранпаспорт ребенка, его белый картон и переведенную судебным переводчиком на сербский язык российскую прививочную карту (форма 063/у).</p><p><b>⚠️ Срок действия справки:</b> Медицинское заключение педиатра действительно строго 30 дней с момента выдачи. Проходите осмотр непосредственно перед планируемым зачислением в сад.</p>" 
      }
    ]
  },
  {
    month: 2,
    title: "Месяц 2: Постоянное жилье и детский сад",
    focus: "Поиск долгосрочной квартиры и устройство дочки в садик",
    tasks: [
      { 
        id: "m2_rent", 
        name: "Аренда квартиры (1-й месяц)", 
        cost: 640, 
        currency: "EUR", 
        desc: "Двушка на долгий срок", 
        tip: "<p><b>Где искать:</b> Два главных легитимных ресурса — портал <a href='https://cityexpert.rs' target='_blank' rel='noopener noreferrer'>CityExpert</a> (на нем представлены квартиры от собственников, сервис полностью бесплатен для арендатора, все показы координируются менеджерами) и крупнейший сайт объявлений <a href='https://www.halooglasi.com/nekretnine/izdavanje-stanova/beograd' target='_blank' rel='noopener noreferrer'>HaloOglasi</a>.</p><p><b>⚠️ Критичные условия договора аренды (Ugovor o zakupu):</b></p><p>1. Договор должен быть заключен в письменной форме на срок не менее 1 года.</p><p>2. В тексте договора должен быть пункт: <i>'Zakupodavac je saglasan da zakupac može prijaviti boravište na adresi nepokretnosti'</i> (Арендодатель согласен, что арендатор может зарегистрировать место жительства по адресу недвижимости). Без этого полиция не примет ваш новый адрес для ВНЖ.</p><p>3. Договор желательно заверить у нотариуса (solenizacija договора) — это потребует уплаты пошлины нотариусу (около 100-150 €), но гарантирует вам 100% юридическую защиту от внезапного выселения.<p><b>⚠️ Нюанс с нотариусом:</b> Заверение договора у нотариуса (соленизация) накладывает на хозяина налог в 20%, поэтому большинство неохотно идут на это. Для МУП при подаче на ВНЖ нотариус НЕ требуется — достаточно простого письменного договора с подписями и копии личной карты (Lična karta) собственника.</p><p><b>⚠️ Важнейший шаг на опережение:</b> Договариваясь об аренде, сразу подпишите у собственника письменное согласие на регистрацию вашего ИП (Preduzetnik) по этому адресу. Не откладывайте этот разговор на Месяц 3, чтобы не остаться без юридического адреса.</p><p><b>💶 Скрытый расход:</b> Договор аренды для подачи на ВНЖ в МУП должен быть переведен на сербский язык у судебного переводчика (sudski tumač). Заложите на это дополнительно ~30–50 €.</p><p><b>⚠️ Нюанс с нотариусом:</b> Заверение договора у нотариуса (соленизация) накладывает на хозяина налог в 20%, поэтому большинство неохотно идут на это. Для МУП при подаче на ВНЖ нотариус НЕ требуется — достаточно простого письменного договора с подписями и копии личной карты (Lična karta) собственника.</p></p>", 
        hasDate: true 
      },
      { 
        id: "m2_deposit", 
        name: "Залог хозяину квартиры (100%)", 
        cost: 600, 
        currency: "EUR", 
        desc: "Гарантийный депозит за сохранность имущества", 
        tip: "<p><b>Как это работает:</b> При подписании договора аренды хозяину выплачивается страховой депозит в размере одной месячной арендной платы. Этот депозит хранится у владельца и возвращается вам при выезде, если имуществу не нанесен ущерб.</p><p><b>⚠️ Важнейший совет:</b> В день заселения и подписания акта приема-передачи квартиры проведите тотальную фото- и видеофиксацию абсолютно всех углов, мебели, стен, бытовой техники и существующих дефектов (царапины на паркете, сколы плитки). Отправьте эти фото хозяину в мессенджере в этот же день, чтобы зафиксировать состояние жилья на момент въезда.</p>" 
      },
      { 
        id: "m2_agency", 
        name: "Комиссия риелтору (50%)", 
        cost: 300, 
        currency: "EUR", 
        desc: "Оплата услуг агентства недвижимости", 
        tip: "<p>Если вы нашли квартиру на HaloOglasi через риелтора, стандартная единоразовая комиссия агентства составит 50% от стоимости одного месяца аренды квартиры. Комиссия выплачивается строго в момент подписания договора аренды и передачи ключей. Никогда не платите риелторам до подписания официального договора.</p>" 
      },
      { 
        id: "m2_utility", 
        name: "Коммунальные услуги", 
        cost: 150, 
        currency: "EUR", 
        desc: "Оплата Infostan, электроэнергии и проводного интернета", 
        tip: "<p><b>Что входит в счета:</b></p><p>1. <b>Infostan:</b> Единый коммунальный счет за отопление, холодную воду, вывоз мусора и обслуживание дома. Управляется и администрируется компанией <a href='https://www.infostan.rs' target='_blank' rel='noopener noreferrer'>JKP Infostan Tehnologije</a>. Сумма зависит от площади и наличия центрального отопления (в среднем 60–120 €).</p><p>2. <b>Электроэнергия (EPS):</b> Оплачивается по счетчику. Электричество в Сербии дорогое, особенно при переходе в 'красную зону' потребления. Старайтесь включать бойлер и стиральную машину в часы ночного льготного тарифа (с 22:00 до 06:00).</p><p>3. <b>Интернет:</b> Провайдеры SBB, mts или Orion. Стоимость тарифа — около 25–35 € в месяц.</p>" 
      },
      { 
        id: "m2_kindergarten", 
        name: "Частный детский сад (1-й месяц)", 
        cost: 400, 
        currency: "EUR", 
        desc: "Оплата сербского частного детского сада", 
        tip: "<p><b>Как проверить лицензию:</b> Сверьте статус аккредитации и наличие действующей лицензии у выбранного частного сада на портале <a href='https://www.beograd.rs' target='_blank' rel='noopener noreferrer'>Секретариата по образованию города Белграда</a>. Наличие лицензии критично: только лицензированные частные сады имеют право участвовать в программе городских субсидий (subvencije), по которой город возвращает родителям до 80% стоимости коммерческого сада.</p><p><b>⚠️ Важно о вакцинации:</b> В Сербии законодательно запрещен прием детей в дошкольные учреждения без обязательного пакета прививок. Особое внимание уделяется вакцине MMR (корь-краснуха-паротит). При отсутствии прививки или официального сербского медотвода ребенка в сад не примут.<p><b>💡 Лайфхак для продления ВНЖ:</b> Обязательно попросите в саду справку о регулярном посещении (Potvrda o pohađanju vrtića). При продлении ВНЖ на следующий год этот документ с синей печатью станет для инспектора МУП отличным доказательством реальной интеграции вашей семьи в сербское общество.</p></p>" 
      },
      { 
        id: "m2_living", 
        name: "Еда, быт, семейные расходы", 
        cost: 600, 
        currency: "EUR", 
        desc: "Регулярный ежемесячный бюджет семьи", 
        tip: "<p>Стандартный бюджет на ведение хозяйства во второй месяц (покупка продуктов питания, проезд в городском транспорте, бытовая химия, покупка базовой одежды, мелкие семейные развлечения).</p>" 
      }
    ]
  },
  {
    month: 3,
    title: "Месяц 3: Запуск ИП и смена статуса ВНЖ",
    focus: "Регистрация бизнеса в APR, открытие счетов и подготовка к первым доходам",
    tasks: [
      { 
        id: "m3_rent", 
        name: "Аренда квартиры + коммуналка", 
        cost: 750, 
        currency: "EUR", 
        desc: "Регулярные расходы на содержание жилья", 
        tip: "<p>Ежемесячные расходы на оплату аренды квартиры хозяину и покрытие счетов за коммунальные услуги (Инфостан, свет, интернет) за второй месяц проживания.</p>" 
      },
      { 
        id: "m3_kindergarten", 
        name: "Частный детский сад (2-й месяц)", 
        cost: 400, 
        currency: "EUR", 
        desc: "Очередной платеж за посещение детского сада", 
        tip: "<p>Регулярная ежемесячная оплата частного детского сада за второй месяц посещения.</p>" 
      },
      { 
        id: "m3_living", 
        name: "Еда и базовые расходы", 
        cost: 600, 
        currency: "EUR", 
        desc: "Повседневные семейные издержки", 
        tip: "<p>Расходы семьи на питание, быт и текущие транспортные расходы.</p>" 
      },
      { 
        id: "preduzetnik", 
        name: "Регистрация ИП в APR (Предузетник)", 
        cost: 21, 
        currency: "EUR", 
        desc: "Регистрационный сбор государственного агентства APR (2 500 RSD)", 
        tip: "<p><b>Где делать:</b> Регистрация бизнеса осуществляется государственным органом — <a href='https://www.apr.gov.rs' target='_blank' rel='noopener noreferrer'>Агентством по хозяйственным регистрам (APR)</a>. Можно подать документы лично в главном офисе APR в Белграде (ул. Brankova 25) или подать онлайн при наличии сербской электронной подписи.</p><p><b>Пошаговый процесс:</b></p><p>1. Выберите код деятельности (шифра делатности). Для IT-разработчиков стандартным является код <b>62.01</b> (Računarsko programiranje).</p><p>2. Заполните заявление установленного образца (Registraciona prijava osnivanja preduzetnika).</p><p>3. Оплатите государственную пошлину в размере 2 500 RSD по реквизитам APR в кассе почты.</p><p>4. Сдайте документы лично. Решение о регистрации (Rešenje) выдается в течение 3–5 рабочих дней. Решение нужно будет лично забрать в APR в бумажном виде с синей печатью.</p>" 
      },
      { 
        id: "m3_office", 
        name: "Виртуальный офис для ИП (на год)", 
        cost: 260, 
        currency: "EUR", 
        desc: "Аренда юридического адреса (sedište firme)", 
        tip: "<p><b>Зачем нужен:</b> По закону Сербии при регистрации ИП вы обязаны указать юридический адрес (sedište). Если хозяин вашей квартиры категорически отказывается разрешать регистрацию бизнеса по адресу проживания, вам необходимо арендовать виртуальный офис (virtualna kancelarija).</p><p><b>⚠️ Проверка безопасности:</b> На рынке присутствует множество посредников, предлагающих виртуальные адреса. Чтобы не наткнуться на мошеннические фирмы-'пустышки', обязательно проверяйте юридический статус, ИНН (PIB) и финансовую активность компании-арендодателя через официальный реестр на сайте <a href='https://www.apr.gov.rs' target='_blank' rel='noopener noreferrer'>APR</a>.<p><b>💶 Скрытый расход:</b> Большинство надежных провайдеров юридических адресов (виртуальных офисов) при заключении годового договора просят внести обеспечительный депозит за 1 или 2 последних месяца аренды (~50–100 €). Учтите это при планировании стартовых трат Месяца 3.</p></p>" 
      },
      { 
        id: "m3_bank_personal", 
        name: "Открытие личного текущего счёта", 
        cost: 0, 
        currency: "EUR", 
        desc: "Подача документов на личный счёт физлица в Alta Bank или аналогичном.", 
        tip: "<p><b>Физический шаг:</b> Требуется загранпаспорт и действующий белый картон. Счёт нужен для личных трат, оплат внутри Сербии и связи с облачными сервисами. Наиболее лояльный банк — <a href='https://www.altabank.rs' target='_blank'>Alta Bank</a>.</p>" 
      },
      { 
        id: "m3_bank_business", 
        name: "Открытие бизнес-счёта ИП (Предузетник)", 
        cost: 0, 
        currency: "EUR", 
        desc: "Подача налогового PIB и Решения APR для активации расчётного счёта фирмы.", 
        tip: "<p><b>Физический шаг:</b> Делается строго ПОСЛЕ получения решения из APR (задача preduzetnik). Банк затребует документы 2-НДФЛ/3-НДФЛ из РФ (задача tax_decl_bank) для проверки легальности происхождения капитала. Одобрение бизнес-комплаенса занимает от 3 до 10 рабочих дней.<p><b>💶 Банковская комиссия:</b> При зачислении первых оплат в иностранной валюте (USD/EUR) от ваших зарубежных заказчиков сербские банки берут комиссию за валютный контроль и обработку подтверждающих документов (обычно от 1% до 2% от суммы перевода). Учитывайте этот процент при планировании чистой доходности.</p></p>" 
      },
      { 
        id: "tax_decl_bank", 
        name: "Подготовка налоговых деклараций из РФ для банка", 
        cost: 0, 
        currency: "EUR", 
        desc: "Документы 2-НДФЛ / 3-НДФЛ для прохождения комплаенса", 
        tip: "<p><b>Зачем это банку:</b> Служба комплаенса любого сербского банка обязана осуществлять жесткую проверку происхождения денежных средств иностранных граждан. Требования к проверке регулируются директивами <a href='https://www.nbs.rs' target='_blank' rel='noopener noreferrer'>Народного банка Сербии (NBS)</a>.</p><p><b>Что подготовить:</b> Предоставьте налоговые справки 2-НДФЛ или декларации 3-НДФЛ из РФ за последние 1-2 года, подтверждающие, что вы официально зарабатывали деньги и платили налоги в РФ. Дополнительно закажите выписку по личному российскому банковскому счету за последние 6 месяцев с движением средств (желательно сразу на английском языке).</p>" 
      },
      { 
        id: "m3_lawyer", 
        name: "Услуги юриста (банк, комплаенс, смена ВНЖ)", 
        cost: 200, 
        currency: "EUR", 
        desc: "Сопровождение процедур легализации и комплаенса", 
        tip: "<p><b>Когда стоит нанять юриста:</b> Если вы сомневаетесь в юридической чистоте документов, не понимаете тонкости заполнения налоговых деклараций, либо если банк затягивает проверку комплаенса бизнес-счета.</p><p><b>⚠️ Проверка лицензии:</b> В Сербии имеет право оказывать юридические услуги только лицензированный адвокат. Перед оплатой услуг обязательно проверьте наличие действующей лицензии юриста в официальном реестре адвокатов на сайте <a href='https://aks.org.rs' target='_blank' rel='noopener noreferrer'>Адвокатской палаты Сербии (AKS)</a>. Не пользуйтесь услугами 'помощников' и 'консультантов' без адвокатского статуса.</p>" 
      }
    ]
  },
  {
    month: 4,
    title: "Месяц 4: Жизнь на рельсах бизнеса",
    focus: "Полноценная работа, оплата первых налогов и оформление государственной страховки",
    tasks: [
      { 
        id: "m4_rent", 
        name: "Аренда квартиры + коммуналка", 
        cost: 750, 
        currency: "EUR", 
        desc: "Арендная плата и счета за текущий месяц", 
        tip: "<p>Регулярные расходы на аренду жилья за третий месяц постоянного проживания.</p>" 
      },
      { 
        id: "m4_kindergarten", 
        name: "Частный детский сад (3-й месяц)", 
        cost: 400, 
        currency: "EUR", 
        desc: "Плата за детский сад", 
        tip: "<p><b>Важный документ:</b> Попросите у руководства вашего детского сада выдать вам официальную справку о регулярном посещении ребенком учреждения (Potvrda o pohađanju vrtića). Этот документ с синей печатью сада может служить весомым доказательством интеграции вашей семьи в сербское общество при рассмотрении инспектором МУП документов на продление вашего ВНЖ на следующий год.</p>" 
      },
      { 
        id: "m4_pausal", 
        name: "Первые фиксированные налоги ИП (Паушал)", 
        cost: 350, 
        currency: "EUR", 
        desc: "Ежемесячный обязательный паушальный налог", 
        tip: "<p><b>Правила и сроки:</b> Если вы выбрали упрощенную систему налогообложения (Paušal), вы обязаны ежемесячно уплачивать фиксированную сумму налогов и социальных взносов. Налоги рассчитываются автоматически и выставляются в налоговом решении (Rešenje) от <a href='https://www.purs.gov.rs' target='_blank' rel='noopener noreferrer'>Налогового управления Сербии (Poreska uprava)</a>.</p><p><b>⚠️ Срок оплаты:</b> Налоги должны уплачиваться строго до 15-го числа каждого текущего месяца за предыдущий месяц. Квитанции формируются в вашем налоговом кабинете. Не допускайте просрочек — пени начисляются автоматически с первого дня просрочки, а систематическая неуплата может повлечь блокировку счетов и аннулирование ВНЖ.</p>" 
      },
      { 
        id: "state_health_insurance", 
        name: "Оформление гос. медстраховки (здравственная книжица)", 
        cost: 0, 
        currency: "EUR", 
        desc: "Получение карт государственного страхования на всю семью", 
        tip: "<p><b>Что это дает:</b> Полноценный доступ к бесплатному медицинскому обслуживанию в государственных поликлиниках (Dom Zdravlja) и больницах Сербии для вас, вашей супруги и ребенка.</p><p><b>Как оформить:</b> После уплаты первых социальных взносов по вашему ИП обратитесь лично в филиал <a href='https://www.rfzo.rs' target='_blank' rel='noopener noreferrer'>Республиканского фонда медицинского страхования (RFZO)</a> по месту вашей регистрации. На основании вашего статуса ИП вам оформят пластиковую здравственную книжицу (Zdravstvena knjižica), а супругу и ребенка впишут в вашу страховку как членов семьи.</p>" 
      },
      { 
        id: "m4_living", 
        name: "Еда и быт", 
        cost: 600, 
        currency: "EUR", 
        desc: "Плановый ежемесячный бюджет семьи на жизнь в Белграде", 
        tip: "<p>Стабильные ежемесячные расходы семьи на продукты, мелкие бытовые нужды и транспортные издержки на четвертом месяце жизни в стране.</p>" 
      },
      { 
        id: "m4_license_trans", 
        name: "Судебный перевод российских прав", 
        cost: 20, 
        currency: "EUR", 
        desc: "Сдача пластикового ВУ из Месяца 0 местному Sudski Tumač для заверенного перевода.", 
        tip: "<p><b>Физический шаг:</b> Найдите переводчика, отдайте права на 1-2 дня. Получите бумажный перевод с синей печатью и сшивкой. Это первый из трёх шагов обмена ВУ.</p>" 
      },
      { 
        id: "m4_license_med", 
        name: "Прохождение водительской медкомиссии", 
        cost: 30, 
        currency: "EUR", 
        desc: "Получение медицинской справки Lekarsko uverenje в Dom Zdravlja или частной сети.", 
        tip: "<p><b>Где делать:</b> Проходите комиссию (Lekarski pregled za vozače) в крупных частных клиниках (например, MediGroup или Euromedik). Стоит около 3 000 RSD (~25 €), но вся процедура занимает 30 минут без очередей и записи за три недели, в отличие от государственных Dom Zdravlja.</p>" 
      },
      { 
        id: "m4_license_mup", 
        name: "Подача документов на обмен ВУ в Дорожную полицию", 
        cost: 0, 
        currency: "EUR", 
        desc: "Личный визит в Saobraćajna policija для сдачи документов.", 
        tip: "<p><b>Физический шаг:</b> Возьмите с собой: оригинал ВУ РФ, перевод прав, медицинскую справку, ID-карту ВНЖ и оплаченные на почте таксы МУП. Внимание: российское ВУ у вас заберут и отправят в архив, взамен выдадут сербский биометрический пластик. <a href='https://mup.gov.rs' target='_blank'>Сайт МВД Сербии</a>.<p><b>⚠️ Важнейший нюанс:</b> При выдаче сербских прав дорожная полиция (Saobraćajna policija) физически забирает ваше российское пластиковое ВУ и отправляет его в архив. Если планируете ездить в РФ и водить там, лучше перед отъездом заявить в РФ об утере прав и получить официальный дубликат, оставив один пластик дома.</p></p>" 
      }
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
        // Сначала слушатель, потом skipWaiting — иначе race condition
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
        worker.postMessage({ action: 'skipWaiting' });
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
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
      await Promise.race([reg.update(), timeout]);
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!reg.installing && !reg.waiting) {
        updateBtn.innerHTML = '✨ Установлена актуальная версия';
      } else {
        updateBtn.innerHTML = '🚀 Найдено обновление';
      }
    } catch (err) {
      console.error(err);
      updateBtn.innerHTML = '❌ Нет соединения';
    } finally {
      setTimeout(() => {
        updateBtn.disabled = false;
        updateBtn.innerHTML = '🔄 Проверить обновления';
      }, 3000);
    }
  });
}

function scrollToChecklistItem(id) {
  const tab = document.querySelector('[data-tab="plan"]');
  if (tab) tab.click();
  setTimeout(() => {
    const el = document.getElementById('plan-' + id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1500);
    }
  }, 150);
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
        if (isHidden) {
          setTimeout(() => {
            const step = el.closest('.tl-step');
            if (step) step.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }, 120);
        }
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
      
      // Принудительный паддинг нулями для корректной валидации длины
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
        if (isHidden) {
          setTimeout(() => step.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 120);
        }
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

// === SCHEMA TAB ===
function renderSchema() {
  const canvas = document.getElementById('schema-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const CW = container ? container.clientWidth - 2 : window.innerWidth - 20;

  const items = [
    {id:'_rf',  t:'Подготовка', v:true, icon:'📍'},
    {id:'p10',  t:'Загранпаспорт мужа', icon:'🛂'},
    {id:'p5w',  t:'Загранпаспорт жены', icon:'🛂'},
    {id:'stamp',t:'Штамп гражданства', icon:'👶'},
    {id:'p5d',  t:'Загранпаспорт ребёнка', icon:'🛂'},
    {id:'nocrim_h',t:'Справка несудимости М', icon:'📃'},
    {id:'nocrim_w',t:'Справка несудимости Ж', icon:'📃'},
    {id:'apost_marr',t:'Апостиль на брак', icon:'🔖'},
    {id:'apost_birth',t:'Апостиль на рождение', icon:'🔖'},
    {id:'docs_done', t:'✅ Сделать дела', v:true, icon:'🏃'},
    {id:'power', t:'📋 Собрать документы', v:true, icon:'📚'},
    {id:'_ok',  t:'✅ Собрать чемоданы', v:true, icon:'🧳'},
    {id:'m1_flight',t:'Перелёт в Белград', icon:'🛩'},
    {id:'m1_airbnb',t:'Заселение Airbnb', icon:'🏠'},
    {id:'reg',  t:'Белый картон', icon:'🪪'},
    {id:'m1_trans_base',t:'📝 Перевод документов', icon:'📝'},
    {id:'m1_trans_diploma',t:'🎓 Перевод диплома', icon:'🎓'},
    {id:'m1_trans_vax',t:'💉 Прививки перевод', icon:'💉'},
    {id:'m1_insurance',t:'Медстраховка', icon:'🏥'},
    {id:'m1_azk_submit',t:'📋 Подача в AZK', icon:'📋'},
    {id:'m1_vnz_tax',t:'💰 Оплата пошлин', icon:'💰'},
    {id:'m1_vnz_submit',t:'📩 Подача на ВНЖ', icon:'📩'},
    {id:'_ok2', t:'✅ Пакет готов', v:true, icon:'📚'},
    {id:'m1_vnz',t:'🎯 ВНЖ по Таланту', goal:true},
  ];

  const CH = Math.max((window.innerHeight - 100) * 2, 1600) * 1.4;
  const trailH = Math.max((window.innerHeight - 100) * 2, 1600);
  const PX = CW < 500 ? 2 : 3;
  canvas.style.width = CW + 'px';
  canvas.style.height = CH + 'px';
  canvas.width = CW * dpr;
  canvas.height = CH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const state = getPlanState() || { tasks: {} };
  const bY = 80 + 0.53 * (trailH - 160);
  const bFY = 80 + (18/23) * (trailH - 160);

  // Parchment background
  ctx.fillStyle = '#fdf5c9'; ctx.fillRect(0, 0, CW, CH);
  // Aged edges
  for (let i = 0; i < 200; i++) {
    const rx = Math.random() * CW, ry = Math.random() * CH;
    ctx.fillStyle = 'rgba(180,140,80,' + (0.03 + Math.random() * 0.05) + ')';
    ctx.fillRect(rx, ry, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  // Burnt border
  ctx.strokeStyle = '#8d6e3f'; ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, CW - 8, CH - 8);
  ctx.strokeStyle = '#c9a84b'; ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, CW - 16, CH - 16);

  // Treasure X at the end
  const trailXAt = (y) => {
      const t = Math.max(0, Math.min(1, (y - 80) / (trailH - 160)));
    return CW / 2 + Math.sin(t * Math.PI * 4) * (CW * 0.28) + Math.cos(t * Math.PI * 7) * (CW * 0.08);
  };
  if (!window._schemaDecor || window._schemaDecor._cw !== CW || window._schemaDecor._ch !== CH) {
    let rngSeed = 1;
    const rnd = () => { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed - 1) / 2147483646; };
    const rint = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
    const dec = [];
    const bY = 80 + 0.53 * (trailH - 160); // boundary Y

    // ── Russia zone helpers ──
    const ruY = (t) => t * bY;
    const safeX = (y, margin, range) => {
      const tx = trailXAt(y);
      const side = rnd() > 0.5 ? -1 : 1;
      const off = margin + rnd() * range;
      return Math.max(10, Math.min(CW - 10, tx + side * off));
    };
    const ruX = () => 50 + rnd() * (CW - 100);

    // Russian mountains — more in north, fewer south
    for (let i = 0; i < 8; i++) {
      dec.push({ t:'mt_ru', x:ruX(), y:ruY(0.03+rnd()*0.85) });
    }

    // Spruce (north 10-55% of Russia zone)
    for (let i = 0; i < 14; i++) {
      dec.push({ t:'spruce', x:ruX(), y:ruY(0.05+rnd()*0.5) });
    }
    // Birch (south 50-100% of Russia zone)
    for (let i = 0; i < 12; i++) {
      dec.push({ t:'birch', x:ruX(), y:ruY(0.5+rnd()*0.49) });
    }


    // Lakes Russia
    const lakes = [];
    for (let i = 0; i < 3; i++) {
      const lx = ruX(), ly = ruY(0.1+rnd()*0.8);
      dec.push({ t:'lake', x:lx, y:ly, r:rint(3,6) });
      lakes.push({ x:lx, y:ly });
    }

    // Russian fauna
    dec.push({ t:'bear_track', x:ruX(), y:ruY(0.05+rnd()*0.3) });
    dec.push({ t:'bear_track', x:ruX(), y:ruY(0.1+rnd()*0.4) });
    dec.push({ t:'elk', x:ruX(), y:ruY(0.3+rnd()*0.4) });
    lakes.sort((a, b) => b.y - a.y).slice(0, 2).forEach(l => dec.push({ t:'swan', x:l.x, y:l.y }));

    // ── Serbia zone helpers ──
    const srY = (t) => bY + 20 + t * (CH - bY - 40);
    const srX = () => 50 + rnd() * (CW - 100);

    // Serbian hills (green)
    for (let i = 0; i < 6; i++) {
      dec.push({ t:'hill_sr', x:srX(), y:srY(0.02+rnd()*0.5), w:rint(12,28), h:rint(8,16) });
    }

    // Oak (north Serbia, 0-35%)
    for (let i = 0; i < 8; i++) {
      dec.push({ t:'oak', x:srX(), y:srY(0.02+rnd()*0.33) });
    }
    // Linden (mid Serbia, 20-60%)
    for (let i = 0; i < 6; i++) {
      dec.push({ t:'linden', x:srX(), y:srY(0.2+rnd()*0.4) });
    }


    // Lakes Serbia
    for (let i = 0; i < 2; i++) {
      dec.push({ t:'lake', x:srX(), y:srY(0.05+rnd()*0.8), r:rint(2,5) });
    }

    // Serbian fauna
    dec.push({ t:'eagle', x:srX(), y:srY(0.3+rnd()*0.3) });
    dec.push({ t:'pigeon', x:srX(), y:srY(0.5+rnd()*0.35) });
    dec.push({ t:'pigeon', x:srX(), y:srY(0.6+rnd()*0.3) });

    // Serbian buildings
    dec.push({ t:'fortress', x:srX(), y:srY(0.15+rnd()*0.3) });
    // City spires near the end (south)
    for (let i = 0; i < 3; i++) {
      dec.push({ t:'spire', x:srX(), y:srY(0.65+rnd()*0.3), h:rint(6,10) });
    }

    // ── Clouds (all over, denser in transition) ──
    for (let i = 0; i < 25; i++) {
      const zoneR = rnd();
      let cy;
      if (zoneR < 0.15) cy = bY - 40 + rnd() * 80; // dense transition
      else if (zoneR < 0.55) cy = 20 + rnd() * (bY - 60); // Russia
      else cy = bY + 20 + rnd() * (CH - bY - 60); // Serbia
      dec.push({ t:'cloud', x:15+rnd()*(CW-30), y:cy, isRu: cy < bY, shape: rint(0,2) });
    }

    // ── Boundary line (wavy state border at flight level) ──
    const bFlightT = 18 / 23; // Midpoint between "Перелёт" (12) and "Заселение" (13)
    const bFY = 80 + bFlightT * (trailH - 160);
    const bPts = [];
    const bSteps = 24;
    for (let i = 0; i <= bSteps; i++) {
      const t = i / bSteps;
      const bx = 10 + t * (CW - 20);
      const by = bFY + Math.sin(t * Math.PI * 4) * 18 + Math.cos(t * Math.PI * 6) * 10;
      bPts.push({x:bx, y:by});
    }
    dec.push({ t:'boundary', pts:bPts, flagY:bFY });

    // Push objects away from the trail
    dec.forEach(d => {
      if (d.t === 'cloud' || d.t === 'boundary' || d.t === 'lake') return;
      const margin = d.t === 'mt_ru' ? 35 : 22;
      const tx = trailXAt(d.y);
      const dist = d.x - tx;
      if (Math.abs(dist) < margin) {
        d.x = dist < 0 ? Math.max(10, d.x - margin) : Math.min(CW - 10, d.x + margin);
      }
    });

    window._schemaDecor = dec;
    window._schemaDecor._cw = CW;
    window._schemaDecor._ch = CH;
  }

  // ── Draw lakes (background) ──
  {
    window._schemaDecor.forEach(d => {
      if (d.t !== 'lake') return;
      const r = (d.r || 4) * 5;
      ctx.fillStyle = '#42a5f5';
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.scale(1, 0.45);
      const h = (d.x * 12.9898 + d.y * 78.233) % 1;
      const pts = [
        {ox:-r*0.3, oy:-r*(0.15+h*0.15), r:r*(0.7+h*0.2)},
        {ox: r*0.2, oy:-r*(0.2 + (h*0.7)%0.2), r:r*(0.6+(1-h)*0.2)},
        {ox: r*0.4, oy: r*0.1, r:r*(0.5+h*0.15)},
        {ox:-r*0.2, oy: r*0.3, r:r*(0.6+((h*3)%1)*0.2)},
        {ox:-r*0.6, oy: r*0.0, r:r*0.4},
        {ox: r*0.1, oy: r*0.0, r:r*(0.4+(h*5)%0.3)},
      ];
      pts.forEach(p => { ctx.beginPath(); ctx.arc(p.ox, p.oy, p.r, 0, Math.PI * 2); ctx.fill(); });
      ctx.restore();
    });
  }

  // Compass rose
  const cx = 50, cy0 = 60;
  ctx.fillStyle = '#5d4037';
  ctx.font = 'bold 12px serif'; ctx.textAlign = 'center';
  ctx.fillText('N', cx, cy0 - 20);
  ctx.fillText('S', cx, cy0 + 30);
  ctx.fillText('W', cx - 30, cy0 + 7);
  ctx.fillText('E', cx + 30, cy0 + 7);
  ctx.beginPath(); ctx.moveTo(cx, cy0 - 18); ctx.lineTo(cx + 4, cy0 + 2); ctx.lineTo(cx - 4, cy0 + 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx, cy0 + 20); ctx.lineTo(cx + 4, cy0); ctx.lineTo(cx - 4, cy0); ctx.fill();
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy0 + 1, 16, 0, Math.PI*2); ctx.stroke();

  // ── Trail ──
  // Smooth winding trail — many points for curves
  const trail = [];
  const n = items.length;
  const STEPS = 8;
  const baseStep = (trailH - 160) / (n - 1);

  const itemOff = (i) => {
    let o = 0;
    if (i >= 9) o += baseStep;
    if (i >= 10) o += baseStep;
    if (i >= 11) o += baseStep;
    if (i >= 12) o += baseStep;
    if (i >= 13) o += baseStep;
    if (i >= 13) o += baseStep;
    if (i >= 13) o += baseStep;
    return o;
  };

  for (let i = 0; i < n; i++) {
    for (let s = 0; s < (i < n - 1 ? STEPS : 1); s++) {
      const t = (i + s / STEPS) / (n - 1);
      const x = CW / 2 + Math.sin(t * Math.PI * 4) * (CW * 0.28) + Math.cos(t * Math.PI * 7) * (CW * 0.08);
      const frac = s / STEPS;
      const off = itemOff(i) + (itemOff(i + 1) - itemOff(i)) * frac;
      const y = 80 + t * (trailH - 160) + off;
      trail.push({ x, y, isNode: s === 0 });
    }
  }
  // Nodes at exact milestone positions (for signs and bird)
  const nodes = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = CW / 2 + Math.sin(t * Math.PI * 4) * (CW * 0.28) + Math.cos(t * Math.PI * 7) * (CW * 0.08);
    const y = 80 + t * (trailH - 160) + itemOff(i);
    nodes.push({ x, y });
  }

  // Find dino position: last done task
  let dinoIdx = 0;
  for (let i = n - 1; i >= 0; i--) {
    if (items[i].v) continue;
    const s = state.tasks?.[items[i].id] || {};
    if (s.checked) { dinoIdx = Math.min(i + 1, n - 1); break; }
  }

  // Done portion
  const tn = trail.length;
  ctx.strokeStyle = '#81c784'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(trail[0].x, trail[0].y);
  const doneIdx = dinoIdx * STEPS;
  for (let i = 1; i <= doneIdx && i < tn; i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke();
  // Dotted future
  ctx.strokeStyle = '#bbb'; ctx.lineWidth = 4; ctx.setLineDash([8, 12]);
  ctx.beginPath(); ctx.moveTo(trail[doneIdx]?.x || trail[0].x, trail[doneIdx]?.y || trail[0].y);
  for (let i = doneIdx + 1; i < tn; i++) ctx.lineTo(trail[i].x, trail[i].y);
  ctx.stroke(); ctx.setLineDash([]);

  const hitAreas = [];

  // Standalone: Собрать аптечку (второстепенная)
  {
    const okNode = nodes[11];
    const sx = okNode.x - 100, sy = okNode.y + 30;
    const pState = state.tasks?.pharm || {};
    const pDone = pState.checked, pProg = pState.progress;

    // Wavy connector to ✅ Собрать чемоданы
    ctx.strokeStyle = pDone ? '#81c784' : '#bbb';
    ctx.lineWidth = pDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!pDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + okNode.x) / 2, my = (sy + okNode.y) / 2;
    ctx.bezierCurveTo(mx - 15, my - 15, mx + 15, my + 15, okNode.x, okNode.y);
    ctx.stroke();
    if (!pDone) ctx.setLineDash([]);

    // Signboard
    let bg, border, tc;
    if (pDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (pProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Собрать аптечку';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('💊', sx, sy);

    // Click area
    hitAreas.push({ id:'pharm', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Медицинские выписки (второстепенная) → ✅ Сделать дела
  {
    const docNode = nodes[9];
    const sx = docNode.x - 120, sy = docNode.y;
    const mState = state.tasks?.med_vyps || {};
    const mDone = mState.checked, mProg = mState.progress;

    ctx.strokeStyle = mDone ? '#81c784' : '#bbb';
    ctx.lineWidth = mDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!mDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + docNode.x) / 2, my = (sy + docNode.y) / 2;
    ctx.bezierCurveTo(mx + 25, my - 10, mx - 10, my + 10, docNode.x, docNode.y);
    ctx.stroke();
    if (!mDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (mDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (mProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Медицинские выписки';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('📋', sx, sy);

    hitAreas.push({ id:'med_vyps', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Стоматология (второстепенная) → ✅ Сделать дела
  {
    const docNode = nodes[9];
    const sx = docNode.x, sy = docNode.y - 100;
    const dState = state.tasks?.dentist || {};
    const dDone = dState.checked, dProg = dState.progress;

    ctx.strokeStyle = dDone ? '#81c784' : '#bbb';
    ctx.lineWidth = dDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!dDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + docNode.x) / 2, my = (sy + docNode.y) / 2;
    ctx.bezierCurveTo(mx + 15, my + 20, mx - 15, my - 10, docNode.x, docNode.y);
    ctx.stroke();
    if (!dDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (dDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (dProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Стоматология';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('🦷', sx, sy);

    hitAreas.push({ id:'dentist', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Апостиль (второстепенная) → Справка несудимости М
  {
    const ncNode = nodes[5];
    const sx = ncNode.x + 130, sy = ncNode.y + 50;
    const aState = state.tasks?.apost_nocrim_h || {};
    const aDone = aState.checked, aProg = aState.progress;

    ctx.strokeStyle = aDone ? '#81c784' : '#bbb';
    ctx.lineWidth = aDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!aDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + ncNode.x) / 2, my = (sy + ncNode.y) / 2;
    ctx.bezierCurveTo(mx + 30, my - 20, mx - 20, my + 25, ncNode.x, ncNode.y);
    ctx.stroke();
    if (!aDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (aDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (aProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Апостиль НС (М)';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('🔖', sx, sy);

    hitAreas.push({ id:'apost_nocrim_h', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Апостиль НС (Ж) (второстепенная) → Справка несудимости Ж
  {
    const ncNode = nodes[6];
    const sx = ncNode.x + 130, sy = ncNode.y + 50;
    const aState = state.tasks?.apost_nocrim_w || {};
    const aDone = aState.checked, aProg = aState.progress;

    ctx.strokeStyle = aDone ? '#81c784' : '#bbb';
    ctx.lineWidth = aDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!aDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + ncNode.x) / 2, my = (sy + ncNode.y) / 2;
    ctx.bezierCurveTo(mx + 30, my + 20, mx - 20, my - 25, ncNode.x, ncNode.y);
    ctx.stroke();
    if (!aDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (aDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (aProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Апостиль НС (Ж)';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('🔖', sx, sy);

    hitAreas.push({ id:'apost_nocrim_w', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Доверенность (второстепенная) → ✅ Сделать дела
  {
    const docNode = nodes[9];
    const sx = docNode.x + 120, sy = docNode.y;
    const pState = state.tasks?.power || {};
    const pDone = pState.checked, pProg = pState.progress;

    ctx.strokeStyle = pDone ? '#81c784' : '#bbb';
    ctx.lineWidth = pDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!pDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + docNode.x) / 2, my = (sy + docNode.y) / 2;
    ctx.bezierCurveTo(mx - 20, my + 10, mx + 15, my - 10, docNode.x, docNode.y);
    ctx.stroke();
    if (!pDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (pDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (pProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Доверенность';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('📝', sx, sy);

    hitAreas.push({ id:'power', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Нотариальное согласие (второстепенная) → 📋 Собрать документы
  {
    const docNode = nodes[10];
    const sx = docNode.x - 50, sy = docNode.y + 100;
    const cState = state.tasks?.child_consent || {};
    const cDone = cState.checked, cProg = cState.progress;

    ctx.strokeStyle = cDone ? '#81c784' : '#bbb';
    ctx.lineWidth = cDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!cDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + docNode.x) / 2, my = (sy + docNode.y) / 2;
    ctx.bezierCurveTo(mx + 20, my - 20, mx - 10, my + 15, docNode.x, docNode.y);
    ctx.stroke();
    if (!cDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (cDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (cProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Согласие на выезд';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('✍️', sx, sy);

    hitAreas.push({ id:'child_consent', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Дипломы (второстепенная) → 📋 Собрать документы
  {
    const docNode = nodes[10];
    const sx = docNode.x + 110, sy = docNode.y - 30;
    const dState = state.tasks?.diplomas || {};
    const dDone = dState.checked, dProg = dState.progress;

    ctx.strokeStyle = dDone ? '#81c784' : '#bbb';
    ctx.lineWidth = dDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!dDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + docNode.x) / 2, my = (sy + docNode.y) / 2;
    ctx.bezierCurveTo(mx + 20, my + 15, mx - 15, my - 10, docNode.x, docNode.y);
    ctx.stroke();
    if (!dDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (dDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (dProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Дипломы о вышке';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('🎓', sx, sy);

    hitAreas.push({ id:'diplomas', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Водительские удостоверения (второстепенная) → 📋 Собрать документы
  {
    const docNode = nodes[10];
    const sx = docNode.x - 120, sy = docNode.y + 10;
    const dState = state.tasks?.driving_licenses || {};
    const dDone = dState.checked, dProg = dState.progress;

    ctx.strokeStyle = dDone ? '#81c784' : '#bbb';
    ctx.lineWidth = dDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!dDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + docNode.x) / 2, my = (sy + docNode.y) / 2;
    ctx.bezierCurveTo(mx - 15, my + 10, mx + 15, my - 15, docNode.x, docNode.y);
    ctx.stroke();
    if (!dDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (dDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (dProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Водительские права';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('🚗', sx, sy);

    hitAreas.push({ id:'driving_licenses', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Покупка билетов (второстепенная) → Перелёт в Белград
  {
    const flNode = nodes[12];
    const sx = flNode.x - 100, sy = flNode.y - 50;
    const tState = state.tasks?.ticket_buy || {};
    const tDone = tState.checked, tProg = tState.progress;

    ctx.strokeStyle = tDone ? '#81c784' : '#bbb';
    ctx.lineWidth = tDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!tDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + flNode.x) / 2, my = (sy + flNode.y) / 2;
    ctx.bezierCurveTo(mx - 15, my + 20, mx + 10, my - 15, flNode.x, flNode.y);
    ctx.stroke();
    if (!tDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (tDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (tProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Купить билеты';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('🎫', sx, sy);

    hitAreas.push({ id:'ticket_buy', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // Standalone: Бронь Airbnb (второстепенная) → Перелёт в Белград
  {
    const flNode = nodes[12];
    const sx = flNode.x - 80, sy = flNode.y + 45;
    const aState = state.tasks?.airbnb_book || {};
    const aDone = aState.checked, aProg = aState.progress;

    ctx.strokeStyle = aDone ? '#81c784' : '#bbb';
    ctx.lineWidth = aDone ? 3 : 2;
    ctx.lineCap = 'round';
    if (!aDone) ctx.setLineDash([6, 10]);
    ctx.beginPath(); ctx.moveTo(sx, sy);
    const mx = (sx + flNode.x) / 2, my = (sy + flNode.y) / 2;
    ctx.bezierCurveTo(mx - 20, my + 20, mx + 15, my - 20, flNode.x, flNode.y);
    ctx.stroke();
    if (!aDone) ctx.setLineDash([]);

    let bg, border, tc;
    if (aDone) { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (aProg) { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }
    ctx.font = 'bold 9px sans-serif';
    const txt = 'Забронировать Airbnb';
    const txtW = ctx.measureText(txt).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillStyle = tc;
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(txt, sx, poy + (ph * PX) / 2);
    ctx.font = '18px serif';
    ctx.fillText('💻', sx, sy);

    hitAreas.push({ id:'airbnb_book', x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
  }

  // ── Decorative elements over trail (hills, trees, animals, boundary) ──
  {
    const S = PX;
    window._schemaDecor.forEach(d => {
      if (d.t === 'lake') return;
      if (d.t === 'mt_ru') {
        ctx.font = '70px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000'; ctx.fillText('🏔', d.x, d.y);
      }
      else if (d.t === 'spruce') {
        ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000'; ctx.fillText('🌲', d.x, d.y);
      }
      else if (d.t === 'birch') {
        ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000'; ctx.fillText('🌳', d.x, d.y);
      }
      else if (d.t === 'oak') {
        ctx.font = '32px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🌳', d.x, d.y);
      }
      else if (d.t === 'linden') {
        ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🌿', d.x, d.y);
      }
      else if (d.t === 'hill_sr') {
        const bw = d.w*S, bh = d.h*S, bx = d.x - bw/2, by = d.y;
        ctx.lineJoin = 'round';
        ctx.fillStyle='#33691e'; ctx.beginPath();
        ctx.moveTo(bx-1, by+bh); ctx.lineTo(bx+bw/2, by); ctx.lineTo(bx+bw+1, by+bh); ctx.fill();
        ctx.fillStyle='#689f38'; ctx.beginPath();
        ctx.moveTo(bx+2, by+bh); ctx.lineTo(bx+bw/2, by+4); ctx.lineTo(bx+bw-2, by+bh); ctx.fill();
        ctx.fillStyle='#aed581'; ctx.beginPath();
        ctx.moveTo(bx+bw*0.25, by+bh); ctx.lineTo(bx+bw/2, by+bh*0.2); ctx.lineTo(bx+bw*0.75, by+bh); ctx.fill();
        ctx.lineJoin = 'miter';
      }
      else if (d.t === 'bear_track') {
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000'; ctx.fillText('🐾', d.x, d.y);
      }
      else if (d.t === 'elk') {
        ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000'; ctx.fillText('🦌', d.x, d.y);
      }
      else if (d.t === 'swan') {
        ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000'; ctx.fillText('🦢', d.x, d.y);
      }
      else if (d.t === 'eagle') {
        ctx.font = '16px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🦅', d.x, d.y);
      }
      else if (d.t === 'pigeon') {
        ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🕊', d.x, d.y);
      }
      else if (d.t === 'fortress') {
        ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏰', d.x, d.y);
      }
      else if (d.t === 'spire') {
        ctx.font = '32px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🏛️', d.x, d.y);
      }
      else if (d.t === 'boundary') {
        const pts = d.pts || [{x:10,y:d.y},{x:CW-10,y:d.y}];
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke(); ctx.setLineDash([]);
        const bRight = pts[pts.length - 1];
        const flagSize = Math.min(40, CW * 0.08);
        ctx.fillStyle = '#5d4037';
        ctx.font = flagSize + 'px serif';
        ctx.textAlign = 'right';         ctx.fillText('🇷🇺', CW - 10, bRight.y - flagSize - 5);
        ctx.fillText('🇷🇸', CW - 10, bRight.y + flagSize + 5);
      }
    });
  }

  // Barriers at the border — closed until all pre-border tasks done
  const allBeforeBorderDone = items.slice(0, 13).every(item => {
    if (item.v) return true;
    const s = state.tasks?.[item.id] || {};
    return s.checked;
  });
  if (!allBeforeBorderDone) {
    let bTx = trail[0].x, bMin = Math.abs(trail[0].y - bFY);
    for (let i = 1; i < trail.length; i++) {
      const d = Math.abs(trail[i].y - bFY);
      if (d < bMin) { bMin = d; bTx = trail[i].x; }
    }
    ctx.font = '28px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🚧', bTx - 22, bFY);
    ctx.fillText('🚧', bTx + 22, bFY);
  }

  // Draw milestone signs — on the trail
  items.forEach((item, i) => {
    const p = nodes[i];
    const sx = p.x, sy = p.y;

    const s = state.tasks?.[item.id] || {};
    const done = s.checked, prog = s.progress;

    let bg, border, tc;
    if (item.v)        { bg='#ede7f6'; border='#7e57c2'; tc='#4a148c'; }
    else if (done)     { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (prog)     { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else               { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }

    ctx.font = 'bold 9px sans-serif';
    const txtW = ctx.measureText(item.t).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;

    if (item.id !== 'power' && item.id !== '_ok' && item.id !== 'docs_done' && item.id !== '_rf') {
      hitAreas.push({ id:item.id, x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8 });
    }

    // Neon glow on current
    if (i === dinoIdx) { ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12; }

    // Plank board — pixel-style rectangle with nail details
    ctx.fillStyle = bg;
    ctx.fillRect(pox, poy, pw * PX, ph * PX);
    ctx.fillStyle = border;
    ctx.fillRect(pox, poy, pw * PX, PX);
    ctx.fillRect(pox, poy + (ph-1) * PX, pw * PX, PX);
    ctx.fillRect(pox, poy, PX, ph * PX);
    ctx.fillRect(pox + (pw-1) * PX, poy, PX, ph * PX);
    // Nails
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(pox + PX, poy + PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + PX, 2, 2);
    ctx.fillRect(pox + PX, poy + (ph-2) * PX, 2, 2);
    ctx.fillRect(pox + (pw-2) * PX, poy + (ph-2) * PX, 2, 2);

    if (i === dinoIdx) { ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; }

    // Text on plank
    ctx.fillStyle = tc;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(item.t, sx, poy + (ph * PX) / 2);

    // Item icon on the trail node
    if (item.icon) {
      ctx.font = '18px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, sx, sy);
    }
  });

  window._schemaHitAreas = hitAreas;

  // Pixel-art Bird
  const prevN = dinoIdx > 0 ? nodes[dinoIdx - 1] : nodes[0];
  const nextN = nodes[dinoIdx];
  const goingLeft = nextN.x < prevN.x;
  const dp = { x: (prevN.x + nextN.x) / 2, y: (prevN.y + nextN.y) / 2 };
  const frame = Math.floor(Date.now() / 250) % 4;
  const wingUp = [0, 1, 2, 1][frame];
  const bob = [0, -1, -2, -1][frame];

  ctx.save();
  ctx.translate(dp.x, dp.y + bob);
  ctx.translate(-16, -32);
  if (goingLeft) ctx.scale(-1, 1);

  function px(x, y, w, h, c) {
    ctx.fillStyle = c;
    ctx.fillRect(x * PX, y * PX, w * PX, h * PX);
  }
  // Body — round
  px(4, 4, 5, 4, '#1565c0');
  px(5, 3, 3, 1, '#1565c0');
  px(3, 5, 1, 2, '#1565c0');
  px(9, 5, 1, 2, '#1565c0');
  px(4, 8, 5, 1, '#1565c0');
  // Belly
  px(5, 6, 3, 2, '#90caf9');
  // Head
  px(9, 2, 3, 3, '#1565c0');
  // Beak
  px(12, 3, 2, 1, '#ff8f00');
  // Eye
  px(10, 3, 1, 1, '#ffffff');
  px(10, 3, 1, 1, '#000000'); // pupil
  px(10, 2, 1, 1, '#1565c0'); // brow
  // Tail
  px(1, 5, 3, 1, '#0d47a1');
  px(2, 6, 2, 1, '#0d47a1');
  // Wing (flapping)
  if (wingUp < 2) {
    px(5, 0 - wingUp, 3, 2 + wingUp, '#1565c0');
    px(4, 1 - wingUp, 1, 2 + wingUp, '#1565c0');
  } else {
    px(5, 9, 3, 2, '#1565c0');
    px(4, 9, 1, 2, '#1565c0');
  }
  // Legs
  px(6, 9, 1, 2, '#ff8f00');
  px(8, 9, 1, 2, '#ff8f00');
  ctx.restore();

  // Boundary glow when bird crosses
  if (dp.y >= bFY - 10) {
    const pulse = Math.sin(Date.now() * 0.004) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20 * pulse;
    ctx.strokeStyle = 'rgba(0,229,255,' + (0.2 * pulse) + ')'; ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(10, bFY); ctx.lineTo(CW-10, bFY); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  // Start animation loop when tab is open
  if (!window._schemaAnimating) {
    window._schemaAnimating = true;
    function animLoop() {
      if (!document.getElementById('tab-schema')?.classList.contains('active')) {
        window._schemaAnimating = false; return;
      }
      renderSchema();
      requestAnimationFrame(() => setTimeout(animLoop, 200));
    }
    animLoop();
  }

  // Airplane crossing the border
  const planeT = (Date.now() * 0.02 % (CW + 60));
  const planeX = planeT - 30;
  const planeY = bFY - 200 + (planeT / (CW + 60)) * 400;
  ctx.save();
  ctx.font = '36px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🛩', planeX, planeY);
  ctx.restore();

  // Treasure X at the end
  const last = nodes[n - 1];
  ctx.fillStyle = '#c62828'; ctx.font = 'bold 28px serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('✘', last.x, last.y);

  // Clouds on top of everything
  const clouds = window._schemaDecor?.filter ? window._schemaDecor.filter(d => d.t === 'cloud') : [];
  clouds.forEach(d => {
    const dx = ((d.x + Date.now() * 0.015) % (CW + 40)) - 20;
    const r = 14 * PX;
    const shapes = [
      [
        {ox:-r*0.6, oy:-r*0.2, r:r*0.85},
        {ox:-r*0.2, oy:-r*0.5, r:r*1.0},
        {ox: r*0.3, oy:-r*0.5, r:r*1.1},
        {ox: r*0.7, oy:-r*0.2, r:r*0.9},
        {ox: r*0.5, oy: r*0.2, r:r*0.7},
        {ox:-r*0.1, oy: r*0.2, r:r*0.8},
        {ox:-r*0.5, oy: r*0.1, r:r*0.75},
      ],
      [
        {ox:-r*0.8, oy:-r*0.1, r:r*0.7},
        {ox:-r*0.4, oy:-r*0.4, r:r*0.9},
        {ox: r*0.0, oy:-r*0.5, r:r*1.0},
        {ox: r*0.4, oy:-r*0.4, r:r*0.9},
        {ox: r*0.8, oy:-r*0.1, r:r*0.7},
        {ox: r*0.5, oy: r*0.2, r:r*0.6},
        {ox:-r*0.5, oy: r*0.2, r:r*0.6},
      ],
      [
        {ox:-r*0.5, oy:-r*0.4, r:r*0.8},
        {ox:-r*0.1, oy:-r*0.7, r:r*1.0},
        {ox: r*0.3, oy:-r*0.6, r:r*1.0},
        {ox: r*0.6, oy:-r*0.3, r:r*0.8},
        {ox: r*0.4, oy: r*0.1, r:r*0.7},
        {ox:-r*0.2, oy: r*0.1, r:r*0.8},
        {ox:-r*0.6, oy:-r*0.1, r:r*0.7},
      ],
    ];
    const pts = shapes[d.shape || 0];
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = d.isRu ? '#cfd8dc' : '#f5f5f5';
    ctx.translate(dx, d.y);
    ctx.scale(1, 0.45);
    pts.forEach(p => { ctx.beginPath(); ctx.arc(p.ox, p.oy, p.r, 0, Math.PI * 2); ctx.fill(); });
    ctx.restore();
  });

}

function renderLegend() {
  const canvas = document.getElementById('legend-canvas');
  if (!canvas) return;
  const container = canvas.parentElement;
  const CW = container ? container.clientWidth - 20 : 360;
  const dpr = window.devicePixelRatio || 1;
  const ICON = 20, ROW_H = 22, PAD = 10;
  const COL_W = (CW / 2) | 0;

  const items = [
    {z:0, hdr:'🇷🇺 РОССИЯ'},
    {z:0, la:'Ель', dr(c,x,y,s){c.font='14px serif';c.fillText('🌲',x+2,y+12);}},
    {z:0, la:'Берёза', dr(c,x,y,s){c.font='14px serif';c.fillText('🌳',x+1,y+12);}},
    {z:0, la:'Горы (сопки)', dr(c,x,y,s){c.font='14px serif';c.fillText('🏔',x+2,y+12);}},
    {z:0, la:'Озеро', dr(c,x,y,s){c.fillStyle='#42a5f5';[[-2,-1,3],[2,-2,2],[-1,2,2]].forEach(p=>{c.beginPath();c.arc(x+6+p[0],y+6+p[1],p[2],0,6.28);c.fill();});}},
    {z:0, la:'Медвежий след', dr(c,x,y,s){c.font='14px serif';c.fillText('🐾',x+6,y+8);}},
    {z:0, la:'Лось', dr(c,x,y,s){c.font='16px serif';c.fillText('🦌',x+2,y+12);}},
    {z:0, la:'Лебедь', dr(c,x,y,s){c.font='14px serif';c.fillText('🦢',x+2,y+12);}},

    {z:0, la:'Облака', dr(c,x,y,s){c.fillStyle='#cfd8dc';[[-4,-2,5],[-1,-4,6],[3,-3,5],[5,-1,4],[2,1,4],[-3,1,4]].forEach(p=>{c.beginPath();c.arc(x+6+p[0],y+6+p[1],p[2],0,6.28);c.fill();});}},

    {z:1, hdr:'🇷🇸 СЕРБИЯ'},
    {z:1, la:'Дуб', dr(c,x,y,s){c.font='14px serif';c.fillText('🌳',x+2,y+12);}},
    {z:1, la:'Липа', dr(c,x,y,s){c.font='14px serif';c.fillText('🌿',x+2,y+12);}},

    {z:1, la:'Холмы', dr(c,x,y,s){c.lineJoin='round';c.fillStyle='#33691e';c.beginPath();c.moveTo(x+1,y+11);c.lineTo(x+6,y+2);c.lineTo(x+11,y+11);c.fill();c.fillStyle='#689f38';c.beginPath();c.moveTo(x+2,y+11);c.lineTo(x+6,y+5);c.lineTo(x+10,y+11);c.fill();c.fillStyle='#aed581';c.beginPath();c.moveTo(x+3,y+11);c.lineTo(x+6,y+3);c.lineTo(x+9,y+11);c.fill();c.lineJoin='miter';}},
    {z:1, la:'Озеро', dr(c,x,y,s){c.fillStyle='#42a5f5';[[2,-1,3],[-1,-2,2],[1,2,2],[-3,0,2]].forEach(p=>{c.beginPath();c.arc(x+6+p[0],y+6+p[1],p[2],0,6.28);c.fill();});}},
    {z:1, la:'Орёл', dr(c,x,y,s){c.font='14px serif';c.fillText('🦅',x+2,y+12);}},
    {z:1, la:'Голубь', dr(c,x,y,s){c.font='14px serif';c.fillText('🕊',x+2,y+12);}},
    {z:1, la:'Крепость Калемегдан', dr(c,x,y,s){c.font='16px serif';c.fillText('🏰',x+2,y+12);}},

    {z:1, la:'Шпиль (город)', dr(c,x,y,s){c.font='14px serif';c.fillText('🏛️',x+2,y+12);}},
    {z:1, la:'Облака', dr(c,x,y,s){c.fillStyle='#f5f5f5';[[-4,-2,5],[-1,-4,6],[3,-3,5],[5,-1,4],[2,1,4],[-3,1,4]].forEach(p=>{c.beginPath();c.arc(x+6+p[0],y+6+p[1],p[2],0,6.28);c.fill();});}},
  ];

  const rCnt = [0, 0];
  items.forEach(it => { if (it.hdr) return; rCnt[it.z]++; });
  const maxR = Math.max(rCnt[0], rCnt[1]) + 1;
  const H = maxR * ROW_H + PAD * 2 + 10;

  canvas.style.width = CW + 'px';
  canvas.style.height = H + 'px';
  canvas.width = CW * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  ctx.fillStyle = '#fdf5c9'; ctx.fillRect(0, 0, CW, H);
  ctx.strokeStyle = '#d7ccc8'; ctx.lineWidth = 1;
  ctx.strokeRect(3, 3, CW - 6, H - 6);

  let row0 = 0, row1 = 0;
  items.forEach(item => {
    const col = item.z;
    const row = col === 0 ? row0++ : row1++;
    const cx = col * COL_W + 8;
    const cy = PAD + row * ROW_H;
    if (item.hdr) {
      ctx.fillStyle = '#5d4037'; ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.hdr, cx, cy + 14);
    } else {
      item.dr(ctx, cx, cy, 1);
      ctx.fillStyle = '#4e342e'; ctx.font = '10px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.la, cx + ICON + 6, cy + 13);
    }
  });
}


document.querySelector('[data-tab="schema"]')?.addEventListener('click', () => {
  setTimeout(() => { try { renderSchema(); renderLegend(); } catch(e) { console.error(e); } }, 100);
});

const schemaCanvas = document.getElementById('schema-canvas');
if (schemaCanvas && !schemaCanvas.dataset.clickBound) {
  schemaCanvas.dataset.clickBound = '1';
  schemaCanvas.addEventListener('click', e => {
    const rect = schemaCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    (window._schemaHitAreas || []).some(area => {
      if (mx >= area.x && mx <= area.x + area.w && my >= area.y && my <= area.y + area.h) {
        scrollToChecklistItem(area.id);
        if (navigator.vibrate) navigator.vibrate(30);
        return true;
      }
    });
  });
}

// Sync: обновление после загрузки из облака
window.addEventListener('sync-loaded', () => {
  try { renderPlan(); } catch (e) { console.error(e); }
});

// === Theme toggle ===
const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = themeToggleBtn?.querySelector('.theme-icon');
const themeText = themeToggleBtn?.querySelector('.theme-text');

function applyTheme(theme) {
  if (theme === 'dark') {
    document.body.classList.add('dark-theme');
    if (themeIcon) themeIcon.textContent = '🌙';
    if (themeText) themeText.textContent = 'Тёмная тема';
    if (currentTileLayer && mapTiles) currentTileLayer.setUrl(mapTiles.dark);
  } else {
    document.body.classList.remove('dark-theme');
    if (themeIcon) themeIcon.textContent = '☀️';
    if (themeText) themeText.textContent = 'Светлая тема';
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


