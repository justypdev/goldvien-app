'use client';

// GoldVein.jsx - Enhanced UI with BaseGold branding
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';

// ═══════════════════════════════════════════════════════════════════
//                         CONTRACT CONFIG
// ═══════════════════════════════════════════════════════════════════

const BG_TOKEN_ADDRESS = '0x36b712A629095234F2196BbB000D1b96C12Ce78e';
const GOLD_VEIN_ADDRESS = '0x0520B1D4dF671293F8b4B1F52dDD4f9f687Fd565';

const BG_TOKEN_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
];

const GOLD_VEIN_ABI = [
  {
    name: 'activate',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'referrer', type: 'address' }],
    outputs: [],
  },
  {
    name: 'isActivated',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'getUserProfile',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'userAddress', type: 'address' }],
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'joinedAt', type: 'uint256' },
      { name: 'referrer', type: 'address' },
      { name: 'directReferrals', type: 'uint256' },
      { name: 'totalEarned', type: 'uint256' },
      { name: 'referralCode', type: 'string' },
      { name: 'earningsPerLevel', type: 'uint256[7]' },
      { name: 'referralsPerLevel', type: 'uint256[7]' },
    ],
  },
  {
    name: 'getReferralCode',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'userAddress', type: 'address' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'getStats',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: '_totalUsers', type: 'uint256' },
      { name: '_totalActivations', type: 'uint256' },
      { name: '_totalBurned', type: 'uint256' },
      { name: '_totalRewardsDistributed', type: 'uint256' },
      { name: '_contractBalance', type: 'uint256' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
//                      FLOATING GOLD PARTICLES
// ═══════════════════════════════════════════════════════════════════

function GoldParticles() {
  const particles = useMemo(() => 
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 8 + Math.random() * 8,
      size: 3 + Math.random() * 4,
    })), []
  );

  return (
    <>
      <style jsx global>{`
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 0.7; }
          90% { opacity: 0.7; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.5); }
          50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.8), 0 0 60px rgba(234, 179, 8, 0.4); }
        }
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              bottom: '-10px',
              width: `${p.size}px`,
              height: `${p.size}px`,
              background: 'radial-gradient(circle, #FFD700 0%, #B8860B 100%)',
              boxShadow: '0 0 10px #FFD700, 0 0 20px #FFD70066',
              animation: `floatUp ${p.duration}s linear infinite`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
//                      CONFETTI COMPONENT
// ═══════════════════════════════════════════════════════════════════

function Confetti({ active, onComplete }) {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (active) {
      const colors = ['#FFD700', '#FFA500', '#FFEC8B', '#DAA520', '#F0E68C'];
      const newParticles = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        size: 8 + Math.random() * 8,
      }));
      setParticles(newParticles);
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animation: `confettiFall 3s ease-out forwards`,
            animationDelay: `${p.delay}s`,
            boxShadow: `0 0 8px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//                      ANIMATED NUMBER
// ═══════════════════════════════════════════════════════════════════

function AnimatedNumber({ value, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const target = parseFloat(value) || 0;
    if (target !== prevRef.current) {
      const start = prevRef.current;
      const duration = 800;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(start + (target - start) * eased);
        if (progress < 1) requestAnimationFrame(animate);
        else prevRef.current = target;
      };
      requestAnimationFrame(animate);
    }
  }, [value]);

  return <>{display.toFixed(decimals)}</>;
}

// ═══════════════════════════════════════════════════════════════════
//                      REFERRAL TREE
// ═══════════════════════════════════════════════════════════════════

