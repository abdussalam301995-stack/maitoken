import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const maxEnergy = 1000;

  // App States
  const [balance, setBalance] = useState(0);
  const [profitPerHour, setProfitPerHour] = useState(100);
  const [energy, setEnergy] = useState(1000);
  const [activeTab, setActiveTab] = useState('home');
  const [clicks, setClicks] = useState([]); // For floating "+1" tap animations

  // Tap handler with energy check & floating click animations
  const handleCardClick = (e) => {
    if (energy <= 0) return;

    // Balance & Energy Update
    setBalance((prev) => prev + 1);
    setEnergy((prev) => Math.max(0, prev - 1));

    // Calculate position for floating +1 animation
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newClick = { id: Date.now(), x, y };
    setClicks((prevClicks) => [...prevClicks, newClick]);
  };

  // Remove individual floating clicks after animation finishes
  const handleAnimationEnd = (id) => {
    setClicks((prevClicks) => prevClicks.filter((click) => click.id !== id));
  };

  // Energy regeneration & passive income interval
  useEffect(() => {
    const timer = setInterval(() => {
      // Regenerate 2 energy per second
      setEnergy((prev) => Math.min(maxEnergy, prev + 2));

      // Add passive profit earned per second
      setBalance((prev) => prev + profitPerHour / 3600);
    }, 1000);

    return () => clearInterval(timer);
  }, [profitPerHour]);

  return (
    <div className="app">
      {/* Top Header */}
      <div className="header">
        <div className="profile">
          <span className="username">Crypto Miner</span>
        </div>
        <div className="profit-info">
          <span className="profit-label">Profit per hour</span>
          <h4 className="profit-value">+{profitPerHour} MAI</h4>
        </div>
      </div>

      {/* Main Content Rendered Based on Active Tab */}
      {activeTab === 'home' && (
        <>
          {/* Main Balance Section */}
          <div className="balance-section">
            <h1 className="balance-text">🪙 {Math.floor(balance).toLocaleString()}</h1>
            <p className="token-label">MAI TOKEN</p>
          </div>

          {/* Tap Coin Button & Floating Effects */}
          <div className="tap-section">
            <button className="tap-button" onClick={handleCardClick}>
              <div className="coin-icon">🪙</div>
              {clicks.map((click) => (
                <span
                  key={click.id}
                  className="floating-click"
                  style={{ top: `${click.y}px`, left: `${click.x}px` }}
                  onAnimationEnd={() => handleAnimationEnd(click.id)}
                >
                  +1
                </span>
              ))}
            </button>
          </div>

          {/* Energy Bar */}
          <div className="energy-bar-container">
            <div className="energy-info">
              <span>⚡ {energy} / {maxEnergy}</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(energy / maxEnergy) * 100}%` }}
              ></div>
            </div>
          </div>
        </>
      )}

      {/* Placeholder Views for Other Tabs */}
      {activeTab === 'mine' && (
        <div className="tab-view">
          <h2>⛏️ Mining Upgrades</h2>
          <p>Upgrade your cards to increase profit per hour!</p>
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="tab-view">
          <h2>👥 Invite Friends</h2>
          <p>Share your link and earn 10% from referrals.</p>
        </div>
      )}

      {activeTab === 'earn' && (
        <div className="tab-view">
          <h2>💰 Earn Tasks</h2>
          <p>Complete tasks and watch ads to get free MAI Tokens.</p>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="bottom-nav">
        <button
          className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
          onClick={() => setActiveTab('home')}
        >
          🏠 Home
        </button>
        <button
          className={`nav-item ${activeTab === 'mine' ? 'active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          ⛏️ Mine
        </button>
        <button
          className={`nav-item ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          👥 Friends
        </button>
        <button
          className={`nav-item ${activeTab === 'earn' ? 'active' : ''}`}
          onClick={() => setActiveTab('earn')}
        >
          💰 Earn
        </button>
      </div>
    </div>
  );
}

export default App;