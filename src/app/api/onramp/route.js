import { NextResponse } from 'next/server';
import * as jose from 'jose';

export async function POST(request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const keyId = process.env.CDP_API_KEY_ID;
    const privateKeyPem = process.env.CDP_API_KEY_SECRET;

    if (!keyId || !privateKeyPem) {
      console.error('Missing CDP API credentials');
      // Fallback to direct URL
      return NextResponse.json({ 
        fallback: true,
        url: `https://pay.coinbase.com/buy/select-asset?addresses={"${address}":["base"]}&assets=["ETH"]`
      });
    }

    // Convert the private key (handle \n as actual newlines)
    const formattedKey = privateKeyPem.replace(/\\n/g, '\n');
    
    // Import the EC private key (SEC1 format)
    const privateKey = await jose.importPKCS8(
      formattedKey.replace('EC PRIVATE KEY', 'PRIVATE KEY'), 
      'ES256'
    ).catch(async () => {
      // If PKCS8 fails, try importing as JWK after conversion
      const ecKey = await crypto.subtle.importKey(
        'pkcs8',
        pemToBuffer(formattedKey),
        { name: 'ECDSA', namedCurve: 'P-256' },
        true,
        ['sign']
      );
      return ecKey;
    });

    // Create JWT
    const now = Math.floor(Date.now() / 1000);
    const jwt = await new jose.SignJWT({
      sub: keyId,
      iss: 'cdp',
      aud: ['cdp_service'],
      uris: ['https://api.developer.coinbase.com/onramp/v1/token'],
    })
      .setProtectedHeader({ 
        alg: 'ES256', 
        kid: keyId,
        typ: 'JWT',
        nonce: crypto.randomUUID(),
      })
      .setIssuedAt(now)
      .setNotBefore(now)
      .setExpirationTime(now + 120)
      .sign(privateKey);

    // Request session token from Coinbase
    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        destination_wallets: [
          {
            address: address,
            blockchains: ['base'],
            assets: ['ETH'],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CDP API error:', response.status, errorText);
      // Fallback on error
      return NextResponse.json({ 
        fallback: true,
        url: `https://pay.coinbase.com/buy/select-asset?addresses={"${address}":["base"]}&assets=["ETH"]`
      });
    }

    const data = await response.json();
    
    if (data.token) {
      return NextResponse.json({ 
        token: data.token,
        url: `https://pay.coinbase.com/buy?sessionToken=${data.token}`
      });
    }

    // Fallback
    return NextResponse.json({ 
      fallback: true,
      url: `https://pay.coinbase.com/buy/select-asset?addresses={"${address}":["base"]}&assets=["ETH"]`
    });
    
  } catch (error) {
    console.error('Session token error:', error);
    // Fallback on any error
    const body = await request.clone().json().catch(() => ({}));
    return NextResponse.json({ 
      fallback: true,
      url: `https://pay.coinbase.com/buy/select-asset?addresses={"${body.address || ''}":["base"]}&assets=["ETH"]`
    });
  }
}

// Helper to convert PEM to buffer
function pemToBuffer(pem) {
  const base64 = pem
    .replace(/-----BEGIN.*-----/, '')
    .replace(/-----END.*-----/, '')
    .replace(/\s/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}



