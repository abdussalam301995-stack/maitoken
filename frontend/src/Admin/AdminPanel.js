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

    const LOCKED_NAV = [
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

      const loadAll = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        setError('');

        const requests = [
          ['dashboard', adminApi('/admin/dashboard')],
          ['users', adminApi('/admin/users')],
          ['withdrawals', adminApi('/admin/withdrawals')],
          ['campaigns', adminApi('/admin/campaigns')],
          ['audit', adminApi('/admin/audit-logs?limit=150')],
          ['security', adminApi('/admin/security/config')]
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
          });
          if (failed.length) setError(`Some admin data could not be loaded — ${failed.join(' | ')}`);
        } finally {
          setLoading(false);
        }
      }, []);

      useEffect(() => {
        loadAll();
      }, [loadAll]);

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

              {['approved', 'processing'].includes(item.status) && (
                <div className="adminActions">
                  <button
                    className="good"
                    disabled={!!busy}
                    onClick={() => {
                      const txHash = String(window.prompt('Paid transaction hash:', '') || '').trim();
                      if (!txHash) return;
                      runAction(
                        `withdraw-complete-${item.id}`,
                        `/admin/withdrawals/${item.id}/complete`,
                        { txHash }
                      );
                    }}
                  >
                    Mark Paid
                  </button>
                </div>
              )}
            </article>
          ))}
          {!withdrawals.length && <Empty text="No pending withdrawal work." />}
        </div>
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
        return renderSettings();
      };

      const currentLabel =
        NAV.find(([key]) => key === tab)?.[2] || 'Dashboard';

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

              {LOCKED_NAV.map(([key, icon, label]) => (
                <button
                  key={key}
                  className="adminLockedNav"
                  disabled
                  title="Backend module not enabled yet"
                >
                  <i>{icon}</i>
                  <span>{label}</span>
                  <small>LOCKED</small>
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
              </section>
            </div>
          )}
        </div>
      );
    }

    export default AdminPanel;
