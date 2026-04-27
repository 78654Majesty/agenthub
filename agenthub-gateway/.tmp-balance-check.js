const urls = ['https://api.devnet.solana.com'];
const wallets = [
  '271jbyEXuaz5Q9EgGbyba5vBSiikL3G6SpvUon5t4q2T',
  '7Hk3nVfE9xKzR1pQ4wM8bY2cJ5dA6tL3sF9aPqProvider1',
  '3Mq7kR2pX8nVf5wB1cJ4dA6tL9sF0aPqE7xKzProvider2',
  '5xK9mQr2pX8nVf1wB3cJ4dA6tL7sF0aPqE9xConsumer1',
  '9pQr4vBm8nVf2wB6cJ1dA3tL5sF7aPqE0xKzConsumer2'
];

async function rpc(method, params) {
  const body = { jsonrpc: '2.0', id: 1, method, params };
  const res = await fetch(urls[0], {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  return json;
}

(async()=>{
  for (const w of wallets) {
    try {
      const out = await rpc('getBalance', [w, { commitment: 'confirmed' }]);
      if (out.error) {
        console.log(`${w} | error: ${out.error.message}`);
      } else {
        const lamports = out.result?.value ?? 0;
        const sol = lamports / 1e9;
        console.log(`${w} | ${sol} SOL`);
      }
    } catch (e) {
      console.log(`${w} | fetch_error: ${e.message}`);
    }
  }
})();
