// GoldVein-Enhanced.jsx - With Special Effects & Animated Referral Tree
// Includes: Confetti, gold particles, animated counters, visual tree, real-time notifications

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownLink,
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
  useWatchContractEvent,
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
  // Events for real-time tracking
  {
    name: 'RewardDistributed',
    type: 'event',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'fromUser', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'level', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    name: 'UserActivated',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'userId', type: 'uint256', indexed: true },
      { name: 'referrer', type: 'address', indexed: true },
      { name: 'referralCode', type: 'bytes8', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════
//                      CONFETTI EXPLOSION COMPONENT
// ═══════════════════════════════════════════════════════════════════

const ConfettiExplosion = ({ active, onComplete }) => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 20,
        y: 50,
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 15 - 5,
        rotation: Math.random() * 360,
        color: ['#FFD700', '#FFA500', '#FFEC8B', '#DAA520', '#F0E68C'][Math.floor(Math.random() * 5)],
        size: 8 + Math.random() * 8,
        type: Math.random() > 0.5 ? 'circle' : 'rect',
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.type === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            '--vx': p.vx,
            '--vy': p.vy,
            boxShadow: `0 0 ${p.size}px ${p.color}`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translate(0, 0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(calc(var(--vx) * 30px), calc(var(--vy) * -50px + 100vh)) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//                      GOLD COIN RAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const GoldCoinRain = ({ active, amount }) => {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    if (active) {
      const numCoins = Math.min(Math.floor(amount * 100), 50);
      const newCoins = Array.from({ length: numCoins }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1,
        duration: 2 + Math.random() * 2,
        size: 20 + Math.random() * 20,
        rotation: Math.random() * 360,
      }));
      setCoins(newCoins);

      const timer = setTimeout(() => setCoins([]), 4000);
      return () => clearTimeout(timer);
    }
  }, [active, amount]);

  if (!active || coins.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
      {coins.map((coin) => (
        <div
          key={coin.id}
          className="absolute animate-coin-fall"
          style={{
            left: `${coin.left}%`,
            top: '-50px',
            animationDelay: `${coin.delay}s`,
            animationDuration: `${coin.duration}s`,
          }}
        >
          <div
            className="rounded-full bg-gradient-to-br from-yellow-300 via-yellow-500 to-yellow-700 flex items-center justify-center font-bold text-yellow-900 animate-spin-slow border-2 border-yellow-400"
            style={{
              width: coin.size,
              height: coin.size,
              fontSize: coin.size * 0.4,
              boxShadow: '0 0 20px #FFD700, inset 0 0 10px rgba(255,255,255,0.5)',
            }}
          >
            ₿G
          </div>
        </div>
      ))}
      <style>{`
        @keyframes coin-fall {
          0% { transform: translateY(0) rotateY(0); opacity: 1; }
          100% { transform: translateY(110vh) rotateY(1440deg); opacity: 0; }
        }
        .animate-coin-fall {
          animation: coin-fall linear forwards;
        }
        @keyframes spin-slow {
          from { transform: rotateY(0); }
          to { transform: rotateY(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//                      FLOATING GOLD PARTICLES
// ═══════════════════════════════════════════════════════════════════

const GoldParticles = () => {
  const particles = useMemo(() => 
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.5,
    })), []
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `radial-gradient(circle, #FFD700 0%, #B8860B 100%)`,
            boxShadow: `0 0 ${p.size * 2}px #FFD700`,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes float {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
        }
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//                      ANIMATED COUNTER COMPONENT
// ═══════════════════════════════════════════════════════════════════

const AnimatedCounter = ({ value, decimals = 4, prefix = '', suffix = '', className = '' }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = useRef(0);

  useEffect(() => {
    const numValue = parseFloat(value) || 0;
    if (numValue !== prevValue.current) {
      setIsAnimating(true);
      const startValue = prevValue.current;
      const endValue = numValue;
      const duration = 1000;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        const current = startValue + (endValue - startValue) * eased;
        setDisplayValue(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          prevValue.current = numValue;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value]);

  return (
    <span className={`${className} ${isAnimating ? 'text-green-400 scale-110' : ''} transition-all duration-300`}>
      {prefix}{displayValue.toFixed(decimals)}{suffix}
    </span>
  );
};

// ═══════════════════════════════════════════════════════════════════
//                      REWARD NOTIFICATION TOAST
// ═══════════════════════════════════════════════════════════════════

const RewardNotification = ({ notification, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const levelColors = [
    'from-yellow-500 to-yellow-600',
    'from-orange-500 to-orange-600',
    'from-amber-500 to-amber-600',
    'from-lime-500 to-lime-600',
    'from-green-500 to-green-600',
    'from-emerald-500 to-emerald-600',
    'from-teal-500 to-teal-600',
  ];

  return (
    <div className={`
      animate-slide-in-right
      bg-gradient-to-r ${levelColors[notification.level - 1] || levelColors[0]}
      rounded-xl p-4 shadow-2xl border border-white/20
      flex items-center gap-4 min-w-[300px]
    `}>
      <div className="text-4xl animate-bounce">
        {notification.level === 1 ? '🎯' : '💰'}
      </div>
      <div className="flex-1">
        <div className="text-black font-bold">
          {notification.level === 1 ? 'New Direct Referral!' : `Level ${notification.level} Reward!`}
        </div>
        <div className="text-black/70 text-sm">
          +{notification.amount.toFixed(4)} BG
        </div>
        <div className="text-black/50 text-xs truncate max-w-[200px]">
          From: {notification.from.slice(0, 6)}...{notification.from.slice(-4)}
        </div>
      </div>
      <button onClick={onClose} className="text-black/50 hover:text-black">✕</button>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//                      VISUAL REFERRAL TREE
// ═══════════════════════════════════════════════════════════════════

const ReferralTree = ({ userProfile, address }) => {
  const levels = [
    { name: 'L1', color: 'yellow', rate: '60%', amount: '0.060' },
    { name: 'L2', color: 'orange', rate: '14%', amount: '0.014' },
    { name: 'L3', color: 'amber', rate: '9%', amount: '0.009' },
    { name: 'L4', color: 'lime', rate: '5%', amount: '0.005' },
    { name: 'L5', color: 'green', rate: '4%', amount: '0.004' },
    { name: 'L6', color: 'emerald', rate: '2%', amount: '0.002' },
    { name: 'L7', color: 'teal', rate: '1%', amount: '0.001' },
  ];

  const referralsPerLevel = userProfile?.[7] || [0, 0, 0, 0, 0, 0, 0];
  const earningsPerLevel = userProfile?.[6] || [0n, 0n, 0n, 0n, 0n, 0n, 0n];

  return (
    <div className="bg-black/40 border border-yellow-600/40 rounded-2xl p-6 backdrop-blur-sm">
      <h3 className="text-yellow-400 font-bold mb-6 text-xl text-center">🌳 Your Referral Tree</h3>
      
      {/* Tree Visualization */}
      <div className="relative">
        {/* You at the top */}
        <div className="flex justify-center mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-2xl shadow-lg shadow-yellow-500/50 animate-pulse-glow">
              👤
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-yellow-400 font-bold">
              YOU
            </div>
          </div>
        </div>

        {/* Connecting line */}
        <div className="flex justify-center">
          <div className="w-0.5 h-8 bg-gradient-to-b from-yellow-500 to-yellow-700"></div>
        </div>

        {/* Level rows */}
        <div className="space-y-4">
          {levels.map((level, i) => {
            const count = parseInt(referralsPerLevel[i]?.toString() || '0');
            const earnings = earningsPerLevel[i] ? parseFloat(formatEther(earningsPerLevel[i])) : 0;
            const hasReferrals = count > 0;
            
            return (
              <div key={i} className="relative">
                {/* Level row */}
                <div className={`
                  flex items-center justify-between p-3 rounded-xl border
                  ${hasReferrals 
                    ? `bg-${level.color}-900/30 border-${level.color}-500/50` 
                    : 'bg-gray-900/30 border-gray-700/30'}
                  transition-all duration-500
                  ${hasReferrals ? 'animate-pulse-subtle' : ''}
                `}>
                  {/* Level badge */}
                  <div className={`
                    flex items-center gap-3
                  `}>
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
                      ${hasReferrals 
                        ? `bg-gradient-to-br from-${level.color}-400 to-${level.color}-600 text-black` 
                        : 'bg-gray-800 text-gray-500'}
                    `}>
                      {level.name}
                    </div>
                    <div>
                      <div className={`text-sm font-bold ${hasReferrals ? 'text-white' : 'text-gray-500'}`}>
                        {level.rate} ({level.amount} BG)
                      </div>
                      <div className={`text-xs ${hasReferrals ? 'text-gray-300' : 'text-gray-600'}`}>
                        {i === 0 ? 'Direct referrals' : 'Passive income'}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6">
                    {/* Miner count */}
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${hasReferrals ? 'text-white' : 'text-gray-600'}`}>
                        {count}
                      </div>
                      <div className="text-xs text-gray-500">miners</div>
                    </div>

                    {/* Visual miners */}
                    <div className="flex -space-x-2">
                      {Array.from({ length: Math.min(count, 5) }).map((_, j) => (
                        <div
                          key={j}
                          className={`
                            w-8 h-8 rounded-full border-2 border-black flex items-center justify-center text-sm
                            bg-gradient-to-br from-${level.color}-400 to-${level.color}-600
                            animate-pop-in
                          `}
                          style={{ animationDelay: `${j * 0.1}s` }}
                        >
                          ⛏️
                        </div>
                      ))}
                      {count > 5 && (
                        <div className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-xs text-white font-bold">
                          +{count - 5}
                        </div>
                      )}
                    </div>

                    {/* Earnings */}
                    <div className="text-right min-w-[80px]">
                      <div className={`font-mono font-bold ${hasReferrals ? 'text-green-400' : 'text-gray-600'}`}>
                        <AnimatedCounter value={earnings} decimals={4} suffix=" BG" />
                      </div>
                      <div className="text-xs text-gray-500">earned</div>
                    </div>
                  </div>
                </div>

                {/* Connecting line to next level */}
                {i < 6 && (
                  <div className="flex justify-center">
                    <div className={`w-0.5 h-4 ${hasReferrals ? 'bg-gradient-to-b from-gray-500 to-gray-700' : 'bg-gray-800'}`}></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Total stats */}
      <div className="mt-6 pt-6 border-t border-yellow-700/30 grid grid-cols-2 gap-4">
        <div className="bg-black/30 rounded-xl p-4 text-center">
          <div className="text-yellow-600 text-sm">Total Network</div>
          <div className="text-3xl font-bold text-yellow-400">
            <AnimatedCounter 
              value={referralsPerLevel.reduce((a, b) => parseInt(a) + parseInt(b?.toString() || '0'), 0)} 
              decimals={0}
            />
          </div>
          <div className="text-yellow-700 text-xs">miners</div>
        </div>
        <div className="bg-black/30 rounded-xl p-4 text-center">
          <div className="text-green-600 text-sm">Total Earned</div>
          <div className="text-3xl font-bold text-green-400">
            <AnimatedCounter 
              value={userProfile?.[4] ? parseFloat(formatEther(userProfile[4])) : 0} 
              decimals={4}
            />
          </div>
          <div className="text-green-700 text-xs">BG</div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(234, 179, 8, 0.5); }
          50% { box-shadow: 0 0 40px rgba(234, 179, 8, 0.8); }
        }
        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 3s ease-in-out infinite;
        }
        @keyframes pop-in {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: pop-in 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//                      LEVEL PROGRESS RINGS
// ═══════════════════════════════════════════════════════════════════

const LevelProgressRings = ({ userProfile }) => {
  const levels = [
    { name: 'L1', color: '#EAB308', max: 10 },
    { name: 'L2', color: '#F97316', max: 50 },
    { name: 'L3', color: '#F59E0B', max: 100 },
    { name: 'L4', color: '#84CC16', max: 500 },
    { name: 'L5', color: '#22C55E', max: 1000 },
    { name: 'L6', color: '#10B981', max: 5000 },
    { name: 'L7', color: '#14B8A6', max: 10000 },
  ];

  const referralsPerLevel = userProfile?.[7] || [0, 0, 0, 0, 0, 0, 0];

  return (
    <div className="flex justify-center gap-2 flex-wrap">
      {levels.map((level, i) => {
        const count = parseInt(referralsPerLevel[i]?.toString() || '0');
        const progress = Math.min((count / level.max) * 100, 100);
        const circumference = 2 * Math.PI * 18;
        const strokeDashoffset = circumference - (progress / 100) * circumference;

        return (
          <div key={i} className="relative group">
            <svg width="50" height="50" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="25"
                cy="25"
                r="18"
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="4"
              />
              {/* Progress circle */}
              <circle
                cx="25"
                cy="25"
                r="18"
                fill="none"
                stroke={level.color}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
                style={{
                  filter: count > 0 ? `drop-shadow(0 0 6px ${level.color})` : 'none',
                }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold" style={{ color: count > 0 ? level.color : '#666' }}>
                {level.name}
              </span>
            </div>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/90 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {count} / {level.max} miners
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════
//                         MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function GoldVeinEnhanced() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('tree');
  const [referrerInput, setReferrerInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showCoinRain, setShowCoinRain] = useState(false);
  const [coinRainAmount, setCoinRainAmount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Contract reads
  const { data: isUserActivated, refetch: refetchActivated } = useReadContract({
    address: GOLD_VEIN_ADDRESS,
    abi: GOLD_VEIN_ABI,
    functionName: 'isActivated',
    args: [address],
    enabled: !!address,
  });

  const { data: userProfile, refetch: refetchProfile } = useReadContract({
    address: GOLD_VEIN_ADDRESS,
    abi: GOLD_VEIN_ABI,
    functionName: 'getUserProfile',
    args: [address],
    enabled: !!address && isUserActivated,
  });

  const { data: userReferralCode } = useReadContract({
    address: GOLD_VEIN_ADDRESS,
    abi: GOLD_VEIN_ABI,
    functionName: 'getReferralCode',
    args: [address],
    enabled: !!address && isUserActivated,
  });

  const { data: globalStats, refetch: refetchStats } = useReadContract({
    address: GOLD_VEIN_ADDRESS,
    abi: GOLD_VEIN_ABI,
    functionName: 'getStats',
  });

  const { data: bgBalance } = useReadContract({
    address: BG_TOKEN_ADDRESS,
    abi: BG_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: BG_TOKEN_ADDRESS,
    abi: BG_TOKEN_ABI,
    functionName: 'allowance',
    args: [address, GOLD_VEIN_ADDRESS],
    enabled: !!address,
  });

  // Watch for reward events (real-time notifications)
  useWatchContractEvent({
    address: GOLD_VEIN_ADDRESS,
    abi: GOLD_VEIN_ABI,
    eventName: 'RewardDistributed',
    onLogs(logs) {
      logs.forEach((log) => {
        if (log.args.recipient?.toLowerCase() === address?.toLowerCase()) {
          const amount = parseFloat(formatEther(log.args.amount || 0n));
          const level = parseInt(log.args.level?.toString() || '1');
          
          // Add notification
          const newNotification = {
            id: Date.now(),
            amount,
            level,
            from: log.args.fromUser,
            timestamp: Date.now(),
          };
          setNotifications((prev) => [...prev, newNotification]);

          // Trigger effects
          if (level === 1) {
            setShowConfetti(true);
          }
          setShowCoinRain(true);
          setCoinRainAmount(amount);

          // Refetch data
          refetchProfile();
          refetchStats();
        }
      });
    },
    enabled: !!address && isUserActivated,
  });

  // Contract writes
  const { writeContract: approve, data: approveHash, error: approveError, reset: resetApprove } = useWriteContract();
  const { writeContract: activate, data: activateHash, error: activateError, reset: resetActivate } = useWriteContract();

  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isActivating, isSuccess: activateSuccess } = useWaitForTransactionReceipt({ hash: activateHash });

  // Handle errors
  useEffect(() => {
    if (approveError) {
      setError(`Approval failed: ${approveError.shortMessage || approveError.message}`);
      resetApprove();
    }
    if (activateError) {
      setError(`Activation failed: ${activateError.shortMessage || activateError.message}`);
      resetActivate();
    }
  }, [approveError, activateError]);

  // Handle success
  useEffect(() => {
    if (approveSuccess) {
      refetchAllowance();
      setSuccess('✅ Approval successful! Now activate your mine.');
    }
  }, [approveSuccess]);

  useEffect(() => {
    if (activateSuccess) {
      setShowConfetti(true);
      setShowCoinRain(true);
      setCoinRainAmount(0.1);
      refetchActivated();
      refetchProfile();
      refetchStats();
      setSuccess('🎉 Welcome to Gold Vein! Your mine is now OPEN!');
    }
  }, [activateSuccess]);

  // Handlers
  const handleApprove = () => {
    setError('');
    approve({
      address: BG_TOKEN_ADDRESS,
      abi: BG_TOKEN_ABI,
      functionName: 'approve',
      args: [GOLD_VEIN_ADDRESS, parseEther('0.10')],
    });
  };

  const handleActivate = () => {
    setError('');
    if (!referrerInput || !isAddress(referrerInput)) {
      setError('Please enter a valid referrer address');
      return;
    }
    activate({
      address: GOLD_VEIN_ADDRESS,
      abi: GOLD_VEIN_ABI,
      functionName: 'activate',
      args: [referrerInput],
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const removeNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const needsApproval = !allowance || allowance < parseEther('0.10');
  const hasSufficientBalance = bgBalance && bgBalance >= parseEther('0.10');

  const formatBG = (value) => {
    if (!value) return '0';
    return parseFloat(formatEther(value)).toFixed(4);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      <GoldParticles />
      <ConfettiExplosion active={showConfetti} onComplete={() => setShowConfetti(false)} />
      <GoldCoinRain active={showCoinRain} amount={coinRainAmount} />

      {/* Background */}
      <div className="fixed inset-0 bg-gradient-radial from-yellow-900/20 via-transparent to-transparent pointer-events-none" />

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {notifications.map((notif) => (
          <RewardNotification key={notif.id} notification={notif} onClose={() => removeNotification(notif.id)} />
        ))}
      </div>

      {/* Error/Success toasts */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500 text-red-100 px-6 py-4 rounded-xl">
          {error}
          <button onClick={() => setError('')} className="ml-4">✕</button>
        </div>
      )}
      {success && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-900/90 border border-green-500 text-green-100 px-6 py-4 rounded-xl">
          {success}
          <button onClick={() => setSuccess('')} className="ml-4">✕</button>
        </div>
      )}

      {/* Main content */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/50 animate-pulse">
              <span className="text-3xl">⛏️</span>
            </div>
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
                GOLD VEIN
              </h1>
              <p className="text-yellow-600 text-sm">7-Level Passive Income</p>
            </div>
          </div>

          <Wallet>
            <ConnectWallet className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold px-6 py-3 rounded-xl shadow-lg shadow-yellow-500/30">
              <Avatar className="h-6 w-6" />
              <Name />
            </ConnectWallet>
            <WalletDropdown>
              <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                <Avatar />
                <Name />
                <Address />
                <EthBalance />
              </Identity>
              <WalletDropdownDisconnect />
            </WalletDropdown>
          </Wallet>
        </header>

        {/* Global Stats */}
        {globalStats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="bg-black/40 border border-yellow-600/30 rounded-xl p-4 text-center">
              <div className="text-yellow-600 text-xs">Total Miners</div>
              <div className="text-2xl font-bold text-yellow-400">
                <AnimatedCounter value={globalStats[0]?.toString() || '0'} decimals={0} />
              </div>
            </div>
            <div className="bg-black/40 border border-red-600/30 rounded-xl p-4 text-center">
              <div className="text-red-600 text-xs">🔥 Burned</div>
              <div className="text-2xl font-bold text-red-400">
                <AnimatedCounter value={formatBG(globalStats[2])} decimals={2} suffix=" BG" />
              </div>
            </div>
            <div className="bg-black/40 border border-green-600/30 rounded-xl p-4 text-center">
              <div className="text-green-600 text-xs">💰 Rewards Paid</div>
              <div className="text-2xl font-bold text-green-400">
                <AnimatedCounter value={formatBG(globalStats[3])} decimals={2} suffix=" BG" />
              </div>
            </div>
            <div className="bg-black/40 border border-yellow-600/30 rounded-xl p-4 text-center">
              <div className="text-yellow-600 text-xs">Activations</div>
              <div className="text-2xl font-bold text-yellow-400">
                <AnimatedCounter value={globalStats[1]?.toString() || '0'} decimals={0} />
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isConnected ? (
          <div className="text-center py-20">
            <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 flex items-center justify-center border-2 border-yellow-500/30 animate-pulse">
              <span className="text-6xl">⛏️</span>
            </div>
            <h2 className="text-4xl font-black mb-4 bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent">
              Enter the Gold Vein
            </h2>
            <p className="text-yellow-600 mb-8 max-w-md mx-auto">
              Connect your wallet to start mining passive income through 7 levels of referrals.
            </p>
            <div className="bg-green-900/30 border border-green-500 rounded-xl p-4 max-w-sm mx-auto">
              <div className="text-green-400 font-bold">🎯 PROFIT AT JUST 2 REFERRALS!</div>
              <div className="text-green-300 text-sm">2 refs × 0.06 BG = 0.12 BG profit!</div>
            </div>
          </div>
        ) : !isUserActivated ? (
          <div className="max-w-xl mx-auto">
            <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border border-yellow-600/40 rounded-3xl p-8 backdrop-blur-sm">
              <div className="text-center mb-8">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/40 animate-bounce">
                  <span className="text-4xl">⛏️</span>
                </div>
                <h2 className="text-2xl font-bold text-yellow-400 mb-2">Open Your Gold Mine</h2>
                <p className="text-yellow-600">Activation Fee: 0.10 BG</p>
              </div>

              <div className="bg-black/30 rounded-xl p-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-yellow-600">Your BG Balance:</span>
                  <span className={`font-bold ${hasSufficientBalance ? 'text-green-400' : 'text-red-400'}`}>
                    {formatBG(bgBalance)} BG
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-yellow-500 mb-2 text-sm">Referrer Address</label>
                <input
                  type="text"
                  value={referrerInput}
                  onChange={(e) => setReferrerInput(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-black/40 border border-yellow-700/50 rounded-xl px-4 py-3 text-yellow-100 placeholder-yellow-800 focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="space-y-3">
                {needsApproval ? (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving || !hasSufficientBalance}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold py-4 rounded-xl transition-all shadow-lg"
                  >
                    {isApproving ? '⏳ Approving...' : 'Step 1: Approve BG'}
                  </button>
                ) : (
                  <button
                    onClick={handleActivate}
                    disabled={isActivating || !hasSufficientBalance || !referrerInput}
                    className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 disabled:from-gray-600 disabled:to-gray-700 text-black font-bold py-4 rounded-xl transition-all shadow-lg"
                  >
                    {isActivating ? '⛏️ Opening Mine...' : '⛏️ Open Gold Mine (0.10 BG)'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Level Progress Rings */}
            <div className="bg-black/40 border border-yellow-600/40 rounded-2xl p-6">
              <h3 className="text-yellow-400 font-bold mb-4 text-center">Level Progress</h3>
              <LevelProgressRings userProfile={userProfile} />
            </div>

            {/* Referral Link/Code */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border border-yellow-600/40 rounded-2xl p-6">
                <h3 className="text-yellow-400 font-bold mb-4">🔗 Your Referral Link</h3>
                <div className="bg-black/40 rounded-xl p-3 mb-4 break-all">
                  <code className="text-yellow-300 text-sm">
                    https://basegold.io/goldvein?ref={address}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(`https://basegold.io/goldvein?ref=${address}`)}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-3 rounded-xl"
                >
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>

              <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-950/60 border border-yellow-600/40 rounded-2xl p-6">
                <h3 className="text-yellow-400 font-bold mb-4">🎫 Your Referral Code</h3>
                <div className="bg-black/40 rounded-xl p-4 mb-4 text-center">
                  <code className="text-3xl font-bold text-yellow-400 tracking-wider">
                    {userReferralCode || 'Loading...'}
                  </code>
                </div>
                <button
                  onClick={() => copyToClipboard(userReferralCode || '')}
                  className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold py-3 rounded-xl"
                >
                  📋 Copy Code
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-black/30 p-1 rounded-xl w-fit">
              {['tree', 'earnings', 'calculator'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-2 rounded-lg font-medium transition-all capitalize ${
                    activeTab === tab ? 'bg-yellow-500 text-black' : 'text-yellow-600 hover:text-yellow-400'
                  }`}
                >
                  {tab === 'tree' ? '🌳 Tree' : tab === 'earnings' ? '💰 Earnings' : '🧮 Calculator'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'tree' && <ReferralTree userProfile={userProfile} address={address} />}
            
            {activeTab === 'earnings' && userProfile && (
              <div className="bg-black/40 border border-yellow-600/40 rounded-2xl p-6">
                <h3 className="text-yellow-400 font-bold mb-6 text-xl">💰 Your Earnings</h3>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-black/30 rounded-xl p-6 text-center">
                    <div className="text-yellow-600 mb-2">Total Earned</div>
                    <div className="text-4xl font-bold text-yellow-400">
                      <AnimatedCounter value={formatBG(userProfile[4])} decimals={4} suffix=" BG" />
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-xl p-6 text-center">
                    <div className="text-yellow-600 mb-2">Direct Referrals</div>
                    <div className="text-4xl font-bold text-yellow-400">
                      <AnimatedCounter value={userProfile[3]?.toString() || '0'} decimals={0} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calculator' && (
              <CalculatorTab />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Calculator Tab Component
const CalculatorTab = () => {
  const [refs, setRefs] = useState(2);
  const amounts = [0.060, 0.014, 0.009, 0.005, 0.004, 0.002, 0.001];

  const calculate = () => {
    let total = 0;
    let networkAtLevel = refs;
    const earnings = [];
    for (let i = 0; i < 7; i++) {
      const levelEarning = networkAtLevel * amounts[i];
      earnings.push({ level: i + 1, network: networkAtLevel, earning: levelEarning });
      total += levelEarning;
      networkAtLevel *= refs;
    }
    return { earnings, total };
  };

  const { earnings, total } = calculate();

  return (
    <div className="bg-black/40 border border-yellow-600/40 rounded-2xl p-6">
      <h3 className="text-yellow-400 font-bold mb-6 text-xl">🧮 Earnings Calculator</h3>
      
      <div className="bg-green-900/30 border border-green-500/50 rounded-xl p-4 mb-6 text-center">
        <div className="text-green-400 font-bold">🎯 PROFIT AT JUST 2 REFERRALS!</div>
        <div className="text-green-300 text-sm">2 × 0.06 BG = 0.12 BG (0.02 BG profit!)</div>
      </div>

      <div className="mb-6">
        <label className="block text-yellow-500 mb-2">
          If everyone refers <span className="text-yellow-400 font-bold text-2xl">{refs}</span> people:
        </label>
        <input
          type="range"
          min="2"
          max="10"
          value={refs}
          onChange={(e) => setRefs(parseInt(e.target.value))}
          className="w-full accent-yellow-500"
        />
      </div>

      <div className="space-y-2 mb-6">
        {earnings.map(({ level, network, earning }) => (
          <div key={level} className="flex justify-between items-center bg-black/20 rounded-lg p-3">
            <span className="text-yellow-600">Level {level}</span>
            <span className="text-yellow-700">{network.toLocaleString()} miners</span>
            <span className="font-mono text-yellow-400">{earning.toFixed(3)} BG</span>
          </div>
        ))}
      </div>

      <div className="bg-yellow-500/20 rounded-xl p-4 text-center">
        <div className="text-yellow-600 mb-1">Total Potential Earnings</div>
        <div className="text-3xl font-bold text-yellow-400">{total.toFixed(3)} BG</div>
        <div className="text-yellow-600 text-sm">({(total / 0.10 * 100).toFixed(0)}% ROI)</div>
      </div>
    </div>
  );
};
