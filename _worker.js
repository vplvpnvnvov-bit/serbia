export default {
  async fetch(request) {
    const url = new URL(request.url);
    const date = url.searchParams.get('date');
    if (!date) return new Response('missing ?date=', { status: 400 });

    const token = TRAVELPAYOUTS_TOKEN;
    const api = `https://api.travelpayouts.com/aviasales/v3/prices_for_dates?origin=MOW&destination=BEG&direct=true&one_way=1&currency=rub&limit=1&departure_at=${date}&token=${token}`;

    const res = await fetch(api);
    const body = await res.text();

    return new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600',
      },
    });
  }
};
