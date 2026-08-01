import React, { useState, useEffect, useRef } from 'react';
import { TonConnectUIProvider, TonConnectButton, useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';

// Telegram Channel and Group Links
const TASK_LINKS = {
  newsChannel: 'https://t.me/MAI_News_Official',
  payoutChannel: 'https://t.me/MAI_Payout_Proof',
  communityChat: 'https://t.me/MAICommunityChat',
  partnerChannel1: 'https://t.me/MAICommunityChat'
};

// NavIcon Component
const NavIcon = ({ id, isActive }) => {
  const color = isActive ? '#ff9900' : '#80a0c0';
  const filter = isActive ? 'drop-shadow(0px 0px 8px #ff9900)' : 'none';

  switch (id) {
    case 'home':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter, transition: 'all 0.3s ease' }}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'task':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter, transition: 'all 0.3s ease' }}>
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'friends':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter, transition: 'all 0.3s ease' }}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'profile':
      return (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter, transition: 'all 0.3s ease' }}>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    default:
      return null;
  }
};

function MainApp() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('home');
  const [taskCategory, setTaskCategory] = useState('daily');
  const [currentView, setCurrentView] = useState('main');

  // Real TON Wallet Hook
  const userFriendlyAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  const [balance, setBalance] = useState(() => {
    const saved = localStorage.getItem('mai_balance');
    return saved ? parseFloat(saved) : 10.0000;
  });

  const [claimTimer, setClaimTimer] = useState(() => {
    const savedLastClaim = localStorage.getItem('mai_last_claim_time');
    if (savedLastClaim) {
      const elapsed = Math.floor((Date.now() - parseInt(savedLastClaim, 10)) / 1000);
      const remaining = 8 * 3600 - elapsed;
      return remaining > 0 ? remaining : 0;
    }
    return 0;
  });

  const [canClaim, setCanClaim] = useState(() => claimTimer <= 0);
  const canvasRef = useRef(null);
  const [userId, setUserId] = useState(null);

  const [completedTasks, setCompletedTasks] = useState(() => {
    const saved = localStorage.getItem('mai_completed_tasks');
    return saved ? JSON.parse(saved) : {};
  });

  const [adCount, setAdCount] = useState(() => {
    const saved = localStorage.getItem('mai_ad_count');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [adCooldown, setAdCooldown] = useState(0);

  // Sync wallet address to LocalStorage whenever connection state changes
  useEffect(() => {
    if (userFriendlyAddress) {
      localStorage.setItem('mai_wallet_address', userFriendlyAddress);
    } else {
      localStorage.removeItem('mai_wallet_address');
    }
  }, [userFriendlyAddress]);

  useEffect(() => {
    localStorage.setItem('mai_balance', balance.toString());
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('mai_ad_count', adCount.toString());
  }, [adCount]);

  useEffect(() => {
    localStorage.setItem('mai_completed_tasks', JSON.stringify(completedTasks));
  }, [completedTasks]);

  useEffect(() => {
    if (canClaim) return;
    const timerInterval = setInterval(() => {
      setClaimTimer((prev) => {
        if (prev <= 1) {
          setCanClaim(true);
          clearInterval(timerInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [canClaim]);

  useEffect(() => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.ready();
      const user = window.Telegram.WebApp.initDataUnsafe?.user;
      if (user && user.id) {
        setUserId(user.id);
      } else {
        setUserId(7680002112);
      }
    } else {
      setUserId(7680002112);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => setLoading(false), 400);
          return 100;
        }
        return prev + 10;
      });
    }, 120);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 2 + 0.2,
      radius: Math.random() * 1.8 + 0.5,
      alpha: Math.random(),
      alphaSpeed: (Math.random() * 0.02 + 0.005) * (Math.random() > 0.5 ? 1 : -1),
      color: ['#ffffff', '#80d4ff', '#ffb3ec', '#ffd699'][Math.floor(Math.random() * 4)]
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.alpha += s.alphaSpeed;
        if (s.alpha >= 1 || s.alpha <= 0.1) s.alphaSpeed = -s.alphaSpeed;
        s.y -= 0.08 * s.z;
        if (s.y < 0) s.y = canvas.height;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * s.z, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        ctx.fill();
        ctx.globalAlpha = 1.0;
      });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [loading]);

  useEffect(() => {
    if (loading) return;
    const miningInterval = setInterval(() => {
      setBalance((prev) => prev + (5 / 86400));
    }, 1000);
    return () => clearInterval(miningInterval);
  }, [loading]);

  const handleClaimBonus = () => {
    if (canClaim) {
      setBalance((prev) => prev + 1.6667);
      setCanClaim(false);
      setClaimTimer(8 * 3600);
      localStorage.setItem('mai_last_claim_time', Date.now().toString());
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  if (loading) {
    return (
      <div style={{ backgroundImage: "url('/space-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '2px solid #00f0ff', overflow: 'hidden', marginBottom: '20px' }}>
          <img src="/mai-coin.jpg" alt="MAI Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h2 style={{ color: '#00f0ff', letterSpacing: '3px' }}>MAI NETWORK</h2>
        <p style={{ color: '#ffb3ec', fontSize: '14px', fontWeight: 'bold' }}>Loading... {progress}%</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundImage: "url('/space-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center', color: '#ffffff', minHeight: '100vh', paddingBottom: '90px', fontFamily: "'Inter', sans-serif" }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,240,255,0.2)', backgroundColor: 'rgba(5, 10, 25, 0.4)' }}>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>User</div>
            <div style={{ fontSize: '12px', color: '#00f0ff' }}>ID: {userId || '7680002112'}</div>
          </div>
          <div style={{ backgroundColor: 'rgba(10, 20, 45, 0.7)', padding: '6px 14px', borderRadius: '25px', border: '1px solid rgba(0, 240, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 'bold', color: '#00f0ff', fontSize: '15px' }}>{balance.toFixed(4)} MAI</span>
          </div>
        </div>

        {/* Content Views */}
        {activeTab === 'home' && (
          <div style={{ padding: '30px 20px', textAlign: 'center' }}>
            <div style={{ color: '#00f0ff', fontSize: '13px', fontWeight: 'bold', marginBottom: '15px' }}>24H SPEED: 5.0000 MAI</div>
            <div style={{ width: '200px', height: '200px', borderRadius: '50%', margin: '0 auto 20px', border: '3px solid #00f0ff', overflow: 'hidden' }}>
              <img src="/mai-coin.jpg" alt="MAI Coin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            {canClaim ? (
              <button onClick={handleClaimBonus} style={{ padding: '16px 32px', background: 'linear-gradient(135deg, #00FF66, #009933)', color: '#000', border: 'none', borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer' }}>CLAIM BONUS (+1.66 MAI)</button>
            ) : (
              <div style={{ fontSize: '20px', fontWeight: '800', color: '#00f0ff' }}>{formatTime(claimTimer)}</div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div style={{ padding: '25px 20px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
            <h2 style={{ color: '#00f0ff', marginTop: 0 }}>User Profile</h2>
            <div style={{ backgroundColor: 'rgba(15, 25, 55, 0.75)', padding: '20px', borderRadius: '16px', border: '1px solid #00f0ff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <h3 style={{ color: '#00f0ff', margin: 0, fontSize: '16px' }}>TON Wallet Connection</h3>

              {/* Official TON Connect UI Button */}
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <TonConnectButton />
              </div>

              {userFriendlyAddress && (
                <div style={{ fontSize: '12px', color: '#00FF66', wordBreak: 'break-all', marginTop: '8px' }}>
                  Connected: {userFriendlyAddress.substring(0, 6)}...{userFriendlyAddress.substring(userFriendlyAddress.length - 4)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      <div style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '420px', backgroundColor: 'rgba(8, 15, 30, 0.85)', display: 'flex', justifyContent: 'space-around', padding: '8px 4px', borderRadius: '24px', border: '1px solid rgba(255, 153, 0, 0.3)', zIndex: 1000 }}>
        {['home', 'task', 'friends', 'profile'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? 'rgba(255, 153, 0, 0.15)' : 'transparent', border: 'none', color: activeTab === tab ? '#ff9900' : '#80a0c0', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

// TON Connect UI Provider Wrapper Component
export default function App() {
  return (
    <TonConnectUIProvider manifestUrl="https://maitoken-nine.vercel.app/tonconnect-manifest.json">
      <MainApp />
    </TonConnectUIProvider>
  );
}