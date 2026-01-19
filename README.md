# Gold Vein - Base App SDK

## 7-Level Referral Mining System for BaseGold.io

A fully integrated Base App SDK application with wallet connection, token swaps, ETH top-up, and referral tracking.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @coinbase/onchainkit @tanstack/react-query wagmi viem
```

### 2. Deploy the Smart Contract

First, deploy `GoldVein.sol` to Base network:

```bash
# In your Hardhat project
npx hardhat run scripts/deploy.js --network base
```

### 3. Update Contract Address

In `GoldVein.jsx`, update line 18:

```javascript
const GOLD_VEIN_ADDRESS = '0x_YOUR_DEPLOYED_ADDRESS';
```

### 4. Set Your CDP API Key

Get your API key from [Coinbase Developer Portal](https://portal.cdp.coinbase.com/)

In `App.jsx` or your `.env`:

```bash
NEXT_PUBLIC_CDP_API_KEY=your_api_key_here
```

### 5. Add to Your App

```jsx
// In your basegold.io routing
import GoldVeinApp from './goldvein-app/App';

// Add route
<Route path="/goldvein" element={<GoldVeinApp />} />
```

---

## 📁 File Structure

```
goldvein-app/
├── App.jsx           # Main wrapper with providers
├── GoldVein.jsx      # Core application component
├── styles.css        # Custom gold-themed styles
└── README.md         # This file

contracts/
└── GoldVein.sol      # Smart contract
```

---

## 🔗 Referral System

### Both Link AND Code Support

Users get **two ways** to share their referral:

**1. Referral Link:**
```
https://basegold.io/goldvein?ref=0x1234...
```

**2. Referral Code:**
```
GV-1A2B3C4D
```

### How Referrals Work

When someone clicks a referral link:
1. URL param `?ref=` is auto-detected
2. Referrer field is pre-filled
3. User just needs to connect wallet and activate

When someone has a referral code:
1. They enter it manually in the referrer field
2. Currently requires full address (code → address lookup can be added)

---

## 💰 Distribution Model

```
0.10 BG Activation
├── 🔥  5% → BURNED     (0.005 BG)
├── 👤 50% → Level 1    (0.050 BG)  ← Direct referrer
├── 👤 18% → Level 2    (0.018 BG)
├── 👤 11% → Level 3    (0.011 BG)
├── 👤  7% → Level 4    (0.007 BG)
├── 👤  5% → Level 5    (0.005 BG)
├── 👤  3% → Level 6    (0.003 BG)
└── 👤  1% → Level 7    (0.001 BG)
```

**No Treasury. 95% to users. 5% burned.**

---

## 🎨 Features

### Wallet Connection
- Coinbase Smart Wallet (recommended)
- MetaMask
- Other WalletConnect wallets

### Token Swap
- Built-in ETH → BG swap
- Powered by OnchainKit Swap component
- No need to leave the app

### ETH Top-Up
- Fund button for easy ETH purchases
- Coinbase Onramp integration

### Dashboard
- **Earnings Tab**: Total earned, breakdown by level
- **Network Tab**: Visual network tree
- **Calculator Tab**: Potential earnings calculator

---

## 🛠️ Configuration Options

### Change Activation Fee

In `GoldVein.sol`:
```solidity
uint256 public constant ACTIVATION_FEE = 0.10 ether; // Change this
```

### Change Distribution Percentages

In `GoldVein.sol`:
```solidity
uint256 public constant BURN_PERCENT = 500;       //  5%
uint256 public constant LEVEL1_PERCENT = 5000;    // 50%
// ... etc
```

### Add Code-to-Address Lookup

To support referral codes properly, you can add a mapping:

```solidity
// In contract
mapping(bytes8 => address) public codeToAddress;

function registerCode(bytes8 code) external {
    require(isActivated[msg.sender], "Not activated");
    codeToAddress[code] = msg.sender;
}
```

Then in the frontend, look up the address before activating.

---

## 🔐 Security Features

- **No rug capability**: Cannot withdraw BG tokens
- **Renounce ownership**: Full decentralization possible
- **Reentrancy guard**: Protected against attacks
- **Pausable**: Emergency stop if needed

---

## 📱 Mobile Support

The app is fully responsive and works on:
- Mobile browsers
- Coinbase Wallet app
- MetaMask mobile

---

## 🚢 Deployment Checklist

- [ ] Deploy `GoldVein.sol` to Base Sepolia (testnet)
- [ ] Test all functions with test BG tokens
- [ ] Verify contract on BaseScan
- [ ] Deploy to Base mainnet
- [ ] Update `GOLD_VEIN_ADDRESS` in frontend
- [ ] Set `CDP_API_KEY` in environment
- [ ] Test wallet connection
- [ ] Test token swap
- [ ] Test activation flow
- [ ] Test referral link/code sharing

---

## 🎯 Integration with BaseGold.io

### Add to Navigation

```jsx
// In your nav component
<Link to="/goldvein" className="nav-link">
  ⛏️ Gold Vein
</Link>
```

### Match Existing Theme

The styles are designed to match your gold particle theme. Key colors:

```css
--gold-500: #f59e0b;  /* Primary gold */
--gold-600: #d97706;  /* Darker gold */
--dark-200: #0a0a0f;  /* Background */
```

---

## 📊 Analytics Events (Optional)

Add tracking to key actions:

```jsx
// In GoldVein.jsx
const handleActivate = () => {
  // Track event
  analytics.track('goldvein_activation', {
    referrer: referrerInput,
    userId: address,
  });
  
  // ... existing code
};
```

---

## 🤝 Support

For issues or questions:
- BaseGold.io Discord
- Twitter: @BaseGoldIO
- Email: support@basegold.io

---

## 📜 License

MIT License - BaseGold.io 2024
