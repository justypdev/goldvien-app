'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  useAccount, 
  useReadContract, 
  useWriteContract,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { parseEther, formatEther, isAddress } from 'viem';

const BG_TOKEN_ADDRESS = '0x36b712A629095234F2196BbB000D1b96C12Ce78e';
const GOLD_VEIN_ADDRESS = '0x0520B1D4dF671293F8b4B1F52dDD4f9f687Fd565';

const BG_TOKEN_ABI = [
  { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }] },
];

const GOLD_VEIN_ABI = [
  { name: 'activate', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'referrer', type: 'address' }], outputs: [] },
  { name: 'isActivated', type: 'function', stateMutability: 'view', inputs: [{ name: '', type: 'address' }], outputs: [{ type: 'bool' }] },
  { name: 'getUserProfile', type: 'function', stateMutability: 'view', inputs: [{ name: 'userAddress', type: 'address' }], outputs: [
    { name: 'id', type: 'uint256' }, { name: 'joinedAt', type: 'uint256' }, { name: 'referrer', type: 'address' },
    { name: 'directReferrals', type: 'uint256' }, { name: 'totalEarned', type: 'uint256' }, { name: 'referralCode', type: 'string' },
    { name: 'earningsPerLevel', type: 'uint256[7]' }, { name: 'referralsPerLevel', type: 'uint256[7]' },
  ]},
  { name: 'getReferralCode', type: 'function', stateMutability: 'view', inputs: [{ name: 'userAddress', type: 'address' }], outputs: [{ type: 'string' }] },
  { name: 'getStats', type: 'function', stateMutability: 'view', inputs: [], outputs: [
    { name: '_totalUsers', type: 'uint256' }, { name: '_totalActivations', type: 'uint256' },
    { name: '_totalBurned', type: 'uint256' }, { name: '_totalRewardsDistributed', type: 'uint256' },
    { name: '_contractBalance', type: 'uint256' },
  ]},
];

const globalStyles = `
  @keyframes floatUp {
    0% { transform: translateY(0); opacity: 0; }
    10% { opacity: 0.6; }
    90% { opacity: 0.6; }
    100% { transform: translateY(-100vh); opacity: 0; }
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 20px rgba(234,179,8,0.4), 0 0 40px rgba(234,179,8,0.2); }
    50% { box-shadow: 0 0 30px rgba(234,179,8,0.6), 0 0 60px rgba(234,179,8,0.3); }
  }
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  @keyframes confettiFall {
    0% { transform: translateY(0) rotate(0deg); opacity: 1; }
    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
  }
`;

