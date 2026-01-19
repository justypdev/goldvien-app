'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';

const config = getDefaultConfig({
  appName: 'Gold Vein',
  projectId: 'goldvein',
  chains: [base],
  ssr: true,
  wallets: [], // This forces default wallets without Smart Wallet preference
});

// Override coinbase wallet to use regular wallet only
config.connectors = config.connectors?.map(connector => {
  if (connector.id === 'coinbaseWalletSDK') {
    return {
      ...connector,
      preference: 'eoaOnly', // Force regular Coinbase Wallet, no Smart Wallet
    };
  }
  return connector;
});

const queryClient = new QueryClient();

export function Providers({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#EAB308',
            accentColorForeground: 'black',
            borderRadius: 'large',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
