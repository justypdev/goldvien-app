import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Gold Vein - 7-Level Referral Mining | BaseGold',
  description: 'Earn passive BG income through 7 levels of referrals.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#0a0a0f] text-white min-h-screen">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