function GoldParticles() {
  const particles = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 10, duration: 10 + Math.random() * 10, size: 2 + Math.random() * 3,
  })), []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
      {particles.map((p) => (
        <div key={p.id} style={{
          position: 'absolute', left: `${p.left}%`, bottom: '-10px', width: `${p.size}px`, height: `${p.size}px`,
          background: 'radial-gradient(circle, #FFD700 0%, #B8860B 100%)', borderRadius: '50%',
          boxShadow: '0 0 8px #FFD700', animation: `floatUp ${p.duration}s linear infinite`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

function AnimatedNumber({ value, decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const target = parseFloat(value) || 0;
    if (target !== prevRef.current) {
      const start = prevRef.current, duration = 800, startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime, progress = Math.min(elapsed / duration, 1);
        setDisplay(start + (target - start) * (1 - Math.pow(1 - progress, 3)));
        if (progress < 1) requestAnimationFrame(animate);
        else prevRef.current = target;
      };
      requestAnimationFrame(animate);
    }
  }, [value]);
  return <>{display.toFixed(decimals)}</>;
}

function ReferralTree({ userProfile }) {
  const levels = [
    { name: 'L1', pct: '60%', amt: '0.060', color: '#EAB308' },
    { name: 'L2', pct: '14%', amt: '0.014', color: '#F97316' },
    { name: 'L3', pct: '9%', amt: '0.009', color: '#FB923C' },
    { name: 'L4', pct: '5%', amt: '0.005', color: '#84CC16' },
    { name: 'L5', pct: '4%', amt: '0.004', color: '#22C55E' },
    { name: 'L6', pct: '2%', amt: '0.002', color: '#10B981' },
    { name: 'L7', pct: '1%', amt: '0.001', color: '#14B8A6' },
  ];
  const referrals = userProfile?.[7] || [0,0,0,0,0,0,0];
  const earnings = userProfile?.[6] || [0n,0n,0n,0n,0n,0n,0n];
  let totalNetwork = 0;
  referrals.forEach(r => totalNetwork += Number(r || 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {levels.map((level, i) => {
        const count = Number(referrals[i] || 0);
        const earned = earnings[i] ? parseFloat(formatEther(earnings[i])) : 0;
        const active = count > 0;
        return (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '12px',
            background: active ? 'linear-gradient(to right, rgba(120,80,0,0.4), transparent)' : 'rgba(0,0,0,0.3)',
            border: active ? '1px solid rgba(234,179,8,0.5)' : '1px solid rgba(75,85,99,0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '14px', color: active ? '#000' : '#6B7280',
                background: active ? `linear-gradient(135deg, ${level.color}, ${level.color}cc)` : '#374151',
                boxShadow: active ? `0 0 20px ${level.color}40` : 'none',
              }}>{level.name}</div>
              <div>
                <div style={{ fontWeight: 'bold', color: active ? '#fff' : '#6B7280' }}>{level.pct} ({level.amt} BG)</div>
                <div style={{ fontSize: '14px', color: active ? '#FBBF24' : '#4B5563' }}>{i === 0 ? '✋ Direct' : '😴 Passive'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: active ? '#fff' : '#4B5563' }}>{count}</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>miners</div>
              </div>
              <div style={{ textAlign: 'right', minWidth: '100px' }}>
                <div style={{ fontFamily: 'monospace', fontWeight: 'bold', color: active ? '#4ADE80' : '#4B5563' }}>{earned.toFixed(4)} BG</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>earned</div>
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid rgba(234,179,8,0.3)' }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(120,80,0,0.5), rgba(0,0,0,0.8))', borderRadius: '16px', padding: '20px', textAlign: 'center', border: '1px solid rgba(234,179,8,0.3)' }}>
          <div style={{ color: '#EAB308', fontSize: '14px', marginBottom: '4px' }}>Total Network</div>
          <div style={{ fontSize: '36px', fontWeight: '900', color: '#FBBF24' }}>{totalNetwork}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg, rgba(22,101,52,0.5), rgba(0,0,0,0.8))', borderRadius: '16px', padding: '20px', textAlign: 'center', border: '1px solid rgba(34,197,94,0.3)' }}>
          <div style={{ color: '#22C55E', fontSize: '14px', marginBottom: '4px' }}>Total Earned</div>
          <div style={{ fontSize: '36px', fontWeight: '900', color: '#4ADE80' }}>{userProfile?.[4] ? parseFloat(formatEther(userProfile[4])).toFixed(4) : '0.0000'} BG</div>
        </div>
      </div>
    </div>
  );
}

function Calculator() {
  const [refs, setRefs] = useState(2);
  const amounts = [0.060, 0.014, 0.009, 0.005, 0.004, 0.002, 0.001];
  let total = 0, network = refs;
  const rows = amounts.map((amt, i) => { const earn = network * amt; total += earn; const row = { level: i + 1, network, earn }; network *= refs; return row; });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ background: 'linear-gradient(to right, rgba(22,101,52,0.6), rgba(22,101,52,0.3))', border: '1px solid rgba(34,197,94,0.5)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
        <div style={{ color: '#4ADE80', fontSize: '20px', fontWeight: 'bold' }}>🎯 PROFIT AT JUST 2 REFERRALS!</div>
        <div style={{ color: '#86EFAC', marginTop: '8px' }}>2 × 0.06 BG = 0.12 BG → <strong>+0.02 BG profit!</strong></div>
      </div>
      <div>
        <label style={{ display: 'block', color: '#FBBF24', marginBottom: '12px', fontSize: '18px' }}>
          If everyone refers <span style={{ fontSize: '32px', fontWeight: '900', color: '#FDE047' }}>{refs}</span> people:
        </label>
        <input type="range" min="2" max="10" value={refs} onChange={(e) => setRefs(parseInt(e.target.value))}
          style={{ width: '100%', height: '12px', borderRadius: '8px', cursor: 'pointer' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6B7280', marginTop: '4px' }}><span>2</span><span>10</span></div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(({ level, network, earn }) => (
          <div key={level} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', padding: '12px', border: '1px solid #374151' }}>
            <span style={{ color: '#EAB308', fontWeight: '500' }}>Level {level}</span>
            <span style={{ color: '#9CA3AF' }}>{network.toLocaleString()} miners</span>
            <span style={{ color: '#FBBF24', fontFamily: 'monospace', fontWeight: 'bold' }}>{earn.toFixed(3)} BG</span>
          </div>
        ))}
      </div>
      <div style={{ background: 'linear-gradient(to right, #EAB308, #F59E0B)', borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
        <div style={{ color: 'rgba(0,0,0,0.7)', fontSize: '14px' }}>Total Potential Earnings</div>
        <div style={{ fontSize: '40px', fontWeight: '900', color: '#000' }}>{total.toFixed(3)} BG</div>
        <div style={{ color: 'rgba(0,0,0,0.7)' }}>{((total / 0.10) * 100).toFixed(0)}% ROI</div>
      </div>
    </div>
  );
}

export default function GoldVein() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('tree');
  const [referrerInput, setReferrerInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [justActivated, setJustActivated] = useState(false);

  useEffect(() => {
    const styleEl = document.createElement('style');
    styleEl.textContent = globalStyles;
    document.head.appendChild(styleEl);
    return () => styleEl.remove();
  }, []);

  useEffect(() => {
    setJustActivated(false);
  }, [address]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref && isAddress(ref)) setReferrerInput(ref);
    }
  }, []);

  const { data: isUserActivated, refetch: refetchActivated } = useReadContract({ address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'isActivated', args: [address], enabled: !!address });
  const { data: userProfile, refetch: refetchProfile } = useReadContract({ address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'getUserProfile', args: [address], enabled: !!address && (isUserActivated || justActivated) });
  const { data: userReferralCode, refetch: refetchReferralCode } = useReadContract({ address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'getReferralCode', args: [address], enabled: !!address && (isUserActivated || justActivated) });
  const { data: globalStats, refetch: refetchStats } = useReadContract({ address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'getStats' });
  const { data: bgBalance } = useReadContract({ address: BG_TOKEN_ADDRESS, abi: BG_TOKEN_ABI, functionName: 'balanceOf', args: [address], enabled: !!address });
  const { data: allowance, refetch: refetchAllowance } = useReadContract({ address: BG_TOKEN_ADDRESS, abi: BG_TOKEN_ABI, functionName: 'allowance', args: [address, GOLD_VEIN_ADDRESS], enabled: !!address });

  const { writeContract: approve, data: approveHash, error: approveError, reset: resetApprove } = useWriteContract();
  const { writeContract: activate, data: activateHash, error: activateError, reset: resetActivate } = useWriteContract();
  const { isLoading: isApproving, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isLoading: isActivating, isSuccess: activateSuccess } = useWaitForTransactionReceipt({ hash: activateHash });

  useEffect(() => { if (approveError) { setError(approveError.shortMessage || approveError.message); resetApprove(); } }, [approveError]);
  useEffect(() => { if (activateError) { setError(activateError.shortMessage || activateError.message); resetActivate(); } }, [activateError]);
  useEffect(() => { if (approveSuccess) { refetchAllowance(); setSuccess('✅ Approved! Now click Open Gold Mine'); } }, [approveSuccess]);
  useEffect(() => { if (activateSuccess) { setJustActivated(true); setShowConfetti(true); setTimeout(() => setShowConfetti(false), 4000); refetchActivated(); refetchProfile(); refetchReferralCode(); refetchStats(); setSuccess('🎉 Welcome! Your mine is OPEN!'); } }, [activateSuccess]);

  const handleApprove = () => { setError(''); setSuccess(''); approve({ address: BG_TOKEN_ADDRESS, abi: BG_TOKEN_ABI, functionName: 'approve', args: [GOLD_VEIN_ADDRESS, parseEther('0.10')] }); };
  const handleActivate = () => { setError(''); setSuccess(''); if (!referrerInput || !isAddress(referrerInput)) { setError('Enter a valid referrer address'); return; } activate({ address: GOLD_VEIN_ADDRESS, abi: GOLD_VEIN_ABI, functionName: 'activate', args: [referrerInput] }); };
  const copyText = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const needsApproval = !allowance || allowance < parseEther('0.10');
  const hasBalance = bgBalance && bgBalance >= parseEther('0.10');
  const fmtBG = (v) => v ? parseFloat(formatEther(v)).toFixed(4) : '0.0000';

  const buttonStyle = (enabled) => ({
    width: '100%',
    background: enabled ? 'linear-gradient(to right, #EAB308, #F59E0B)' : '#374151',
    color: enabled ? '#000' : '#6B7280',
    fontWeight: 'bold',
    padding: '18px',
    borderRadius: '12px',
    fontSize: '18px',
    border: 'none',
    cursor: enabled ? 'pointer' : 'not-allowed',
    boxShadow: enabled ? '0 0 30px rgba(234,179,8,0.4)' : 'none',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <GoldParticles />

      {error && (
        <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'rgba(127,29,29,0.95)', border: '1px solid #EF4444', padding: '16px 24px', borderRadius: '12px', maxWidth: '400px' }}>
          <span style={{ color: '#FCA5A5' }}>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: '16px', color: '#FCA5A5', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}
      {success && (
        <div style={{ position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 50, background: 'rgba(20,83,45,0.95)', border: '1px solid #22C55E', padding: '16px 24px', borderRadius: '12px', maxWidth: '400px' }}>
          <span style={{ color: '#86EFAC' }}>{success}</span>
          <button onClick={() => setSuccess('')} style={{ marginLeft: '16px', color: '#86EFAC', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>✕</button>
        </div>
      )}

      {showConfetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 50, overflow: 'hidden' }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', left: `${Math.random() * 100}%`, top: '-20px',
              width: `${8 + Math.random() * 8}px`, height: `${8 + Math.random() * 8}px`,
              background: ['#FFD700', '#FFA500', '#FFEC8B', '#DAA520'][Math.floor(Math.random() * 4)],
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
              animation: `confettiFall 3s ease-out forwards`, animationDelay: `${Math.random() * 0.5}s`,
            }} />
          ))}
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 10, maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
        {/* Header */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', overflow: 'hidden', border: '2px solid #EAB308', boxShadow: '0 0 20px rgba(234,179,8,0.4)' }}>
              <img src="https://basegold.io/logov2.jpg" alt="BG" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '900', background: 'linear-gradient(to right, #FBBF24, #FDE047, #FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>GOLD VEIN</h1>
              <p style={{ color: '#CA8A04', fontSize: '14px', margin: 0 }}>7-Level Passive Income</p>
            </div>
          </div>
          <ConnectButton />
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
          {[
            { label: '⛏️ Miners', value: globalStats?.[0]?.toString() || '0', color: '#EAB308', bg: 'rgba(120,80,0,0.4)' },
            { label: '🔥 Burned', value: fmtBG(globalStats?.[2]) + ' BG', color: '#EF4444', bg: 'rgba(127,29,29,0.4)' },
            { label: '💰 Rewards', value: fmtBG(globalStats?.[3]) + ' BG', color: '#22C55E', bg: 'rgba(20,83,45,0.4)' },
            { label: '🎯 Activations', value: globalStats?.[1]?.toString() || '0', color: '#3B82F6', bg: 'rgba(30,58,138,0.4)' },
          ].map((stat, i) => (
            <div key={i} style={{ background: stat.bg, border: `1px solid ${stat.color}40`, borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
              <div style={{ color: stat.color, fontSize: '13px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Main Content */}
        {!isConnected ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{ width: '120px', height: '120px', margin: '0 auto 32px', borderRadius: '50%', overflow: 'hidden', border: '4px solid rgba(234,179,8,0.5)', boxShadow: '0 0 40px rgba(234,179,8,0.3)', animation: 'pulseGlow 2s ease-in-out infinite' }}>
              <img src="https://basegold.io/logov2.jpg" alt="BG" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <h2 style={{ fontSize: '42px', fontWeight: '900', marginBottom: '16px', background: 'linear-gradient(to right, #FBBF24, #FDE047)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Enter the Gold Vein</h2>
            <p style={{ color: '#CA8A04', fontSize: '18px', maxWidth: '500px', margin: '0 auto 40px' }}>Mine passive income through 7 levels of referrals. Connect your wallet to get started.</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', maxWidth: '800px', margin: '0 auto 40px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(120,80,0,0.4), rgba(0,0,0,0.6))', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>💰</div>
                <div style={{ color: '#FBBF24', fontWeight: 'bold', marginBottom: '8px' }}>95% to Users</div>
                <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Rewards go directly to your network</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, rgba(127,29,29,0.4), rgba(0,0,0,0.6))', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔥</div>
                <div style={{ color: '#EF4444', fontWeight: 'bold', marginBottom: '8px' }}>5% Burned</div>
                <div style={{ color: '#9CA3AF', fontSize: '14px' }}>Deflationary with every activation</div>
              </div>
              <div style={{ background: 'linear-gradient(135deg, rgba(20,83,45,0.4), rgba(0,0,0,0.6))', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '16px', padding: '24px' }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎯</div>
                <div style={{ color: '#22C55E', fontWeight: 'bold', marginBottom: '8px' }}>Profit at 2 Refs</div>
                <div style={{ color: '#9CA3AF', fontSize: '14px' }}>2 × 0.06 = 0.12 BG profit!</div>
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '16px', padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
              <div style={{ color: '#FBBF24', fontWeight: 'bold', marginBottom: '16px', fontSize: '18px' }}>7-Level Distribution</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {['L1: 60%', 'L2: 14%', 'L3: 9%', 'L4: 5%', 'L5: 4%', 'L6: 2%', 'L7: 1%'].map((level, i) => (
                  <span key={i} style={{ background: 'rgba(234,179,8,0.2)', color: '#FBBF24', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '500' }}>{level}</span>
                ))}
              </div>
            </div>
          </div>
        ) : !isUserActivated && !justActivated ? (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(120,80,0,0.3), rgba(0,0,0,0.6))', border: '2px solid rgba(234,179,8,0.5)', borderRadius: '24px', padding: '40px' }}>
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                <div style={{ width: '100px', height: '100px', margin: '0 auto 20px', borderRadius: '50%', background: 'linear-gradient(135deg, #EAB308, #F59E0B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '50px', boxShadow: '0 0 40px rgba(234,179,8,0.5)', animation: 'bounce 2s ease-in-out infinite' }}>⛏️</div>
                <h2 style={{ fontSize: '32px', fontWeight: '900', color: '#FBBF24', marginBottom: '8px' }}>Open Your Gold Mine</h2>
                <p style={{ color: '#CA8A04', fontSize: '18px' }}>Activation Fee: <strong>0.10 BG</strong></p>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '16px', padding: '20px', marginBottom: '24px', border: '1px solid #374151' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#9CA3AF', fontSize: '16px' }}>Your BG Balance:</span>
                  <span style={{ fontWeight: 'bold', fontSize: '24px', color: hasBalance ? '#4ADE80' : '#EF4444' }}>{fmtBG(bgBalance)} BG</span>
                </div>
                {hasBalance && <div style={{ color: '#4ADE80', fontSize: '14px', marginTop: '8px', textAlign: 'right' }}>✓ Sufficient balance</div>}
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', color: '#EAB308', marginBottom: '8px', fontWeight: 'bold', fontSize: '16px' }}>Referrer Address</label>
                <input 
                  type="text" 
                  value={referrerInput} 
                  onChange={(e) => setReferrerInput(e.target.value)} 
                  placeholder="0x..."
                  style={{ width: '100%', background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(234,179,8,0.3)', borderRadius: '12px', padding: '16px', color: '#fff', fontSize: '16px', fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} 
                />
                {referrerInput && isAddress(referrerInput) && <div style={{ color: '#4ADE80', fontSize: '14px', marginTop: '8px' }}>✓ Valid address</div>}
              </div>

              {needsApproval ? (
                <button onClick={handleApprove} disabled={isApproving || !hasBalance} style={buttonStyle(hasBalance && !isApproving)}>
                  {isApproving ? '⏳ Approving...' : '1️⃣ APPROVE BG TOKEN'}
                </button>
              ) : (
                <button onClick={handleActivate} disabled={isActivating || !hasBalance || !referrerInput || !isAddress(referrerInput)} style={buttonStyle(hasBalance && !isActivating && referrerInput && isAddress(referrerInput))}>
                  {isActivating ? '⛏️ Opening Mine...' : '⛏️ OPEN GOLD MINE (0.10 BG)'}
                </button>
              )}

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: needsApproval ? '#EAB308' : '#22C55E', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>{needsApproval ? '1' : '✓'}</div>
                  <span style={{ color: needsApproval ? '#EAB308' : '#22C55E', fontSize: '14px' }}>Approve</span>
                </div>
                <div style={{ width: '40px', height: '2px', background: '#374151', alignSelf: 'center' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: !needsApproval ? '#EAB308' : '#374151', color: !needsApproval ? '#000' : '#6B7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>2</div>
                  <span style={{ color: !needsApproval ? '#EAB308' : '#6B7280', fontSize: '14px' }}>Activate</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(120,80,0,0.3), rgba(0,0,0,0.6))', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ color: '#FBBF24', fontWeight: 'bold', marginBottom: '16px', fontSize: '18px' }}>🔗 Your Referral Link</h3>
                <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px', border: '1px solid #374151', wordBreak: 'break-all' }}>
                  <code style={{ color: '#FDE047', fontSize: '13px' }}>https://goldvien-app.vercel.app?ref={address}</code>
                </div>
                <button onClick={() => copyText(`https://goldvien-app.vercel.app?ref=${address}`)} style={{ width: '100%', background: 'linear-gradient(to right, #EAB308, #F59E0B)', color: '#000', fontWeight: 'bold', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                  {copied ? '✓ Copied!' : '📋 Copy Link'}
                </button>
              </div>
              <div style={{ background: 'linear-gradient(135deg, rgba(120,80,0,0.3), rgba(0,0,0,0.6))', border: '1px solid rgba(234,179,8,0.4)', borderRadius: '16px', padding: '24px' }}>
                <h3 style={{ color: '#FBBF24', fontWeight: 'bold', marginBottom: '16px', fontSize: '18px' }}>🎫 Your Referral Code</h3>
                <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center', border: '1px solid #374151' }}>
                  <code style={{ fontSize: '32px', fontWeight: '900', color: '#FBBF24', letterSpacing: '4px' }}>{userReferralCode || '...'}</code>
                </div>
                <button onClick={() => copyText(userReferralCode || '')} style={{ width: '100%', background: 'linear-gradient(to right, #EAB308, #F59E0B)', color: '#000', fontWeight: 'bold', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                  📋 Copy Code
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.4)', padding: '6px', borderRadius: '12px', width: 'fit-content', border: '1px solid #374151' }}>
              <button onClick={() => setActiveTab('tree')} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: activeTab === 'tree' ? 'linear-gradient(to right, #EAB308, #F59E0B)' : 'transparent', color: activeTab === 'tree' ? '#000' : '#CA8A04', fontSize: '16px' }}>🌳 Tree</button>
              <button onClick={() => setActiveTab('calculator')} style={{ padding: '12px 24px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: activeTab === 'calculator' ? 'linear-gradient(to right, #EAB308, #F59E0B)' : 'transparent', color: activeTab === 'calculator' ? '#000' : '#CA8A04', fontSize: '16px' }}>🧮 Calculator</button>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(120,80,0,0.2), rgba(0,0,0,0.6))', border: '1px solid rgba(234,179,8,0.3)', borderRadius: '16px', padding: '24px' }}>
              {activeTab === 'tree' && <ReferralTree userProfile={userProfile} />}
              {activeTab === 'calculator' && <Calculator />}
            </div>
          </div>
        )}

        <footer style={{ marginTop: '48px', paddingTop: '32px', borderTop: '1px solid rgba(234,179,8,0.2)', textAlign: 'center' }}>
          <div style={{ color: '#EAB308', fontWeight: 'bold', marginBottom: '8px' }}>GOLD VEIN by BaseGold.io</div>
          <div style={{ color: '#4B5563', fontSize: '14px' }}>95% to users • 5% burned • No middleman</div>
          <a href={`https://basescan.org/address/${GOLD_VEIN_ADDRESS}`} target="_blank" rel="noopener noreferrer" style={{ color: '#CA8A04', fontSize: '14px', marginTop: '8px', display: 'inline-block', textDecoration: 'none' }}>View Contract ↗</a>
        </footer>
      </div>
    </div>
  );
}
