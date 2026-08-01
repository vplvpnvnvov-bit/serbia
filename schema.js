let _schemaDecor = null;
let _schemaClouds = null;
let _schemaSnow = null;
let _schemaRain = null;
let _schemaHitAreas = null;
let _schemaItems = null;
let _schemaNodes = null;
let _schemaAnimating = false;
let _schemaAnimFrame = null;
let _landscapeMode = false;
let _editMode = false;
let _manualPositions = {};
let _dragTarget = null;
let _dragStartX = 0, _dragStartY = 0, _dragOrigX = 0, _dragOrigY = 0;
let _landscapeOverrides = {};
let _landscapeElements = [];
let _currentCW = 0, _currentCH = 0;

const LANDSCAPE_DEFAULTS = {"spruce_1":{"x":27,"y":34},"mt_ru_5":{"x":179,"y":92},"spruce_14":{"x":251,"y":112},"mt_ru_1":{"x":147,"y":71},"boulder_4":{"x":92,"y":111},"boulder_6":{"x":60,"y":133},"spruce_7":{"x":208,"y":71},"spruce_16":{"x":149,"y":162},"spruce_3":{"x":88,"y":283},"mt_ru_6":{"x":77,"y":181},"spruce_17":{"x":149,"y":308},"peak_1":{"x":160,"y":251},"spruce_8":{"x":504,"y":186},"mt_ru_3":{"x":465,"y":207},"spruce_10":{"x":450,"y":90},"spruce_4":{"x":489,"y":136},"spruce_9":{"x":442,"y":175},"peak_2":{"x":246,"y":278},"birch_4":{"x":208,"y":261},"boulder_3":{"x":224,"y":250},"boulder_1":{"x":318,"y":206},"spruce_6":{"x":250,"y":202},"elk_1":{"x":175,"y":189},"spruce_2":{"x":221,"y":161},"spruce_13":{"x":301,"y":248},"spruce_11":{"x":486,"y":287},"spruce_18":{"x":448,"y":289},"spruce_15":{"x":413,"y":273},"birch_17":{"x":503,"y":241},"bear_track_2":{"x":470,"y":255},"mushroom_5":{"x":53,"y":479},"mushroom_2":{"x":124,"y":413},"hut_1":{"x":116,"y":327},"fox_1":{"x":184,"y":279},"mushroom_4":{"x":449,"y":629},"hut_3":{"x":447,"y":466},"mushroom_3":{"x":488,"y":511},"birch_11":{"x":494,"y":481},"boulder_9":{"x":466,"y":537},"birch_1":{"x":213,"y":681},"birch_18":{"x":394,"y":693},"wheat_1":{"x":370,"y":834},"wheat_4":{"x":491,"y":793},"boulder_7":{"x":306,"y":693},"birch_9":{"x":338,"y":632},"birch_2":{"x":214,"y":635},"hut_2":{"x":295,"y":653},"birch_7":{"x":81,"y":494},"birch_6":{"x":37,"y":661},"birch_15":{"x":203,"y":767},"horse_2":{"x":435,"y":742},"sunflower_3":{"x":47,"y":968},"sunflower_4":{"x":104,"y":1050},"sunflower_2":{"x":42,"y":1029},"tent_2":{"x":106,"y":998},"horse_1":{"x":354,"y":765},"birch_14":{"x":436,"y":633},"village_2":{"x":327,"y":1033},"wheat_3":{"x":471,"y":878},"wheat_2":{"x":388,"y":939},"wheat_5":{"x":464,"y":978},"sunflower_5":{"x":435,"y":1092},"sunflower_1":{"x":490,"y":1147},"tractor_2":{"x":503,"y":895},"village_1":{"x":277,"y":975},"tent_1":{"x":138,"y":1168},"birch_16":{"x":120,"y":942},"hut_5":{"x":165,"y":1294},"horse_4":{"x":138,"y":1497},"sunflower_9":{"x":212,"y":1176},"corn_1":{"x":188,"y":1347},"sunflower_8":{"x":413,"y":1165},"sunflower_6":{"x":52,"y":1135},"horse_3":{"x":46,"y":1456},"wheat_7":{"x":182,"y":1253},"linden_7":{"x":40,"y":1356},"corn_2":{"x":101,"y":1368},"house_3":{"x":336,"y":1315},"tractor_3":{"x":223,"y":1373},"eagle_1":{"x":492,"y":1463},"wheat_6":{"x":92,"y":1273},"oak_7":{"x":394,"y":1569},"ferris_1":{"x":434,"y":1636},"block_2":{"x":430,"y":1739},"beach_1":{"x":510,"y":1625},"block_1":{"x":468,"y":1587},"construction_1":{"x":322,"y":1707},"fortress_1":{"x":306,"y":1589},"linden_4":{"x":454,"y":1508},"spire_4":{"x":452,"y":1678},"oak_2":{"x":368,"y":1662},"linden_2":{"x":80,"y":1576},"block_4":{"x":348,"y":1611},"pine_7":{"x":337,"y":1766},"pigeon_1":{"x":472,"y":1635},"oak_10":{"x":394,"y":1617},"linden_3":{"x":491,"y":1677},"hill_sr_2":{"x":461,"y":1772},"sheep_2":{"x":399,"y":1779},"sheep_3":{"x":504,"y":1769},"oak_3":{"x":352,"y":1882},"sheep_1":{"x":291,"y":1819},"spring_1":{"x":50,"y":1775},"tent_3":{"x":408,"y":1902},"corn_3":{"x":164,"y":1409},"house_1":{"x":238,"y":1468},"hut_4":{"x":51,"y":1186},"house_2":{"x":303,"y":1396},"tractor_4":{"x":253,"y":1264},"wheat_8":{"x":222,"y":1307},"wheat_9":{"x":299,"y":1341},"sunflower_7":{"x":78,"y":1506},"spire_1":{"x":141,"y":1588},"linden_5":{"x":147,"y":1632},"spire_2":{"x":103,"y":1637},"linden_6":{"x":64,"y":1666},"clover_3":{"x":41,"y":1584},"oak_1":{"x":412,"y":1689},"pigeon_2":{"x":501,"y":1720},"pine_6":{"x":26,"y":1767},"hill_sr_8":{"x":83,"y":1868},"linden_1":{"x":252,"y":1866},"mushroom_8":{"x":21,"y":1781},"oak_6":{"x":75,"y":1789},"factory_1":{"x":271,"y":1714},"clover_2":{"x":273,"y":1810},"pine_5":{"x":93,"y":1858},"rabbit_1":{"x":444,"y":1951},"butterfly_6":{"x":63,"y":2023},"rock_1":{"x":83,"y":2011},"sheep_4":{"x":50,"y":1958},"rock_3":{"x":28,"y":1986},"spring_2":{"x":491,"y":2147},"hill_sr_12":{"x":413,"y":2067},"rabbit_2":{"x":360,"y":1892},"rabbit_3":{"x":489,"y":1910},"mushroom_7":{"x":85,"y":2186},"rock_2":{"x":242,"y":2162},"boulder_11":{"x":350,"y":2200},"boulder_12":{"x":302,"y":2111},"hill_sr_9":{"x":259,"y":2066},"hill_sr_14":{"x":344,"y":2021},"eagle_2":{"x":389,"y":2147},"pine_4":{"x":160,"y":2048},"pine_3":{"x":40,"y":2135},"hill_sr_13":{"x":171,"y":2199},"boulder_10":{"x":101,"y":2188},"tent_4":{"x":72,"y":1979},"oak_8":{"x":363,"y":1960},"mushroom_6":{"x":375,"y":1963},"oak_4":{"x":381,"y":1720},"hill_sr_3":{"x":228,"y":1778},"block_3":{"x":101,"y":1696},"spire_3":{"x":39,"y":1625},"spruce_19":{"x":135,"y":217},"boulder_8":{"x":120,"y":249},"swan_2":{"x":442,"y":555},"birch_3":{"x":331,"y":674},"birch_12":{"x":411,"y":458},"birch_10":{"x":490,"y":385},"swan_1":{"x":372,"y":568}};
const REF_CW = 540, REF_CH = 2260;

