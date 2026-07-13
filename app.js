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
    { id:"stamp", text:"Штамп о гражданстве РФ на свидетельстве о рождении ребёнка", price:"", link:"", tip:"Без красного штампа МВД на обороте свидетельства загранпаспорт ребёнку не сделают.\n\nОбратиться в МВД по месту жительства (паспортный стол). Подать: паспорт родителя + свидетельство о рождении. Ставят в день обращения." },
    { id:"nocrim_h", text:"Справка о несудимости (муж) — бумажная, с живой печатью", price:"", hasDate:true, expires:6, link:"", tip:"Госуслуги → Услуги → Справки, выписки → Справка о наличии (отсутствии) судимости.\n\nШаг 1: Заказать онлайн (заполнить 2 минуты).\nШаг 2: Через 2–3 дня придёт уведомление.\nШаг 3: Забрать ГОТОВУЮ справку в МВД (распечатка с Госуслуг НЕ подойдёт).\nСрок действия — 6 месяцев. Рекомендуется сразу поставить апостиль." },
    { id:"nocrim_w", text:"Справка о несудимости (жена) — бумажная, с живой печатью", price:"", hasDate:true, expires:6, link:"", tip:"То же, что для мужа.\n\nГосуслуги → Услуги → Справки, выписки → Справка о наличии (отсутствии) судимости.\nСрок действия — 6 месяцев. При подаче на ВНЖ сербский МУП может потребовать апостилированную справку." },
    { id:"nocrim_apost_h", text:"Апостиль на справку о несудимости (муж)", price:"2500", hasDate:true, expires:6, link:"", tip:"Сдать оригинал справки в МФЦ или Минюст.\nГоспошлина ~2500₽.\nСрок — до 5 рабочих дней.\nВажно: сам апостиль бессрочный, НО справка о несудимости действительна 6 месяцев. Дата в поле ниже — дата выдачи справки." },
    { id:"nocrim_apost_w", text:"Апостиль на справку о несудимости (жена)", price:"2500", hasDate:true, expires:6, link:"", tip:"Сдать оригинал справки в МФЦ или Минюст.\nГоспошлина ~2500₽.\nСрок — до 5 рабочих дней.\nВажно: сам апостиль бессрочный, НО справка о несудимости действительна 6 месяцев. Дата в поле ниже — дата выдачи справки." },
    { id:"child_consent", text:"Нотариальное согласие на выезд ребёнка (если едет один родитель)", price:"2000", link:"", tip:"Заверяется у нотариуса. Нужны: паспорт родителя, свидетельство о рождении ребёнка.\nУказать страны (вписать Сербию) и срок.\nЕсли едете всей семьёй — не нужно." },
  ]},
  { cat: "📄 Апостили и легализация", items: [
    { id:"apost_marr", text:"Апостиль на свидетельство о браке (оригинал)", price:"2500", link:"", tip:"Сдать оригинал свидетельства в МФЦ или ЗАГС.\nГоспошлина 2500₽.\nСрок — до 5 рабочих дней.\nБез апостиля супруге могут отказать в ВНЖ на основании вашего ИП.\nАпостиль бессрочный." },
    { id:"apost_birth", text:"Апостиль на свидетельство о рождении ребёнка", price:"2500", link:"", tip:"Сдать оригинал в МФЦ или ЗАГС.\nПотребуется для ВНЖ ребёнка и в будущем для записи в сад/школу.\nАпостиль бессрочный." },
    { id:"apost_diploma", text:"Апостиль на диплом об образовании (с приложением)", price:"2500", link:"", tip:"Заказать в Минобрнауки или МФЦ.\nГоспошлина 2500₽.\nСрок ~30 дней.\nНужен для нострификации (подтверждения диплома) в Сербии.\nАпостиль бессрочный." },
    { id:"translation_copies", text:"Нотариальные копии и переводы документов на сербский язык", price:"", link:"", tip:"Переводы делает судебный переводчик (судски тумач) уже в Сербии.\nНайти можно в группах «Русские в Сербии» или по запросу в Google Maps «sudski tumač».\nНотариальное заверение копий — сделать в РФ до отъезда." },
  ]},
  { cat: "📚 Образование и нострификация", items: [
    { id:"diploma", text:"Диплом об образовании (с приложением с оценками)", price:"", link:"", tip:"Оригинал или нотариально заверенная копия.\nНужен для нострификации, если ИП требует подтверждения квалификации или для ВНЖ как специалист.\nПриложение с оценками обязательно." },
    { id:"diploma_eng", text:"Перевод диплома на сербский или английский", price:"", link:"", tip:"Заказать у судебного переводчика в Сербии (судски тумач) или в бюро переводов в РФ.\nДля нострификации нужен перевод на сербский язык." },
  ]},
  { cat: "📄 Документы в Сербии", items: [
    { id:"reg", text:"Регистрация пребывания (белый картон)", price:"", link:"", tip:"В течение 24 часов после въезда.\nДелает хозяин квартиры / арендодатель через полицию (МУП).\nШаг 1: Арендодатель идёт в МУП с договором аренды + твой загранпаспорт.\nШаг 2: Получаешь белую карточку (potvrda o prijavi boravka).\nХранить при себе — могут проверить на улице." },
    { id:"vnd", text:"Подача на ВНД (вид на жительство)", price:"", link:"", tip:"Основание: открытие ИП (предузетник), работа по контракту, учёба или недвижимость.\n\nШаг 1: Собрать пакет документов (загранпаспорт, регистрация, справка о несудимости с апостилем, медстраховка).\nШаг 2: Записаться в МУП по месту пребывания.\nШаг 3: Сдать документы, забрать справку о принятии.\nСрок рассмотрения — 2–4 месяца." },
    { id:"pib", text:"Налоговый номер (PIB)", price:"", link:"", tip:"Получить в Налоговой службе (Poreska Uprava).\n\nШаг 1: Прийти в отделение с загранпаспортом и регистрацией.\nШаг 2: Заполнить форму.\nШаг 3: Получить PIB в тот же день.\nНужен для работы, аренды, открытия счёта в банке, таможни." },
    { id:"preduzetnik", text:"Открытие ИП (предузетник)", price:"", link:"", tip:"Регистрация через АПР (Agencija za privredne registre) или ЦРС (Centralni registar).\n\nПотребуется: загранпаспорт, PIB, адрес регистрации, название деятельности (шифр).\nМожно открыть онлайн или через бухгалтера.\nПосле открытия нужно встать на учёт в Poreska Uprava." },
  ]},
  { cat: "🏦 Финансы и налоги", items: [
    { id:"bank", text:"Открытие счёта в сербском банке (Raiffeisen / Intesa / OTP)", price:"", link:"", tip:"Потребуется: загранпаспорт, PIB, регистрация.\nМинимальный взнос ~10 000 RSD.\n\nШаг 1: Выбрать банк (Raiffeisen и Intesa — самые дружелюбные к нерезидентам).\nШаг 2: Прийти в отделение с документами.\nШаг 3: Пройти комплаенс — могут запросить происхождение средств.\nСчёт открывают за 1–3 дня." },
    { id:"tax_decl", text:"Налоговые декларации (3-НДФЛ / 2-НДФЛ / выписка из ЛК ФНС)", price:"", link:"", tip:"Скачать:\n— Госуслуги → Услуги → Налоги и финансы → Налоговая декларация (3-НДФЛ)\n— Или ЛК ФНС на nalog.ru → Доходы → Справки 2-НДФЛ.\n\nЭти документы нужны сербскому банку для подтверждения легальности доходов.\nЖелательно перевести на английский (можно самим)." },
    { id:"bank_stat", text:"Выписки по банковским счетам в РФ за 3–6 месяцев (на английском)", price:"", link:"", tip:"Запросить в мобильном приложении банка:\n— Сбербанк: чат → «Выписка на английском»\n— Т-Банк: «Профиль» → «Справки» → «Выписка на английском»\n— Альфа-Банк: «О себе» → «Справки»\n\nПонадобятся при комплаенсе в сербском банке." },
    { id:"power", text:"Генеральная доверенность на родственника в РФ (на 5–10 лет)", price:"2000", hasDate:true, expires:120, link:"", tip:"Сделать у нотариуса в РФ.\n\nПонадобится: паспорт, данные родственника (ФИО, паспорт, адрес).\nЧто включить: распоряжение имуществом, закрытие счетов, получение документов.\nЛучше сделать максимум — 10 лет.\nПосле отъезда сделать её будет невозможно." },
  ]},
  { cat: "🏠 Жильё", items: [
    { id:"rent", text:"Договор аренды жилья", price:"от 500€/мес", hasDate:true, link:"", tip:"Заключить договор с арендодателем.\nЗадаток: обычно 1 месяц + 1 месяц аренды.\n\nИскать: CityExpert, HaloOglasi, группы «Аренда в Белграде» в Telegram.\nДоговор нужен для регистрации пребывания (белый картон)." },
  ]},
  { cat: "❤️ Здоровье и медицина", items: [
    { id:"insure", text:"Медицинская страховка (международная, покрывает Сербию)", price:"200-400€", hasDate:true, expires:12, link:"", tip:"Покрытие ~200–400€/год на семью.\n\nПроверить: входит ли Сербия в зону покрытия (не все страховки включают).\nКарту иметь при себе — могут спросить при регистрации в МУП.\nРекомендую: Europ Assistance, Cherehapa, TKB." },
    { id:"vaccine", text:"Карта профилактических прививок ребёнка (форма 063/у)", price:"", link:"", tip:"Запросить в детской поликлинике по месту жительства.\n\nЧто взять: подробную выписку со всеми прививками (корь, краснуха, паротит — критично, без них не возьмут в сад).\nПеревести у судебного переводчика в Сербии." },
    { id:"med_cards", text:"Медицинские выписки при хронических заболеваниях (все члены семьи)", price:"", link:"", tip:"Взять в поликлинике истории болезней, рецепты, назначения врачей.\nВажно: торговые названия лекарств в Сербии другие — нужны действующие вещества (МНН).\nВыписки пригодятся при посещении врача в Сербии." },
    { id:"dentist", text:"Пройти стоматологов всей семьёй в РФ", price:"", link:"", tip:"В Сербии стоматология дороже (в 1.5–2 раза).\nСделать: лечение, гигиена, пломбы, профилактику до отъезда." },
    { id:"pharm", text:"Собрать аптечку с привычными лекарствами", price:"", link:"", tip:"Многие лекарства в Сербии продаются строго по рецепту.\nВзять с запасом на полгода: жаропонижающие, обезболивающие, от аллергии, сорбенты, противовирусные.\nРецептурные: если принимаете постоянно — взять максимум." },
  ]},
  { cat: "🚗 Транспорт / Автомобиль", items: [
    { id:"license", text:"Перевод водительских прав на сербский язык", price:"", link:"", tip:"Сделать у судебного переводчика (судски тумач) в Сербии.\n\nРоссийские права действуют 6 месяцев с даты въезда.\nПеревод нужен для: аренды авто, покупки, страховки, обмена на сербские права." },
    { id:"car_power", text:"Нотариальная доверенность на выезд за границу (если машина не на вас)", price:"", link:"", tip:"Если автомобиль на юрлицо или родственника.\nОформить у нотариуса в РФ: доверенность с правом выезда за границу.\nЖелательно на русском + английском языке." },
    { id:"kbm", text:"Справка из страховой о безаварийном стаже (КБМ) на английском", price:"", link:"", tip:"Обратиться в свою страховую компанию (запросить в чате или отделении).\nСправка поможет получить скидку ~30–50% на ОСАГО (осигурање) в Сербии." },
    { id:"car_docs", text:"СТС и ПТС (оригиналы на машину)", price:"", hasDate:true, link:"", tip:"Для ввоза или перерегистрации авто в Сербии.\nСделать нотариальные копии — оригиналы лучше не возить с собой каждый день." },
  ]},
  { cat: "📱 Прочее", items: [
    { id:"sim", text:"Сим-карта сербского оператора (A1 / Telenor / mts)", price:"1000 RSD", link:"", tip:"Купить в салоне связи. Нужен загранпаспорт.\n\nA1 → prepaid: 7 дней / 30 дней / 90 дней.\nYettel (бывш. Telenor) → prepaid.\nmts → prepaid.\nКонтрактные тарифы (месячная подписка) выгоднее, если планируете остаться." },
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
      const savedForNote = saved;
      const saveNsNote = () => {
        const val = nsTA.value.trim();
        savedForNote[itemId] = savedForNote[itemId] || {};
        savedForNote[itemId].note = val;
        localStorage.setItem('checklist', JSON.stringify(savedForNote));
        nsText.classList.remove('hidden');
        nsEdit.classList.add('hidden');
        if (val) {
          nsText.innerHTML = '📝 ' + val;
          ns.classList.remove('hidden');
        } else {
          nsText.innerHTML = '';
          ns.classList.add('hidden');
        }
      };
      nsSave.addEventListener('click', e => { e.stopPropagation(); saveNsNote(); });
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

// Sync: обновление после загрузки из облака
window.addEventListener('sync-loaded', () => {
  renderChecklist();
  calcTotal();
  updateLockUI();
});
