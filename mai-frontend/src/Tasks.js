import React, { useState, useEffect } from 'react';
import './Tasks.css';

const Tasks = () => {
  // =========================================
  // Navigation State
  // =========================================
  const [activeTab, setActiveTab] = useState('Daily');

  // =========================================
  // DAILY TAB STATES
  // =========================================
  const [adsLimit, setAdsLimit] = useState(200);
  const [adCooldown, setAdCooldown] = useState(0);
  const [adState, setAdState] = useState(null); // null, 'watching', 'failed'
  const [adTimer, setAdTimer] = useState(5); // 5 seconds ad simulation

  const [socialTasks, setSocialTasks] = useState([
    { id: 'news', title: 'Join MAI News', reward: 2, status: 'idle', link: 'https://t.me/your_news_channel' },
    { id: 'payout', title: 'Join MAI Pay Out', reward: 2, status: 'idle', link: 'https://t.me/your_payout_channel' },
    { id: 'chat', title: 'Join MAI Chat Group', reward: 2, status: 'idle', link: 'https://t.me/your_chat_group' }
  ]);

  // =========================================
  // PARTNER TAB STATES
  // =========================================
  const [showPromote, setShowPromote] = useState(false);
  const [payMethod, setPayMethod] = useState('MAI'); // 'MAI' or 'GRAM'
  const [category, setCategory] = useState('Channel'); // 'Channel' or 'Bot'
  const [selectedTier, setSelectedTier] = useState(null);

  const promoteTiers = [
    { completions: 100, mai: 5000, gram: 0.5 },
    { completions: 500, mai: 25000, gram: 2.5 },
    { completions: 1000, mai: 50000, gram: 5 },
    { completions: 2000, mai: 100000, gram: 10 },
    { completions: 5000, mai: 250000, gram: 25 },
    { completions: 10000, mai: 500000, gram: 50 }
  ];

  // =========================================
  // LOGIC: Ad Cooldown Timer
  // =========================================
  useEffect(() => {
    if (adCooldown > 0) {
      const timer = setTimeout(() => setAdCooldown(adCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [adCooldown]);

  // =========================================
  // LOGIC: Ad Watching Simulation
  // =========================================
  useEffect(() => {
    let timer;
    if (adState === 'watching' && adTimer > 0) {
      timer = setTimeout(() => setAdTimer(adTimer - 1), 1000);
    } else if (adState === 'watching' && adTimer === 0) {
      // Ad watched successfully
      setAdState(null);
      setAdsLimit(prev => Math.max(0, prev - 1));
      setAdCooldown(5); 
      alert("✅ Reward 1 MAI received!");
    }
    return () => clearTimeout(timer);
  }, [adState, adTimer]);

  const handleWatchAd = () => {
    if (adsLimit <= 0) return alert('Daily Ad limit reached! Please wait for tomorrow.');
    if (adCooldown > 0) return;
    setAdTimer(5); // Reset timer to 5s
    setAdState('watching');
  };

  const handleCancelAd = () => {
    setAdState('failed'); // Trigger failure if closed early
  };

  // =========================================
  // LOGIC: Social Task Verification
  // =========================================
  const handleJoinTask = (taskId, link) => {
    window.open(link, '_blank'); // Open Telegram link
    
    // Set state to verifying
    setSocialTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, status: 'verifying' } : t));

    // Simulate Server Verification Time (4 seconds delay)
    setTimeout(() => {
      // Logic to test verification (Randomly fail or succeed for now)
      const isActuallyJoined = Math.random() > 0.3; // 70% chance to succeed
      
      if (isActuallyJoined) {
        setSocialTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, status: 'completed' } : t));
        alert("✅ Task Verified! 2 MAI Reward received.");
      } else {
        setSocialTasks(tasks => tasks.map(t => t.id === taskId ? { ...t, status: 'idle' } : t));
        alert("❌ Verification Failed! You have not joined yet. Please join and try again.");
      }
    }, 4000);
  };

  return (
    <div className="task-container">
      {/* 1. TOP TABS NAVIGATION */}
      <div className="tabs-wrapper">
        {['Daily', 'Partner', 'Exclusive'].map(tab => (
          <button 
            key={tab} 
            className={`tab-btn ${activeTab === tab ? 'active' : ''}`} 
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 2. DAILY TAB CONTENT */}
      {activeTab === 'Daily' && (
        <div>
          {/* Ads Section */}
          <div className="task-card">
            <div className="task-info">
              <h3>Watch Ads Earn</h3>
              <p>Daily Limit: {adsLimit} / 200</p>
              {adCooldown > 0 && <p style={{ color: '#ff4500' }}>Cooldown: {adCooldown}s</p>}
            </div>
            <button 
              className={`action-btn ${adCooldown > 0 || adsLimit === 0 ? 'disabled' : ''}`} 
              onClick={handleWatchAd}
            >
              Watch
            </button>
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '25px 0' }} />

          {/* Social Tasks Section */}
          <h3 style={{ color: '#aaa', fontSize: '14px', marginBottom: '15px', textTransform: 'uppercase' }}>Social Tasks</h3>
          {socialTasks.map(task => (
            <div className="task-card" key={task.id}>
              <div className="task-info">
                <h3>{task.title}</h3>
                <p>Reward: +{task.reward} MAI</p>
              </div>
              
              {task.status === 'idle' && (
                <button className="action-btn" onClick={() => handleJoinTask(task.id, task.link)}>Join</button>
              )}
              {task.status === 'verifying' && (
                <button className="action-btn verifying">Verifying...</button>
              )}
              {task.status === 'completed' && (
                <button className="action-btn success" disabled>Claimed ✅</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 3. PARTNER TAB CONTENT */}
      {activeTab === 'Partner' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
            <button className="action-btn" onClick={() => setShowPromote(true)}>+ Add to Promote</button>
          </div>
          <div style={{ textAlign: 'center', color: '#555', marginTop: '50px' }}>
            <p>Your promoted links will appear here.</p>
          </div>
        </div>
      )}

      {/* ================= MODALS SECTION ================= */}

      {/* 4. ADS WATCHING MODAL */}
      {adState === 'watching' && (
        <div className="popup-overlay">
          <div className="popup-content success-border">
            <h3 style={{ color: '#00f2fe' }}>Watching Advertisement...</h3>
            <h1 style={{ color: 'white', fontSize: '40px', margin: '15px 0' }}>{adTimer}s</h1>
            <p style={{ color: '#aaa', fontSize: '13px', marginBottom: '20px' }}>Please wait. Do not close this window.</p>
            <button className="action-btn" style={{ background: '#ff4500', width: '100%' }} onClick={handleCancelAd}>Close / Cancel</button>
          </div>
        </div>
      )}

      {/* 5. ADS FAILED MODAL */}
      {adState === 'failed' && (
        <div className="popup-overlay">
          <div className="popup-content">
            <h3 style={{ color: '#ff4500' }}>❌ Verification Failed</h3>
            <p style={{ color: '#aaa', fontSize: '14px', marginBottom: '20px' }}>
              You closed the ad before it finished. No reward given.
            </p>
            <button className="action-btn" style={{ width: '100%' }} onClick={() => setAdState(null)}>Close</button>
          </div>
        </div>
      )}

      {/* 6. PARTNER PROMOTE MODAL */}
      {showPromote && (
        <div className="promote-modal">
          <div className="promote-header">
            <h2>Promote</h2>
            <button className="close-btn" onClick={() => setShowPromote(false)}>✕</button>
          </div>

          <div className="currency-toggle">
            <button className={`curr-btn ${payMethod === 'GRAM' ? 'active' : ''}`} onClick={() => setPayMethod('GRAM')}>
              ✈️ PAY GRAM
            </button>
            <button className={`curr-btn ${payMethod === 'MAI' ? 'active' : ''}`} onClick={() => setPayMethod('MAI')}>
              💎 PAY MAI
            </button>
          </div>

          <div className="info-banner">
            <span className="highlight-text">💎 Deflationary Marketing</span><br/>
            Direct & Professional: Pay MAI to generate marketing tasks, and 20% of your payment will be permanently burned. 💎
          </div>

          <h4 style={{ color: '#aaa', marginTop: '20px', marginBottom: '10px', fontSize: '13px' }}>CATEGORY</h4>
          <div className="category-toggle">
            <button className={`cat-btn ${category === 'Channel' ? 'active' : ''}`} onClick={() => setCategory('Channel')}>✈️ Channel / Group</button>
            <button className={`cat-btn ${category === 'Bot' ? 'active' : ''}`} onClick={() => setCategory('Bot')}>🌍 Website / Bot</button>
          </div>

          <div className="info-banner warning">
            <span className="warning-text">🛡️ Verification Check:</span> Add this Bot as an Admin in your Channel or Group to proceed.
          </div>

          <h4 style={{ color: '#aaa', marginTop: '20px', marginBottom: '10px', fontSize: '13px' }}>NUMBER OF COMPLETIONS</h4>
          <div className="tiers-grid">
            {promoteTiers.map((tier, idx) => (
              <div key={idx} className={`tier-card ${selectedTier === idx ? 'active' : ''}`} onClick={() => setSelectedTier(idx)}>
                <h2>{tier.completions}</h2>
                <p>{payMethod === 'MAI' ? `${tier.mai.toLocaleString()} MAI` : `${tier.gram} GRAM`}</p>
              </div>
            ))}
          </div>

          {selectedTier !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '15px' }}>
              <span style={{ color: '#aaa' }}>👥 Users get: {(promoteTiers[selectedTier].mai * 0.8).toLocaleString()} MAI</span>
              <span style={{ color: '#ff4500', fontWeight: 'bold' }}>💎 BURNED: {(promoteTiers[selectedTier].mai * 0.2).toLocaleString()} MAI</span>
            </div>
          )}

          <button className="submit-btn">Submit Campaign</button>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '12px' }}>Deducted directly from your App Balance.</p>
        </div>
      )}
    </div>
  );
};

export default Tasks;