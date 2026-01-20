import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { address } = await request.json();
    
    if (!address) {
      return NextResponse.json({ error: 'Address required' }, { status: 400 });
    }

    // Check if we have the required environment variables
    const apiKey = process.env.CDP_API_KEY_NAME;
    const privateKey = process.env.CDP_API_KEY_PRIVATE;

    if (!apiKey || !privateKey) {
      // Fallback: return a URL to Coinbase's buy page
      return NextResponse.json({ 
        fallback: true,
        url: `https://pay.coinbase.com/buy/select-asset?addresses={"${address}":["base"]}&assets=["ETH"]`
      });
    }

    // TODO: Implement full JWT signing when API keys are configured
    // For now, use fallback
    return NextResponse.json({ 
      fallback: true,
      url: `https://pay.coinbase.com/buy/select-asset?addresses={"${address}":["base"]}&assets=["ETH"]`
    });
    
  } catch (error) {
    console.error('Session token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


