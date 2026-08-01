let arrowMarker = null;

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
  if (pt.linked) poiLayer.addLayer(marker);
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

function updateMapColors(preset) {
  activePreset = preset;
  const visible = urbanHide ? DISTRICTS.filter(d => d.isUrban) : [...DISTRICTS];
  const visScores = visible.map(vd => getScore(vd, preset));
  const visMin = Math.min(...visScores);
  const visMax = Math.max(...visScores);
  DISTRICTS.forEach(d => {
    const p = polygons[d.name];
    if (!p) return;
    if (urbanHide && !d.isUrban) return;
    const sc = getNormalizedScore(d, preset, visible, visMin, visMax);
    const fill = scoreColor(sc);
    const isDark = document.body.classList.contains('dark-theme');
    const edge = isDark ? lightenHex(fill, 40) : darkenHex(fill, 30);
    p.setStyle({ fillColor: fill, color: edge, fillOpacity: 0.35, weight: 3 });
    if (labelMarkers[d.name]) {
      const el = labelMarkers[d.name].getElement();
      if (el) {
        el.innerHTML = districtLabel(d.name, d.price, sc);
      } else {
        labelMarkers[d.name].setIcon(L.divIcon({
          html: districtLabel(d.name, d.price, sc),
          iconSize: [0, 0],
          iconAnchor: [0, 0],
        }));
      }
    }
  });
  updateLegend(preset);
}

