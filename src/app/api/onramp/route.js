import { NextResponse } from 'next/server';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

export async function POST(request) {
  let address = '';
  
  try {
    const body = await request.json();
    address = body.address || '';
    
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    const keyId = process.env.CDP_API_KEY_ID;
    const keySecret = process.env.CDP_API_KEY_SECRET;

    if (!keyId || !keySecret) {
      console.log('No CDP credentials, using fallback');
      return NextResponse.json({ 
        fallback: true,
        url: buildFallbackUrl(address)
      });
    }

    // Format the secret - replace escaped newlines with actual newlines
    const formattedSecret = keySecret.replace(/\\n/g, '\n');

    // Generate JWT using the official CDP SDK
    const jwt = await generateJwt({
      apiKeyId: keyId,
      apiKeySecret: formattedSecret,
      requestMethod: 'POST',
      requestHost: 'api.developer.coinbase.com',
      requestPath: '/onramp/v1/token',
      expiresIn: 120
    });

    // Request session token from Coinbase
    const response = await fetch('https://api.developer.coinbase.com/onramp/v1/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        destination_wallets: [{
          address: address,
          blockchains: ['base'],
          assets: ['ETH'],
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('CDP API error:', response.status, errorText);
      return NextResponse.json({ 
        fallback: true,
        url: buildFallbackUrl(address)
      });
    }

    const data = await response.json();
    
    if (data.token) {
      return NextResponse.json({ 
        token: data.token,
        url: `https://pay.coinbase.com/buy?sessionToken=${data.token}`
      });
    }

    return NextResponse.json({ 
      fallback: true,
      url: buildFallbackUrl(address)
    });
    
  } catch (error) {
    console.error('Session token error:', error.message);
    return NextResponse.json({ 
      fallback: true,
      url: buildFallbackUrl(address)
    });
  }
}

function buildFallbackUrl(address) {
  const addr = address || '0x0000000000000000000000000000000000000000';
  return `https://pay.coinbase.com/buy/select-asset?addresses=${encodeURIComponent(JSON.stringify({[addr]: ["base"]}))}&assets=${encodeURIComponent(JSON.stringify(["ETH"]))}`;
}



