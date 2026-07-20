(function(){
  var _splashStart = Date.now();

  var CLOUDS = [
    { top:4, left:5, w:260, h:90, dur:13, op:.40, del:0 },
    { top:15, left:55, w:200, h:70, dur:9, op:.35, del:-4 },
    { top:35, left:25, w:340, h:110, dur:14, op:.30, del:-2 },
    { top:50, left:70, w:280, h:85, dur:11, op:.40, del:-6 },
    { top:65, left:8, w:180, h:60, dur:15, op:.25, del:-8 },
    { top:78, left:60, w:240, h:75, dur:10, op:.35, del:-3 },
    { top:92, left:35, w:150, h:50, dur:17, op:.20, del:-10 },
  ];

  var splash = document.getElementById('splash-screen');
  if (splash) {
    CLOUDS.forEach(function(c){
      var el = document.createElement('div');
      el.className = 'splash-cloud';
      el.style.cssText = 'top:' + c.top + '%;left:' + c.left + '%;width:' + c.w + 'px;height:' + c.h + 'px;animation-duration:' + c.dur + 's;opacity:' + c.op + ';animation-delay:' + c.del + 's';
      splash.insertBefore(el, splash.firstChild);
    });
  }

  var QUOTES = [
    'Дорогу осилит идущий',
    'Готовь сани летом, а документы — до переезда',
    'Семь раз проверь бумаги — один раз подай',
    'Глаза боятся, а руки собирают чемоданы',
    'Под лежачий камень вода не течёт — как и ВНЖ',
    'Терпение и труд — и боравак твой',
    'Лучший план — это запасной план',
    'Кто владеет информацией — тот владеет переездом',
    'Переезд — это не катастрофа, а приключение',
    'Будь готов к любым неожиданностям — и их не будет',
    'Не боги ВНЖ оформляют, а люди с терпением',
    'Србија те чека',
    'Белград ждёт, но бумаги — нет',
    'Бюрократия — это марафон, а не спринт',
    'Лучше переплатить за апостиль, чем за адвоката',
  ];
  var qEl = document.getElementById('splash-quote');
  if (qEl) qEl.textContent = '"' + QUOTES[Math.floor(Math.random() * QUOTES.length)] + '"';

  window.hideSplash = function() {
    var el = document.getElementById('splash-screen');
    if (!el) return;
    var elapsed = Date.now() - _splashStart;
    var minMs = window._MIN_SPLASH_MS || 5000;
    if (elapsed < minMs) {
      setTimeout(function(){ el.classList.add('hidden'); }, minMs - elapsed);
    } else {
      el.classList.add('hidden');
    }
  };
})();
