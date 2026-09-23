import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './friends.css';

const DEFAULT_BOT_USERNAME = 'mai_accesstoken_bot';

function getTelegramWebApp() {
  if (
    typeof window !== 'undefined' &&
    window.Telegram &&
    window.Telegram.WebApp
  ) {
    return window.Telegram.WebApp;
  }

  return null;
}

function getUserTelegramId(user) {
  return (
    user?.telegramId ??
    user?.telegram_id ??
    user?.telegramUserId ??
    user?.id ??
    ''
  );
}

function getUserName(user) {
  return (
    user?.firstName ||
    user?.first_name ||
    user?.username ||
    user?.name ||
    'MAI User'
  );
}

export default function Friends({
  user,
  initData = '',
  apiUrl = ''
}) {
  const [friends, setFriends] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    successful: 0,
    pending: 0
  });
  const [rewards, setRewards] = useState({
    successfulInviteRewards: 0,
    referralFarmingRewards: 0
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);

  const telegramId = getUserTelegramId(user);
  const botUsername =
    process.env.REACT_APP_BOT_USERNAME ||
    DEFAULT_BOT_USERNAME;

  const cleanApiUrl =
    String(apiUrl || '').replace(/\/+$/, '');

  const inviteLink =
    telegramId
      ? `https://t.me/${botUsername}/app?startapp=r_${telegramId}`
      : '';

  const authHeaders = () => {
    const headers = {
      'Content-Type': 'application/json'
    };

    const rawInitData =
      initData ||
      getTelegramWebApp()?.initData ||
      '';

    if (rawInitData) {
      headers['X-Telegram-Init-Data'] =
        rawInitData;
    } else if (
      process.env.REACT_APP_DEV_USER_ID
    ) {
      headers['X-Dev-User'] =
        process.env.REACT_APP_DEV_USER_ID;
    }

    try {
      const device =
        localStorage.getItem('mai_device_id');

      if (device) {
        headers['X-MAI-Device-ID'] =
          device;
      }
    } catch {}

    return headers;
  };

  const request = async (
    path,
    options = {}
  ) => {
    if (!cleanApiUrl) {
      throw new Error(
        'MAI API URL is not configured.'
      );
    }

    const response =
      await fetch(
        `${cleanApiUrl}${path}`,
        {
          ...options,
          headers: {
            ...authHeaders(),
            ...(options.headers || {})
          }
        }
      );

    const data =
      await response
        .json()
        .catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message ||
        'Request failed'
      );
    }

    return data;
  };

  const loadFriends = async ({
    quiet = false
  } = {}) => {
    if (!quiet) {
      setLoading(true);
    }

    setError('');

    try {
      const data =
        await request(
          '/api/referrals/v2'
        );

      const items =
        Array.isArray(data.items)
          ? data.items
          : [];

      setFriends(items);

      setSummary({
        total:
          Number(
            data.total ??
            items.length
          ) || 0,
        successful:
          Number(
            data.successful ??
            items.filter(
              item =>
                item.status ===
                'successful'
            ).length
          ) || 0,
        pending:
          Number(
            data.pending ??
            items.filter(
              item =>
                item.status !==
                'successful'
            ).length
          ) || 0
      });

      setRewards({
        successfulInviteRewards:
          Number(
            data.rewards
              ?.successfulInviteRewards ||
            0
          ),
        referralFarmingRewards:
          Number(
            data.rewards
              ?.referralFarmingRewards ||
            0
          )
      });
    } catch (requestError) {
      /*
       * Keep the page usable if the new endpoint is temporarily
       * unavailable. Existing referral data may still be shown,
       * but no client-side reward is invented or credited.
       */
      const fallback =
        Array.isArray(user?.referrals)
          ? user.referrals
          : Array.isArray(user?.friends)
            ? user.friends
            : [];

      setFriends(fallback);

      setSummary({
        total:
          Number(
            user?.referralCount ??
            user?.referralsCount ??
            user?.friendCount ??
            fallback.length
          ) || 0,
        successful:
          fallback.filter(
            item =>
              item.referral_qualified ||
              item.status ===
                'successful'
          ).length,
        pending:
          fallback.filter(
            item =>
              !item.referral_qualified &&
              item.status !==
                'successful'
          ).length
      });

      setRewards({
        successfulInviteRewards: 0,
        referralFarmingRewards: 0
      });

      setError(
        requestError.message ||
        'Referral service is temporarily unavailable.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!telegramId) {
      setLoading(false);
      return;
    }

    loadFriends();
  }, [
    telegramId,
    cleanApiUrl,
    initData
  ]);

  const copyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(
        inviteLink
      );

      setCopied(true);
      setNotice('Invite link copied.');

      setTimeout(
        () => setCopied(false),
        1800
      );
    } catch {
      try {
        const area =
          document.createElement(
            'textarea'
          );

        area.value = inviteLink;
        area.setAttribute(
          'readonly',
          ''
        );
        area.style.position =
          'fixed';
        area.style.opacity = '0';

        document.body.appendChild(
          area
        );

        area.select();
        document.execCommand(
          'copy'
        );
        area.remove();

        setCopied(true);
        setNotice(
          'Invite link copied.'
        );
      } catch {
        setError(
          'Could not copy the invite link.'
        );
      }
    }
  };

  const shareInvite = () => {
    if (!inviteLink) return;

    const message =
      '🚀 Join MAI Network — Mine • Invite • Earn. Start your MAI journey with me!';

    const shareUrl =
      `https://t.me/share/url?url=${encodeURIComponent(
        inviteLink
      )}&text=${encodeURIComponent(
        message
      )}`;

    const webApp = getTelegramWebApp();

    if (webApp?.openTelegramLink) {
      webApp.openTelegramLink(
        shareUrl
      );
      return;
    }

    window.open(
      shareUrl,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const claimReward = async (
    type
  ) => {
    if (busy) return;

    const amount =
      type === 'successful'
        ? rewards.successfulInviteRewards
        : rewards.referralFarmingRewards;

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setNotice(
        'No rewards are available to claim.'
      );
      return;
    }

    setBusy(type);
    setError('');
    setNotice('');

    try {
      const data =
        await request(
          `/api/referrals/rewards/${type}/claim`,
          {
            method: 'POST',
            body: JSON.stringify({})
          }
        );

      const claimed =
        Number(
          data.claimed || 0
        );

      setNotice(
        `Claimed ${claimed.toLocaleString(
          undefined,
          {
            maximumFractionDigits: 8
          }
        )} MAI.`
      );

      if (
        data.rewards &&
        typeof data.rewards ===
          'object'
      ) {
        setRewards({
          successfulInviteRewards:
            Number(
              data.rewards
                .successfulInviteRewards ||
              0
            ),
          referralFarmingRewards:
            Number(
              data.rewards
                .referralFarmingRewards ||
              0
            )
        });
      }

      /*
       * The parent may refresh the authoritative user after the
       * claim through its normal user/profile refresh flow.
       * Friends.js does not mutate the main balance locally.
       */
      await loadFriends({
        quiet: true
      });
    } catch (claimError) {
      setError(
        claimError.message ||
        'Reward claim failed.'
      );
    } finally {
      setBusy('');
    }
  };

  const displayName = item =>
    item.first_name ||
    item.firstName ||
    item.username ||
    `User ${String(
      item.telegram_id ||
      item.telegramId ||
      item.id ||
      ''
    ).slice(-6)}`;

  const statusOf = item => {
    const status =
      String(
        item.status ||
        ''
      ).toLowerCase();

    if (
      status ===
      'successful' ||
      item.referral_qualified
    ) {
      return 'successful';
    }

    if (
      status ===
      'review_required' ||
      status ===
      'under_review'
    ) {
      return 'review';
    }

    return 'pending';
  };

  const fmtMai = value =>
    Number(value || 0).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 8
      }
    );

  return (
    <section className="friends-page">
      <header className="friends-heading">
        <span>GROW TOGETHER</span>
        <h1>Invite Friends</h1>
        <p>
          Build a verified MAI referral
          network and earn from genuine
          successful referrals.
        </p>
      </header>

      <section className="friends-hero">
        <div className="friends-hero-glow" />

        <div className="friends-hero-copy">
          <span>MAI REFERRAL NETWORK</span>
          <h2>Invite. Qualify. Earn.</h2>
          <p>
            A friend becomes a successful
            referral only after completing
            the required activity and
            inviting at least one valid new
            MAI user.
          </p>
        </div>
      </section>

      <section className="friends-stats">
        <div>
          <span>TOTAL INVITES</span>
          <b>{summary.total}</b>
        </div>

        <div>
          <span>SUCCESSFUL</span>
          <b>{summary.successful}</b>
        </div>

        <div>
          <span>PENDING</span>
          <b>{summary.pending}</b>
        </div>
      </section>

      <section className="invite-card">
        <div className="invite-card-head">
          <div>
            <span>YOUR INVITE LINK</span>
            <h3>Invite a new MAI user</h3>
          </div>

          <span className="invite-secure">
            VERIFIED
          </span>
        </div>

        <div className="invite-link-box">
          <code>
            {inviteLink ||
              'Telegram user ID is unavailable'}
          </code>

          <button
            type="button"
            disabled={!inviteLink}
            onClick={copyInviteLink}
          >
            {copied
              ? 'COPIED ✓'
              : 'COPY'}
          </button>
        </div>

        <button
          type="button"
          className="invite-share-btn"
          disabled={!inviteLink}
          onClick={shareInvite}
        >
          INVITE FRIEND
        </button>

        <p className="invite-note">
          Opening the link alone does not
          create a successful referral.
          Qualification is verified by the
          MAI backend.
        </p>
      </section>

      <section className="referral-reward-grid">
        <article className="referral-reward-card">
          <div className="referral-reward-icon">
            50
          </div>

          <div className="referral-reward-copy">
            <span>
              SUCCESSFUL INVITE REWARDS
            </span>
            <h3>
              {fmtMai(
                rewards
                  .successfulInviteRewards
              )}{' '}
              MAI
            </h3>
            <p>
              50 MAI for each referral
              that becomes Successful.
              Rewards stay here until you
              claim them.
            </p>
          </div>

          <button
            type="button"
            disabled={
              busy === 'successful' ||
              rewards
                .successfulInviteRewards <=
                0
            }
            onClick={() =>
              claimReward(
                'successful'
              )
            }
          >
            {busy === 'successful'
              ? 'CLAIMING…'
              : 'CLAIM'}
          </button>
        </article>

        <article className="referral-reward-card farming">
          <div className="referral-reward-icon">
            5%
          </div>

          <div className="referral-reward-copy">
            <span>
              REFERRAL FARMING REWARDS
            </span>
            <h3>
              {fmtMai(
                rewards
                  .referralFarmingRewards
              )}{' '}
              MAI
            </h3>
            <p>
              Earn 5% when your successful
              referrals make an eligible
              farming claim. Their own
              reward is not reduced.
            </p>
          </div>

          <button
            type="button"
            disabled={
              busy === 'farming' ||
              rewards
                .referralFarmingRewards <=
                0
            }
            onClick={() =>
              claimReward('farming')
            }
          >
            {busy === 'farming'
              ? 'CLAIMING…'
              : 'CLAIM REWARDS'}
          </button>
        </article>
      </section>

      {notice && (
        <div className="friends-notice">
          {notice}
        </div>
      )}

      {error && (
        <div className="friends-error">
          {error}
        </div>
      )}

      <section className="friends-list-card">
        <div className="friends-list-head">
          <div>
            <span>
              REFERRAL PROGRESS
            </span>
            <h3>Your Friends</h3>
          </div>

          <b>{summary.total}</b>
        </div>

        {loading ? (
          <div className="friends-loading">
            Loading referral status...
          </div>
        ) : friends.length ? (
          <div className="friends-list">
            {friends.map(
              (friend, index) => {
                const id =
                  friend.telegram_id ||
                  friend.telegramId ||
                  friend.id ||
                  index;

                const status =
                  statusOf(friend);

                const requirements =
                  friend.requirements ||
                  {};

                const activityDone =
                  Boolean(
                    requirements
                      .requiredTasks ??
                    friend
                      .required_activity_done
                  );

                const invitedOne =
                  Boolean(
                    requirements
                      .inviteOneUser ??
                    (
                      Number(
                        friend
                          .invited_users ||
                        0
                      ) >= 1
                    )
                  );

                return (
                  <article
                    className="friend-row referral-progress-row"
                    key={id}
                  >
                    <div className="friend-avatar">
                      {friend.photo_url ||
                      friend.photoUrl ? (
                        <img
                          src={
                            friend.photo_url ||
                            friend.photoUrl
                          }
                          alt=""
                        />
                      ) : (
                        <span>
                          {displayName(
                            friend
                          )
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="friend-info">
                      <b>
                        {displayName(
                          friend
                        )}
                      </b>

                      <span>
                        Telegram ID:{' '}
                        {friend.telegram_id ||
                          friend.telegramId ||
                          friend.id ||
                          '—'}
                      </span>

                      <div className="referral-requirements">
                        <span
                          className={
                            activityDone
                              ? 'done'
                              : 'waiting'
                          }
                        >
                          Required Activity{' '}
                          {activityDone
                            ? '✓'
                            : '⏳'}
                        </span>

                        <span
                          className={
                            invitedOne
                              ? 'done'
                              : 'waiting'
                          }
                        >
                          Invite 1 Valid User{' '}
                          {invitedOne
                            ? '✓'
                            : '⏳'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`referral-status ${status}`}
                    >
                      {status ===
                      'successful'
                        ? 'SUCCESSFUL'
                        : status ===
                            'review'
                          ? 'UNDER REVIEW'
                          : 'PENDING'}
                    </span>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div className="friends-empty">
            <b>No referrals yet</b>
            <span>
              Share your personal invite
              link to get started.
            </span>
          </div>
        )}
      </section>

      <section className="friends-how">
        <span>HOW IT WORKS</span>

        <div>
          <b>1</b>
          <p>
            Share your personal MAI invite
            link with a genuinely new user.
          </p>
        </div>

        <div>
          <b>2</b>
          <p>
            Your invited friend completes
            the required activity and
            invites at least one valid new
            MAI user.
          </p>
        </div>

        <div>
          <b>3</b>
          <p>
            The referral becomes
            Successful and 50 MAI is added
            once to your separate
            Successful Invite Rewards.
          </p>
        </div>

        <div>
          <b>4</b>
          <p>
            When that successful referral
            makes an eligible farming
            claim, 5% is added to your
            separate Referral Farming
            Rewards. Claim either bucket
            when available.
          </p>
        </div>
      </section>

      <footer className="friends-footer">
        <span>
          Current user
        </span>
        <b>
          {telegramId
            ? `#${telegramId}`
            : 'Telegram user unavailable'}
        </b>
      </footer>
    </section>
  );
}
