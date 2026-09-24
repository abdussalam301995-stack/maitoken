import React, { useEffect, useState } from 'react';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { Address, beginCell, toNano } from '@ton/core';
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



/* =========================================================
   PREMIUM TASK ICONS
   Restores the original MAI premium line-icon language without
   changing any task/reward/backend behavior.
   ========================================================= */
function PremiumTaskIcon({ name }) {
  const icons = {
    ad: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M10 9l5 3-5 3V9z" />
        <path d="M8 2h8" />
      </>
    ),
    news: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8M8 13h8M8 17h5" />
      </>
    ),
    wallet: (
      <>
        <rect x="3.5" y="6" width="17" height="13" rx="3" />
        <path d="M4.5 8.5h12" />
        <path d="M15 11.5h5.5v4H15a2 2 0 0 1 0-4Z" />
        <circle cx="16.5" cy="13.5" r=".7" fill="currentColor" stroke="none" />
      </>
    ),
    people: (
      <>
        <circle cx="9" cy="8.5" r="2.8" />
        <circle cx="16.5" cy="9.5" r="2.2" />
        <path d="M3.8 19c.4-3.3 2.3-5.1 5.2-5.1s4.8 1.8 5.2 5.1M14.5 14.5c3-.3 5 1.3 5.5 4" />
      </>
    ),
    link: (
      <>
        <path d="m9.5 14.5-1.7 1.7a3.2 3.2 0 0 1-4.5-4.5l3.3-3.3a3.2 3.2 0 0 1 4.5 0" />
        <path d="m14.5 9.5 1.7-1.7a3.2 3.2 0 0 1 4.5 4.5l-3.3 3.3a3.2 3.2 0 0 1-4.5 0" />
        <path d="m8.8 15.2 6.4-6.4" />
      </>
    )
  };

  const icon = icons[name] || icons.link;

  return (
    <span className="premium-task-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        {icon}
      </svg>
    </span>
  );
}

function dailyTaskIconName(task) {
  const key = String(task?.key || '').toLowerCase();
  const title = String(task?.title || '').toLowerCase();

  if (key === 'news' || title.includes('news')) return 'news';
  if (key === 'payout' || title.includes('pay out') || title.includes('payout')) return 'wallet';
  if (key === 'chat' || title.includes('chat') || title.includes('group')) return 'people';
  return 'link';
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  }
  return btoa(binary);
}

function smartNumber(value, max = 4) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return '0';
  return n.toLocaleString(undefined, { maximumFractionDigits: max });
}

function telegramChatIdFromUrl(url) {
  try {
    const parsed = new URL(String(url || '').trim());
    if (!['t.me', 'www.t.me', 'telegram.me', 'www.telegram.me'].includes(parsed.hostname.toLowerCase())) {
      return null;
    }
    const first = parsed.pathname.split('/').filter(Boolean)[0] || '';
    if (!first || first.startsWith('+') || first === 'joinchat') return null;
    return `@${first.replace(/^@/, '')}`;
  } catch {
    return null;
  }
}

const tiers = [
  { completions: 100 },
  { completions: 500 },
  { completions: 1000 },
  { completions: 2000 },
  { completions: 5000 },
  { completions: 10000 }
];

