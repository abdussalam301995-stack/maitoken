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
      ['security', '🛡', 'Security'],
      ['promotions', '🚀', 'Promotions'],
      ['withdrawals', '↗', 'Withdrawals'],
      ['payments', '◈', 'Payments'],
      ['audit', '☷', 'Audit'],
      ['settings', '⚙', 'Settings']
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
        if (key === 'security') return Number(dashboard?.security_warnings_24h || 0);
        if (key === 'promotions') return Number(dashboard?.pending_campaigns || 0);
        if (key === 'withdrawals') return Number(dashboard?.pending_withdrawals || 0);
        return 0;
      };

      const renderDashboard = () => {
        const cards = [
          ['Total Users', dashboard?.total_users, 'All registered MAI accounts', '👥'],
          ['Pending Promotions', dashboard?.pending_campaigns, 'Paid and waiting for review', '🚀'],
          ['Pending Withdrawals', dashboard?.pending_withdrawals, 'Requires admin processing', '↗'],
          ['Security Warnings', dashboard?.security_warnings_24h, 'Warnings in the last 24 hours', '🛡'],
          ['Active Campaigns', dashboard?.active_campaigns, 'Approved and published', '✓'],
          ['Risky Withdrawals', dashboard?.risky_withdrawals, 'Security-check queue', '!'],
          ['Banned Users', dashboard?.banned_users, 'Access blocked', '⊘'],
          ['Suspended Users', dashboard?.suspended_users, 'Temporary restrictions', '⏱']
        ];

        return (
          <>
            <section className="adminHero">
              <div>
                <span className="adminEyebrow">LIVE OPERATIONS</span>
                <h2>Network Overview</h2>
                <p>
                  Secure operational view of MAI Network users, payments,
                  promotions, withdrawals and risk signals.
                </p>
              </div>
              <button className="adminRefresh" onClick={() => loadAll()} disabled={loading}>
                ↻
              </button>
            </section>

            <div className="adminMetricGrid">
              {cards.map(([label, value, sub, icon]) => (
                <article className="adminMetric" key={label}>
                  <div className="adminMetricIcon">{icon}</div>
                  <span>{label}</span>
                  <strong>{fmt(value)}</strong>
                  <small>{sub}</small>
                </article>
              ))}
            </div>

            <section className="adminSection">
              <div className="adminSectionHead">
                <div>
                  <span>SECURITY SNAPSHOT</span>
                  <h3>Device & Risk Signals</h3>
                </div>
                <button onClick={() => setTab('security')}>Open →</button>
              </div>
              <div className="adminMiniStats">
                <div><span>Known Devices</span><b>{fmt(dashboard?.known_devices)}</b></div>
                <div><span>Shared Devices</span><b>{fmt(dashboard?.shared_devices)}</b></div>
                <div><span>24h Warnings</span><b>{fmt(dashboard?.security_warnings_24h)}</b></div>
              </div>
              <p className="adminFootnote">
                Shared IP/device matches are risk signals only. They are not treated as proof of abuse.
              </p>
            </section>
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

      const renderCurrent = () => {
        if (tab === 'dashboard') return renderDashboard();
        if (tab === 'users') return renderUsers();
        if (tab === 'security') return renderSecurity();
        if (tab === 'promotions') return renderPromotions();
        if (tab === 'withdrawals') return renderWithdrawals();
        if (tab === 'payments') return renderPayments();
        if (tab === 'audit') return renderAudit();
        return renderSettings();
      };

      return (
        <div className="adminPanel">
          <header className="adminHeader">
            <button type="button" onClick={back} aria-label="Back">←</button>
            <div>
              <small>MAI NETWORK</small>
              <h1>Admin Control Center</h1>
            </div>
            <span className="adminLive">LIVE</span>
          </header>

          <nav className="adminNav" aria-label="Admin sections">
            {NAV.map(([key, icon, label]) => (
              <button
                key={key}
                className={tab === key ? 'active' : ''}
                onClick={() => {
                  setTab(key);
                  setSelectedUser(null);
                  setUserDetail(null);
                }}
              >
                <i>{icon}</i>
                <span>{label}</span>
                {navCount(key) > 0 && <em>{navCount(key)}</em>}
              </button>
            ))}
          </nav>

          <main className="adminContent">
            {error && (
              <div className="adminAlert bad">
                <b>Admin request failed</b>
                <span>{error}</span>
              </div>
            )}

            {notice && <div className="adminToast">{notice}</div>}

            {loading ? <Loader /> : renderCurrent()}
          </main>

          {selectedUser && (
            <div className="adminModalBackdrop" onClick={() => setSelectedUser(null)}>
              <section className="adminModal" onClick={e => e.stopPropagation()}>
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

                    <h4>Registered Devices</h4>
                    <div className="adminDeviceList">
                      {(userDetail.security?.devices || []).map(device => (
                        <div className="adminDeviceCard" key={device.device_hash}>
                          <div><span>Device</span><b>{device.device_label || 'Unknown device'}</b></div>
                          <div><span>Device ID</span><code>{short(device.device_hash,12,10)}</code></div>
                          <div><span>Accounts on device</span><b>{device.account_count || 1}</b></div>
                          <div><span>First seen</span><small>{when(device.first_seen)}</small></div>
                          <div><span>Last seen</span><small>{when(device.last_seen)}</small></div>
                        </div>
                      ))}
                      {!(userDetail.security?.devices || []).length && <Empty text="No registered device records." />}
                    </div>
                    <p className="adminFootnote">Device names are best-effort labels from the Telegram WebView/browser. Device ID is a server-side hash, not a raw hardware identifier.</p>

                    <h4>Linked Accounts · Same Device</h4>
                    <div className="adminCompactList">
                      {(userDetail.security?.linkedDeviceAccounts || []).map(item => (
                        <div className="adminRelationRow" key={item.telegram_id}>
                          <div><b>{item.first_name || 'MAI User'}</b><span>@{item.username || 'no-username'} · UID {item.telegram_id}</span></div>
                          <div><strong>{item.shared_device_count || 1} shared device</strong><small>Last match {when(item.last_seen)}</small></div>
                        </div>
                      ))}
                      {!(userDetail.security?.linkedDeviceAccounts || []).length && <Empty text="No other accounts share a registered device." />}
                    </div>

                    <h4>Linked Accounts · Shared IP</h4>
                    <div className="adminCompactList">
                      {(userDetail.security?.sharedIpAccounts || []).map(item => (
                        <div className="adminRelationRow" key={item.telegram_id}>
                          <div><b>{item.first_name || 'MAI User'}</b><span>@{item.username || 'no-username'} · UID {item.telegram_id}</span></div>
                          <div><strong>{item.shared_ip_count || 1} shared IP signal</strong><small>Last match {when(item.last_seen)}</small></div>
                        </div>
                      ))}
                      {!(userDetail.security?.sharedIpAccounts || []).length && <Empty text="No other accounts share observed IP signals." />}
                    </div>

                    <h4>Recent Security Logs</h4>
                    <div className="adminLogBox">
                      {(userDetail.security?.logs || []).slice(0, 30).map((log, index) => (
                        <div key={`${log.created_at}-${index}`}>
                          <Status>{log.severity}</Status>
                          <b>{log.action}</b>
                          <small>{when(log.created_at)}</small>
                        </div>
                      ))}
                      {!(userDetail.security?.logs || []).length && <Empty text="No security logs." />}
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