function convertToLandscapeOverrides(abs) {
  const out = {};
  Object.entries(abs || {}).forEach(([id, pos]) => {
    out[id] = { xr: pos.x / REF_CW, yr: pos.y / REF_CH };
  });
  return out;
}

function landscapePos(id, overrides) {
  const ovr = overrides[id];
  if (!ovr) return null;
  if (ovr.xr !== undefined) return ovr;
  // old absolute format — convert on the fly
  return { xr: ovr.x / REF_CW, yr: ovr.y / REF_CH };
}

// === SCHEMA TAB ===
const SCHEMA_ITEMS = [
  {id:'_rf',  t:'', v:true, icon:'🪹'},
  {id:'p10',  t:'Загранпаспорт мужа', icon:'🛂'},
  {id:'p5w',  t:'Загранпаспорт жены', icon:'🛂'},
  {id:'stamp',t:'Штамп гражданства', icon:'👶'},
  {id:'p5d',  t:'Загранпаспорт ребёнка', icon:'🛂'},
  {id:'nocrim_h',t:'Справка несудимости М', icon:'🏛️'},
  {id:'nocrim_w',t:'Справка несудимости Ж', icon:'🏛️'},
  {id:'apost_marr',t:'Апостиль на брак', icon:'🏢'},
  {id:'apost_birth',t:'Апостиль на рождение', icon:'🏢'},
  {id:'docs_done', t:'Сделать дела', v:true, icon:'⭐', gap:2},
  {id:'power', t:'Собрать документы', v:true, icon:'📚', gap:2},
  {id:'_ok',  t:'Собрать чемоданы', v:true, icon:'🧳', gap:3},
  {id:'m1_flight',t:'Перелёт в Белград', icon:'🛩', gap:3},
  {id:'m1_airbnb',t:'Заселение Airbnb', icon:'🏠'},
  {id:'reg',  t:'Белый картон', icon:'🪪'},
  {id:'m1_trans_base',t:'Перевод документов', icon:'📝'},
  {id:'m1_trans_diploma',t:'Перевод диплома', icon:'🎓'},
  {id:'m1_trans_vax',t:'Прививки перевод', icon:'💉'},
  {id:'m1_insurance',t:'Медстраховка', icon:'🏥'},
  {id:'m1_azk_submit',t:'Подача в AZK', icon:'📋'},
  {id:'m1_vnz_tax',t:'Оплата пошлин', icon:'💰'},
  {id:'m1_vnz_submit',t:'Подача на ВНЖ', icon:'📩'},
  {id:'_ok2', t:'Пакет готов', v:true, icon:'📚'},
  {id:'m1_vnz',t:'ВНЖ по Таланту', goal:true},
];

const SCHEMA_VIRTUAL_CHILDREN = {
  docs_done: ['dentist', 'med_vyps', 'power', 'loans'],
  power: ['child_consent', 'diplomas', 'driving_licenses'],
  _ok: ['pharm', 'habits', 'gadgets'],
};

