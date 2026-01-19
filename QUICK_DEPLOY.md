# 🚀 GOLD VEIN - QUICK DEPLOYMENT GUIDE

## Step 1: Setup (One Time)

```bash
# Navigate to the goldvein-app folder
cd goldvein-app

# Install dependencies
npm install

# Create your .env file
cp .env.example .env
```

Edit `.env` with your private key:
```
PRIVATE_KEY=0x_your_private_key_here
BASESCAN_API_KEY=your_basescan_api_key
```

⚠️ **IMPORTANT:** Use the private key from your deployer wallet (the one with ETH for gas)

---

## Step 2: Compile Contract

```bash
npx hardhat compile
```

You should see:
```
Compiled 1 Solidity file successfully
```

---

## Step 3: Deploy to Base Mainnet

```bash
npx hardhat run scripts/deploy-goldvein.js --network base
```

**Expected output:**
```
🚀 Deploying Gold Vein to Base network...

📍 Deploying with account: 0xYourAddress
💰 Account balance: X.XX ETH

📝 Deploying GoldVein contract...

✅ GoldVein deployed successfully!
📍 Contract address: 0x_NEW_CONTRACT_ADDRESS
```

**COPY THE CONTRACT ADDRESS!** You'll need it for the frontend.

---

## Step 4: Verify on BaseScan

```bash
npx hardhat verify --network base CONTRACT_ADDRESS 0x36b712A629095234F2196BbB000D1b96C12Ce78e
```

Replace `CONTRACT_ADDRESS` with your deployed address.

---

## Step 5: Update Frontend

In `GoldVein.jsx`, find line 43 and update:

```javascript
const GOLD_VEIN_ADDRESS = '0x_YOUR_NEW_CONTRACT_ADDRESS';
```

---

## Step 6: Test Your Activation

After deploying, **YOU (the deployer) are automatically activated as ROOT**.

1. Go to basegold.io/goldvein
2. Connect your deployer wallet
3. You should see your dashboard with your referral code!

Your referral link will be:
```
https://basegold.io/goldvein?ref=YOUR_DEPLOYER_ADDRESS
```

---

## Step 7: Test with Second Wallet

1. Open incognito browser
2. Go to your referral link
3. Connect a DIFFERENT wallet (with 0.10 BG)
4. Approve and activate
5. Check that your deployer wallet received 0.05 BG!

---

## Troubleshooting

### "Insufficient funds"
- Make sure deployer wallet has ETH for gas (~0.001 ETH needed)

### "Cannot find module"
- Run `npm install` again

### Contract not verifying
- Wait 30 seconds after deployment
- Make sure BASESCAN_API_KEY is set

### Frontend not connecting
- Make sure GOLD_VEIN_ADDRESS is updated
- Clear browser cache

---

## Gas Costs (Approximate)

| Action | Gas | Cost (~$0.50/gwei) |
|--------|-----|-----|
| Deploy | ~2,500,000 | ~$0.05 |
| Activate | ~250,000 | ~$0.005 |

Base has very low fees! 🎉

---

## Need Help?

If anything fails, share the error message and I can help debug!
