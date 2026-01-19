// App.jsx - Main App wrapper with Base SDK providers
// This is the entry point for the Gold Vein Base App

import React from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import GoldVein from './GoldVein';

import '@coinbase/onchainkit/styles.css';
import './styles.css';

// ═══════════════════════════════════════════════════════════════════
//                         CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

// Get your API key from https://portal.cdp.coinbase.com/
const CDP_API_KEY = process.env.NEXT_PUBLIC_CDP_API_KEY || 'YOUR_CDP_API_KEY';

// Wagmi config for Base network
const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    coinbaseWallet({
      appName: 'Gold Vein - BaseGold.io',
      preference: 'smartWalletOnly', // Use smart wallet for better UX
    }),
  ],
  transports: {
    [base.id]: http(),
  },
});

const queryClient = new QueryClient();

// ═══════════════════════════════════════════════════════════════════
//                         MAIN APP
// ═══════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={CDP_API_KEY}
          chain={base}
          config={{
            appearance: {
              name: 'Gold Vein',
              logo: 'https://basegold.io/logo.png',
              mode: 'dark',
              theme: 'custom',
            },
          }}
        >
          <GoldVein />
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