export default function Tasks({ initData, onUserUpdate }) {
  const walletAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
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
  const [campaignTitle, setCampaignTitle] = useState('');
  const [campaignDescription, setCampaignDescription] = useState('');
  const [quotes, setQuotes] = useState({});
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [approvedCampaigns, setApprovedCampaigns] = useState([]);
  const [campaignTimers, setCampaignTimers] = useState({});
  const [campaignNow, setCampaignNow] = useState(Date.now());
  const [managedTasks, setManagedTasks] = useState([]);
  const [missions, setMissions] = useState([]);
  const [managedLoading, setManagedLoading] = useState(false);
  const [managedNow, setManagedNow] = useState(Date.now());

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

  const loadAdsgramSdk = () =>
    new Promise((resolve, reject) => {
      if (window.Adsgram?.init) {
        resolve(window.Adsgram);
        return;
      }

      const existing = document.querySelector('script[data-mai-adsgram-sdk="1"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Adsgram), { once: true });
        existing.addEventListener('error', () => reject(new Error('AdsGram SDK failed to load.')), { once: true });
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://sad.adsgram.ai/js/sad.min.js';
      script.async = true;
      script.dataset.maiAdsgramSdk = '1';
      script.onload = () => resolve(window.Adsgram);
      script.onerror = () => reject(new Error('AdsGram SDK failed to load.'));
      document.head.appendChild(script);
    });

  const startAd = async () => {
    if (busy === 'ad') return;
    setMessage('');
    setBusy('ad');

    try {
      const data = await api('/api/ads/start', { method: 'POST', initData });
      const sessionId = String(data.sessionId || '');

      if (!sessionId) throw new Error('Ad session was not created.');

      if (data.provider === 'adsgram') {
        const Adsgram = await loadAdsgramSdk();
        if (!Adsgram?.init) throw new Error('AdsGram is unavailable.');

        const controller = Adsgram.init({
          blockId: String(data.blockId || '49496'),
          debug: Boolean(data.debug),
          debugConsole: false,
          debugBannerType: 'FullscreenMedia'
        });

        // AdsGram resolves show() only after the rewarded ad is completed.
        await controller.show();

        // This completion endpoint is restricted by the backend to the
        // adsgram_test provider mode. The existing claim endpoint remains
        // authoritative and idempotent for the actual MAI credit.
        await api(`/api/ads/adsgram-complete/${sessionId}`, {
          method: 'POST',
          initData
        });

        const claimed = await api(`/api/ads/claim/${sessionId}`, {
          method: 'POST',
          initData
        });

        onUserUpdate?.(claimed.user);
        setAdCount(c => c + 1);
        setMessage(`+${Number(claimed.reward || 0).toFixed(4)} MAI received.`);
        await loadTasks();
        return;
      }

      // Preserve the existing URL-provider flow for non-AdsGram providers.
      setAdSession(sessionId);
      setAdUrl(String(data.url || ''));
      setAdSeconds(10);
      setAdOpened(false);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy('');
    }
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

  const getQuote = async completions => {
    const key = Number(completions);
    if (quotes[key]) return quotes[key];

    const data = await api('/api/campaigns/quote', {
      method: 'POST',
      initData,
      body: { targetCount: key }
    });

    const quote = {
      targetCount: Number(data.targetCount || key),
      MAI: Number(data.MAI || 0),
      GRAM: Number(data.GRAM || 0),
      receiverWallet: data.receiverWallet || null
    };

    setQuotes(old => ({ ...old, [key]: quote }));
    return quote;
  };

  useEffect(() => {
    let cancelled = false;

    const loadQuotes = async () => {
      setQuoteLoading(true);
      try {
        const rows = await Promise.all(
          tiers.map(async tier => {
            const data = await api('/api/campaigns/quote', {
              method: 'POST',
              initData,
              body: { targetCount: tier.completions }
            });
            return [
              tier.completions,
              {
                targetCount: Number(data.targetCount || tier.completions),
                MAI: Number(data.MAI || 0),
                GRAM: Number(data.GRAM || 0),
                receiverWallet: data.receiverWallet || null
              }
            ];
          })
        );

        if (!cancelled) setQuotes(Object.fromEntries(rows));
      } catch (e) {
        if (!cancelled) setMessage(e.message);
      } finally {
        if (!cancelled) setQuoteLoading(false);
      }
    };

    if (tab === 'Promote') loadQuotes();
    return () => { cancelled = true; };
  }, [tab, initData]);

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  const submitCampaign = async () => {
    if (selectedTier === null) return setMessage('Select a completion tier.');

    const title = campaignTitle.trim();
    const description = campaignDescription.trim();
    const cleanUrl = targetUrl.trim();
    const selected = tiers[selectedTier];

    if (title.length < 2) return setMessage('Enter a campaign title.');
    if (!description) return setMessage('Enter a campaign description.');
    if (!/^https?:\/\//i.test(cleanUrl)) return setMessage('Enter a valid https:// target URL.');

    let chatId = null;
    let verificationType = 'manual';

    if (category === 'Channel' || category === 'Group') {
      chatId = telegramChatIdFromUrl(cleanUrl);
      if (!chatId) {
        return setMessage('For Channel / Group promotion, use a public https://t.me/username link so MAI can verify real membership.');
      }
      verificationType = 'telegram_member';
    }

    if (!walletAddress) {
      setMessage(`Connect your TON wallet before paying with ${payMethod}.`);
      try { await tonConnectUI.openModal(); } catch {}
      return;
    }

    setBusy('campaign');
    setMessage('');

    try {
      const quote = await getQuote(selected.completions);

      if (payMethod === 'MAI' && Number(quote.MAI || 0) <= 0) {
        throw new Error('MAI campaign price is unavailable.');
      }
      if (payMethod === 'GRAM' && Number(quote.GRAM || 0) <= 0) {
        throw new Error('GRAM campaign price is unavailable.');
      }

      const data = await api('/api/campaigns', {
        method: 'POST',
        initData,
        body: {
          type: category,
          title,
          targetUrl: cleanUrl,
          description,
          targetCount: selected.completions,
          paymentMethod: payMethod,
          verificationType,
          chatId,
          rewardPerUser: 12
        }
      });

      if (payMethod === 'MAI') {
        const receiverWallet = String(data?.payment?.receiverWallet || '').trim();
        const payerJettonWallet = String(data?.payment?.payerJettonWallet || '').trim();
        const amountAtomic = String(data?.payment?.amountAtomic || '').trim();

        if (!receiverWallet || !payerJettonWallet || !/^\d+$/.test(amountAtomic)) {
          throw new Error('Secure MAI wallet payment information is unavailable.');
        }

        const canonicalReceiver = Address.parse(receiverWallet).toString();
        const canonicalJettonWallet = Address.parse(payerJettonWallet).toString();
        const canonicalSender = Address.parse(walletAddress).toString();

        const transferBody = beginCell()
          .storeUint(0x0f8a7ea5, 32)
          .storeUint(BigInt(data.campaign.id), 64)
          .storeCoins(BigInt(amountAtomic))
          .storeAddress(Address.parse(canonicalReceiver))
          .storeAddress(Address.parse(canonicalSender))
          .storeBit(0)
          .storeCoins(1n)
          .storeBit(0)
          .endCell();

        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          network: '-239',
          messages: [{
            address: canonicalJettonWallet,
            amount: toNano('0.08').toString(),
            payload: bytesToBase64(transferBody.toBoc())
          }]
        });
      } else {
        const receiverWallet = String(data?.payment?.receiverWallet || '').trim();
        const amountNano = String(data?.payment?.amountNano || '').trim();

        if (!receiverWallet || !/^\d+$/.test(amountNano)) {
          throw new Error('Secure GRAM wallet payment information is unavailable.');
        }

        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          network: '-239',
          messages: [{ address: receiverWallet, amount: amountNano }]
        });
      }

      setMessage(`${payMethod} payment sent. Waiting for blockchain confirmation…`);

      let verified = false;
      let lastError = null;

      for (let attempt = 0; attempt < 12; attempt += 1) {
        if (attempt > 0) await wait(3000);
        try {
          const verification = await api(
            `/api/campaigns/${data.campaign.id}/verify-payment`,
            { method: 'POST', initData }
          );
          if (verification?.verified) {
            verified = true;
            break;
          }
        } catch (e) {
          lastError = e;
        }
      }

      if (!verified) {
        throw new Error(
          lastError?.message ||
          'Payment was sent but is not finalized yet. Please try again shortly.'
        );
      }

      setMessage(`Payment verified. Campaign #${data.campaign.id} is waiting for admin approval.`);
      setCampaignTitle('');
      setCampaignDescription('');
      setTargetUrl('');
      setSelectedTier(null);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy('');
    }
  };

  const loadApprovedCampaigns = async () => {
    try {
      const data = await api('/api/campaigns/exclusive', { initData });
      setApprovedCampaigns(data.items || []);
    } catch (e) {
      setMessage(e.message);
    }
  };

  const openCampaign = async campaign => {
    if (busy || campaign.completed_by_user) return;
    setBusy(`campaign-open-${campaign.id}`);
    setMessage('');

    try {
      const data = await api(`/api/campaigns/${campaign.id}/open`, {
        method: 'POST',
        initData
      });

      const waitSeconds = Math.max(1, Number(data.waitSeconds || 8));
      setCampaignTimers(old => ({
        ...old,
        [campaign.id]: Date.now() + waitSeconds * 1000
      }));

      const url = data.targetUrl || campaign.target_url;
      const webApp = window.Telegram?.WebApp;
      if ((campaign.type === 'Channel' || campaign.type === 'Group') && webApp?.openTelegramLink) {
        webApp.openTelegramLink(url);
      } else if (webApp?.openLink) {
        webApp.openLink(url);
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }

      setMessage(`Complete the task, then return after ${waitSeconds} seconds to claim 12 MAI.`);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy('');
    }
  };

  const claimCampaign = async campaign => {
    if (busy || campaign.completed_by_user) return;

    const readyAt = Number(campaignTimers[campaign.id] || 0);
    if (!readyAt || Date.now() < readyAt) {
      return setMessage('Open the task first and wait until the claim timer finishes.');
    }

    setBusy(`campaign-claim-${campaign.id}`);
    setMessage('');

    try {
      const data = await api(`/api/campaigns/${campaign.id}/complete`, {
        method: 'POST',
        initData
      });

      if (data.user) onUserUpdate?.(data.user);
      setMessage(`+${Number(data.reward || 12).toFixed(4)} MAI received.`);

      setCampaignTimers(old => {
        const next = { ...old };
        delete next[campaign.id];
        return next;
      });

      await loadApprovedCampaigns();
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy('');
    }
  };

  useEffect(() => {
    if (tab !== 'Tasks') return;
    loadApprovedCampaigns();
  }, [tab]);

  useEffect(() => {
    if (!Object.keys(campaignTimers).length) return;
    const id = setInterval(() => setCampaignNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [campaignTimers]);

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

  useEffect(() => {
    if (tab !== 'Tasks' || !managedTasks.some(task => task.gateReadyAt && !task.gateReady && task.user_state !== 'claimed')) return;
    const id = setInterval(() => setManagedNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [tab, managedTasks]);

  const openManagedTaskLink = task => {
    if (!task.target_url) return;
    const webApp = window.Telegram?.WebApp;
    if (task.task_type === 'telegram_join' && webApp?.openTelegramLink) {
      webApp.openTelegramLink(task.target_url);
    } else if (webApp?.openLink) {
      webApp.openLink(task.target_url);
    } else {
      window.open(task.target_url, '_blank', 'noopener,noreferrer');
    }
  };

  const managedTaskAction = async task => {
    if (busy) return;
    const state = String(task.user_state || 'go').toLowerCase();
    if (state === 'claimed') return;

    setBusy(`managed-${task.id}`);
    setMessage('');

    try {
      const gated = ['telegram_join', 'telegram_bot'].includes(String(task.task_type));

      // First tap is JOIN/GO only: record the start on the server before opening
      // Telegram. Verification is deliberately a separate action after 10s.
      if (state !== 'claim' && gated && !task.gateStarted) {
        const data = await api(`/api/managed-tasks/${task.id}/start`, { method: 'POST', initData });
        openManagedTaskLink(task);
        setMessage(data.message || 'Task opened. Wait 10 seconds, then verify.');
        await loadManagedTasks();
        return;
      }

      if (state !== 'claim' && !gated && task.target_url) {
        openManagedTaskLink(task);
      }

      const endpoint = state === 'claim'
        ? `/api/managed-tasks/${task.id}/claim`
        : `/api/managed-tasks/${task.id}/verify`;

      const data = await api(endpoint, { method: 'POST', initData });
      if (data.user) onUserUpdate?.(data.user);
      setMessage(data.message || (state === 'claim'
        ? `+${Number(data.reward || task.reward || 0).toFixed(4)} MAI received.`
        : 'Task verified. Claim your reward.'));
      await loadManagedTasks();
    } catch (e) {
      setMessage(e.message);
      await loadManagedTasks();
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
            <div className="task-icon ad-icon"><PremiumTaskIcon name="ad" /></div>
            <div className="task-info"><b>Sponsored Ad</b><span>10s engagement · Daily {adCount}/20</span></div>
            <button className="task-btn" onClick={startAd} disabled={!!adSession || busy === 'ad'}>{busy === 'ad' ? 'LOADING…' : adSession ? `${adSeconds}s` : 'WATCH'}</button>
          </div>

          <div className="task-label">SOCIAL TASKS</div>
          {tasks.map(task => (
            <div className="task-card" key={task.key}>
              <div className="task-icon"><PremiumTaskIcon name={dailyTaskIconName(task)} /></div>
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
          <div className="task-hero">
            <span>MARKETING MARKETPLACE</span>
            <h2>Promote</h2>
            <p>Pay securely from your connected wallet. Paid campaigns wait for admin approval.</p>
          </div>

          <div className="toggle-row promote-pay-toggle">
            <button className={payMethod === 'MAI' ? 'active' : ''} onClick={() => setPayMethod('MAI')}>💎 PAY MAI</button>
            <button className={payMethod === 'GRAM' ? 'active' : ''} onClick={() => setPayMethod('GRAM')}>💎 PAY GRAM</button>
          </div>

          <div className="field-label">CATEGORY</div>
          <div className="toggle-row">
            <button className={category === 'Channel' ? 'active' : ''} onClick={() => setCategory('Channel')}>CHANNEL / GROUP</button>
            <button className={category === 'Bot' ? 'active' : ''} onClick={() => setCategory('Bot')}>WEBSITE / BOT</button>
          </div>

          <div className="field-label">CAMPAIGN TITLE</div>
          <input
            className="task-input"
            value={campaignTitle}
            maxLength={120}
            onChange={e => setCampaignTitle(e.target.value)}
            placeholder="Example: Join MAI Partner Channel"
          />

          <div className="field-label">DESCRIPTION</div>
          <textarea
            className="task-input task-textarea"
            value={campaignDescription}
            maxLength={700}
            onChange={e => setCampaignDescription(e.target.value)}
            placeholder="Tell MAI users why they should complete this task..."
          />

          <div className="field-label">TARGET URL</div>
          <input
            className="task-input"
            value={targetUrl}
            onChange={e => setTargetUrl(e.target.value)}
            placeholder={category === 'Channel' ? 'https://t.me/yourchannel' : 'https://example.com'}
          />

          <div className="field-label">COMPLETIONS</div>
          <div className="tier-grid">
            {tiers.map((t, i) => {
              const q = quotes[t.completions];
              const price = payMethod === 'MAI'
                ? `${smartNumber(q?.MAI, 4)} MAI`
                : `${smartNumber(q?.GRAM, 6)} GRAM`;

              return (
                <button
                  key={t.completions}
                  className={`tier ${selectedTier === i ? 'active' : ''}`}
                  onClick={() => setSelectedTier(i)}
                  disabled={quoteLoading}
                >
                  <b>{t.completions.toLocaleString()}</b>
                  <span>{quoteLoading && !q ? 'Loading…' : price}</span>
                </button>
              );
            })}
          </div>

          {selectedTier !== null && (
            <>
              <div className="promote-summary">
                <span>Selected package</span>
                <b>
                  {tiers[selectedTier].completions.toLocaleString()} completions ·{' '}
                  {payMethod === 'MAI'
                    ? `${smartNumber(quotes[tiers[selectedTier].completions]?.MAI, 4)} MAI`
                    : `${smartNumber(quotes[tiers[selectedTier].completions]?.GRAM, 6)} GRAM`}
                </b>
              </div>
              <div className="burn-row">
                <span>50% USER</span>
                <b>50% BURN</b>
              </div>
              <div className="promote-reward-note">
                User reward: <b>12 MAI</b> per successful completion
              </div>
            </>
          )}

          <button
            className="gold-btn full"
            disabled={
              busy === 'campaign' ||
              selectedTier === null ||
              !campaignTitle.trim() ||
              !campaignDescription.trim() ||
              !targetUrl.trim()
            }
            onClick={submitCampaign}
          >
            {busy === 'campaign' ? 'PROCESSING PAYMENT…' : `PAY & SUBMIT WITH ${payMethod}`}
          </button>

          <small className="disclaimer">
            Payment is sent from your connected TON wallet to the MAI promotion receiver wallet.
            After blockchain verification, the campaign waits for admin approval.
          </small>
        </div>
      )}

      {tab === 'Tasks' && (
        <div className="managed-task-area">
          <div className="task-hero">
            <span>MAI TASK CENTER</span>
            <h2>Tasks</h2>
            <p>Complete verified tasks and claim server-controlled rewards.</p>
          </div>

          {approvedCampaigns.map(campaign => {
            const readyAt = Number(campaignTimers[campaign.id] || 0);
            const remaining = readyAt
              ? Math.max(0, Math.ceil((readyAt - campaignNow) / 1000))
              : 0;
            const completed = Boolean(campaign.completed_by_user);
            const opened = Boolean(readyAt);
            const canClaim = opened && remaining <= 0 && !completed;
            const campaignBusy =
              busy === `campaign-open-${campaign.id}` ||
              busy === `campaign-claim-${campaign.id}`;

            return (
              <div className="task-card promoted-task-card" key={`campaign-${campaign.id}`}>
                <div className="task-icon premium-campaign-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 12.5V7.8c0-.9.7-1.6 1.6-1.6h7.2l5-2.2v16l-5-2.2H5.6c-.9 0-1.6-.7-1.6-1.6v-3.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                    <path d="M8 18v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </div>

                <div className="task-info">
                  <b>{campaign.title}</b>
                  <span>Reward +{Number(campaign.reward_per_user || 12).toLocaleString()} MAI</span>
                  {campaign.description && <small>{campaign.description}</small>}
                  <small className="campaign-progress">
                    {Number(campaign.completed_count || 0).toLocaleString()} / {Number(campaign.target_count || 0).toLocaleString()} completed
                  </small>
                </div>

                <button
                  className={`task-btn ${completed ? 'done' : ''}`}
                  disabled={completed || campaignBusy}
                  onClick={() => canClaim ? claimCampaign(campaign) : openCampaign(campaign)}
                >
                  {completed
                    ? 'CLAIMED ✓'
                    : campaignBusy
                      ? 'WORKING…'
                      : opened && remaining > 0
                        ? `${remaining}s`
                        : canClaim
                          ? 'CLAIM'
                          : 'JOIN'}
                </button>
              </div>
            );
          })}
          {managedLoading && (
            <div className="task-empty-card">
              Loading tasks...
            </div>
          )}

          {!managedLoading && managedTasks.map(task => {
            const state =
              String(task.user_state || 'go').toLowerCase();

            const gated = ['telegram_join', 'telegram_bot'].includes(String(task.task_type));
            const gateRemaining = task.gateReadyAt
              ? Math.max(0, Math.ceil((new Date(task.gateReadyAt).getTime() - managedNow) / 1000))
              : Number(task.gateRemainingSeconds || 0);
            const waiting = gated && task.gateStarted && state !== 'claim' && gateRemaining > 0;
            const label =
              state === 'claimed'
                ? 'COMPLETED ✓'
                : state === 'claim'
                  ? 'CLAIM'
                  : busy === `managed-${task.id}`
                    ? 'WORKING…'
                    : waiting
                      ? `${gateRemaining}s`
                      : gated && task.gateStarted
                        ? 'VERIFY'
                        : task.task_type === 'telegram_join'
                          ? 'JOIN'
                          : task.task_type === 'telegram_bot'
                            ? 'GO'
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
                    waiting ||
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
