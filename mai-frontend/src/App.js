import React, { useState, useEffect, useRef } from 'react';
import { 
  TonConnectUIProvider, 
  TonConnectButton, 
  useTonAddress, 
  useTonConnectUI 
} from '@tonconnect/ui-react';

// Telegram Channel and Group Links
const TASK_LINKS = {
  newsChannel: 'https://t.me/MAI_News_Official',
  payoutChannel: 'https://t.me/MAI_Payout_Proof',
  communityChat: 'https://t.me/MAICommunityChat',
  partnerChannel1: 'https://t.me/MAICommunityChat'
};

// Modern SVG Icons Component
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
          <path d="M23 21v-2a4 4 0 0 1 0 7.75" />
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
  const [selectedLevel, setSelectedLevel] = useState(null);

  // TON Connect Official Hooks
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
  const [showAdModal, setShowAdModal] = useState(false);
  const [adTimer, setAdTimer] = useState(10);
  const [hasClickedOpen, setHasClickedOpen] = useState(false);

  // Sync wallet address to localStorage whenever connection state changes
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

  // Ad Modal Timer Hook
  useEffect(() => {
    let timer;
    if (showAdModal && adTimer > 0) {
      timer = setInterval(() => {
        setAdTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [showAdModal, adTimer]);

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

    const dustParticles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2 - 0.1,
      radius: Math.random() * 3 + 1,
      alpha: Math.random() * 0.6 + 0.2,
      color: ['#00f0ff', '#e000ff', '#ffaa00', '#00ffaa'][Math.floor(Math.random() * 4)]
    }));

    let shootingStar = null;
    const createShootingStar = () => {
      shootingStar = {
        x: Math.random() * canvas.width * 0.8,
        y: Math.random() * (canvas.height * 0.4),
        length: Math.random() * 80 + 50,
        speed: Math.random() * 10 + 12,
        dx: 1,
        dy: 0.6,
        alpha: 1
      };
    };

    let pulseTime = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pulseTime += 0.015;

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      
      const cyanGlow = ctx.createRadialGradient(
        canvas.width * 0.3, canvas.height * 0.2, 10,
        canvas.width * 0.3, canvas.height * 0.2, canvas.width * 0.6
      );
      cyanGlow.addColorStop(0, `rgba(0, 212, 255, ${0.15 + Math.sin(pulseTime) * 0.05})`);
      cyanGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cyanGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const pinkGlow = ctx.createRadialGradient(
        canvas.width * 0.7, canvas.height * 0.7, 20,
        canvas.width * 0.7, canvas.height * 0.7, canvas.width * 0.7
      );
      pinkGlow.addColorStop(0, `rgba(235, 52, 186, ${0.18 + Math.cos(pulseTime) * 0.05})`);
      pinkGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pinkGlow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.restore();

      stars.forEach((s) => {
        s.alpha += s.alphaSpeed;
        if (s.alpha >= 1 || s.alpha <= 0.1) {
          s.alphaSpeed = -s.alphaSpeed;
        }

        s.y -= 0.08 * s.z;
        if (s.y < 0) s.y = canvas.height;

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius * s.z, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.globalAlpha = Math.max(0, Math.min(1, s.alpha));
        ctx.shadowBlur = 8 * s.z;
        ctx.shadowColor = s.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      });

      dustParticles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.shadowBlur = 12;
        ctx.shadowColor = p.color;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      });

      if (!shootingStar && Math.random() < 0.008) {
        createShootingStar();
      }

      if (shootingStar) {
        shootingStar.x += shootingStar.speed * shootingStar.dx;
        shootingStar.y += shootingStar.speed * shootingStar.dy;
        shootingStar.alpha -= 0.015;

        if (shootingStar.alpha > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(255, 255, 255, ${shootingStar.alpha})`;
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00f0ff';
          ctx.beginPath();
          ctx.moveTo(shootingStar.x, shootingStar.y);
          ctx.lineTo(
            shootingStar.x - shootingStar.length * shootingStar.dx,
            shootingStar.y - shootingStar.length * shootingStar.dy
          );
          ctx.stroke();
          ctx.restore();
        } else {
          shootingStar = null;
        }
      }

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
      const newTimer = 8 * 3600;
      setClaimTimer(newTimer);
      localStorage.setItem('mai_last_claim_time', Date.now().toString());
    }
  };

  const handleVerifyTask = async (taskKey, rewardAmount) => {
    if (completedTasks[taskKey]) {
      alert("Task already completed!");
      return;
    }

    const targetUrl = TASK_LINKS[taskKey] || 'https://t.me/MAICommunityChat';

    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(targetUrl);
    } else {
      window.open(targetUrl, '_blank');
    }

    try {
      const res = await fetch('https://my-crypto-app-4hm8.onrender.com/api/verify-membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || 7680002112, taskKey: taskKey })
      });
      const data = await res.json();

      if (data.isJoined) {
        setBalance((prev) => prev + rewardAmount);
        setCompletedTasks((prev) => ({ ...prev, [taskKey]: true }));
        alert(`Success! Joined & Verified. +${rewardAmount} MAI claimed!`);
      } else {
        setBalance((prev) => prev + rewardAmount);
        setCompletedTasks((prev) => ({ ...prev, [taskKey]: true }));
        alert(`Success! +${rewardAmount} MAI claimed!`);
      }
    } catch (e) {
      setBalance((prev) => prev + rewardAmount);
      setCompletedTasks((prev) => ({ ...prev, [taskKey]: true }));
      alert(`Success! +${rewardAmount} MAI claimed!`);
    }
  };

  const handleStartAd = () => {
    if (adCount >= 20) {
      alert("Daily Ad limit reached (20/20). Please wait 24 hours!");
      return;
    }
    if (adCooldown > 0) {
      alert(`Please wait ${adCooldown}s before watching another ad.`);
      return;
    }
    setAdTimer(10);
    setHasClickedOpen(false);
    setShowAdModal(true);
  };

  const handleOpenAdLink = () => {
    window.open("https://t.me/MAICommunityChat", "_blank");
    setHasClickedOpen(true);
  };

  const handleClaimAdReward = async () => {
    if (adTimer > 0) {
      alert("Please watch the ad for at least 10 seconds!");
      return;
    }
    if (!hasClickedOpen) {
      alert("Please click 'Open Now' to verify engagement!");
      return;
    }

    try {
      const res = await fetch('https://my-crypto-app-4hm8.onrender.com/api/verify-ad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchedDuration: 10, hasClickedOpen: true })
      });
      const data = await res.json();

      if (data.success) {
        setBalance((prev) => prev + 2.0);
        const newCount = adCount + 1;
        setAdCount(newCount);
        setShowAdModal(false);

        if (newCount >= 20) {
          setAdCooldown(86400);
          alert("Success! +2.0 MAI claimed. Daily limit reached (20/20).");
        } else {
          setAdCooldown(3);
          alert("Success! +2.0 MAI claimed.");
        }
      }
    } catch (e) {
      setBalance((prev) => prev + 2.0);
      const newCount = adCount + 1;
      setAdCount(newCount);
      setShowAdModal(false);
      setAdCooldown(newCount >= 20 ? 86400 : 3);
      alert("Success! +2.0 MAI claimed.");
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const generateLevels = () => {
    const levels = [];
    for (let lvl = 1; lvl <= 100; lvl++) {
      levels.push({
        level: lvl,
        needHolding: lvl * 1000,
        miningSpeed: 10 + (lvl - 1) * 2
      });
    }
    return levels;
  };

  const levelList = generateLevels();

  if (loading) {
    return (
      <div style={{ 
        backgroundImage: "url('/space-bg.jpg')", 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#fff' 
      }}>
        <div style={{ width: '120px', height: '120px', borderRadius: '50%', border: '2px solid #00f0ff', overflow: 'hidden', boxShadow: '0 0 35px rgba(0, 240, 255, 0.8)', marginBottom: '20px' }}>
          <img src="/mai-coin.jpg" alt="MAI Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <h2 style={{ color: '#00f0ff', letterSpacing: '3px', margin: '0 0 10px 0', textShadow: '0 0 12px #00f0ff' }}>MAI NETWORK</h2>
        <p style={{ color: '#ffb3ec', fontSize: '14px', fontWeight: 'bold' }}>Loading Cosmic World... {progress}%</p>
      </div>
    );
  }

  return (
    <div style={{ 
      backgroundImage: "url('/space-bg.jpg')", 
      backgroundSize: 'cover', 
      backgroundPosition: 'center', 
      backgroundAttachment: 'fixed', 
      color: '#ffffff', 
      minHeight: '100vh', 
      paddingBottom: '90px', 
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif", 
      position: 'relative' 
    }}>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header */}
        <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,240,255,0.2)', backgroundColor: 'rgba(5, 10, 25, 0.4)', backdropFilter: 'blur(10px)', width: '100%', boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontWeight: 'bold', fontSize: '15px', color: '#ffffff' }}>User</div>
            <div style={{ fontSize: '12px', color: '#00f0ff', fontWeight: '500' }}>ID: {userId || '7680002112'}</div>
          </div>
          
          <div style={{ backgroundColor: 'rgba(10, 20, 45, 0.7)', padding: '6px 14px 6px 8px', borderRadius: '25px', border: '1px solid rgba(0, 240, 255, 0.6)', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 0 20px rgba(0,240,255,0.3)' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', overflow: 'hidden', border: '1px solid #00f0ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/mai-coin.jpg" alt="Coin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span style={{ fontWeight: 'bold', color: '#00f0ff', fontSize: '15px' }}>{balance.toFixed(4)}</span>
          </div>
        </div>

        {/* Views */}
        {currentView === 'boost' ? (
          <div style={{ padding: '20px', maxWidth: '450px', margin: '0 auto' }}>
            <button 
              onClick={() => setCurrentView('main')}
              style={{ background: 'none', border: 'none', color: '#00f0ff', fontSize: '14px', cursor: 'pointer', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              ⬅ Back to Home
            </button>

            <div style={{ textAlign: 'center', marginBottom: '15px' }}>
              <img src="/mai-coin.jpg" alt="MAI Logo" style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #00f0ff', boxShadow: '0 0 20px rgba(0,240,255,0.7)' }} />
            </div>

            <div style={{ color: '#00f0ff', fontSize: '12px', textAlign: 'center', fontWeight: 'bold', lineHeight: '1.5', marginBottom: '20px', backgroundColor: 'rgba(10, 20, 50, 0.6)', backdropFilter: 'blur(8px)', padding: '10px', borderRadius: '10px', border: '1px solid rgba(0,240,255,0.4)' }}>
              HOLD MAI In Your Wallet to Boost Your Mining Rate. Sell MAI Your Level is down.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              {levelList.map((item) => (
                <div key={item.level} style={{ backgroundColor: 'rgba(10, 20, 45, 0.75)', backdropFilter: 'blur(8px)', border: '1px solid rgba(0, 240, 255, 0.3)', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00f0ff' }}>LVL {item.level}</span>
                    <img src="/mai-coin.jpg" alt="Logo" style={{ width: '18px', height: '18px', borderRadius: '50%' }} />
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}>MAI LVL {item.level}</div>
                  <div style={{ fontSize: '11px', color: '#00FF66', marginBottom: '12px' }}>Speed {item.miningSpeed}/Day</div>
                  <button onClick={() => setSelectedLevel(item)} style={{ width: '100%', padding: '8px', background: 'linear-gradient(135deg, #00f0ff, #0066ff)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>Lock</button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <div style={{ padding: '30px 20px', textAlign: 'center' }}>
                <div style={{ color: '#00f0ff', fontSize: '13px', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '15px' }}>24H SPEED: 5.0000 MAI</div>
                
                <div style={{ width: '240px', height: '240px', borderRadius: '50%', margin: '15px auto 20px auto', padding: '6px', background: 'linear-gradient(145deg, #00f0ff, #e000ff)', boxShadow: '0 0 60px rgba(0, 240, 255, 0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', border: '3px solid #00f0ff' }}>
                    <img src="/mai-coin.jpg" alt="MAI Coin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>

                <div style={{ color: '#d0e8ff', fontSize: '14px', marginBottom: '30px' }}>
                  Auto Mining Speed: <span style={{ color: '#00FF66', fontWeight: 'bold' }}>+0.0000578 / sec</span>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', width: '95%', margin: '0 auto', alignItems: 'stretch' }}>
                  {canClaim ? (
                    <button onClick={handleClaimBonus} style={{ flex: 1, padding: '16px 8px', background: 'linear-gradient(135deg, #00FF66, #009933)', color: '#000', border: 'none', borderRadius: '16px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>CLAIM BONUS (+1.66 MAI)</button>
                  ) : (
                    <div style={{ flex: 1, padding: '10px 8px', backgroundColor: 'rgba(10, 20, 45, 0.85)', border: '1px solid rgba(0, 240, 255, 0.5)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700' }}>FARMING TIME</div>
                      <div style={{ fontSize: '22px', fontWeight: '800', color: '#00f0ff' }}>{formatTime(claimTimer)}</div>
                    </div>
                  )}

                  <button onClick={() => setCurrentView('boost')} style={{ flex: 1, padding: '16px 8px', background: 'linear-gradient(135deg, #ff9900, #ff5500)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: '800', fontSize: '15px', cursor: 'pointer' }}>🚀 BOOST</button>
                </div>
              </div>
            )}

            {activeTab === 'task' && (
              <div style={{ padding: '20px', maxWidth: '400px', margin: '0 auto' }}>
                <h2 style={{ color: '#00f0ff', marginTop: 0 }}>Task Center</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', backgroundColor: 'rgba(10, 20, 45, 0.7)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(0,240,255,0.3)' }}>
                  {['daily', 'partner', 'exclusive'].map((cat) => (
                    <button key={cat} onClick={() => setTaskCategory(cat)} style={{ width: '32%', padding: '10px 0', borderRadius: '8px', border: 'none', fontWeight: 'bold', fontSize: '12px', backgroundColor: taskCategory === cat ? '#00f0ff' : 'transparent', color: taskCategory === cat ? '#000' : '#80d4ff', cursor: 'pointer' }}>{cat}</button>
                  ))}
                </div>

                {taskCategory === 'daily' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ backgroundColor: 'rgba(15, 25, 55, 0.75)', padding: '16px', borderRadius: '16px', border: '1px solid #00f0ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Watch Sponsored Ad</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#00f0ff' }}>+2.0000 MAI ({adCount}/20)</p>
                      </div>
                      <button onClick={handleStartAd} disabled={adCooldown > 0 || adCount >= 20} style={{ background: adCooldown > 0 ? '#102035' : 'linear-gradient(135deg, #00f0ff, #0066ff)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{adCooldown > 0 ? formatTime(adCooldown) : 'Watch Ad'}</button>
                    </div>

                    <div style={{ backgroundColor: 'rgba(15, 25, 55, 0.75)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(0,240,255,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>Join MAI News Channel</h4>
                        <p style={{ margin: 0, fontSize: '12px', color: '#00f0ff' }}>+5.0000 MAI</p>
                      </div>
                      <button onClick={() => handleVerifyTask('newsChannel', 5.0)} disabled={completedTasks['newsChannel']} style={{ background: completedTasks['newsChannel'] ? '#00cc55' : 'linear-gradient(135deg, #00f0ff, #0066ff)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>{completedTasks['newsChannel'] ? '✓ Done' : 'Join & Verify'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'friends' && (
              <div style={{ padding: '25px 20px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
                <h2 style={{ color: '#00f0ff', marginTop: 0 }}>Invite Friends</h2>
                <div style={{ backgroundColor: 'rgba(15, 25, 55, 0.75)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(0,240,255,0.3)' }}>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', border: '1px solid #00f0ff', fontSize: '12px', color: '#00f0ff', wordBreak: 'break-all', marginBottom: '15px' }}>
                    https://t.me/MAITokenBot?start=r_{userId || '7680002112'}
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(`https://t.me/MAITokenBot?start=r_${userId || '7680002112'}`); alert("Copied!"); }} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #00f0ff, #0066ff)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>Copy Invite Link</button>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div style={{ padding: '25px 20px', textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
                <h2 style={{ color: '#00f0ff', marginTop: 0 }}>User Profile</h2>
                <div style={{ backgroundColor: 'rgba(15, 25, 55, 0.75)', padding: '20px', borderRadius: '16px', border: '1px solid #00f0ff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
                  <h3 style={{ color: '#00f0ff', margin: 0, fontSize: '16px' }}>TON Wallet Connection</h3>
                  
                  {/* Official TON Connect Button Integration */}
                  <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                    <TonConnectButton />
                  </div>

                  {userFriendlyAddress && (
                    <div style={{ fontSize: '12px', color: '#00FF66', wordBreak: 'break-all', marginTop: '5px', fontWeight: '600' }}>
                      Connected: {userFriendlyAddress.substring(0, 6)}...{userFriendlyAddress.substring(userFriendlyAddress.length - 4)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* Ad Modal */}
      {showAdModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: '#0a1428', border: '1px solid #00f0ff', borderRadius: '20px', padding: '24px', width: '85%', maxWidth: '340px', textAlign: 'center' }}>
            <h3 style={{ color: '#00f0ff', marginTop: 0 }}>Sponsored Ad</h3>
            <p style={{ fontSize: '13px', color: '#d0e8ff', marginBottom: '20px' }}>
              Watch for 10s and click Open Now to claim <b>+2.0 MAI</b>
            </p>
            <div style={{ fontSize: '28px', fontWeight: '800', color: '#ff9900', marginBottom: '20px' }}>
              {adTimer > 0 ? `${adTimer}s` : '✓ Ready'}
            </div>
            <button onClick={handleOpenAdLink} style={{ width: '100%', padding: '12px', backgroundColor: hasClickedOpen ? '#00cc55' : '#00f0ff', color: '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', marginBottom: '10px', cursor: 'pointer' }}>
              {hasClickedOpen ? '✓ Opened Link' : 'Open Now'}
            </button>
            <button onClick={handleClaimAdReward} disabled={adTimer > 0 || !hasClickedOpen} style={{ width: '100%', padding: '12px', background: (adTimer > 0 || !hasClickedOpen) ? '#152338' : 'linear-gradient(135deg, #00FF66, #009933)', color: (adTimer > 0 || !hasClickedOpen) ? '#556b82' : '#000', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
              Claim +2.0 MAI
            </button>
          </div>
        </div>
      )}

      {/* Navigation Bar */}
      <div style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '420px', backgroundColor: 'rgba(8, 15, 30, 0.85)', backdropFilter: 'blur(18px)', display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '8px 4px', borderRadius: '24px', border: '1px solid rgba(255, 153, 0, 0.3)', zIndex: 1000 }}>
        {[
          { id: 'home', label: 'Home' },
          { id: 'task', label: 'Tasks' },
          { id: 'friends', label: 'Friends' },
          { id: 'profile', label: 'Profile' }
        ].map((tab) => {
          const isActive = activeTab === tab.id && currentView === 'main';
          return (
            <button key={tab.id} onClick={() => { setActiveTab(tab.id); setCurrentView('main'); }} style={{ background: isActive ? 'rgba(255, 153, 0, 0.15)' : 'transparent', border: isActive ? '1px solid rgba(255, 153, 0, 0.5)' : '1px solid transparent', borderRadius: '16px', padding: '8px 0', color: isActive ? '#ff9900' : '#80a0c0', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px', flex: 1 }}>
              <NavIcon id={tab.id} isActive={isActive} />
              <span style={{ fontSize: '11px', fontWeight: isActive ? '800' : '500' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}

// Wrap root component with TonConnectUIProvider
export default function App() {
  return (
    <TonConnectUIProvider manifestUrl="https://maitoken-nine.vercel.app/tonconnect-manifest.json">
      <MainApp />
    </TonConnectUIProvider>
  );
}