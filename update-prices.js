const fs = require('fs');
const path = require('path');
const https = require('https');

console.log('=== Обновление цены авиабилета ===');

const aviaPricePath = path.join(__dirname, 'data', 'avia-price.json');

let token = process.env.TRAVELPAYOUTS_TOKEN;
if (!token) {
  try {
    const dotenv = fs.readFileSync(path.join(__dirname, '.env'), 'utf-8');
    const m = dotenv.match(/^TRAVELPAYOUTS_TOKEN=(.+)$/m);
    if (m) token = m[1].trim();
  } catch (_) {}
}
if (!token) { console.error('TRAVELPAYOUTS_TOKEN не найден'); process.exit(1); }

const tomorrow = new Date(Date.now() + 864e5);
const departureDate = tomorrow.toISOString().slice(0, 10);
const apiUrl = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=MOW&destination=BEG&direct=true&one_way=1&currency=rub&limit=1&departure_at=${departureDate}&token=${token}`;

void async function main() {
  try {
    const body = await new Promise((resolve, reject) => {
      https.get(apiUrl, res => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });
    const priceData = JSON.parse(body);
    if (!priceData.data || priceData.data.length === 0) {
      console.log('Нет рейсов на завтра. Сохраняю кеш.');
      process.exit(0);
    }
    const best = priceData.data[0];
    const priceObj = {
      price: best.price,
      airline: best.airline,
      flight_number: best.flight_number,
      departure_at: best.departure_at,
      fetched_at: Date.now() / 1000
    };
    fs.writeFileSync(aviaPricePath, JSON.stringify(priceObj, null, 2), 'utf-8');
    const d = new Date(best.departure_at);
    const dateStr = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    console.log(`✓ ${best.price.toLocaleString('ru-RU')} ₽ (${best.airline} ${best.flight_number} — ${dateStr})`);
  } catch (e) {
    console.error('Ошибка:', e.message);
    process.exit(1);
  }
}();
