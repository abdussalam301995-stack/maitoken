import React, { useEffect, useState } from 'react';
import './Tasks.css';

const API_URL = (process.env.REACT_APP_API_URL || 'https://maitoken.onrender.com').replace(/\/$/, '');

function taskDeviceId() {
  try {
    const key = 'mai_device_id';
    let value = localStorage.getItem(key);

    if (!value) {
      value =
        window.crypto?.randomUUID?.() ||
        `mai-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(key, value);
    }

    return value;
  } catch {
    return '';
  }
}

async function api(path, { method = 'GET', body, initData } = {}) {
  const headers = { 'Content-Type': 'application/json' };

  const telegramInitData =
    initData ||
    window.Telegram?.WebApp?.initData ||
    '';

  if (telegramInitData) {
    headers['X-Telegram-Init-Data'] = telegramInitData;
  } else if (process.env.REACT_APP_DEV_USER_ID) {
    headers['X-Dev-User'] = process.env.REACT_APP_DEV_USER_ID;
  }

  const device = taskDeviceId();
  if (device) headers['X-MAI-Device-ID'] = device;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const tiers = [
  { completions: 100, mai: 5000, gram: 0.5 },
  { completions: 500, mai: 25000, gram: 2.5 },
  { completions: 1000, mai: 50000, gram: 5 },
  { completions: 2000, mai: 100000, gram: 10 },
  { completions: 5000, mai: 250000, gram: 25 },
  { completions: 10000, mai: 500000, gram: 50 }
];

export default function Tasks({ initData, onUserUpdate }) {
  const [tab, setTab] = useState('Daily');
  const [tasks, setTasks] = useState([]);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [adSession, setAdSession] = useState(null);
  const [adSeconds, setAdSeconds] = useState(0);
  const [adOpened, setAdOpened] = useState(false);
  const [adUrl, setAdUrl] = useState('');
  const [adCount, setAdCount] = useState(0);
  const [payMethod, setPayMethod] = useState('MAI');
  const [category, setCategory] = useState('Channel');
  const [selectedTier, setSelectedTier] = useState(null);
  const [targetUrl, setTargetUrl] = useState('');
  const [managedTasks, setManagedTasks] = useState([]);
  const [missions, setMissions] = useState([]);
  const [managedLoading, setManagedLoading] = useState(false);

  const loadTasks = async () => {
    try {
      const data = await api('/api/tasks', { initData });
      const overview = data.tasks || {};
      setTasks(Array.isArray(overview) ? overview : (overview.joins || []));
      setAdCount(Number(overview?.ads?.completed || 0));
    } catch (e) { setMessage(e.message); }
  };

  useEffect(() => { loadTasks(); }, []); // initData is stable for this Mini App

  useEffect(() => {
    if (!adSession || adSeconds <= 0) return;
    const id = setInterval(() => setAdSeconds(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [adSession, adSeconds]);

  const startAd = async () => {
    setMessage('');
    try {
      const data = await api('/api/ads/start', { method: 'POST', initData });
      setAdSession(data.sessionId);
      setAdUrl(String(data.url || ''));
      // Countdown is UI guidance only. The backend/provider completion status
      // remains authoritative for whether the reward can be claimed.
      setAdSeconds(10);
      setAdOpened(false);
    } catch (e) { setMessage(e.message); }
  };

  const openAd = async () => {
    if (!adSession) return;
    try {
      if (!adUrl) throw new Error('Ad provider URL is not available.');
      const webApp = window.Telegram?.WebApp;
      if (webApp?.openLink) webApp.openLink(adUrl);
      else window.open(adUrl, '_blank', 'noopener,noreferrer');
      setAdOpened(true);
    } catch (e) { setMessage(e.message); }
  };

  const claimAd = async () => {
    if (adSeconds > 0 || !adOpened || !adSession) return;
    setBusy('ad');
    try {
      const status = await api(`/api/ads/status/${adSession}`, { initData });
      if (String(status.status || '').toLowerCase() !== 'completed') {
        throw new Error('The ad provider has not verified completion yet. Please finish the ad and try again.');
      }
      const data = await api(`/api/ads/claim/${adSession}`, { method: 'POST', initData });
      onUserUpdate?.(data.user);
      setAdCount(c => c + 1);
      setAdSession(null);
      setAdUrl('');
      setAdOpened(false);
      setMessage(`+${Number(data.reward || 0).toFixed(4)} MAI received.`);
      await loadTasks();
    } catch (e) { setMessage(e.message); }
    finally { setBusy(''); }
  };

  const verifyTask = async task => {
    if (task.completed || busy) return;
    setBusy(task.key);
    setMessage('');
    try {
      const state = String(task.state || (task.completed ? 'claimed' : 'join')).toLowerCase();

      if (state === 'join') {
        await api(`/api/tasks/join/${task.key}`, { method: 'POST', initData });
        const webApp = window.Telegram?.WebApp;
        if (webApp?.openTelegramLink) webApp.openTelegramLink(task.link);
        else window.open(task.link, '_blank', 'noopener,noreferrer');
        setMessage('Task opened. Join it, then tap CHECK.');
      } else if (state === 'check') {
        const data = await api(`/api/tasks/check/${task.key}`, { method: 'POST', initData });
        if (data.verified === false) throw new Error(data.message || 'Task is not verified yet.');
        setMessage(data.message || 'Verified. Reward is ready to claim.');
      } else if (state === 'claim') {
        const data = await api(`/api/tasks/claim/${task.key}`, { method: 'POST', initData });
        onUserUpdate?.(data.user);
        setMessage(`+${Number(data.reward || task.reward || 0).toFixed(4)} MAI received.`);
      }

      await loadTasks();
    } catch (e) { setMessage(e.message); }
    finally { setBusy(''); }
  };

  const submitCampaign = async () => {
    if (selectedTier === null) return setMessage('Select a completion tier.');
    setBusy('campaign');
    try {
      const data = await api('/api/campaigns', {
        method: 'POST',
        initData,
        body: {
          category,
          targetUrl,
          completions: tiers[selectedTier].completions,
          paymentMethod: payMethod
        }
      });
      onUserUpdate?.(data.user);
      setMessage(data.message);
      setTargetUrl('');
      setSelectedTier(null);
    } catch (e) { setMessage(e.message); }
    finally { setBusy(''); }
  };

  const loadManagedTasks = async () => {
    setManagedLoading(true);
    try {
      const data = await api('/api/managed-tasks', { initData });
      setManagedTasks((data.tasks || []).map(task => ({
        ...task,
        user_state: task.state,
        target_url: task.link,
        task_type: task.type
      })));
    } catch (e) {
      setMessage(e.message);
    } finally {
      setManagedLoading(false);
    }
  };

  const loadMissions = async () => {
    setManagedLoading(true);
    try {
      const data = await api('/api/missions', { initData });
      setMissions((data.missions || []).map(mission => ({
        ...mission,
        completed_tasks: mission.progress,
        total_tasks: mission.total,
        claimed: mission.bonusClaimed,
        completion_bonus: mission.completionBonus
      })));
    } catch (e) {
      setMessage(e.message);
    } finally {
      setManagedLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'Tasks') loadManagedTasks();
    if (tab === 'Missions') loadMissions();
  }, [tab]);

  const managedTaskAction = async task => {
    if (busy) return;

    const state = String(task.user_state || 'go').toLowerCase();

    if (state === 'claimed') return;

    setBusy(`managed-${task.id}`);
    setMessage('');

    try {
      if (
        state !== 'claim' &&
        task.target_url
      ) {
        const webApp = window.Telegram?.WebApp;

        if (
          task.task_type === 'telegram_join' &&
          webApp?.openTelegramLink
        ) {
          webApp.openTelegramLink(task.target_url);
        } else if (webApp?.openLink) {
          webApp.openLink(task.target_url);
        } else {
          window.open(
            task.target_url,
            '_blank',
            'noopener,noreferrer'
          );
        }
      }

      const endpoint =
        state === 'claim'
          ? `/api/managed-tasks/${task.id}/claim`
          : `/api/managed-tasks/${task.id}/verify`;

      const data = await api(endpoint, {
        method: 'POST',
        initData
      });

      if (data.user) {
        onUserUpdate?.(data.user);
      }

      setMessage(
        data.message ||
        (
          state === 'claim'
            ? `+${Number(data.reward || task.reward || 0).toFixed(4)} MAI received.`
            : 'Task verified. Claim your reward.'
        )
      );

      await loadManagedTasks();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy('');
    }
  };

  const claimMission = async mission => {
    if (busy) return;

    setBusy(`mission-${mission.id}`);
    setMessage('');

    try {
      const data = await api(
        `/api/missions/${mission.id}/claim`,
        {
          method: 'POST',
          initData
        }
      );

      if (data.user) {
        onUserUpdate?.(data.user);
      }

      setMessage(
        data.message ||
        `+${Number(data.reward || mission.completion_bonus || 0).toFixed(4)} MAI mission bonus received.`
      );

      await loadMissions();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy('');
    }
  };


  return (
    <section className="tasks-page">
      <div className="task-tabs">
        {['Daily', 'Tasks', 'Missions', 'Promote'].map(t => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>

      {message && <div className="task-message" onClick={() => setMessage('')}>{message} ×</div>}

      {tab === 'Daily' && (
        <>
          <div className="task-hero">
            <span>DAILY REWARDS</span>
            <h2>Earn MAI</h2>
            <p>Rewards are verified by the server.</p>
          </div>

          <div className="task-card ad-card">
            <div className="task-icon">◉</div>
            <div className="task-info"><b>Sponsored Ad</b><span>10s engagement · Daily {adCount}/20</span></div>
            <button className="task-btn" onClick={startAd} disabled={!!adSession}>{adSession ? `${adSeconds}s` : 'WATCH'}</button>
          </div>

          <div className="task-label">SOCIAL TASKS</div>
          {tasks.map(task => (
            <div className="task-card" key={task.key}>
              <div className="task-icon">✦</div>
              <div className="task-info"><b>{task.title}</b><span>Reward +{task.reward} MAI</span></div>
              <button className={`task-btn ${task.completed ? 'done' : ''}`} onClick={() => verifyTask(task)} disabled={task.completed || busy === task.key}>
                {task.completed
                  ? 'CLAIMED ✓'
                  : busy === task.key
                    ? 'WORKING…'
                    : String(task.state || 'join').toLowerCase() === 'claim'
                      ? 'CLAIM'
                      : String(task.state || 'join').toLowerCase() === 'check'
                        ? 'CHECK'
                        : 'JOIN'}
              </button>
            </div>
          ))}

          {adSession && (
            <div className="task-modal-backdrop">
              <div className="task-modal">
                <div className="modal-tag">SPONSORED</div>
                <h3>Watch Advertisement</h3>
                <div className="ad-countdown">{adSeconds > 0 ? `${adSeconds}s` : 'READY'}</div>
                <p>Keep this window open, then tap Open Now and claim when the timer finishes.</p>
                <button className="task-btn full" onClick={openAd}>{adOpened ? '✓ OPENED' : 'OPEN NOW'}</button>
                <button className="cancel-btn" onClick={() => setAdSession(null)}>CANCEL</button>
                <button className="gold-btn full" disabled={adSeconds > 0 || !adOpened || busy === 'ad'} onClick={claimAd}>CLAIM +2 MAI</button>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'Promote' && (
        <div className="partner-box">
          <div className="task-hero"><span>MARKETING MARKETPLACE</span><h2>Promote</h2><p>Submit a campaign for review.</p></div>

          <div className="toggle-row">
            <button className={payMethod === 'MAI' ? 'active' : ''} onClick={() => setPayMethod('MAI')}>💎 PAY MAI</button>
            <button className={payMethod === 'GRAM' ? 'active' : ''} onClick={() => setPayMethod('GRAM')}>✈ PAY GRAM</button>
          </div>

          {payMethod === 'GRAM' && <div className="notice">GRAM payment is not enabled in this version. Choose MAI.</div>}

          <div className="field-label">CATEGORY</div>
          <div className="toggle-row">
            <button className={category === 'Channel' ? 'active' : ''} onClick={() => setCategory('Channel')}>CHANNEL / GROUP</button>
            <button className={category === 'Bot' ? 'active' : ''} onClick={() => setCategory('Bot')}>WEBSITE / BOT</button>
          </div>

          <div className="field-label">TARGET URL</div>
          <input className="task-input" value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://t.me/yourchannel" />

          <div className="field-label">COMPLETIONS</div>
          <div className="tier-grid">
            {tiers.map((t, i) => (
              <button key={t.completions} className={`tier ${selectedTier === i ? 'active' : ''}`} onClick={() => setSelectedTier(i)}>
                <b>{t.completions.toLocaleString()}</b><span>{t.mai.toLocaleString()} MAI</span>
              </button>
            ))}
          </div>

          {selectedTier !== null && (
            <div className="burn-row"><span>Users receive 80%</span><b>20% BURN</b></div>
          )}

          <button className="gold-btn full" disabled={busy === 'campaign' || payMethod !== 'MAI' || !targetUrl} onClick={submitCampaign}>
            {busy === 'campaign' ? 'SUBMITTING…' : 'SUBMIT CAMPAIGN'}
          </button>
          <small className="disclaimer">Payment is deducted server-side and the campaign enters pending review.</small>
        </div>
      )}

      {tab === 'Tasks' && (
        <div className="managed-task-area">
          <div className="task-hero">
            <span>MAI TASK CENTER</span>
            <h2>Tasks</h2>
            <p>Complete verified tasks and claim server-controlled rewards.</p>
          </div>

          {managedLoading && (
            <div className="task-empty-card">
              Loading tasks...
            </div>
          )}

          {!managedLoading && managedTasks.map(task => {
            const state =
              String(task.user_state || 'go').toLowerCase();

            const label =
              state === 'claimed'
                ? 'COMPLETED ✓'
                : state === 'claim'
                  ? 'CLAIM'
                  : busy === `managed-${task.id}`
                    ? 'CHECKING…'
                    : 'GO / VERIFY';

            return (
              <div
                className="task-card managed-task-card"
                key={task.id}
              >
                <div className="task-icon">
                  {task.icon || '✓'}
                </div>

                <div className="task-info">
                  <b>{task.title}</b>
                  <span>
                    Reward +{Number(task.reward || 0).toLocaleString()} MAI
                    {' · '}
                    {task.recurrence || 'once'}
                  </span>
                  {task.description && (
                    <small>{task.description}</small>
                  )}
                </div>

                <button
                  className={`task-btn ${state === 'claimed' ? 'done' : ''}`}
                  disabled={
                    state === 'claimed' ||
                    busy === `managed-${task.id}`
                  }
                  onClick={() => managedTaskAction(task)}
                >
                  {label}
                </button>
              </div>
            );
          })}

          {!managedLoading && !managedTasks.length && (
            <div className="task-empty-card">
              No active tasks right now.
            </div>
          )}
        </div>
      )}

      {tab === 'Missions' && (
        <div className="managed-mission-area">
          <div className="task-hero">
            <span>MAI MISSION CENTER</span>
            <h2>Missions</h2>
            <p>Finish every required task to unlock the completion bonus.</p>
          </div>

          {managedLoading && (
            <div className="task-empty-card">
              Loading missions...
            </div>
          )}

          {!managedLoading && missions.map(mission => {
            const done =
              Number(mission.completed_tasks || 0);
            const total =
              Number(mission.total_tasks || 0);
            const claimed =
              Boolean(mission.claimed);
            const ready =
              total > 0 &&
              done >= total &&
              !claimed;
            const progress =
              total > 0
                ? Math.min(100, (done / total) * 100)
                : 0;

            return (
              <article
                className={`managed-mission-card ${mission.featured ? 'featured' : ''}`}
                key={mission.id}
              >
                <div className="managed-mission-head">
                  <div className="task-icon">
                    {mission.icon || '◆'}
                  </div>
                  <div>
                    <b>{mission.title}</b>
                    {mission.featured && (
                      <span className="mission-featured">
                        FEATURED
                      </span>
                    )}
                  </div>
                </div>

                {mission.description && (
                  <p>{mission.description}</p>
                )}

                <div className="mission-progress-row">
                  <span>Progress</span>
                  <b>{done}/{total}</b>
                </div>

                <div className="mission-progress-track">
                  <i
                    style={{
                      width: `${progress}%`
                    }}
                  />
                </div>

                <div className="mission-bottom">
                  <span>
                    Completion Bonus
                    <b>
                      +{Number(
                        mission.completion_bonus || 0
                      ).toLocaleString()} MAI
                    </b>
                  </span>

                  <button
                    className="gold-btn"
                    disabled={
                      claimed ||
                      !ready ||
                      busy === `mission-${mission.id}`
                    }
                    onClick={() => claimMission(mission)}
                  >
                    {claimed
                      ? 'COMPLETED ✓'
                      : busy === `mission-${mission.id}`
                        ? 'CLAIMING…'
                        : ready
                          ? 'CLAIM BONUS'
                          : 'IN PROGRESS'}
                  </button>
                </div>
              </article>
            );
          })}

          {!managedLoading && !missions.length && (
            <div className="task-empty-card">
              No active missions right now.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
