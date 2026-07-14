const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Получаем версию из package.json
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const version = pkg.version;

// 2. Получаем короткий хэш последнего коммита из Git
let buildHash = 'dev';
try {
  buildHash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn("Не удалось получить хэш из Git, используем заглушку 'dev'");
}

const fullVersion = `${version}-${buildHash}`;
const cacheName = `relocation-v${fullVersion}`;

console.log(`=== Запуск сборки версии: v${version} (Сборка: ${buildHash}) ===`);

// 3. Патчим app.js: находим объект конфигурации и перезаписываем его значения
let appJs = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf-8');
const appConfigRegex = /window\.APP_CONFIG\s*=\s*\{[\s\S]*?\};/;
const newAppConfig = `window.APP_CONFIG = {
  VERSION: "${version}",
  BUILD: "${buildHash}",
  CACHE_NAME: "${cacheName}"
};`;

if (appConfigRegex.test(appJs)) {
  appJs = appJs.replace(appConfigRegex, newAppConfig);
} else {
  appJs = newAppConfig + "\n\n" + appJs;
}
fs.writeFileSync(path.join(__dirname, 'app.js'), appJs, 'utf-8');
console.log('✓ app.js успешно обновлен!');

// 4. Патчим sw.js: заменяем константу CACHE_NAME
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

// 5. Патчим index.html: динамически обновляем параметры кэш-бастинга (?v=...)
let indexHtml = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

indexHtml = indexHtml.replace(/(href="style\.css)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);
indexHtml = indexHtml.replace(/(src="data\.js)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);
indexHtml = indexHtml.replace(/(src="sync\.js)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);
indexHtml = indexHtml.replace(/(src="app\.js)(?:\?v=[^"]*)?(")/g, `$1?v=${fullVersion}$2`);

fs.writeFileSync(path.join(__dirname, 'index.html'), indexHtml, 'utf-8');
console.log('✓ index.html успешно обновлен! Кэш-бастинг настроен на ?v=' + fullVersion);

console.log('=== Сборка успешно завершена! ===');
