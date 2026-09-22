    import React, { useCallback, useEffect, useMemo, useState } from 'react';

    const API =
      process.env.REACT_APP_API_URL ||
      'http://localhost:5000';

    function tg() {
      return window?.Telegram?.WebApp || null;
    }

    function deviceId() {
      const key = 'mai_device_id';
      let value = localStorage.getItem(key);

      if (!value) {
        value =
          (window.crypto?.randomUUID?.() ||
            `mai-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        localStorage.setItem(key, value);
      }

      return value;
    }

    async function adminApi(path, options = {}) {
      const web = tg();

      const headers = {
        'Content-Type': 'application/json',
        'X-MAI-Device-ID': deviceId(),
        ...(options.headers || {})
      };

      if (web?.initData) {
        headers['X-Telegram-Init-Data'] = web.initData;
      } else if (process.env.REACT_APP_DEV_USER_ID) {
        headers['X-Dev-User'] = process.env.REACT_APP_DEV_USER_ID;
      }

      const response = await fetch(`${API}${path}`, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || `HTTP ${response.status}`);
      }

      return data;
    }

    const NAV = [
      ['dashboard', '⌂', 'Dashboard'],
      ['users', '👥', 'Users'],
      ['multi', '◎', 'Multi-Account'],
      ['security', '🛡', 'Security'],
      ['withdrawals', '↗', 'Withdrawals'],
      ['fraud', '⚠', 'Fraud Check'],
      ['payments', '◈', 'Payments'],
      ['promotions', '🚀', 'Promotions'],
      ['audit', '☷', 'Audit Logs'],
      ['settings', '⚙', 'System Settings']
    ];

    const MODULE_NAV = [
      ['tasks', '✓', 'Tasks & Missions'],
      ['giveaway', '🎁', 'Giveaway'],
      ['broadcast', '📣', 'Broadcast Message'],
      ['invites', '👥', 'Active Invites'],
      ['launch', '🚀', 'Launch Control']
    ];

    const fmt = value =>
      new Intl.NumberFormat('en-US', {
        maximumFractionDigits: 2
      }).format(Number(value || 0));

    const short = (value, left = 7, right = 5) => {
      const text = String(value || '');
      if (!text) return '—';
      if (text.length <= left + right + 3) return text;
      return `${text.slice(0, left)}…${text.slice(-right)}`;
    };

    const when = value => {
      if (!value) return '—';
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? String(value)
        : date.toLocaleString();
    };

    const tone = value => {
      const s = String(value || '').toLowerCase();
      if (['active', 'approved', 'paid', 'completed'].includes(s)) return 'good';
      if (['pending', 'processing', 'suspended', 'security_check'].includes(s)) return 'warn';
      if (['banned', 'rejected', 'failed'].includes(s)) return 'bad';
      return 'neutral';
    };

    function Status({ children }) {
      return (
        <span className={`adminStatus ${tone(children)}`}>
          {String(children || 'unknown').replaceAll('_', ' ')}
        </span>
      );
    }

    function Empty({ text = 'No records found.' }) {
      return <div className="adminEmpty">{text}</div>;
    }

    function Loader() {
      return (
        <div className="adminLoading">
          <i />
          <span>Loading secure admin data…</span>
        </div>
      );
    }

    function AdminPanel({ back }) {
      const [tab, setTab] = useState('dashboard');
      const [dashboard, setDashboard] = useState(null);
      const [users, setUsers] = useState([]);
      const [withdrawals, setWithdrawals] = useState([]);
      const [campaigns, setCampaigns] = useState([]);
      const [audit, setAudit] = useState([]);
      const [securityConfig, setSecurityConfig] = useState(null);
      const [selectedUser, setSelectedUser] = useState(null);
      const [userDetail, setUserDetail] = useState(null);
      const [search, setSearch] = useState('');
      const [busy, setBusy] = useState('');
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState('');
      const [notice, setNotice] = useState('');
      const [menuOpen, setMenuOpen] = useState(false);

      // MAI V5 server modules
      const [managedTasks, setManagedTasks] = useState([]);
      const [managedMissions, setManagedMissions] = useState([]);
      const [giveaways, setGiveaways] = useState([]);
      const [giveawayWinners, setGiveawayWinners] = useState([]);
      const [broadcasts, setBroadcasts] = useState([]);
      const [referralAdmin, setReferralAdmin] = useState(null);
      const [launchControl, setLaunchControl] = useState(null);
      const [moduleStatus, setModuleStatus] = useState(null);
      const [taskMode, setTaskMode] = useState('tasks');
      const [taskComposerOpen, setTaskComposerOpen] = useState(false);
      const [missionComposerOpen, setMissionComposerOpen] = useState(false);
      const [missionForm, setMissionForm] = useState({title:'',description:'',completionBonus:'0',taskIds:[],featured:false,startsAt:'',endsAt:''});
      const [taskForm, setTaskForm] = useState({
        title:'', targetUrl:'', reward:'', taskType:'telegram_join', telegramChatId:'',
        description:'', limitMode:'all', customLimit:'', refreshMode:'once', customHours:'',
        inviteCount:'1', holdingAmount:'0', miningClaims:'1', botVerification:'external_gate', botEventType:''
      });
      const [giveawayMode, setGiveawayMode] = useState('create');
      const [giveawayPreview, setGiveawayPreview] = useState(false);
      const [giveawayForm, setGiveawayForm] = useState({
        title:'', description:'', imageUrl:'', giveawayType:'lucky_draw',
        prizePool:'', winnerCount:'1', prizePerWinner:'', startsAt:'', endsAt:'',
        taskKeys:'', successfulInvites:'1', minimumMai:'0',
        socialTaskIds:'', quizQuestion:'', quizOptions:'', quizCorrectOption:'0',
        leaderboardMetric:'balance', leaderboardTop:'100', purchaseCurrency:'MAI', minimumPurchase:'0',
        customPrompt:'', customAnswer:'',
        showOnHome:true, featured:true, allowMultipleEntries:false
      });
      const [broadcastMode, setBroadcastMode] = useState('create');

      const loadAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');

        const requests = [
          ['dashboard', adminApi('/admin/dashboard')],
          ['users', adminApi('/admin/users')],
          ['withdrawals', adminApi('/admin/withdrawals')],
          ['campaigns', adminApi('/admin/campaigns')],
          ['audit', adminApi('/admin/audit-logs?limit=150')],
          ['security', adminApi('/admin/security/config')],
          ['managedTasks', adminApi('/admin/tasks')],
          ['managedMissions', adminApi('/admin/missions')],
          ['giveaways', adminApi('/admin/giveaways')],
          ['giveawayWinners', adminApi('/admin/giveaway-winners')],
          ['broadcasts', adminApi('/admin/broadcasts')],
          ['referrals', adminApi('/admin/referrals')],
          ['launch', adminApi('/admin/launch-control')],
          ['moduleStatus', adminApi('/admin/modules/status')]
        ];

        try {
          const results = await Promise.allSettled(requests.map(([,promise]) => promise));
          const failed = [];
          results.forEach((result,index) => {
            const key = requests[index][0];
            if (result.status === 'rejected') { failed.push(`${key}: ${result.reason?.message || 'failed'}`); return; }
            const data = result.value || {};
            if (key === 'dashboard') setDashboard(data.dashboard || {});
            if (key === 'users') setUsers(data.items || []);
            if (key === 'withdrawals') setWithdrawals(data.items || []);
            if (key === 'campaigns') setCampaigns(data.items || []);
            if (key === 'audit') setAudit(data.items || []);
            if (key === 'security') setSecurityConfig(data.config || {});
            if (key === 'managedTasks') setManagedTasks(data.items || []);
            if (key === 'managedMissions') setManagedMissions(data.items || []);
            if (key === 'giveaways') setGiveaways(data.items || []);
            if (key === 'giveawayWinners') setGiveawayWinners(data.items || []);
            if (key === 'broadcasts') setBroadcasts(data.items || []);
            if (key === 'referrals') setReferralAdmin(data || null);
            if (key === 'launch') setLaunchControl(data || null);
            if (key === 'moduleStatus') setModuleStatus(data || null);
          });
          if (failed.length) setError(`Some admin data could not be loaded — ${failed.join(' | ')}`);
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        loadAll();
      }, [loadAll]);

      // Admin Command Center should use the largest Telegram viewport available.
      // expand() is widely supported. requestFullscreen() is used only when the
      // current Telegram client exposes it; failures are intentionally ignored.
      useEffect(() => {
        const web = tg();

        try {
          web?.ready?.();
          web?.expand?.();

          if (typeof web?.requestFullscreen === 'function') {
            web.requestFullscreen();
          }
        } catch (e) {
          // Older Telegram clients may not support fullscreen.
        }

        const previousHtmlOverflow = document.documentElement.style.overflow;
        const previousBodyOverflow = document.body.style.overflow;
        const previousBodyOverscroll = document.body.style.overscrollBehavior;

        document.documentElement.classList.add('maiAdminOpen');
        document.body.classList.add('maiAdminOpen');
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.overscrollBehavior = 'none';

        return () => {
          document.documentElement.classList.remove('maiAdminOpen');
          document.body.classList.remove('maiAdminOpen');
          document.documentElement.style.overflow = previousHtmlOverflow;
          document.body.style.overflow = previousBodyOverflow;
          document.body.style.overscrollBehavior = previousBodyOverscroll;
        };
      }, []);

      const flash = message => {
        setNotice(message);
        window.setTimeout(() => setNotice(''), 2600);
      };

      const runAction = async (key, path, body) => {
        setBusy(key);
        setError('');

        try {
          await adminApi(path, {
            method: 'POST',
            body: body === undefined ? undefined : JSON.stringify(body)
          });
          flash('Action completed.');
          await loadAll(true);

          if (selectedUser) {
            const detail = await adminApi(`/admin/users/${selectedUser}`);
            setUserDetail(detail);
          }
        } catch (e) {
          setError(e.message || 'Action failed.');
        } finally {
          setBusy('');
        }
      };

      const openUser = async telegramId => {
        setSelectedUser(String(telegramId));
        setUserDetail(null);
        setBusy(`user-${telegramId}`);

        try {
          setUserDetail(await adminApi(`/admin/users/${telegramId}`));
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy('');
        }
      };

      const askReason = label => {
        const reason = window.prompt(`${label}\n\nReason is required:`, '');
        return String(reason || '').trim();
      };

      const banUser = user => {
        const reason = askReason(`Ban ${user.first_name || user.telegram_id}?`);
        if (!reason) return;
        runAction(
          `ban-${user.telegram_id}`,
          `/admin/users/${user.telegram_id}/ban`,
          { reason }
        );
      };

      const suspendUser = user => {
        const reason = askReason(`Suspend ${user.first_name || user.telegram_id}?`);
        if (!reason) return;

        const hoursRaw = window.prompt('Suspend for how many hours?', '24');
        const hours = Number(hoursRaw);
        if (!Number.isFinite(hours) || hours <= 0) return;

        runAction(
          `suspend-${user.telegram_id}`,
          `/admin/users/${user.telegram_id}/suspend`,
          {
            reason,
            until: new Date(Date.now() + hours * 3600000).toISOString()
          }
        );
      };

      const restoreUser = user => {
        const reason = askReason(`Restore access for ${user.first_name || user.telegram_id}?`);
        if (!reason) return;

        runAction(
          `restore-${user.telegram_id}`,
          `/admin/users/${user.telegram_id}/unban`,
          { reason }
        );
      };

      const messageUser = user => {
        const message = String(window.prompt(`Send Telegram message to ${user.first_name || user.telegram_id}:`, '') || '').trim();
        if (!message) return;
        runAction(`message-${user.telegram_id}`, `/admin/users/${user.telegram_id}/message`, { message });
      };

      const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;

        return users.filter(user =>
          [
            user.telegram_id,
            user.username,
            user.first_name,
            user.wallet_address,
            user.account_status
          ]
            .map(v => String(v || '').toLowerCase())
            .some(v => v.includes(q))
        );
      }, [users, search]);

      const paidCampaigns = campaigns.filter(
        item => String(item.payment_status).toLowerCase() === 'paid'
      );

      const paymentRows = useMemo(() => {
        const promotionPayments = campaigns.map(item => ({
          key: `campaign-${item.id}`,
          kind: 'Promotion',
          id: item.id,
          user: item.owner_id,
          method: item.payment_method,
          amount: item.payment_amount,
          status: item.payment_status,
          tx: item.payment_tx_hash,
          created: item.created_at
        }));

        const withdrawalPayments = withdrawals.map(item => ({
          key: `withdrawal-${item.id}`,
          kind: 'Withdrawal',
          id: item.id,
          user: item.telegram_id,
          method: 'MAI',
          amount: item.amount,
          status: item.status,
          tx: item.tx_hash,
          created: item.created_at
        }));

        return [...promotionPayments, ...withdrawalPayments]
          .sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
      }, [campaigns, withdrawals]);

      const navCount = key => {
        if (key === 'users') return users.length;
        if (key === 'multi') return users.filter(u => Number(u.linked_device_accounts || 0) > 1).length;
        if (key === 'fraud') return withdrawals.filter(w => Array.isArray(w.risk_flags) && w.risk_flags.length).length;
        if (key === 'security') return Number(dashboard?.security_warnings_24h || 0);
        if (key === 'promotions') return Number(dashboard?.pending_campaigns || 0);
        if (key === 'withdrawals') return Number(dashboard?.pending_withdrawals || 0);
        return 0;
      };

      const renderDashboard = () => {
        const growth = Array.isArray(dashboard?.user_growth_30d)
          ? dashboard.user_growth_30d
          : [];
        const maxGrowth = Math.max(1, ...growth.map(item => Number(item.total || 0)));
        const chartPoints = growth.length > 1
          ? growth.map((item, index) => {
              const x = (index / (growth.length - 1)) * 100;
              const y = 94 - ((Number(item.total || 0) / maxGrowth) * 82);
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            }).join(' ')
          : '';

        const activeUsers = Math.max(
          0,
          Number(dashboard?.total_users || 0) -
          Number(dashboard?.banned_users || 0) -
          Number(dashboard?.suspended_users || 0)
        );

        const primaryCards = [
          ['Total Users', dashboard?.total_users, 'All registered accounts', '👥'],
          ['Active Users', activeUsers, 'Accounts currently active', '●'],
          ['Suspended Users', dashboard?.suspended_users, 'Temporary restrictions', '⏱'],
          ['Total Withdrawals', dashboard?.total_withdrawals, 'All withdrawal requests', '↗'],
          ['MAI Distributed', dashboard?.mai_distributed, 'Completed withdrawals', '◈']
        ];

        const secondaryCards = [
          ['New Users (24h)', dashboard?.new_users_24h, 'Joined in last 24 hours'],
          ['Withdrawal Requests', dashboard?.pending_withdrawals, 'Pending admin review'],
          ['Security Flags', dashboard?.security_warnings_24h, 'Warnings in last 24 hours'],
          ['Multi-Account Groups', dashboard?.shared_devices, 'Shared-device review signals']
        ];

        const recentUsers = users.slice(0, 6);
        const recentWithdrawals = [...withdrawals]
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
          .slice(0, 6);
        const securityAlerts = audit
          .filter(item => /security|ban|suspend|withdraw/i.test(String(item.action || '')))
          .slice(0, 5);
        const systems = dashboard?.system_status || {};

        return (
          <>
            <section className="adminDashboardWelcome">
              <div>
                <span className="adminEyebrow">MAI NETWORK COMMAND CENTER</span>
                <h2>👋 Welcome Back, Admin</h2>
                <p>Monitor, manage and protect MAI Network from one secure workspace.</p>
              </div>
              <div className="adminDashboardClock">
                <b>{new Date().toLocaleDateString()}</b>
                <span>Live server data</span>
              </div>
            </section>

            <div className="adminPrimaryMetrics">
              {primaryCards.map(([label, value, sub, icon]) => (
                <article className="adminMetric adminMetricPrimary" key={label}>
                  <div className="adminMetricIcon">{icon}</div>
                  <span>{label}</span>
                  <strong>{fmt(value)}</strong>
                  <small>{sub}</small>
                </article>
              ))}
            </div>

            <div className="adminDashboardSplit adminDashboardMainSplit">
              <section className="adminSection adminGrowthPanel">
                <div className="adminSectionHead">
                  <div><span>ANALYTICS</span><h3>User Growth</h3></div>
                  <small>Last 30 Days</small>
                </div>
                {growth.length > 1 ? (
                  <div className="adminGrowthChart" aria-label="30 day user growth chart">
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
                      <defs>
                        <linearGradient id="maiGrowthFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="currentColor" stopOpacity=".28" />
                          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <polygon points={`0,100 ${chartPoints} 100,100`} fill="url(#maiGrowthFill)" />
                      <polyline points={chartPoints} fill="none" vectorEffect="non-scaling-stroke" />
                    </svg>
                    <div className="adminChartLegend">
                      <span>{growth[0]?.day || '—'}</span>
                      <b>{fmt(growth[growth.length - 1]?.total)} total users</b>
                      <span>{growth[growth.length - 1]?.day || '—'}</span>
                    </div>
                  </div>
                ) : <Empty text="Growth history will appear when enough daily data is available." />}
              </section>

              <section className="adminSection adminSystemPanel">
                <div className="adminSectionHead"><div><span>INFRASTRUCTURE</span><h3>System Status</h3></div></div>
                <div className="adminSystemList">
                  {[
                    ['Bot API', systems.bot_api],
                    ['Database', systems.database],
                    ['Withdrawal System', systems.withdrawals],
                    ['Notification System', systems.notifications],
                    ['Security Monitoring', systems.security]
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span>{label}</span>
                      <Status>{value || 'unknown'}</Status>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="adminSecondaryMetrics">
              {secondaryCards.map(([label, value, sub]) => (
                <article className="adminMetric adminMetricCompact" key={label}>
                  <span>{label}</span><strong>{fmt(value)}</strong><small>{sub}</small>
                </article>
              ))}
            </div>

            <div className="adminDashboardSplit">
              <section className="adminSection">
                <div className="adminSectionHead"><div><span>USERS</span><h3>Recent Users</h3></div><button onClick={() => setTab('users')}>View All →</button></div>
                <div className="adminTableWrap"><table className="adminTable adminDashboardTable"><thead><tr><th>User</th><th>Status</th><th>Balance</th><th>Joined</th></tr></thead><tbody>
                  {recentUsers.map(user => <tr key={user.telegram_id}><td><b>{user.first_name || 'MAI User'}</b><small>@{user.username || 'no-username'} · {user.telegram_id}</small></td><td><Status>{user.account_status}</Status></td><td>{fmt(user.balance)} MAI</td><td>{when(user.created_at)}</td></tr>)}
                </tbody></table></div>
                {!recentUsers.length && <Empty text="No users yet." />}
              </section>

              <section className="adminSection">
                <div className="adminSectionHead"><div><span>PAYOUTS</span><h3>Recent Withdrawals</h3></div><button onClick={() => setTab('withdrawals')}>View All →</button></div>
                <div className="adminTableWrap"><table className="adminTable adminDashboardTable"><thead><tr><th>ID</th><th>User</th><th>Amount</th><th>Status</th></tr></thead><tbody>
                  {recentWithdrawals.map(item => <tr key={item.id}><td>#{item.id}</td><td>{item.first_name || item.telegram_id}</td><td>{fmt(item.amount)} MAI</td><td><Status>{item.status}</Status></td></tr>)}
                </tbody></table></div>
                {!recentWithdrawals.length && <Empty text="No active withdrawal records." />}
              </section>
            </div>

            <div className="adminDashboardBottom">
              <section className="adminSection adminSecurityAlerts">
                <div className="adminSectionHead"><div><span>SECURITY</span><h3>Security Alerts</h3></div><button onClick={() => setTab('audit')}>Audit Logs →</button></div>
                {securityAlerts.length ? <div className="adminCompactList">{securityAlerts.map(item => <div key={item.id}><div><b>{String(item.action || '').replaceAll('_', ' ')}</b><small>{item.target_id || 'System'} · {when(item.created_at)}</small></div><Status>{item.target_type || 'event'}</Status></div>)}</div> : <Empty text="No recent security-related admin events." />}
              </section>

              <section className="adminSection adminQuickActions">
                <div className="adminSectionHead"><div><span>OPERATIONS</span><h3>Quick Actions</h3></div></div>
                <div className="adminQuickGrid">
                  <button onClick={() => setTab('users')}>👥 Manage Users</button>
                  <button onClick={() => setTab('withdrawals')}>↗ Review Withdrawals</button>
                  <button onClick={() => setTab('fraud')}>⚠ Fraud Check</button>
                  <button onClick={() => setTab('security')}>🛡 Security</button>
                </div>
              </section>

              <section className="adminSection adminRiskOverview">
                <div className="adminSectionHead"><div><span>RISK</span><h3>Risk Overview</h3></div></div>
                <div className="adminRiskRing" style={{'--risk': `${Math.min(100, Number(dashboard?.security_warnings_24h || 0) * 5)}%`}}><div><b>{fmt(dashboard?.security_warnings_24h)}</b><span>24h flags</span></div></div>
                <div className="adminRiskLegend"><span>Shared devices <b>{fmt(dashboard?.shared_devices)}</b></span><span>Risky withdrawals <b>{fmt(dashboard?.risky_withdrawals)}</b></span></div>
                <p className="adminFootnote">These are risk signals only. They are not treated as proof of abuse.</p>
              </section>
            </div>
          </>
        );
      };

      const renderUsers = () => (
        <>
          <section className="adminSection adminStickyTools">
            <div className="adminSectionHead">
              <div>
                <span>USER MANAGEMENT</span>
                <h3>{filteredUsers.length} Accounts</h3>
              </div>
            </div>
            <input
              className="adminSearch"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search UID, username, wallet or status"
            />
          </section>

          <div className="adminList">
            {filteredUsers.map(user => (
              <article className="adminListCard" key={user.telegram_id}>
                <div className="adminListTop">
                  <div className="adminAvatar">
                    {(user.first_name || user.username || 'M').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="adminGrow">
                    <b>{user.first_name || 'MAI User'}</b>
                    <span>@{user.username || 'no-username'} · UID {user.telegram_id}</span>
                  </div>
                  <Status>{user.account_status}</Status>
                </div>

                <div className="adminDataGrid">
                  <div><span>Balance</span><b>{fmt(user.balance)} MAI</b></div>
                  <div><span>Locked</span><b>{fmt(user.locked_balance)} MAI</b></div>
                  <div><span>Level</span><b>{user.mining_level || 1}</b></div>
                  <div><span>Speed</span><b>{fmt(user.mining_speed)}</b></div>
                  <div><span>Devices</span><b>{user.device_count || 0}</b></div>
                  <div><span>Warnings</span><b>{user.warning_count || 0}</b></div>
                </div>

                <div className="adminWalletLine">
                  <span>Wallet</span>
                  <code>{short(user.wallet_address, 10, 7)}</code>
                </div>

                <div className="adminActions">
                  <button onClick={() => openUser(user.telegram_id)}>
                    {busy === `user-${user.telegram_id}` ? 'Loading…' : 'Inspect'}
                  </button>
                  <button className="adminMessageBtn" onClick={() => messageUser(user)}>Message</button>

                  {user.account_status === 'active' ? (
                    <>
                      <button className="warn" onClick={() => suspendUser(user)}>Suspend</button>
                      <button className="danger" onClick={() => banUser(user)}>Ban</button>
                    </>
                  ) : (
                    <button className="good" onClick={() => restoreUser(user)}>Restore</button>
                  )}
                </div>
              </article>
            ))}
            {!filteredUsers.length && <Empty />}
          </div>
        </>
      );

      const renderSecurity = () => (
        <>
          <section className="adminSection">
            <div className="adminSectionHead">
              <div>
                <span>ANTI-CHEAT</span>
                <h3>Security Policy</h3>
              </div>
              <Status>{securityConfig?.devicePolicy || 'unknown'}</Status>
            </div>

            <div className="adminDataGrid">
              <div><span>Accounts / Device</span><b>{securityConfig?.maxAccountsPerDevice ?? '—'}</b></div>
              <div><span>Accounts / IP / Day</span><b>{securityConfig?.maxAccountsPerIpDay ?? '—'}</b></div>
              <div><span>Risk Withdrawal Block</span><b>{securityConfig?.blockWithdrawOnRisk ? 'ON' : 'OFF'}</b></div>
              <div><span>Shared Devices</span><b>{dashboard?.shared_devices ?? 0}</b></div>
            </div>

            <p className="adminFootnote">
              Device and IP correlation is shown as a review signal. Family Wi-Fi,
              offices and shared devices can create legitimate matches.
            </p>
          </section>

          <section className="adminSection">
            <div className="adminSectionHead">
              <div>
                <span>RISK QUEUE</span>
                <h3>Accounts With Warnings</h3>
              </div>
            </div>

            <div className="adminCompactList">
              {users
                .filter(user => Number(user.warning_count || 0) > 0 || Number(user.linked_device_accounts || 0) > 1)
                .map(user => (
                  <button key={user.telegram_id} onClick={() => openUser(user.telegram_id)}>
                    <div>
                      <b>{user.first_name || user.telegram_id}</b>
                      <span>UID {user.telegram_id}</span>
                    </div>
                    <div>
                      <strong>{user.warning_count || 0} warnings</strong>
                      <small>{user.linked_device_accounts || 0} linked accounts</small>
                    </div>
                  </button>
                ))}
              {!users.some(user => Number(user.warning_count || 0) > 0 || Number(user.linked_device_accounts || 0) > 1) && (
                <Empty text="No current account-level warning signals." />
              )}
            </div>
          </section>
        </>
      );

      const renderPromotions = () => (
        <div className="adminList">
          {campaigns.map(item => (
            <article className="adminListCard" key={item.id}>
              <div className="adminListTop">
                <div className="adminBadgeIcon">🚀</div>
                <div className="adminGrow">
                  <b>{item.title || `Campaign #${item.id}`}</b>
                  <span>Owner UID {item.owner_id} · #{item.id}</span>
                </div>
                <Status>{item.status}</Status>
              </div>

              <div className="adminDataGrid">
                <div><span>Target</span><b>{fmt(item.target_count)}</b></div>
                <div><span>Completed</span><b>{fmt(item.completed_count)}</b></div>
                <div><span>Method</span><b>{item.payment_method || '—'}</b></div>
                <div><span>Payment</span><b>{fmt(item.payment_amount)}</b></div>
              </div>

              <div className="adminWalletLine">
                <span>Payment status</span>
                <Status>{item.payment_status}</Status>
              </div>

              <div className="adminWalletLine">
                <span>Target</span>
                <code>{short(item.target_url, 22, 10)}</code>
              </div>

              {item.status === 'pending' && (
                <div className="adminActions">
                  <button
                    className="good"
                    disabled={item.payment_status !== 'paid' || !!busy}
                    onClick={() => runAction(
                      `campaign-approve-${item.id}`,
                      `/admin/campaigns/${item.id}/approve`
                    )}
                  >
                    Approve
                  </button>
                  <button
                    className="danger"
                    disabled={!!busy}
                    onClick={() => runAction(
                      `campaign-reject-${item.id}`,
                      `/admin/campaigns/${item.id}/reject`
                    )}
                  >
                    Reject
                  </button>
                </div>
              )}

              {item.payment_status !== 'paid' && item.status === 'pending' && (
                <p className="adminFootnote">
                  Approval is locked until the backend verifies payment on-chain.
                </p>
              )}
            </article>
          ))}
          {!campaigns.length && <Empty text="No promotion campaigns." />}
        </div>
      );

      const renderWithdrawals = () => (
        <>
          {moduleStatus?.payout?.auto && (
            <section className="adminSection">
              <p className="adminFootnote">
                Auto payout is enabled. After Admin approval, the server-side payout worker broadcasts and confirms the transfer. Manual “Mark Paid” is intentionally not available for auto-payout rows.
              </p>
            </section>
          )}
          <div className="adminList">
          {withdrawals.map(item => (
            <article className="adminListCard" key={item.id}>
              <div className="adminListTop">
                <div className="adminBadgeIcon">↗</div>
                <div className="adminGrow">
                  <b>{fmt(item.amount)} MAI</b>
                  <span>{item.first_name || 'MAI User'} · UID {item.telegram_id}</span>
                </div>
                <Status>{item.status}</Status>
              </div>

              <div className="adminDataGrid">
                <div><span>Fee</span><b>{fmt(item.fee)} MAI</b></div>
                <div><span>Receive</span><b>{fmt(item.receive_amount)} MAI</b></div>
                <div><span>Created</span><b>{when(item.created_at)}</b></div>
                <div><span>Risk Flags</span><b>{Array.isArray(item.risk_flags) ? item.risk_flags.length : 0}</b></div>
              </div>

              <div className="adminWalletLine">
                <span>Wallet</span>
                <code>{short(item.wallet_address, 12, 8)}</code>
              </div>

              {Array.isArray(item.risk_flags) && item.risk_flags.length > 0 && (
                <div className="adminRiskFlags">
                  {item.risk_flags.map(flag => <span key={flag}>{flag}</span>)}
                </div>
              )}

              {['pending', 'security_check'].includes(item.status) && (
                <div className="adminActions">
                  <button
                    className="good"
                    disabled={!!busy}
                    onClick={() => runAction(
                      `withdraw-approve-${item.id}`,
                      `/admin/withdrawals/${item.id}/approve`
                    )}
                  >
                    Approve
                  </button>
                  <button
                    className="danger"
                    disabled={!!busy}
                    onClick={() => runAction(
                      `withdraw-reject-${item.id}`,
                      `/admin/withdrawals/${item.id}/reject`
                    )}
                  >
                    Reject
                  </button>
                </div>
              )}
            </article>
          ))}
          {!withdrawals.length && <Empty text="No pending withdrawal work." />}
          </div>
        </>
      );

      const renderPayments = () => (
        <>
          <section className="adminSection">
            <div className="adminSectionHead">
              <div>
                <span>PAYMENT CONTROL</span>
                <h3>Payment & Payout Records</h3>
              </div>
            </div>
            <div className="adminMiniStats">
              <div><span>Paid Promotions</span><b>{paidCampaigns.length}</b></div>
              <div><span>Withdrawal Queue</span><b>{withdrawals.length}</b></div>
              <div><span>Receiver</span><b>{short(securityConfig?.promoteReceiverWallet, 5, 4)}</b></div>
            </div>
          </section>

          <div className="adminList">
            {paymentRows.map(row => (
              <article className="adminListCard" key={row.key}>
                <div className="adminListTop">
                  <div className="adminBadgeIcon">◈</div>
                  <div className="adminGrow">
                    <b>{row.kind} #{row.id}</b>
                    <span>UID {row.user || '—'} · {row.method || '—'}</span>
                  </div>
                  <Status>{row.status}</Status>
                </div>
                <div className="adminDataGrid">
                  <div><span>Amount</span><b>{fmt(row.amount)}</b></div>
                  <div><span>Created</span><b>{when(row.created)}</b></div>
                </div>
                <div className="adminWalletLine">
                  <span>Transaction</span>
                  <code>{short(row.tx, 12, 8)}</code>
                </div>
              </article>
            ))}
            {!paymentRows.length && <Empty text="No payment records available in the current admin APIs." />}
          </div>
        </>
      );

      const renderAudit = () => (
        <div className="adminTimeline">
          {audit.map(item => (
            <article key={item.id}>
              <i />
              <div>
                <div className="adminListTop">
                  <div className="adminGrow">
                    <b>{String(item.action || 'admin_action').replaceAll('_', ' ')}</b>
                    <span>{when(item.created_at)}</span>
                  </div>
                  <Status>{item.target_type}</Status>
                </div>
                <p>
                  Target: {item.target_id || '—'}
                  {item.admin_id ? ` · Admin ${item.admin_id}` : ''}
                </p>
                {item.reason && <small>Reason: {item.reason}</small>}
              </div>
            </article>
          ))}
          {!audit.length && <Empty text="No audit entries." />}
        </div>
      );

      const renderSettings = () => (
        <>
          <section className="adminSection">
            <div className="adminSectionHead">
              <div>
                <span>CONTROL POLICY</span>
                <h3>Current Server Settings</h3>
              </div>
            </div>

            <div className="adminSettingRows">
              <div><span>Device policy</span><b>{securityConfig?.devicePolicy || '—'}</b></div>
              <div><span>Max accounts / device</span><b>{securityConfig?.maxAccountsPerDevice ?? '—'}</b></div>
              <div><span>Max accounts / IP / day</span><b>{securityConfig?.maxAccountsPerIpDay ?? '—'}</b></div>
              <div><span>Block risky withdrawals</span><b>{securityConfig?.blockWithdrawOnRisk ? 'Enabled' : 'Disabled'}</b></div>
              <div><span>Promotion GRAM / completion</span><b>{securityConfig?.promoteGramPerCompletion ?? '—'}</b></div>
              <div><span>GRAM → MAI fallback</span><b>{securityConfig?.gramPriceInMai ?? '—'}</b></div>
            </div>
          </section>

          <section className="adminSection adminSafetyBox">
            <span className="adminEyebrow">SAFETY BOUNDARY</span>
            <h3>Server-authoritative controls</h3>
            <p>
              Mining economics, tokenomics and payment verification are intentionally
              not editable from this browser panel. High-impact changes should remain
              server-side, reviewed and auditable.
            </p>
          </section>
        </>
      );


      const renderMultiAccount = () => {
        const candidates = users
          .filter(user =>
            Number(user.linked_device_accounts || 0) > 0 ||
            Number(user.device_count || 0) > 1
          )
          .sort((a, b) =>
            Number(b.linked_device_accounts || 0) -
            Number(a.linked_device_accounts || 0)
          );

        return (
          <>
            <section className="adminSection adminCommandIntro">
              <div className="adminSectionHead">
                <div>
                  <span>MULTI-ACCOUNT DETECTION</span>
                  <h3>Device-linked review queue</h3>
                </div>
              </div>
              <p className="adminFootnote">
                Accounts are ordered by device-link signals. Open Inspect to see the
                exact registered devices and the unique accounts associated with them.
                Shared IP/device matches are review signals only — not proof of abuse.
              </p>
            </section>

            <div className="adminDeviceGroupList">
              {candidates.map((user, index) => (
                <article className="adminDeviceGroup" key={user.telegram_id}>
                  <div className="adminDeviceGroupHead">
                    <div>
                      <small>REVIEW GROUP #{String(index + 1).padStart(2, '0')}</small>
                      <h4>{user.first_name || user.username || `UID ${user.telegram_id}`}</h4>
                      <span>Primary UID {user.telegram_id}</span>
                    </div>
                    <Status>{user.account_status}</Status>
                  </div>

                  <div className="adminDeviceGroupStats">
                    <div><span>Registered Devices</span><b>{user.device_count || 0}</b></div>
                    <div><span>Linked Accounts</span><b>{user.linked_device_accounts || 0}</b></div>
                    <div><span>Warnings</span><b>{user.warning_count || 0}</b></div>
                  </div>

                  <div className="adminGroupTableWrap">
                    <table className="adminTable adminGroupPreviewTable">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>UID</th>
                          <th>Username</th>
                          <th>Signal</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1</td>
                          <td>{user.telegram_id}</td>
                          <td>@{user.username || 'no-username'}</td>
                          <td>{Number(user.linked_device_accounts || 0) > 0 ? 'Device link' : 'Multiple devices'}</td>
                          <td><Status>{user.account_status}</Status></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <button
                    className="adminInspectGroup"
                    onClick={() => openUser(user.telegram_id)}
                  >
                    Inspect device group →
                  </button>
                </article>
              ))}

              {!candidates.length && (
                <Empty text="No current device-linked account groups." />
              )}
            </div>
          </>
        );
      };

      const renderFraudCheck = () => {
        const risky = withdrawals.filter(item => Array.isArray(item.risk_flags) && item.risk_flags.length > 0);
        return (
          <>
            <section className="adminSection adminFraudIntro">
              <div className="adminSectionHead"><div><span>PAYMENT FRAUD CHECK</span><h3>Withdrawal risk review</h3></div></div>
              <p className="adminFootnote">Review risk flags, wallet and account history before acting. MAI does not treat a shared IP or device alone as proof of abuse.</p>
            </section>
            <div className="adminTableWrap">
              <table className="adminTable">
                <thead><tr><th>#</th><th>UID</th><th>Amount</th><th>Wallet</th><th>Signals</th><th>Status</th><th>Review</th></tr></thead>
                <tbody>{risky.map((item,index) => <tr key={item.id}><td>{index+1}</td><td>{item.telegram_id}</td><td>{fmt(item.amount)} MAI</td><td><code>{short(item.wallet_address,8,6)}</code></td><td>{item.risk_flags.join(', ')}</td><td><Status>{item.status}</Status></td><td><button className="adminTableBtn" onClick={() => openUser(item.telegram_id)}>Inspect</button></td></tr>)}</tbody>
              </table>
              {!risky.length && <Empty text="No withdrawal requests currently carry risk flags." />}
            </div>
          </>
        );
      };


      const promptValue = (label, fallback = '') =>
        String(window.prompt(label, fallback) || '').trim();

      const renderTasksMissions = () => {
        const setTaskField = (key, value) => setTaskForm(old => ({...old,[key]:value}));
        const resetTaskForm = () => setTaskForm({title:'',targetUrl:'',reward:'',taskType:'telegram_join',telegramChatId:'',description:'',limitMode:'all',customLimit:'',refreshMode:'once',customHours:'',inviteCount:'1',holdingAmount:'0',miningClaims:'1',botVerification:'external_gate',botEventType:''});
        const refreshHours = taskForm.refreshMode === 'custom' ? Number(taskForm.customHours) : Number(taskForm.refreshMode);
        const claimLimit = taskForm.limitMode === 'all' ? null : Number(taskForm.limitMode === 'custom' ? taskForm.customLimit : taskForm.limitMode);
        const createTask = async (status='draft') => {
          const title=String(taskForm.title||'').trim(); const reward=Number(taskForm.reward);
          if(!title){setError('Task title is required.');return;}
          if(!Number.isFinite(reward)||reward<0){setError('Reward must be 0 MAI or greater.');return;}
          if(taskForm.limitMode!=='all'&&(!Number.isInteger(claimLimit)||claimLimit<1)){setError('Task Limit must be a positive whole number or All Users.');return;}
          if(taskForm.refreshMode!=='once'&&(!Number.isFinite(refreshHours)||refreshHours<1)){setError('Refresh time must be at least 1 hour.');return;}
          if(taskForm.taskType==='telegram_join'&&!String(taskForm.telegramChatId||'').trim()){setError('Telegram Join tasks require a Telegram chat ID or @username.');return;}
          if(taskForm.taskType==='telegram_bot'&&taskForm.botVerification==='mai_event'&&!String(taskForm.botEventType||'').trim()){setError('MAI-owned bot verification requires a server event type.');return;}
          const ruleConfig={};
          if(taskForm.taskType==='invite_friends') ruleConfig.count=Math.max(1,Number(taskForm.inviteCount||1));
          if(taskForm.taskType==='hold_mai') ruleConfig.amount=Math.max(0,Number(taskForm.holdingAmount||0));
          if(['mining_mission','daily_mission'].includes(taskForm.taskType)) ruleConfig.claims=Math.max(1,Number(taskForm.miningClaims||1));
          if(taskForm.taskType==='telegram_bot'){ruleConfig.verificationMode=taskForm.botVerification||'external_gate';if(ruleConfig.verificationMode==='mai_event')ruleConfig.eventType=String(taskForm.botEventType||'').trim();}
          setBusy('create-task'); setError('');
          try{
            await adminApi('/admin/tasks',{method:'POST',body:JSON.stringify({title,description:String(taskForm.description||'').trim(),taskType:taskForm.taskType,reward,targetUrl:String(taskForm.targetUrl||'').trim()||null,telegramChatId:String(taskForm.telegramChatId||'').trim()||null,ruleConfig,recurrence:taskForm.taskType==='daily_mission'&&taskForm.refreshMode==='once'?'daily':'once',claimLimit,cooldownSeconds:taskForm.refreshMode==='once'?0:Math.round(refreshHours*3600),status})});
            flash(status==='active'?'Task published.':'Task draft created.'); resetTaskForm(); setTaskComposerOpen(false); setTaskMode(status==='active'?'tasks':'history'); await loadAll(true);
          }catch(e){setError(e.message||'Could not create task.');}finally{setBusy('');}
        };
        const deleteModuleHistory = async (kind,item) => {
          if(!item||String(item.status)!=='ended') return;
          const label=kind==='task'?'Task':'Mission';
          if(!window.confirm(`Delete "${item.title}" from ${label} history? Completion/reward evidence and admin audit records will be preserved.`)) return;
          const key=`${kind}-delete-${item.id}`; setBusy(key); setError('');
          try{await adminApi(`/admin/${kind==='task'?'tasks':'missions'}/${item.id}`,{method:'DELETE'});flash(`${label} history removed.`);await loadAll(true);}catch(e){setError(e.message||`Could not delete ${label.toLowerCase()} history.`);}finally{setBusy('');}
        };
        const setMissionField=(key,value)=>setMissionForm(old=>({...old,[key]:value}));
        const resetMissionForm=()=>setMissionForm({title:'',description:'',completionBonus:'0',taskIds:[],featured:false,startsAt:'',endsAt:''});
        const toggleMissionTask=id=>setMissionForm(old=>{const key=String(id);const selected=(old.taskIds||[]).map(String);return {...old,taskIds:selected.includes(key)?selected.filter(x=>x!==key):[...selected,key]};});
        const createMission = async (status='draft') => {
          const title=String(missionForm.title||'').trim();
          const completionBonus=Number(missionForm.completionBonus||0);
          const taskIds=(missionForm.taskIds||[]).map(String);
          if(!title){setError('Mission title is required.');return;}
          if(!taskIds.length){setError('Select at least one task for this mission.');return;}
          if(!Number.isFinite(completionBonus)||completionBonus<0){setError('Mission completion bonus must be 0 MAI or greater.');return;}
          if(missionForm.startsAt&&missionForm.endsAt&&new Date(missionForm.endsAt)<=new Date(missionForm.startsAt)){setError('Mission end time must be after the start time.');return;}
          setBusy('create-mission');setError('');
          try{
            await adminApi('/admin/missions',{method:'POST',body:JSON.stringify({title,description:String(missionForm.description||'').trim(),taskIds,completionBonus,featured:!!missionForm.featured,startsAt:missionForm.startsAt||null,endsAt:missionForm.endsAt||null,status})});
            flash(status==='active'?'Mission published.':'Mission draft created.');resetMissionForm();setMissionComposerOpen(false);setTaskMode(status==='active'?'missions':'history');await loadAll(true);
          }catch(e){setError(e.message||'Could not create mission.');}finally{setBusy('');}
        };
        const refreshLabel=item=>{const sec=Number(item.cooldown_seconds||0);if(sec>0)return sec%3600===0?`Every ${sec/3600}H`:`Every ${(sec/3600).toFixed(1)}H`;return item.recurrence==='daily'?'Daily':'Once';};
        return (
          <>
            <section className="adminSection taskEngineHero">
              <div className="adminSectionHead"><div><span>TASK ENGINE</span><h3>Tasks & Missions</h3><p className="adminFootnote">Server-authoritative rewards, limits and recurring eligibility.</p></div><div className="adminActions"><button className="taskPrimaryBtn" onClick={()=>{setTaskMode('create-task');setTaskComposerOpen(true);setMissionComposerOpen(false)}} disabled={!!busy}>✦ Create Task</button><button className="missionPrimaryBtn" onClick={()=>{setTaskMode('create-mission');setMissionComposerOpen(true);setTaskComposerOpen(false)}} disabled={!!busy}>◆ Create Mission</button></div></div>
              <div className="adminMiniStats"><div><span>Tasks</span><b>{managedTasks.length}</b></div><div><span>Active Tasks</span><b>{managedTasks.filter(x=>x.status==='active').length}</b></div><div><span>Active Missions</span><b>{managedMissions.filter(x=>x.status==='active').length}</b></div></div>
              <div className="adminActions taskModeTabs"><button className={taskMode==='tasks'?'good':''} onClick={()=>{setTaskMode('tasks');setTaskComposerOpen(false);setMissionComposerOpen(false)}}>Active Tasks</button><button className={taskMode==='missions'?'good':''} onClick={()=>{setTaskMode('missions');setTaskComposerOpen(false);setMissionComposerOpen(false)}}>Missions</button><button className={taskMode==='history'?'good':''} onClick={()=>{setTaskMode('history');setTaskComposerOpen(false);setMissionComposerOpen(false)}}>History</button></div>
            </section>
            {taskMode==='create-task' && taskComposerOpen && <section className="adminSection taskComposer">
              <div className="taskComposerTitle"><div className="taskComposerIcon">✦</div><div><span>NEW MANAGED TASK</span><h3>Create Task</h3><p>Configure the task, reward budget and exact user refresh interval.</p></div></div>
              <div className="taskFormGrid">
                <label className="taskField taskFieldWide"><span>Task Title <em>Required</em></span><input value={taskForm.title} onChange={e=>setTaskField('title',e.target.value)} placeholder="e.g. Join MAI News Channel" maxLength="120" /></label>
                <label className="taskField taskFieldWide"><span>Task Link</span><input value={taskForm.targetUrl} onChange={e=>setTaskField('targetUrl',e.target.value)} placeholder="https://t.me/... or https://..." /></label>
                <label className="taskField"><span>Reward MAI <em>Required</em></span><input type="number" min="0" step="0.00000001" value={taskForm.reward} onChange={e=>setTaskField('reward',e.target.value)} placeholder="12" /></label>
                <label className="taskField"><span>Task Type</span><select value={taskForm.taskType} onChange={e=>setTaskField('taskType',e.target.value)}><option value="telegram_join">Telegram Join</option><option value="telegram_bot">Telegram Bot</option><option value="invite_friends">Invite Friends</option><option value="hold_mai">Hold MAI</option><option value="mining_mission">Mining Mission</option><option value="daily_mission">Daily Mission</option><option value="visit_link">Visit Link (view-only)</option><option value="custom">Custom (structured verifier required)</option></select></label>
                {taskForm.taskType==='telegram_join'&&<label className="taskField taskFieldWide"><span>Telegram Chat ID / @username <em>Required</em></span><input value={taskForm.telegramChatId} onChange={e=>setTaskField('telegramChatId',e.target.value)} placeholder="@MAI_News_Official" /><small>Used by the backend to verify Telegram membership.</small></label>}
                {taskForm.taskType==='telegram_bot'&&<><label className="taskField taskFieldWide"><span>Bot Verification</span><select value={taskForm.botVerification} onChange={e=>setTaskField('botVerification',e.target.value)}><option value="external_gate">External Telegram Bot · 10-second gate</option><option value="mai_event">MAI-owned Bot · Server event verification</option></select><small>External bots cannot expose /start activity to MAI, so they use a server-timed 10-second gate before claim.</small></label>{taskForm.botVerification==='mai_event'&&<label className="taskField taskFieldWide"><span>MAI Server Event Type <em>Required</em></span><input value={taskForm.botEventType} onChange={e=>setTaskField('botEventType',e.target.value)} placeholder="Verified server event" /></label>}</>}
                {taskForm.taskType==='invite_friends'&&<label className="taskField"><span>Required Invites</span><input type="number" min="1" value={taskForm.inviteCount} onChange={e=>setTaskField('inviteCount',e.target.value)} /></label>}
                {taskForm.taskType==='hold_mai'&&<label className="taskField"><span>Minimum MAI Holding</span><input type="number" min="0" value={taskForm.holdingAmount} onChange={e=>setTaskField('holdingAmount',e.target.value)} /></label>}
                {['mining_mission','daily_mission'].includes(taskForm.taskType)&&<label className="taskField"><span>Required Mining Claims</span><input type="number" min="1" value={taskForm.miningClaims} onChange={e=>setTaskField('miningClaims',e.target.value)} /></label>}
                <label className="taskField"><span>Task Limit</span><select value={taskForm.limitMode} onChange={e=>setTaskField('limitMode',e.target.value)}><option value="all">All Users · Unlimited</option><option value="100">100 Claims</option><option value="200">200 Claims</option><option value="500">500 Claims</option><option value="1000">1,000 Claims</option><option value="custom">Custom Limit</option></select></label>
                {taskForm.limitMode==='custom'&&<label className="taskField"><span>Custom Claim Limit</span><input type="number" min="1" step="1" value={taskForm.customLimit} onChange={e=>setTaskField('customLimit',e.target.value)} placeholder="250" /></label>}
                <label className="taskField"><span>Refresh / Cooldown</span><select value={taskForm.refreshMode} onChange={e=>setTaskField('refreshMode',e.target.value)}><option value="once">Once Only</option><option value="4">Every 4 Hours</option><option value="8">Every 8 Hours</option><option value="12">Every 12 Hours</option><option value="24">Every 24 Hours</option><option value="custom">Custom Hours</option></select></label>
                {taskForm.refreshMode==='custom'&&<label className="taskField"><span>Custom Hours</span><input type="number" min="1" step="1" value={taskForm.customHours} onChange={e=>setTaskField('customHours',e.target.value)} placeholder="6" /></label>}
                <label className="taskField taskFieldWide"><span>Description</span><textarea value={taskForm.description} onChange={e=>setTaskField('description',e.target.value)} placeholder="Explain what the user needs to do." maxLength="1000" /></label>
              </div>
              <div className="taskBudgetStrip"><div><span>Audience</span><b>{taskForm.limitMode==='all'?'All Users':`${Number.isFinite(claimLimit)?claimLimit:0} total claims`}</b></div><div><span>Refresh</span><b>{taskForm.refreshMode==='once'?'One-time':Number.isFinite(refreshHours)?`Every ${refreshHours}h`:'Custom'}</b></div><div><span>Max Reward Budget</span><b>{taskForm.limitMode==='all'?'Unlimited':Number.isFinite(claimLimit)&&Number.isFinite(Number(taskForm.reward))?`${fmt(claimLimit*Number(taskForm.reward))} MAI`:'—'}</b></div></div>
              <div className="taskComposerActions"><button className="taskSecondaryBtn" onClick={()=>{resetTaskForm();setTaskComposerOpen(false);setTaskMode('tasks')}} disabled={!!busy}>Cancel</button><button className="taskDraftBtn" onClick={()=>createTask('draft')} disabled={!!busy}>{busy==='create-task'?'Saving…':'Save Draft'}</button><button className="taskPublishBtn" onClick={()=>createTask('active')} disabled={!!busy}>{busy==='create-task'?'Publishing…':'Publish Task'}</button></div>
            </section>}
            {taskMode==='create-mission' && missionComposerOpen && <section className="adminSection missionComposer">
              <div className="taskComposerTitle"><div className="taskComposerIcon missionComposerIcon">◆</div><div><span>MISSION BUILDER</span><h3>Create Mission</h3><p>Bundle verified tasks into one premium challenge and reward users after the full mission is completed.</p></div></div>
              <div className="taskFormGrid missionFormGrid">
                <label className="taskField taskFieldWide"><span>Mission Title <em>Required</em></span><input value={missionForm.title} onChange={e=>setMissionField('title',e.target.value)} placeholder="e.g. MAI Starter Mission" maxLength="120" /></label>
                <label className="taskField"><span>Completion Bonus MAI</span><input type="number" min="0" step="0.00000001" value={missionForm.completionBonus} onChange={e=>setMissionField('completionBonus',e.target.value)} placeholder="20" /></label>
                <label className="missionFeaturedToggle"><input type="checkbox" checked={!!missionForm.featured} onChange={e=>setMissionField('featured',e.target.checked)} /><span><b>Featured Mission</b><small>Highlight this mission in the user experience.</small></span></label>
                <label className="taskField"><span>Starts At</span><input type="datetime-local" value={missionForm.startsAt} onChange={e=>setMissionField('startsAt',e.target.value)} /></label>
                <label className="taskField"><span>Ends At</span><input type="datetime-local" value={missionForm.endsAt} onChange={e=>setMissionField('endsAt',e.target.value)} /></label>
                <label className="taskField taskFieldWide"><span>Description</span><textarea value={missionForm.description} onChange={e=>setMissionField('description',e.target.value)} placeholder="Explain the mission goal and what users receive after completing every selected task." maxLength="1000" /></label>
              </div>
              <div className="missionTaskPickerHead"><div><span>MISSION TASKS</span><b>Select the tasks users must complete</b></div><strong>{(missionForm.taskIds||[]).length} selected</strong></div>
              <div className="missionTaskPicker">
                {managedTasks.filter(x=>x.status!=='ended').map(item=>{const selected=(missionForm.taskIds||[]).map(String).includes(String(item.id));return <button type="button" key={item.id} className={`missionTaskOption ${selected?'selected':''}`} onClick={()=>toggleMissionTask(item.id)}><span className="missionTaskCheck">{selected?'✓':'+'}</span><span className="missionTaskInfo"><b>{item.title}</b><small>#{item.id} · {String(item.task_type||'task').replaceAll('_',' ')} · {fmt(item.reward)} MAI</small></span><Status>{item.status}</Status></button>})}
                {!managedTasks.filter(x=>x.status!=='ended').length&&<div className="missionEmptyTasks">Create at least one managed task before building a mission.</div>}
              </div>
              <div className="missionSummaryStrip"><div><span>Selected Tasks</span><b>{(missionForm.taskIds||[]).length}</b></div><div><span>Task Rewards</span><b>{fmt(managedTasks.filter(x=>(missionForm.taskIds||[]).map(String).includes(String(x.id))).reduce((sum,x)=>sum+Number(x.reward||0),0))} MAI</b></div><div><span>Mission Bonus</span><b>{fmt(Number(missionForm.completionBonus||0))} MAI</b></div></div>
              <div className="taskComposerActions missionComposerActions"><button className="taskSecondaryBtn" onClick={()=>{resetMissionForm();setMissionComposerOpen(false);setTaskMode('missions')}} disabled={!!busy}>Cancel</button><button className="taskDraftBtn" onClick={()=>createMission('draft')} disabled={!!busy}>{busy==='create-mission'?'Saving…':'Save Draft'}</button><button className="taskPublishBtn" onClick={()=>createMission('active')} disabled={!!busy||!(missionForm.taskIds||[]).length}>{busy==='create-mission'?'Publishing…':'Publish Mission'}</button></div>
            </section>}
            {taskMode==='tasks'&&<div className="adminList">{managedTasks.filter(x=>x.status==='active').map(item=>{const limit=item.claim_limit==null?null:Number(item.claim_limit);const used=Number(item.completion_count||0);return <article className="adminListCard taskPremiumCard" key={item.id}><div className="adminListTop"><div className="adminBadgeIcon taskPremiumIcon">{item.icon||'✓'}</div><div className="adminGrow"><b>{item.title}</b><span>#{item.id} · {String(item.task_type||'task').replaceAll('_',' ')}</span></div><Status>{item.status}</Status></div><div className="adminDataGrid"><div><span>Reward</span><b>{fmt(item.reward)} MAI</b></div><div><span>Claims Used</span><b>{fmt(used)}{limit!==null?` / ${fmt(limit)}`:''}</b></div><div><span>Audience</span><b>{limit===null?'All Users':`${Math.max(0,limit-used)} left`}</b></div><div><span>Refresh</span><b>{refreshLabel(item)}</b></div></div>{item.target_url&&<div className="taskLinkLine"><span>↗</span><code>{item.target_url}</code></div>}<div className="adminActions"><>{item.status!=='active'&&<button className="good" onClick={()=>runAction(`task-active-${item.id}`,`/admin/tasks/${item.id}/status`,{status:'active'})}>Activate</button>}{item.status==='active'&&<button className="warn" onClick={()=>runAction(`task-pause-${item.id}`,`/admin/tasks/${item.id}/status`,{status:'paused'})}>Pause</button>}{item.status!=='ended'&&<button className="danger" onClick={()=>runAction(`task-end-${item.id}`,`/admin/tasks/${item.id}/status`,{status:'ended'})}>End</button>}{item.status==='ended'&&<button className="taskDeleteBtn" disabled={busy===`task-delete-${item.id}`} onClick={()=>deleteModuleHistory('task',item)}>{busy===`task-delete-${item.id}`?'Deleting…':'⌫ Delete'}</button>}</></div></article>})}{!managedTasks.some(x=>x.status==='active')&&<Empty text="No active tasks right now." />}</div>}
            {taskMode==='missions'&&<div className="adminList">{managedMissions.filter(x=>x.status==='active').map(item=><article className="adminListCard taskPremiumCard" key={item.id}><div className="adminListTop"><div className="adminBadgeIcon">{item.icon||'◆'}</div><div className="adminGrow"><b>{item.title}</b><span>#{item.id} · {(item.tasks||[]).length} tasks</span></div><Status>{item.status}</Status></div><div className="adminDataGrid"><div><span>Bonus</span><b>{fmt(item.completion_bonus)} MAI</b></div><div><span>Featured</span><b>{item.featured?'YES':'NO'}</b></div><div><span>Starts</span><b>{when(item.starts_at)}</b></div><div><span>Ends</span><b>{when(item.ends_at)}</b></div></div><div className="adminActions">{item.status!=='active'&&<button className="good" onClick={()=>runAction(`mission-active-${item.id}`,`/admin/missions/${item.id}/status`,{status:'active'})}>Activate</button>}{item.status==='active'&&<button className="warn" onClick={()=>runAction(`mission-pause-${item.id}`,`/admin/missions/${item.id}/status`,{status:'paused'})}>Pause</button>}{item.status!=='ended'&&<button className="danger" onClick={()=>runAction(`mission-end-${item.id}`,`/admin/missions/${item.id}/status`,{status:'ended'})}>End</button>}{item.status==='ended'&&<button className="taskDeleteBtn" disabled={busy===`mission-delete-${item.id}`} onClick={()=>deleteModuleHistory('mission',item)}>{busy===`mission-delete-${item.id}`?'Deleting…':'⌫ Delete'}</button>}</div></article>)}{!managedMissions.some(x=>x.status==='active')&&<Empty text="No active missions right now." />}</div>}
            {taskMode==='history'&&<div className="adminList">{[...managedTasks.filter(x=>x.status!=='active').map(x=>({...x,_kind:'task'})),...managedMissions.filter(x=>x.status!=='active').map(x=>({...x,_kind:'mission'}))].sort((a,b)=>new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0)).map((item,index)=><article className="adminListCard taskHistoryCard" key={`${item._kind}-${item.id}-${index}`}><div className="adminListTop"><div className="adminBadgeIcon">☷</div><div className="adminGrow"><b>{item.title}</b><span>{String(item.status||'record').replaceAll('_',' ')} {item._kind} #{item.id}{item.status==='ended'?' · evidence retained':''}</span></div><Status>{item.status||'record'}</Status></div><div className="adminActions">{item.status!=='ended'&&<button className="good" onClick={()=>runAction(`${item._kind}-active-${item.id}`,`/admin/${item._kind==='task'?'tasks':'missions'}/${item.id}/status`,{status:'active'})}>Activate</button>}{item.status!=='ended'&&<button className="danger" onClick={()=>runAction(`${item._kind}-end-${item.id}`,`/admin/${item._kind==='task'?'tasks':'missions'}/${item.id}/status`,{status:'ended'})}>End</button>}{item.status==='ended'&&<button className="taskDeleteBtn" disabled={busy===`${item._kind}-delete-${item.id}`} onClick={()=>deleteModuleHistory(item._kind,item)}>{busy===`${item._kind}-delete-${item.id}`?'Deleting…':'⌫ Delete History'}</button>}</div></article>)}{![...managedTasks,...managedMissions].some(x=>x.status!=='active')&&<Empty text="No task or mission history yet." />}</div>}
          </>
        );
      };

      const renderGiveaway = () => {
        const verifierReadyTypes = new Set(['task','referral','lucky_draw','leaderboard','social','quiz','holding','purchase','custom']);
        const setGiveawayField = (key, value) =>
          setGiveawayForm(old => ({ ...old, [key]: value }));

        const createGiveaway = async (requestedStatus = 'draft') => {
          const title = String(giveawayForm.title || '').trim();
          if (!title) {
            setError('Giveaway title is required.');
            return;
          }
          if (!String(giveawayForm.description || '').trim()) {
            setError('Giveaway description is required.');
            return;
          }
          if (giveawayForm.startsAt && giveawayForm.endsAt && new Date(giveawayForm.endsAt) <= new Date(giveawayForm.startsAt)) {
            setError('Giveaway end time must be after the start time.');
            return;
          }
          const config = {
            prizePool:Number(giveawayForm.prizePool || 0),
            winnerCount:Math.max(1, Number(giveawayForm.winnerCount || 1)),
            prizePerWinner:Number(giveawayForm.prizePerWinner || 0)
          };
          if (giveawayForm.giveawayType === 'task') {
            config.taskKeys = String(giveawayForm.taskKeys || '').split(',').map(x=>x.trim()).filter(Boolean);
          }
          if (giveawayForm.giveawayType === 'referral') {
            config.successfulInvites = Math.max(1, Number(giveawayForm.successfulInvites || 1));
          }
          if (giveawayForm.giveawayType === 'holding') {
            config.minimumMai = Math.max(0, Number(giveawayForm.minimumMai || 0));
          }
          if (giveawayForm.giveawayType === 'social') {
            config.socialTaskIds = String(giveawayForm.socialTaskIds || '').split(',').map(x=>Number(x.trim())).filter(Number.isFinite);
          }
          if (giveawayForm.giveawayType === 'quiz') {
            config.quizQuestion = String(giveawayForm.quizQuestion || '').trim();
            config.quizOptions = String(giveawayForm.quizOptions || '').split('\n').map(x=>x.trim()).filter(Boolean);
            config.correctOption = Math.max(0, Number(giveawayForm.quizCorrectOption || 0));
          }
          if (giveawayForm.giveawayType === 'leaderboard') {
            config.leaderboardMetric = giveawayForm.leaderboardMetric;
            config.leaderboardTop = Math.max(1, Number(giveawayForm.leaderboardTop || 100));
          }
          if (giveawayForm.giveawayType === 'purchase') {
            config.purchaseCurrency = giveawayForm.purchaseCurrency;
            config.minimumPurchase = Math.max(0, Number(giveawayForm.minimumPurchase || 0));
          }
          if (giveawayForm.giveawayType === 'custom') {
            config.customPrompt = String(giveawayForm.customPrompt || '').trim();
            config.customAnswer = String(giveawayForm.customAnswer || '').trim();
          }
          await runAction('create-giveaway','/admin/giveaways',{
            title,
            giveawayType:giveawayForm.giveawayType,
            description:String(giveawayForm.description || '').trim(),
            imageUrl:String(giveawayForm.imageUrl || '').trim() || null,
            status:requestedStatus,
            showOnHome:Boolean(giveawayForm.showOnHome),
            featured:Boolean(giveawayForm.featured),
            allowMultipleEntries:Boolean(giveawayForm.allowMultipleEntries && ['referral','purchase'].includes(giveawayForm.giveawayType)),
            startsAt:giveawayForm.startsAt || null,
            endsAt:giveawayForm.endsAt || null,
            config
          });
          setGiveawayForm(old => ({...old,title:'',description:'',imageUrl:'',prizePool:'',prizePerWinner:'',taskKeys:'',socialTaskIds:'',quizQuestion:'',quizOptions:'',customPrompt:'',customAnswer:''}));
          setGiveawayPreview(false);
          setGiveawayMode('campaigns');
        };

        const awardGiveawayPrize = async item => {
          if (!item || String(item.payment_status || '').toLowerCase() === 'paid') return;
          const ok = window.confirm(`Award ${fmt(item.prize)} MAI to UID ${item.telegram_id}? This credits the user's Main Balance exactly once.`);
          if (!ok) return;
          await runAction(`give-award-${item.id}`,`/admin/giveaway-winners/${item.id}/award`,{});
        };

        const deleteGiveawayHistory = async item => {
          if (!item || !['ended','completed'].includes(String(item.status))) return;
          const ok = window.confirm(`Delete "${item.title}" from Giveaway history? Audit, entries and winner/payment records will be preserved safely.`);
          if (!ok) return;
          setBusy(`give-delete-${item.id}`);
          setError('');
          try {
            await adminApi(`/admin/giveaways/${item.id}`, { method:'DELETE' });
            flash('Giveaway history removed.');
            await loadAll(true);
          } catch (e) {
            setError(e.message || 'Could not delete giveaway history.');
          } finally {
            setBusy('');
          }
        };

        const fieldStyle = {width:'100%',boxSizing:'border-box',padding:'12px 13px',borderRadius:10,border:'1px solid rgba(255,255,255,.12)',background:'rgba(4,13,28,.72)',color:'inherit',outline:'none'};
        const labelStyle = {display:'grid',gap:7};

        return (
          <>
            <section className="adminSection">
              <div className="adminSectionHead">
                <div><span>CAMPAIGN ENGINE</span><h3>Giveaway</h3></div>
                <Status>{giveaways.some(x=>x.status==='live') ? 'active' : 'draft'}</Status>
              </div>
              <div className="adminActions">
                <button className={giveawayMode==='create'?'good':''} onClick={()=>setGiveawayMode('create')}>Create Giveaway</button>
                <button className={giveawayMode==='campaigns'?'good':''} onClick={()=>setGiveawayMode('campaigns')}>All Campaigns</button>
                <button className={giveawayMode==='winners'?'good':''} onClick={()=>setGiveawayMode('winners')}>Winners</button>
                <button className={giveawayMode==='settings'?'good':''} onClick={()=>setGiveawayMode('settings')}>Settings</button>
              </div>
            </section>

            {giveawayMode==='create' && (
              <section className="adminSection">
                <div className="adminSectionHead"><div><span>NEW CAMPAIGN</span><h3>Create Giveaway</h3></div></div>
                <div className="adminDataGrid">
                  <label style={labelStyle}><span>Title</span><input style={fieldStyle} value={giveawayForm.title} onChange={e=>setGiveawayField('title',e.target.value)} placeholder="MAI Community Giveaway" /></label>
                  <label style={labelStyle}><span>Type</span><select style={fieldStyle} value={giveawayForm.giveawayType} onChange={e=>setGiveawayField('giveawayType',e.target.value)}>
                    <option value="task">Task Completion</option><option value="referral">Referral Based</option><option value="lucky_draw">Lucky Draw</option><option value="leaderboard">Leaderboard</option><option value="social">Social Action</option><option value="quiz">Quiz / Trivia</option><option value="holding">Holding Based</option><option value="purchase">Purchase (Verified Promote Payment)</option><option value="custom">Custom</option>
                  </select></label>
                  <label style={labelStyle}><span>Prize Pool (MAI)</span><input style={fieldStyle} type="number" min="0" value={giveawayForm.prizePool} onChange={e=>setGiveawayField('prizePool',e.target.value)} /></label>
                  <label style={labelStyle}><span>Winner Count</span><input style={fieldStyle} type="number" min="1" max="100" value={giveawayForm.winnerCount} onChange={e=>setGiveawayField('winnerCount',e.target.value)} /></label>
                  <label style={labelStyle}><span>Prize / Winner (MAI)</span><input style={fieldStyle} type="number" min="0" value={giveawayForm.prizePerWinner} onChange={e=>setGiveawayField('prizePerWinner',e.target.value)} /></label>
                  <label style={labelStyle}><span>Campaign Image URL</span><input style={fieldStyle} value={giveawayForm.imageUrl} onChange={e=>setGiveawayField('imageUrl',e.target.value)} placeholder="https://..." /></label>
                  <label style={labelStyle}><span>Start</span><input style={fieldStyle} type="datetime-local" value={giveawayForm.startsAt} onChange={e=>setGiveawayField('startsAt',e.target.value)} /></label>
                  <label style={labelStyle}><span>End</span><input style={fieldStyle} type="datetime-local" value={giveawayForm.endsAt} onChange={e=>setGiveawayField('endsAt',e.target.value)} /></label>
                </div>
                <label style={{...labelStyle,marginTop:12}}><span>Description</span><textarea style={{...fieldStyle,minHeight:100,resize:'vertical'}} value={giveawayForm.description} onChange={e=>setGiveawayField('description',e.target.value)} placeholder="Explain the giveaway and requirements." /></label>
                {giveawayForm.giveawayType==='task' && <label style={{...labelStyle,marginTop:12}}><span>Required Task Keys (comma separated)</span><input style={fieldStyle} value={giveawayForm.taskKeys} onChange={e=>setGiveawayField('taskKeys',e.target.value)} placeholder="daily_checkin, join_news" /></label>}
                {giveawayForm.giveawayType==='referral' && <label style={{...labelStyle,marginTop:12}}><span>Successful Invites Required</span><input style={fieldStyle} type="number" min="1" value={giveawayForm.successfulInvites} onChange={e=>setGiveawayField('successfulInvites',e.target.value)} /></label>}
                {giveawayForm.giveawayType==='holding' && <label style={{...labelStyle,marginTop:12}}><span>Minimum MAI Holding</span><input style={fieldStyle} type="number" min="0" value={giveawayForm.minimumMai} onChange={e=>setGiveawayField('minimumMai',e.target.value)} /></label>}
                {giveawayForm.giveawayType==='social' && <label style={{...labelStyle,marginTop:12}}><span>Verified Managed Task IDs (comma separated)</span><input style={fieldStyle} value={giveawayForm.socialTaskIds} onChange={e=>setGiveawayField('socialTaskIds',e.target.value)} placeholder="12, 15, 18" /><small>Use IDs from Tasks & Missions. Users must have these tasks server-verified.</small></label>}
                {giveawayForm.giveawayType==='leaderboard' && <div className="adminDataGrid" style={{marginTop:12}}><label style={labelStyle}><span>Leaderboard Metric</span><select style={fieldStyle} value={giveawayForm.leaderboardMetric} onChange={e=>setGiveawayField('leaderboardMetric',e.target.value)}><option value="balance">In-game MAI Balance</option><option value="referrals">Successful Referrals</option><option value="tasks">Completed Managed Tasks</option></select></label><label style={labelStyle}><span>Eligible Top N</span><input style={fieldStyle} type="number" min="1" value={giveawayForm.leaderboardTop} onChange={e=>setGiveawayField('leaderboardTop',e.target.value)} /></label></div>}
                {giveawayForm.giveawayType==='quiz' && <div style={{marginTop:12,display:'grid',gap:12}}><label style={labelStyle}><span>Quiz Question</span><input style={fieldStyle} value={giveawayForm.quizQuestion} onChange={e=>setGiveawayField('quizQuestion',e.target.value)} placeholder="What is MAI...?" /></label><label style={labelStyle}><span>Choices — one per line</span><textarea style={{...fieldStyle,minHeight:110}} value={giveawayForm.quizOptions} onChange={e=>setGiveawayField('quizOptions',e.target.value)} placeholder={'Choice A\nChoice B\nChoice C'} /></label><label style={labelStyle}><span>Correct Choice Number (1 = first)</span><input style={fieldStyle} type="number" min="1" value={Number(giveawayForm.quizCorrectOption||0)+1} onChange={e=>setGiveawayField('quizCorrectOption',String(Math.max(0,Number(e.target.value||1)-1)))} /></label></div>}
                {giveawayForm.giveawayType==='purchase' && <div className="adminDataGrid" style={{marginTop:12}}><label style={labelStyle}><span>Verified Payment Currency</span><select style={fieldStyle} value={giveawayForm.purchaseCurrency} onChange={e=>setGiveawayField('purchaseCurrency',e.target.value)}><option value="MAI">MAI</option><option value="GRAM">GRAM</option></select></label><label style={labelStyle}><span>Minimum Verified Purchase</span><input style={fieldStyle} type="number" min="0" step="any" value={giveawayForm.minimumPurchase} onChange={e=>setGiveawayField('minimumPurchase',e.target.value)} /></label></div>}
                {giveawayForm.giveawayType==='custom' && <div style={{marginTop:12,display:'grid',gap:12}}><label style={labelStyle}><span>Verification Prompt</span><input style={fieldStyle} value={giveawayForm.customPrompt} onChange={e=>setGiveawayField('customPrompt',e.target.value)} placeholder="Enter the campaign access code" /></label><label style={labelStyle}><span>Correct Answer / Code</span><input style={fieldStyle} value={giveawayForm.customAnswer} onChange={e=>setGiveawayField('customAnswer',e.target.value)} placeholder="Private verification answer" /></label><p className="adminFootnote">The answer is hashed by the backend and is never returned to the Mini App.</p></div>}
                <p className="adminFootnote">All giveaway types use server-side verification. Quiz answers and Custom verification answers are not exposed to users.</p>
                <div className="adminActions" style={{marginTop:14}}>
                  <label><input type="checkbox" checked={giveawayForm.showOnHome} onChange={e=>setGiveawayField('showOnHome',e.target.checked)} /> Show on Home</label>
                  <label><input type="checkbox" checked={giveawayForm.featured} onChange={e=>setGiveawayField('featured',e.target.checked)} /> Featured</label>
                  <label><input type="checkbox" checked={giveawayForm.allowMultipleEntries && ['referral','purchase'].includes(giveawayForm.giveawayType)} disabled={!['referral','purchase'].includes(giveawayForm.giveawayType)} onChange={e=>setGiveawayField('allowMultipleEntries',e.target.checked)} /> Multiple Entries (Referral / Purchase evidence only)</label>
                </div>
                <div className="adminActions" style={{marginTop:14}}>
                  <button onClick={()=>setGiveawayPreview(v=>!v)} disabled={!!busy}>{giveawayPreview?'Close Preview':'Preview'}</button>
                  <button onClick={()=>createGiveaway('draft')} disabled={!!busy}>{busy==='create-giveaway'?'Saving…':'Save as Draft'}</button>
                  <button className="good" onClick={()=>createGiveaway('live')} disabled={!!busy || !verifierReadyTypes.has(giveawayForm.giveawayType)}>{busy==='create-giveaway'?'Publishing…':'Publish Giveaway'}</button>
                </div>
                {giveawayPreview && (
                  <article className="adminListCard" style={{marginTop:14}}>
                    {giveawayForm.imageUrl && <img src={giveawayForm.imageUrl} alt="" style={{width:'100%',maxHeight:260,objectFit:'cover',borderRadius:14,marginBottom:12}} />}
                    <div className="adminListTop"><div className="adminBadgeIcon">🎁</div><div className="adminGrow"><b>{giveawayForm.title || 'Giveaway title'}</b><span>{String(giveawayForm.giveawayType).replaceAll('_',' ')} · User preview{giveawayForm.featured?' · FEATURED':''}</span></div><Status>{giveawayForm.featured?'featured':verifierReadyTypes.has(giveawayForm.giveawayType)?'ready':'draft only'}</Status></div>
                    <p className="adminFootnote">{giveawayForm.description || 'Campaign description will appear here.'}</p>
                    <div className="adminDataGrid"><div><span>Prize Pool</span><b>{fmt(giveawayForm.prizePool)} MAI</b></div><div><span>Winners</span><b>{fmt(giveawayForm.winnerCount)}</b></div><div><span>Start</span><b>{giveawayForm.startsAt || 'Immediately'}</b></div><div><span>End</span><b>{giveawayForm.endsAt || 'Open'}</b></div></div>
                  </article>
                )}
              </section>
            )}

            {giveawayMode==='campaigns' && <div className="adminList">
              {giveaways.map(item=>(
                <article className="adminListCard" key={item.id}>
                  <div className="adminListTop"><div className="adminBadgeIcon">🎁</div><div className="adminGrow"><b>{item.title}</b><span>{String(item.giveaway_type||'giveaway').replaceAll('_',' ')} · {fmt(item.entries)} entries</span></div><Status>{item.status}</Status></div>
                  <div className="adminDataGrid"><div><span>Home Gift</span><b>{item.show_on_home?'ON':'OFF'}</b></div><div><span>Featured</span><b>{item.featured?'YES':'NO'}</b></div><div><span>Start</span><b>{when(item.starts_at)}</b></div><div><span>End</span><b>{when(item.ends_at)}</b></div></div>
                  <div className="adminActions">
                    {['draft','paused','scheduled'].includes(item.status) && <button className="good" onClick={()=>runAction(`give-live-${item.id}`,`/admin/giveaways/${item.id}/status`,{status:'live'})}>Publish</button>}
                    {item.status==='live' && <button className="warn" onClick={()=>runAction(`give-pause-${item.id}`,`/admin/giveaways/${item.id}/status`,{status:'paused'})}>Pause</button>}
                    {!['ended','completed'].includes(item.status) && <button className="danger" onClick={()=>runAction(`give-end-${item.id}`,`/admin/giveaways/${item.id}/status`,{status:'ended'})}>End</button>}
                    {item.status==='ended' && <button onClick={()=>{const n=Number(promptValue('Number of winners:',String(item.config?.winnerCount || 1))); if(n>0)runAction(`give-draw-${item.id}`,`/admin/giveaways/${item.id}/draw`,{winnerCount:n});}}>Draw Winners</button>}
                    {['ended','completed'].includes(item.status) && <button className="danger" disabled={busy===`give-delete-${item.id}`} onClick={()=>deleteGiveawayHistory(item)}>{busy===`give-delete-${item.id}`?'Deleting…':'Delete History'}</button>}
                  </div>
                </article>
              ))}
              {!giveaways.length && <Empty text="No giveaway campaigns." />}
            </div>}
            {giveawayMode==='winners' && <div className="adminList">
              {giveawayWinners.map(item=><article className="adminListCard" key={item.id}><div className="adminListTop"><div className="adminBadgeIcon">🏆</div><div className="adminGrow"><b>{item.giveaway_title}</b><span>UID {item.telegram_id} · @{item.username || 'unknown'}</span></div><Status>{item.payment_status}</Status></div><div className="adminDataGrid"><div><span>Prize</span><b>{fmt(item.prize)} MAI</b></div><div><span>Method</span><b>{item.selection_method}</b></div><div><span>Awarded</span><b>{when(item.paid_at)}</b></div></div>{String(item.payment_status||'').toLowerCase()!=='paid' && <div className="adminActions"><button className="good" disabled={busy===`give-award-${item.id}`} onClick={()=>awardGiveawayPrize(item)}>{busy===`give-award-${item.id}`?'Awarding…':'Award Prize'}</button></div>}</article>)}
              {!giveawayWinners.length && <Empty text="No winners selected yet." />}
            </div>}
            {giveawayMode==='settings' && <section className="adminSection"><div className="adminSectionHead"><div><span>SAFETY</span><h3>Giveaway Publishing Rules</h3></div></div><p className="adminFootnote">Home Gift visibility comes only from active published campaigns with Show on Home enabled. All listed Giveaway types have server-side eligibility checks. Multiple Entries is enabled only for Referral and verified Purchase evidence, where the backend can prove new qualifying evidence. Purchase currently means a verified MAI Network Promote payment; no separate Top-up ledger exists in the current backend.</p></section>}
          </>
        );
      };

      const renderBroadcast = () => {
        const createBroadcast = async () => {
          const title=promptValue('Broadcast title:'); if(!title)return;
          const message=promptValue('Message:'); if(!message)return;
          const destination=promptValue('Destination: mini_app, telegram, both','mini_app');
          const audienceType=promptValue('Audience: all, active, mai_holders, specific','all');
          let audienceConfig={};
          if(audienceType==='specific') audienceConfig.telegramIds=promptValue('Telegram IDs separated by commas:').split(',').map(x=>x.trim()).filter(Boolean);
          await runAction('create-broadcast','/admin/broadcasts',{title,message,destination,audienceType,audienceConfig,priority:'normal'});
        };
        return (
          <>
            <section className="adminSection">
              <div className="adminSectionHead"><div><span>MESSAGE CENTER</span><h3>Broadcast Message</h3></div><button onClick={createBroadcast} disabled={!!busy}>Create Broadcast</button></div>
              <div className="adminActions"><button className={broadcastMode==='create'?'good':''} onClick={()=>setBroadcastMode('create')}>Create / Drafts</button><button className={broadcastMode==='scheduled'?'good':''} onClick={()=>setBroadcastMode('scheduled')}>Scheduled</button><button className={broadcastMode==='sent'?'good':''} onClick={()=>setBroadcastMode('sent')}>Sent History</button></div>
            </section>
            <div className="adminList">
              {broadcasts.filter(x=>broadcastMode==='sent'?x.status==='sent':broadcastMode==='scheduled'?x.status==='scheduled':x.status!=='sent'&&x.status!=='scheduled').map(item=>(
                <article className="adminListCard" key={item.id}>
                  <div className="adminListTop"><div className="adminBadgeIcon">📣</div><div className="adminGrow"><b>{item.title}</b><span>{item.destination} · {item.audience_type}</span></div><Status>{item.status}</Status></div>
                  <p className="adminFootnote">{item.message}</p>
                  <div className="adminDataGrid"><div><span>Targeted</span><b>{fmt(item.targeted_count)}</b></div><div><span>Delivered</span><b>{fmt(item.delivered_count)}</b></div><div><span>Failed</span><b>{fmt(item.failed_count)}</b></div><div><span>Sent</span><b>{when(item.sent_at)}</b></div></div>
                  {item.status!=='sent' && <div className="adminActions"><button className="good" onClick={()=>{const c=promptValue('Type SEND MAI BROADCAST to confirm:'); if(c==='SEND MAI BROADCAST')runAction(`broadcast-send-${item.id}`,`/admin/broadcasts/${item.id}/send`,{confirmation:c});}}>Preview / Confirm / Send</button></div>}
                </article>
              ))}
              {!broadcasts.length && <Empty text="No broadcasts yet." />}
            </div>
          </>
        );
      };

      const renderInvites = () => {
        const o=referralAdmin?.overview || {};
        const rewardTotals=referralAdmin?.rewardTotals || [];
        return (
          <>
            <section className="adminSection">
              <div className="adminSectionHead"><div><span>REFERRAL CONTROL CENTER</span><h3>Active Invites</h3></div></div>
              <div className="adminMiniStats">
                <div><span>Total Invited</span><b>{fmt(o.total_invited)}</b></div>
                <div><span>Successful</span><b>{fmt(o.successful)}</b></div>
                <div><span>Pending</span><b>{fmt(o.pending)}</b></div>
              </div>
              <p className="adminFootnote">Successful invite = required activity completed + the invitee has invited at least one valid new user. Network/device overlap is a review signal only, never proof of fraud.</p>
            </section>
            <div className="adminList">
              {(referralAdmin?.users || []).map(item=>(
                <article className="adminListCard" key={item.telegram_id}>
                  <div className="adminListTop"><div className="adminBadgeIcon">👥</div><div className="adminGrow"><b>@{item.username || 'unknown'}</b><span>UID {item.telegram_id} · invited by {item.referred_by}</span></div><Status>{item.referral_qualified?'successful':'pending'}</Status></div>
                  <div className="adminDataGrid"><div><span>Total Invites</span><b>{fmt(item.total_invites)}</b></div><div><span>Successful</span><b>{fmt(item.successful_invites)}</b></div><div><span>Joined</span><b>{when(item.created_at)}</b></div></div>
                </article>
              ))}
              {!(referralAdmin?.users || []).length && <Empty text="No referral records yet." />}
            </div>
            <section className="adminSection">
              <div className="adminSectionHead"><div><span>REWARD LEDGER</span><h3>Referral Rewards</h3></div></div>
              <div className="adminMiniStats">
                {rewardTotals.map((x,i)=><div key={`${x.reward_type}-${x.status}-${i}`}><span>{x.reward_type} · {x.status}</span><b>{fmt(x.amount)} MAI</b></div>)}
              </div>
            </section>
          </>
        );
      };

      const renderLaunch = () => {
        const preview=launchControl?.preview || {};
        const state=launchControl?.state || {};
        const execute=async()=>{
          const c=promptValue('DANGER: Type LAUNCH MAI NETWORK exactly to archive pre-launch state and execute the one-time official reset:');
          if(c!=='LAUNCH MAI NETWORK')return;
          await runAction('official-launch','/admin/launch-control/execute',{confirmation:c});
        };
        return (
          <>
            <section className="adminSection">
              <div className="adminSectionHead"><div><span>OFFICIAL LAUNCH</span><h3>Launch Control</h3></div><Status>{state.launched?'completed':'pending'}</Status></div>
              <div className="adminMiniStats"><div><span>Users Affected</span><b>{fmt(preview.users)}</b></div><div><span>In-game MAI Reset</span><b>{fmt(preview.game_balance)} MAI</b></div><div><span>Referral Links</span><b>{fmt(preview.referral_links)}</b></div><div><span>Unclaimed Referral Rewards</span><b>{fmt(preview.unclaimedReferralRewards)} MAI</b></div></div>
              {state.launched ? <p className="adminFootnote">MAI NETWORK — OFFICIALLY LAUNCHED · {when(state.officialLaunchAt)}. The destructive launch action is permanently disabled.</p> : <div className="adminActions"><button className="danger" disabled={!!busy} onClick={execute}>Execute Official Launch</button></div>}
            </section>
            <section className="adminSection"><div className="adminSectionHead"><div><span>HARD PROTECTED</span><h3>Never reset by Launch Control</h3></div></div><div className="adminRiskFlags">{(preview.hardProtected || []).map(x=><span key={x}>{x}</span>)}</div></section>
          </>
        );
      };

      const renderCurrent = () => {
        if (tab === 'dashboard') return renderDashboard();
        if (tab === 'users') return renderUsers();
        if (tab === 'multi') return renderMultiAccount();
        if (tab === 'security') return renderSecurity();
        if (tab === 'promotions') return renderPromotions();
        if (tab === 'withdrawals') return renderWithdrawals();
        if (tab === 'fraud') return renderFraudCheck();
        if (tab === 'payments') return renderPayments();
        if (tab === 'audit') return renderAudit();
        if (tab === 'tasks') return renderTasksMissions();
        if (tab === 'giveaway') return renderGiveaway();
        if (tab === 'broadcast') return renderBroadcast();
        if (tab === 'invites') return renderInvites();
        if (tab === 'launch') return renderLaunch();
        return renderSettings();
      };

      const currentLabel =
        [...NAV, ...MODULE_NAV].find(([key]) => key === tab)?.[2] || 'Dashboard';

      const closeMenuAndOpen = key => {
        setTab(key);
        setSelectedUser(null);
        setUserDetail(null);
        setMenuOpen(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };

      return (
        <div className={`adminPanel adminV4 ${menuOpen ? 'menuOpen' : ''}`}>
          <div
            className="adminMobileShade"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          <aside className="adminSidebar">
            <div className="adminBrand">
              <div className="adminBrandMark">M</div>
              <div>
                <b>MAI NETWORK</b>
                <span>Admin Command Center</span>
              </div>
              <button
                className="adminSidebarClose"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="adminSideNav">
              {NAV.map(([key, icon, label]) => (
                <button
                  key={key}
                  className={tab === key ? 'active' : ''}
                  onClick={() => closeMenuAndOpen(key)}
                >
                  <i>{icon}</i>
                  <span>{label}</span>
                  {navCount(key) > 0 && <em>{navCount(key)}</em>}
                </button>
              ))}

              <div className="adminSideDivider">
                <span>SERVER MODULES</span>
              </div>

              {MODULE_NAV.map(([key, icon, label]) => (
                <button
                  key={key}
                  className={tab === key ? 'active' : ''}
                  onClick={() => closeMenuAndOpen(key)}
                >
                  <i>{icon}</i>
                  <span>{label}</span>
                  {key === 'tasks' && managedTasks.filter(x => x.status === 'active').length > 0 && <em>{managedTasks.filter(x => x.status === 'active').length}</em>}
                  {key === 'giveaway' && giveaways.filter(x => x.status === 'live').length > 0 && <em>{giveaways.filter(x => x.status === 'live').length}</em>}
                </button>
              ))}
            </div>

            <div className="adminSidebarFoot">
              <b>MAI NETWORK</b>
              <span>Secure • Fair • Auditable</span>
              <small>Admin V4</small>
            </div>
          </aside>

          <section className="adminWorkspace">
            <header className="adminTopbar">
              <div className="adminTopbarLeft">
                <button
                  className="adminMenuButton"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open admin menu"
                >
                  ☰
                </button>
                <button
                  className="adminBackButton"
                  type="button"
                  onClick={back}
                  aria-label="Back to MAI"
                >
                  ←
                </button>
                <div className="adminMobileTitle">
                  <small>MAI ADMIN</small>
                  <b>{currentLabel}</b>
                </div>
              </div>

              <div className="adminGlobalSearch">
                <span>⌕</span>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  onFocus={() => setTab('users')}
                  placeholder="Search users (UID / @username / wallet)"
                />
              </div>

              <div className="adminTopStatus">
                <span className="adminOnlineDot" />
                <b>Online</b>
              </div>

              <div className="adminAdminChip">
                <i>A</i>
                <div>
                  <b>Admin</b>
                  <small>Authorized</small>
                </div>
              </div>
            </header>

            <main className="adminContent">
              <div className="adminPageHeading">
                <div>
                  <small>MAI NETWORK / {currentLabel.toUpperCase()}</small>
                  <h1>
                    {tab === 'dashboard'
                      ? 'Welcome Back, Admin'
                      : currentLabel}
                  </h1>
                  <p>
                    {tab === 'dashboard'
                      ? 'Monitor, manage and protect the MAI Network.'
                      : 'Server-authoritative administration and review.'}
                  </p>
                </div>
                <button
                  className="adminRefresh"
                  onClick={() => loadAll()}
                  disabled={loading}
                  aria-label="Refresh admin data"
                >
                  ↻
                </button>
              </div>

              {error && (
                <div className="adminAlert bad">
                  <b>Admin request failed</b>
                  <span>{error}</span>
                </div>
              )}

              {notice && <div className="adminToast">{notice}</div>}

              {loading ? <Loader /> : renderCurrent()}
            </main>
          </section>

          {selectedUser && (
            <div
              className="adminModalBackdrop"
              onClick={() => setSelectedUser(null)}
            >
              <section
                className="adminModal adminUserInspector"
                onClick={e => e.stopPropagation()}
              >
                <div className="adminModalHead">
                  <div>
                    <span>USER SECURITY DETAIL</span>
                    <h3>UID {selectedUser}</h3>
                  </div>
                  <button onClick={() => setSelectedUser(null)}>×</button>
                </div>

                {!userDetail ? (
                  <Loader />
                ) : (
                  <>
                    <div className="adminIdentityCard">
                      <div><span>Telegram UID</span><b>{userDetail.user?.telegram_id || selectedUser}</b></div>
                      <div><span>Username</span><b>@{userDetail.user?.username || 'no-username'}</b></div>
                      <div><span>Name</span><b>{userDetail.user?.first_name || '—'}</b></div>
                      <div><span>Account Status</span><Status>{userDetail.user?.account_status}</Status></div>
                      <div><span>Wallet</span><code>{userDetail.user?.wallet_address || 'Not connected'}</code></div>
                      <div><span>Balance</span><b>{fmt(userDetail.user?.balance)} MAI</b></div>
                      <div><span>Mining Level</span><b>Level {userDetail.user?.mining_level || 1}</b></div>
                      <div><span>Mining Rate</span><b>{fmt(userDetail.user?.mining_speed)} / day</b></div>
                      <div><span>Joined</span><b>{when(userDetail.user?.created_at)}</b></div>
                      <div><span>Last Updated</span><b>{when(userDetail.user?.updated_at)}</b></div>
                    </div>

                    <div className="adminInspectorTitle">
                      <div>
                        <small>DEVICE CORRELATION</small>
                        <h4>Registered Device Groups</h4>
                      </div>
                      <span>{(userDetail.security?.devices || []).length} devices</span>
                    </div>

                    <div className="adminDeviceList">
                      {(userDetail.security?.devices || []).map((device, deviceIndex) => {
                        const linkedForDevice =
                          (userDetail.security?.linkedDeviceAccounts || [])
                            .filter(account =>
                              Array.isArray(account.shared_device_hashes) &&
                              account.shared_device_hashes.includes(device.device_hash)
                            );

                        return (
                          <article
                            className="adminDeviceCard adminDeviceGroupCard"
                            key={device.device_hash}
                          >
                            <div className="adminDeviceGroupHead">
                              <div>
                                <small>DEVICE GROUP #{String(deviceIndex + 1).padStart(2, '0')}</small>
                                <h4>{device.device_label || 'Unknown device'}</h4>
                                <code>{short(device.device_hash, 12, 10)}</code>
                              </div>
                              <span className="adminDeviceCount">
                                {device.account_count || 1} accounts
                              </span>
                            </div>

                            <div className="adminDeviceMeta">
                              <span>First seen <b>{when(device.first_seen)}</b></span>
                              <span>Last seen <b>{when(device.last_seen)}</b></span>
                            </div>

                            <div className="adminGroupTableWrap">
                              <table className="adminTable adminLinkedTable">
                                <thead>
                                  <tr>
                                    <th>#</th>
                                    <th>UID</th>
                                    <th>Username</th>
                                    <th>Wallet</th>
                                    <th>Last Match</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td>1</td>
                                    <td>{userDetail.user?.telegram_id}</td>
                                    <td>@{userDetail.user?.username || 'no-username'}</td>
                                    <td><code>{short(userDetail.user?.wallet_address, 8, 5)}</code></td>
                                    <td>Owner</td>
                                  </tr>
                                  {linkedForDevice.map((item, index) => (
                                    <tr key={`${device.device_hash}-${item.telegram_id}`}>
                                      <td>{index + 2}</td>
                                      <td>{item.telegram_id}</td>
                                      <td>@{item.username || 'no-username'}</td>
                                      <td><code>{short(item.wallet_address, 8, 5)}</code></td>
                                      <td>{when(item.last_seen)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </article>
                        );
                      })}
                      {!(userDetail.security?.devices || []).length && (
                        <Empty text="No registered device records." />
                      )}
                    </div>

                    <p className="adminFootnote">
                      Device labels are best-effort Telegram WebView/browser labels.
                      Device IDs shown here are privacy-safe server hashes, not raw
                      hardware identifiers.
                    </p>

                    <div className="adminInspectorTitle">
                      <div>
                        <small>NETWORK CORRELATION</small>
                        <h4>Shared IP Signals</h4>
                      </div>
                    </div>

                    <div className="adminTableWrap adminModalTable">
                      <table className="adminTable">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>UID</th>
                            <th>User</th>
                            <th>Shared Signals</th>
                            <th>Last Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(userDetail.security?.sharedIpAccounts || []).map((item, index) => (
                            <tr key={item.telegram_id}>
                              <td>{index + 1}</td>
                              <td>{item.telegram_id}</td>
                              <td>@{item.username || 'no-username'}</td>
                              <td>{item.shared_ip_count || 1}</td>
                              <td>{when(item.last_seen)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!(userDetail.security?.sharedIpAccounts || []).length && (
                        <Empty text="No other accounts share observed IP signals." />
                      )}
                    </div>

                    <div className="adminInspectorTitle">
                      <div>
                        <small>SECURITY HISTORY</small>
                        <h4>Recent Security Logs</h4>
                      </div>
                    </div>

                    <div className="adminLogBox">
                      {(userDetail.security?.logs || []).slice(0, 30).map((log, index) => (
                        <div key={`${log.created_at}-${index}`}>
                          <Status>{log.severity}</Status>
                          <b>{log.action}</b>
                          <small>{when(log.created_at)}</small>
                        </div>
                      ))}
                      {!(userDetail.security?.logs || []).length && (
                        <Empty text="No security logs." />
                      )}
                    </div>

                    <div className="adminInspectorActions">
                      <button onClick={() => messageUser(userDetail.user)}>Message</button>
                      {userDetail.user?.account_status === 'active' ? (
                        <>
                          <button className="warn" onClick={() => suspendUser(userDetail.user)}>Suspend</button>
                          <button className="danger" onClick={() => banUser(userDetail.user)}>Ban</button>
                        </>
                      ) : (
                        <button className="good" onClick={() => restoreUser(userDetail.user)}>Restore Access</button>
                      )}
                    </div>
                  </>
                )}
                <button
                  type="button"
                  className="adminMobileInspectorClose"
                    onClick={() => setSelectedUser(null)}
                    >
                    ✕ Close Inspector
                    </button>
              </section>
            </div>
          )}
        </div>
      );
    }

    export default AdminPanel;
