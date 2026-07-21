const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Запуск интеллектуальной автоматической сборки ===');

// 1. Получаем текущую версию из package.json
const pkgPath = path.join(__dirname, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const currentVersion = pkg.version;

let [major, minor, patch] = currentVersion.split('.').map(Number);

// 2. Получаем короткий хэш и сообщение последнего коммита из Git
let buildHash = 'dev';
let commitMessage = '';
try {
  buildHash = execSync('git rev-parse --short HEAD').toString().trim();
  commitMessage = execSync('git log -1 --pretty=%B').toString().trim().toLowerCase();
  console.log(`> Последний коммит: "${commitMessage}" (${buildHash})`);
} catch (e) {
  console.warn('⚠️ Не удалось получить данные из Git, используем значения по умолчанию.');
}

// 3. Автоматически определяем, какую цифру версии повышать
if (commitMessage.includes('breaking') || commitMessage.includes('major')) {
  major += 1;
  minor = 0;
  patch = 0;
  console.log(`📈 Обнаружено мажорное изменение. Повышаем Major до v${major}.${minor}.${patch}`);
} else if (commitMessage.includes('feat') || commitMessage.includes('feature') || commitMessage.includes('add')) {
  minor += 1;
  patch = 0;
  console.log(`✨ Обнаружена новая фича. Повышаем Minor до v${major}.${minor}.${patch}`);
} else {
  patch += 1;
  console.log(`🐞 Мелкая правка или багфикс. Повышаем Patch до v${major}.${minor}.${patch}`);
}

const newVersion = `${major}.${minor}.${patch}`;
const fullVersion = `${newVersion}-${buildHash}`;
const cacheName = `relocation-v${fullVersion}`;

// 4. Записываем обновленную версию обратно в package.json
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
console.log(`✓ package.json успешно перезаписан на версию: ${newVersion}`);

// 5. Патчим app.js
let appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');
const appConfigRegex = /window\.APP_CONFIG\s*=\s*\{[\s\S]*?\n\};/;
const newAppConfig = `window.APP_CONFIG = {
  VERSION: "${newVersion}",
  BUILD: "${buildHash}",
  CACHE_NAME: "${cacheName}",
  MIN_SPLASH_MS: 5000
};`;

if (appConfigRegex.test(appJs)) {
  appJs = appJs.replace(appConfigRegex, newAppConfig);
} else {
  appJs = newAppConfig + "\n\n" + appJs;
}
fs.writeFileSync(path.join(__dirname, 'app.js'), appJs, 'utf-8');
console.log('✓ app.js успешно обновлен!');

// 6. Патчим sw.js
let swJs = fs.readFileSync(path.join(__dirname, 'sw.js'), 'utf-8');
const swCacheRegex = /const\s+CACHE_NAME\s*=\s*['"`][\s\S]*?['"`];/;
const newSwCache = `const CACHE_NAME = '${cacheName}';`;

if (swCacheRegex.test(swJs)) {
  swJs = swJs.replace(swCacheRegex, newSwCache);
} else {
  swJs = newSwCache + "\n" + swJs;
}
fs.writeFileSync(path.join(__dirname, 'sw.js'), swJs, 'utf-8');
console.log('✓ sw.js успешно обновлен!');

// 7. Патчим index.html
let indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

indexHtml = indexHtml.replace(/(href="style\.css)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);
indexHtml = indexHtml.replace(/(src="data\.js)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);
indexHtml = indexHtml.replace(/(src="sync\.js)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);
indexHtml = indexHtml.replace(/(src="app\.js)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);
indexHtml = indexHtml.replace(/(src="inline\.js)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);

fs.writeFileSync(path.join(__dirname, 'index.html'), indexHtml, 'utf-8');
console.log('✓ index.html успешно обновлен! Кэш-бастинг настроен на ?v=' + fullVersion);

// 8. Фетч цены авиабилета Москва → Белград
void async function fetchAviaPrice() {
  const https = require('https');
  const aviaPricePath = path.join(__dirname, 'data', 'avia-price.json');
  let aviaPriceDisplay = '– ₽';
  const tomorrow = new Date(Date.now() + 864e5);
  const searchDate = String(tomorrow.getDate()).padStart(2,'0') + String(tomorrow.getMonth()+1).padStart(2,'0');
  try {
    const dotenv = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
    const tokenMatch = dotenv.match(/^TRAVELPAYOUTS_TOKEN=(.+)$/m);
    if (tokenMatch) {
      const token = tokenMatch[1].trim();
      const departureDate = tomorrow.toISOString().slice(0,10);
      const apiUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=MOW&destination=BEG&direct=true&one_way=1&currency=rub&limit=1&departure_at=${departureDate}&token=${token}`;
      const priceData = JSON.parse(await new Promise((resolve, reject) => {
        https.get(apiUrl, res => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => resolve(body));
        }).on('error', reject);
      }));
      if (priceData.data && priceData.data.length > 0) {
        const best = priceData.data[0];
        const priceObj = {
          price: best.price,
          airline: best.airline,
          flight_number: best.flight_number,
          departure_at: best.departure_at,
          fetched_at: Date.now() / 1000
        };
        fs.writeFileSync(aviaPricePath, JSON.stringify(priceObj, null, 2), 'utf-8');
        aviaPriceDisplay = `${best.price.toLocaleString('ru-RU')} ₽`;
        const d = new Date(best.departure_at);
        const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        console.log(`✓ Цена авиабилета: ${aviaPriceDisplay} (${best.airline} ${best.flight_number} — ${dateStr})`);
      }
    }
  } catch (e) {
    // Пробуем загрузить из кеша
    try {
      const cached = JSON.parse(fs.readFileSync(aviaPricePath, 'utf-8'));
      if (cached.price) aviaPriceDisplay = `${cached.price.toLocaleString('ru-RU')} ₽`;
    } catch (_) {}
    console.warn(`⚠️ Не удалось получить цену авиабилета: ${e.message}`);
  }
  indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');
  const priceSpanRegex = /(<span id="avia-price-val">)([\s\S]*?)(<\/span>)/;
  indexHtml = indexHtml.replace(priceSpanRegex, `$1${aviaPriceDisplay}$3`);
  const hrefRegex = /(href="https:\/\/www\.aviasales\.ru\/search\/MOW)\d{0,4}(BEG1")/;
  indexHtml = indexHtml.replace(hrefRegex, `$1${searchDate}$2`);
  fs.writeFileSync(path.join(__dirname, 'index.html'), indexHtml, 'utf-8');
  console.log(`✓ Плашка цены авиабилета: ${aviaPriceDisplay}`);
}();

console.log(`=== Автоматическая сборка завершена! Новая версия: v${newVersion} (${buildHash}) ===`);
