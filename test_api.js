const test = async () => {
  try {
    const instanceName = 'user_test_' + Date.now();
    console.log('Creating instance:', instanceName);
    
    await fetch('http://localhost:8080/instance/create', {
      method: 'POST',
      headers: { 'apikey': '123456', 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName, qrcode: true, integration: 'WHATSAPP-BAILEYS' })
    });

    console.log('Waiting 5s for QR...');
    await new Promise(r => setTimeout(r, 5000));

    const res = await fetch(`http://localhost:8080/instance/connect/${instanceName}`, {
      headers: { 'apikey': '123456' }
    });
    const data = await res.json();
    console.log('QR Result:', data.base64 ? 'QR RECEIVED (base64)' : JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
}

test();