function drawSchemaSign(ctx, { x, y, text, icon, done, prog, isVirtual, PX }) {
  let bg, border, tc;
  if (isVirtual)  { bg='#ede7f6'; border='#7e57c2'; tc='#4a148c'; }
  else if (done)  { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
  else if (prog)  { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
  else            { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }

  let pw = 0, ph = 0, pox = 0, poy = 0;
  if (text) {
    ctx.font = 'bold 9px sans-serif';
    const txtW = ctx.measureText(text).width;
    pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    ph = 10;
    pox = x - (pw * PX) / 2;
    poy = y - ph * PX - 6 * PX;

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
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, x, poy + (ph * PX) / 2);
  }

  if (icon) {
    ctx.font = '18px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(icon, x, y);
  }

  return { x: pox, y: poy, w: pw * PX, h: ph * PX };
}

function renderSchema() {
  const canvas = document.getElementById('schema-canvas');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const container = canvas.parentElement;
  const CW = container ? container.clientWidth - 2 : window.innerWidth - 20;
  const items = SCHEMA_ITEMS;
  const VIRTUAL_CHILDREN = SCHEMA_VIRTUAL_CHILDREN;

  const CH = Math.max((window.innerHeight - 100) * 2, 1600) * 1.4;
  const trailH = Math.max((window.innerHeight - 100) * 2, 1600);
  const PX = CW < 500 ? 2 : 3;
  _currentCW = CW; _currentCH = CH;
  canvas.style.width = CW + 'px';
  canvas.style.height = CH + 'px';
  canvas.width = CW * dpr;
  canvas.height = CH * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const state = getPlanState() || { tasks: {} };

  const n = items.length;
  const STEPS = 8;
  const baseStep = (trailH - 160) / (n - 1);

  const gaps = items.map(it => it.gap || 1);

  const itemOff = (i) => {
    let o = 0;
    for (let j = 1; j <= i; j++) {
      o += (Math.max(gaps[j - 1], gaps[j]) - 1) * baseStep;
    }
    return o;
  };

  const nodes = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = CW / 2 + Math.sin(t * Math.PI * 4) * (CW * 0.28) + Math.cos(t * Math.PI * 7) * (CW * 0.08);
    const y = 80 + t * (trailH - 160) + itemOff(i);
    nodes.push({ x, y });
  }

  const trail = [];
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

  function isTaskDoneOrVirtual(id) {
    const kids = VIRTUAL_CHILDREN[id];
    if (kids) return kids.every(cid => (state.tasks?.[cid] || {}).checked);
    return (state.tasks?.[id] || {}).checked;
  }

  let dinoIdx = 0;
  for (let i = n - 1; i >= 0; i--) {
    if (isTaskDoneOrVirtual(items[i].id)) { dinoIdx = Math.min(i + 1, n - 1); break; }
  }

  const bFY = (nodes[12].y + nodes[13].y) / 2;

  _schemaItems = items;
  _schemaNodes = nodes;

  // Zonal terrain: snowy Russia → green Serbia → sandy south
  const terrGrad = ctx.createLinearGradient(0, 0, 0, CH);
  terrGrad.addColorStop(0,      '#dce5ed'); // far north — snowy blue-white
  terrGrad.addColorStop(0.25,   '#e0e8d8'); // mid Russia — grey-green
  terrGrad.addColorStop(0.45,   '#d5e0c4'); // transition — light green
  terrGrad.addColorStop(0.55,   '#c8d8a8'); // Serbia north — lush green
  terrGrad.addColorStop(0.75,   '#d4ce9a'); // Serbia center — grassy
  terrGrad.addColorStop(1,      '#d9cfa0'); // Serbia south — sandy yellow
  ctx.fillStyle = terrGrad;
  ctx.fillRect(0, 0, CW, CH);

  // Parchment overlay (aged edges)
  for (let i = 0; i < 200; i++) {
    const rx = Math.random() * CW, ry = Math.random() * CH;
    ctx.fillStyle = 'rgba(180,140,80,' + (0.02 + Math.random() * 0.04) + ')';
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
  // ── Side task paths (drawn behind all decorations) ──
  const hitAreas = [];
  const SIDE_TASKS = SCHEMA_SIDE_TASKS;
  const parentGroups = {};
  SIDE_TASKS.forEach(st => { if (!parentGroups[st.parentId]) parentGroups[st.parentId] = []; parentGroups[st.parentId].push(st); });
  const placedSigns = [];
  Object.keys(parentGroups).forEach(pid => {
    const children = parentGroups[pid];
    const pIdx = items.findIndex(item => item.id === pid);
    if (pIdx < 0) return;
    const pNode = nodes[pIdx];
    const nIdx = Math.min(pIdx + 1, nodes.length - 1);
    const prIdx = Math.max(pIdx - 1, 0);
    const tdx = nodes[nIdx].x - nodes[prIdx].x;
    const tdy = nodes[nIdx].y - nodes[prIdx].y;
    const tLen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
    const perpX = -tdy / tLen;
    const perpY = tdx / tLen;
    const count = children.length;
    const signFootprint = 12 * PX + 25;
    const maxSpread = baseStep * ((items[pIdx].gap || 1) - 1) + baseStep * 0.6;
    const parentText = items[pIdx].t || '';
    ctx.font = 'bold 9px sans-serif';
    const parentTextW = ctx.measureText(parentText).width;
    const ppw = Math.max(Math.ceil(parentTextW / PX) + 4, 14);
    const parentSignX = pNode.x - (ppw * PX) / 2;
    const parentSignY = pNode.y - 10 * PX - 6 * PX;
    const parentSignW = ppw * PX;
    const parentSignH = 10 * PX;
    const spaceRight = CW - pNode.x - parentSignW / 2;
    const spaceLeft = pNode.x - parentSignW / 2;
    const rightRatio = spaceRight / (spaceLeft + spaceRight || 1);
    const nRight = Math.round(count * rightRatio);
    const nLeft = count - nRight;
    const placed = [];
    children.forEach((child, ci) => {
      child.side = ci < nRight ? -1 : 1;
      child.col = ci < nRight ? ci : ci - nRight;
      placed.push(child);
    });
    placed.forEach((child, ci) => {
      const availableOnSide = child.side === 1 ? pNode.x - parentSignW / 2 - 10 : CW - pNode.x - parentSignW / 2 - 10;
      const distRatio = 0.35 + child.col * 0.35;
      const dist = Math.max(CW * 0.12, Math.min(availableOnSide - 20, availableOnSide * distRatio));
      const gapY = maxSpread / (count + 1);
      const offset = (child.col + 1 - count / 2) * gapY;
      let sx = pNode.x + child.side * perpX * dist + offset * (tdx / tLen);
      let sy = pNode.y + child.side * perpY * dist + offset * (tdy / tLen);
      sx = Math.max(70, Math.min(CW - 70, sx));
      let childSignTop = sy - signFootprint;
      if (childSignTop < parentSignY + parentSignH && sy > parentSignY) { sy = parentSignY + parentSignH + signFootprint; childSignTop = sy - signFootprint; }
      sy = Math.max(signFootprint + 10, Math.min(CH - 20, sy));
      let candidateBounds = { x: sx - 65, y: childSignTop, w: 130, h: signFootprint };
      for (let attempt = 0; attempt < 6; attempt++) {
        const hit = placedSigns.find(ps => candidateBounds.x < ps.x + ps.w && candidateBounds.x + candidateBounds.w > ps.x && candidateBounds.y < ps.y + ps.h && candidateBounds.y + candidateBounds.h > ps.y);
        if (!hit) break;
        sx += child.side * perpX * 20; sy += (tdy / tLen) * 20;
        candidateBounds = { x: sx - 65, y: sy - signFootprint, w: 130, h: signFootprint };
      }
      if (_manualPositions[child.id]) { sx = pNode.x + _manualPositions[child.id].dx; sy = pNode.y + _manualPositions[child.id].dy; }
      else if (_editMode) { _manualPositions[child.id] = { dx: sx - pNode.x, dy: sy - pNode.y }; }
      const done = (state.tasks?.[child.id] || {}).checked;
      const prog = (state.tasks?.[child.id] || {}).progress;
      child._sx = sx; child._sy = sy; child._done = done; child._prog = prog;
      // Path line only (sign drawn later on top)
      const towardX = pNode.x - sx; const towardY = pNode.y - sy;
      const tpLen = Math.sqrt(towardX * towardX + towardY * towardY) || 1;
      const cpx = -towardY / tpLen; const cpy = towardX / tpLen;
      const waveAmp = Math.min(tpLen * 0.12, 20);
      ctx.strokeStyle = done ? '#81c784' : '#bbb';
      ctx.lineWidth = done ? 2.5 : 1.8; ctx.lineCap = 'round';
      if (!done) ctx.setLineDash([6, 10]);
      ctx.beginPath(); ctx.moveTo(sx, sy);
      let fromX = sx, fromY = sy;
      [{ t: 0.25, sign: 1 }, { t: 0.5, sign: -1 }, { t: 0.75, sign: 1 }].forEach((seg, segI) => {
        const toX = segI < 2 ? sx + towardX * seg.t : pNode.x;
        const toY = segI < 2 ? sy + towardY * seg.t : pNode.y;
        const midX = (fromX + toX) / 2 + cpx * waveAmp * seg.sign;
        const midY = (fromY + toY) / 2 + cpy * waveAmp * seg.sign;
        ctx.quadraticCurveTo(midX, midY, toX, toY);
        fromX = toX; fromY = toY;
      });
      ctx.stroke();
      if (!done) ctx.setLineDash([]);
    });
  });

  if (!_schemaDecor || _schemaDecor._cw !== CW || _schemaDecor._ch !== CH) {
    let rngSeed = 1;
    const rnd = () => { rngSeed = (rngSeed * 16807) % 2147483647; return (rngSeed - 1) / 2147483646; };
    const rint = (a, b) => Math.floor(rnd() * (b - a + 1)) + a;
    const dec = [];

    const randX = () => 15 + rnd() * (CW - 30);
    const rsz = (base, v) => base + rint(-v, v);

    const ruTop = 20, ruBot = bFY;
    const srTop = bFY, srBot = CH - 20;
    const ruZ = (a, b) => ruTop + (a + rnd() * (b - a)) * (ruBot - ruTop);
    const srZ = (a, b) => srTop + (a + rnd() * (b - a)) * (srBot - srTop);

    // ══════ 🇷🇺 RUSSIA ══════

    // Taiga north (0–25%): conifers, mountains, snow, rocks
    for (let i = 0; i < 16; i++) dec.push({ t:'spruce', x:randX(), y:ruZ(0, 0.25), sz:rsz(28, 6) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'spruce', x:randX(), y:ruZ(0.08, 0.35) });
    for (let i = 0; i < 6; i++)  dec.push({ t:'mt_ru', x:randX(), y:ruZ(0, 0.28), sz:rsz(70, 15) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'peak', x:randX(), y:ruZ(0, 0.2), sz:rsz(60, 10) });
    for (let i = 0; i < 6; i++)  dec.push({ t:'snow', x:randX(), y:ruZ(0, 0.25), r:rint(8, 20) });
    // Snow→rain transition 25-35%
    for (let i = 0; i < 3; i++)  dec.push({ t:'snow', x:randX(), y:ruZ(0.25, 0.35), r:rint(6, 14) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'rain', x:randX(), y:ruZ(0.25, 0.35) });
    for (let i = 0; i < 5; i++)  dec.push({ t:'boulder', x:randX(), y:ruZ(0, 0.32), sz:rsz(24, 6) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'bear_track', x:randX(), y:ruZ(0, 0.25) });
    dec.push({ t:'elk', x:randX(), y:ruZ(0.02, 0.22) });

    // Mixed forest centre (18–60%): birch, lakes, huts, fox, mushrooms
    for (let i = 0; i < 12; i++) dec.push({ t:'birch', x:randX(), y:ruZ(0.18, 0.60), sz:rsz(28, 6) });
    for (let i = 0; i < 5; i++)  dec.push({ t:'mushroom', x:randX(), y:ruZ(0.20, 0.55), sz:rsz(16, 4) });
    // Rain: mid Russia 35-55%
    for (let i = 0; i < 6; i++)  dec.push({ t:'rain', x:randX(), y:ruZ(0.35, 0.55) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'hut', x:randX(), y:ruZ(0.22, 0.58) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'butterfly', x:randX(), y:ruZ(0.18, 0.60) });
    dec.push({ t:'fox', x:randX(), y:ruZ(0.22, 0.55) });
    dec.push({ t:'elk', x:randX(), y:ruZ(0.15, 0.45) });
    const lakes = [];
    for (let i = 0; i < 4; i++) {
      const lx = randX(), ly = ruZ(0.08, 0.58);
      dec.push({ t:'lake', x:lx, y:ly, r:rint(3, 7) });
      lakes.push({ x:lx, y:ly });
    }
    lakes.sort((a, b) => b.y - a.y).slice(0, 2).forEach(l => dec.push({ t:'swan', x:l.x, y:l.y }));

    // Steppe south (50–100%): fields, horses, villages
    for (let i = 0; i < 5; i++)  dec.push({ t:'sunflower', x:randX(), y:ruZ(0.50, 1), sz:rsz(22, 6) });
    for (let i = 0; i < 5; i++)  dec.push({ t:'wheat', x:randX(), y:ruZ(0.50, 1), sz:rsz(18, 4) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'horse', x:randX(), y:ruZ(0.55, 0.95) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'tractor', x:randX(), y:ruZ(0.55, 0.98) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'village', x:randX(), y:ruZ(0.60, 0.98) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'tent', x:randX(), y:ruZ(0.55, 0.95) });
    // Mixed greenery throughout Russia
    for (let i = 0; i < 6; i++)  dec.push({ t:'birch', x:randX(), y:ruZ(0.10, 0.90), sz:rsz(22, 4) });
    for (let i = 0; i < 4; i++)  dec.push({ t:'boulder', x:randX(), y:ruZ(0.05, 0.60), sz:rsz(18, 6) });

    // ══════ 🇷🇸 SERBIA ══════

    // Vojvodina fields (0–35%): sunflowers, wheat, corn, farms, tractors
    for (let i = 0; i < 4; i++)  dec.push({ t:'sunflower', x:randX(), y:srZ(0, 0.35), sz:rsz(22, 6) });
    for (let i = 0; i < 4; i++)  dec.push({ t:'wheat', x:randX(), y:srZ(0, 0.35), sz:rsz(18, 4) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'corn', x:randX(), y:srZ(0, 0.35) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'house', x:randX(), y:srZ(0, 0.32) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'hut', x:randX(), y:srZ(0.02, 0.32) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'tractor', x:randX(), y:srZ(0.02, 0.33) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'horse', x:randX(), y:srZ(0.05, 0.32) });
    dec.push({ t:'eagle', x:randX(), y:srZ(0.02, 0.30) });

    // Belgrade + Sumadija (25–65%): city, fortress, parks, vineyards
    for (let i = 0; i < 2; i++)  dec.push({ t:'spire', x:randX(), y:srZ(0.25, 0.60), sz:rsz(32, 8), h:rint(6, 12) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'spire', x:randX(), y:srZ(0.30, 0.55), sz:rsz(24, 4), h:rint(4, 8) });
    for (let i = 0; i < 4; i++)  dec.push({ t:'block', x:randX(), y:srZ(0.28, 0.62) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'pigeon', x:randX(), y:srZ(0.25, 0.58) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'clover', x:randX(), y:srZ(0.28, 0.62) });
    dec.push({ t:'fortress', x:randX(), y:srZ(0.25, 0.50) });
    dec.push({ t:'ferris', x:randX(), y:srZ(0.35, 0.55) });
    dec.push({ t:'beach', x:randX(), y:srZ(0.32, 0.56) });
    dec.push({ t:'construction', x:randX(), y:srZ(0.30, 0.55) });
    dec.push({ t:'factory', x:randX(), y:srZ(0.42, 0.62) });
    // Trees + hills throughout Belgrade zone
    for (let i = 0; i < 5; i++)  dec.push({ t:'oak', x:randX(), y:srZ(0.25, 0.65), sz:rsz(32, 6) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'linden', x:randX(), y:srZ(0.25, 0.65), sz:rsz(18, 4) });
    for (let i = 0; i < 4; i++)  dec.push({ t:'hill_sr', x:randX(), y:srZ(0.28, 0.60), w:rint(10, 22), h:rint(6, 14) });

    // South mountains (50–100%): hills, pine, sheep, eagles, rabbits
    for (let i = 0; i < 10; i++) dec.push({ t:'hill_sr', x:randX(), y:srZ(0.50, 1), w:rint(12, 28), h:rint(8, 18) });
    for (let i = 0; i < 8; i++)  dec.push({ t:'pine', x:randX(), y:srZ(0.50, 1), sz:rsz(28, 6) });
    for (let i = 0; i < 4; i++)  dec.push({ t:'sheep', x:randX(), y:srZ(0.50, 0.95) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'eagle', x:randX(), y:srZ(0.52, 0.95) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'rabbit', x:randX(), y:srZ(0.55, 0.98) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'mushroom', x:randX(), y:srZ(0.55, 0.95), sz:rsz(16, 4) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'butterfly', x:randX(), y:srZ(0.50, 0.95) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'boulder', x:randX(), y:srZ(0.55, 1), sz:rsz(24, 8) });
    for (let i = 0; i < 3; i++)  dec.push({ t:'rock', x:randX(), y:srZ(0.60, 1) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'tent', x:randX(), y:srZ(0.50, 0.98) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'spring', x:randX(), y:srZ(0.55, 0.98) });
    for (let i = 0; i < 2; i++)  dec.push({ t:'lake', x:randX(), y:srZ(0.50, 0.95), r:rint(2, 6) });
    // Mixed greenery throughout Serbia
    for (let i = 0; i < 5; i++)  dec.push({ t:'oak', x:randX(), y:srZ(0.05, 0.95), sz:rsz(24, 4) });
    for (let i = 0; i < 4; i++)  dec.push({ t:'linden', x:randX(), y:srZ(0.05, 0.95), sz:rsz(14, 2) });

    // ── Clouds (all over, denser near boundary) ──
    for (let i = 0; i < 25; i++) {
      const zoneR = rnd();
      let cy;
      if (zoneR < 0.15) cy = bFY - 60 + rnd() * 120;
      else if (zoneR < 0.5) cy = ruTop + rnd() * (bFY - ruTop - 40);
      else cy = bFY + 40 + rnd() * (srBot - bFY - 40);
      dec.push({ t:'cloud', x:15 + rnd() * (CW - 30), y:cy, isRu: cy < bFY, shape:rint(0, 2) });
    }

    // ── Boundary line (wavy state border at flight level) ──
    const bPts = [];
    const bSteps = 24;
    for (let i = 0; i <= bSteps; i++) {
      const t = i / bSteps;
      const bx = 10 + t * (CW - 20);
      const by = bFY + Math.sin(t * Math.PI * 4) * 18 + Math.cos(t * Math.PI * 6) * 10;
      bPts.push({x:bx, y:by});
    }
    dec.push({ t:'boundary', pts:bPts, flagY:bFY });

    // Push away from trail — shift toward nearest edge
    dec.forEach(d => {
      if (d.t === 'cloud' || d.t === 'boundary' || d.t === 'snow' || d.t === 'rain' || d.t === 'butterfly') return;
      const tx = trailXAt(d.y);
      const margin = d.t === 'lake' ? 60 : d.t === 'mt_ru' || d.t === 'peak' ? 50 : Math.max(25, CW * 0.09);
      const dist = d.x - tx;
      const absDist = Math.abs(dist);
      if (absDist < margin) {
        const toLeft = d.x;
        const toRight = CW - d.x;
        // Push toward the nearer edge, but at least to margin distance
        d.x = toLeft < toRight
          ? Math.max(10, tx - margin - rnd() * (CW * 0.2))
          : Math.min(CW - 10, tx + margin + rnd() * (CW * 0.2));
      }
    });

    _schemaDecor = dec;
    _schemaDecor._cw = CW;
    _schemaDecor._ch = CH;
    _schemaClouds = dec.filter(d => d.t === 'cloud');
    _schemaSnow = dec.filter(d => d.t === 'snow');
    _schemaRain = dec.filter(d => d.t === 'rain');

    // Assign stable IDs for landscape editing
    const typeCounts = {};
    dec.forEach(d => {
      if (d.t === 'cloud' || d.t === 'boundary' || d.t === 'lake' || d.t === 'snow' || d.t === 'rain') return;
      typeCounts[d.t] = (typeCounts[d.t] || 0) + 1;
      d._id = d.t + '_' + typeCounts[d.t];
    });
    // Build lookup for drag
    _landscapeElements = dec.filter(d => d._id);
  }

  // ── Draw lakes (background) ──
  {
    _schemaDecor.forEach(d => {
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
  const cx = 50, cy0 = 85;
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

  // ── Decorative elements over trail (hills, trees, animals, boundary) ──
  {
    const S = PX;
    _schemaDecor.forEach(d => {
      if (d.t === 'lake') return;
      if (d.t === 'snow') return;
      if (d.t === 'rain') return;
      if (d.t === 'butterfly') return;
      // Emoji-based elements
      const emojiMap = {mt_ru:'🏔',spruce:'🌲',birch:'🌳',oak:'🌳',linden:'🌿',peak:'🗻',boulder:'🪨',hut:'🏚',wheat:'🌾',sunflower:'🌻',village:'🏘',tent:'🏕',house:'🏡',construction:'🏗',clover:'☘️',beach:'🏖',sheep:'🐑',rabbit:'🐇',rock:'🪨',spring:'🌊',ferris:'🎡',factory:'🏭',pine:'🌲',block:'🏘',bear_track:'🐾',elk:'🦌',swan:'🦢',eagle:'🦅',pigeon:'🕊',fortress:'🏰',spire:'🏛️',fox:'🦊',horse:'🐎',mushroom:'🍄',corn:'🌽',tractor:'🚜'};
      const szMap = {mt_ru:70,spruce:28,birch:28,oak:32,linden:16,peak:60,boulder:24,hut:22,wheat:18,sunflower:22,village:28,tent:20,house:26,construction:24,clover:16,beach:26,sheep:20,rabbit:18,rock:22,spring:20,ferris:32,factory:26,pine:28,block:26,bear_track:20,elk:16,swan:14,eagle:16,pigeon:14,fortress:20,spire:32,fox:22,horse:26,mushroom:16,corn:20,tractor:24};
      if (emojiMap[d.t]) {
        let ex = d.x, ey = d.y;
        const lpos = _landscapeOverrides[d._id];
        if (lpos) {
          ex = lpos.xr * CW;
          ey = lpos.yr * CH;
        }
        // Push away from trail
        const tx = trailXAt(ey);
        const margin = Math.max(25, CW * 0.09);
        if (Math.abs(ex - tx) < margin) {
          const toLeft = ex;
          const toRight = CW - ex;
          const seed = (d._id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
          const drift = ((seed % 20) - 10);
          ex = toLeft < toRight
            ? Math.max(10, tx - margin - drift)
            : Math.min(CW - 10, tx + margin + drift);
        }
        ctx.font = (d.sz || szMap[d.t] || 20) + 'px serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#000';
        ctx.fillText(emojiMap[d.t], ex, ey);
        if (_landscapeMode) {
          ctx.strokeStyle = '#ff6d00'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(ex, ey, 14, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,109,0,0.2)';
          ctx.beginPath(); ctx.arc(ex, ey, 14, 0, Math.PI * 2); ctx.fill();
        }
        return;
      }
      if (d.t === 'hill_sr') {
        let hx = d.x, hy = d.y;
        const lpos = _landscapeOverrides[d._id];
        if (lpos) {
          hx = lpos.xr * CW;
          hy = lpos.yr * CH;
        }
        const tx = trailXAt(hy);
        const margin = Math.max(25, CW * 0.09);
        if (Math.abs(hx - tx) < margin) {
          const seed = (d._id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
          const drift = ((seed % 20) - 10);
          hx = hx < CW / 2
            ? Math.max(10, tx - margin - drift)
            : Math.min(CW - 10, tx + margin + drift);
        }
        const bw = d.w*S, bh = d.h*S, bx = hx - bw/2, by = hy;
        ctx.lineJoin = 'round';
        ctx.fillStyle='#33691e'; ctx.beginPath();
        ctx.moveTo(bx-1, by+bh); ctx.lineTo(bx+bw/2, by); ctx.lineTo(bx+bw+1, by+bh); ctx.fill();
        ctx.fillStyle='#689f38'; ctx.beginPath();
        ctx.moveTo(bx+2, by+bh); ctx.lineTo(bx+bw/2, by+4); ctx.lineTo(bx+bw-2, by+bh); ctx.fill();
        ctx.fillStyle='#aed581'; ctx.beginPath();
        ctx.moveTo(bx+bw*0.25, by+bh); ctx.lineTo(bx+bw/2, by+bh*0.2); ctx.lineTo(bx+bw*0.75, by+bh); ctx.fill();
        ctx.lineJoin = 'miter';
        if (_landscapeMode) {
          ctx.strokeStyle = '#ff6d00'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.stroke();
          ctx.fillStyle = 'rgba(255,109,0,0.2)';
          ctx.beginPath(); ctx.arc(hx, hy, 14, 0, Math.PI * 2); ctx.fill();
        }
        return;
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
    let done = s.checked, prog = s.progress;

    if (item.v) {
      const kids = VIRTUAL_CHILDREN[item.id];
      if (kids) {
        const states = kids.map(cid => state.tasks?.[cid] || {});
        done = states.every(s => s.checked);
        prog = !done && states.some(s => s.checked || s.progress);
      }
    }

    let bg, border, tc;
    if (item.v && !done && !prog) { bg='#ede7f6'; border='#7e57c2'; tc='#4a148c'; }
    else if (done)                { bg='#81c784'; border='#388e3c'; tc='#1b5e20'; }
    else if (prog)                { bg='#fff176'; border='#f9a825'; tc='#e65100'; }
    else                          { bg='#d7ccc8'; border='#8d6e3f'; tc='#4e342e'; }

    ctx.font = 'bold 9px sans-serif';
    const txtW = ctx.measureText(item.t).width;
    const pw = Math.max(Math.ceil(txtW / PX) + 4, 14);
    const ph = 10;
    const pox = sx - (pw * PX) / 2;
    const poy = sy - ph * PX - 6 * PX;

    if (item.id !== 'power' && item.id !== '_ok' && item.id !== 'docs_done' && item.id !== '_rf') {
      const itemNote = state.tasks?.[item.id]?.note || '';
      if (itemNote) {
        ctx.fillStyle = '#ffc107';
        ctx.beginPath();
        ctx.arc(pox + pw * PX, poy, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      hitAreas.push({ id:item.id, x:pox - 4, y:poy - 4, w:pw * PX + 8, h:ph * PX + 6 * PX + 8, note: itemNote || undefined });
    }

    // Plank board — pixel-style rectangle with nail details
    if (item.t) {
      if (i === dinoIdx) { ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 12; }
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
    }

    // Item icon on the trail node
    if (item.icon) {
      ctx.font = '18px serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(item.icon, sx, sy);
    }
  });

  _schemaHitAreas = hitAreas;

  // ── Side task signs (drawn on top of trail, items) ──
  SCHEMA_SIDE_TASKS.forEach(st => {
    if (st._sx == null) return;
    const sign = drawSchemaSign(ctx, { x: st._sx, y: st._sy, text: st.text, icon: st.icon, done: st._done, prog: st._prog, PX });
    const sNote = state.tasks?.[st.id]?.note || '';
    if (sNote) {
      ctx.fillStyle = '#ffc107';
      ctx.beginPath();
      ctx.arc(sign.x + sign.w, sign.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    hitAreas.push({ id: st.id, x: sign.x - 4, y: sign.y - 4, w: sign.w + 8, h: sign.h + 6 * PX + 8, note: sNote || undefined });
    placedSigns.push({ x: sign.x, y: sign.y, w: sign.w, h: sign.h + 6 * PX + 8 });
  });

  const now = Date.now();

  // Pixel-art Bird
  const prevN = dinoIdx > 0 ? nodes[dinoIdx - 1] : nodes[0];
  const nextN = nodes[dinoIdx];
  const goingLeft = nextN.x < prevN.x;
  const dp = { x: (prevN.x + nextN.x) / 2, y: (prevN.y + nextN.y) / 2 };
  const frame = Math.floor(now / 250) % 4;
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
  px(10, 3, 2, 1, '#ffffff');
  px(11, 3, 1, 1, '#000000'); // pupil
  px(10, 2, 2, 1, '#1565c0'); // brow
  // Tail
  px(1, 5, 3, 1, '#0d47a1');
  px(2, 6, 2, 1, '#0d47a1');
  // Legs (drawn before wing so wing covers them when down)
  px(6, 9, 1, 2, '#ff8f00');
  px(8, 9, 1, 2, '#ff8f00');
  // Wing (flapping)
  if (wingUp < 2) {
    px(5, 0 - wingUp, 3, 3 + wingUp, '#1565c0');
    px(4, 1 - wingUp, 1, 3 + wingUp, '#1565c0');
  } else {
    px(5, 6, 3, 4, '#1565c0');
    px(4, 7, 1, 4, '#1565c0');
  }
  ctx.restore();

  // Boundary glow — visible from flight start to landing complete
  const flightState = state.tasks?.m1_flight || {};
  const airbnbState = state.tasks?.m1_airbnb || {};
  if ((flightState.checked || flightState.progress) && !airbnbState.checked) {
    const pulse = Math.sin(now * 0.004) * 0.3 + 0.7;
    ctx.save();
    ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20 * pulse;
    ctx.strokeStyle = 'rgba(0,229,255,' + (0.2 * pulse) + ')'; ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(10, bFY); ctx.lineTo(CW - 10, bFY); ctx.stroke(); ctx.setLineDash([]);
    ctx.restore();
  }

  // Start animation loop when tab is open
  if (!_schemaAnimating) {
    _schemaAnimating = true;
    let lastFrame = 0;
    function animLoop(ts) {
      if (!document.getElementById('tab-schema')?.classList.contains('active')) {
        _schemaAnimating = false;
        _schemaAnimFrame = null;
        return;
      }
      if (!_editMode && !_landscapeMode && (ts - lastFrame >= 200)) {
        lastFrame = ts;
        renderSchema();
      }
      _schemaAnimFrame = requestAnimationFrame(animLoop);
    }
    _schemaAnimFrame = requestAnimationFrame(animLoop);
  }

  const planeT = (now * 0.02 % (CW + 60));
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
  const clouds = _schemaClouds || [];
  clouds.forEach(d => {
    const dx = ((d.x + now * 0.015) % (CW + 40)) - 20;
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

  // Animated rain (mid Russia)
  const raindrops = _schemaRain || [];
  raindrops.forEach(d => {
    const fallY = (now * 0.08 + d.x * 0.02) % 70;
    const driftX = Math.sin(now * 0.002 + d.y * 0.03) * 5;
    const alpha = 0.2 + Math.sin(now * 0.005 + d.x * 0.03) * 0.2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '14px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💧', d.x + driftX, d.y + fallY - 35);
    ctx.restore();
  });

  // Animated snowflakes (Russia north only)
  const snowflakes = _schemaSnow || [];
  snowflakes.forEach(d => {
    const floatX = Math.sin(now * 0.001 + d.x * 0.05) * 8;
    const floatY = (now * 0.015 + d.y * 0.01) % 40;
    const alpha = 0.4 + Math.sin(now * 0.003 + d.x * 0.02) * 0.3;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = (d.r || 14) + 'px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('❄️', d.x + floatX, d.y + floatY - 20);
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
  setTimeout(() => { try {
    const toggle = document.getElementById('toggle-schema-editor');
    if (toggle) { toggle.checked = localStorage.getItem('schema-editor-enabled') === 'true'; }
    updateSchemaToolbar();
    renderSchema(); renderLegend();
  } catch(e) { showUserError(e, 'Карта релокации'); } }, 100);
});

const schemaCanvas = document.getElementById('schema-canvas');
if (schemaCanvas && !schemaCanvas.dataset.clickBound) {
  schemaCanvas.dataset.clickBound = '1';
  schemaCanvas.addEventListener('click', e => {
    const rect = schemaCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    (_schemaHitAreas || []).some(area => {
      if (mx >= area.x && mx <= area.x + area.w && my >= area.y && my <= area.y + area.h) {
        scrollToChecklistItem(area.id);
        if (navigator.vibrate) navigator.vibrate(30);
        return true;
      }
    });
  });

  let _schemaTooltip = null;
  function schemaTooltip() {
    if (!_schemaTooltip) {
      _schemaTooltip = document.createElement('div');
      _schemaTooltip.style.cssText = 'position:fixed;z-index:9999;background:rgba(60,50,40,0.93);color:#fff;padding:6px 12px;border-radius:8px;font-size:12px;font-family:sans-serif;pointer-events:none;display:none;max-width:280px;line-height:1.4;box-shadow:0 2px 12px rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.1)';
      document.body.appendChild(_schemaTooltip);
      schemaCanvas.addEventListener('mouseleave', () => { _schemaTooltip.style.display = 'none'; });
      schemaCanvas.addEventListener('mousemove', e => {
        const rect = schemaCanvas.getBoundingClientRect();
        const mx = e.clientX - rect.left, my = e.clientY - rect.top;
        let found = null;
        (_schemaHitAreas || []).some(area => {
          if (area.note && mx >= area.x && mx <= area.x + area.w && my >= area.y && my <= area.y + area.h) {
            found = area; return true;
          }
        });
        if (found) {
          _schemaTooltip.textContent = '📝 ' + found.note;
          _schemaTooltip.style.display = 'block';
          let tx = e.clientX + 14, ty = e.clientY - 8;
          if (tx + 290 > window.innerWidth) tx = window.innerWidth - 290;
          _schemaTooltip.style.left = tx + 'px';
          _schemaTooltip.style.top = ty + 'px';
          schemaCanvas.style.cursor = 'default';
        } else {
          _schemaTooltip.style.display = 'none';
          schemaCanvas.style.cursor = '';
        }
      });
    }
    return _schemaTooltip;
  }
  schemaTooltip();
}

// Sync: обновление после загрузки из облака
window.addEventListener('sync-loaded', () => {
  console.log('[sync] sync-loaded handler fired');
  const active = document.activeElement;
  const isEditing = active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT');
  if (isEditing) { console.log('[sync] skip — editing'); return; }
  try {
    renderPlan();
    const schemaTab = document.getElementById('tab-schema');
    if (schemaTab && schemaTab.classList.contains('active')) { renderSchema(); renderLegend(); }
  } catch (e) { showUserError(e, 'Обновление из облака'); }
});

// === SCHEMA EDIT MODE ===
const SCHEMA_SIDE_TASKS = [
  { parentId:'_ok',         id:'pharm',          text:'Собрать аптечку',       icon:'💊' },
  { parentId:'_ok',         id:'habits',         text:'Привычные вещи',        icon:'🧴' },
  { parentId:'_ok',         id:'gadgets',        text:'Техника в дорогу',      icon:'🔌' },
  { parentId:'docs_done',   id:'med_vyps',       text:'Медицинские выписки',   icon:'📋' },
  { parentId:'docs_done',   id:'dentist',        text:'Стоматология',          icon:'🦷' },
  { parentId:'docs_done',   id:'power',          text:'Доверенность',          icon:'📝' },
  { parentId:'docs_done',   id:'loans',          text:'Закрыть кредиты',       icon:'💳' },
  { parentId:'power',       id:'child_consent',   text:'Согласие на выезд',    icon:'✍️' },
  { parentId:'power',       id:'diplomas',        text:'Дипломы о вышке',      icon:'🎓' },
  { parentId:'power',       id:'driving_licenses',text:'Водительские права',    icon:'🚗' },
  { parentId:'nocrim_h',    id:'apost_nocrim_h',  text:'Апостиль НС (М)',      icon:'👮' },
  { parentId:'nocrim_w',    id:'apost_nocrim_w',  text:'Апостиль НС (Ж)',      icon:'👮' },
  { parentId:'m1_flight',   id:'ticket_buy',      text:'Купить билеты',        icon:'🎫' },
  { parentId:'m1_flight',   id:'airbnb_book',     text:'Забронировать Airbnb', icon:'💻' },
];
const SCHEMA_PARENT_IDS = {};
SCHEMA_SIDE_TASKS.forEach(st => { SCHEMA_PARENT_IDS[st.id] = st.parentId; });

const DEFAULT_MANUAL_OFFSETS = {
  pharm: { dx: 114, dy: -22 },
  habits: { dx: -105, dy: 30 },
  gadgets: { dx: 130, dy: 50 },
  med_vyps: { dx: 165, dy: -100 },
  dentist: { dx: -32, dy: -94 },
  power: { dx: 102, dy: 31 },
  child_consent: { dx: -35, dy: 80 },
  diplomas: { dx: 153, dy: -50 },
  driving_licenses: { dx: 127, dy: 33 },
  apost_nocrim_h: { dx: 64, dy: 30 },
  apost_nocrim_w: { dx: 93, dy: 53 },
  ticket_buy: { dx: 67, dy: -137 },
  airbnb_book: { dx: -123, dy: -46 },
  loans: { dx: 275, dy: -25 },
};

try {
  const saved = JSON.parse(localStorage.getItem('schema-manual-offsets') || 'null');
  _manualPositions = saved || DEFAULT_MANUAL_OFFSETS;
} catch { _manualPositions = DEFAULT_MANUAL_OFFSETS; }

try {
  const saved = JSON.parse(localStorage.getItem('schema-landscape-overrides') || 'null');
  if (saved && Object.keys(saved).length) {
    const first = saved[Object.keys(saved)[0]];
    _landscapeOverrides = (first && first.xr !== undefined && !Object.values(saved).some(v => isNaN(v.xr)))
      ? saved
      : convertToLandscapeOverrides(saved);
  } else {
    _landscapeOverrides = convertToLandscapeOverrides(LANDSCAPE_DEFAULTS);
  }
} catch { _landscapeOverrides = convertToLandscapeOverrides(LANDSCAPE_DEFAULTS); }

function exportManualPositions() {
  const lines = [];
  if (_landscapeMode) {
    lines.push('// Landscape overrides (scales with screen):');
    lines.push('const LANDSCAPE_OVERRIDES = {');
    Object.keys(_landscapeOverrides).forEach(id => {
      const p = _landscapeOverrides[id];
      lines.push(`  ${id}: { x: ${Math.round(p.xr * REF_CW)}, y: ${Math.round(p.yr * REF_CH)} },`);
    });
    lines.push('};');
  } else {
    lines.push('// Offsets from parent node (dx, dy):');
    lines.push('const MANUAL_OFFSETS = {');
    Object.keys(_manualPositions).forEach(id => {
      const p = _manualPositions[id];
      lines.push(`  ${id}: { dx: ${Math.round(p.dx)}, dy: ${Math.round(p.dy)} },`);
    });
    lines.push('};');
  }
  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    alert('Скопировано в буфер обмена!');
  }).catch(() => {
    prompt('Скопируйте вручную:', text);
  });
}

document.getElementById('btn-schema-edit')?.addEventListener('click', () => {
  _editMode = true;
  _landscapeMode = false;
  document.getElementById('btn-schema-edit').classList.add('hidden');
  document.getElementById('btn-landscape-edit').classList.add('hidden');
  document.getElementById('btn-schema-export').classList.remove('hidden');
  document.getElementById('btn-schema-exit').classList.remove('hidden');
  schemaCanvas.style.touchAction = 'none';
  _schemaDecor = null;
  renderSchema();
});

document.getElementById('btn-landscape-edit')?.addEventListener('click', () => {
  _landscapeMode = true;
  _editMode = false;
  document.getElementById('btn-schema-edit').classList.add('hidden');
  document.getElementById('btn-landscape-edit').classList.add('hidden');
  document.getElementById('btn-schema-export').classList.remove('hidden');
  document.getElementById('btn-schema-exit').classList.remove('hidden');
  schemaCanvas.style.touchAction = 'none';
  _schemaDecor = null;
  renderSchema();
});

document.getElementById('btn-schema-exit')?.addEventListener('click', () => {
  _editMode = false;
  _landscapeMode = false;
  document.getElementById('btn-schema-edit').classList.remove('hidden');
  document.getElementById('btn-landscape-edit').classList.remove('hidden');
  document.getElementById('btn-schema-export').classList.add('hidden');
  document.getElementById('btn-schema-exit').classList.add('hidden');
  schemaCanvas.style.touchAction = '';
  _schemaDecor = null;
  renderSchema();
});

document.getElementById('btn-schema-export')?.addEventListener('click', () => {
  exportManualPositions();
});

// Toolbar visibility toggle
function updateSchemaToolbar() {
  const show = localStorage.getItem('schema-editor-enabled') === 'true';
  document.getElementById('schema-toolbar')?.classList.toggle('hidden', !show);
  if (!show) { _editMode = false; _landscapeMode = false; }
}

document.getElementById('toggle-schema-editor')?.addEventListener('change', e => {
  const on = e.target.checked;
  localStorage.setItem('schema-editor-enabled', on ? 'true' : 'false');
  if (!on) { _editMode = false; _landscapeMode = false; }
  updateSchemaToolbar();
});

if (schemaCanvas && !schemaCanvas.dataset.dragBound) {
  schemaCanvas.dataset.dragBound = '1';

  function getCanvasPos(e) {
    const rect = schemaCanvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function findLandscapeAt(mx, my) {
    for (const el of _landscapeElements) {
      if (!el._id) continue;
      const ovr = _landscapeOverrides[el._id];
      const ex = ovr ? ovr.xr * _currentCW : el.x;
      const ey = ovr ? ovr.yr * _currentCH : el.y;
      if (mx >= ex - 20 && mx <= ex + 20 && my >= ey - 20 && my <= ey + 20) return el._id;
    }
    return null;
  }

  function findChildAt(mx, my) {
    for (const id of Object.keys(_manualPositions)) {
      const off = _manualPositions[id];
      if (!off || off.dx === undefined) continue;
      const pid = SCHEMA_PARENT_IDS[id];
      if (!pid) continue;
      const idx = _schemaItems.findIndex(item => item.id === pid);
      if (idx < 0) continue;
      const nd = _schemaNodes[idx];
      const sx = nd.x + off.dx, sy = nd.y + off.dy;
      if (mx >= sx - 40 && mx <= sx + 40 && my >= sy - 30 && my <= sy + 20) return id;
    }
    return null;
  }

  schemaCanvas.addEventListener('pointerdown', e => {
    if (!_editMode && !_landscapeMode) return;
    const pos = getCanvasPos(e);

    if (_landscapeMode) {
      const id = findLandscapeAt(pos.x, pos.y);
      if (id) {
        e.preventDefault();
        _dragTarget = id;
        const el = _landscapeElements.find(e => e._id === id);
        const ovr = _landscapeOverrides[id];
        if (ovr) {
          _dragStartX = pos.x; _dragStartY = pos.y;
          _dragOrigX = ovr.xr * _currentCW;
          _dragOrigY = ovr.yr * _currentCH;
        } else if (el) {
          _dragStartX = pos.x; _dragStartY = pos.y;
          _dragOrigX = el.x;
          _dragOrigY = el.y;
        }
        schemaCanvas.setPointerCapture(e.pointerId);
        return;
      }
    }

    if (_editMode) {
      const id = findChildAt(pos.x, pos.y);
      if (id) {
        e.preventDefault();
        _dragTarget = id;
        _dragStartX = pos.x; _dragStartY = pos.y;
        const off = _manualPositions[id];
        _dragOrigX = off.dx;
        _dragOrigY = off.dy;
        schemaCanvas.setPointerCapture(e.pointerId);
      }
    }
  });

  schemaCanvas.addEventListener('pointermove', e => {
    if ((!_editMode && !_landscapeMode) || !_dragTarget) return;
    e.preventDefault();
    const pos = getCanvasPos(e);

    if (_landscapeMode) {
      const absX = Math.round(_dragOrigX + pos.x - _dragStartX);
      const absY = Math.round(_dragOrigY + pos.y - _dragStartY);
      _landscapeOverrides[_dragTarget] = {
        xr: absX / _currentCW,
        yr: absY / _currentCH,
      };
      renderSchema();
      return;
    }

    if (_editMode) {
      _manualPositions[_dragTarget] = {
        dx: Math.round(_dragOrigX + pos.x - _dragStartX),
        dy: Math.round(_dragOrigY + pos.y - _dragStartY),
      };
      renderSchema();
    }
  });

  schemaCanvas.addEventListener('pointerup', () => {
    if (!_editMode && !_landscapeMode) return;
    if (_dragTarget) {
      if (_landscapeMode) localStorage.setItem('schema-landscape-overrides', JSON.stringify(_landscapeOverrides));
      else localStorage.setItem('schema-manual-offsets', JSON.stringify(_manualPositions));
      _dragTarget = null;
    }
  });
}