function updateLegend(preset) {
  let filtered = urbanHide ? DISTRICTS.filter(d => d.isUrban) : [...DISTRICTS];
  const legScores = filtered.map(vd => getScore(vd, preset));
  const legMin = Math.min(...legScores);
  const legMax = Math.max(...legScores);
  const sorted = filtered.sort((a, b) => getNormalizedScore(b, preset, filtered, legMin, legMax) - getNormalizedScore(a, preset, filtered, legMin, legMax));
  const listEl = document.getElementById('legend-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  const legendBar = document.createElement('div');
  legendBar.className = 'legend-score-bar';
  legendBar.innerHTML = '<span>Лучше</span><span class="legend-grad-drop"></span><span>Хуже</span>';
  listEl.appendChild(legendBar);

  const emoji = presetEmoji(preset);
  sorted.forEach((d, i) => {
    const sc = getNormalizedScore(d, preset, filtered, legMin, legMax);
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

function createPopupContent(d) {
  const div = document.createElement('div');
  div.style.cssText = 'font-family:sans-serif;width:200px';
  const visible = urbanHide ? DISTRICTS.filter(x => x.isUrban) : [...DISTRICTS];
  const sc = getNormalizedScore(d, activePreset, visible);
  const color = scoreColor(sc);
  const emoji = presetEmoji(activePreset);
  const label = presetName(activePreset);
  div.innerHTML = `
    <b style="font-size:15px">${d.name}</b><br>
    <span style="color:#d32f2f;font-size:14px;font-weight:bold">${d.price}</span><br>
    <span style="font-size:11px;color:${color}">${emoji} ${sc}/10 — ${label}</span><br>
    <span style="color:#555;font-size:11px">${d.desc}</span><br>
    <button class="detail-btn" style="margin-top:6px;padding:4px 12px;border:none;border-radius:6px;background:#1a237e;color:#fff;font-size:12px;cursor:pointer">Подробнее →</button>`;
  const btn = div.querySelector('.detail-btn');
  if (btn) btn.onclick = () => showDistrictPanel(d);
  return div;
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
      if (!p.isPopupOpen()) p.bindPopup(() => createPopupContent(d), { maxWidth: 220 });
      if (m) map.addLayer(m);
    } else {
      if (p.isPopupOpen()) p.closePopup();
      p.unbindPopup();
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
  updateUrbanFilter(!e.target.checked);
});

document.getElementById('price-toggle')?.addEventListener('change', e => {
  document.body.classList.toggle('hide-prices', !e.target.checked);
});
document.body.classList.add('hide-prices'); // prices hidden by default

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

  if (arrowMarker) { map.removeLayer(arrowMarker); arrowMarker = null; }
  const d = DISTRICTS.find(x => x.name === name);
  if (d && d.coords && d.coords.length > 0) {
    const lats = d.coords.map(c => c[0]);
    const lons = d.coords.map(c => c[1]);
    const cx = (Math.min(...lats) + Math.max(...lats)) / 2;
    const cy = (Math.min(...lons) + Math.max(...lons)) / 2;
    arrowMarker = L.marker([cx, cy], {
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
  if (arrowMarker) {
    map.removeLayer(arrowMarker);
    arrowMarker = null;
  }
  if (activeSubDistrictLayers) activeSubDistrictLayers.clearLayers();
});

map.on('zoomend', () => {
  const zoom = map.getZoom();
  DISTRICTS.forEach(d => {
    const marker = labelMarkers[d.name];
    if (!marker) return;
    if (zoom < 11 || (urbanHide && !d.isUrban)) {
      map.removeLayer(marker);
    } else {
      map.addLayer(marker);
    }
  });
});

// Подсветка границ района при открытии popup
map.on('popupopen', (e) => {
  const source = e.popup._source;
  if (source && source instanceof L.Polygon && source._path) {
    source._path.classList.add('polygon-highlight');
    source.bringToFront();
  }
});
map.on('popupclose', (e) => {
  const source = e.popup._source;
  if (source && source._path) {
    source._path.classList.remove('polygon-highlight');
  }
});

function showDistrictPanel(d, noFit) {
  if (!document.getElementById('d-name')) return;
  document.getElementById('d-name').textContent = d.name;
  // Carousel gallery & Lightbox — спрятана до наполнения, см. index.html
  const gallery = document.getElementById('d-gallery');
  if (gallery) {
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
  }
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
      d.links.map(l => `<a href="${safeUrl(l.url)}" target="_blank" rel="noopener noreferrer">${l.title}</a>`).join('<br>');
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

DISTRICTS.forEach(d => {
  if (!d.coords || d.coords.length < 3) return;

  const initVisible = urbanHide ? DISTRICTS.filter(x => x.isUrban) : [...DISTRICTS];
  const initScore = getNormalizedScore(d, activePreset, initVisible);
  const initFill = scoreColor(initScore);
  const initDark = document.body.classList.contains('dark-theme');
  const polygon = L.polygon(d.coords, {
    color: initDark ? lightenHex(initFill, 40) : darkenHex(initFill, 30),
    fillColor: initFill,
    fillOpacity: 0.35,
    weight: 3,
  }).addTo(map);
  polygons[d.name] = polygon;

  polygon.bindPopup(() => createPopupContent(d), { maxWidth: 220 });
  polygon.bindTooltip(d.name, { sticky: true });

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
function closeDistrictPanel(keepZoom) {
  document.getElementById('district-info').classList.add('hidden');
  if (activeSubDistrictLayers) activeSubDistrictLayers.clearLayers();
  if (arrowMarker) { map.removeLayer(arrowMarker); arrowMarker = null; }
  map.closePopup();
  updateMapColors(activePreset);
  if (!keepZoom) {
    map.setView([44.76, 20.48], 11);
  }
}

document.getElementById('close-info').addEventListener('click', () => closeDistrictPanel(true));

// Click on empty map → deselect
map.on('click', (e) => {
  if (e.originalEvent.target?.closest?.('.leaflet-interactive')) return;
  closeDistrictPanel();
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
let _opacityRAF = null;
document.getElementById('opacity-slider')?.addEventListener('input', e => {
  document.getElementById('opacity-val').textContent = e.target.value + '%';
  if (_opacityRAF) cancelAnimationFrame(_opacityRAF);
  _opacityRAF = requestAnimationFrame(() => {
    _opacityRAF = null;
    const val = parseInt(e.target.value);
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
      if (labelVis && !urbanHide) { map.addLayer(m); }
      else if (!labelVis || urbanHide) { map.removeLayer(m); }
    });
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
    const planOn = document.querySelector('[data-poi-cat="plan"]')?.checked;
    if (cat === 'plan') {
      poiMarkers.forEach(m => {
        if (m._pt && m._pt.linked) {
          if (visible) poiLayer.addLayer(m);
          else poiLayer.removeLayer(m);
        }
      });
    } else {
      poiMarkers.forEach(m => {
        if (m._poiCat === cat) {
          if (visible) poiLayer.addLayer(m);
          else if (!planOn || !m._pt?.linked) poiLayer.removeLayer(m);
        }
      });
    }
  });
});

document.getElementById('poi-toggle-all')?.addEventListener('change', (e) => {
  const on = e.target.checked;
  document.querySelectorAll('[data-poi-cat]').forEach(cb => {
    cb.checked = on;
    const cat = cb.dataset.poiCat;
    const planOn = document.querySelector('[data-poi-cat="plan"]')?.checked;
    if (cat === 'plan') {
      poiMarkers.forEach(m => {
        if (m._pt && m._pt.linked) {
          if (on) poiLayer.addLayer(m);
          else poiLayer.removeLayer(m);
        }
      });
    } else {
      poiMarkers.forEach(m => {
        if (m._poiCat === cat) {
          if (on) poiLayer.addLayer(m);
          else if (!planOn || !m._pt?.linked) poiLayer.removeLayer(m);
        }
      });
    }
  });
});