function ReferralTree({ userProfile }) {
  const levels = [
    { name: 'L1', pct: '60%', amt: '0.060', bg: 'from-yellow-500 to-yellow-600' },
    { name: 'L2', pct: '14%', amt: '0.014', bg: 'from-orange-500 to-orange-600' },
    { name: 'L3', pct: '9%', amt: '0.009', bg: 'from-amber-500 to-amber-600' },
    { name: 'L4', pct: '5%', amt: '0.005', bg: 'from-lime-500 to-lime-600' },
    { name: 'L5', pct: '4%', amt: '0.004', bg: 'from-green-500 to-green-600' },
    { name: 'L6', pct: '2%', amt: '0.002', bg: 'from-emerald-500 to-emerald-600' },
    { name: 'L7', pct: '1%', amt: '0.001', bg: 'from-teal-500 to-teal-600' },
  ];

  const referrals = userProfile?.[7] || [0,0,0,0,0,0,0];
  const earnings = userProfile?.[6] || [0n,0n,0n,0n,0n,0n,0n];
  let totalNetwork = 0;
  referrals.forEach(r => totalNetwork += Number(r || 0));

  return (
    <div className="space-y-3">
      {levels.map((level, i) => {
        const count = Number(referrals[i] || 0);
        const earned = earnings[i] ? parseFloat(formatEther(earnings[i])) : 0;
        const active = count > 0;

        return (
          <div key={i} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
            active ? 'bg-gradient-to-r from-yellow-900/50 to-transparent border-yellow-500/50' : 'bg-black/30 border-gray-800'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg ${
                active ? `bg-gradient-to-br ${level.bg} text-black shadow-lg` : 'bg-gray-800 text-gray-500'
              }`}>
                {level.name}
              </div>
              <div>
                <div className={`font-bold ${active ? 'text-white' : 'text-gray-500'}`}>
                  {level.pct} <span className="font-normal">({level.amt} BG)</span>
                </div>
                <div className={`text-sm ${active ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {i === 0 ? '✋ Direct' : '😴 Passive'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center min-w-[60px]">
                <div className={`text-2xl font-black ${active ? 'text-white' : 'text-gray-600'}`}>{count}</div>
                <div className="text-xs text-gray-500">miners</div>
              </div>
              <div className="text-right min-w-[100px]">
                <div className={`font-mono font-bold ${active ? 'text-green-400' : 'text-gray-600'}`}>
                  {earned.toFixed(4)} BG
                </div>
                <div className="text-xs text-gray-500">earned</div>
              </div>
            </div>
          </div>
        );
      })}

      <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-yellow-700/30">
        <div className="bg-gradient-to-br from-yellow-900/50 to-black rounded-xl p-5 text-center border border-yellow-600/30">
          <div className="text-yellow-500 text-sm">Total Network</div>
          <div className="text-4xl font-black text-yellow-400">{totalNetwork}</div>
        </div>
        <div className="bg-gradient-to-br from-green-900/50 to-black rounded-xl p-5 text-center border border-green-600/30">
          <div className="text-green-500 text-sm">Total Earned</div>
          <div className="text-4xl font-black text-green-400">
            {userProfile?.[4] ? parseFloat(formatEther(userProfile[4])).toFixed(4) : '0.0000'} BG
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//                      CALCULATOR
// ═══════════════════════════════════════════════════════════════════

function Calculator() {
  const [refs, setRefs] = useState(2);
  const amounts = [0.060, 0.014, 0.009, 0.005, 0.004, 0.002, 0.001];

  let total = 0, network = refs;
  const rows = amounts.map((amt, i) => {
    const earn = network * amt;
    total += earn;
    const row = { level: i + 1, network, earn };
    network *= refs;
    return row;
  });

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-900/60 to-green-800/30 border border-green-500/50 rounded-xl p-5 text-center">
        <div className="text-green-400 text-xl font-bold">🎯 PROFIT AT JUST 2 REFERRALS!</div>
        <div className="text-green-300 mt-1">2 × 0.06 BG = 0.12 BG → <span className="font-bold">+0.02 BG profit!</span></div>
      </div>

      <div>
        <label className="block text-yellow-400 mb-3 text-lg">
          If everyone refers <span className="text-3xl font-black text-yellow-300">{refs}</span> people:
        </label>
        <input
          type="range" min="2" max="10" value={refs}
          onChange={(e) => setRefs(parseInt(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer accent-yellow-500 bg-gray-700"
        />
        <div className="flex justify-between text-sm text-gray-500 mt-1"><span>2</span><span>10</span></div>
      </div>

      <div className="space-y-2">
        {rows.map(({ level, network, earn }) => (
          <div key={level} className="flex justify-between items-center bg-black/40 rounded-lg p-3 border border-gray-800">
            <span className="text-yellow-500 font-medium">Level {level}</span>
            <span className="text-gray-400">{network.toLocaleString()} miners</span>
            <span className="text-yellow-400 font-mono font-bold">{earn.toFixed(3)} BG</span>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-xl p-5 text-center">
        <div className="text-black/70 text-sm">Total Potential Earnings</div>
        <div className="text-4xl font-black text-black">{total.toFixed(3)} BG</div>
        <div className="text-black/70">{((total / 0.10) * 100).toFixed(0)}% ROI</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
//                         MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function GoldVein() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('tree');
  const [referrerInput, setReferrerInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref && isAddress(ref)) setReferrerInput(ref);
    }
  }, []);

  const { data: isUserActivated, refetch: refetchActivated } = useReadContract({
    address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'isActivated', args: [address], enabled: !!address,
  });

  const { data: userProfile, refetch: refetchProfile } = useReadContract({
    address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'getUserProfile', args: [address], enabled: !!address && isUserActivated,
  });

  const { data: userReferralCode } = useReadContract({
    address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'getReferralCode', args: [address], enabled: !!address && isUserActivated,
  });

  const { data: globalStats, refetch: refetchStats } = useReadContract({
    address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'getStats',
  });

  const { data: bgBalance } = useReadContract({
    address: BG_TOKEN_ADDRESS, abi: BG_TOKEN_ABI, functionName: 'balanceOf', args: [address], enabled: !!address,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: BG_TOKEN_ADDRESS, abi: BG_TOKEN_ABI, functionName: 'allowance', args: [address, GOLD_VEIN_ADDRESS], enabled: !!address,
  });

  const { writeContract: approve, data: approveHash, error: approveError, reset: resetApprove } = useWriteContract();
  const { writeContract: activate, data: activateHash, error: activateError, reset: resetActivate } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isActivating, isSuccess: activateSuccess } = useWaitForTransactionReceipt({ hash: activateHash });

  useEffect(() => {
    if (approveError) { setError(approveError.shortMessage || approveError.message); resetApprove(); }
    if (activateError) { setError(activateError.shortMessage || activateError.message); resetActivate(); }
  }, [approveError, activateError]);

  useEffect(() => {
    if (approveSuccess) { refetchAllowance(); setSuccess('✅ Approved! Now click Open Gold Mine'); }
  }, [approveSuccess]);

  useEffect(() => {
    if (activateSuccess) {
      setShowConfetti(true);
      refetchActivated(); refetchProfile(); refetchStats();
      setSuccess('🎉 Welcome to Gold Vein! Your mine is OPEN!');
    }
  }, [activateSuccess]);

  const handleApprove = () => {
    setError(''); setSuccess('');
    approve({ address: BG_TOKEN_ADDRESS, abi: BG_TOKEN_ABI, functionName: 'approve', args: [GOLD_VEIN_ADDRESS, parseEther('0.10')] });
  };

  const handleActivate = () => {
    setError(''); setSuccess('');
    if (!referrerInput || !isAddress(referrerInput)) { setError('Please enter a valid referrer address'); return; }
    activate({ address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'activate', args: [referrerInput] });
  };

  const copyText = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const needsApproval = !allowance || allowance < parseEther('0.10');
  const hasBalance = bgBalance && bgBalance >= parseEther('0.10');
  const fmtBG = (v) => v ? parseFloat(formatEther(v)).toFixed(4) : '0.0000';

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      <GoldParticles />
      <Confetti active={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-yellow-900/10 via-transparent to-transparent pointer-events-none" />

      {/* Toasts */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/95 border border-red-500 px-6 py-4 rounded-xl shadow-2xl max-w-md">
          <span className="text-red-100">{error}</span>
          <button onClick={() => setError('')} className="ml-4 text-red-300">✕</button>
        </div>
      )}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-900/95 border border-green-500 px-6 py-4 rounded-xl shadow-2xl max-w-md">
          <span className="text-green-100">{success}</span>
          <button onClick={() => setSuccess('')} className="ml-4 text-green-300">✕</button>
        </div>
      )}

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-yellow-500 shadow-lg" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}>
              <img src="https://basegold.io/logov2.jpg" alt="BG" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">GOLD VEIN</h1>
              <p className="text-yellow-600 text-sm">7-Level Passive Income</p>
            </div>
          </div>
          <Wallet>
            <ConnectWallet className="!bg-gradient-to-r !from-yellow-500 !to-yellow-600 hover:!from-yellow-400 hover:!to-yellow-500 !text-black !font-bold !px-6 !py-3 !rounded-xl !shadow-lg !shadow-yellow-500/30 !border-0">
              <Avatar className="h-6 w-6" /><Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick><Avatar /><Name /><Address /><EthBalance /></Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </header>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-yellow-900/50 to-black border border-yellow-600/40 rounded-2xl p-5 text-center">
            <div className="text-yellow-500 text-sm mb-1">⛏️ Miners</div>
            <div className="text-3xl font-black text-yellow-400"><AnimatedNumber value={globalStats?.[0]?.toString() || '0'} /></div>
          </div>
          <div className="bg-gradient-to-br from-red-900/50 to-black border border-red-600/40 rounded-2xl p-5 text-center">
            <div className="text-red-500 text-sm mb-1">🔥 Burned</div>
            <div className="text-3xl font-black text-red-400"><AnimatedNumber value={fmtBG(globalStats?.[2])} decimals={3} /> BG</div>
          </div>
          <div className="bg-gradient-to-br from-green-900/50 to-black border border-green-600/40 rounded-2xl p-5 text-center">
            <div className="text-green-500 text-sm mb-1">💰 Rewards</div>
            <div className="text-3xl font-black text-green-400"><AnimatedNumber value={fmtBG(globalStats?.[3])} decimals={2} /> BG</div>
          </div>
          <div className="bg-gradient-to-br from-blue-900/50 to-black border border-blue-600/40 rounded-2xl p-5 text-center">
            <div className="text-blue-500 text-sm mb-1">🎯 Activations</div>
            <div className="text-3xl font-black text-blue-400"><AnimatedNumber value={globalStats?.[1]?.toString() || '0'} /></div>
          </div>
        </div>

        {/* Main Content */}
        {!isConnected ? (
          <div className="text-center py-16">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full overflow-hidden border-4 border-yellow-500/50 shadow-2xl shadow-yellow-500/30" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }}>
              <img src="https://basegold.io/logov2.jpg" alt="BG" className="w-full h-full object-cover" />
            </div>
            <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">Enter the Gold Vein</h2>
            <p className="text-yellow-600 mb-8 max-w-lg mx-auto text-lg">Connect your wallet to start mining passive income through 7 levels of referrals.</p>
            <div className="bg-gradient-to-r from-green-900/60 to-green-800/30 border border-green-500/50 rounded-2xl p-6 max-w-md mx-auto">
              <div className="text-green-400 text-xl font-bold">🎯 PROFIT AT JUST 2 REFERRALS!</div>
              <div className="text-green-300 mt-2">2 refs × 0.06 BG = 0.12 BG profit!</div>
            </div>
          </div>
        ) : !isUserActivated ? (
          <div className="max-w-lg mx-auto">
            <div className="bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-600/40 rounded-3xl p-8">
              <div className="text-center mb-8">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-yellow-500 shadow-xl shadow-yellow-500/40 animate-bounce">
                  <img src="https://basegold.io/logov2.jpg" alt="BG" className="w-full h-full object-cover" />
                </div>
                <h2 className="text-3xl font-black text-yellow-400 mb-2">Open Your Gold Mine</h2>
                <p className="text-yellow-600 text-lg">Activation Fee: 0.10 BG</p>
              </div>
              <div className="bg-black/40 rounded-xl p-4 mb-6 border border-gray-800">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Your BG Balance:</span>
                  <span className={`font-bold text-lg ${hasBalance ? 'text-green-400' : 'text-red-400'}`}>{fmtBG(bgBalance)} BG</span>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-yellow-500 mb-2 font-medium">Referrer Address</label>
                <input type="text" value={referrerInput} onChange={(e) => setReferrerInput(e.target.value)} placeholder="0x..."
                  className="w-full bg-black/60 border border-yellow-700/50 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500 font-mono" />
              </div>
              {needsApproval ? (
                <button onClick={handleApprove} disabled={isApproving || !hasBalance}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:from-gray-700 disabled:to-gray-800 text-black disabled:text-gray-500 font-bold py-4 rounded-xl text-lg shadow-lg">
                  {isApproving ? '⏳ Approving...' : '1️⃣ Approve BG Token'}
                </button>
              ) : (
                <button onClick={handleActivate} disabled={isActivating || !hasBalance || !referrerInput}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:from-gray-700 disabled:to-gray-800 text-black disabled:text-gray-500 font-bold py-4 rounded-xl text-lg shadow-lg">
                  {isActivating ? '⛏️ Opening...' : '⛏️ Open Gold Mine (0.10 BG)'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Referral Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-600/40 rounded-2xl p-6">
                <h3 className="text-yellow-400 font-bold mb-4 text-lg">🔗 Your Referral Link</h3>
                <div className="bg-black/50 rounded-xl p-4 mb-4 border border-gray-800">
                  <code className="text-yellow-300 text-sm break-all">https://goldvien-app.vercel.app?ref={address}</code>
                </div>
                <button onClick={() => copyText(`https://goldvien-app.vercel.app?ref=${address}`)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-3 rounded-xl hover:from-yellow-400 hover:to-yellow-500">
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>
              <div className="bg-gradient-to-br from-yellow-900/40 to-black border border-yellow-600/40 rounded-2xl p-6">
                <h3 className="text-yellow-400 font-bold mb-4 text-lg">🎫 Your Referral Code</h3>
                <div className="bg-black/50 rounded-xl p-4 mb-4 text-center border border-gray-800">
                  <code className="text-4xl font-black text-yellow-400 tracking-widest">{userReferralCode || '...'}</code>
                </div>
                <button onClick={() => copyText(userReferralCode || '')}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-3 rounded-xl hover:from-yellow-400 hover:to-yellow-500">
                  📋 Copy Code
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-black/40 p-1.5 rounded-xl w-fit border border-gray-800">
              <button onClick={() => setActiveTab('tree')} className={`px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'tree' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black' : 'text-yellow-600 hover:text-yellow-400'}`}>🌳 Tree</button>
              <button onClick={() => setActiveTab('calculator')} className={`px-6 py-3 rounded-lg font-bold transition-all ${activeTab === 'calculator' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-black' : 'text-yellow-600 hover:text-yellow-400'}`}>🧮 Calculator</button>
            </div>

            {/* Tab Content */}
            <div className="bg-gradient-to-br from-yellow-900/30 to-black border border-yellow-600/30 rounded-2xl p-6">
              {activeTab === 'tree' && <ReferralTree userProfile={userProfile} />}
              {activeTab === 'calculator' && <Calculator />}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-yellow-900/30 text-center">
          <div className="text-yellow-500 font-bold mb-2">GOLD VEIN by BaseGold.io</div>
          <div className="text-gray-600 text-sm">95% to users • 5% burned • No middleman</div>
          <a href={`https://basescan.org/address/${GOLD_VEIN_ADDRESS}`} target="_blank" rel="noopener noreferrer"
            className="text-yellow-600 hover:text-yellow-400 text-sm mt-2 inline-block">View Contract ↗</a>
        </footer>
      </div>
    </div>
  );
}
