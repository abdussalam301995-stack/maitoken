    require('dotenv').config();

    const express = require('express');
    const cors = require('cors');
    const helmet = require('helmet');
    const crypto = require('crypto');

    // =========================================================
    // TON PAYOUT SDK
    // Secrets are read only from server environment variables.
    // =========================================================
    const {
      Address,
      beginCell,
      internal,
      SendMode,
      toNano
    } = require('@ton/core');

    const {
      TonClient,
      WalletContractV5R1,
      JettonMaster
    } = require('@ton/ton');

    const {
      mnemonicToPrivateKey
    } = require('@ton/crypto');

    const {
      MAI_MINING_LEVELS,
      getMiningLevelForHolding,
      getMiningLevel
    } = require('./MAI_MINING_LEVELS_1_650_APPROVED');

    const {
      Pool
    } = require('pg');


    const app = express();

    app.set(
      'trust proxy',
      1
    );


    /* =========================================================
       MAI NETWORK
       SERVER.JS — PART 1 / 4

       Core configuration
       Security
       Telegram configuration
       TON / MAI configuration
       Tasks
       Promote pricing
       Database
       Helpers
       Rate limit
       ========================================================= */


    /* =========================================================
       BASIC CONFIG
       ========================================================= */

    const PORT =
      Number(
        process.env.PORT ||
        5000
      );


    const BOT_TOKEN =
      String(
        process.env.BOT_TOKEN ||
        ''
      ).trim();


    const BOT_USERNAME =
      String(
        process.env.BOT_USERNAME ||
        'maitoken_bot'
      )
        .trim()
        .replace(
          /^@+/,
          ''
        );


    const CLIENT_ORIGIN =
      String(
        process.env.CLIENT_ORIGIN ||
        'http://localhost:3000'
      );


    const IS_PRODUCTION =
      String(process.env.NODE_ENV || 'production').toLowerCase() !== 'development';

    // SECURITY: development authentication can never be enabled in production.
    const ALLOW_DEV_AUTH =
      !IS_PRODUCTION &&
      String(
        process.env.ALLOW_DEV_AUTH ||
        ''
      ).toLowerCase() ===
      'true';

    const TELEGRAM_AUTH_MAX_AGE = Math.max(
      300,
      Math.min(Number(process.env.TELEGRAM_AUTH_MAX_AGE || 3600), 86400)
    );


    const ADMIN_KEY =
      String(
        process.env.ADMIN_KEY ||
        ''
      );

      const ADMIN_TELEGRAM_IDS =
  new Set(
    String(
      process.env.ADMIN_TELEGRAM_IDS || ''
    )
      .split(',')
      .map(id => id.trim())
      .filter(id => /^\d+$/.test(id))
  );

    const isProtectedAdminTelegramId = value =>
      ADMIN_TELEGRAM_IDS.has(String(value || '').trim());

    // SECURITY: Telegram adds this value to every genuine webhook request.
    // Configure TELEGRAM_WEBHOOK_SECRET in Render with 32+ random characters.
    const TELEGRAM_WEBHOOK_SECRET =
      String(
        process.env.TELEGRAM_WEBHOOK_SECRET ||
        ''
      ).trim();


    /* =========================================================
       PUBLIC URL / MINI APP
       ========================================================= */

    const MINI_APP_URL =
      String(
        process.env.MINI_APP_URL ||
        CLIENT_ORIGIN
          .split(',')[0] ||
        ''
      )
        .trim()
        .replace(
          /\/$/,
          ''
        );


    const PUBLIC_BASE_URL =
      String(
        process.env.PUBLIC_BASE_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        ''
      )
        .trim()
        .replace(
          /\/$/,
          ''
        );


    /* =========================================================
       SUPPORT / COMMUNITY
       ========================================================= */

    const SUPPORT_URL =
      String(
        process.env.SUPPORT_URL ||
        'https://t.me/MAI_News_Official'
      ).trim();


    const NEWS_URL =
      String(
        process.env.NEWS_LINK ||
        'https://t.me/MAI_News_Official'
      ).trim();


    const PAYOUT_URL =
      String(
        process.env.PAYOUT_LINK ||
        'https://t.me/MAI_Payout_Proof'
      ).trim();


    const COMMUNITY_URL =
      String(
        process.env.COMMUNITY_LINK ||
        'https://t.me/MAICommunityChat'
      ).trim();


    /* =========================================================
       TELEGRAM WELCOME MESSAGE
       ========================================================= */

    const WELCOME_PHOTO_URL =
      String(
        process.env.WELCOME_PHOTO_URL ||
        (
          MINI_APP_URL
            ? `${MINI_APP_URL}/assets/mai-welcome.jpg`
            : ''
        )
      );


    const WELCOME_TEXT =
      process.env.WELCOME_TEXT ||
      [
        '👋 Welcome to MAI Network!',
        '',
        '🚀 Your MAI mining journey starts here.',
        '',
        '⛏ Mine MAI every day',
        '🎁 Claim your daily rewards',
        '👥 Invite friends and grow together',
        '💎 Connect your TON wallet',
        '',
        'Tap the button below to enter MAI Network.'
      ].join('\n');


    /* =========================================================
       ALLOWED ORIGINS
       ========================================================= */

    const allowedOrigins =
      CLIENT_ORIGIN
        .split(',')
        .map(
          value =>
            value.trim()
        )
        .filter(Boolean);


    /* =========================================================
       MAI TOKEN / TON API
       ========================================================= */

    const MAI_JETTON_MASTER =
      String(
        process.env.MAI_JETTON_MASTER ||
        'EQD5pWilwl9ypQ1JFxoDktsQl_LAALALnqHjZoxhx_2nET-r'
      ).trim();


    const TONAPI_BASE =
      String(
        process.env.TONAPI_BASE ||
        'https://tonapi.io/v2'
      )
        .trim()
        .replace(
          /\/$/,
          ''
        );


    const TONAPI_KEY =
      String(
        process.env.TONAPI_KEY ||
        ''
      ).trim();


    const MAI_DECIMALS =
      Number(
        process.env.MAI_DECIMALS ||
        9
      );


    /* =========================================================
       MAI PAYOUT WALLET / WORKER

       IMPORTANT:
       - Keep MAI_PAYOUT_ENABLED=false until controlled testing.
       - MAI_PAYOUT_MNEMONIC must exist only in Render secrets.
       - The derived W5 address MUST equal MAI_PAYOUT_WALLET.
       ========================================================= */

    const MAI_PAYOUT_WALLET =
      String(
        process.env.MAI_PAYOUT_WALLET ||
        'UQAbhVECcLMyaHiPrnX52TSlTeHm5NQZOQeVlm_WfzhN27mc'
      ).trim();

    const MAI_PAYOUT_ENABLED =
      String(
        process.env.MAI_PAYOUT_ENABLED ||
        'false'
      ).toLowerCase() === 'true';

    const MAI_PAYOUT_MNEMONIC =
      String(
        process.env.MAI_PAYOUT_MNEMONIC ||
        ''
      ).trim();

    const TON_RPC_ENDPOINT =
      String(
        process.env.TON_RPC_ENDPOINT ||
        'https://toncenter.com/api/v2/jsonRPC'
      ).trim();

    const TONCENTER_V3_BASE =
      String(
        process.env.TONCENTER_V3_BASE ||
        'https://toncenter.com/api/v3'
      ).trim().replace(/\/$/, '');

    const TONCENTER_API_KEY =
      String(
        process.env.TONCENTER_API_KEY ||
        process.env.TONAPI_KEY ||
        ''
      ).trim();

    const MAI_PAYOUT_WORKER_INTERVAL_MS =
      Math.max(
        15000,
        Number(process.env.MAI_PAYOUT_WORKER_INTERVAL_MS || 30000)
      );

    const MAI_PAYOUT_ATTACHED_TON =
      String(
        process.env.MAI_PAYOUT_ATTACHED_TON ||
        '0.08'
      ).trim();

    const MAI_PAYOUT_FORWARD_TON =
      String(
        process.env.MAI_PAYOUT_FORWARD_TON ||
        '0.000000001'
      ).trim();

    let maiPayoutWorkerTimer = null;
    let maiPayoutWorkerBusy = false;
    let maiPayoutContext = null;


    /* =========================================================
       ENV NUMBER HELPER
       ========================================================= */

    function num(
      name,
      fallback
    ) {

      const value =
        Number(
          process.env[name]
        );

      return Number.isFinite(
        value
      )
        ? value
        : fallback;
    }


    /* =========================================================
       MAIN APP CONFIG
       ========================================================= */

    const cfg = {

      /* -------------------------------------------------------
         USER / MINING
         ------------------------------------------------------- */

      initialBalance:
        num(
          'INITIAL_BALANCE',
          0
        ),


      freeDaily:
        num(
          'FREE_MINING_PER_DAY',
          5
        ),


      level1Daily:
        num(
          'LEVEL1_MINING_PER_DAY',
          10
        ),


      levelStep:
        num(
          'LEVEL_SPEED_STEP',
          2
        ),


      holdingStep:
        num(
          'LEVEL_HOLDING_STEP',
          1000
        ),


      maxLevel:
        num(
          'MAX_LEVEL',
          1000
        ),


      farmSeconds:
        num(
          'FARM_CYCLE_SECONDS',
          86400
        ),


      dailyBonus:
        num(
          'DAILY_BONUS',
          1
        ),


      /* -------------------------------------------------------
         ADS
         ------------------------------------------------------- */

      adReward:
        num(
          'AD_REWARD',
          1
        ),


      adDailyLimit:
        num(
          'AD_DAILY_LIMIT',
          200
        ),


      adCooldown:
        num(
          'AD_COOLDOWN_SECONDS',
          5
        ),


      adProviderMode:
        String(
          process.env.AD_PROVIDER_MODE ||
          'external'
        ),


      adProviderUrl:
        String(
          process.env.AD_PROVIDER_URL ||
          ''
        ),


      adWebhookSecret:
        String(
          process.env.AD_WEBHOOK_SECRET ||
          ''
        ),


      adsgramBlockId:
        String(
          process.env.ADSGRAM_BLOCK_ID ||
          '49496'
        ).trim(),


      adsgramDebug:
        String(
          process.env.ADSGRAM_DEBUG ||
          'false'
        ).toLowerCase() === 'true',


      /* -------------------------------------------------------
         DAILY TELEGRAM TASK
         ------------------------------------------------------- */

      taskReward:
        num(
          'TASK_REWARD',
          2
        ),


      exclusiveReward:
        num(
          'EXCLUSIVE_REWARD',
          12
        ),


      /* -------------------------------------------------------
         REFERRAL
         ------------------------------------------------------- */

      referrerReward:
        num(
          'REFERRER_REWARD',
          10
        ),


      referredReward:
        num(
          'REFERRED_REWARD',
          5
        ),


      /* -------------------------------------------------------
         PROMOTE

         Requirement:
         100 completions = 0.2 GRAM

         1 completion = 0.002 GRAM
         ------------------------------------------------------- */

      promoteGramPerSlot:
        num(
          'PROMOTE_GRAM_PER_SLOT',
          0.002
        ),


      promoteMinSlots:
        num(
          'PROMOTE_MIN_SLOTS',
          100
        ),


      promoteMaxSlots:
        num(
          'PROMOTE_MAX_SLOTS',
          10000
        ),


      /*
        Fallback conversion only.

        Later Part will support
        a server-side GRAM -> MAI quote.

        This environment value can be
        changed without editing code.
      */

      gramPriceInMai:
        num(
          'GRAM_PRICE_IN_MAI',
          12000
        ),


      /* -------------------------------------------------------
         WITHDRAW
         ------------------------------------------------------- */

      minWithdrawal:
        num(
          'MIN_WITHDRAWAL',
          500
        ),


      withdrawFeeFixed:
        num(
          'WITHDRAW_FEE_FIXED',
          70
        ),


      withdrawFeePercent:
        num(
          'WITHDRAW_FEE_PERCENT',
          0
        ),


      withdrawMax:
        num(
          'WITHDRAW_MAX_PER_REQUEST',
          1000000
        ),


      withdrawDailyCount:
        num(
          'WITHDRAW_MAX_REQUESTS_PER_DAY',
          3
        ),


      withdrawCooldown:
        num(
          'WITHDRAW_REQUEST_COOLDOWN_SECONDS',
          30
        ),


      walletLock:
        num(
          'WALLET_CHANGE_LOCK_SECONDS',
          86400
        ),


      manualReview:
        num(
          'MANUAL_REVIEW_THRESHOLD',
          10000
        ),


      /* -------------------------------------------------------
         SECURITY
         ------------------------------------------------------- */

      devicePolicy:
        String(
          process.env.DEVICE_POLICY ||
          'observe'
        ).toLowerCase(),


      maxAccountsDevice:
        num(
          'MAX_ACCOUNTS_PER_DEVICE',
          2
        ),


      maxAccountsIpDay:
        num(
          'MAX_ACCOUNTS_PER_IP_DAY',
          8
        ),


      blockWithdrawOnRisk:
        String(
          process.env.BLOCK_WITHDRAW_ON_RISK ||
          'true'
        ).toLowerCase() !==
        'false'

    };


    /* =========================================================
       PROMOTION PAYMENT CONFIG
       ========================================================= */

    /*
      You said the receiving wallet will be
      added later.

      Render Environment Variable:

      PROMOTE_RECEIVER_WALLET=
    */


    /* =========================================================
       MINING RUNTIME / EPOCH CONFIG

       MINING_MODE=test
         - development / pre-launch
         - PDF base rate runs at 100%
         - official 3-year clock does NOT start

       MINING_MODE=official
         - requires MINING_LAUNCH_AT
         - before launch: mining multiplier = 0
         - first 6 months: 100%
         - next 6 months: 90%
         - year 2: 80%
         - year 3: 70%
         - after year 3: 0
       ========================================================= */

    const MINING_MODE =
      String(
        process.env.MINING_MODE ||
        'test'
      ).trim().toLowerCase() === 'official'
        ? 'official'
        : 'test';

    const MINING_LAUNCH_AT_RAW =
      String(
        process.env.MINING_LAUNCH_AT ||
        ''
      ).trim();

    const MINING_MIN_CLAIM_SECONDS =
      Math.max(
        30,
        safeInteger(
          process.env.MINING_MIN_CLAIM_SECONDS,
          30
        )
      );

    const PROMOTE_RECEIVER_WALLET =
      String(
        process.env.PROMOTE_RECEIVER_WALLET ||
        ''
      ).trim();


    /* =========================================================
       PROMOTE PACKAGE OPTIONS

       100   = 0.2 GRAM
       500   = 1.0 GRAM
       1000  = 2.0 GRAM
       2000  = 4.0 GRAM
       5000  = 10.0 GRAM
       10000 = 20.0 GRAM
       ========================================================= */

    const PROMOTE_PACKAGES = [
      100,
      500,
      1000,
      2000,
      5000,
      10000
    ];


    /* =========================================================
       DAILY TASK CONFIG

       Flow later:
       JOIN
          ↓
       CHECK
          ↓
       CLAIM
          ↓
       CLAIMED

       If verification fails:
       TRY AGAIN

       Reset:
       00:00 UTC every day
       ========================================================= */

    const tasks = {

      news: {

        key:
          'news',

        title:
          'MAI News',

        category:
          'channel',

        chatId:
          String(
            process.env.NEWS_CHAT_ID ||
            '@MAI_News_Official'
          ),

        link:
          NEWS_URL

      },


      payout: {

        key:
          'payout',

        title:
          'MAI Pay Out',

        category:
          'channel',

        chatId:
          String(
            process.env.PAYOUT_CHAT_ID ||
            '@MAI_Payout_Proof'
          ),

        link:
          PAYOUT_URL

      },


      chat: {

        key:
          'chat',

        title:
          'MAI Chat Group',

        category:
          'group',

        chatId:
          String(
            process.env.COMMUNITY_CHAT_ID ||
            '@MAICommunityChat'
          ),

        link:
          COMMUNITY_URL

      }

    };


    /* =========================================================
       DATABASE
       ========================================================= */

    const pool =
      new Pool({

        connectionString:
          process.env.DATABASE_URL,


        ssl:
          process.env.DATABASE_SSL ===
          'false'
            ? false
            : {
                rejectUnauthorized:
                  false
              },


        max:
          Number(
            process.env.DB_POOL_MAX ||
            12
          ),


        idleTimeoutMillis:
          30000,


        connectionTimeoutMillis:
          10000

      });


    /* =========================================================
       EXPRESS SECURITY
       ========================================================= */

    app.use(

      helmet({

        crossOriginResourcePolicy: {

          policy:
            'cross-origin'

        }

      })

    );


    /* =========================================================
       CORS
       ========================================================= */

    app.use(

      cors({

        origin(
          origin,
          callback
        ) {

          const isMaiVercelOrigin =
  /^https:\/\/maitoken-[a-z0-9-]+-hope-crypto\.vercel\.app$/i.test(
    origin || ''
  );

if (
  !origin ||
  allowedOrigins.includes(
    origin
  ) ||
  isMaiVercelOrigin
) {

            return callback(
              null,
              true
            );

          }


          console.warn(
            '[CORS BLOCKED]',
            origin
          );


          return callback(

            new Error(
              'CORS blocked'
            )

          );

        },


        methods: [

          'GET',
          'POST',
          'DELETE',
          'OPTIONS'

        ],


        allowedHeaders: [

          'Content-Type',

          'X-Telegram-Init-Data',

          'X-MAI-Device-ID',

          'X-Idempotency-Key',

          'X-Admin-Key',

          'X-Dev-User'

        ]

      })

    );


    /* =========================================================
       JSON BODY
       ========================================================= */

    app.use(

      express.json({

        limit:
          '64kb'

      })

    );


    /* =========================================================
       GENERAL HELPERS
       ========================================================= */

    function utcDay(
      date = new Date()
    ) {

      return date
        .toISOString()
        .slice(
          0,
          10
        );

    }


    /*
      Exact next UTC midnight.

      Useful for:
      Daily tasks
      Daily ads
      Daily bonus
    */

    function nextUtcResetAt(
      date = new Date()
    ) {

      const next =
        new Date(
          Date.UTC(
            date.getUTCFullYear(),
            date.getUTCMonth(),
            date.getUTCDate() + 1,
            0,
            0,
            0,
            0
          )
        );

      return next
        .toISOString();

    }


    /* =========================================================
       HASH
       ========================================================= */

    function hash(
      value
    ) {

      return crypto
        .createHash(
          'sha256'
        )
        .update(
          String(
            value ||
            ''
          )
        )
        .digest(
          'hex'
        );

    }


    /* =========================================================
       SAFE NUMBER
       ========================================================= */

    function safeNumber(
      value
    ) {

      const number =
        Number(
          value
        );

      return Number.isFinite(
        number
      )
        ? number
        : 0;

    }


    /* =========================================================
       SAFE INTEGER
       ========================================================= */

    function safeInteger(
      value,
      fallback = 0
    ) {

      const number =
        Number.parseInt(
          String(
            value
          ),
          10
        );

      return Number.isFinite(
        number
      )
        ? number
        : fallback;

    }


    /* =========================================================
       CLAMP
       ========================================================= */

    function clamp(
      value,
      minimum,
      maximum
    ) {

      return Math.min(
        maximum,
        Math.max(
          minimum,
          value
        )
      );

    }


    /* =========================================================
       APPROVED PDF MINING LEVEL SYSTEM
       Level 1-650
       ========================================================= */

    function levelFor(totalHolding) {

      const row =
        getMiningLevelForHolding(
          Math.max(
            0,
            safeNumber(totalHolding)
          )
        );

      return row.level;

    }


    function levelSpeed(level) {

      const row =
        getMiningLevel(level);

      return row.baseMaiPerDay;

    }


    function miningThForLevel(level) {

      const row =
        getMiningLevel(level);

      return row.thPerSec;

    }


    function totalDailyFor(totalHolding) {

      const row =
        getMiningLevelForHolding(
          Math.max(
            0,
            safeNumber(totalHolding)
          )
        );

      return row.baseMaiPerDay;

    }


    /* =========================================================
       REFERRAL LINK
       ========================================================= */

    function referralLink(
      telegramId
    ) {

      return (

        `https://t.me/${BOT_USERNAME}` +

        `?startapp=r_${telegramId}`

      );

    }


    /* =========================================================
       REFERRAL MILESTONES
       ========================================================= */

    function milestoneConfig() {

      return String(

        process.env.REFERRAL_MILESTONES ||

        '5:25,10:60,25:175,50:400,100:1000'

      )

        .split(',')

        .map(
          item => {

            const [
              count,
              reward
            ] =
              item
                .split(':')
                .map(Number);


            return {

              count,
              reward

            };

          }
        )

        .filter(
          item =>
            item.count >
            0 &&

            item.reward >
            0
        );

    }


    /* =========================================================
       WITHDRAW FEE
       ========================================================= */

    function computeFee(
      amount
    ) {

      const safeAmount =
        Math.max(
          0,
          safeNumber(
            amount
          )
        );


      return Math.max(

        0,

        cfg.withdrawFeeFixed +

        safeAmount *

        (
          cfg.withdrawFeePercent /
          100
        )

      );

    }


    /* =========================================================
       PROMOTE PRICE
       ========================================================= */

    function promoteGramPrice(
      completions
    ) {

      const count =
        clamp(

          safeInteger(
            completions,
            cfg.promoteMinSlots
          ),

          cfg.promoteMinSlots,

          cfg.promoteMaxSlots

        );


      return Number(

        (
          count *
          cfg.promoteGramPerSlot
        ).toFixed(6)

      );

    }


    /* =========================================================
       GRAM -> MAI FALLBACK CONVERSION
       ========================================================= */

    function promoteMaiPrice(
      completions
    ) {

      const gram =
        promoteGramPrice(
          completions
        );


      return Number(

        (
          gram *
          cfg.gramPriceInMai
        ).toFixed(8)

      );

    }


    /* =========================================================
       ADMIN MIDDLEWARE
       ========================================================= */

    function admin(
  req,
  res,
  next
) {

  const telegramId =
    String(req.auth?.id || '').trim();

  const isTelegramAdmin =
    telegramId &&
    ADMIN_TELEGRAM_IDS.has(telegramId);


  // Primary production admin authentication:
  // Telegram initData must already be verified by authenticate().
  if (isTelegramAdmin) {

    req.admin = {
      type: 'telegram',
      telegramId
    };

    return next();
  }


  // Emergency/server-side fallback.
  // Never expose ADMIN_KEY inside the frontend/browser.
  const suppliedKey =
    String(req.get('X-Admin-Key') || '');

  const expectedKey =
    String(ADMIN_KEY || '');

  const suppliedBuffer =
    Buffer.from(suppliedKey);

  const expectedBuffer =
    Buffer.from(expectedKey);

  const validAdminKey =
    expectedBuffer.length >= 32 &&
    suppliedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(
      suppliedBuffer,
      expectedBuffer
    );


  if (validAdminKey) {

    req.admin = {
      type: 'admin_key',
      telegramId: null
    };

    return next();
  }


  return res
    .status(403)
    .json({
      success: false,
      message: 'Admin authorization failed'
    });
}

    /* =========================================================
       SIMPLE SERVER RATE LIMIT
       ========================================================= */

    const buckets =
      new Map();


    function rateLimit(
      max = 180,
      windowMs = 60000
    ) {

      return (
        req,
        res,
        next
      ) => {

        // SECURITY: after authenticate() this also limits by Telegram account.
        // Before authentication it safely falls back to IP + route.
        const identity = req.auth?.id
          ? `tg:${req.auth.id}:ip:${req.ip}`
          : `ip:${req.ip}`;

        const key =
          `${identity}:` +
          `${req.method}:` +
          `${req.path}`;


        const now =
          Date.now();


        // SECURITY: bound the in-memory limiter so random-IP/path abuse cannot
        // grow this Map without limit. Reward integrity is still enforced by DB
        // locks/unique constraints; this limiter is an additional abuse shield.
        if (buckets.size > 50000) {
          for (const [oldKey, oldBucket] of buckets.entries()) {
            if (now - oldBucket.start > 5 * 60 * 1000) {
              buckets.delete(oldKey);
            }
            if (buckets.size <= 40000) break;
          }
        }


        let bucket =
          buckets.get(
            key
          );


        if (
          !bucket ||

          now -
          bucket.start >
          windowMs
        ) {

          bucket = {

            start:
              now,

            count:
              0

          };

        }


        bucket.count +=
          1;


        buckets.set(
          key,
          bucket
        );


        if (
          bucket.count >
          max
        ) {

          res.set(
            'Retry-After',
            String(Math.max(1, Math.ceil((windowMs - (now - bucket.start)) / 1000)))
          );

          return res
            .status(429)
            .json({

              success:
                false,

              message:
                'Too many requests. Please try again shortly.'

            });

        }


        next();

      };

    }


    /* =========================================================
       CLEAN OLD RATE LIMIT BUCKETS
       ========================================================= */

    setInterval(
      () => {

        const now =
          Date.now();


        for (
          const [
            key,
            bucket
          ]
          of buckets.entries()
        ) {

          if (
            now -
            bucket.start >
            5 * 60 * 1000
          ) {

            buckets.delete(
              key
            );

          }

        }

      },
      5 * 60 * 1000
    ).unref();


    app.use(
      rateLimit(
        180,
        60000
      )
    );


    /* =========================================================
       END OF SERVER.JS PART 1 / 4
       ========================================================= */
       /* =========================================================
       SERVER.JS — PART 2 / 4

       TON / MAI Wallet Reader
       Holding Snapshot
       Database Schema
       Safe Migrations
       ========================================================= */


    /* =========================================================
       WALLET BALANCE CACHE
       ========================================================= */

    const walletBalanceCache =
      new Map();


    const WALLET_CACHE_MS =
      Number(
        process.env.WALLET_CACHE_MS ||
        60000
      );


    function getCachedWalletBalance(
      address
    ) {

      const key =
        String(
          address ||
          ''
        ).trim();


      if (!key) {

        return null;

      }


      const cached =
        walletBalanceCache.get(
          key
        );


      if (!cached) {

        return null;

      }


      if (
        Date.now() -
        cached.time >
        WALLET_CACHE_MS
      ) {

        return null;

      }


      return safeNumber(
        cached.balance
      );

    }


    /* =========================================================
       STALE WALLET CACHE

       Used when TonAPI temporarily returns
       429 / timeout / network error.
       ========================================================= */

    function getStaleWalletBalance(
      address
    ) {

      const key =
        String(
          address ||
          ''
        ).trim();


      if (!key) {

        return null;

      }


      const cached =
        walletBalanceCache.get(
          key
        );


      if (
        !cached ||
        !Number.isFinite(
          Number(
            cached.balance
          )
        )
      ) {

        return null;

      }


      return safeNumber(
        cached.balance
      );

    }


    /* =========================================================
       SET WALLET CACHE
       ========================================================= */

    function setCachedWalletBalance(
      address,
      balance
    ) {

      const key =
        String(
          address ||
          ''
        ).trim();


      if (!key) {

        return;

      }


      walletBalanceCache.set(

        key,

        {

          balance:
            safeNumber(
              balance
            ),

          time:
            Date.now()

        }

      );

    }


    /* =========================================================
       ATOMIC TOKEN AMOUNT -> NORMAL TOKEN AMOUNT
       ========================================================= */

    function atomicToTokenAmount(
      value,
      decimals = MAI_DECIMALS
    ) {

      const raw =
        String(
          value ??
          '0'
        ).trim();


      if (
        !/^-?\d+$/.test(
          raw
        )
      ) {

        return 0;

      }


      const negative =
        raw.startsWith(
          '-'
        );


      const digits =
        negative
          ? raw.slice(1)
          : raw;


      const safeDecimals =
        Math.max(
          0,
          safeInteger(
            decimals,
            MAI_DECIMALS
          )
        );


      if (
        safeDecimals ===
        0
      ) {

        return safeNumber(

          `${negative ? '-' : ''}${digits}`

        );

      }


      const padded =
        digits.padStart(

          safeDecimals +
          1,

          '0'

        );


      const whole =
        padded.slice(
          0,
          -safeDecimals
        ) || '0';


      const fraction =
        padded.slice(
          -safeDecimals
        );


      const text =

        `${negative ? '-' : ''}` +

        `${whole}.` +

        `${fraction}`;


      return safeNumber(
        text
      );

    }


    /* =========================================================
       MAI WALLET BALANCE READER

       Primary:
       /accounts/{wallet}/jettons/{master}

       Fallback:
       /accounts/{wallet}/jettons

       Important:
       Existing working wallet reader behavior
       is preserved.
       ========================================================= */

    async function fetchMaiWalletBalance(
      walletAddress,
      {
        force = false
      } = {}
    ) {

      const address =
        String(
          walletAddress ||
          ''
        ).trim();


      if (!address) {

        return 0;

      }


      /* -------------------------------------------------------
         CACHE FIRST
         ------------------------------------------------------- */

      if (!force) {

        const cached =
          getCachedWalletBalance(
            address
          );


        if (
          cached !==
          null
        ) {

          return cached;

        }

      }


      /* -------------------------------------------------------
         REQUEST HEADERS
         ------------------------------------------------------- */

      const headers = {

        Accept:
          'application/json'

      };


      if (
        TONAPI_KEY
      ) {

        headers.Authorization =
          `Bearer ${TONAPI_KEY}`;

      }


      const controller =
        new AbortController();


      const timeout =
        setTimeout(
          () =>
            controller.abort(),
          12000
        );


      try {

        /* =====================================================
           DIRECT JETTON ENDPOINT
           ===================================================== */

        const directUrl =

          `${TONAPI_BASE}/accounts/` +

          `${encodeURIComponent(
            address
          )}/jettons/` +

          `${encodeURIComponent(
            MAI_JETTON_MASTER
          )}`;


        try {

          const response =
            await fetch(
              directUrl,
              {
                headers,

                signal:
                  controller.signal
              }
            );


          const data =
            await response
              .json()
              .catch(
                () => ({})
              );


          if (
            response.ok
          ) {

            const rawBalance =

              data?.balance ??

              data?.jetton_balance ??

              0;


            const decimals =
              Number(

                data?.jetton?.decimals ??

                data?.decimals ??

                MAI_DECIMALS

              );


            const result =
              atomicToTokenAmount(

                rawBalance,

                Number.isFinite(
                  decimals
                )
                  ? decimals
                  : MAI_DECIMALS

              );


            setCachedWalletBalance(
              address,
              result
            );


            console.log(

              '[MAI WALLET] direct success:',

              address.slice(
                0,
                8
              ),

              result

            );


            return result;

          }


          /* ---------------------------------------------------
             TONAPI 429
             Use previous known wallet value.
             --------------------------------------------------- */

          if (
            response.status ===
            429
          ) {

            const stale =
              getStaleWalletBalance(
                address
              );


            if (
              stale !==
              null
            ) {

              console.warn(

                '[MAI WALLET] 429 - using cached balance:',

                stale

              );


              return stale;

            }

          }


          console.warn(

            '[MAI WALLET] direct endpoint failed:',

            response.status,

            data

          );


        } catch (
          directError
        ) {

          console.warn(

            '[MAI WALLET] direct request error:',

            directError.message

          );

        }


        /* =====================================================
           FALLBACK — ALL JETTON BALANCES
           ===================================================== */

        const listUrl =

          `${TONAPI_BASE}/accounts/` +

          `${encodeURIComponent(
            address
          )}/jettons`;


        const listResponse =
          await fetch(
            listUrl,
            {
              headers,

              signal:
                controller.signal
            }
          );


        const listData =
          await listResponse
            .json()
            .catch(
              () => ({})
            );


        if (
          !listResponse.ok
        ) {

          if (
            listResponse.status ===
            429
          ) {

            const stale =
              getStaleWalletBalance(
                address
              );


            if (
              stale !==
              null
            ) {

              console.warn(

                '[MAI WALLET] list 429 - using cached balance:',

                stale

              );


              return stale;

            }

          }


          throw new Error(

            listData?.error ||

            listData?.message ||

            `TonAPI HTTP ${listResponse.status}`

          );

        }


        const balances =
          Array.isArray(
            listData?.balances
          )
            ? listData.balances
            : [];


        const normalizedMaster =
          String(
            MAI_JETTON_MASTER
          ).trim();


        const mai =
          balances.find(
            item => {

              const id =
                String(

                  item?.jetton?.address ??

                  item?.jetton?.id ??

                  item?.jetton_address ??

                  ''

                ).trim();


              return (
                id ===
                normalizedMaster
              );

            }
          );


        /* -------------------------------------------------------
           USER DOES NOT HOLD MAI
           ------------------------------------------------------- */

        if (!mai) {

          setCachedWalletBalance(
            address,
            0
          );


          console.log(

            '[MAI WALLET] MAI jetton not found:',

            address.slice(
              0,
              8
            )

          );


          return 0;

        }


        const rawBalance =

          mai?.balance ??

          mai?.jetton_balance ??

          0;


        const decimals =
          Number(

            mai?.jetton?.decimals ??

            mai?.decimals ??

            MAI_DECIMALS

          );


        const result =
          atomicToTokenAmount(

            rawBalance,

            Number.isFinite(
              decimals
            )
              ? decimals
              : MAI_DECIMALS

          );


        setCachedWalletBalance(
          address,
          result
        );


        console.log(

          '[MAI WALLET] list success:',

          address.slice(
            0,
            8
          ),

          result

        );


        return result;


      } catch (
        error
      ) {

        /* -------------------------------------------------------
           NETWORK FAILURE
           Preserve previous valid balance.
           ------------------------------------------------------- */

        const stale =
          getStaleWalletBalance(
            address
          );


        if (
          stale !==
          null
        ) {

          console.warn(

            '[MAI WALLET] lookup failed - using stale cache:',

            error.message

          );


          return stale;

        }


        console.error(

          '[MAI WALLET] final failure:',

          error.message

        );


        throw error;


      } finally {

        clearTimeout(
          timeout
        );

      }

    }


    /* =========================================================
       CLEAR WALLET CACHE
       ========================================================= */

    function clearWalletCache(
      address
    ) {

      const key =
        String(
          address ||
          ''
        ).trim();


      if (
        key
      ) {

        walletBalanceCache.delete(
          key
        );

      }

    }


    /* =========================================================
       USER HOLDING SNAPSHOT

       In-game MAI
            +
       TON wallet MAI
            =
       TOTAL HOLDING

       Level always follows CURRENT total holding.
       ========================================================= */

    async function getUserHoldingSnapshot(
      userOrId,
      client = pool,
      {
        forceWallet = false
      } = {}
    ) {

      let user;


      if (
        typeof userOrId ===
          'object' &&

        userOrId !==
          null
      ) {

        user =
          userOrId;

      } else {

        const result =
          await client.query(
            `
            SELECT
              telegram_id,
              balance,
              wallet_address

            FROM users

            WHERE telegram_id=$1
            `,
            [
              userOrId
            ]
          );


        user =
          result.rows[0];

      }


      if (!user) {

        return {

          inGame:
            0,

          wallet:
            0,

          total:
            0,

          level:
            1,

          levelSpeed:
            getMiningLevel(1).baseMaiPerDay,

          miningTh:
            getMiningLevel(1).thPerSec,

          totalDaily:
            getMiningLevel(1).baseMaiPerDay

        };

      }


      const inGame =
        Math.max(
          0,
          safeNumber(
            user.balance
          )
        );


      let wallet =
        0;


      if (
        user.wallet_address
      ) {

        try {

          wallet =
            await fetchMaiWalletBalance(

              user.wallet_address,

              {
                force:
                  forceWallet
              }

            );


        } catch (
          error
        ) {

          console.error(

            'MAI wallet balance read failed:',

            error.message

          );


          wallet =
            0;

        }

      }


      const total =
        Math.max(
          0,
          inGame +
          wallet
        );


      const level =
        levelFor(
          total
        );


      const approvedLevel =
        getMiningLevel(level);


      const levelSpeedValue =
        approvedLevel.baseMaiPerDay;


      const miningTh =
        approvedLevel.thPerSec;


      const totalDaily =
        approvedLevel.baseMaiPerDay;


      return {

        inGame,

        wallet,

        total,

        level,

        levelSpeed:
          levelSpeedValue,

        miningTh,

        totalDaily

      };

    }


    /* =========================================================
       DATABASE INITIALIZATION
       ========================================================= */

    async function initDb() {

      if (
        !process.env.DATABASE_URL
      ) {

        throw new Error(

          'DATABASE_URL is required'

        );

      }


      /* =======================================================
         USERS
         ======================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS users(

          telegram_id BIGINT
            PRIMARY KEY,

          username TEXT
            NOT NULL
            DEFAULT '',

          first_name TEXT
            NOT NULL
            DEFAULT 'User',

          photo_url TEXT,

          balance NUMERIC(30,8)
            NOT NULL
            DEFAULT 0,

          locked_balance NUMERIC(30,8)
            NOT NULL
            DEFAULT 0,

          wallet_address TEXT,

          wallet_connected_at
            TIMESTAMPTZ,

          farm_started_at
            TIMESTAMPTZ,

          farm_rate_daily
            NUMERIC(30,8),

          mining_checkpoint_at
            TIMESTAMPTZ,

          mining_accrued
            NUMERIC(30,8)
            NOT NULL
            DEFAULT 0,

          mining_checkpoint_rate_daily
            NUMERIC(30,8),

          mining_checkpoint_level
            INTEGER,

          mining_checkpoint_holding
            NUMERIC(30,8),

          mining_highest_level
            INTEGER
            NOT NULL
            DEFAULT 1,

          mining_last_claim_at
            TIMESTAMPTZ,

          daily_bonus_date
            DATE,

          referred_by BIGINT,

          referral_assigned_at TIMESTAMPTZ,

          referral_qualified BOOLEAN
            NOT NULL
            DEFAULT FALSE,

          account_status TEXT
            NOT NULL
            DEFAULT 'active',

          suspended_until TIMESTAMPTZ,

          admin_note TEXT,

          created_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          updated_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW()

        );
      `);


      /* =======================================================
         SAFE USER MIGRATIONS
         ======================================================= */

      await pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS username TEXT
          NOT NULL
          DEFAULT '';

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS first_name TEXT
          NOT NULL
          DEFAULT 'User';

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS photo_url TEXT;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS balance NUMERIC(30,8)
          NOT NULL
          DEFAULT 0;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS locked_balance NUMERIC(30,8)
          NOT NULL
          DEFAULT 0;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS wallet_address TEXT;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS wallet_connected_at TIMESTAMPTZ;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS farm_started_at TIMESTAMPTZ;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS farm_rate_daily NUMERIC(30,8);

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS mining_checkpoint_at TIMESTAMPTZ;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS mining_accrued NUMERIC(30,8)
          NOT NULL
          DEFAULT 0;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS mining_checkpoint_rate_daily NUMERIC(30,8);

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS mining_checkpoint_level INTEGER;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS mining_checkpoint_holding NUMERIC(30,8);

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS mining_highest_level INTEGER
          NOT NULL
          DEFAULT 1;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS mining_last_claim_at TIMESTAMPTZ;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS daily_bonus_date DATE;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS referred_by BIGINT;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS referral_assigned_at TIMESTAMPTZ;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS referral_qualified BOOLEAN
          NOT NULL
          DEFAULT FALSE;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS account_status TEXT
          NOT NULL
          DEFAULT 'active';

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS admin_note TEXT;

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT NOW();

        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
          NOT NULL
          DEFAULT NOW();
      `);


    /* =========================================================
       TRANSACTIONS
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS transactions(

          id BIGSERIAL
            PRIMARY KEY,

          telegram_id BIGINT,

          type TEXT
            NOT NULL,

          amount NUMERIC(30,8)
            NOT NULL,

          reference TEXT,

          metadata JSONB
            NOT NULL
            DEFAULT '{}'::jsonb,

          created_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW()

        );
      `);


      await pool.query(`
        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS type TEXT;

        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS amount NUMERIC(30,8);

        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS reference TEXT;

        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS metadata JSONB
          NOT NULL
          DEFAULT '{}'::jsonb;

        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
          NOT NULL
          DEFAULT NOW();

        -- Legacy deployments used transactions.user_id as a required column.
        -- MAI v3 uses telegram_id as the canonical identity, so keeping the old
        -- column NOT NULL makes otherwise valid reward claims fail.
        ALTER TABLE transactions
          ADD COLUMN IF NOT EXISTS user_id BIGINT;

        ALTER TABLE transactions
          ALTER COLUMN user_id DROP NOT NULL;
      `);
    await pool.query(`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS transaction_type TEXT;

      ALTER TABLE transactions
      ALTER COLUMN transaction_type DROP NOT NULL;
    `);

    /* =========================================================
       DAILY TASK PROGRESS

       This table supports:

       JOIN
       CHECK
       CLAIM
       CLAIMED

       Verification and reward are separated.

       Daily reset happens naturally because DAY
       is part of the primary key.

       At 00:00 UTC a new UTC date is used.
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_task_progress(

          telegram_id BIGINT
            NOT NULL,

          task_key TEXT
            NOT NULL,

          day DATE
            NOT NULL,

          joined_clicked_at
            TIMESTAMPTZ,

          verified_at
            TIMESTAMPTZ,

          claimed_at
            TIMESTAMPTZ,

          reward NUMERIC(30,8)
            NOT NULL
            DEFAULT 0,

          created_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          updated_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          PRIMARY KEY(
            telegram_id,
            task_key,
            day
          )

        );
      `);


    /* =========================================================
       OLD DAILY TASK COMPLETIONS

       Keep this old table so existing data
       remains safe.

       New task flow primarily uses
       daily_task_progress.
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_task_completions(

          id BIGSERIAL
            PRIMARY KEY,

          telegram_id BIGINT
            NOT NULL,

          task_key TEXT
            NOT NULL,

          day DATE
            NOT NULL,

          reward NUMERIC(30,8)
            NOT NULL,

          created_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          UNIQUE(
            telegram_id,
            task_key,
            day
          )

        );
      `);


    /* =========================================================
       IMPORT OLD CLAIMED TASKS INTO NEW STATE TABLE
       ========================================================= */

      await pool.query(`
        INSERT INTO daily_task_progress(
          telegram_id,
          task_key,
          day,
          verified_at,
          claimed_at,
          reward
        )

        SELECT
          telegram_id,
          task_key,
          day,
          created_at,
          created_at,
          reward

        FROM daily_task_completions

        ON CONFLICT(
          telegram_id,
          task_key,
          day
        )
        DO NOTHING;
      `);


    /* =========================================================
       AD SESSIONS
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ad_sessions(

          id TEXT
            PRIMARY KEY,

          telegram_id BIGINT
            NOT NULL,

          day DATE,

          status TEXT
            NOT NULL
            DEFAULT 'started',

          started_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          completed_at TIMESTAMPTZ,

          claimed_at TIMESTAMPTZ,

          provider_ref TEXT,

          metadata JSONB
            NOT NULL
            DEFAULT '{}'::jsonb

        );
      `);


      await pool.query(`
        ALTER TABLE ad_sessions
          ADD COLUMN IF NOT EXISTS day DATE;
      `);


      await pool.query(`
        UPDATE ad_sessions

        SET day=
          COALESCE(
            day,
            (started_at AT TIME ZONE 'UTC')::date,
            (NOW() AT TIME ZONE 'UTC')::date
          )

        WHERE day IS NULL;
      `);


      await pool.query(`
        ALTER TABLE ad_sessions
          ALTER COLUMN day
          SET NOT NULL;
      `);


      await pool.query(`
        CREATE INDEX IF NOT EXISTS
        idx_ads_user_day

        ON ad_sessions(
          telegram_id,
          day
        );
      `);


      /* =========================================================
         ADMIN-MANAGED AD CAMPAIGNS
         Environment values remain a safe fallback. The active DB campaign
         controls new ad sessions; each session snapshots its own reward and
         limits so later admin edits cannot change an already-started reward.
         ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS ad_campaigns(
          id BIGSERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          provider TEXT NOT NULL DEFAULT 'adsgram',
          block_id TEXT NOT NULL,
          reward NUMERIC(30,8) NOT NULL CHECK(reward >= 0),
          daily_limit INTEGER NOT NULL CHECK(daily_limit > 0),
          cooldown_seconds INTEGER NOT NULL DEFAULT 5 CHECK(cooldown_seconds >= 0),
          mode TEXT NOT NULL DEFAULT 'test' CHECK(mode IN ('test','production')),
          status TEXT NOT NULL DEFAULT 'paused' CHECK(status IN ('active','paused','archived')),
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          admin_hidden BOOLEAN NOT NULL DEFAULT FALSE,
          ads_per_claim INTEGER NOT NULL DEFAULT 1 CHECK(ads_per_claim BETWEEN 1 AND 3)
        );
      `);

      await pool.query(`ALTER TABLE ad_sessions ADD COLUMN IF NOT EXISTS campaign_id BIGINT`);
      await pool.query(`ALTER TABLE ad_sessions ADD COLUMN IF NOT EXISTS reward_snapshot NUMERIC(30,8)`);
      await pool.query(`ALTER TABLE ad_sessions ADD COLUMN IF NOT EXISTS daily_limit_snapshot INTEGER`);
      await pool.query(`ALTER TABLE ad_sessions ADD COLUMN IF NOT EXISTS cooldown_snapshot INTEGER`);
      await pool.query(`ALTER TABLE ad_sessions ADD COLUMN IF NOT EXISTS block_id_snapshot TEXT`);
      await pool.query(`ALTER TABLE ad_sessions ADD COLUMN IF NOT EXISTS mode_snapshot TEXT`);
      await pool.query(`ALTER TABLE ad_campaigns ADD COLUMN IF NOT EXISTS ads_per_claim INTEGER NOT NULL DEFAULT 1`);
      await pool.query(`ALTER TABLE ad_sessions ADD COLUMN IF NOT EXISTS sequence_total INTEGER NOT NULL DEFAULT 1`);
      await pool.query(`ALTER TABLE ad_sessions ADD COLUMN IF NOT EXISTS sequence_completed INTEGER NOT NULL DEFAULT 0`);

      await pool.query(`CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON ad_campaigns(status, admin_hidden)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_ad_sessions_campaign ON ad_sessions(campaign_id)`);

      // Seed the currently configured AdsGram block once, without replacing
      // any campaign the admin has already created.
      const adCampaignCount = Number((await pool.query(`SELECT COUNT(*)::int AS c FROM ad_campaigns`)).rows[0]?.c || 0);
      if (adCampaignCount === 0 && cfg.adsgramBlockId) {
        await pool.query(
          `INSERT INTO ad_campaigns(name,provider,block_id,reward,daily_limit,cooldown_seconds,mode,status,created_by)
           VALUES($1,'adsgram',$2,$3,$4,$5,$6,'active','system-seed')`,
          [
            'MAI Rewarded Ads',
            cfg.adsgramBlockId,
            cfg.adReward,
            cfg.adDailyLimit,
            cfg.adCooldown,
            (cfg.adProviderMode === 'adsgram_test' || cfg.adsgramDebug) ? 'test' : 'production'
          ]
        );
      }

      // One-time compatibility bridge for sessions created before campaign_id
      // existed. If exactly one visible campaign exists, those legacy sessions
      // unambiguously belong to it, so preserve the user's current daily count
      // and historical analytics instead of resetting them during this upgrade.
      const visibleAdCampaigns = (await pool.query(`
        SELECT id,reward,daily_limit,cooldown_seconds,block_id,mode
        FROM ad_campaigns
        WHERE COALESCE(admin_hidden,FALSE)=FALSE
        ORDER BY id
      `)).rows;
      if (visibleAdCampaigns.length === 1) {
        const only = visibleAdCampaigns[0];
        await pool.query(`
          UPDATE ad_sessions
          SET campaign_id=$1,
              reward_snapshot=COALESCE(reward_snapshot,$2),
              daily_limit_snapshot=COALESCE(daily_limit_snapshot,$3),
              cooldown_snapshot=COALESCE(cooldown_snapshot,$4),
              block_id_snapshot=COALESCE(block_id_snapshot,$5),
              mode_snapshot=COALESCE(mode_snapshot,$6)
          WHERE campaign_id IS NULL
        `,[only.id,only.reward,only.daily_limit,only.cooldown_seconds,only.block_id,only.mode]);
      }


    /* =========================================================
       REFERRAL MILESTONES
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS referral_milestones(

          telegram_id BIGINT
            NOT NULL,

          milestone INTEGER
            NOT NULL,

          reward NUMERIC(30,8)
            NOT NULL,

          claimed_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          PRIMARY KEY(
            telegram_id,
            milestone
          )

        );
      `);


    /* =========================================================
       CAMPAIGNS / PROMOTE
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS campaigns(

          id BIGSERIAL
            PRIMARY KEY,

          owner_id BIGINT
            NOT NULL,

          type TEXT
            NOT NULL,

          title TEXT
            NOT NULL,

          target_url TEXT
            NOT NULL,

          description TEXT
            NOT NULL
            DEFAULT '',

          target_count INTEGER
            NOT NULL
            CHECK(
              target_count > 0
            ),

          completed_count INTEGER
            NOT NULL
            DEFAULT 0,

          reward_per_user NUMERIC(30,8)
            NOT NULL
            DEFAULT 0,

          payment_method TEXT
            NOT NULL
            CHECK(
              payment_method
              IN(
                'MAI',
                'GRAM'
              )
            ),

          payment_amount NUMERIC(30,8)
            NOT NULL,

          quoted_gram NUMERIC(30,8),

          quoted_mai NUMERIC(30,8),

          payment_wallet TEXT,

          payment_status TEXT
            NOT NULL
            DEFAULT 'pending',

          status TEXT
            NOT NULL
            DEFAULT 'pending',

          verification_type TEXT
            NOT NULL
            DEFAULT 'manual',

          chat_id TEXT,

          created_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          approved_at TIMESTAMPTZ

        );
      `);


    /* =========================================================
       CAMPAIGN SAFE MIGRATIONS
       ========================================================= */

      await pool.query(`
            ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS type TEXT;

         ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS owner_id BIGINT;

          ALTER TABLE campaigns
         ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

          ALTER TABLE campaigns
         ALTER COLUMN telegram_id DROP NOT NULL;

         ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS category TEXT;

         ALTER TABLE campaigns
        ALTER COLUMN category DROP NOT NULL;

        ALTER TABLE campaigns
      ADD COLUMN IF NOT EXISTS completions INTEGER;

    ALTER TABLE campaigns
      ALTER COLUMN completions DROP NOT NULL;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS title TEXT;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS target_url TEXT;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS description TEXT;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS target_count INTEGER;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS quoted_gram NUMERIC(30,8);

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS quoted_mai NUMERIC(30,8);

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS payment_wallet TEXT;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS completed_count INTEGER
          NOT NULL
          DEFAULT 0;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS reward_per_user NUMERIC(30,8)
          NOT NULL
          DEFAULT 0;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS verification_type TEXT
          NOT NULL
          DEFAULT 'manual';

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS chat_id TEXT;

        ALTER TABLE campaigns
          ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
            ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payment_status TEXT
        NOT NULL
        DEFAULT 'pending';

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS status TEXT
        NOT NULL
        DEFAULT 'pending';

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW();

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payment_nano NUMERIC(30,0);

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payment_atomic NUMERIC(40,0);

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payer_wallet TEXT;

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payer_jetton_wallet TEXT;

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payment_tx_hash TEXT;

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payment_verified_at TIMESTAMPTZ;

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payment_last_checked_at TIMESTAMPTZ;

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payment_verification_attempts INTEGER
        NOT NULL
        DEFAULT 0;

      -- Admin soft-delete flags only control Admin Panel visibility.
      -- Campaign/payment/blockchain evidence remains permanently stored.
      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS admin_hidden BOOLEAN
        NOT NULL
        DEFAULT FALSE;

      ALTER TABLE campaigns
        ADD COLUMN IF NOT EXISTS payment_admin_hidden BOOLEAN
        NOT NULL
        DEFAULT FALSE;

      CREATE UNIQUE INDEX IF NOT EXISTS
        campaigns_payment_tx_hash_unique_idx
        ON campaigns(payment_tx_hash)
        WHERE payment_tx_hash IS NOT NULL;
      `);


    /* =========================================================
       CAMPAIGN COMPLETIONS
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS campaign_completions(

          campaign_id BIGINT
            NOT NULL,

          telegram_id BIGINT
            NOT NULL,

          rewarded NUMERIC(30,8)
            NOT NULL
            DEFAULT 0,

          completed_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          PRIMARY KEY(
            campaign_id,
            telegram_id
          )

        );
      `);


    /* =========================================================
       CAMPAIGN OPEN / 8-SECOND CLAIM GATE
       Server-side timing prevents a client from claiming instantly.
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS campaign_engagements(

          campaign_id BIGINT
            NOT NULL,

          telegram_id BIGINT
            NOT NULL,

          opened_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          PRIMARY KEY(
            campaign_id,
            telegram_id
          )

        );
      `);


    /* =========================================================
       WITHDRAWALS
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS withdrawals(

          id TEXT
            PRIMARY KEY,

          telegram_id BIGINT
            NOT NULL,

          amount NUMERIC(30,8)
            NOT NULL,

          fee NUMERIC(30,8)
            NOT NULL,

          receive_amount NUMERIC(30,8)
            NOT NULL,

          wallet_address TEXT
            NOT NULL,

          status TEXT
            NOT NULL
            DEFAULT 'pending',

          idempotency_key TEXT
            NOT NULL,

          risk_flags JSONB
            NOT NULL
            DEFAULT '[]'::jsonb,

          tx_hash TEXT,

          created_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          updated_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          UNIQUE(
            telegram_id,
            idempotency_key
          )

        );
      `);

      /* =========================================================
         WITHDRAWALS - SAFE SCHEMA MIGRATION

         Existing production databases may already have the
         withdrawals table from an older version.
         Never drop the table; add missing columns safely.
         ========================================================= */

      // Legacy production databases may have BIGINT withdrawal IDs, while
      // current requests use crypto.randomUUID(). Store IDs as TEXT so both
      // historical numeric IDs and new UUID IDs remain valid without deleting data.
      await pool.query(`
        ALTER TABLE withdrawals
        ALTER COLUMN id TYPE TEXT USING id::text;
      `);

      // Very old deployments used withdrawals.user_id as a required legacy field.
      // The current authoritative identity is telegram_id. Keep historical user_id
      // values for audit/history, but it must not block new current-schema inserts.
      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS user_id BIGINT;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ALTER COLUMN user_id DROP NOT NULL;
      `);

      // Older production databases may predate the idempotency column.
      // Add it before any route or index references it, then backfill legacy rows.
      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
      `);

      await pool.query(`
        UPDATE withdrawals
        SET idempotency_key = 'legacy:' || id::text
        WHERE idempotency_key IS NULL OR BTRIM(idempotency_key) = '';
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ALTER COLUMN idempotency_key SET NOT NULL;
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawals_user_idempotency
        ON withdrawals(telegram_id, idempotency_key);
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS fee NUMERIC(30,8);
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS receive_amount NUMERIC(30,8);
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS risk_flags JSONB
        DEFAULT '[]'::jsonb;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS tx_hash TEXT;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        DEFAULT NOW();
      `);

      // Payout metadata keeps today's manual approval flow compatible with
      // a future isolated auto-payment worker without exposing signing keys here.
      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS payout_mode TEXT DEFAULT 'manual';
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS payout_attempts INTEGER DEFAULT 0;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS broadcast_at TIMESTAMPTZ;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS last_payout_error TEXT;
      `);


      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS payout_query_id TEXT;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS payout_wallet TEXT;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS payout_jetton_wallet TEXT;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ;
      `);

      // Admin Payments soft-delete only hides the row from the Payments view.
      // It never changes payout status, locked balance, tx hash or W5 evidence.
      await pool.query(`
        ALTER TABLE withdrawals
        ADD COLUMN IF NOT EXISTS payment_admin_hidden BOOLEAN
        NOT NULL
        DEFAULT FALSE;
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawals_payout_query_id
        ON withdrawals(payout_query_id)
        WHERE payout_query_id IS NOT NULL;
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_withdrawals_tx_hash_unique
        ON withdrawals(tx_hash)
        WHERE tx_hash IS NOT NULL;
      `);

      await pool.query(`
        UPDATE withdrawals
        SET fee = 0
        WHERE fee IS NULL;
      `);

      await pool.query(`
        UPDATE withdrawals
        SET receive_amount = amount
        WHERE receive_amount IS NULL;
      `);

      await pool.query(`
        UPDATE withdrawals
        SET risk_flags = '[]'::jsonb
        WHERE risk_flags IS NULL;
      `);

      await pool.query(`
        UPDATE withdrawals
        SET updated_at = COALESCE(updated_at, created_at, NOW())
        WHERE updated_at IS NULL;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ALTER COLUMN fee SET NOT NULL;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ALTER COLUMN receive_amount SET NOT NULL;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ALTER COLUMN risk_flags SET NOT NULL;
      `);

      await pool.query(`
        ALTER TABLE withdrawals
        ALTER COLUMN updated_at SET NOT NULL;
      `);
    /* =========================================================
       WITHDRAWAL SECURITY CHALLENGES

       Server-owned, short-lived, single-use verification.
       The answer is never stored in plaintext.
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS withdrawal_challenges(

          id TEXT PRIMARY KEY,

          telegram_id BIGINT NOT NULL,

          amount NUMERIC(30,8) NOT NULL,

          wallet_address TEXT NOT NULL,

          answer_hash TEXT NOT NULL,

          attempts INTEGER NOT NULL DEFAULT 0,

          max_attempts INTEGER NOT NULL DEFAULT 5,

          expires_at TIMESTAMPTZ NOT NULL,

          consumed_at TIMESTAMPTZ,

          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

        );
      `);

      // Legacy challenge tables may also use BIGINT IDs. The API challenge ID
      // is a UUID string, so normalize this identifier to TEXT while preserving
      // every existing challenge row. No table or financial data is dropped.
      await pool.query(`
        ALTER TABLE withdrawal_challenges
        ALTER COLUMN id TYPE TEXT USING id::text;
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_withdrawal_challenges_user
        ON withdrawal_challenges(telegram_id, created_at DESC);
      `);


    /* =========================================================
       DEVICE ACCOUNTS
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS device_accounts(

          device_hash TEXT
            NOT NULL,

          telegram_id BIGINT
            NOT NULL,

          first_seen TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          last_seen TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW(),

          PRIMARY KEY(
            device_hash,
            telegram_id
          )

        );
      `);


      await pool.query(`
        ALTER TABLE device_accounts ADD COLUMN IF NOT EXISTS device_label TEXT;
        ALTER TABLE device_accounts ADD COLUMN IF NOT EXISTS user_agent TEXT;
      `);

    /* =========================================================
       SECURITY LOGS
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS security_logs(

          id BIGSERIAL
            PRIMARY KEY,

          telegram_id BIGINT,

          action TEXT
            NOT NULL,

          severity TEXT
            NOT NULL
            DEFAULT 'info',

          ip_hash TEXT,

          device_hash TEXT,

          user_agent_hash TEXT,

          metadata JSONB
            NOT NULL
            DEFAULT '{}'::jsonb,

          created_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW()

        );
      `);


    /* =========================================================
       DYNAMIC TASKS & MISSIONS — ADMIN CONTROLLED
       Existing daily tasks remain intact and continue to use
       daily_task_progress. These tables power the new module.
       ========================================================= */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS managed_tasks(
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '✦',
        task_type TEXT NOT NULL,
        reward NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (reward >= 0),
        target_url TEXT,
        telegram_chat_id TEXT,
        rule_config JSONB NOT NULL DEFAULT '{}'::jsonb,
        recurrence TEXT NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once','daily','interval')),
        refresh_hours INTEGER CHECK (refresh_hours IS NULL OR refresh_hours > 0),
        claim_limit INTEGER CHECK (claim_limit IS NULL OR claim_limit > 0),
        admin_hidden BOOLEAN NOT NULL DEFAULT FALSE,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','ended')),
        starts_at TIMESTAMPTZ,
        ends_at TIMESTAMPTZ,
        created_by BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_managed_tasks_status ON managed_tasks(status, created_at DESC);
      ALTER TABLE managed_tasks DROP CONSTRAINT IF EXISTS managed_tasks_recurrence_check;
      ALTER TABLE managed_tasks ADD COLUMN IF NOT EXISTS refresh_hours INTEGER;
      ALTER TABLE managed_tasks ADD COLUMN IF NOT EXISTS claim_limit INTEGER;
      ALTER TABLE managed_tasks ADD COLUMN IF NOT EXISTS admin_hidden BOOLEAN NOT NULL DEFAULT FALSE;
      ALTER TABLE managed_tasks ADD CONSTRAINT managed_tasks_recurrence_check CHECK (recurrence IN ('once','daily','interval'));
      ALTER TABLE managed_tasks DROP CONSTRAINT IF EXISTS managed_tasks_refresh_hours_check;
      ALTER TABLE managed_tasks ADD CONSTRAINT managed_tasks_refresh_hours_check CHECK (refresh_hours IS NULL OR refresh_hours > 0);
      ALTER TABLE managed_tasks DROP CONSTRAINT IF EXISTS managed_tasks_claim_limit_check;
      ALTER TABLE managed_tasks ADD CONSTRAINT managed_tasks_claim_limit_check CHECK (claim_limit IS NULL OR claim_limit > 0);

      CREATE TABLE IF NOT EXISTS managed_task_completions(
        id BIGSERIAL PRIMARY KEY,
        telegram_id BIGINT NOT NULL,
        task_id BIGINT NOT NULL REFERENCES managed_tasks(id) ON DELETE CASCADE,
        period_key TEXT NOT NULL DEFAULT 'once',
        reward_snapshot NUMERIC(30,8) NOT NULL DEFAULT 0,
        verified_at TIMESTAMPTZ,
        claimed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(telegram_id, task_id, period_key)
      );
      CREATE INDEX IF NOT EXISTS idx_managed_task_completion_user ON managed_task_completions(telegram_id, claimed_at DESC);

      -- Records the server-side start time for link-based managed tasks.
      -- This is intentionally separate from reward/completion evidence: opening a
      -- link is not proof of third-party bot activity, but it gives us an
      -- authoritative 10-second minimum interaction gate before verification.
      CREATE TABLE IF NOT EXISTS managed_task_engagements(
        telegram_id BIGINT NOT NULL,
        task_id BIGINT NOT NULL REFERENCES managed_tasks(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY(telegram_id, task_id)
      );
      CREATE INDEX IF NOT EXISTS idx_managed_task_engagement_task ON managed_task_engagements(task_id, started_at DESC);

      CREATE TABLE IF NOT EXISTS managed_missions(
        id BIGSERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        icon TEXT NOT NULL DEFAULT '◆',
        completion_bonus NUMERIC(30,8) NOT NULL DEFAULT 0 CHECK (completion_bonus >= 0),
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','ended')),
        featured BOOLEAN NOT NULL DEFAULT FALSE,
        admin_hidden BOOLEAN NOT NULL DEFAULT FALSE,
        starts_at TIMESTAMPTZ,
        ends_at TIMESTAMPTZ,
        created_by BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE managed_missions ADD COLUMN IF NOT EXISTS admin_hidden BOOLEAN NOT NULL DEFAULT FALSE;

      CREATE TABLE IF NOT EXISTS managed_mission_tasks(
        mission_id BIGINT NOT NULL REFERENCES managed_missions(id) ON DELETE CASCADE,
        task_id BIGINT NOT NULL REFERENCES managed_tasks(id) ON DELETE CASCADE,
        sort_order INT NOT NULL DEFAULT 0,
        PRIMARY KEY(mission_id, task_id)
      );

      CREATE TABLE IF NOT EXISTS managed_mission_completions(
        telegram_id BIGINT NOT NULL,
        mission_id BIGINT NOT NULL REFERENCES managed_missions(id) ON DELETE CASCADE,
        bonus_snapshot NUMERIC(30,8) NOT NULL DEFAULT 0,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY(telegram_id, mission_id)
      );
    `);

     /* =========================================================
   ADMIN AUDIT LOGS

   Permanent record of sensitive admin actions.
   Do not store ADMIN_KEY or other secrets here.
   ========================================================= */

await pool.query(`
  CREATE TABLE IF NOT EXISTS admin_audit_logs(

    id BIGSERIAL
      PRIMARY KEY,

    admin_id BIGINT,

    action TEXT
      NOT NULL,

    target_type TEXT
      NOT NULL,

    target_id TEXT,

    reason TEXT,

    metadata JSONB
      NOT NULL
      DEFAULT '{}'::jsonb,

    ip_hash TEXT,

    created_at TIMESTAMPTZ
      NOT NULL
      DEFAULT NOW()

  );
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS
  idx_admin_audit_created

  ON admin_audit_logs(
    created_at DESC
  );
`);

await pool.query(`
  CREATE INDEX IF NOT EXISTS
  idx_admin_audit_target

  ON admin_audit_logs(
    target_type,
    target_id
  );
`);

    /* =========================================================
       USER PREFERENCES

       Language is also saved server-side
       so later the same Telegram account can
       retain its preference on another device.
       ========================================================= */

      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_preferences(

          telegram_id BIGINT
            PRIMARY KEY,

          language TEXT
            NOT NULL
            DEFAULT 'en',

          notifications_enabled BOOLEAN
            NOT NULL
            DEFAULT TRUE,

          sound_enabled BOOLEAN
            NOT NULL
            DEFAULT TRUE,

          updated_at TIMESTAMPTZ
            NOT NULL
            DEFAULT NOW()

        );
      `);


    /* =========================================================
       SAFE LEGACY MIGRATIONS
       ========================================================= */

      await pool.query(`
        ALTER TABLE IF EXISTS daily_task_completions
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

        ALTER TABLE IF EXISTS ad_sessions
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

        ALTER TABLE IF EXISTS referral_milestones
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

        ALTER TABLE IF EXISTS campaign_completions
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

        ALTER TABLE IF EXISTS withdrawals
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

        ALTER TABLE IF EXISTS device_accounts
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT;

        ALTER TABLE IF EXISTS security_logs
          ADD COLUMN IF NOT EXISTS telegram_id BIGINT;
      `);


    /* =========================================================
       USEFUL INDEXES
       ========================================================= */
       await pool.query(`
      ALTER TABLE IF EXISTS transactions
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW();

      ALTER TABLE IF EXISTS withdrawals
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW();

      ALTER TABLE IF EXISTS withdrawals
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW();

      ALTER TABLE IF EXISTS security_logs
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ
        NOT NULL
        DEFAULT NOW();
    `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS
        idx_daily_task_progress_user_day

        ON daily_task_progress(
          telegram_id,
          day
        );


        CREATE INDEX IF NOT EXISTS
        idx_transactions_user_created

        ON transactions(
          telegram_id,
          created_at DESC
        );


        CREATE INDEX IF NOT EXISTS
        idx_campaigns_status

        ON campaigns(
          status,
          payment_status
        );


        CREATE INDEX IF NOT EXISTS
        idx_withdrawals_user_created

        ON withdrawals(
          telegram_id,
          created_at DESC
        );


        CREATE INDEX IF NOT EXISTS
        idx_security_user_created

        ON security_logs(
          telegram_id,
          created_at DESC
        );
      `);


      console.log(
        'MAI Network database schema ready'
      );

    }


    /* =========================================================
       END OF SERVER.JS PART 2 / 4
       ========================================================= */
       /* =========================================================
       SERVER.JS — PART 3 / 4

       Telegram Auth
       Security
       User Bootstrap
       Wallet API
       Farming
       Daily Bonus
       User Preferences
       Daily Tasks
       ========================================================= */


    /* =========================================================
       TELEGRAM INIT DATA
       ========================================================= */

    function parseInitData(
      initData
    ) {

      if (
        !initData ||
        typeof initData !==
          'string' ||
        initData.length >
          10000
      ) {

        throw new Error(
          'Invalid Telegram initData'
        );

      }


      const params =
        new URLSearchParams(
          initData
        );


      const receivedHash =
        params.get(
          'hash'
        );


      const authDate =
        Number(
          params.get(
            'auth_date'
          )
        );


      if (
        !receivedHash ||
        !Number.isFinite(
          authDate
        )
      ) {

        throw new Error(
          'Telegram authorization missing'
        );

      }


      const age =
        Math.floor(
          Date.now() /
          1000
        ) -
        authDate;


      if (
        age < -60 ||
        age > TELEGRAM_AUTH_MAX_AGE
      ) {

        throw new Error(
          'Telegram authorization expired'
        );

      }


      const pairs = [];


      for (
        const [
          key,
          value
        ]
        of params.entries()
      ) {

        if (
          key !==
          'hash'
        ) {

          pairs.push(
            `${key}=${value}`
          );

        }

      }


      pairs.sort();


      const secret =
        crypto
          .createHmac(
            'sha256',
            'WebAppData'
          )
          .update(
            BOT_TOKEN
          )
          .digest();


      const calculated =
        crypto
          .createHmac(
            'sha256',
            secret
          )
          .update(
            pairs.join(
              '\n'
            )
          )
          .digest(
            'hex'
          );


      const a =
        Buffer.from(
          calculated,
          'hex'
        );


      const b =
        Buffer.from(
          receivedHash,
          'hex'
        );


      if (
        a.length !==
          b.length ||
        !crypto.timingSafeEqual(
          a,
          b
        )
      ) {

        throw new Error(
          'Telegram signature verification failed'
        );

      }


      let telegramUser;


      try {

        telegramUser =
          JSON.parse(
            params.get(
              'user'
            ) ||
            '{}'
          );

      } catch {

        throw new Error(
          'Telegram user data invalid'
        );

      }


      if (
        !telegramUser.id
      ) {

        throw new Error(
          'Telegram user missing'
        );

      }


      return {

        id:
          String(
            telegramUser.id
          ),

        username:
          telegramUser.username ||
          '',

        firstName:
          telegramUser.first_name ||
          'User',

        photoUrl:
          telegramUser.photo_url ||
          null,

        languageCode:
          telegramUser.language_code ||
          'en',

        startParam:
          params.get(
            'start_param'
          ) ||
          ''

      };

    }


    function deviceLabelFromUserAgent(value) {
      const ua=String(value || '').slice(0,500);
      if (!ua) return 'Unknown device';
      const android=ua.match(/Android\s+([^;)]*)(?:;\s*([^;)]+))?/i);
      if (android) { const version=String(android[1] || '').trim(); const model=String(android[2] || '').replace(/\s+Build\/.*/i,'').trim(); return [model || 'Android device',version ? `Android ${version}` : ''].filter(Boolean).join(' · ').slice(0,120); }
      const ios=ua.match(/(iPhone|iPad|iPod).*OS\s([0-9_]+)/i);
      if (ios) return `${ios[1]} · iOS ${ios[2].replaceAll('_','.')}`.slice(0,120);
      if (/Windows NT/i.test(ua)) return 'Windows device';
      if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac device';
      if (/Linux/i.test(ua)) return 'Linux device';
      return 'Unknown device';
    }

    /* =========================================================
       NETWORK SIGNAL IP
       =========================================================
       This value is used only as a low-confidence abuse/risk signal.
       It is NOT authentication and is NOT proof of multi-accounting.

       Render terminates inbound traffic before forwarding it to this
       service. When an upstream such as Vercel is also present, req.ip
       can represent that intermediary. For network-overlap analytics we
       therefore preserve the first X-Forwarded-For address when present.

       Because forwarded headers can be influenced by upstream topology,
       all v2 IP matches remain advisory only. Old IP hashes are excluded
       from v2 overlap checks so historical proxy-contaminated records do
       not create new false positives.
       ========================================================= */

    function normalizeNetworkSignalIp(value) {
      let ip = String(value || '').trim();
      if (!ip) return '';

      if (ip.startsWith('"') && ip.endsWith('"')) {
        ip = ip.slice(1, -1).trim();
      }

      if (ip.startsWith('::ffff:')) {
        ip = ip.slice(7);
      }

      if (ip.startsWith('[')) {
        const close = ip.indexOf(']');
        if (close > 0) ip = ip.slice(1, close);
      } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(ip)) {
        ip = ip.replace(/:\d+$/, '');
      }

      const zone = ip.indexOf('%');
      if (zone > 0) ip = ip.slice(0, zone);

      return ip.slice(0, 128);
    }

    function networkSignalIp(req) {
      const forwarded = String(req.get('x-forwarded-for') || '')
        .split(',')
        .map(normalizeNetworkSignalIp)
        .filter(Boolean);

      if (forwarded.length) {
        return forwarded[0];
      }

      return normalizeNetworkSignalIp(
        req.ip ||
        req.socket?.remoteAddress ||
        ''
      );
    }

    function networkSignalHash(req) {
      const ip = networkSignalIp(req);
      return ip
        ? hash(ip).slice(0, 32)
        : null;
    }

    /* =========================================================
       SECURITY LOG
       ========================================================= */

    async function logSecurity(
      req,
      action,
      severity = 'info',
      metadata = {}
    ) {

      try {

        await pool.query(
          `
          INSERT INTO security_logs(

            telegram_id,

            action,

            severity,

            ip_hash,

            device_hash,

            user_agent_hash,

            metadata

          )

          VALUES(
            $1,$2,$3,$4,$5,$6,$7
          )
          `,
          [

            req.auth?.id ||
            null,

            action,

            severity,

            networkSignalHash(req),

            req.deviceHash ||
            null,

            hash(
              req.get(
                'user-agent'
              ) ||
              ''
            ).slice(
              0,
              32
            ),

            {
              ...(metadata && typeof metadata === 'object' ? metadata : {}),
              network_signal_version: 2
            }

          ]
        );


      } catch (
        error
      ) {

        console.error(
          'Security log failed:',
          error.message
        );

      }

    }


    /* =========================================================
       AUTHENTICATION
       ========================================================= */

    async function authenticate(
      req,
      res,
      next
    ) {

      try {

        let auth;


        // SECURITY: production accepts Telegram credentials from the dedicated
        // header only. Body fallback remains available for local development.
        const initData =
          req.get('X-Telegram-Init-Data') ||
          (!IS_PRODUCTION ? req.body?.initData : '');


        if (
          initData
        ) {

          if (
            !BOT_TOKEN
          ) {

            throw new Error(
              'BOT_TOKEN is not configured'
            );

          }


          auth =
            parseInitData(
              initData
            );


        } else if (

          ALLOW_DEV_AUTH &&

          req.get(
            'X-Dev-User'
          )

        ) {

          const id =
            String(
              req.get(
                'X-Dev-User'
              )
            );


          if (
            !/^\d+$/.test(
              id
            )
          ) {

            throw new Error(
              'Bad dev user'
            );

          }


          auth = {

            id,

            username:
              'dev_user',

            firstName:
              'MAI Tester',

            photoUrl:
              null,

            languageCode:
              'en',

            startParam:
              ''

          };


        } else {

          throw new Error(
            'Open MAI Network inside Telegram'
          );

        }


        req.auth =
          auth;


        /* -------------------------------------------------------
           DEVICE ID HASH
           ------------------------------------------------------- */

        const rawDevice = String(
          req.get('X-MAI-Device-ID') || ''
        ).slice(0, 256);


        req.deviceHash =
          rawDevice
            ? hash(
                rawDevice
              ).slice(
                0,
                48
              )
            : null;


        /* -------------------------------------------------------
           REFERRAL PARAM
           ------------------------------------------------------- */

        const referralMatch =
          String(
            auth.startParam ||
            ''
          ).match(
            /^r_(\d+)$/
          );


        const referredBy =

          referralMatch &&

          referralMatch[1] !==
            auth.id

            ? referralMatch[1]

            : null;


        /* -------------------------------------------------------
           UPSERT USER
           ------------------------------------------------------- */

        // Official-launch referral epoch:
        // after launch, an existing account whose referral was reset may bind
        // exactly once to a new inviter. Pre-launch behavior remains unchanged.
        await ensureMaiV5Schema();
        const launchStateForReferral = await getOfficialLaunchState();
        const officialReferralEpoch =
          launchStateForReferral?.launched && launchStateForReferral?.officialLaunchAt
            ? new Date(launchStateForReferral.officialLaunchAt)
            : null;

        await pool.query(
          `
          INSERT INTO users(

            telegram_id,

            username,

            first_name,

            photo_url,

            balance,

            referred_by,

            referral_assigned_at

          )

          VALUES(
            $1,$2,$3,$4,$5,$6,
            CASE WHEN $6::bigint IS NOT NULL THEN NOW() ELSE NULL END
          )

          ON CONFLICT(
            telegram_id
          )

          DO UPDATE SET

            username=
              EXCLUDED.username,

            first_name=
              EXCLUDED.first_name,

            photo_url=
              COALESCE(
                EXCLUDED.photo_url,
                users.photo_url
              ),

            referred_by=
              CASE
                WHEN $7::boolean
                 AND users.referred_by IS NULL
                 AND EXCLUDED.referred_by IS NOT NULL
                THEN EXCLUDED.referred_by
                ELSE users.referred_by
              END,

            referral_assigned_at=
              CASE
                WHEN $7::boolean
                 AND users.referred_by IS NULL
                 AND EXCLUDED.referred_by IS NOT NULL
                THEN NOW()
                ELSE users.referral_assigned_at
              END,

            updated_at=
              NOW()
          `,
          [

            auth.id,

            auth.username,

            auth.firstName,

            auth.photoUrl,

            cfg.initialBalance,

            referredBy,

            Boolean(officialReferralEpoch)

          ]
        );


        /* -------------------------------------------------------
           REFERRAL RE-QUALIFICATION TRIGGER

           When a genuinely referred user C reaches the backend via
           B's Telegram start parameter, C has already been upserted
           above with referred_by=B. Re-check B immediately so an
           already-completed required activity + this new invite can
           qualify A -> B without waiting for B to farm, claim a
           daily bonus, complete another task, or watch another ad.

           qualifyReferral() remains the single authoritative place
           that enforces both requirements and creates the separate
           50 MAI successful-invite reward idempotently.
           ------------------------------------------------------- */

        if (referredBy) {
          await qualifyReferral(
            pool,
            referredBy
          );
        }


        /* -------------------------------------------------------
           ACCOUNT ACCESS STATE

           Ban/suspension is enforced server-side here.
           ------------------------------------------------------- */

        const accessResult = await pool.query(
          `
          SELECT account_status, suspended_until
          FROM users
          WHERE telegram_id=$1
          LIMIT 1
          `,
          [auth.id]
        );

        const access = accessResult.rows[0];

        if (access?.account_status === 'banned') {
          return res.status(403).json({
            success:false,
            code:'ACCOUNT_BANNED',
            message:'This MAI Network account has been banned'
          });
        }

        if (access?.account_status === 'suspended') {
          const until = access.suspended_until ? new Date(access.suspended_until) : null;

          if (!until || until.getTime() > Date.now()) {
            return res.status(403).json({
              success:false,
              code:'ACCOUNT_SUSPENDED',
              suspendedUntil: until ? until.toISOString() : null,
              message:'This MAI Network account is temporarily suspended'
            });
          }

          await pool.query(
            `UPDATE users
             SET account_status='active', suspended_until=NULL, updated_at=NOW()
             WHERE telegram_id=$1 AND account_status='suspended'`,
            [auth.id]
          );
        }


        /* -------------------------------------------------------
           DEFAULT USER PREFERENCES
           ------------------------------------------------------- */

        await pool.query(
          `
          INSERT INTO user_preferences(

            telegram_id,

            language,

            notifications_enabled,

            sound_enabled

          )

          VALUES(
            $1,
            $2,
            TRUE,
            TRUE
          )

          ON CONFLICT(
            telegram_id
          )

          DO NOTHING
          `,
          [

            auth.id,

            [
              'en',
              'ar',
              'ru'
            ].includes(
              auth.languageCode
            )
              ? auth.languageCode
              : 'en'

          ]
        );


        /* -------------------------------------------------------
           DEVICE ACCOUNT MAP
           ------------------------------------------------------- */

        if (
          req.deviceHash
        ) {

          await pool.query(
            `
            INSERT INTO device_accounts(

              device_hash,
              telegram_id,
              device_label,
              user_agent

            )

            VALUES(
              $1,$2,$3,$4
            )

            ON CONFLICT(
              device_hash,
              telegram_id
            )

            DO UPDATE SET

              last_seen=NOW(),
              device_label=EXCLUDED.device_label,
              user_agent=EXCLUDED.user_agent
            `,
            [

              req.deviceHash,
              auth.id,
              deviceLabelFromUserAgent(req.get('user-agent')),
              String(req.get('user-agent') || '').slice(0,500)

            ]
          );

        }


        next();


      } catch (
        error
      ) {

        return res
          .status(401)
          .json({

            success:
              false,

            message:
              error.message

          });

      }

    }


    /* =========================================================
       RISK CHECK
       ========================================================= */

    async function riskFor(
      req
    ) {

      const flags = [];


      if (
        req.deviceHash
      ) {

        const result =
          await pool.query(
            `
            SELECT
              COUNT(*)::int AS c

            FROM device_accounts

            WHERE
              device_hash=$1
            `,
            [
              req.deviceHash
            ]
          );


        if (
          result.rows[0].c >
          cfg.maxAccountsDevice
        ) {

          flags.push(
            'multi_account_device'
          );

        }

      }


      const ipHash =
        networkSignalHash(req);


      const ipResult =
        await pool.query(
          `
          SELECT

            COUNT(
              DISTINCT telegram_id
            )::int AS c

          FROM security_logs

          WHERE

            ip_hash=$1

            AND

            metadata->>'network_signal_version'='2'

            AND

            created_at >=
              NOW() -
              INTERVAL '1 day'
          `,
          [
            ipHash
          ]
        );


      if (
        ipResult.rows[0].c >
        cfg.maxAccountsIpDay
      ) {

        flags.push(
          'many_accounts_ip'
        );

      }


      return flags;

    }


    /* =========================================================
       TELEGRAM BOT API
       ========================================================= */

    async function telegram(
      method,
      body
    ) {

      if (
        !BOT_TOKEN
      ) {

        throw new Error(
          'BOT_TOKEN is missing'
        );

      }


      const response =
        await fetch(

          `https://api.telegram.org/bot${BOT_TOKEN}/${method}`,

          {

            method:
              'POST',

            headers: {

              'content-type':
                'application/json'

            },

            body:
              JSON.stringify(
                body
              )

          }

        );


      const data =
        await response
          .json()
          .catch(
            () => ({})
          );


      if (
        !data.ok
      ) {

        throw new Error(

          data.description ||

          `Telegram API ${method} failed`

        );

      }


      return data.result;

    }


    /* =========================================================
       TELEGRAM WELCOME
       ========================================================= */

    async function sendStartWelcome(
      message
    ) {

      const chatId =
        message?.chat?.id;


      if (
        !chatId
      ) {

        return;

      }


      const replyMarkup = {

        inline_keyboard: [

          [

            {

              text:
                '🚀 OPEN MAI',

              web_app: {

                url:
                  MINI_APP_URL

              }

            }

          ]

        ]

      };


      if (
        WELCOME_PHOTO_URL
      ) {

        try {

          await telegram(
            'sendPhoto',
            {

              chat_id:
                chatId,

              photo:
                WELCOME_PHOTO_URL,

              caption:
                WELCOME_TEXT,

              reply_markup:
                replyMarkup

            }
          );


          return;


        } catch (
          error
        ) {

          console.warn(

            'Welcome photo failed, using text:',

            error.message

          );

        }

      }


      await telegram(
        'sendMessage',
        {

          chat_id:
            chatId,

          text:
            WELCOME_TEXT,

          reply_markup:
            replyMarkup

        }
      );

    }


    /* =========================================================
       TELEGRAM WEBHOOK
       ========================================================= */

    app.post(

      '/telegram/webhook',

      async (
        req,
        res
      ) => {

        // SECURITY: reject forged webhook POSTs. Telegram documents that
        // secret_token is echoed in X-Telegram-Bot-Api-Secret-Token.
        const suppliedSecret = String(
          req.get('X-Telegram-Bot-Api-Secret-Token') || ''
        );

        const expectedSecret = TELEGRAM_WEBHOOK_SECRET;
        const suppliedBuffer = Buffer.from(suppliedSecret);
        const expectedBuffer = Buffer.from(expectedSecret);

        const validWebhook =
          expectedBuffer.length >= 32 &&
          suppliedBuffer.length === expectedBuffer.length &&
          crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);

        if (!validWebhook) {
          console.warn('[TELEGRAM WEBHOOK BLOCKED] invalid secret');
          return res.sendStatus(401);
        }

        res.sendStatus(
          200
        );


        try {

          const update =
            req.body ||
            {};


          const message =
            update.message ||
            null;


          if (
            !message
          ) {

            return;

          }


          const text =
            String(
              message.text ||
              ''
            ).trim();


          if (
            /^\/start(?:@\w+)?(?:\s|$)/i
              .test(
                text
              )
          ) {

            await sendStartWelcome(
              message
            );

          }


        } catch (
          error
        ) {

          console.error(

            'Telegram webhook error:',

            error.message

          );

        }

      }

    );


    /* =========================================================
       REGISTER TELEGRAM WEBHOOK
       ========================================================= */

    async function registerTelegramWebhook() {

      if (
        !BOT_TOKEN ||
        !PUBLIC_BASE_URL ||
        TELEGRAM_WEBHOOK_SECRET.length < 32
      ) {

        console.warn(

          'Telegram webhook not registered: BOT_TOKEN, PUBLIC_BASE_URL, or 32+ char TELEGRAM_WEBHOOK_SECRET missing'

        );


        return;

      }


      const webhookUrl =
        `${PUBLIC_BASE_URL}/telegram/webhook`;


      const result =
        await telegram(
          'setWebhook',
          {

            url:
              webhookUrl,

            secret_token:
              TELEGRAM_WEBHOOK_SECRET,

            allowed_updates: [
              'message'
            ],

            drop_pending_updates:
              false

          }
        );


      console.log(

        'Telegram webhook registered:',

        webhookUrl,

        result

      );

    }


    /* =========================================================
       REFERRAL QUALIFICATION
       ========================================================= */

    async function qualifyReferral(
      client,
      userId
    ) {

      await ensureMaiV5Schema();

      /*
       * MAI OFFICIAL REFERRAL RULE
       * --------------------------
       * The invited user does not receive a direct invite reward.
       * A referral becomes successful only after the invited user:
       *   1) has at least one verified/completed task record, and
       *   2) has invited at least one genuinely new MAI user.
       *
       * The inviter's 50 MAI reward is accrued into a separate,
       * claimable referral bucket by the V5 referral ledger below.
       * It is NOT credited directly to the main balance here.
       */

      const result =
        await client.query(
          `
          SELECT
            telegram_id,
            referred_by,
            referral_qualified,
            created_at
          FROM users
          WHERE telegram_id=$1
          FOR UPDATE
          `,
          [userId]
        );

      const user = result.rows[0];

      if (
        !user ||
        !user.referred_by ||
        user.referral_qualified
      ) {
        return;
      }

      const launchState = await getOfficialLaunchState();
      const officialLaunchAt =
        launchState?.launched && launchState?.officialLaunchAt
          ? new Date(launchState.officialLaunchAt)
          : null;

      const childResult =
        await client.query(
          `
          SELECT COUNT(*)::int AS c
          FROM users
          WHERE referred_by=$1
            AND telegram_id <> $1
            AND ($2::timestamptz IS NULL OR referral_assigned_at >= $2)
          `,
          [userId, officialLaunchAt]
        );

      const hasValidInvite =
        Number(childResult.rows[0]?.c || 0) >= 1;

      // A successful referral must complete ALL official required tasks
      // at least once. Do not treat one arbitrary task as sufficient.
      const requiredTaskKeys = ['news','payout','chat'];

      const taskResult =
        await client.query(
          `
          SELECT COUNT(DISTINCT task_key)::int AS completed
          FROM daily_task_completions
          WHERE telegram_id=$1
            AND task_key=ANY($2::text[])
            AND ($3::timestamptz IS NULL OR created_at >= $3)
          `,
          [userId, requiredTaskKeys, officialLaunchAt]
        );

      const hasRequiredActivity =
        Number(taskResult.rows[0]?.completed || 0) === requiredTaskKeys.length;

      if (
        !hasValidInvite ||
        !hasRequiredActivity
      ) {
        return;
      }

      const updated =
        await client.query(
          `
          UPDATE users
          SET
            referral_qualified=TRUE,
            updated_at=NOW()
          WHERE telegram_id=$1
            AND referral_qualified=FALSE
          RETURNING telegram_id
          `,
          [userId]
        );

      if (!updated.rowCount) {
        return;
      }

      await client.query(
        `
        INSERT INTO mai_referral_reward_events(
          inviter_id,
          referred_user_id,
          reward_type,
          amount,
          source_reference,
          status
        )
        VALUES(
          $1,
          $2,
          'successful_invite',
          50,
          $2,
          'available'
        )
        ON CONFLICT(
          inviter_id,
          reward_type,
          source_reference
        )
        DO NOTHING
        `,
        [
          String(user.referred_by),
          String(userId)
        ]
      );

    }


    /* =========================================================
       MINING EPOCH / CHECKPOINT ENGINE
       ========================================================= */

    function addUtcMonths(
      date,
      months
    ) {

      const source =
        new Date(
          date
        );

      const day =
        source.getUTCDate();

      const result =
        new Date(
          source.getTime()
        );

      result.setUTCDate(
        1
      );

      result.setUTCMonth(
        result.getUTCMonth() +
        months
      );

      const lastDay =
        new Date(
          Date.UTC(
            result.getUTCFullYear(),
            result.getUTCMonth() + 1,
            0
          )
        ).getUTCDate();

      result.setUTCDate(
        Math.min(
          day,
          lastDay
        )
      );

      return result;

    }


    function miningLaunchDate() {

      if (
        !MINING_LAUNCH_AT_RAW
      ) {

        return null;

      }

      const date =
        new Date(
          MINING_LAUNCH_AT_RAW
        );

      return Number.isFinite(
        date.getTime()
      )
        ? date
        : null;

    }


    function miningScheduleAt(
      date = new Date()
    ) {

      if (
        MINING_MODE !==
        'official'
      ) {

        return {
          mode:
            'test',

          phase:
            'test',

          multiplier:
            1,

          launchAt:
            null,

          endsAt:
            null
        };

      }

      const launch =
        miningLaunchDate();

      if (!launch) {

        return {
          mode:
            'official',

          phase:
            'not_configured',

          multiplier:
            0,

          launchAt:
            null,

          endsAt:
            null
        };

      }

      const now =
        new Date(
          date
        );

      const phase2 =
        addUtcMonths(
          launch,
          6
        );

      const year2 =
        addUtcMonths(
          launch,
          12
        );

      const year3 =
        addUtcMonths(
          launch,
          24
        );

      const end =
        addUtcMonths(
          launch,
          36
        );

      let phase =
        'ended';

      let multiplier =
        0;

      if (
        now <
        launch
      ) {

        phase =
          'pre_launch';

      } else if (
        now <
        phase2
      ) {

        phase =
          'first_6_months';

        multiplier =
          1;

      } else if (
        now <
        year2
      ) {

        phase =
          'second_6_months';

        multiplier =
          0.9;

      } else if (
        now <
        year3
      ) {

        phase =
          'year_2';

        multiplier =
          0.8;

      } else if (
        now <
        end
      ) {

        phase =
          'year_3';

        multiplier =
          0.7;

      }

      return {
        mode:
          'official',

        phase,

        multiplier,

        launchAt:
          launch.toISOString(),

        endsAt:
          end.toISOString()
      };

    }


    function miningRewardBetween(
      startDate,
      endDate,
      baseRateDaily
    ) {

      const start =
        new Date(
          startDate
        );

      const end =
        new Date(
          endDate
        );

      const rate =
        Math.max(
          0,
          safeNumber(
            baseRateDaily
          )
        );

      if (
        !Number.isFinite(
          start.getTime()
        ) ||
        !Number.isFinite(
          end.getTime()
        ) ||
        end <= start ||
        rate <= 0
      ) {

        return 0;

      }

      if (
        MINING_MODE !==
        'official'
      ) {

        return (
          rate *
          (
            end.getTime() -
            start.getTime()
          ) /
          86400000
        );

      }

      const launch =
        miningLaunchDate();

      if (!launch) {

        return 0;

      }

      const boundaries = [
        launch,
        addUtcMonths(
          launch,
          6
        ),
        addUtcMonths(
          launch,
          12
        ),
        addUtcMonths(
          launch,
          24
        ),
        addUtcMonths(
          launch,
          36
        )
      ];

      const points = [
        start,
        ...boundaries.filter(
          point =>
            point > start &&
            point < end
        ),
        end
      ];

      let reward =
        0;

      for (
        let i = 0;
        i < points.length - 1;
        i += 1
      ) {

        const segmentStart =
          points[i];

        const segmentEnd =
          points[i + 1];

        const schedule =
          miningScheduleAt(
            segmentStart
          );

        reward +=
          rate *
          schedule.multiplier *
          (
            segmentEnd.getTime() -
            segmentStart.getTime()
          ) /
          86400000;

      }

      return Math.max(
        0,
        reward
      );

    }


    /*
      SECURITY / FAIRNESS RULE

      A wallet can change outside the Mini App, so the server cannot know
      the exact second of every balance change without a chain event stream.

      For an uncheckpointed interval we use the LOWER of:
        - the previously checkpointed base rate
        - the currently verified base rate

      This prevents a user from keeping a high old rate after moving MAI away.
      A legitimate level increase starts from the next verified checkpoint.
    */

    function farmState(
      row,
      holding,
      now = new Date()
    ) {

      const currentBaseRate =
        Math.max(
          0,
          safeNumber(
            holding?.totalDaily
          )
        );

      const currentLevel =
        Math.max(
          1,
          safeInteger(
            holding?.level,
            1
          )
        );

      const currentTh =
        Math.max(
          0,
          safeNumber(
            holding?.miningTh
          )
        );

      const started =
        row.farm_started_at
          ? new Date(
              row.farm_started_at
            )
          : null;

      const schedule =
        miningScheduleAt(
          now
        );

      if (
        !started ||
        !Number.isFinite(
          started.getTime()
        )
      ) {

        return {
          active:
            false,

          ready:
            false,

          claimable:
            false,

          remaining:
            MINING_MIN_CLAIM_SECONDS,

          pending:
            0,

          accrued:
            0,

          rateDaily:
            currentBaseRate *
            schedule.multiplier,

          baseRateDaily:
            currentBaseRate,

          rateSecond:
            currentBaseRate *
            schedule.multiplier /
            86400,

          level:
            currentLevel,

          miningTh:
            currentTh,

          highestLevel:
            Math.max(
              currentLevel,
              safeInteger(
                row.mining_highest_level,
                1
              )
            ),

          multiplier:
            schedule.multiplier,

          phase:
            schedule.phase,

          mode:
            schedule.mode,

          launchAt:
            schedule.launchAt,

          startedAt:
            null,

          checkpointAt:
            null,

          lastClaimAt:
            row.mining_last_claim_at ||
            null
        };

      }

      const checkpoint =
        row.mining_checkpoint_at
          ? new Date(
              row.mining_checkpoint_at
            )
          : started;

      const safeCheckpoint =
        Number.isFinite(
          checkpoint.getTime()
        )
          ? checkpoint
          : started;

      const storedAccrued =
        Math.max(
          0,
          safeNumber(
            row.mining_accrued
          )
        );

      const savedBaseRateRaw =
        safeNumber(
          row.mining_checkpoint_rate_daily ??
          row.farm_rate_daily
        );

      const savedBaseRate =
        savedBaseRateRaw > 0
          ? savedBaseRateRaw
          : currentBaseRate;

      const intervalBaseRate =
        Math.min(
          savedBaseRate,
          currentBaseRate
        );

      const intervalReward =
        miningRewardBetween(
          safeCheckpoint,
          now,
          intervalBaseRate
        );

      const pending =
        Math.max(
          0,
          storedAccrued +
          intervalReward
        );

      const lastClaim =
        row.mining_last_claim_at
          ? new Date(
              row.mining_last_claim_at
            )
          : started;

      const secondsSinceClaim =
        Math.max(
          0,
          (
            now.getTime() -
            lastClaim.getTime()
          ) /
          1000
        );

      const remaining =
        Math.max(
          0,
          Math.ceil(
            MINING_MIN_CLAIM_SECONDS -
            secondsSinceClaim
          )
        );

      return {
        active:
          true,

        ready:
          remaining === 0 &&
          pending > 0,

        claimable:
          remaining === 0 &&
          pending > 0,

        remaining,

        pending,

        accrued:
          storedAccrued,

        rateDaily:
          currentBaseRate *
          schedule.multiplier,

        baseRateDaily:
          currentBaseRate,

        rateSecond:
          currentBaseRate *
          schedule.multiplier /
          86400,

        level:
          currentLevel,

        miningTh:
          currentTh,

        highestLevel:
          Math.max(
            currentLevel,
            safeInteger(
              row.mining_highest_level,
              1
            )
          ),

        multiplier:
          schedule.multiplier,

        phase:
          schedule.phase,

        mode:
          schedule.mode,

        launchAt:
          schedule.launchAt,

        startedAt:
          row.farm_started_at,

        checkpointAt:
          safeCheckpoint.toISOString(),

        lastClaimAt:
          row.mining_last_claim_at ||
          null
      };

    }

    /* =========================================================
       GET USER PREFERENCES
       ========================================================= */

    async function getUserPreferences(
      userId
    ) {

      const result =
        await pool.query(
          `
          SELECT

            language,

            notifications_enabled,

            sound_enabled

          FROM user_preferences

          WHERE
            telegram_id=$1
          `,
          [
            userId
          ]
        );


      const row =
        result.rows[0];


      return {

        language:
          row?.language ||
          'en',

        notificationsEnabled:
          row?.notifications_enabled !==
          false,

        soundEnabled:
          row?.sound_enabled !==
          false

      };

    }


    /* =========================================================
       BUILD USER
       ========================================================= */

    async function buildUser(
      userId
    ) {

      const userResult =
        await pool.query(
          `
          SELECT *

          FROM users

          WHERE
            telegram_id=$1
          `,
          [
            userId
          ]
        );


      const user =
        userResult.rows[0];


      if (
        !user
      ) {

        throw new Error(
          'User not found'
        );

      }


      const holding =
        await getUserHoldingSnapshot(
          user
        );


      const referrals =
        (
          await pool.query(
            `
            SELECT

              COUNT(*)
              FILTER(
                WHERE referral_qualified
              )::int
              AS successful,

              COUNT(*)
              FILTER(
                WHERE NOT referral_qualified
              )::int
              AS pending

            FROM users

            WHERE
              referred_by=$1
            `,
            [
              userId
            ]
          )
        ).rows[0];


      const farm =
        farmState(
          user,
          holding
        );


      const preferences =
        await getUserPreferences(
          userId
        );


      return {

        telegramId:
          String(
            user.telegram_id
          ),

        username:
          user.username,

        firstName:
          user.first_name,

        photoUrl:
          user.photo_url,


        /* -------------------------------------------------------
           IN-GAME
           ------------------------------------------------------- */

        balance:
          safeNumber(
            user.balance
          ),

        inGameBalance:
          safeNumber(
            user.balance
          ),

        lockedBalance:
          safeNumber(
            user.locked_balance
          ),


        /* -------------------------------------------------------
           TON WALLET
           ------------------------------------------------------- */

        walletHolding:
          holding.wallet,


        /* -------------------------------------------------------
           TOTAL HOLDING
           ------------------------------------------------------- */

        totalHolding:
          holding.total,


        /* -------------------------------------------------------
           LEVEL
           ------------------------------------------------------- */

        level:
          holding.level,

        levelMiningSpeed:
          holding.totalDaily,

        miningSpeed:
          holding.totalDaily,

        miningTh:
          holding.miningTh,

        freeMiningSpeed:
          getMiningLevel(1).baseMaiPerDay,

        maxLevel:
          MAI_MINING_LEVELS.length,

        highestLevel:
          farm.highestLevel,

        miningMode:
          farm.mode,

        miningPhase:
          farm.phase,

        miningMultiplier:
          farm.multiplier,

        miningLaunchAt:
          farm.launchAt,


        /* -------------------------------------------------------
           WALLET
           ------------------------------------------------------- */

        walletAddress:
          user.wallet_address,

        walletConnectedAt:
          user.wallet_connected_at,


        /* -------------------------------------------------------
           REFERRAL
           ------------------------------------------------------- */

        referralLink:
          referralLink(
            user.telegram_id
          ),

        referrals: {

          successful:
            referrals.successful ||
            0,

          pending:
            referrals.pending ||
            0

        },


        farm,


        dailyBonusClaimed:

          String(
            user.daily_bonus_date ||
            ''
          ) ===
          utcDay(),


        preferences

      };

    }


    /* =========================================================
       TASK STATE HELPER
       ========================================================= */

    function taskStateFromRow(
      row
    ) {

      if (
        row?.claimed_at
      ) {

        return 'claimed';

      }


      if (
        row?.verified_at
      ) {

        return 'claim';

      }


      if (
        row?.joined_clicked_at
      ) {

        return 'check';

      }


      return 'join';

    }


    /* =========================================================
       TASK OVERVIEW

       JOIN
       CHECK
       CLAIM
       CLAIMED

       Every new UTC date starts clean.
       ========================================================= */

    async function taskOverview(
      userId
    ) {

      const day =
        utcDay();


      const progressRows =
        (
          await pool.query(
            `
            SELECT

              task_key,

              joined_clicked_at,

              verified_at,

              claimed_at,

              reward

            FROM daily_task_progress

            WHERE

              telegram_id=$1

              AND day=$2
            `,
            [
              userId,
              day
            ]
          )
        ).rows;


      const progressMap =
        new Map(

          progressRows.map(
            row => [
              row.task_key,
              row
            ]
          )

        );


      const activeAdRows = (await pool.query(`
        SELECT c.id,c.name,c.provider,c.block_id,c.reward,c.daily_limit,c.cooldown_seconds,c.mode,c.ads_per_claim,
          COUNT(s.id) FILTER (WHERE s.claimed_at IS NOT NULL)::int AS completed
        FROM ad_campaigns c
        LEFT JOIN ad_sessions s
          ON s.campaign_id=c.id AND s.telegram_id=$1 AND s.day=$2
        WHERE c.status='active' AND COALESCE(c.admin_hidden,FALSE)=FALSE
        GROUP BY c.id
        ORDER BY c.updated_at DESC,c.id DESC
      `,[userId,day])).rows;

      const adCampaigns = activeAdRows.map(row => ({
        id: String(row.id),
        name: row.name,
        provider: row.provider,
        blockId: row.block_id,
        reward: Number(row.reward || 0),
        limit: Number(row.daily_limit || 0),
        completed: Number(row.completed || 0),
        remaining: Math.max(0, Number(row.daily_limit || 0) - Number(row.completed || 0)),
        cooldown: Number(row.cooldown_seconds || 0),
        mode: row.mode,
        adsPerClaim: Math.max(1, Math.min(3, Number(row.ads_per_claim || 1))),
        resetAt: nextUtcResetAt()
      }));

      // Bootstrap fallback only for installations that have never created an ad campaign.
      if (!adCampaigns.length) {
        const campaignCount = Number((await pool.query(`SELECT COUNT(*)::int AS c FROM ad_campaigns WHERE COALESCE(admin_hidden,FALSE)=FALSE`)).rows[0]?.c || 0);
        if (campaignCount === 0 && cfg.adsgramBlockId) {
          const fallbackCount = Number((await pool.query(`SELECT COUNT(*)::int AS c FROM ad_sessions WHERE telegram_id=$1 AND day=$2 AND campaign_id IS NULL AND claimed_at IS NOT NULL`,[userId,day])).rows[0]?.c || 0);
          adCampaigns.push({id:null,name:'MAI Rewarded Ads',provider:'adsgram',blockId:cfg.adsgramBlockId,reward:cfg.adReward,limit:cfg.adDailyLimit,completed:fallbackCount,remaining:Math.max(0,cfg.adDailyLimit-fallbackCount),cooldown:cfg.adCooldown,mode:(cfg.adProviderMode==='adsgram_test'||cfg.adsgramDebug)?'test':'production',adsPerClaim:1,resetAt:nextUtcResetAt()});
        }
      }

      const adCount = adCampaigns.reduce((sum,item)=>sum+Number(item.completed||0),0);


      const joins =
        Object
          .values(
            tasks
          )
          .map(
            task => {

              const row =
                progressMap.get(
                  task.key
                );


              const state =
                taskStateFromRow(
                  row
                );


              return {

                ...task,

                reward:
                  cfg.taskReward,

                state,

                completed:
                  state ===
                  'claimed',

                verified:
                  state ===
                    'claim' ||
                  state ===
                    'claimed',

                claimed:
                  state ===
                  'claimed',

                joinedClicked:
                  !!row?.joined_clicked_at,

                resetAt:
                  nextUtcResetAt()

              };

            }
          );


      return {

        day,

        resetAt:
          nextUtcResetAt(),


        ads: {
          campaigns: adCampaigns,
          completed: adCount,
          activeCount: adCampaigns.length,
          resetAt: nextUtcResetAt()
        },


        joins,


        hasIncomplete:

          adCampaigns.some(item => Number(item.completed||0) < Number(item.limit||0)) ||

          joins.some(
            task =>
              !task.claimed
          )

      };

    }




    /* =========================================================
       MANAGED TASKS & MISSIONS API
       Server/database are authoritative for verification/rewards.
       ========================================================= */
    const MANAGED_TASK_TYPES = new Set([
      'telegram_join','telegram_bot','visit_link','invite_friends',
      'hold_mai','mining_mission','daily_mission','custom'
    ]);

    function managedPeriodKey(task) {
      return String(task?.recurrence || 'once') === 'daily' ? utcDay() : 'once';
    }

    async function managedPeriodKeyForUser(task, userId, db = pool) {
      if (String(task?.recurrence || 'once') !== 'interval') return managedPeriodKey(task);
      const hours = Math.max(1, safeInteger(task?.refresh_hours, 4));
      const last = (await db.query(`SELECT id,claimed_at FROM managed_task_completions WHERE telegram_id=$1 AND task_id=$2 AND claimed_at IS NOT NULL ORDER BY claimed_at DESC,id DESC LIMIT 1`,[userId,task.id])).rows[0];
      if (!last) return 'interval:0';
      const nextAt = new Date(last.claimed_at).getTime() + hours * 3600000;
      if (Date.now() < nextAt) return null;
      return `interval:${last.id}`;
    }

    function managedTaskIsLive(task) {
      const now = Date.now();
      if (String(task?.status) !== 'active') return false;
      if (task?.starts_at && new Date(task.starts_at).getTime() > now) return false;
      if (task?.ends_at && new Date(task.ends_at).getTime() <= now) return false;
      return true;
    }

    const MANAGED_LINK_GATE_SECONDS = 10;

    async function managedTaskGate(task, userId, db = pool) {
      const row = (await db.query(
        `SELECT started_at FROM managed_task_engagements WHERE telegram_id=$1 AND task_id=$2 LIMIT 1`,
        [userId, task.id]
      )).rows[0];
      if (!row?.started_at) return { started:false, ready:false, remainingSeconds:MANAGED_LINK_GATE_SECONDS };
      const startedAt = new Date(row.started_at);
      const readyAt = new Date(startedAt.getTime() + MANAGED_LINK_GATE_SECONDS * 1000);
      const remainingSeconds = Math.max(0, Math.ceil((readyAt.getTime() - Date.now()) / 1000));
      return { started:true, ready:remainingSeconds === 0, startedAt:startedAt.toISOString(), readyAt:readyAt.toISOString(), remainingSeconds };
    }

    async function managedTaskVerification(task, userId) {
      const rules = task?.rule_config || {};
      const type = String(task?.task_type || '');

      if (type === 'telegram_join' || type === 'telegram_bot') {
        const gate = await managedTaskGate(task, userId);
        if (!gate.started) return { verified:false, gateRequired:true, remainingSeconds:MANAGED_LINK_GATE_SECONDS, message:'Open the task first, then wait 10 seconds.' };
        if (!gate.ready) return { verified:false, gateRequired:true, remainingSeconds:gate.remainingSeconds, readyAt:gate.readyAt, message:`Please wait ${gate.remainingSeconds}s before verification.` };
      }

      if (type === 'telegram_join') {
        if (!task.telegram_chat_id) return { verified:false, message:'Telegram chat is not configured.' };
        const ok = await verifyTelegramMembership({ chatId:task.telegram_chat_id }, userId);
        return { verified:ok, message:ok ? 'Telegram membership verified.' : 'Join the Telegram channel/group first.' };
      }

      if (type === 'telegram_bot') {
        // Telegram cannot prove /start activity for an arbitrary third-party bot.
        // External bots therefore use the explicit 10-second server gate. MAI-owned
        // integrations can opt into stronger event verification from Admin.
        const mode = String(rules.verificationMode || 'external_gate').trim();
        if (mode !== 'mai_event') {
          return { verified:true, verification:'external_gate', message:'10-second task gate completed.' };
        }
        const eventType = String(rules.eventType || '').trim();
        if (!eventType) return { verified:false, message:'MAI event verification is selected but no server event type is configured.' };
        const q = await pool.query(`SELECT 1 FROM transactions WHERE telegram_id=$1 AND type=$2 LIMIT 1`, [userId,eventType]);
        return { verified:q.rowCount > 0, message:q.rowCount ? 'MAI bot activity verified.' : 'Required MAI bot activity is not recorded yet.' };
      }

      if (type === 'visit_link') {
        return { verified:false, message:'External page visits cannot be securely verified yet. This task is view-only until a verification integration is configured.' };
      }

      if (type === 'invite_friends') {
        const required = Math.max(1, safeInteger(rules.count, 1));
        const q = await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE referred_by=$1`, [userId]);
        const count = safeInteger(q.rows[0]?.c, 0);
        return { verified:count >= required, progress:count, required, message:`${count}/${required} referred users recorded.` };
      }

      if (type === 'hold_mai') {
        const required = Math.max(0, safeNumber(rules.amount));
        const q = await pool.query(`SELECT balance,wallet_address FROM users WHERE telegram_id=$1 LIMIT 1`, [userId]);
        if (!q.rowCount) return { verified:false, message:'User not found.' };
        const holding = await getUserHoldingSnapshot(q.rows[0]);
        return { verified:safeNumber(holding.total) >= required, progress:safeNumber(holding.total), required, message:`Holding ${safeNumber(holding.total).toFixed(2)} / ${required.toFixed(2)} MAI.` };
      }

      if (type === 'mining_mission' || type === 'daily_mission') {
        const required = Math.max(1, safeInteger(rules.claims, 1));
        const params = [userId];
        let dateClause = '';
        if (type === 'daily_mission') { dateClause = ` AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')`; }
        const q = await pool.query(`SELECT COUNT(*)::int AS c FROM transactions WHERE telegram_id=$1 AND type='farm_claim' ${dateClause}`, params);
        const count = safeInteger(q.rows[0]?.c, 0);
        return { verified:count >= required, progress:count, required, message:`${count}/${required} mining claims recorded.` };
      }

      return { verified:false, message:'Custom missions require a supported structured verification rule.' };
    }

    async function managedTaskListForUser(userId) {
      const tasks = (await pool.query(`
        SELECT t.*,
          (SELECT COUNT(*)::int FROM managed_task_completions cc WHERE cc.task_id=t.id AND cc.claimed_at IS NOT NULL) AS completion_count
        FROM managed_tasks t
        WHERE t.status='active' AND COALESCE(t.admin_hidden,FALSE)=FALSE
          AND (t.starts_at IS NULL OR t.starts_at <= NOW())
          AND (t.ends_at IS NULL OR t.ends_at > NOW())
        ORDER BY t.created_at DESC
      `)).rows;
      const out=[];
      for (const t of tasks) {
        const limit=t.claim_limit==null?null:Math.max(1,safeInteger(t.claim_limit,1));
        const used=Math.max(0,safeInteger(t.completion_count,0));
        if(limit!==null && used>=limit) continue;
        let period=managedPeriodKey(t);
        let nextEligibleAt=null;
        if(String(t.recurrence)==='interval') {
          const last=(await pool.query(`SELECT id,verified_at,claimed_at,reward_snapshot FROM managed_task_completions WHERE telegram_id=$1 AND task_id=$2 AND claimed_at IS NOT NULL ORDER BY claimed_at DESC,id DESC LIMIT 1`,[userId,t.id])).rows[0];
          const hours=Math.max(1,safeInteger(t.refresh_hours,4));
          if(last?.claimed_at) {
            nextEligibleAt=new Date(new Date(last.claimed_at).getTime()+hours*3600000).toISOString();
            period=Date.now()>=new Date(nextEligibleAt).getTime()?`interval:${last.id}`:null;
          } else period='interval:0';
          if(period===null) {
            out.push({id:String(t.id),title:t.title,description:t.description,icon:t.icon,type:t.task_type,reward:safeNumber(t.reward),link:t.target_url,recurrence:t.recurrence,refreshHours:hours,claimLimit:limit,completionCount:used,remaining:limit===null?null:Math.max(0,limit-used),startsAt:t.starts_at,endsAt:t.ends_at,verified:false,completed:true,state:'claimed',nextEligibleAt});
            continue;
          }
        }
        const c=(await pool.query(`SELECT verified_at,claimed_at,reward_snapshot FROM managed_task_completions WHERE telegram_id=$1 AND task_id=$2 AND period_key=$3 LIMIT 1`,[userId,t.id,period])).rows[0];
        const gate=['telegram_join','telegram_bot'].includes(String(t.task_type))
          ? await managedTaskGate(t,userId)
          : null;
        out.push({
          id:String(t.id), title:t.title, description:t.description, icon:t.icon,
          type:t.task_type, reward:safeNumber(t.reward), link:t.target_url,
          recurrence:t.recurrence, refreshHours:t.refresh_hours, claimLimit:limit,
          completionCount:used, remaining:limit===null?null:Math.max(0,limit-used),
          startsAt:t.starts_at, endsAt:t.ends_at,
          verified:!!c?.verified_at, completed:!!c?.claimed_at,
          state:c?.claimed_at ? 'claimed' : c?.verified_at ? 'claim' : 'verify', nextEligibleAt,
          gateStarted:!!gate?.started, gateReady:!!gate?.ready, gateReadyAt:gate?.readyAt||null,
          gateRemainingSeconds:gate?.remainingSeconds??null
        });
      }
      return out;
    }

    async function managedMissionListForUser(userId) {
      const missions = (await pool.query(`
        SELECT m.* FROM managed_missions m
        WHERE m.status='active'
          AND (m.starts_at IS NULL OR m.starts_at <= NOW())
          AND (m.ends_at IS NULL OR m.ends_at > NOW())
        ORDER BY m.featured DESC, m.created_at DESC
      `)).rows;
      const out=[];
      for (const m of missions) {
        const rows=(await pool.query(`
          SELECT t.id,t.title,t.reward,t.recurrence,
            c.claimed_at
          FROM managed_mission_tasks mt
          JOIN managed_tasks t ON t.id=mt.task_id
          LEFT JOIN LATERAL (
            SELECT cc.claimed_at FROM managed_task_completions cc
            WHERE cc.task_id=t.id AND cc.telegram_id=$2
              AND (t.recurrence='interval' OR cc.period_key=(CASE WHEN t.recurrence='daily' THEN $3 ELSE 'once' END))
            ORDER BY cc.claimed_at DESC NULLS LAST,cc.id DESC LIMIT 1
          ) c ON TRUE
          WHERE mt.mission_id=$1
          ORDER BY mt.sort_order,t.id
        `,[m.id,userId,utcDay()])).rows;
        const done=rows.filter(x=>x.claimed_at).length;
        const claimed=(await pool.query(`SELECT 1 FROM managed_mission_completions WHERE telegram_id=$1 AND mission_id=$2`,[userId,m.id])).rowCount>0;
        out.push({ id:String(m.id), title:m.title, description:m.description, icon:m.icon, featured:m.featured,
          completionBonus:safeNumber(m.completion_bonus), progress:done, total:rows.length, completed:rows.length>0 && done===rows.length,
          bonusClaimed:claimed, tasks:rows.map(x=>({id:String(x.id),title:x.title,reward:safeNumber(x.reward),completed:!!x.claimed_at})) });
      }
      return out;
    }

    app.get('/api/managed-tasks', authenticate, async (req,res,next)=>{
      try { res.json({success:true,tasks:await managedTaskListForUser(req.auth.id)}); } catch(e){ next(e); }
    });
    app.get('/api/missions', authenticate, async (req,res,next)=>{
      try { res.json({success:true,missions:await managedMissionListForUser(req.auth.id)}); } catch(e){ next(e); }
    });

    app.post('/api/managed-tasks/:id/start', authenticate, rateLimit(30,60000), async (req,res,next)=>{
      try {
        const task=(await pool.query(`SELECT * FROM managed_tasks WHERE id=$1 LIMIT 1`,[req.params.id])).rows[0];
        if(!task || !managedTaskIsLive(task)) return res.status(404).json({success:false,message:'Task is not active.'});
        if(!['telegram_join','telegram_bot'].includes(String(task.task_type))) return res.status(400).json({success:false,message:'This task does not use the 10-second link gate.'});
        const period=await managedPeriodKeyForUser(task,req.auth.id);
        if(period===null) return res.status(409).json({success:false,message:'Task cooldown is still active.'});
        const used=(await pool.query(`SELECT COUNT(*)::int AS c FROM managed_task_completions WHERE task_id=$1 AND claimed_at IS NOT NULL`,[task.id])).rows[0]?.c||0;
        if(task.claim_limit!=null && used>=safeInteger(task.claim_limit,0)) return res.status(409).json({success:false,message:'Task limit has been reached.'});
        await pool.query(`INSERT INTO managed_task_engagements(telegram_id,task_id,started_at,updated_at) VALUES($1,$2,NOW(),NOW())
          ON CONFLICT(telegram_id,task_id) DO UPDATE SET started_at=NOW(),updated_at=NOW()`,[req.auth.id,task.id]);
        const gate=await managedTaskGate(task,req.auth.id);
        res.json({success:true,gateSeconds:MANAGED_LINK_GATE_SECONDS,readyAt:gate.readyAt,message:'Task opened. Wait 10 seconds, then verify.'});
      } catch(e){ next(e); }
    });

    app.post('/api/managed-tasks/:id/verify', authenticate, rateLimit(20,60000), async (req,res,next)=>{
      try {
        const q=await pool.query(`SELECT * FROM managed_tasks WHERE id=$1 LIMIT 1`,[req.params.id]);
        const task=q.rows[0];
        if(!task || !managedTaskIsLive(task)) return res.status(404).json({success:false,message:'Task is not active.'});
        const check=await managedTaskVerification(task,req.auth.id);
        if(!check.verified) return res.status(409).json({success:false,verified:false,...check});
        const period=await managedPeriodKeyForUser(task,req.auth.id);
        if(period===null) return res.status(409).json({success:false,message:'Task cooldown is still active.'});
        const used=(await pool.query(`SELECT COUNT(*)::int AS c FROM managed_task_completions WHERE task_id=$1 AND claimed_at IS NOT NULL`,[task.id])).rows[0]?.c||0;
        if(task.claim_limit!=null && used>=safeInteger(task.claim_limit,0)) return res.status(409).json({success:false,message:'Task limit has been reached.'});
        await pool.query(`INSERT INTO managed_task_completions(telegram_id,task_id,period_key,reward_snapshot,verified_at)
          VALUES($1,$2,$3,$4,NOW()) ON CONFLICT(telegram_id,task_id,period_key) DO UPDATE SET verified_at=COALESCE(managed_task_completions.verified_at,NOW())`,
          [req.auth.id,task.id,period,safeNumber(task.reward)]);
        res.json({success:true,verified:true,reward:safeNumber(task.reward),message:'Verified. Reward is ready to claim.'});
      } catch(e){ next(e); }
    });

    app.post('/api/managed-tasks/:id/claim', authenticate, rateLimit(20,60000), async (req,res,next)=>{
      const client=await pool.connect();
      try {
        await client.query('BEGIN');
        const q=await client.query(`SELECT * FROM managed_tasks WHERE id=$1 FOR UPDATE`,[req.params.id]);
        const task=q.rows[0];
        if(!task || !managedTaskIsLive(task)){ await client.query('ROLLBACK'); return res.status(404).json({success:false,message:'Task is not active.'}); }
        const period=await managedPeriodKeyForUser(task,req.auth.id,client);
        if(period===null){ await client.query('ROLLBACK'); return res.status(409).json({success:false,message:'Task cooldown is still active.'}); }
        const used=(await client.query(`SELECT COUNT(*)::int AS c FROM managed_task_completions WHERE task_id=$1 AND claimed_at IS NOT NULL`,[task.id])).rows[0]?.c||0;
        if(task.claim_limit!=null && used>=safeInteger(task.claim_limit,0)){ await client.query('ROLLBACK'); return res.status(409).json({success:false,message:'Task limit has been reached.'}); }
        const c=(await client.query(`SELECT * FROM managed_task_completions WHERE telegram_id=$1 AND task_id=$2 AND period_key=$3 FOR UPDATE`,[req.auth.id,task.id,period])).rows[0];
        if(!c?.verified_at){ await client.query('ROLLBACK'); return res.status(409).json({success:false,message:'Verify the task first.'}); }
        if(c.claimed_at){ await client.query('ROLLBACK'); return res.json({success:true,reward:safeNumber(c.reward_snapshot),alreadyClaimed:true,user:await buildUser(req.auth.id)}); }
        const reward=safeNumber(c.reward_snapshot);
        await client.query(`UPDATE users SET balance=balance+$2,updated_at=NOW() WHERE telegram_id=$1`,[req.auth.id,reward]);
        await client.query(`UPDATE managed_task_completions SET claimed_at=NOW() WHERE id=$1`,[c.id]);
        await client.query(`DELETE FROM managed_task_engagements WHERE telegram_id=$1 AND task_id=$2`,[req.auth.id,task.id]);
        await client.query(`INSERT INTO transactions(telegram_id,type,amount,reference,metadata) VALUES($1,'managed_task',$2,$3,$4)`,[req.auth.id,reward,`task:${task.id}:${period}`,{taskId:String(task.id),title:task.title,period}]);
        await client.query('COMMIT');
        res.json({success:true,reward,user:await buildUser(req.auth.id),tasks:await managedTaskListForUser(req.auth.id)});
      } catch(e){ try{await client.query('ROLLBACK')}catch{}; next(e); } finally { client.release(); }
    });

    app.post('/api/missions/:id/claim', authenticate, rateLimit(10,60000), async (req,res,next)=>{
      const client=await pool.connect();
      try{
        await client.query('BEGIN');
        const m=(await client.query(`SELECT * FROM managed_missions WHERE id=$1 AND status='active' FOR UPDATE`,[req.params.id])).rows[0];
        if(!m){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Mission is not active.'});}
        const rows=(await client.query(`SELECT t.id,t.recurrence,c.claimed_at FROM managed_mission_tasks mt JOIN managed_tasks t ON t.id=mt.task_id LEFT JOIN LATERAL (SELECT cc.claimed_at FROM managed_task_completions cc WHERE cc.task_id=t.id AND cc.telegram_id=$2 AND (t.recurrence='interval' OR cc.period_key=(CASE WHEN t.recurrence='daily' THEN $3 ELSE 'once' END)) ORDER BY cc.claimed_at DESC NULLS LAST,cc.id DESC LIMIT 1) c ON TRUE WHERE mt.mission_id=$1`,[m.id,req.auth.id,utcDay()])).rows;
        if(!rows.length || rows.some(x=>!x.claimed_at)){await client.query('ROLLBACK');return res.status(409).json({success:false,message:'Complete every mission task first.'});}
        const ins=await client.query(`INSERT INTO managed_mission_completions(telegram_id,mission_id,bonus_snapshot) VALUES($1,$2,$3) ON CONFLICT DO NOTHING RETURNING mission_id`,[req.auth.id,m.id,safeNumber(m.completion_bonus)]);
        if(!ins.rowCount){await client.query('ROLLBACK');return res.json({success:true,alreadyClaimed:true,user:await buildUser(req.auth.id)});}
        const bonus=safeNumber(m.completion_bonus);
        await client.query(`UPDATE users SET balance=balance+$2,updated_at=NOW() WHERE telegram_id=$1`,[req.auth.id,bonus]);
        await client.query(`INSERT INTO transactions(telegram_id,type,amount,reference,metadata) VALUES($1,'mission_bonus',$2,$3,$4)`,[req.auth.id,bonus,`mission:${m.id}`,{missionId:String(m.id),title:m.title}]);
        await client.query('COMMIT');
        res.json({success:true,reward:bonus,user:await buildUser(req.auth.id),missions:await managedMissionListForUser(req.auth.id)});
      }catch(e){try{await client.query('ROLLBACK')}catch{};next(e);}finally{client.release();}
    });

    /* ---------------- ADMIN TASKS & MISSIONS ---------------- */
    app.get('/admin/tasks', authenticate, admin, async (req,res,next)=>{try{
      const items=(await pool.query(`SELECT t.*, (SELECT COUNT(*)::int FROM managed_task_completions c WHERE c.task_id=t.id AND c.claimed_at IS NOT NULL) AS completion_count FROM managed_tasks t WHERE COALESCE(t.admin_hidden,FALSE)=FALSE ORDER BY t.created_at DESC`)).rows;
      res.json({success:true,items});
    }catch(e){next(e)}});

    app.post('/admin/tasks', authenticate, admin, async (req,res,next)=>{try{
      const b=req.body||{}; const type=String(b.taskType||'').trim();
      if(!MANAGED_TASK_TYPES.has(type)) return res.status(400).json({success:false,message:'Unsupported task type.'});
      const title=String(b.title||'').trim().slice(0,120); if(!title) return res.status(400).json({success:false,message:'Title is required.'});
      const reward=Math.max(0,safeNumber(b.reward));
      const recurrence=['daily','interval'].includes(String(b.recurrence))?String(b.recurrence):'once';
      const refreshHours=recurrence==='interval'?Math.max(1,Math.min(8760,safeInteger(b.refreshHours,4))):null;
      const claimLimit=(b.claimLimit===null || b.claimLimit==='' || String(b.claimLimit).toLowerCase()==='all')?null:Math.max(1,safeInteger(b.claimLimit,1));
      const status=['draft','active','paused'].includes(b.status)?b.status:'draft';
      const rules=(b.ruleConfig && typeof b.ruleConfig==='object' && !Array.isArray(b.ruleConfig))?b.ruleConfig:{};
      if(status==='active' && type==='telegram_join' && !String(b.telegramChatId||'').trim()) return res.status(400).json({success:false,message:'Telegram chat ID / @username is required before publishing.'});
      if(status==='active' && type==='telegram_bot' && String(rules.verificationMode||'external_gate')==='mai_event' && !String(rules.eventType||'').trim()) return res.status(400).json({success:false,message:'MAI-owned event verification requires a server event type before publishing.'});
      if(status==='active' && ['visit_link','custom'].includes(type)) return res.status(400).json({success:false,message:'This task type has no secure automatic verifier yet. Save it as draft until a verifier is configured.'});
      const r=await pool.query(`INSERT INTO managed_tasks(title,description,icon,task_type,reward,target_url,telegram_chat_id,rule_config,recurrence,refresh_hours,claim_limit,status,starts_at,ends_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,[title,String(b.description||'').slice(0,1000),String(b.icon||'✦').slice(0,16),type,reward,b.targetUrl||null,b.telegramChatId||null,rules,recurrence,refreshHours,claimLimit,status,b.startsAt||null,b.endsAt||null,req.admin?.telegramId||null]);
      await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'task_created','managed_task',$2,$3,$4)`,[req.admin?.telegramId||null,String(r.rows[0].id),{title,type,reward,status,recurrence,refreshHours,claimLimit},hash(req.ip).slice(0,32)]);
      res.json({success:true,item:r.rows[0]});
    }catch(e){next(e)}});

    app.post('/admin/tasks/:id/status', authenticate, admin, async (req,res,next)=>{try{
      const status=String(req.body?.status||''); if(!['active','paused','ended'].includes(status)) return res.status(400).json({success:false,message:'Invalid status.'});
      const r=await pool.query(`UPDATE managed_tasks SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,[req.params.id,status]); if(!r.rowCount)return res.status(404).json({success:false,message:'Task not found.'});
      await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'task_status_changed','managed_task',$2,$3,$4)`,[req.admin?.telegramId||null,String(req.params.id),{status},hash(req.ip).slice(0,32)]);
      res.json({success:true,item:r.rows[0]});
    }catch(e){next(e)}});

    app.delete('/admin/tasks/:id', authenticate, admin, async (req,res,next)=>{try{
      const r=await pool.query(`UPDATE managed_tasks SET status='ended',admin_hidden=TRUE,updated_at=NOW() WHERE id=$1 AND COALESCE(admin_hidden,FALSE)=FALSE RETURNING id,title`,[req.params.id]);
      if(!r.rowCount)return res.status(404).json({success:false,message:'Task not found.'});
      await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'task_admin_hidden','managed_task',$2,$3,$4)`,[req.admin?.telegramId||null,String(req.params.id),{title:r.rows[0].title,preservedHistory:true},hash(req.ip).slice(0,32)]);
      res.json({success:true,message:'Task removed from Admin history. Completion and audit records were preserved.'});
    }catch(e){next(e)}});

    app.get('/admin/missions', authenticate, admin, async (req,res,next)=>{try{
      const items=(await pool.query(`SELECT m.*, COALESCE(json_agg(json_build_object('id',t.id,'title',t.title,'reward',t.reward) ORDER BY mt.sort_order) FILTER (WHERE t.id IS NOT NULL),'[]') AS tasks FROM managed_missions m LEFT JOIN managed_mission_tasks mt ON mt.mission_id=m.id LEFT JOIN managed_tasks t ON t.id=mt.task_id WHERE COALESCE(m.admin_hidden,FALSE)=FALSE GROUP BY m.id ORDER BY m.created_at DESC`)).rows;
      res.json({success:true,items});
    }catch(e){next(e)}});

    app.post('/admin/missions', authenticate, admin, async (req,res,next)=>{const client=await pool.connect();try{
      await client.query('BEGIN'); const b=req.body||{}; const title=String(b.title||'').trim().slice(0,120); if(!title){await client.query('ROLLBACK');return res.status(400).json({success:false,message:'Title is required.'});}
      const status=['draft','active','paused'].includes(b.status)?b.status:'draft';
      const r=await client.query(`INSERT INTO managed_missions(title,description,icon,completion_bonus,status,featured,starts_at,ends_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[title,String(b.description||'').slice(0,1000),String(b.icon||'◆').slice(0,16),Math.max(0,safeNumber(b.completionBonus)),status,!!b.featured,b.startsAt||null,b.endsAt||null,req.admin?.telegramId||null]);
      const ids=Array.isArray(b.taskIds)?[...new Set(b.taskIds.map(x=>String(x)).filter(x=>/^\d+$/.test(x)))]:[];
      if(ids.length){
        const existing=(await client.query(`SELECT id::text AS id FROM managed_tasks WHERE id=ANY($1::bigint[])`,[ids])).rows.map(x=>String(x.id));
        const existingSet=new Set(existing);
        const missing=ids.filter(id=>!existingSet.has(String(id)));
        if(missing.length){
          await client.query('ROLLBACK');
          return res.status(400).json({success:false,message:`Selected task does not exist: ${missing.join(', ')}`,missingTaskIds:missing});
        }
      }
      for(let i=0;i<ids.length;i++) await client.query(`INSERT INTO managed_mission_tasks(mission_id,task_id,sort_order) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,[r.rows[0].id,ids[i],i]);
      await client.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'mission_created','managed_mission',$2,$3,$4)`,[req.admin?.telegramId||null,String(r.rows[0].id),{title,status,taskIds:ids},hash(req.ip).slice(0,32)]);
      await client.query('COMMIT'); res.json({success:true,item:r.rows[0]});
    }catch(e){try{await client.query('ROLLBACK')}catch{};next(e)}finally{client.release()}});

    app.post('/admin/missions/:id/status', authenticate, admin, async (req,res,next)=>{try{
      const status=String(req.body?.status||''); if(!['active','paused','ended'].includes(status)) return res.status(400).json({success:false,message:'Invalid status.'});
      const r=await pool.query(`UPDATE managed_missions SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,[req.params.id,status]); if(!r.rowCount)return res.status(404).json({success:false,message:'Mission not found.'});
      await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'mission_status_changed','managed_mission',$2,$3,$4)`,[req.admin?.telegramId||null,String(req.params.id),{status},hash(req.ip).slice(0,32)]);
      res.json({success:true,item:r.rows[0]});
    }catch(e){next(e)}});


    app.delete('/admin/missions/:id', authenticate, admin, async (req,res,next)=>{try{
      const r=await pool.query(`UPDATE managed_missions SET status='ended',admin_hidden=TRUE,updated_at=NOW() WHERE id=$1 AND COALESCE(admin_hidden,FALSE)=FALSE RETURNING id,title`,[req.params.id]);
      if(!r.rowCount)return res.status(404).json({success:false,message:'Mission not found.'});
      await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'mission_admin_hidden','managed_mission',$2,$3,$4)`,[req.admin?.telegramId||null,String(req.params.id),{title:r.rows[0].title,preservedHistory:true},hash(req.ip).slice(0,32)]);
      res.json({success:true,message:'Mission removed from Admin history. Completion and audit records were preserved.'});
    }catch(e){next(e)}});

    /* =========================================================
       ADMIN — ADS MANAGEMENT
       ========================================================= */

    app.get('/admin/ads', authenticate, admin, async (req,res,next)=>{try{
      const items=(await pool.query(`
        SELECT c.*,
          (SELECT COUNT(*)::int FROM ad_sessions s WHERE s.campaign_id=c.id) AS started_count,
          (SELECT COUNT(*)::int FROM ad_sessions s WHERE s.campaign_id=c.id AND s.claimed_at IS NOT NULL) AS claimed_count,
          COALESCE((SELECT SUM(COALESCE(s.reward_snapshot,0)) FROM ad_sessions s WHERE s.campaign_id=c.id AND s.claimed_at IS NOT NULL),0) AS rewards_paid
        FROM ad_campaigns c
        WHERE COALESCE(c.admin_hidden,FALSE)=FALSE
        ORDER BY CASE WHEN c.status='active' THEN 0 WHEN c.status='paused' THEN 1 ELSE 2 END,c.updated_at DESC,c.id DESC
      `)).rows;
      const activeItems=items.filter(x=>x.status==='active');
      const active=activeItems[0] || null;
      res.json({success:true,items,active,activeItems,activeCount:activeItems.length,fallback:{reward:cfg.adReward,dailyLimit:cfg.adDailyLimit,cooldown:cfg.adCooldown,blockId:cfg.adsgramBlockId}});
    }catch(e){next(e)}});

    app.post('/admin/ads', authenticate, admin, async (req,res,next)=>{try{
      const b=req.body||{};
      const name=String(b.name||'').trim().slice(0,120);
      const provider=String(b.provider||'adsgram').trim().toLowerCase();
      const blockId=String(b.blockId||'').trim().slice(0,120);
      const reward=Number(b.reward);
      const dailyLimit=Math.trunc(Number(b.dailyLimit));
      const cooldown=Math.trunc(Number(b.cooldownSeconds));
      const mode=String(b.mode||'test').toLowerCase();
      const adsPerClaim=Math.trunc(Number(b.adsPerClaim||1));
      if(!name) return res.status(400).json({success:false,message:'Ad name is required.'});
      if(!['adsgram','monetag'].includes(provider)) return res.status(400).json({success:false,message:'Provider must be AdsGram or Monetag.'});
      if(!blockId || !/^\d+$/.test(blockId)) return res.status(400).json({success:false,message:provider==='monetag'?'A valid numeric Monetag Zone ID is required.':'A valid numeric AdsGram Block ID is required.'});
      if(!Number.isInteger(adsPerClaim) || adsPerClaim<1 || adsPerClaim>3) return res.status(400).json({success:false,message:'Ads per claim must be 1, 2, or 3.'});
      if(!Number.isFinite(reward) || reward<0 || reward>1000000) return res.status(400).json({success:false,message:'Reward must be between 0 and 1,000,000 MAI.'});
      if(!Number.isInteger(dailyLimit) || dailyLimit<1 || dailyLimit>1000) return res.status(400).json({success:false,message:'Daily limit must be between 1 and 1000.'});
      if(!Number.isInteger(cooldown) || cooldown<0 || cooldown>86400) return res.status(400).json({success:false,message:'Cooldown must be between 0 and 86400 seconds.'});
      if(!['test','production'].includes(mode)) return res.status(400).json({success:false,message:'Mode must be test or production.'});
      if(provider==='monetag' && mode==='test' && reward!==0) return res.status(400).json({success:false,message:'Monetag test campaigns must use 0 MAI reward until secure server-side postback verification is configured.'});
      // Production campaigns may be prepared here, but cannot be activated until
      // a server-confirmed AdsGram production reward callback is implemented.
      const r=await pool.query(`INSERT INTO ad_campaigns(name,provider,block_id,reward,daily_limit,cooldown_seconds,mode,status,created_by,ads_per_claim) VALUES($1,$2,$3,$4,$5,$6,$7,'paused',$8,$9) RETURNING *`,[name,provider,blockId,reward,dailyLimit,cooldown,mode,req.admin?.telegramId||'server-admin',adsPerClaim]);
      await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'ad_campaign_created','ad_campaign',$2,$3,$4)`,[req.admin?.telegramId||null,String(r.rows[0].id),{name,provider,blockId,reward,dailyLimit,cooldown,mode,adsPerClaim},hash(req.ip).slice(0,32)]);
      res.json({success:true,item:r.rows[0]});
    }catch(e){next(e)}});

    app.patch('/admin/ads/:id', authenticate, admin, async (req,res,next)=>{try{
      const current=(await pool.query(`SELECT * FROM ad_campaigns WHERE id=$1 AND COALESCE(admin_hidden,FALSE)=FALSE`,[req.params.id])).rows[0];
      if(!current) return res.status(404).json({success:false,message:'Ad campaign not found.'});
      const b=req.body||{};
      const name=String(b.name ?? current.name).trim().slice(0,120);
      const blockId=String(b.blockId ?? current.block_id).trim().slice(0,120);
      const reward=Number(b.reward ?? current.reward);
      const dailyLimit=Math.trunc(Number(b.dailyLimit ?? current.daily_limit));
      const cooldown=Math.trunc(Number(b.cooldownSeconds ?? current.cooldown_seconds));
      const mode=String(b.mode ?? current.mode).toLowerCase();
      const provider=String(b.provider ?? current.provider).trim().toLowerCase();
      const adsPerClaim=Math.trunc(Number(b.adsPerClaim ?? current.ads_per_claim ?? 1));
      if(!['adsgram','monetag'].includes(provider) || !Number.isInteger(adsPerClaim) || adsPerClaim<1 || adsPerClaim>3) return res.status(400).json({success:false,message:'Invalid provider or ads-per-claim setting.'});
      if(!name || !/^\d+$/.test(blockId) || !Number.isFinite(reward) || reward<0 || reward>1000000 || !Number.isInteger(dailyLimit) || dailyLimit<1 || dailyLimit>1000 || !Number.isInteger(cooldown) || cooldown<0 || cooldown>86400 || !['test','production'].includes(mode)) return res.status(400).json({success:false,message:'Invalid ad campaign settings.'});
      if(provider==='monetag' && mode==='test' && reward!==0) return res.status(400).json({success:false,message:'Monetag test campaigns must use 0 MAI reward until secure server-side postback verification is configured.'});
      const r=await pool.query(`UPDATE ad_campaigns SET name=$2,block_id=$3,reward=$4,daily_limit=$5,cooldown_seconds=$6,mode=$7,provider=$8,ads_per_claim=$9,updated_at=NOW() WHERE id=$1 RETURNING *`,[req.params.id,name,blockId,reward,dailyLimit,cooldown,mode,provider,adsPerClaim]);
      await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'ad_campaign_updated','ad_campaign',$2,$3,$4)`,[req.admin?.telegramId||null,String(req.params.id),{name,provider,blockId,reward,dailyLimit,cooldown,mode,adsPerClaim},hash(req.ip).slice(0,32)]);
      res.json({success:true,item:r.rows[0]});
    }catch(e){next(e)}});

    app.post('/admin/ads/:id/status', authenticate, admin, async (req,res,next)=>{const client=await pool.connect();try{
      await client.query('BEGIN');
      const status=String(req.body?.status||'').toLowerCase();
      if(!['active','paused'].includes(status)){await client.query('ROLLBACK');return res.status(400).json({success:false,message:'Status must be active or paused.'});}
      const current=(await client.query(`SELECT * FROM ad_campaigns WHERE id=$1 AND COALESCE(admin_hidden,FALSE)=FALSE FOR UPDATE`,[req.params.id])).rows[0];
      if(!current){await client.query('ROLLBACK');return res.status(404).json({success:false,message:'Ad campaign not found.'});}
      if(status==='active' && current.mode==='production'){
        await client.query('ROLLBACK');
        return res.status(409).json({success:false,message:'Production rewarded-ad activation is locked until secure provider-side server confirmation is configured. Test campaigns can be activated now.'});
      }
      const r=await client.query(`UPDATE ad_campaigns SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *`,[req.params.id,status]);
      await client.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'ad_campaign_status_changed','ad_campaign',$2,$3,$4)`,[req.admin?.telegramId||null,String(req.params.id),{status,mode:current.mode,blockId:current.block_id},hash(req.ip).slice(0,32)]);
      await client.query('COMMIT');
      res.json({success:true,item:r.rows[0]});
    }catch(e){try{await client.query('ROLLBACK')}catch{};next(e)}finally{client.release()}});

    app.delete('/admin/ads/:id', authenticate, admin, async (req,res,next)=>{try{
      const r=await pool.query(`UPDATE ad_campaigns SET status='archived',admin_hidden=TRUE,updated_at=NOW() WHERE id=$1 AND COALESCE(admin_hidden,FALSE)=FALSE RETURNING id,name`,[req.params.id]);
      if(!r.rowCount) return res.status(404).json({success:false,message:'Ad campaign not found.'});
      await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,metadata,ip_hash) VALUES($1,'ad_campaign_admin_hidden','ad_campaign',$2,$3,$4)`,[req.admin?.telegramId||null,String(req.params.id),{name:r.rows[0].name,preservedSessions:true},hash(req.ip).slice(0,32)]);
      res.json({success:true,message:'Ad campaign removed from Admin view. Ad sessions and reward history were preserved.'});
    }catch(e){next(e)}});

    /* =========================================================
       HEALTH
       ========================================================= */

    app.get(

      '/health',

      (
        req,
        res
      ) => {

        res.json({

          ok:
            true,

          name:
            'MAI Network API',

          version:
            '5.0.0',

          token:
            MAI_JETTON_MASTER,

          levelMode:
            'in-game-plus-wallet',

          taskMode:
            'join-check-claim',

          dailyReset:
            '00:00 UTC',

          promoteRate: {

            completions:
              100,

            gram:
              promoteGramPrice(
                100
              )

          }

        });

      }

    );


    /* =========================================================
       BOOTSTRAP
       ========================================================= */

    app.get(

      '/api/bootstrap',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

        

          const risk =
            await riskFor(
              req
            );


          if (
            risk.length
          ) {

            await logSecurity(

              req,

              'bootstrap_risk',

              cfg.devicePolicy ===
                'hard'
                ? 'warn'
                : 'info',

              {
                risk
              }

            );

          }


          const user =
            await buildUser(
              req.auth.id
            );


          const taskData =
            await taskOverview(
              req.auth.id
            );


          res.json({

            success:
              true,

            user,

            tasks:
              taskData,

            config: {

              supportUrl:
                SUPPORT_URL,

              promote: {

                gramPerCompletion:
                  cfg.promoteGramPerSlot,

                minCompletions:
                  cfg.promoteMinSlots,

                maxCompletions:
                  cfg.promoteMaxSlots,

                packages:
                  PROMOTE_PACKAGES,

                receiverWallet:
                  PROMOTE_RECEIVER_WALLET ||
                  null

              },

              languages: [
                'en',
                'ar',
                'ru'
              ]

            },

            security: {

              policy:
                cfg.devicePolicy,

              riskFlags:
                risk

            }

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       WALLET MAI BALANCE
       ========================================================= */

    app.get(

      '/api/wallet/mai-balance',

      authenticate,

      rateLimit(
        30,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT

                balance,

                wallet_address

              FROM users

              WHERE
                telegram_id=$1
              `,
              [
                req.auth.id
              ]
            );


          const user =
            result.rows[0];


          if (
            !user
          ) {

            return res
              .status(404)
              .json({

                success:
                  false,

                message:
                  'User not found'

              });

          }


          const holding =
            await getUserHoldingSnapshot(
              user
            );


          res.json({

            success:
              true,

            walletAddress:
              user.wallet_address,

            jettonMaster:
              MAI_JETTON_MASTER,

            inGameBalance:
              holding.inGame,

            walletBalance:
              holding.wallet,

            balance:
              holding.wallet,

            totalHolding:
              holding.total,

            level:
              holding.level,

            miningSpeed:
              holding.totalDaily,

            levelMiningSpeed:
              holding.levelSpeed

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       WALLET FORCE REFRESH
       ========================================================= */

    app.post(

      '/api/wallet/mai-balance/refresh',

      authenticate,

      rateLimit(
        6,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT

                balance,

                wallet_address

              FROM users

              WHERE
                telegram_id=$1
              `,
              [
                req.auth.id
              ]
            );


          const user =
            result.rows[0];


          if (
            !user
          ) {

            return res
              .status(404)
              .json({

                success:
                  false,

                message:
                  'User not found'

              });

          }


          if (
            user.wallet_address
          ) {

            clearWalletCache(
              user.wallet_address
            );

          }


          const holding =
            await getUserHoldingSnapshot(

              user,

              pool,

              {
                forceWallet:
                  true
              }

            );


          res.json({

            success:
              true,

            walletBalance:
              holding.wallet,

            inGameBalance:
              holding.inGame,

            totalHolding:
              holding.total,

            level:
              holding.level,

            miningSpeed:
              holding.totalDaily

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       FARM START — CONTINUOUS MINING
       ========================================================= */

    app.post(

      '/api/farm/start',

      authenticate,

      rateLimit(
        10,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        const client =
          await pool.connect();

        try {

          await client.query(
            'BEGIN'
          );

          const result =
            await client.query(
              `
              SELECT *
              FROM users
              WHERE telegram_id=$1
              FOR UPDATE
              `,
              [
                req.auth.id
              ]
            );

          const user =
            result.rows[0];

          if (!user) {

            await client.query(
              'ROLLBACK'
            );

            return res
              .status(404)
              .json({
                success:
                  false,
                message:
                  'User not found'
              });

          }

          if (
            user.farm_started_at
          ) {

            await client.query(
              'ROLLBACK'
            );

            return res
              .status(409)
              .json({
                success:
                  false,
                message:
                  'Mining is already active'
              });

          }

          if (
            user.wallet_address
          ) {

            clearWalletCache(
              user.wallet_address
            );

          }

          const holding =
            await getUserHoldingSnapshot(
              user,
              client,
              {
                forceWallet:
                  true
              }
            );

          const schedule =
            miningScheduleAt(
              new Date()
            );

          if (
            MINING_MODE ===
              'official' &&
            schedule.multiplier <=
              0
          ) {

            await client.query(
              'ROLLBACK'
            );

            return res
              .status(409)
              .json({
                success:
                  false,
                message:
                  schedule.phase ===
                    'pre_launch'
                    ? 'Official mining has not launched yet'
                    : 'Official mining is not active'
              });

          }

          await client.query(
            `
            UPDATE users
            SET
              farm_started_at=NOW(),
              farm_rate_daily=$2,
              mining_checkpoint_at=NOW(),
              mining_accrued=0,
              mining_checkpoint_rate_daily=$2,
              mining_checkpoint_level=$3,
              mining_checkpoint_holding=$4,
              mining_highest_level=
                GREATEST(
                  COALESCE(mining_highest_level,1),
                  $3
                ),
              mining_last_claim_at=NOW(),
              updated_at=NOW()
            WHERE telegram_id=$1
            `,
            [
              req.auth.id,
              holding.totalDaily,
              holding.level,
              holding.total
            ]
          );

          await client.query(
            'COMMIT'
          );

          await logSecurity(
            req,
            'mining_started',
            'info',
            {
              level:
                holding.level,
              holding:
                holding.total,
              th:
                holding.miningTh,
              baseRateDaily:
                holding.totalDaily,
              mode:
                schedule.mode,
              phase:
                schedule.phase
            }
          );

          res.json({
            success:
              true,

            level:
              holding.level,

            miningTh:
              holding.miningTh,

            totalHolding:
              holding.total,

            baseRateDaily:
              holding.totalDaily,

            rateDaily:
              holding.totalDaily *
              schedule.multiplier,

            miningMode:
              schedule.mode,

            miningPhase:
              schedule.phase,

            miningMultiplier:
              schedule.multiplier,

            user:
              await buildUser(
                req.auth.id
              )
          });

        } catch (
          error
        ) {

          try {
            await client.query(
              'ROLLBACK'
            );
          } catch {}

          next(
            error
          );

        } finally {

          client.release();

        }

      }

    );


    /* =========================================================
       FARM CLAIM — CLAIM ANYTIME

       - minimum interval: MINING_MIN_CLAIM_SECONDS (default 30s)
       - user row is locked with FOR UPDATE
       - wallet balance is force-refreshed
       - old/current rate uses conservative checkpoint rule
       - claimed amount is calculated only by server
       ========================================================= */

    app.post(

      '/api/farm/claim',

      authenticate,

      rateLimit(
        20,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        const client =
          await pool.connect();

        try {

          await client.query(
            'BEGIN'
          );

          const result =
            await client.query(
              `
              SELECT *
              FROM users
              WHERE telegram_id=$1
              FOR UPDATE
              `,
              [
                req.auth.id
              ]
            );

          const user =
            result.rows[0];

          if (!user) {

            await client.query(
              'ROLLBACK'
            );

            return res
              .status(404)
              .json({
                success:
                  false,
                message:
                  'User not found'
              });

          }

          if (
            !user.farm_started_at
          ) {

            await client.query(
              'ROLLBACK'
            );

            return res
              .status(409)
              .json({
                success:
                  false,
                message:
                  'Mining is not active'
              });

          }

          if (
            user.wallet_address
          ) {

            clearWalletCache(
              user.wallet_address
            );

          }

          const holding =
            await getUserHoldingSnapshot(
              user,
              client,
              {
                forceWallet:
                  true
              }
            );

          const now =
            new Date();

          const state =
            farmState(
              user,
              holding,
              now
            );

          if (
            !state.claimable
          ) {

            await client.query(
              'ROLLBACK'
            );

            await logSecurity(
              req,
              'mining_claim_blocked',
              'info',
              {
                remaining:
                  state.remaining,
                pending:
                  state.pending
              }
            );

            return res
              .status(409)
              .json({
                success:
                  false,
                message:
                  state.remaining > 0
                    ? `Please wait ${state.remaining}s before claiming again`
                    : 'No mining reward is available yet',
                remaining:
                  state.remaining,
                pending:
                  state.pending
              });

          }

          const reward =
            Number(
              state.pending.toFixed(
                8
              )
            );

          if (
            reward <= 0
          ) {

            await client.query(
              'ROLLBACK'
            );

            return res
              .status(409)
              .json({
                success:
                  false,
                message:
                  'No mining reward is available yet'
              });

          }

          const gameBalanceAfter =
            safeNumber(
              user.balance
            ) +
            reward;

          const totalAfter =
            gameBalanceAfter +
            holding.wallet;

          const nextApproved =
            getMiningLevelForHolding(
              totalAfter
            );

          await client.query(
            `
            UPDATE users
            SET
              balance=
                balance + $2,
              farm_rate_daily=$3,
              mining_checkpoint_at=NOW(),
              mining_accrued=0,
              mining_checkpoint_rate_daily=$3,
              mining_checkpoint_level=$4,
              mining_checkpoint_holding=$5,
              mining_highest_level=
                GREATEST(
                  COALESCE(mining_highest_level,1),
                  $4
                ),
              mining_last_claim_at=NOW(),
              updated_at=NOW()
            WHERE telegram_id=$1
            `,
            [
              req.auth.id,
              reward,
              nextApproved.baseMaiPerDay,
              nextApproved.level,
              totalAfter
            ]
          );

          // One stable reference ties the authoritative farm claim to the
          // inviter's 5% reward event. Both writes happen in this same
          // database transaction, so they commit or roll back together.
          const farmClaimReference =
            crypto.randomUUID();

          await client.query(
            `
            INSERT INTO transactions(
              telegram_id,
              type,
              amount,
              reference,
              metadata
            )
            VALUES(
              $1,
              'farm_claim',
              $2,
              $3,
              $4
            )
            `,
            [
              req.auth.id,
              reward,
              farmClaimReference,
              {
                level:
                  holding.level,
                miningTh:
                  holding.miningTh,
                inGame:
                  holding.inGame,
                wallet:
                  holding.wallet,
                total:
                  holding.total,
                baseRateDaily:
                  state.baseRateDaily,
                effectiveRateDaily:
                  state.rateDaily,
                multiplier:
                  state.multiplier,
                phase:
                  state.phase,
                mode:
                  state.mode,
                checkpointAt:
                  state.checkpointAt
              }
            ]
          );

          await qualifyReferral(
            client,
            req.auth.id
          );

          // SECURITY / ACCOUNTING: accrue the inviter's 5% only from the
          // authoritative farm_claim that was just written above.
          // accrueReferralFarmReward() requires this farmer to already be a
          // successful referral and its unique source constraint prevents
          // duplicate rewards if reconciliation is ever run later.
          await accrueReferralFarmReward(
            client,
            req.auth.id,
            farmClaimReference,
            reward
          );

          await client.query(
            'COMMIT'
          );

          await logSecurity(
            req,
            'reward_granted',
            'info',
            {
              rewardType:
                'mining',
              amount:
                reward,
              level:
                holding.level,
              th:
                holding.miningTh,
              multiplier:
                state.multiplier,
              phase:
                state.phase
            }
          );

          res.json({
            success:
              true,

            reward,

            miningMode:
              state.mode,

            miningPhase:
              state.phase,

            miningMultiplier:
              state.multiplier,

            user:
              await buildUser(
                req.auth.id
              )
          });

        } catch (
          error
        ) {

          try {
            await client.query(
              'ROLLBACK'
            );
          } catch {}

          next(
            error
          );

        } finally {

          client.release();

        }

      }

    );


    /* =========================================================
       DAILY BONUS
       ========================================================= */

    app.post(

      '/api/daily-bonus',

      authenticate,

      rateLimit(
        10,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        const client =
          await pool.connect();


        try {

          await client.query(
            'BEGIN'
          );


          const day =
            utcDay();


          const update =
            await client.query(
              `
              UPDATE users

              SET

                balance=
                  balance + $2,

                daily_bonus_date=
                  $3,

                updated_at=
                  NOW()

              WHERE

                telegram_id=$1

                AND

                (
                  daily_bonus_date
                  IS NULL

                  OR

                  daily_bonus_date
                  <> $3
                )

              RETURNING
                telegram_id
              `,
              [

                req.auth.id,

                cfg.dailyBonus,

                day

              ]
            );


          if (
            !update.rowCount
          ) {

            await client.query(
              'ROLLBACK'
            );

            await logSecurity(
              req,
              'reward_replay_blocked',
              'warn',
              { rewardType: 'daily_bonus', day }
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Daily bonus already claimed today'

              });

          }


          await client.query(
            `
            INSERT INTO transactions(

              telegram_id,

              type,

              amount,

              reference

            )

            VALUES(
              $1,
              'daily_bonus',
              $2,
              $3
            )
            `,
            [

              req.auth.id,

              cfg.dailyBonus,

              day

            ]
          );


          await qualifyReferral(
            client,
            req.auth.id
          );


          await client.query(
            'COMMIT'
          );

          await logSecurity(
            req,
            'reward_granted',
            'info',
            { rewardType: 'daily_bonus', day, amount: cfg.dailyBonus }
          );


          res.json({

            success:
              true,

            reward:
              cfg.dailyBonus,

            resetAt:
              nextUtcResetAt(),

            user:
              await buildUser(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          try {

            await client.query(
              'ROLLBACK'
            );

          } catch {}


          next(
            error
          );


        } finally {

          client.release();

        }

      }

    );


    /* =========================================================
       USER PREFERENCES GET
       ========================================================= */

    app.get(

      '/api/preferences',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          res.json({

            success:
              true,

            preferences:
              await getUserPreferences(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       USER PREFERENCES UPDATE
       ========================================================= */

    app.post(

      '/api/preferences',

      authenticate,

      rateLimit(
        30,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const current =
            await getUserPreferences(
              req.auth.id
            );


          let language =
            req.body?.language ??
            current.language;


          if (
            ![
              'en',
              'ar',
              'ru'
            ].includes(
              language
            )
          ) {

            language =
              current.language;

          }


          const notificationsEnabled =
            typeof req.body
              ?.notificationsEnabled ===
              'boolean'

              ? req.body
                  .notificationsEnabled

              : current
                  .notificationsEnabled;


          const soundEnabled =
            typeof req.body
              ?.soundEnabled ===
              'boolean'

              ? req.body
                  .soundEnabled

              : current
                  .soundEnabled;


          await pool.query(
            `
            INSERT INTO user_preferences(

              telegram_id,

              language,

              notifications_enabled,

              sound_enabled,

              updated_at

            )

            VALUES(
              $1,$2,$3,$4,NOW()
            )

            ON CONFLICT(
              telegram_id
            )

            DO UPDATE SET

              language=
                EXCLUDED.language,

              notifications_enabled=
                EXCLUDED.notifications_enabled,

              sound_enabled=
                EXCLUDED.sound_enabled,

              updated_at=
                NOW()
            `,
            [

              req.auth.id,

              language,

              notificationsEnabled,

              soundEnabled

            ]
          );


          res.json({

            success:
              true,

            preferences:
              await getUserPreferences(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       TASKS GET
       ========================================================= */

    app.get(

      '/api/tasks',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          res.json({

            success:
              true,

            tasks:
              await taskOverview(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       TASK JOIN CLICK

       Frontend calls this when user presses JOIN.

       This does NOT give a reward.
       ========================================================= */

    app.post(

      '/api/tasks/join/:key',

      authenticate,

      rateLimit(
        30,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const task =
            tasks[
              req.params.key
            ];


          if (
            !task
          ) {

            return res
              .status(404)
              .json({

                success:
                  false,

                message:
                  'Unknown task'

              });

          }


          const day =
            utcDay();


          await pool.query(
            `
            INSERT INTO daily_task_progress(

              telegram_id,

              task_key,

              day,

              joined_clicked_at,

              reward

            )

            VALUES(
              $1,$2,$3,NOW(),$4
            )

            ON CONFLICT(
              telegram_id,
              task_key,
              day
            )

            DO UPDATE SET

              joined_clicked_at=
                COALESCE(
                  daily_task_progress.joined_clicked_at,
                  NOW()
                ),

              updated_at=
                NOW()
            `,
            [

              req.auth.id,

              task.key,

              day,

              cfg.taskReward

            ]
          );


          res.json({

            success:
              true,

            taskKey:
              task.key,

            link:
              task.link,

            state:
              'check',

            tasks:
              await taskOverview(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       CHECK TELEGRAM MEMBERSHIP
       ========================================================= */

    async function verifyTelegramMembership(
      task,
      userId
    ) {

      const member =
        await telegram(
          'getChatMember',
          {

            chat_id:
              task.chatId,

            user_id:
              userId

          }
        );


      const allowedStatuses = [

        'creator',

        'administrator',

        'member'

      ];


      return (

        allowedStatuses.includes(
          member.status
        ) ||

        (
          member.status ===
            'restricted' &&

          member.is_member ===
            true
        )

      );

    }


    /* =========================================================
       TASK CHECK

       Joined?
          YES -> CLAIM

          NO  -> TRY AGAIN

       No reward is issued here.
       ========================================================= */

    app.post(

      '/api/tasks/check/:key',

      authenticate,

      rateLimit(
        20,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const task =
            tasks[
              req.params.key
            ];


          if (
            !task
          ) {

            return res
              .status(404)
              .json({

                success:
                  false,

                message:
                  'Unknown task'

              });

          }


          const day =
            utcDay();


          /* -----------------------------------------------------
             User should press JOIN first.
             ----------------------------------------------------- */

          const progress =
            await pool.query(
              `
              SELECT *

              FROM daily_task_progress

              WHERE

                telegram_id=$1

                AND task_key=$2

                AND day=$3
              `,
              [

                req.auth.id,

                task.key,

                day

              ]
            );


          const row =
            progress.rows[0];


          if (
            row?.claimed_at
          ) {

            return res.json({

              success:
                true,

              verified:
                true,

              claimed:
                true,

              state:
                'claimed',

              message:
                'Reward already claimed today.',

              tasks:
                await taskOverview(
                  req.auth.id
                )

            });

          }


          if (
            !row?.joined_clicked_at
          ) {

            return res
              .status(409)
              .json({

                success:
                  false,

                verified:
                  false,

                state:
                  'join',

                message:
                  'Press JOIN first.'

              });

          }


          let verified =
            false;


          try {

            verified =
              await verifyTelegramMembership(
                task,
                req.auth.id
              );


          } catch (
            error
          ) {

            console.error(

              '[TASK CHECK] Telegram verification failed:',

              task.key,

              error.message

            );


            return res
              .status(503)
              .json({

                success:
                  false,

                verified:
                  false,

                state:
                  'check',

                message:
                  'Telegram verification is temporarily unavailable. Try again.'

              });

          }


          if (
            !verified
          ) {

            return res
              .status(409)
              .json({

                success:
                  false,

                verified:
                  false,

                state:
                  'try_again',

                message:
                  'You have not joined yet. Please join first and try again.',

                tasks:
                  await taskOverview(
                    req.auth.id
                  )

              });

          }


          await pool.query(
            `
            UPDATE daily_task_progress

            SET

              verified_at=
                COALESCE(
                  verified_at,
                  NOW()
                ),

              updated_at=
                NOW()

            WHERE

              telegram_id=$1

              AND task_key=$2

              AND day=$3
            `,
            [

              req.auth.id,

              task.key,

              day

            ]
          );


          res.json({

            success:
              true,

            verified:
              true,

            state:
              'claim',

            message:
              `Verified. Claim ${cfg.taskReward} MAI.`,

            reward:
              cfg.taskReward,

            tasks:
              await taskOverview(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       TASK CLAIM

       Important:
       Only this endpoint adds the 2 MAI reward.

       This protects against:
       - fake frontend claims
       - duplicate claims
       - double clicking
       - page refresh duplicates
       ========================================================= */

    app.post(

      '/api/tasks/claim/:key',

      authenticate,

      rateLimit(
        20,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        const client =
          await pool.connect();


        try {

          await client.query(
            'BEGIN'
          );


          const task =
            tasks[
              req.params.key
            ];


          if (
            !task
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(404)
              .json({

                success:
                  false,

                message:
                  'Unknown task'

              });

          }


          const day =
            utcDay();


          const progressResult =
            await client.query(
              `
              SELECT *

              FROM daily_task_progress

              WHERE

                telegram_id=$1

                AND task_key=$2

                AND day=$3

              FOR UPDATE
              `,
              [

                req.auth.id,

                task.key,

                day

              ]
            );


          const progress =
            progressResult.rows[0];


          if (
            !progress
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                state:
                  'join',

                message:
                  'Start the task first.'

              });

          }


          if (
            progress.claimed_at
          ) {

            await client.query(
              'ROLLBACK'
            );

            await logSecurity(
              req,
              'reward_replay_blocked',
              'warn',
              { rewardType: 'daily_task', taskKey: task.key, day }
            );


            return res.json({

              success:
                true,

              claimed:
                true,

              rewarded:
                false,

              state:
                'claimed',

              reward:
                safeNumber(
                  progress.reward
                ),

              message:
                'Reward already claimed today.',

              user:
                await buildUser(
                  req.auth.id
                ),

              tasks:
                await taskOverview(
                  req.auth.id
                )

            });

          }


          if (
            !progress.verified_at
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                state:
                  'check',

                message:
                  'Please verify the task first.'

              });

          }


          const reward =
            cfg.taskReward;


          /* -----------------------------------------------------
             ADD REWARD TO IN-GAME POOL
             ----------------------------------------------------- */

          await client.query(
            `
            UPDATE users

            SET

              balance=
                balance + $2,

              updated_at=
                NOW()

            WHERE
              telegram_id=$1
            `,
            [

              req.auth.id,

              reward

            ]
          );


          /* -----------------------------------------------------
             MARK CLAIMED
             ----------------------------------------------------- */

          await client.query(
            `
            UPDATE daily_task_progress

            SET

              claimed_at=
                NOW(),

              reward=
                $4,

              updated_at=
                NOW()

            WHERE

              telegram_id=$1

              AND task_key=$2

              AND day=$3
            `,
            [

              req.auth.id,

              task.key,

              day,

              reward

            ]
          );


          /* -----------------------------------------------------
             LEGACY COMPLETION TABLE
             Keeps older analytics compatible.
             ----------------------------------------------------- */

          await client.query(
            `
            INSERT INTO daily_task_completions(

              telegram_id,

              task_key,

              day,

              reward

            )

            VALUES(
              $1,$2,$3,$4
            )

            ON CONFLICT(
              telegram_id,
              task_key,
              day
            )

            DO NOTHING
            `,
            [

              req.auth.id,

              task.key,

              day,

              reward

            ]
          );


          /* -----------------------------------------------------
             TRANSACTION RECORD
             ----------------------------------------------------- */

          await client.query(
            `
            INSERT INTO transactions(

              telegram_id,

              type,

              amount,

              reference,

              metadata

            )

            VALUES(
              $1,
              'daily_task',
              $2,
              $3,
              $4
            )
            `,
            [

              req.auth.id,

              reward,

              task.key,

              {

                day,

                title:
                  task.title,

                verified:
                  true

              }

            ]
          );


          await qualifyReferral(
            client,
            req.auth.id
          );


          await client.query(
            'COMMIT'
          );

          await logSecurity(
            req,
            'reward_granted',
            'info',
            { rewardType: 'daily_task', taskKey: task.key, day, amount: reward }
          );


          const user =
            await buildUser(
              req.auth.id
            );


          const taskData =
            await taskOverview(
              req.auth.id
            );


          res.json({

            success:
              true,

            claimed:
              true,

            rewarded:
              true,

            state:
              'claimed',

            reward,

            message:
              `+${reward} MAI claimed`,

            user,

            tasks:
              taskData

          });


        } catch (
          error
        ) {

          try {

            await client.query(
              'ROLLBACK'
            );

          } catch {}


          next(
            error
          );


        } finally {

          client.release();

        }

      }

    );


    /* =========================================================
       OLD TASK VERIFY COMPATIBILITY

       Older frontend versions may still call:

       POST /api/tasks/verify/:key

       We do NOT give reward from this route anymore.

       It behaves as CHECK only.
       ========================================================= */

    app.post(

      '/api/tasks/verify/:key',

      authenticate,

      rateLimit(
        20,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const task =
            tasks[
              req.params.key
            ];


          if (
            !task
          ) {

            return res
              .status(404)
              .json({

                success:
                  false,

                message:
                  'Unknown task'

              });

          }


          const day =
            utcDay();


          await pool.query(
            `
            INSERT INTO daily_task_progress(

              telegram_id,

              task_key,

              day,

              joined_clicked_at,

              reward

            )

            VALUES(
              $1,$2,$3,NOW(),$4
            )

            ON CONFLICT(
              telegram_id,
              task_key,
              day
            )

            DO NOTHING
            `,
            [

              req.auth.id,

              task.key,

              day,

              cfg.taskReward

            ]
          );


          let verified =
            false;


          try {

            verified =
              await verifyTelegramMembership(
                task,
                req.auth.id
              );

          } catch (
            error
          ) {

            return res
              .status(503)
              .json({

                success:
                  false,

                rewarded:
                  false,

                state:
                  'check',

                message:
                  'Telegram verification temporarily unavailable.'

              });

          }


          if (
            !verified
          ) {

            return res
              .status(409)
              .json({

                success:
                  false,

                rewarded:
                  false,

                state:
                  'try_again',

                message:
                  'Join the channel/group first, then try again.',

                tasks:
                  await taskOverview(
                    req.auth.id
                  )

              });

          }


          await pool.query(
            `
            UPDATE daily_task_progress

            SET

              verified_at=
                COALESCE(
                  verified_at,
                  NOW()
                ),

              updated_at=
                NOW()

            WHERE

              telegram_id=$1

              AND task_key=$2

              AND day=$3
            `,
            [

              req.auth.id,

              task.key,

              day

            ]
          );


          res.json({

            success:
              true,

            rewarded:
              false,

            verified:
              true,

            state:
              'claim',

            reward:
              cfg.taskReward,

            message:
              'Task verified. Press CLAIM to receive your reward.',

            tasks:
              await taskOverview(
                req.auth.id
              ),

            user:
              await buildUser(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       END OF SERVER.JS PART 3 / 4
       ========================================================= */
       /* =========================================================
       SERVER.JS — PART 4 / 4

       Ads
       Referrals
       Promote
       Wallet Binding
       Withdrawals
       Admin
       Error Handling
       Server Start
       ========================================================= */


    async function activeAdCampaign(campaignId = null, client = pool) {
      if (campaignId !== null && campaignId !== undefined && String(campaignId).trim() !== '') {
        const result = await client.query(`
          SELECT id,name,provider,block_id,reward,daily_limit,cooldown_seconds,mode,status,ads_per_claim
          FROM ad_campaigns
          WHERE id=$1 AND status='active' AND COALESCE(admin_hidden,FALSE)=FALSE
          LIMIT 1
        `,[String(campaignId)]);
        return result.rows[0] || null;
      }

      const result = await client.query(`
        SELECT id,name,provider,block_id,reward,daily_limit,cooldown_seconds,mode,status,ads_per_claim
        FROM ad_campaigns
        WHERE status='active' AND COALESCE(admin_hidden,FALSE)=FALSE
        ORDER BY updated_at DESC,id DESC
        LIMIT 1
      `);
      if (result.rowCount) return result.rows[0];

      // Environment fallback is bootstrap-only: use it only when no DB campaigns
      // exist at all. Pausing every campaign must genuinely pause ads for users.
      const count = Number((await client.query(`SELECT COUNT(*)::int AS c FROM ad_campaigns WHERE COALESCE(admin_hidden,FALSE)=FALSE`)).rows[0]?.c || 0);
      if (count > 0) return null;

      return {
        id: null, name: 'Environment fallback',
        provider: (cfg.adProviderMode === 'adsgram' || cfg.adProviderMode === 'adsgram_test') ? 'adsgram' : cfg.adProviderMode,
        block_id: cfg.adsgramBlockId, reward: cfg.adReward, daily_limit: cfg.adDailyLimit,
        cooldown_seconds: cfg.adCooldown,
        mode: (cfg.adProviderMode === 'adsgram_test' || cfg.adsgramDebug) ? 'test' : 'production',
        status: 'active'
      };
    }

    /* =========================================================
       ADS START
       ========================================================= */

    app.post(
      '/api/ads/start',

      authenticate,

      rateLimit(
        30,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const day =
            utcDay();

          const requestedCampaignId = req.body?.campaignId ?? null;
          const campaign = await activeAdCampaign(requestedCampaignId);
          if (!campaign) {
            return res.status(404).json({ success:false, message:'Ad campaign is not active.' });
          }
          const campaignDailyLimit = Math.max(1, Number(campaign.daily_limit || cfg.adDailyLimit));
          const campaignCooldown = Math.max(0, Number(campaign.cooldown_seconds ?? cfg.adCooldown));
          const campaignReward = Math.max(0, Number(campaign.reward ?? cfg.adReward));


          const used =
            (
              await pool.query(
                `
                SELECT
                  COUNT(*)::int AS c

                FROM ad_sessions

                WHERE
                  telegram_id=$1
                  AND day=$2
                  AND campaign_id IS NOT DISTINCT FROM $3::bigint
                  AND claimed_at IS NOT NULL
                `,
                [
                  req.auth.id,
                  day,
                  campaign.id
                ]
              )
            ).rows[0].c;


          if (
            used >=
            campaignDailyLimit
          ) {

            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Daily ad limit reached',

                resetAt:
                  nextUtcResetAt()

              });

          }


          // Resume an unfinished sequence instead of creating a new session.
          // This preserves 1/3 or 2/3 progress when AdsGram temporarily emits
          // onNonStopShow and the user has to retry later.
          const resumable = (
            await pool.query(`
              SELECT id,sequence_total,sequence_completed,reward_snapshot,daily_limit_snapshot,
                     cooldown_snapshot,block_id_snapshot,mode_snapshot,status
              FROM ad_sessions
              WHERE telegram_id=$1
                AND day=$2
                AND campaign_id IS NOT DISTINCT FROM $3::bigint
                AND claimed_at IS NULL
                AND status IN ('started','completed')
                AND sequence_completed < sequence_total
              ORDER BY started_at DESC
              LIMIT 1
            `,[req.auth.id,day,campaign.id])
          ).rows[0];

          if (resumable) {
            const resumeBase = {
              success:true,
              resumed:true,
              sessionId:resumable.id,
              campaignId:campaign.id,
              campaignName:campaign.name,
              reward:Number(resumable.reward_snapshot ?? campaignReward),
              dailyLimit:Number(resumable.daily_limit_snapshot ?? campaignDailyLimit),
              cooldown:Number(resumable.cooldown_snapshot ?? campaignCooldown),
              adsPerClaim:Math.max(1,Math.min(3,Number(resumable.sequence_total || campaign.ads_per_claim || 1))),
              sequenceCompleted:Math.max(0,Number(resumable.sequence_completed || 0)),
              url:''
            };
            if (campaign.provider === 'adsgram') {
              return res.json({ ...resumeBase, provider:'adsgram', blockId:resumable.block_id_snapshot || campaign.block_id, debug:resumable.mode_snapshot === 'test' });
            }
            if (campaign.provider === 'monetag') {
              return res.json({ ...resumeBase, provider:'monetag', zoneId:resumable.block_id_snapshot || campaign.block_id, testOnly:resumable.mode_snapshot === 'test' });
            }
          }

          const last =
            (
              await pool.query(
                `
                SELECT
                  COALESCE(
                    completed_at,
                    started_at
                  ) AS t

                FROM ad_sessions

                WHERE
                  telegram_id=$1
                  AND campaign_id IS NOT DISTINCT FROM $2::bigint

                ORDER BY
                  started_at DESC

                LIMIT 1
                `,
                [
                  req.auth.id,
                  campaign.id
                ]
              )
            ).rows[0];


          if (
            last
          ) {

            const wait =

              campaignCooldown -

              (
                Date.now() -

                new Date(
                  last.t
                ).getTime()
              ) /
              1000;


            if (
              wait > 0
            ) {

              return res
                .status(429)
                .json({

                  success:
                    false,

                  message:
                    `Please wait ${Math.ceil(wait)}s`,

                  cooldown:
                    Math.ceil(wait)

                });

            }

          }


          const id =
            crypto.randomUUID();


          await pool.query(
            `
            INSERT INTO ad_sessions(
              id,
              telegram_id,
              day,
              campaign_id,
              reward_snapshot,
              daily_limit_snapshot,
              cooldown_snapshot,
              block_id_snapshot,
              mode_snapshot,
              sequence_total,
              sequence_completed,
              metadata
            )

            VALUES(
              $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
            )
            `,
            [
              id,
              req.auth.id,
              day,
              campaign.id,
              campaignReward,
              campaignDailyLimit,
              campaignCooldown,
              campaign.block_id || null,
              campaign.mode,
              Math.max(1, Math.min(3, Number(campaign.ads_per_claim || 1))),
              0,
              { campaignName: campaign.name, provider: campaign.provider }
            ]
          );


          let url =
            '';


          if (campaign.provider === 'adsgram') {

            return res.json({
              success: true,
              sessionId: id,
              provider: 'adsgram',
              campaignId: campaign.id,
              campaignName: campaign.name,
              blockId: campaign.block_id,
              debug: campaign.mode === 'test',
              reward: campaignReward,
              dailyLimit: campaignDailyLimit,
              cooldown: campaignCooldown,
              adsPerClaim: Math.max(1, Math.min(3, Number(campaign.ads_per_claim || 1))),
              sequenceCompleted: 0,
              url: ''
            });

          }

          if (campaign.provider === 'monetag') {
            return res.json({
              success: true,
              sessionId: id,
              provider: 'monetag',
              campaignId: campaign.id,
              campaignName: campaign.name,
              zoneId: campaign.block_id,
              reward: campaignReward,
              dailyLimit: campaignDailyLimit,
              cooldown: campaignCooldown,
              adsPerClaim: Math.max(1, Math.min(3, Number(campaign.ads_per_claim || 1))),
              sequenceCompleted: 0,
              // Test mode only: production rewards stay activation-locked until
              // a provider-side server confirmation/postback is configured.
              testOnly: campaign.mode === 'test',
              url: ''
            });
          }


          if (
            cfg.adProviderMode ===
            'external'
          ) {

            if (
              !cfg.adProviderUrl
            ) {

              return res
                .status(503)
                .json({

                  success:
                    false,

                  message:
                    'Ad provider is not configured'

                });

            }


            const adUrl =
              new URL(
                cfg.adProviderUrl
              );


            adUrl.searchParams.set(
              'session_id',
              id
            );


            adUrl.searchParams.set(
              'user_id',
              req.auth.id
            );


            url =
              adUrl.toString();


          } else if (

            cfg.adProviderMode ===
              'demo' &&

            ALLOW_DEV_AUTH

          ) {

            url =

              `${CLIENT_ORIGIN.split(',')[0]}` +

              `/?demo_ad=${id}`;

          }


          res.json({

            success:
              true,

            sessionId:
              id,

            url

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }
    );


    /* =========================================================
       ADSGRAM TEST COMPLETION
       Test blocks do not call Reward URL. This route is therefore
       enabled ONLY in adsgram_test mode. Production AdsGram must use
       server confirmation before this gate is enabled for real rewards.
       ========================================================= */

    async function completeTestAdStep(req, res, next) {
      try {
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          const session = (await client.query(`
            SELECT id,status,mode_snapshot,sequence_total,sequence_completed,metadata
            FROM ad_sessions
            WHERE id=$1 AND telegram_id=$2
            FOR UPDATE
          `,[req.params.id,req.auth.id])).rows[0];
          if(!session){ await client.query('ROLLBACK'); return res.status(404).json({success:false,message:'Ad session not found'}); }
          if(session.mode_snapshot!=='test'){ await client.query('ROLLBACK'); return res.status(409).json({success:false,message:'Client completion is disabled for production ads.'}); }
          if(session.status==='claimed'){ await client.query('COMMIT'); return res.json({success:true,verified:true,complete:true,completed:Number(session.sequence_total||1),total:Number(session.sequence_total||1)}); }
          if(session.status!=='started' && session.status!=='completed'){ await client.query('ROLLBACK'); return res.status(409).json({success:false,message:'Ad session cannot be completed'}); }
          const total=Math.max(1,Math.min(3,Number(session.sequence_total||1)));
          const current=Math.max(0,Math.min(total,Number(session.sequence_completed||0)));
          const requestedStep=Math.max(1,Math.min(total,Math.trunc(Number(req.body?.expectedStep || (current+1)))));
          // Idempotent step confirmation: a repeated confirmation for an already
          // stored step returns current progress instead of incrementing twice.
          if(requestedStep<=current){
            await client.query('COMMIT');
            return res.json({success:true,verified:current>=total,complete:current>=total,completed:current,total,remaining:Math.max(0,total-current),replayed:true});
          }
          if(requestedStep!==current+1){
            await client.query('ROLLBACK');
            return res.status(409).json({success:false,message:'Ad sequence step is out of order',completed:current,total});
          }
          const completed=requestedStep;
          const isComplete=completed>=total;
          await client.query(`
            UPDATE ad_sessions
            SET sequence_completed=$3,
                status=CASE WHEN $4 THEN 'completed' ELSE 'started' END,
                completed_at=CASE WHEN $4 THEN COALESCE(completed_at,NOW()) ELSE completed_at END,
                provider_ref=COALESCE(provider_ref,$5)
            WHERE id=$1 AND telegram_id=$2
          `,[req.params.id,req.auth.id,completed,isComplete,`${String(session.metadata?.provider||'ad')}-test`]);
          await client.query('COMMIT');
          return res.json({success:true,verified:isComplete,complete:isComplete,completed,total,remaining:Math.max(0,total-completed)});
        } catch(e){ try{await client.query('ROLLBACK')}catch{}; throw e; }
        finally{ client.release(); }
      } catch(error){ next(error); }
    }

    app.post('/api/ads/test-step-complete/:id', authenticate, rateLimit(30,60000), completeTestAdStep);
    // Backward-compatible alias for already deployed AdsGram test clients.
    app.post('/api/ads/adsgram-complete/:id', authenticate, rateLimit(30,60000), completeTestAdStep);

    /* =========================================================
       ADS WEBHOOK
       ========================================================= */

    app.post(

      '/webhooks/ads',

      async (
        req,
        res,
        next
      ) => {

        try {

          const signature =
            req.get(
              'x-ad-signature'
            ) ||
            '';


          const raw =

            `${req.body.sessionId}:` +

            `${req.body.status}:` +

            `${req.body.providerRef || ''}`;


          const expected =
            crypto
              .createHmac(
                'sha256',
                cfg.adWebhookSecret
              )
              .update(
                raw
              )
              .digest(
                'hex'
              );


          if (
            !cfg.adWebhookSecret ||

            signature.length !==
              expected.length ||

            !crypto.timingSafeEqual(

              Buffer.from(
                signature
              ),

              Buffer.from(
                expected
              )

            )
          ) {

            return res
              .status(401)
              .json({

                success:
                  false

              });

          }


          if (
            req.body.status ===
            'completed'
          ) {

            await pool.query(
              `
              UPDATE ad_sessions

              SET

                status='completed',

                completed_at=NOW(),

                provider_ref=$2

              WHERE

                id=$1

                AND status='started'
              `,
              [

                req.body.sessionId,

                req.body.providerRef ||
                null

              ]
            );

          }


          res.json({

            success:
              true

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       DEMO AD COMPLETE
       ========================================================= */

    app.post(

      '/api/ads/demo-complete/:id',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          if (
            !(
              cfg.adProviderMode ===
                'demo' &&
              ALLOW_DEV_AUTH
            )
          ) {

            return res
              .status(404)
              .end();

          }


          await pool.query(
            `
            UPDATE ad_sessions

            SET

              status='completed',

              completed_at=NOW()

            WHERE

              id=$1

              AND telegram_id=$2
            `,
            [
              req.params.id,
              req.auth.id
            ]
          );


          res.json({

            success:
              true

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       AD STATUS
       ========================================================= */

    app.get(

      '/api/ads/status/:id',

      authenticate,
      rateLimit(60, 60000),

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT
                status,
                claimed_at

              FROM ad_sessions

              WHERE

                id=$1

                AND telegram_id=$2
              `,
              [
                req.params.id,
                req.auth.id
              ]
            );


          if (
            !result.rowCount
          ) {

            return res
              .status(404)
              .json({

                success:
                  false,

                message:
                  'Ad session not found'

              });

          }


          res.json({

            success:
              true,

            ...result.rows[0]

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       AD CLAIM
       ========================================================= */

    app.post(

      '/api/ads/claim/:id',

      authenticate,
      rateLimit(20, 60000),

      async (
        req,
        res,
        next
      ) => {

        const client =
          await pool.connect();


        try {

          await client.query(
            'BEGIN'
          );


          const result =
            await client.query(
              `
              SELECT *

              FROM ad_sessions

              WHERE

                id=$1

                AND telegram_id=$2

              FOR UPDATE
              `,
              [
                req.params.id,
                req.auth.id
              ]
            );


          const ad =
            result.rows[0];


          if (
            !ad ||
            ad.status !==
              'completed' ||
            ad.claimed_at
          ) {

            await client.query(
              'ROLLBACK'
            );

            if (ad?.claimed_at) {
              await logSecurity(
                req,
                'reward_replay_blocked',
                'warn',
                { rewardType: 'ad', sessionId: req.params.id }
              );
            }


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Ad is not verified as completed'

              });

          }


          const used =
            (
              await client.query(
                `
                SELECT
                  COUNT(*)::int AS c

                FROM ad_sessions

                WHERE
                  telegram_id=$1
                  AND day=$2
                  AND campaign_id IS NOT DISTINCT FROM $3::bigint
                  AND claimed_at IS NOT NULL
                `,
                [
                  req.auth.id,
                  ad.day,
                  ad.campaign_id
                ]
              )
            ).rows[0].c;


          if (
            used >=
            Math.max(1, Number(ad.daily_limit_snapshot || cfg.adDailyLimit))
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Daily ad limit reached'

              });

          }


          await client.query(
            `
            UPDATE ad_sessions

            SET

              claimed_at=NOW(),

              status='claimed'

            WHERE id=$1
            `,
            [
              ad.id
            ]
          );


          await client.query(
            `
            UPDATE users

            SET

              balance=
                balance + $2,

              updated_at=
                NOW()

            WHERE telegram_id=$1
            `,
            [
              req.auth.id,
              Math.max(0, Number(ad.reward_snapshot ?? cfg.adReward))
            ]
          );


          await client.query(
            `
            INSERT INTO transactions(

              telegram_id,

              type,

              amount,

              reference

            )

            VALUES(
              $1,
              'ad_reward',
              $2,
              $3
            )
            `,
            [
              req.auth.id,
              Math.max(0, Number(ad.reward_snapshot ?? cfg.adReward)),
              ad.id
            ]
          );


          await qualifyReferral(
            client,
            req.auth.id
          );


          await client.query(
            'COMMIT'
          );

          await logSecurity(
            req,
            'reward_granted',
            'info',
            { rewardType: 'ad', sessionId: ad.id, amount: Math.max(0, Number(ad.reward_snapshot ?? cfg.adReward)) }
          );


          res.json({

            success:
              true,

            reward:
              Math.max(0, Number(ad.reward_snapshot ?? cfg.adReward)),

            tasks:
              await taskOverview(
                req.auth.id
              ),

            user:
              await buildUser(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          try {

            await client.query(
              'ROLLBACK'
            );

          } catch {}


          next(
            error
          );


        } finally {

          client.release();

        }

      }

    );


    /* =========================================================
       REFERRALS GET
       ========================================================= */

    app.get(

      '/api/referrals',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT

                telegram_id,

                first_name,

                username,

                photo_url,

                referral_qualified,

                created_at

              FROM users

              WHERE
                referred_by=$1

              ORDER BY
                created_at DESC

              LIMIT 100
              `,
              [
                req.auth.id
              ]
            );


          const successful =
            result.rows.filter(
              row =>
                row.referral_qualified
            ).length;


          const claimed =
            (
              await pool.query(
                `
                SELECT
                  milestone

                FROM referral_milestones

                WHERE
                  telegram_id=$1
                `,
                [
                  req.auth.id
                ]
              )
            ).rows.map(
              row =>
                Number(
                  row.milestone
                )
            );


          const milestones =
            milestoneConfig().map(
              item => ({

                ...item,

                claimed:
                  claimed.includes(
                    item.count
                  ),

                unlocked:
                  successful >=
                  item.count

              })
            );


          const earned =
            safeNumber(
              (
                await pool.query(
                  `
                  SELECT

                    COALESCE(
                      SUM(amount),
                      0
                    ) AS total

                  FROM transactions

                  WHERE

                    telegram_id=$1

                    AND type IN(
                      'referral_reward',
                      'referral_milestone'
                    )
                  `,
                  [
                    req.auth.id
                  ]
                )
              ).rows[0].total
            );


          res.json({

            success:
              true,

            link:
              referralLink(
                req.auth.id
              ),

            successful,

            pending:

              result.rows.length -
              successful,

            totalEarned:
              earned,

            milestones,

            items:
              result.rows

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       REFERRAL MILESTONE CLAIM
       ========================================================= */

    app.post(

      '/api/referrals/milestones/:count',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        const count =
          Number(
            req.params.count
          );


        const config =
          milestoneConfig().find(
            item =>
              item.count ===
              count
          );


        if (
          !config
        ) {

          return res
            .status(404)
            .json({

              success:
                false,

              message:
                'Unknown milestone'

            });

        }


        const client =
          await pool.connect();


        try {

          await client.query(
            'BEGIN'
          );


          const successful =
            (
              await client.query(
                `
                SELECT

                  COUNT(*)::int AS c

                FROM users

                WHERE

                  referred_by=$1

                  AND referral_qualified=TRUE
                `,
                [
                  req.auth.id
                ]
              )
            ).rows[0].c;


          if (
            successful <
            count
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Milestone not reached'

              });

          }


          const inserted =
            await client.query(
              `
              INSERT INTO referral_milestones(

                telegram_id,

                milestone,

                reward

              )

              VALUES(
                $1,$2,$3
              )

              ON CONFLICT
              DO NOTHING

              RETURNING
                milestone
              `,
              [
                req.auth.id,
                count,
                config.reward
              ]
            );


          if (
            !inserted.rowCount
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Already claimed'

              });

          }


          await client.query(
            `
            UPDATE users

            SET

              balance=
                balance + $2,

              updated_at=
                NOW()

            WHERE telegram_id=$1
            `,
            [
              req.auth.id,
              config.reward
            ]
          );


          await client.query(
            `
            INSERT INTO transactions(

              telegram_id,

              type,

              amount,

              reference

            )

            VALUES(
              $1,
              'referral_milestone',
              $2,
              $3
            )
            `,
            [
              req.auth.id,
              config.reward,
              String(
                count
              )
            ]
          );


          await client.query(
            'COMMIT'
          );


          res.json({

            success:
              true,

            reward:
              config.reward,

            user:
              await buildUser(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          try {

            await client.query(
              'ROLLBACK'
            );

          } catch {}


          next(
            error
          );


        } finally {

          client.release();

        }

      }

    );


    /* =========================================================
       EXCLUSIVE CAMPAIGNS
       ========================================================= */

    app.get(

      '/api/campaigns/exclusive',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT

                c.id,

                c.type,

                c.title,

                c.target_url,

                c.description,

                c.target_count,

                c.completed_count,

                CASE
                  WHEN COALESCE(c.reward_per_user, 0) > 0
                    THEN c.reward_per_user
                  ELSE $2
                END AS reward_per_user,

                c.verification_type,

                c.chat_id,

                EXISTS(
                  SELECT 1
                  FROM campaign_completions cc
                  WHERE cc.campaign_id=c.id
                    AND cc.telegram_id=$1
                ) AS completed_by_user

              FROM campaigns c

              WHERE

                c.status='approved'

                AND c.payment_status='paid'

                AND (
                  c.completed_count < c.target_count
                  OR EXISTS(
                    SELECT 1
                    FROM campaign_completions cc2
                    WHERE cc2.campaign_id=c.id
                      AND cc2.telegram_id=$1
                  )
                )

              ORDER BY

                approved_at DESC,

                id DESC

              LIMIT 100
              `,
              [
                req.auth.id,
                cfg.exclusiveReward
              ]
            );


          res.json({

            success:
              true,

            items:
              result.rows

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       PROMOTE QUOTE

       100 completions = 0.2 GRAM

       MAI cost =
       current/fallback GRAM equivalent in MAI
       ========================================================= */

    app.post(

      '/api/campaigns/quote',

      authenticate,

      (
        req,
        res
      ) => {

        const targetCount =
          clamp(

            safeInteger(
              req.body?.targetCount,
              cfg.promoteMinSlots
            ),

            cfg.promoteMinSlots,

            cfg.promoteMaxSlots

          );


        const gram =
          promoteGramPrice(
            targetCount
          );


        const mai =
          promoteMaiPrice(
            targetCount
          );


        res.json({

          success:
            true,

          targetCount,

          GRAM:
            gram,

          MAI:
            mai,

          gramPerCompletion:
            cfg.promoteGramPerSlot,

          gramToMai:
            cfg.gramPriceInMai,

          receiverWallet:
            PROMOTE_RECEIVER_WALLET ||
            null

        });

      }

    );


    /* =========================================================
       SECURE GRAM PAYMENT HELPERS

       GRAM is TON's native coin. Amounts on-chain are nanograms:
       1 GRAM = 1,000,000,000 nanograms.

       A tiny campaign-specific nano suffix is added so simultaneous
       payments for the same package can be correlated safely.
       ========================================================= */

    function gramToNano(
      gram
    ) {

      const value =
        Number(
          gram
        );


      if (
        !Number.isFinite(
          value
        ) ||
        value <= 0
      ) {

        return 0n;

      }


      return BigInt(
        Math.round(
          value *
          1_000_000_000
        )
      );

    }


    function campaignPaymentNano(
      gram,
      campaignId
    ) {

      const base =
        gramToNano(
          gram
        );


      const id =
        BigInt(
          Math.max(
            1,
            safeInteger(
              campaignId,
              1
            )
          )
        );


      /*
        1..999,999 nanograms = at most 0.000999999 GRAM.
        This suffix is not a fee; it is part of the received payment
        and makes equal-priced campaigns distinguishable on-chain.
      */

      const suffix =
        (
          id %
          999999n
        ) +
        1n;


      return base +
        suffix;

    }


    function tonApiHeaders() {

      const headers = {
        Accept:
          'application/json'
      };


      if (
        TONAPI_KEY
      ) {

        headers.Authorization =
          `Bearer ${TONAPI_KEY}`;

      }


      return headers;

    }


    function transactionHashOf(
      tx
    ) {

      return String(
        tx?.hash ||
        tx?.transaction_id?.hash ||
        tx?.transactionId?.hash ||
        ''
      ).trim();

    }


    function transactionTimeOf(
      tx
    ) {

      return safeInteger(
        tx?.utime ??
        tx?.now ??
        tx?.timestamp ??
        tx?.in_msg?.created_at ??
        tx?.inMsg?.createdAt ??
        0
      );

    }


    function inboundValueOf(
      tx
    ) {

      const message =
        tx?.in_msg ||
        tx?.inMsg ||
        null;


      if (!message) {

        return null;

      }


      const raw =
        message.value ??
        message.amount ??
        null;


      if (
        raw ===
        null ||
        raw ===
        undefined
      ) {

        return null;

      }


      try {

        return BigInt(
          String(
            raw
          )
        );

      } catch {

        return null;

      }

    }


    function transactionSucceeded(
      tx
    ) {

      if (
        tx?.success ===
        false
      ) {

        return false;

      }


      const message =
        tx?.in_msg ||
        tx?.inMsg ||
        null;


      if (
        message?.bounced ===
        true
      ) {

        return false;

      }


      return true;

    }


    async function findGramPaymentOnChain({
      receiverWallet,
      expectedNano,
      createdAt
    }) {

      if (
        !receiverWallet ||
        !expectedNano
      ) {

        return null;

      }


      const url =
        `${TONAPI_BASE}/blockchain/accounts/` +
        `${encodeURIComponent(receiverWallet)}/transactions?limit=100`;


      const controller =
        new AbortController();


      const timeout =
        setTimeout(
          () =>
            controller.abort(),
          12000
        );


      try {

        const response =
          await fetch(
            url,
            {
              headers:
                tonApiHeaders(),

              signal:
                controller.signal
            }
          );


        const data =
          await response
            .json()
            .catch(
              () => ({})
            );


        if (
          !response.ok
        ) {

          const error =
            new Error(
              data?.error ||
              data?.message ||
              `TonAPI HTTP ${response.status}`
            );


          error.status =
            response.status;


          throw error;

        }


        const transactions =
          Array.isArray(
            data?.transactions
          )
            ? data.transactions
            : [];


        const minimumTime =
          Math.floor(
            new Date(
              createdAt
            ).getTime() /
            1000
          ) -
          120;


        const expected =
          BigInt(
            String(
              expectedNano
            )
          );


        for (
          const tx of transactions
        ) {

          const hash =
            transactionHashOf(
              tx
            );


          const time =
            transactionTimeOf(
              tx
            );


          const value =
            inboundValueOf(
              tx
            );


          if (
            !hash ||
            value ===
              null ||
            value !==
              expected ||
            time <
              minimumTime ||
            !transactionSucceeded(
              tx
            )
          ) {

            continue;

          }


          return {
            hash,
            time,
            value:
              value.toString()
          };

        }


        return null;


      } finally {

        clearTimeout(
          timeout
        );

      }

    }


    /* =========================================================
       REAL MAI WALLET PROMOTION PAYMENT
       ========================================================= */

    function tokenToAtomic(
      amount,
      decimals = MAI_DECIMALS
    ) {

      const places =
        Math.max(
          0,
          safeInteger(
            decimals,
            9
          )
        );


      const text =
        Number(
          amount || 0
        ).toFixed(
          places
        );


      const parts =
        text.split('.');


      const whole =
        parts[0] || '0';


      const fraction =
        String(
          parts[1] || ''
        )
          .padEnd(
            places,
            '0'
          )
          .slice(
            0,
            places
          );


      return BigInt(
        `${whole}${fraction}` ||
        '0'
      );

    }


    function campaignMaiPaymentAtomic(
      amount,
      campaignId
    ) {

      const base =
        tokenToAtomic(
          amount,
          MAI_DECIMALS
        );


      const suffix =
        (
          BigInt(
            Math.max(
              1,
              safeInteger(
                campaignId,
                1
              )
            )
          ) %
          9999n
        ) +
        1n;


      return base +
        suffix;

    }


    async function fetchMaiJettonWalletAddress(
      ownerAddress
    ) {

      const owner =
        String(
          ownerAddress || ''
        ).trim();


      if (!owner) {

        return null;

      }


      const controller =
        new AbortController();


      const timeout =
        setTimeout(
          () =>
            controller.abort(),
          12000
        );


      try {

        const response =
          await fetch(
            `${TONAPI_BASE}/accounts/${encodeURIComponent(owner)}/jettons/${encodeURIComponent(MAI_JETTON_MASTER)}`,
            {
              headers:
                tonApiHeaders(),

              signal:
                controller.signal
            }
          );


        const data =
          await response
            .json()
            .catch(
              () => ({})
            );


        if (!response.ok) {

          const error =
            new Error(
              data?.error ||
              data?.message ||
              `TonAPI HTTP ${response.status}`
            );


          error.status =
            response.status;


          throw error;

        }


        const candidates = [
          data?.wallet_address?.address,
          data?.wallet_address?.raw,
          data?.wallet_address?.raw_form,
          data?.walletAddress?.address,
          data?.walletAddress?.raw,
          data?.walletAddress?.rawForm,
          typeof data?.wallet_address === 'string'
            ? data.wallet_address
            : '',
          typeof data?.walletAddress === 'string'
            ? data.walletAddress
            : ''
        ];


        for (
          const candidate of
            candidates
        ) {

          const value =
            String(
              candidate || ''
            ).trim();


          if (
            /^-?\d+:[0-9a-fA-F]{64}$/.test(
              value
            ) ||
            /^[A-Za-z0-9_-]{48}$/.test(
              value
            )
          ) {

            return value;

          }

        }


        return null;


      } finally {

        clearTimeout(
          timeout
        );

      }

    }


    function normalizedTonAddress(
      value
    ) {

      return String(
        value || ''
      ).trim();

    }


    async function findMaiPaymentOnChain({
      receiverWallet,
      payerWallet,
      expectedAtomic,
      createdAt
    }) {

      if (
        !receiverWallet ||
        !payerWallet ||
        !expectedAtomic
      ) {

        return null;

      }


      const controller =
        new AbortController();


      const timeout =
        setTimeout(
          () =>
            controller.abort(),
          12000
        );


      try {

        const response =
          await fetch(
            `${TONAPI_BASE}/accounts/${encodeURIComponent(receiverWallet)}/events?limit=100&subject_only=false`,
            {
              headers:
                tonApiHeaders(),

              signal:
                controller.signal
            }
          );


        const data =
          await response
            .json()
            .catch(
              () => ({})
            );


        if (!response.ok) {

          const error =
            new Error(
              data?.error ||
              data?.message ||
              `TonAPI HTTP ${response.status}`
            );


          error.status =
            response.status;


          throw error;

        }


        const events =
          Array.isArray(
            data?.events
          )
            ? data.events
            : [];


        const minimumTime =
          Math.floor(
            new Date(
              createdAt
            ).getTime() /
            1000
          ) -
          120;


        const expected =
          String(
            expectedAtomic
          );


        for (
          const event of events
        ) {

          const eventTime =
            safeInteger(
              event?.timestamp ??
              event?.utime ??
              event?.time ??
              0
            );


          if (
            eventTime <
            minimumTime
          ) {

            continue;

          }


          const actions =
            Array.isArray(
              event?.actions
            )
              ? event.actions
              : [];


          for (
            const action of actions
          ) {

            if (
              String(
                action?.type || ''
              ) !==
              'JettonTransfer'
            ) {

              continue;

            }


            const transfer =
              action?.JettonTransfer ||
              action?.jettonTransfer ||
              action?.jetton_transfer ||
              {};


            const sender =
              normalizedTonAddress(
                transfer?.sender?.address ||
                transfer?.sender
              );


            const recipient =
              normalizedTonAddress(
                transfer?.recipient?.address ||
                transfer?.recipient
              );


            const jetton =
              normalizedTonAddress(
                transfer?.jetton?.address ||
                transfer?.jetton
              );


            const amount =
              String(
                transfer?.amount ??
                ''
              ).trim();


            if (
              sender !==
                normalizedTonAddress(
                  payerWallet
                ) ||
              recipient !==
                normalizedTonAddress(
                  receiverWallet
                ) ||
              jetton !==
                normalizedTonAddress(
                  MAI_JETTON_MASTER
                ) ||
              amount !==
                expected
            ) {

              continue;

            }


            const hash =
              String(
                event?.event_id ||
                event?.eventId ||
                event?.id ||
                ''
              ).trim();


            if (hash) {

              return {
                hash,
                time:
                  eventTime,
                amount
              };

            }

          }

        }


        return null;


      } finally {

        clearTimeout(
          timeout
        );

      }

    }


    /* =========================================================
       CREATE PROMOTION CAMPAIGN
       ========================================================= */

    app.post(

      '/api/campaigns',

      authenticate,

      rateLimit(
        10,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const {

            type,

            title,

            targetUrl,

            description = '',

            targetCount,

            paymentMethod,

            verificationType =
              'manual',

            chatId =
              null,

            rewardPerUser =
              0

          } =
            req.body;


          const allowedTypes = [

            'Channel',

            'Group',

            'Bot',

            'Website',

            'Link',

            'Gift'

          ];


          if (
            !allowedTypes.includes(
              type
            )
          ) {

            return res
              .status(400)
              .json({

                success:
                  false,

                message:
                  'Invalid promotion type'

              });

          }


          const cleanTitle =
            String(
              title ||
              ''
            ).trim();


          if (
            cleanTitle.length <
              2 ||
            cleanTitle.length >
              120
          ) {

            return res
              .status(400)
              .json({

                success:
                  false,

                message:
                  'Campaign title is invalid'

              });

          }


          const cleanUrl =
            String(
              targetUrl ||
              ''
            ).trim();


          if (
            !/^https?:\/\//i.test(
              cleanUrl
            )
          ) {

            return res
              .status(400)
              .json({

                success:
                  false,

                message:
                  'A valid https:// link is required'

              });

          }


          const count =
            clamp(

              safeInteger(
                targetCount,
                cfg.promoteMinSlots
              ),

              cfg.promoteMinSlots,

              cfg.promoteMaxSlots

            );


          const method =
            paymentMethod ===
              'GRAM'

              ? 'GRAM'

              : 'MAI';


          if (
            method ===
              'GRAM' &&
            !PROMOTE_RECEIVER_WALLET
          ) {

            return res
              .status(503)
              .json({

                success:
                  false,

                message:
                  'GRAM promotion payments are temporarily unavailable'

              });

          }


          const quotedGram =
            promoteGramPrice(
              count
            );


          const quotedMai =
            promoteMaiPrice(
              count
            );


          const paymentAmount =
            method ===
              'GRAM'

              ? quotedGram

              : quotedMai;


          const client =
            await pool.connect();


          try {

            await client.query(
              'BEGIN'
            );


            let payerWallet =
              null;


            let payerJettonWallet =
              null;


            if (
              method ===
              'MAI'
            ) {

              const walletResult =
                await client.query(
                  `
                  SELECT wallet_address
                  FROM users
                  WHERE telegram_id=$1
                  LIMIT 1
                  `,
                  [
                    req.auth.id
                  ]
                );


              payerWallet =
                String(
                  walletResult.rows[0]
                    ?.wallet_address ||
                  ''
                ).trim();


              if (!payerWallet) {

                await client.query(
                  'ROLLBACK'
                );


                return res
                  .status(409)
                  .json({

                    success:
                      false,

                    message:
                      'Connect your TON wallet before paying with MAI.'

                  });

              }


              payerJettonWallet =
                await fetchMaiJettonWalletAddress(
                  payerWallet
                );


              if (!payerJettonWallet) {

                await client.query(
                  'ROLLBACK'
                );


                return res
                  .status(409)
                  .json({

                    success:
                      false,

                    message:
                      'MAI was not found in the connected wallet.'

                  });

              }

            }


            const inserted =
              await client.query(
                `
                INSERT INTO campaigns(

                  owner_id,

                  type,

                  title,

                  target_url,

                  description,

                  target_count,

                  reward_per_user,

                  payment_method,

                  payment_amount,

                  quoted_gram,

                  quoted_mai,

                  payment_wallet,

                  payment_status,

                  verification_type,

                  chat_id

                )

                VALUES(
                  $1,$2,$3,$4,$5,
                  $6,$7,$8,$9,$10,
                  $11,$12,$13,$14,$15
                )

                RETURNING *
                `,
                [

                  req.auth.id,

                  type,

                  cleanTitle,

                  cleanUrl,

                  String(
                    description
                  ).slice(
                    0,
                    700
                  ),

                  count,

                  Math.max(
                    0,
                    safeNumber(
                      rewardPerUser
                    )
                  ) > 0
                    ? Math.max(
                        0,
                        safeNumber(
                          rewardPerUser
                        )
                      )
                    : cfg.exclusiveReward,

                  method,

                  paymentAmount,

                  quotedGram,

                  quotedMai,

                  PROMOTE_RECEIVER_WALLET ||
                  null,

                  'pending',

                  verificationType,

                  chatId

                ]
              );


            let campaign =
              inserted.rows[0];


            if (
              method ===
              'MAI'
            ) {

              const paymentAtomic =
                campaignMaiPaymentAtomic(
                  quotedMai,
                  campaign.id
                ).toString();


              const updated =
                await client.query(
                  `
                  UPDATE campaigns

                  SET
                    payment_atomic=$2,
                    payer_wallet=$3,
                    payer_jetton_wallet=$4

                  WHERE id=$1

                  RETURNING *
                  `,
                  [
                    campaign.id,
                    paymentAtomic,
                    payerWallet,
                    payerJettonWallet
                  ]
                );


              campaign =
                updated.rows[0];

            }


            if (
              method ===
              'GRAM'
            ) {

              const paymentNano =
                campaignPaymentNano(
                  quotedGram,
                  campaign.id
                ).toString();


              const updated =
                await client.query(
                  `
                  UPDATE campaigns

                  SET payment_nano=$2

                  WHERE id=$1

                  RETURNING *
                  `,
                  [
                    campaign.id,
                    paymentNano
                  ]
                );


              campaign =
                updated.rows[0];

            }


            await client.query(
              'COMMIT'
            );


            res.json({

              success:
                true,

              campaign,

              payment: {

                method,

                amount:
                  paymentAmount,

                amountNano:
                  campaign.payment_nano ||
                  null,

                amountAtomic:
                  campaign.payment_atomic ||
                  null,

                payerWallet:
                  campaign.payer_wallet ||
                  null,

                payerJettonWallet:
                  campaign.payer_jetton_wallet ||
                  null,

                jettonMaster:
                  MAI_JETTON_MASTER,

                gramEquivalent:
                  quotedGram,

                maiEquivalent:
                  quotedMai,

                receiverWallet:
                  PROMOTE_RECEIVER_WALLET ||
                  null,

                status:
                  campaign.payment_status

              }

            });


          } catch (
            error
          ) {

            try {

              await client.query(
                'ROLLBACK'
              );

            } catch {}


            throw error;


          } finally {

            client.release();

          }


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       OPEN EXCLUSIVE CAMPAIGN
       Starts the server-side 8-second eligibility timer.
       ========================================================= */

    app.post(

      '/api/campaigns/:id/open',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT *
              FROM campaigns
              WHERE id=$1
              `,
              [
                req.params.id
              ]
            );


          const campaign =
            result.rows[0];


          if (
            !campaign ||
            campaign.status !== 'approved' ||
            campaign.payment_status !== 'paid' ||
            campaign.completed_count >= campaign.target_count
          ) {

            return res
              .status(409)
              .json({
                success: false,
                message: 'Campaign unavailable'
              });

          }


          if (
            String(campaign.owner_id) ===
            String(req.auth.id)
          ) {

            return res
              .status(409)
              .json({
                success: false,
                message: 'Campaign owner cannot complete their own campaign'
              });

          }


          const alreadyCompleted =
            await pool.query(
              `
              SELECT 1
              FROM campaign_completions
              WHERE campaign_id=$1
                AND telegram_id=$2
              LIMIT 1
              `,
              [
                campaign.id,
                req.auth.id
              ]
            );


          if (
            alreadyCompleted.rowCount
          ) {

            return res
              .status(409)
              .json({
                success: false,
                message: 'Already completed'
              });

          }


          const engagement =
            await pool.query(
              `
              INSERT INTO campaign_engagements(
                campaign_id,
                telegram_id,
                opened_at
              )
              VALUES($1,$2,NOW())
              ON CONFLICT(
                campaign_id,
                telegram_id
              )
              DO UPDATE SET
                opened_at=NOW()
              RETURNING opened_at
              `,
              [
                campaign.id,
                req.auth.id
              ]
            );


          res.json({
            success: true,
            waitSeconds: 8,
            openedAt:
              engagement.rows[0]
                .opened_at,
            targetUrl:
              campaign.target_url
          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       COMPLETE EXCLUSIVE CAMPAIGN
       ========================================================= */

    app.post(

      '/api/campaigns/:id/complete',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        const client =
          await pool.connect();


        try {

          await client.query(
            'BEGIN'
          );


          const result =
            await client.query(
              `
              SELECT *

              FROM campaigns

              WHERE id=$1

              FOR UPDATE
              `,
              [
                req.params.id
              ]
            );


          const campaign =
            result.rows[0];


          if (
            !campaign ||

            campaign.status !==
              'approved' ||

            campaign.payment_status !==
              'paid' ||

            campaign.completed_count >=
              campaign.target_count
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Campaign unavailable'

              });

          }


          if (
            String(
              campaign.owner_id
            ) ===
            String(
              req.auth.id
            )
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Campaign owner cannot complete their own campaign'

              });

          }


          const engagementResult =
            await client.query(
              `
              SELECT opened_at
              FROM campaign_engagements
              WHERE campaign_id=$1
                AND telegram_id=$2
              FOR UPDATE
              `,
              [
                campaign.id,
                req.auth.id
              ]
            );


          const engagement =
            engagementResult.rows[0];


          if (
            !engagement
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({
                success: false,
                message: 'Open the campaign first'
              });

          }


          const elapsedMs =
            Date.now() -
            new Date(
              engagement.opened_at
            ).getTime();


          if (
            elapsedMs < 8000
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(429)
              .json({
                success: false,
                message: 'Please wait before claiming',
                waitSeconds:
                  Math.max(
                    1,
                    Math.ceil(
                      (8000 - elapsedMs) /
                      1000
                    )
                  )
              });

          }


          if (

            campaign.verification_type ===
              'telegram_member' &&

            campaign.chat_id

          ) {

            const member =
              await telegram(
                'getChatMember',
                {

                  chat_id:
                    campaign.chat_id,

                  user_id:
                    req.auth.id

                }
              );


            const valid =

              [
                'creator',
                'administrator',
                'member'
              ].includes(
                member.status
              ) ||

              (
                member.status ===
                  'restricted' &&

                member.is_member ===
                  true
              );


            if (
              !valid
            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(409)
                .json({

                  success:
                    false,

                  message:
                    'Membership not verified'

                });

            }


          } else if (

            campaign.verification_type !==
            'manual'

          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'This campaign requires provider verification'

              });

          }


          const inserted =
            await client.query(
              `
              INSERT INTO campaign_completions(

                campaign_id,

                telegram_id,

                rewarded

              )

              VALUES(
                $1,$2,$3
              )

              ON CONFLICT
              DO NOTHING

              RETURNING
                campaign_id
              `,
              [

                campaign.id,

                req.auth.id,

                campaign.reward_per_user

              ]
            );


          if (
            !inserted.rowCount
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Already completed'

              });

          }


          await client.query(
            `
            UPDATE campaigns

            SET

              completed_count=
                completed_count + 1

            WHERE id=$1
            `,
            [
              campaign.id
            ]
          );


          const storedReward =
            safeNumber(
              campaign.reward_per_user
            );


          const reward =
            storedReward > 0
              ? storedReward
              : cfg.exclusiveReward;


          if (
            reward > 0
          ) {

            await client.query(
              `
              UPDATE users

              SET

                balance=
                  balance + $2,

                updated_at=
                  NOW()

              WHERE telegram_id=$1
              `,
              [
                req.auth.id,
                reward
              ]
            );


            await client.query(
              `
              INSERT INTO transactions(

                telegram_id,

                type,

                amount,

                reference

              )

              VALUES(
                $1,
                'exclusive_reward',
                $2,
                $3
              )
              `,
              [
                req.auth.id,
                reward,
                String(
                  campaign.id
                )
              ]
            );

          }


          await client.query(
            'COMMIT'
          );


          res.json({

            success:
              true,

            reward,

            user:
              await buildUser(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          try {

            await client.query(
              'ROLLBACK'
            );

          } catch {}


          next(
            error
          );


        } finally {

          client.release();

        }

      }

    );


    /* =========================================================
       WALLET BIND
       ========================================================= */

    app.post(

      '/api/wallet/bind',

      authenticate,

      rateLimit(
        10,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const address =
            String(
              req.body?.address ||
              ''
            ).trim();


          if (
            address.length <
              20 ||
            address.length >
              150
          ) {

            return res
              .status(400)
              .json({

                success:
                  false,

                message:
                  'Invalid wallet address'

              });

          }


          const other =
            await pool.query(
              `
              SELECT
                telegram_id

              FROM users

              WHERE

                wallet_address=$1

                AND telegram_id<>$2
              `,
              [
                address,
                req.auth.id
              ]
            );


          if (
            other.rowCount
          ) {

            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'This wallet is already connected to another account'

              });

          }


          const old =
            await pool.query(
              `
              SELECT
                wallet_address

              FROM users

              WHERE
                telegram_id=$1
              `,
              [
                req.auth.id
              ]
            );


          const oldAddress =
            old.rows[0]
              ?.wallet_address ||
            null;


          await pool.query(
            `
            UPDATE users

            SET

              wallet_address=$2,

              wallet_connected_at=

                CASE

                  WHEN
                    wallet_address
                    IS DISTINCT
                    FROM $2

                  THEN
                    NOW()

                  ELSE
                    wallet_connected_at

                END,

              updated_at=
                NOW()

            WHERE
              telegram_id=$1
            `,
            [
              req.auth.id,
              address
            ]
          );


          if (
            oldAddress &&
            oldAddress !==
              address
          ) {

            clearWalletCache(
              oldAddress
            );

          }


          clearWalletCache(
            address
          );


          await logSecurity(

            req,

            'wallet_bound',

            'info',

            {

              addressTail:
                address.slice(
                  -6
                )

            }

          );


          res.json({

            success:
              true,

            user:
              await buildUser(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       WALLET DISCONNECT
       ========================================================= */

    app.post(

      '/api/wallet/disconnect',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          const current =
            await pool.query(
              `
              SELECT
                wallet_address

              FROM users

              WHERE
                telegram_id=$1
              `,
              [
                req.auth.id
              ]
            );


          const oldAddress =
            current.rows[0]
              ?.wallet_address ||
            null;


          await pool.query(
            `
            UPDATE users

            SET

              wallet_address=NULL,

              wallet_connected_at=
                NOW(),

              updated_at=
                NOW()

            WHERE
              telegram_id=$1
            `,
            [
              req.auth.id
            ]
          );


          if (
            oldAddress
          ) {

            clearWalletCache(
              oldAddress
            );

          }


          await logSecurity(

            req,

            'wallet_disconnected',

            'warn'

          );


          res.json({

            success:
              true,

            user:
              await buildUser(
                req.auth.id
              )

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       WITHDRAWAL SECURITY CHALLENGE HELPERS
       ========================================================= */

    const WITHDRAW_CHALLENGE_TTL_SECONDS = 180;
    const WITHDRAW_CHALLENGE_MAX_ATTEMPTS = 5;

    function withdrawalChallengeHash(id, answer) {
      const secret = `${BOT_TOKEN}|${ADMIN_KEY}|MAI_WITHDRAW_CHALLENGE_V1`;
      return crypto
        .createHmac('sha256', secret)
        .update(`${id}:${String(answer || '').trim().toUpperCase()}`)
        .digest('hex');
    }

    function makeWithdrawalChallengeCode() {
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i += 1) {
        code += alphabet[crypto.randomInt(0, alphabet.length)];
      }
      return code;
    }

    const WITHDRAW_GLYPHS = {
      A:['01110','10001','10001','11111','10001','10001','10001'],
      B:['11110','10001','10001','11110','10001','10001','11110'],
      C:['01111','10000','10000','10000','10000','10000','01111'],
      D:['11110','10001','10001','10001','10001','10001','11110'],
      E:['11111','10000','10000','11110','10000','10000','11111'],
      F:['11111','10000','10000','11110','10000','10000','10000'],
      G:['01111','10000','10000','10111','10001','10001','01111'],
      H:['10001','10001','10001','11111','10001','10001','10001'],
      J:['00111','00010','00010','00010','10010','10010','01100'],
      K:['10001','10010','10100','11000','10100','10010','10001'],
      L:['10000','10000','10000','10000','10000','10000','11111'],
      M:['10001','11011','10101','10101','10001','10001','10001'],
      N:['10001','11001','10101','10011','10001','10001','10001'],
      P:['11110','10001','10001','11110','10000','10000','10000'],
      Q:['01110','10001','10001','10001','10101','10010','01101'],
      R:['11110','10001','10001','11110','10100','10010','10001'],
      S:['01111','10000','10000','01110','00001','00001','11110'],
      T:['11111','00100','00100','00100','00100','00100','00100'],
      U:['10001','10001','10001','10001','10001','10001','01110'],
      V:['10001','10001','10001','10001','10001','01010','00100'],
      W:['10001','10001','10001','10101','10101','11011','10001'],
      X:['10001','10001','01010','00100','01010','10001','10001'],
      Y:['10001','10001','01010','00100','00100','00100','00100'],
      Z:['11111','00001','00010','00100','01000','10000','11111'],
      2:['01110','10001','00001','00010','00100','01000','11111'],
      3:['11110','00001','00001','01110','00001','00001','11110'],
      4:['00010','00110','01010','10010','11111','00010','00010'],
      5:['11111','10000','10000','11110','00001','00001','11110'],
      6:['01110','10000','10000','11110','10001','10001','01110'],
      7:['11111','00001','00010','00100','01000','01000','01000'],
      8:['01110','10001','10001','01110','10001','10001','01110'],
      9:['01110','10001','10001','01111','00001','00001','01110']
    };

    function withdrawalChallengeImage(code) {
      const chars = String(code).split('');
      const cell = 5;
      const glyphWidth = 25;
      const gap = 15;
      const startX = 18;
      const startY = 20;

      const pixels = chars.map((char, charIndex) => {
        const rows = WITHDRAW_GLYPHS[char] || WITHDRAW_GLYPHS.X;
        const dx = startX + charIndex * (glyphWidth + gap);
        const jitterY = crypto.randomInt(-3, 4);
        return rows.flatMap((row, y) => row.split('').map((on, x) => {
          if (on !== '1') return '';
          const opacity = (80 + crypto.randomInt(0, 21)) / 100;
          return `<rect x="${dx + x * cell}" y="${startY + jitterY + y * cell}" width="4.2" height="4.2" rx="1" fill="#f7e6a6" fill-opacity="${opacity}"/>`;
        })).join('');
      }).join('');

      const noise = Array.from({ length: 13 }, () => {
        const x1 = crypto.randomInt(5, 285);
        const y1 = crypto.randomInt(8, 82);
        const x2 = crypto.randomInt(5, 285);
        const y2 = crypto.randomInt(8, 82);
        return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#8ba6c9" stroke-opacity="0.18" stroke-width="1"/>`;
      }).join('');

      const dots = Array.from({ length: 24 }, () => {
        const cx = crypto.randomInt(6, 294);
        const cy = crypto.randomInt(6, 86);
        return `<circle cx="${cx}" cy="${cy}" r="1" fill="#6f8db5" fill-opacity="0.22"/>`;
      }).join('');

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="92" viewBox="0 0 300 92"><rect width="300" height="92" rx="16" fill="#0a1220"/><rect x="1" y="1" width="298" height="90" rx="15" fill="none" stroke="#f3c969" stroke-opacity="0.25"/>${noise}${dots}${pixels}</svg>`;
      return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    }

    /* =========================================================
       CREATE WITHDRAWAL SECURITY CHALLENGE
       ========================================================= */

    app.post(
      '/api/withdrawals/challenge',
      authenticate,
      rateLimit(6, 60000),
      async (req, res, next) => {
        try {
          const amount = Number(req.body?.amount);

          if (!Number.isFinite(amount) || amount < cfg.minWithdrawal || amount > cfg.withdrawMax) {
            return res.status(400).json({
              success: false,
              message: `Withdrawal must be between ${cfg.minWithdrawal} and ${cfg.withdrawMax} MAI`
            });
          }

          const userResult = await pool.query(
            `SELECT telegram_id, balance, wallet_address, wallet_connected_at, account_status, suspended_until
             FROM users WHERE telegram_id=$1 LIMIT 1`,
            [req.auth.id]
          );
          const user = userResult.rows[0];

          if (!user) return res.status(404).json({ success:false, message:'User not found' });
          if (String(user.account_status || 'active') === 'banned') {
            return res.status(403).json({ success:false, message:'Withdrawals are disabled for this account' });
          }
          if (
            String(user.account_status || 'active') === 'suspended' &&
            (!user.suspended_until || new Date(user.suspended_until).getTime() > Date.now())
          ) {
            return res.status(403).json({ success:false, message:'Withdrawals are temporarily disabled for this account' });
          }
          if (!user.wallet_address) return res.status(409).json({ success:false, message:'Connect a wallet first' });
          if (safeNumber(user.balance) < amount) return res.status(409).json({ success:false, message:'Insufficient in-game balance' });

          if (user.wallet_connected_at && (Date.now() - new Date(user.wallet_connected_at).getTime()) / 1000 < cfg.walletLock) {
            return res.status(409).json({ success:false, message:'Wallet security lock is active after a wallet change' });
          }

          const active = await pool.query(
            `SELECT id FROM withdrawals
             WHERE telegram_id=$1 AND status IN ('pending','security_check','approved','processing')
             LIMIT 1`,
            [req.auth.id]
          );
          if (active.rowCount) {
            return res.status(409).json({ success:false, message:'You already have an active withdrawal' });
          }

          const id = crypto.randomUUID();
          const code = makeWithdrawalChallengeCode();
          const answerHash = withdrawalChallengeHash(id, code);
          const expiresAt = new Date(Date.now() + WITHDRAW_CHALLENGE_TTL_SECONDS * 1000);

          await pool.query(
            `UPDATE withdrawal_challenges
             SET consumed_at=COALESCE(consumed_at, NOW())
             WHERE telegram_id=$1 AND consumed_at IS NULL`,
            [req.auth.id]
          );

          await pool.query(
            `INSERT INTO withdrawal_challenges(
               id, telegram_id, amount, wallet_address, answer_hash,
               attempts, max_attempts, expires_at
             ) VALUES($1,$2,$3,$4,$5,0,$6,$7)`,
            [id, req.auth.id, amount, user.wallet_address, answerHash, WITHDRAW_CHALLENGE_MAX_ATTEMPTS, expiresAt]
          );

          res.json({
            success: true,
            challenge: {
              id,
              image: withdrawalChallengeImage(code),
              expiresAt: expiresAt.toISOString(),
              maxAttempts: WITHDRAW_CHALLENGE_MAX_ATTEMPTS,
              amount,
              fee: computeFee(amount),
              receiveAmount: Math.max(0, amount - computeFee(amount)),
              walletAddress: user.wallet_address
            }
          });
        } catch (error) {
          next(error);
        }
      }
    );


    /* =========================================================
       WITHDRAWALS GET
       ========================================================= */

    app.get(

      '/api/withdrawals',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT *

              FROM withdrawals

              WHERE
                telegram_id=$1

              ORDER BY
                created_at DESC

              LIMIT 100
              `,
              [
                req.auth.id
              ]
            );


          res.json({

            success:
              true,

            minWithdrawal:
              cfg.minWithdrawal,

            withdrawFeeFixed:
              cfg.withdrawFeeFixed,

            withdrawFeePercent:
              cfg.withdrawFeePercent,

            items:
              result.rows

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       CREATE WITHDRAWAL

       Withdraws IN-GAME MAI only.
       TON Wallet MAI is never deducted here.
       ========================================================= */

    app.post(

      '/api/withdrawals',

      authenticate,

      rateLimit(
        8,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        try {

          const amount =
            Number(
              req.body?.amount
            );


          const key =
            String(
              req.get(
                'X-Idempotency-Key'
              ) ||
              ''
            );


          const challengeId =
            String(req.body?.challengeId || '').trim();

          const challengeCode =
            String(req.body?.challengeCode || '').trim().toUpperCase();


          if (
            !key ||
            key.length < 16 ||
            key.length > 128 ||
            !/^[A-Za-z0-9._:-]+$/.test(key)
          ) {

            return res
              .status(400)
              .json({

                success:
                  false,

                message:
                  'Missing idempotency key'

              });

          }


          if (

            !Number.isFinite(
              amount
            ) ||

            amount <
              cfg.minWithdrawal ||

            amount >
              cfg.withdrawMax

          ) {

            return res
              .status(400)
              .json({

                success:
                  false,

                message:
                  `Withdrawal must be between ${cfg.minWithdrawal} and ${cfg.withdrawMax} MAI`

              });

          }


          const risk =
            await riskFor(
              req
            );


          if (
            risk.length
          ) {

            await logSecurity(

              req,

              'withdrawal_risk',

              'warn',

              {
                risk
              }

            );

          }


          /*
           * SECURITY / FAIRNESS:
           * Shared device/IP evidence is a risk signal, not proof of abuse.
           * Never reject a withdrawal solely because one of these heuristic
           * signals fired. The request is still routed to security_check
           * below, preserving admin review before any payout can be approved.
           */
          if (
            cfg.devicePolicy === 'hard' &&
            cfg.blockWithdrawOnRisk &&
            risk.length
          ) {
            await logSecurity(
              req,
              'withdrawal_manual_review_required',
              'warn',
              { risk }
            );
          }


          const client =
            await pool.connect();


          try {

            await client.query(
              'BEGIN'
            );


            const user =
              (
                await client.query(
                  `
                  SELECT *

                  FROM users

                  WHERE
                    telegram_id=$1

                  FOR UPDATE
                  `,
                  [
                    req.auth.id
                  ]
                )
              ).rows[0];


            if (
              !user
            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(404)
                .json({

                  success:
                    false,

                  message:
                    'User not found'

                });

            }


            if (String(user.account_status || 'active') === 'banned') {
              await client.query('ROLLBACK');
              return res.status(403).json({
                success:false,
                message:'Withdrawals are disabled for this account'
              });
            }

            if (
              String(user.account_status || 'active') === 'suspended' &&
              (!user.suspended_until || new Date(user.suspended_until).getTime() > Date.now())
            ) {
              await client.query('ROLLBACK');
              return res.status(403).json({
                success:false,
                message:'Withdrawals are temporarily disabled for this account'
              });
            }

            if (
              !user.wallet_address
            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(409)
                .json({

                  success:
                    false,

                  message:
                    'Connect a wallet first'

                });

            }


            if (

              user.wallet_connected_at &&

              (
                Date.now() -

                new Date(
                  user.wallet_connected_at
                ).getTime()
              ) /
              1000 <

              cfg.walletLock

            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(409)
                .json({

                  success:
                    false,

                  message:
                    'Wallet security lock is active after a wallet change'

                });

            }


            const activeWithdrawal =
              await client.query(
                `
                SELECT id
                FROM withdrawals
                WHERE telegram_id=$1
                  AND status IN ('pending','security_check','approved','processing')
                LIMIT 1
                `,
                [req.auth.id]
              );

            if (activeWithdrawal.rowCount) {
              await client.query('ROLLBACK');
              return res.status(409).json({
                success:false,
                message:'You already have an active withdrawal'
              });
            }

            const challengeResult =
              await client.query(
                `
                SELECT *
                FROM withdrawal_challenges
                WHERE id=$1 AND telegram_id=$2
                FOR UPDATE
                `,
                [challengeId, req.auth.id]
              );

            const challenge = challengeResult.rows[0];

            if (
              !challenge ||
              challenge.consumed_at ||
              new Date(challenge.expires_at).getTime() <= Date.now() ||
              Number(challenge.attempts || 0) >= Number(challenge.max_attempts || WITHDRAW_CHALLENGE_MAX_ATTEMPTS) ||
              Math.abs(safeNumber(challenge.amount) - amount) > 0.00000001 ||
              String(challenge.wallet_address) !== String(user.wallet_address)
            ) {
              await client.query('ROLLBACK');
              return res.status(409).json({
                success:false,
                message:'Security verification expired or is no longer valid'
              });
            }

            const suppliedHash = withdrawalChallengeHash(challengeId, challengeCode);
            const expectedHash = String(challenge.answer_hash || '');
            const suppliedBuffer = Buffer.from(suppliedHash, 'hex');
            const expectedBuffer = Buffer.from(expectedHash, 'hex');
            const challengeOk =
              suppliedBuffer.length === expectedBuffer.length &&
              crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);

            if (!challengeOk) {
              await client.query(
                `UPDATE withdrawal_challenges
                 SET attempts=attempts+1,
                     consumed_at=CASE WHEN attempts+1 >= max_attempts THEN NOW() ELSE consumed_at END
                 WHERE id=$1`,
                [challengeId]
              );
              await client.query('COMMIT');
              await logSecurity(req, 'withdrawal_challenge_failed', 'warn', { challengeId });
              return res.status(403).json({
                success:false,
                message:'Incorrect security code'
              });
            }


            const last =
              (
                await client.query(
                  `
                  SELECT
                    created_at

                  FROM withdrawals

                  WHERE
                    telegram_id=$1

                  ORDER BY
                    created_at DESC

                  LIMIT 1
                  `,
                  [
                    req.auth.id
                  ]
                )
              ).rows[0];


            if (

              last &&

              (
                Date.now() -

                new Date(
                  last.created_at
                ).getTime()
              ) /
              1000 <

              cfg.withdrawCooldown

            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(429)
                .json({

                  success:
                    false,

                  message:
                    'Please wait before another withdrawal'

                });

            }


            const today =
              (
                await client.query(
                  `
                  SELECT
                    COUNT(*)::int AS c

                  FROM withdrawals

                  WHERE

                    telegram_id=$1

                    AND

                    (
                      created_at AT TIME ZONE 'UTC'
                    )::date =

                    (
                      NOW() AT TIME ZONE 'UTC'
                    )::date
                  `,
                  [
                    req.auth.id
                  ]
                )
              ).rows[0].c;


            if (
              today >=
              cfg.withdrawDailyCount
            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(409)
                .json({

                  success:
                    false,

                  message:
                    'Daily withdrawal request limit reached'

                });

            }


            if (
              safeNumber(
                user.balance
              ) <
              amount
            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(409)
                .json({

                  success:
                    false,

                  message:
                    'Insufficient in-game balance'

                });

            }


            const fee =
              computeFee(
                amount
              );


            const receive =
              Math.max(
                0,
                amount -
                fee
              );


            const id =
              crypto.randomUUID();


            const status =

              amount >=
                cfg.manualReview ||

              risk.length

                ? 'security_check'

                : 'pending';


            await client.query(
              `UPDATE withdrawal_challenges
               SET consumed_at=NOW()
               WHERE id=$1 AND consumed_at IS NULL`,
              [challengeId]
            );


            await client.query(
              `
              UPDATE users

              SET

                balance=
                  balance - $2,

                locked_balance=
                  locked_balance + $2,

                updated_at=
                  NOW()

              WHERE
                telegram_id=$1
              `,
              [
                req.auth.id,
                amount
              ]
            );


            await client.query(
              `
              INSERT INTO withdrawals(

                id,

                telegram_id,

                amount,

                fee,

                receive_amount,

                wallet_address,

                status,

                idempotency_key,

                risk_flags

              )

              VALUES(
                $1,$2,$3,$4,$5,
                $6,$7,$8,$9
              )
              `,
              [

                id,

                req.auth.id,

                amount,

                fee,

                receive,

                user.wallet_address,

                status,

                key,

                JSON.stringify(
                  risk
                )

              ]
            );


            await client.query(
              'COMMIT'
            );


            res.json({

              success:
                true,

              withdrawal: {

                id,

                amount,

                fee,

                receiveAmount:
                  receive,

                status,

                walletAddress:
                  user.wallet_address

              },

              user:
                await buildUser(
                  req.auth.id
                )

            });


          } catch (
            error
          ) {

            try {

              await client.query(
                'ROLLBACK'
              );

            } catch {}


            if (
              error.code ===
              '23505'
            ) {

              const existing =
                await pool.query(
                  `
                  SELECT *

                  FROM withdrawals

                  WHERE

                    telegram_id=$1

                    AND idempotency_key=$2
                  `,
                  [
                    req.auth.id,
                    key
                  ]
                );


              return res.json({

                success:
                  true,

                replayed:
                  true,

                withdrawal:
                  existing.rows[0]

              });

            }


            throw error;


          } finally {

            client.release();

          }


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       TRANSACTION HISTORY
       ========================================================= */

    app.get(

      '/api/transactions',

      authenticate,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT

                id,

                type,

                amount,

                reference,

                metadata,

                created_at

              FROM transactions

              WHERE
                telegram_id=$1

              ORDER BY
                created_at DESC

              LIMIT 100
              `,
              [
                req.auth.id
              ]
            );


          res.json({

            success:
              true,

            items:
              result.rows

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       ADMIN WITHDRAWALS
       ========================================================= */

    app.get(

      '/admin/withdrawals',
        authenticate,
      admin,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT

                w.*,

                u.first_name,

                u.username

              FROM withdrawals w

              JOIN users u

                ON u.telegram_id=
                  w.telegram_id

              WHERE

                w.status IN(

                  'pending',

                  'security_check',

                  'approved',

                  'processing',

                  'broadcasted'

                )

              ORDER BY
                w.created_at
              `
            );


          res.json({

            success:
              true,

            items:
              result.rows

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );



    /* =========================================================
       ADMIN PAYMENT VIEW — WITHDRAWAL SOFT DELETE

       This never removes or changes the withdrawal itself.
       W5 payout state, locked balance, tx hash and audit evidence remain intact.
       ========================================================= */

    app.delete(
      '/admin/payments/withdrawal/:id',
      authenticate,
      admin,
      async (req, res, next) => {
        const withdrawalId = String(req.params.id || '').trim();

        if (!withdrawalId || withdrawalId.length > 128) {
          return res.status(400).json({
            success: false,
            message: 'Invalid withdrawal id'
          });
        }

        try {
          const result = await pool.query(
            `
            UPDATE withdrawals
            SET payment_admin_hidden=TRUE
            WHERE id=$1
            RETURNING id, telegram_id, status, tx_hash, payout_mode
            `,
            [withdrawalId]
          );

          if (!result.rowCount) {
            return res.status(404).json({
              success: false,
              message: 'Withdrawal payment record not found'
            });
          }

          const row = result.rows[0];

          await pool.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id, action, target_type, target_id, reason, metadata, ip_hash
            )
            VALUES($1,$2,$3,$4,$5,$6,$7)
            `,
            [
              req.admin?.telegramId || null,
              'withdrawal_payment_admin_hidden',
              'withdrawal_payment',
              String(withdrawalId),
              'Hidden from Payments Admin view',
              {
                preservedHistory: true,
                telegramId: String(row.telegram_id),
                status: row.status,
                payoutMode: row.payout_mode || 'manual',
                hasTransactionHash: !!row.tx_hash
              },
              hash(req.ip).slice(0,32)
            ]
          );

          res.json({
            success: true,
            hidden: true,
            preservedHistory: true
          });
        } catch (error) {
          next(error);
        }
      }
    );


    /* =========================================================
       MAI AUTO PAYOUT — W5 / JETTON WORKER

       State flow:
       approved -> processing -> broadcasted -> completed

       Safety:
       - one worker at a time per process
       - DB row locks / SKIP LOCKED
       - unique payout_query_id
       - derived signer address must equal configured payout wallet
       - never automatically resend a processing/broadcasted payment
       - chain reconciliation uses TON Center v3 jetton transfers
       ========================================================= */

    function tokenToAtomic(
      value,
      decimals = MAI_DECIMALS
    ) {

      const raw =
        String(value ?? '0').trim();

      if (!/^\d+(?:\.\d+)?$/.test(raw)) {
        throw new Error('Invalid token amount');
      }

      const safeDecimals =
        Math.max(
          0,
          safeInteger(decimals, MAI_DECIMALS)
        );

      const [
        wholeRaw,
        fractionRaw = ''
      ] = raw.split('.');

      const whole =
        wholeRaw || '0';

      const fraction =
        (
          fractionRaw +
          '0'.repeat(safeDecimals)
        ).slice(0, safeDecimals);

      return (
        BigInt(whole) *
        (10n ** BigInt(safeDecimals))
      ) + BigInt(fraction || '0');

    }


    function payoutQueryIdFor(
      withdrawalId
    ) {

      const hex =
        crypto
          .createHash('sha256')
          .update(
            `MAI:PAYOUT:${String(withdrawalId)}`
          )
          .digest('hex')
          .slice(0, 16);

      return BigInt(`0x${hex}`).toString();

    }


    function sameTonAddress(
      a,
      b
    ) {

      try {

        return (
          Address.parse(String(a))
            .equals(
              Address.parse(String(b))
            )
        );

      } catch {

        return false;

      }

    }


    async function getMaiPayoutContext() {

      if (maiPayoutContext) {
        return maiPayoutContext;
      }

      if (!MAI_PAYOUT_WALLET) {
        throw new Error(
          'MAI_PAYOUT_WALLET is not configured'
        );
      }

      if (!MAI_PAYOUT_MNEMONIC) {
        throw new Error(
          'MAI_PAYOUT_MNEMONIC is not configured'
        );
      }

      const words =
        MAI_PAYOUT_MNEMONIC
          .split(/\s+/)
          .map(word => word.trim())
          .filter(Boolean);

      if (![12, 24].includes(words.length)) {
        throw new Error(
          'MAI_PAYOUT_MNEMONIC must contain 12 or 24 words'
        );
      }

      const keyPair =
        await mnemonicToPrivateKey(words);

      const walletContract =
        WalletContractV5R1.create({

          workchain:
            0,

          publicKey:
            keyPair.publicKey,

          walletId: {
            networkGlobalId:
              -239
          }

        });

      if (
        !sameTonAddress(
          walletContract.address,
          MAI_PAYOUT_WALLET
        )
      ) {

        throw new Error(
          'Payout signer does not match MAI_PAYOUT_WALLET'
        );

      }

      const client =
        new TonClient({

          endpoint:
            TON_RPC_ENDPOINT,

          apiKey:
            TONCENTER_API_KEY || undefined

        });

      const wallet =
        client.open(
          walletContract
        );

      const jettonMaster =
        client.open(
          JettonMaster.create(
            Address.parse(
              MAI_JETTON_MASTER
            )
          )
        );

      const payoutJettonWallet =
        await jettonMaster.getWalletAddress(
          walletContract.address
        );

      maiPayoutContext = {

        client,

        wallet,

        walletContract,

        keyPair,

        payoutJettonWallet

      };

      return maiPayoutContext;

    }


    function buildMaiJettonTransferBody({
      queryId,
      amountAtomic,
      destination,
      responseDestination
    }) {

      const forwardPayload =
        beginCell()
          .storeUint(0, 32)
          .storeStringTail('MAI Network withdrawal')
          .endCell();

      return beginCell()
        .storeUint(
          0x0f8a7ea5,
          32
        )
        .storeUint(
          BigInt(queryId),
          64
        )
        .storeCoins(
          amountAtomic
        )
        .storeAddress(
          Address.parse(destination)
        )
        .storeAddress(
          Address.parse(responseDestination)
        )
        .storeBit(0)
        .storeCoins(
          toNano(
            MAI_PAYOUT_FORWARD_TON
          )
        )
        .storeBit(1)
        .storeRef(
          forwardPayload
        )
        .endCell();

    }


    async function findConfirmedMaiPayout(
      withdrawal
    ) {

      const queryId =
        String(
          withdrawal.payout_query_id ||
          ''
        ).trim();

      if (!queryId) {
        return null;
      }

      const startSeconds =
        Math.max(
          0,
          Math.floor(
            new Date(
              withdrawal.processing_started_at ||
              withdrawal.updated_at ||
              withdrawal.created_at
            ).getTime() / 1000
          ) - 120
        );

      const url =
        new URL(
          `${TONCENTER_V3_BASE}/jetton/transfers`
        );

      url.searchParams.set(
        'owner_address',
        MAI_PAYOUT_WALLET
      );

      url.searchParams.set(
        'jetton_master',
        MAI_JETTON_MASTER
      );

      url.searchParams.set(
        'direction',
        'out'
      );

      url.searchParams.set(
        'start_utime',
        String(startSeconds)
      );

      url.searchParams.set(
        'limit',
        '100'
      );

      url.searchParams.set(
        'sort',
        'desc'
      );

      const headers = {
        Accept:
          'application/json'
      };

      if (TONCENTER_API_KEY) {
        headers['X-API-Key'] =
          TONCENTER_API_KEY;
      }

      const response =
        await fetch(
          url,
          {
            headers
          }
        );

      if (!response.ok) {

        throw new Error(
          `TON Center v3 HTTP ${response.status}`
        );

      }

      const data =
        await response.json();

      const transfers =
        Array.isArray(
          data?.jetton_transfers
        )
          ? data.jetton_transfers
          : [];

      const expectedAmount =
        tokenToAtomic(
          withdrawal.receive_amount
        ).toString();

      return transfers.find(
        transfer => {

          if (
            String(
              transfer?.query_id ??
              ''
            ) !==
            queryId
          ) {
            return false;
          }

          if (
            String(
              transfer?.amount ??
              ''
            ) !==
            expectedAmount
          ) {
            return false;
          }

          if (
            !sameTonAddress(
              transfer?.destination,
              withdrawal.wallet_address
            )
          ) {
            return false;
          }

          if (
            transfer?.transaction_aborted ===
            true
          ) {
            return false;
          }

          return Boolean(
            transfer?.transaction_hash
          );

        }
      ) || null;

    }


    async function finalizeAutoPayout(
      withdrawalId,
      chainTransfer
    ) {

      const client =
        await pool.connect();

      try {

        await client.query('BEGIN');

        const result =
          await client.query(
            `
            SELECT *
            FROM withdrawals
            WHERE id=$1
            FOR UPDATE
            `,
            [
              withdrawalId
            ]
          );

        const withdrawal =
          result.rows[0];

        if (!withdrawal) {

          await client.query('ROLLBACK');
          return false;

        }

        if (
          withdrawal.status ===
          'completed'
        ) {

          await client.query('ROLLBACK');
          return true;

        }

        if (
          ![
            'processing',
            'broadcasted'
          ].includes(
            withdrawal.status
          )
        ) {

          await client.query('ROLLBACK');
          return false;

        }

        const txHash =
          String(
            chainTransfer.transaction_hash ||
            ''
          ).trim();

        if (!txHash) {

          await client.query('ROLLBACK');
          return false;

        }

        const duplicateTx =
          await client.query(
            `
            SELECT id
            FROM withdrawals
            WHERE tx_hash=$1
              AND id<>$2
            LIMIT 1
            `,
            [
              txHash,
              withdrawal.id
            ]
          );

        if (duplicateTx.rowCount) {

          await client.query('ROLLBACK');

          throw new Error(
            'Confirmed transaction hash already belongs to another withdrawal'
          );

        }

        await client.query(
          `
          UPDATE withdrawals
          SET
            status='completed',
            tx_hash=$2,
            broadcast_at=COALESCE(broadcast_at,NOW()),
            confirmed_at=NOW(),
            last_payout_error=NULL,
            updated_at=NOW()
          WHERE id=$1
          `,
          [
            withdrawal.id,
            txHash
          ]
        );

        await client.query(
          `
          UPDATE users
          SET
            locked_balance=
              GREATEST(
                0,
                locked_balance - $2
              ),
            updated_at=NOW()
          WHERE telegram_id=$1
          `,
          [
            withdrawal.telegram_id,
            withdrawal.amount
          ]
        );

        await client.query(
          `
          INSERT INTO transactions(
            telegram_id,
            type,
            amount,
            reference,
            metadata
          )
          SELECT
            $1,
            'withdrawal',
            $2,
            $3,
            $4
          WHERE NOT EXISTS(
            SELECT 1
            FROM transactions
            WHERE type='withdrawal'
              AND reference=$3
          )
          `,
          [
            withdrawal.telegram_id,
            -safeNumber(
              withdrawal.amount
            ),
            withdrawal.id,
            {
              txHash,
              requestedAmount:
                safeNumber(
                  withdrawal.amount
                ),
              fee:
                safeNumber(
                  withdrawal.fee
                ),
              receiveAmount:
                safeNumber(
                  withdrawal.receive_amount
                ),
              payoutMode:
                'auto_w5',
              payoutQueryId:
                String(
                  withdrawal.payout_query_id ||
                  ''
                )
            }
          ]
        );

        await client.query(
          `
          INSERT INTO admin_audit_logs(
            admin_id,
            action,
            target_type,
            target_id,
            reason,
            metadata,
            ip_hash
          )
          VALUES(
            NULL,
            'withdrawal_auto_confirmed',
            'withdrawal',
            $1,
            NULL,
            $2,
            NULL
          )
          `,
          [
            withdrawal.id,
            {
              amount:
                withdrawal.amount,
              receiveAmount:
                withdrawal.receive_amount,
              wallet:
                withdrawal.wallet_address,
              txHash
            }
          ]
        );

        await client.query('COMMIT');

        return true;

      } catch (error) {

        try {
          await client.query('ROLLBACK');
        } catch {}

        throw error;

      } finally {

        client.release();

      }

    }


    async function reconcileAutoPayout(
      withdrawal
    ) {

      const confirmed =
        await findConfirmedMaiPayout(
          withdrawal
        );

      if (!confirmed) {
        return false;
      }

      return finalizeAutoPayout(
        withdrawal.id,
        confirmed
      );

    }


    async function claimApprovedWithdrawalForPayout() {

      const client =
        await pool.connect();

      try {

        await client.query('BEGIN');

        const result =
          await client.query(
            `
            SELECT *
            FROM withdrawals
            WHERE status='approved'
            ORDER BY created_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
            `
          );

        const withdrawal =
          result.rows[0];

        if (!withdrawal) {

          await client.query('ROLLBACK');
          return null;

        }

        const queryId =
          payoutQueryIdFor(
            withdrawal.id
          );

        const context =
          await getMaiPayoutContext();

        await client.query(
          `
          UPDATE withdrawals
          SET
            status='processing',
            payout_mode='auto_w5',
            payout_attempts=
              COALESCE(payout_attempts,0) + 1,
            payout_query_id=$2,
            payout_wallet=$3,
            payout_jetton_wallet=$4,
            processing_started_at=NOW(),
            last_payout_error=NULL,
            updated_at=NOW()
          WHERE id=$1
          `,
          [
            withdrawal.id,
            queryId,
            MAI_PAYOUT_WALLET,
            context.payoutJettonWallet.toString()
          ]
        );

        await client.query('COMMIT');

        console.log(
          '[MAI PAYOUT] claimed approved withdrawal:',
          withdrawal.id,
          `query_id=${queryId}`,
          `receive=${withdrawal.receive_amount}`
        );

        return {
          ...withdrawal,
          status:
            'processing',
          payout_mode:
            'auto_w5',
          payout_query_id:
            queryId,
          payout_wallet:
            MAI_PAYOUT_WALLET,
          payout_jetton_wallet:
            context.payoutJettonWallet.toString(),
          processing_started_at:
            new Date().toISOString()
        };

      } catch (error) {

        try {
          await client.query('ROLLBACK');
        } catch {}

        throw error;

      } finally {

        client.release();

      }

    }


    function isRetryableTonReadError(
      error
    ) {

      const status =
        Number(
          error?.response?.status ||
          error?.status ||
          0
        );

      const message =
        String(
          error?.message ||
          ''
        ).toLowerCase();

      return (
        status === 429 ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        message.includes('status code 429') ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('econnreset') ||
        message.includes('fetch failed')
      );

    }


    function waitMs(
      ms
    ) {

      return new Promise(
        resolve =>
          setTimeout(resolve, ms)
      );

    }


    async function getMaiPayoutSeqnoWithRetry(
      context,
      withdrawalId
    ) {

      const delays = [
        0,
        1200,
        2500,
        5000
      ];

      let lastError = null;

      for (
        let attempt = 0;
        attempt < delays.length;
        attempt += 1
      ) {

        if (delays[attempt] > 0) {
          await waitMs(delays[attempt]);
        }

        try {

          const seqno =
            await context.wallet.getSeqno();

          console.log(
            '[MAI PAYOUT] seqno received:',
            withdrawalId,
            seqno,
            `attempt=${attempt + 1}`
          );

          return seqno;

        } catch (error) {

          lastError = error;

          if (
            !isRetryableTonReadError(error) ||
            attempt === delays.length - 1
          ) {
            throw error;
          }

          console.warn(
            '[MAI PAYOUT] seqno read retry:',
            withdrawalId,
            `attempt=${attempt + 1}`,
            error.message
          );

        }

      }

      throw lastError ||
        new Error('Unable to read payout wallet seqno');

    }


    async function broadcastMaiPayout(
      withdrawal
    ) {

      // Before any send, reconcile by deterministic query_id.
      // This prevents an automatic resend after a prior uncertain broadcast.
      const alreadyConfirmed =
        await reconcileAutoPayout(
          withdrawal
        );

      if (alreadyConfirmed) {
        return;
      }

      const context =
        await getMaiPayoutContext();

      const destination =
        Address.parse(
          String(
            withdrawal.wallet_address
          )
        );

      const amountAtomic =
        tokenToAtomic(
          withdrawal.receive_amount
        );

      if (amountAtomic <= 0n) {
        throw new Error(
          'Withdrawal receive amount must be positive'
        );
      }

      const body =
        buildMaiJettonTransferBody({

          queryId:
            withdrawal.payout_query_id,

          amountAtomic,

          destination:
            destination.toString(),

          responseDestination:
            MAI_PAYOUT_WALLET

        });
      console.log(
        '[MAI PAYOUT] requesting seqno:',
        withdrawal.id
      );

      // Reading seqno is safe to retry because no signed transaction has
      // been broadcast yet. This absorbs transient TON Center 429/timeout
      // errors without risking a duplicate MAI transfer.
      const seqno =
        await getMaiPayoutSeqnoWithRetry(
          context,
          withdrawal.id
        );
      console.log(
        '[MAI PAYOUT] broadcasting signed transfer:',
        withdrawal.id,
        `seqno=${seqno}`,
        `receive=${withdrawal.receive_amount}`
      );

      await context.wallet.sendTransfer({

        seqno,

        secretKey:
          context.keyPair.secretKey,

        // Wallet V5 external signed messages require the +2 IGNORE_ERRORS bit.
        // Without it, V5 can reject the external message (exit code 137).
        sendMode:
          SendMode.PAY_GAS_SEPARATELY |
          SendMode.IGNORE_ERRORS,

        // Keep the signed request short-lived so an uncertain broadcast cannot
        // remain valid indefinitely. TON wallet replay protection also uses seqno.
        timeout:
          Math.floor(Date.now() / 1000) + 300,

        messages: [

          internal({

            to:
              context.payoutJettonWallet,

            value:
              toNano(
                MAI_PAYOUT_ATTACHED_TON
              ),

            bounce:
              true,

            body

          })

        ]

      });
       console.log(
           '[MAI PAYOUT] sendTransfer returned:',
          withdrawal.id
          );
      await pool.query(
        `
        UPDATE withdrawals
        SET
          status='broadcasted',
          broadcast_at=NOW(),
          last_payout_error=NULL,
          updated_at=NOW()
        WHERE id=$1
          AND status='processing'
        `,
        [
          withdrawal.id
        ]
      );

      console.log(
        '[MAI PAYOUT] marked broadcasted:',
        withdrawal.id,
        `query_id=${withdrawal.payout_query_id}`
      );

    }


    async function reconcileOutstandingAutoPayouts() {

      const result =
        await pool.query(
          `
          SELECT *
          FROM withdrawals
          WHERE payout_mode='auto_w5'
            AND status IN(
              'processing',
              'broadcasted'
            )
          ORDER BY updated_at ASC
          LIMIT 20
          `
        );

      for (
        const withdrawal
        of result.rows
      ) {

        try {

          console.log(
            '[MAI PAYOUT] reconciling:',
            withdrawal.id,
            `status=${withdrawal.status}`,
            `query_id=${withdrawal.payout_query_id || 'none'}`
          );

          const reconciled =
            await reconcileAutoPayout(
              withdrawal
            );

          if (reconciled) {
            console.log(
              '[MAI PAYOUT] reconciled and completed:',
              withdrawal.id
            );
          } else {
            console.log(
              '[MAI PAYOUT] no confirmed chain transfer yet:',
              withdrawal.id,
              `query_id=${withdrawal.payout_query_id || 'none'}`
            );
          }

        } catch (error) {

          console.error(
            '[MAI PAYOUT] reconciliation error:',
            withdrawal.id,
            error.message
          );

          await pool.query(
            `
            UPDATE withdrawals
            SET
              last_payout_error=$2,
              updated_at=NOW()
            WHERE id=$1
              AND status IN(
                'processing',
                'broadcasted'
              )
            `,
            [
              withdrawal.id,
              String(
                error.message ||
                'Payout reconciliation failed'
              ).slice(0, 1000)
            ]
          );

        }

      }

    }


    async function runMaiPayoutWorkerOnce() {

      if (
        !MAI_PAYOUT_ENABLED ||
        maiPayoutWorkerBusy
      ) {
        return;
      }

      maiPayoutWorkerBusy =
        true;

      try {

        await getMaiPayoutContext();

        await reconcileOutstandingAutoPayouts();

        const withdrawal =
          await claimApprovedWithdrawalForPayout();

        if (!withdrawal) {
          return;
        }

        try {

          await broadcastMaiPayout(
            withdrawal
          );

        } catch (error) {

          // IMPORTANT:
          // Do not auto-retry a processing withdrawal. A send may have
          // reached the network even if the local request returned an error.
          // The next worker pass only reconciles it by query_id.
          await pool.query(
            `
            UPDATE withdrawals
            SET
              last_payout_error=$2,
              updated_at=NOW()
            WHERE id=$1
              AND status='processing'
            `,
            [
              withdrawal.id,
              String(
                error.message ||
                'Payout broadcast failed or outcome is unknown'
              ).slice(0, 1000)
            ]
          );

          console.error(
            '[MAI PAYOUT] broadcast uncertain:',
            withdrawal.id,
            error.message
          );

        }

      } catch (error) {

        console.error(
          '[MAI PAYOUT] worker error:',
          error.message
        );

      } finally {

        maiPayoutWorkerBusy =
          false;

      }

    }


    function startMaiPayoutWorker() {

      // SAFE VERIFY MODE:
      // Validate the mnemonic-derived W5 address even while automatic
      // payouts are disabled. This path never sends a transaction.
      const hasPayoutVerificationConfig =
        Boolean(
          MAI_PAYOUT_WALLET &&
          MAI_PAYOUT_MNEMONIC
        );

      if (!MAI_PAYOUT_ENABLED) {

        if (!hasPayoutVerificationConfig) {

          console.log(
            'MAI payout signer verification: skipped (configuration incomplete)'
          );

          console.log(
            'MAI auto payout worker: disabled'
          );

          return;

        }

        getMaiPayoutContext()
          .then(context => {

            console.log(
              'MAI payout signer verified: true'
            );

            console.log(
              'MAI payout wallet:',
              context.walletContract.address.toString()
            );

            console.log(
              'MAI payout jetton wallet:',
              context.payoutJettonWallet.toString()
            );

            console.log(
              'MAI auto payout worker: disabled'
            );

          })
          .catch(error => {

            // Fail closed: verification failure never starts the worker.
            console.error(
              'MAI payout signer verified: false'
            );

            console.error(
              '[MAI PAYOUT] safe verification failed:',
              error.message
            );

            console.log(
              'MAI auto payout worker: disabled'
            );

          });

        return;

      }

      // Validate signer/address before the interval starts.
      getMaiPayoutContext()
        .then(context => {

          console.log(
            'MAI payout signer verified: true'
          );

          console.log(
            'MAI auto payout worker: enabled'
          );

          console.log(
            'MAI payout wallet:',
            context.walletContract.address.toString()
          );

          console.log(
            'MAI payout jetton wallet:',
            context.payoutJettonWallet.toString()
          );

          runMaiPayoutWorkerOnce()
            .catch(error =>
              console.error(
                '[MAI PAYOUT] initial run failed:',
                error.message
              )
            );

          maiPayoutWorkerTimer =
            setInterval(
              () => {
                runMaiPayoutWorkerOnce()
                  .catch(error =>
                    console.error(
                      '[MAI PAYOUT] scheduled run failed:',
                      error.message
                    )
                  );
              },
              MAI_PAYOUT_WORKER_INTERVAL_MS
            );

          maiPayoutWorkerTimer.unref();

        })
        .catch(error => {

          // Fail closed: API stays online, payout worker stays OFF.
          console.error(
            'MAI payout signer verified: false'
          );

          console.error(
            '[MAI PAYOUT] disabled because configuration validation failed:',
            error.message
          );

        });

    }


    /* =========================================================
       ADMIN APPROVE WITHDRAWAL
       ========================================================= */

    app.post(

      '/admin/withdrawals/:id/approve',
      authenticate,
      admin,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              UPDATE withdrawals

              SET

                status='approved',

                payout_mode=$2,

                last_payout_error=NULL,

                updated_at=NOW()

              WHERE

                id=$1

                AND status IN(
                  'pending',
                  'security_check'
                )

              RETURNING *
              `,
              [
                req.params.id,
                MAI_PAYOUT_ENABLED
                  ? 'auto_w5'
                  : 'manual'
              ]
            );


          if (result.rowCount) {
            await pool.query(
              `INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,reason,metadata,ip_hash)
               VALUES($1,$2,$3,$4,$5,$6,$7)`,
              [req.admin?.telegramId || null, 'withdrawal_approved', 'withdrawal', req.params.id, null, { amount: result.rows[0].amount, wallet: result.rows[0].wallet_address }, hash(req.ip).slice(0,32)]
            );
          }


          res.json({

            success:
              !!result.rowCount,

            item:
              result.rows[0]

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       ADMIN REJECT WITHDRAWAL
       ========================================================= */

    app.post(

      '/admin/withdrawals/:id/reject',
      authenticate,
      admin,

      async (
        req,
        res,
        next
      ) => {

        const client =
          await pool.connect();


        try {

          await client.query(
            'BEGIN'
          );


          const result =
            await client.query(
              `
              SELECT *

              FROM withdrawals

              WHERE id=$1

              FOR UPDATE
              `,
              [
                req.params.id
              ]
            );


          const withdrawal =
            result.rows[0];


          if (
            !withdrawal ||
            ![
              'pending',
              'security_check',
              'approved'
            ].includes(
              withdrawal.status
            )
          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Cannot reject this withdrawal'

              });

          }


          await client.query(
            `
            UPDATE withdrawals

            SET

              status='rejected',

              updated_at=NOW()

            WHERE id=$1
            `,
            [
              withdrawal.id
            ]
          );


          await client.query(
            `
            UPDATE users

            SET

              balance=
                balance + $2,

              locked_balance=
                GREATEST(
                  0,
                  locked_balance - $2
                ),

              updated_at=
                NOW()

            WHERE telegram_id=$1
            `,
            [
              withdrawal.telegram_id,
              withdrawal.amount
            ]
          );


          await client.query(
            `INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,reason,metadata,ip_hash)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [req.admin?.telegramId || null, 'withdrawal_rejected', 'withdrawal', withdrawal.id, String(req.body?.reason || '').trim() || null, { amount: withdrawal.amount, wallet: withdrawal.wallet_address }, hash(req.ip).slice(0,32)]
          );


          await client.query(
            'COMMIT'
          );


          res.json({

            success:
              true

          });


        } catch (
          error
        ) {

          try {

            await client.query(
              'ROLLBACK'
            );

          } catch {}


          next(
            error
          );


        } finally {

          client.release();

        }

      }

    );


    /* =========================================================
       ADMIN COMPLETE WITHDRAWAL
       ========================================================= */

    app.post(

      '/admin/withdrawals/:id/complete',

      authenticate,

      admin,

      async (
        req,
        res,
        next
      ) => {

        const txHash =
          String(
            req.body?.txHash ||
            ''
          ).trim();


        if (
          !txHash ||
          txHash.length < 32 ||
          txHash.length > 160 ||
          !/^[A-Za-z0-9_+\/=-]+$/.test(txHash)
        ) {

          return res
            .status(400)
            .json({

              success:
                false,

              message:
                'Valid transaction hash required'

            });

        }


        const client =
          await pool.connect();


        try {

          await client.query(
            'BEGIN'
          );


          const result =
            await client.query(
              `
              SELECT *

              FROM withdrawals

              WHERE id=$1

              FOR UPDATE
              `,
              [
                req.params.id
              ]
            );


          const withdrawal =
            result.rows[0];


          if (

            !withdrawal ||

            ![
              'approved',
              'processing'
            ].includes(
              withdrawal.status
            )

          ) {

            await client.query(
              'ROLLBACK'
            );


            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Withdrawal is not approved'

              });

          }


          if (
            String(
              withdrawal.payout_mode ||
              'manual'
            ) === 'auto_w5'
          ) {

            await client.query(
              'ROLLBACK'
            );

            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Automatic payout must be confirmed on-chain by the payout worker'

              });

          }


          const duplicateTx = await client.query(
            `SELECT id FROM withdrawals WHERE tx_hash=$1 AND id<>$2 LIMIT 1`,
            [txHash, withdrawal.id]
          );

          if (duplicateTx.rowCount) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              success:false,
              message:'This transaction hash is already linked to another withdrawal'
            });
          }


          await client.query(
            `
            UPDATE withdrawals

            SET

              status='completed',

              tx_hash=$2,

              confirmed_at=NOW(),

              updated_at=NOW()

            WHERE id=$1
            `,
            [
              withdrawal.id,
              txHash
            ]
          );


          await client.query(
            `
            UPDATE users

            SET

              locked_balance=
                GREATEST(
                  0,
                  locked_balance - $2
                ),

              updated_at=
                NOW()

            WHERE telegram_id=$1
            `,
            [
              withdrawal.telegram_id,
              withdrawal.amount
            ]
          );


          await client.query(
            `
            INSERT INTO transactions(

              telegram_id,

              type,

              amount,

              reference,

              metadata

            )

            VALUES(
              $1,
              'withdrawal',
              $2,
              $3,
              $4
            )
            `,
            [

              withdrawal.telegram_id,

              -safeNumber(
                withdrawal.amount
              ),

              withdrawal.id,

              {
                txHash,
                requestedAmount: safeNumber(withdrawal.amount),
                fee: safeNumber(withdrawal.fee),
                receiveAmount: safeNumber(withdrawal.receive_amount),
                payoutMode: String(withdrawal.payout_mode || 'manual')
              }

            ]
          );


          await client.query(
            `INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,reason,metadata,ip_hash)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [req.admin?.telegramId || null, 'withdrawal_completed', 'withdrawal', withdrawal.id, null, { amount: withdrawal.amount, receiveAmount: withdrawal.receive_amount, wallet: withdrawal.wallet_address, txHash }, hash(req.ip).slice(0,32)]
          );


          await client.query(
            'COMMIT'
          );


          res.json({

            success:
              true

          });


        } catch (
          error
        ) {

          try {

            await client.query(
              'ROLLBACK'
            );

          } catch {}


          next(
            error
          );


        } finally {

          client.release();

        }

      }

    );
      
    /* =========================================================
   ADMIN IDENTITY / AUDIT VIEW
   ========================================================= */

app.get(
  '/admin/me',
  authenticate,
  admin,
  (req, res) => {
    res.json({
      success:true,
      admin:{
        telegramId:req.admin?.telegramId || null,
        authType:req.admin?.type || 'unknown'
      }
    });
  }
);

app.get(
  '/admin/audit-logs',
  authenticate,
  admin,
  async (req, res, next) => {
    try {
      const limit = clamp(safeInteger(req.query?.limit, 100), 1, 500);
      const result = await pool.query(
        `SELECT id, admin_id, action, target_type, target_id, reason, metadata, ip_hash, created_at
         FROM admin_audit_logs
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );
      res.json({success:true, items:result.rows});
    } catch (error) {
      next(error);
    }
  }
);


   /* =========================================================
   ADMIN DASHBOARD SUMMARY

   Read-only overview for MAI Admin Control Center.
   ========================================================= */

app.get(
  '/admin/dashboard',
  authenticate,
  admin,
  async (req, res, next) => {
    try {
      const [summaryResult, growthResult] = await Promise.all([
        pool.query(`
          SELECT
            (SELECT COUNT(*)::int FROM users) AS total_users,
            (SELECT COUNT(*)::int FROM users WHERE account_status='banned') AS banned_users,
            (SELECT COUNT(*)::int FROM users WHERE account_status='suspended' AND (suspended_until IS NULL OR suspended_until > NOW())) AS suspended_users,
            (SELECT COUNT(*)::int FROM users WHERE created_at >= NOW() - INTERVAL '24 hours') AS new_users_24h,
            (SELECT COUNT(*)::int FROM campaigns WHERE payment_status='paid' AND status='pending') AS pending_campaigns,
            (SELECT COUNT(*)::int FROM campaigns WHERE payment_status='paid' AND status='approved') AS active_campaigns,
            (SELECT COUNT(*)::int FROM withdrawals) AS total_withdrawals,
            (SELECT COUNT(*)::int FROM withdrawals WHERE status IN ('pending','security_check')) AS pending_withdrawals,
            (SELECT COUNT(*)::int FROM withdrawals WHERE status='security_check') AS risky_withdrawals,
            (SELECT COALESCE(SUM(amount),0)::numeric FROM withdrawals WHERE status='completed') AS mai_distributed,
            (SELECT COUNT(*)::int FROM security_logs WHERE severity='warn' AND created_at >= NOW() - INTERVAL '24 hours') AS security_warnings_24h,
            (SELECT COUNT(DISTINCT device_hash)::int FROM device_accounts) AS known_devices,
            (SELECT COUNT(*)::int FROM (SELECT device_hash FROM device_accounts GROUP BY device_hash HAVING COUNT(DISTINCT telegram_id) > 1) shared_devices) AS shared_devices
        `),
        pool.query(`
          WITH days AS (
            SELECT generate_series(
              (CURRENT_DATE - INTERVAL '29 days')::date,
              CURRENT_DATE,
              INTERVAL '1 day'
            )::date AS day
          )
          SELECT
            TO_CHAR(days.day, 'YYYY-MM-DD') AS day,
            (SELECT COUNT(*)::int FROM users u WHERE u.created_at < days.day + INTERVAL '1 day') AS total,
            (SELECT COUNT(*)::int FROM users u WHERE u.created_at >= days.day AND u.created_at < days.day + INTERVAL '1 day') AS joined
          FROM days
          ORDER BY days.day
        `)
      ]);

      const dashboard = summaryResult.rows[0] || {};
      dashboard.user_growth_30d = growthResult.rows || [];

      // These states describe this server's own configured/operational modules.
      // We intentionally do not claim an external Telegram API health check here.
      dashboard.system_status = {
        bot_api: BOT_TOKEN ? 'configured' : 'unconfigured',
        database: 'online',
        withdrawals: 'online',
        notifications: BOT_TOKEN ? 'configured' : 'unconfigured',
        security: 'online'
      };

      res.json({ success: true, dashboard });
    } catch (error) {
      next(error);
    }
  }
);

       /* =========================================================
   ADMIN USERS

   Read-only user overview for MAI Admin Control Center.
   Security identifiers are hashed; raw IP addresses are
   not exposed by this endpoint.
   ========================================================= */

app.get(
  '/admin/users',
  
  authenticate,
  admin,

  async (req, res, next) => {
    try {
      const result =
        await pool.query(
          `
          SELECT
            u.telegram_id,
            u.username,
            u.first_name,
            u.wallet_address,
            u.balance,
            u.locked_balance,
           COALESCE(u.mining_checkpoint_level, u.mining_highest_level, 1) AS mining_level,
           COALESCE(u.mining_checkpoint_rate_daily, u.farm_rate_daily, 0) AS mining_speed,
            u.referred_by,
            u.account_status,
            u.suspended_until,
            u.admin_note,
            u.created_at,
            u.updated_at,

            COALESCE(
              (
                SELECT COUNT(DISTINCT da.device_hash)::int
                FROM device_accounts da
                WHERE da.telegram_id = u.telegram_id
              ),
              0
            ) AS device_count,

            COALESCE(
              (
                SELECT COUNT(DISTINCT da2.telegram_id)::int
                FROM device_accounts da2
                WHERE da2.device_hash IN (
                  SELECT da3.device_hash
                  FROM device_accounts da3
                  WHERE da3.telegram_id = u.telegram_id
                )
              ),
              0
            ) AS linked_device_accounts,

            COALESCE(
              (
                SELECT COUNT(*)::int
                FROM security_logs sl
                WHERE sl.telegram_id = u.telegram_id
                  AND sl.severity = 'warn'
              ),
              0
            ) AS warning_count

          FROM users u

          ORDER BY
            u.created_at DESC

          LIMIT 500
          `
        );

      res.json({
        success: true,
        items: result.rows.map(row => ({
          ...row,
          is_admin: isProtectedAdminTelegramId(row.telegram_id)
        }))
      });

    } catch (error) {
      next(error);
    }
  }
);

    /* =========================================================
   ADMIN USER DETAIL / LINKED ACCOUNTS

   Read-only security view.
   Raw IP addresses and raw device IDs are never exposed.
   ========================================================= */

app.get(
  '/admin/users/:telegramId',

  authenticate,
  admin,

  async (req, res, next) => {
    try {
      const telegramId =
        String(
          req.params.telegramId || ''
        ).trim();

      if (!/^\d+$/.test(telegramId)) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Invalid Telegram user id'
          });
      }

      const userResult =
        await pool.query(
          `
          SELECT
            telegram_id,
            username,
            first_name,
            wallet_address,
            balance,
            locked_balance,
            COALESCE(mining_checkpoint_level, mining_highest_level, 1) AS mining_level,
            COALESCE(mining_checkpoint_rate_daily, farm_rate_daily, 0) AS mining_speed,
            referred_by,
            referral_qualified,
            account_status,
            suspended_until,
            admin_note,
            created_at,
            updated_at

          FROM users

          WHERE telegram_id=$1

          LIMIT 1
          `,
          [
            telegramId
          ]
        );

      if (!userResult.rowCount) {
        return res
          .status(404)
          .json({
            success: false,
            message: 'User not found'
          });
      }

      const devices =
        await pool.query(
          `
          SELECT
            device_hash,
            device_label,
            first_seen,
            last_seen,
            (SELECT COUNT(DISTINCT d2.telegram_id)::int FROM device_accounts d2 WHERE d2.device_hash=device_accounts.device_hash) AS account_count

          FROM device_accounts

          WHERE telegram_id=$1

          ORDER BY last_seen DESC
          `,
          [
            telegramId
          ]
        );

      const linkedAccounts = await pool.query(
        `SELECT u.telegram_id,u.username,u.first_name,u.wallet_address,COUNT(DISTINCT da.device_hash)::int AS shared_device_count,MAX(da.last_seen) AS last_seen,ARRAY_AGG(DISTINCT da.device_hash) AS shared_device_hashes FROM device_accounts mine JOIN device_accounts da ON da.device_hash=mine.device_hash JOIN users u ON u.telegram_id=da.telegram_id WHERE mine.telegram_id=$1 AND da.telegram_id<>$1 GROUP BY u.telegram_id,u.username,u.first_name,u.wallet_address ORDER BY MAX(da.last_seen) DESC LIMIT 200`,[telegramId]);

      const securityLogs =
        await pool.query(
          `
          SELECT
            action,
            severity,
            ip_hash,
            device_hash,
            user_agent_hash,
            metadata,
            created_at

          FROM security_logs

          WHERE telegram_id=$1

          ORDER BY created_at DESC

          LIMIT 200
          `,
          [
            telegramId
          ]
        );

      const sharedIpAccounts = await pool.query(
        `SELECT u.telegram_id,u.username,u.first_name,COUNT(DISTINCT sl.ip_hash)::int AS shared_ip_count,MAX(sl.created_at) AS last_seen FROM security_logs mine JOIN security_logs sl ON sl.ip_hash=mine.ip_hash JOIN users u ON u.telegram_id=sl.telegram_id WHERE mine.telegram_id=$1 AND mine.ip_hash IS NOT NULL AND mine.metadata->>'network_signal_version'='2' AND sl.metadata->>'network_signal_version'='2' AND sl.telegram_id IS NOT NULL AND sl.telegram_id<>$1 GROUP BY u.telegram_id,u.username,u.first_name ORDER BY MAX(sl.created_at) DESC LIMIT 200`,[telegramId]);

      res.json({
        success: true,

        user: {
          ...userResult.rows[0],
          is_admin: isProtectedAdminTelegramId(userResult.rows[0]?.telegram_id)
        },

        security: {
          devices:
            devices.rows,

          linkedDeviceAccounts:
            linkedAccounts.rows,

          sharedIpAccounts:
            sharedIpAccounts.rows,

          logs:
            securityLogs.rows
        }
      });

    } catch (error) {
      next(error);
    }
  }
);
    async function notifyAdminUser(telegramId,text) {
      if (!BOT_TOKEN) return {sent:false,reason:'BOT_TOKEN missing'};
      try { await telegram('sendMessage',{chat_id:String(telegramId),text:String(text).slice(0,3500),disable_web_page_preview:true}); return {sent:true}; }
      catch(error) { console.warn('[ADMIN USER NOTIFY]',error.message); return {sent:false,reason:String(error.message || 'send_failed').slice(0,300)}; }
    }

    /* =========================================================
       ADMIN USER ACCESS CONTROLS
       ========================================================= */

    app.post(
      '/admin/users/:telegramId/ban',
      authenticate,
      admin,
      async (req, res, next) => {
        try {
          const telegramId = String(req.params.telegramId || '').trim();
          const reason = String(req.body?.reason || '').trim().slice(0,1000);
          if (!/^\d+$/.test(telegramId)) return res.status(400).json({success:false,message:'Invalid Telegram user id'});
          if (!reason) return res.status(400).json({success:false,message:'Reason is required'});
          if (isProtectedAdminTelegramId(telegramId)) return res.status(409).json({success:false,message:'Protected admin accounts cannot be banned'});

          const result = await pool.query(
            `UPDATE users
             SET account_status='banned', suspended_until=NULL, admin_note=$2, updated_at=NOW()
             WHERE telegram_id=$1
             RETURNING telegram_id,username,first_name,account_status,suspended_until,admin_note`,
            [telegramId,reason]
          );
          if (!result.rowCount) return res.status(404).json({success:false,message:'User not found'});

          await pool.query(
            `INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,reason,metadata,ip_hash)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [req.admin?.telegramId || null,'user_banned','user',telegramId,reason,{authType:req.admin?.type || 'unknown'},hash(req.ip).slice(0,32)]
          );
          const notification=await notifyAdminUser(telegramId,`🚫 MAI Network account notice\n\nYour account has been banned.\nReason: ${reason}`);
          res.json({success:true,user:result.rows[0],notification});
        } catch (error) { next(error); }
      }
    );

    app.post(
      '/admin/users/:telegramId/suspend',
      authenticate,
      admin,
      async (req, res, next) => {
        try {
          const telegramId = String(req.params.telegramId || '').trim();
          const reason = String(req.body?.reason || '').trim().slice(0,1000);
          const untilRaw = String(req.body?.until || '').trim();
          const until = new Date(untilRaw);
          if (!/^\d+$/.test(telegramId)) return res.status(400).json({success:false,message:'Invalid Telegram user id'});
          if (!reason) return res.status(400).json({success:false,message:'Reason is required'});
          if (!untilRaw || Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) return res.status(400).json({success:false,message:'A valid future suspension time is required'});
          if (isProtectedAdminTelegramId(telegramId)) return res.status(409).json({success:false,message:'Protected admin accounts cannot be suspended'});

          const result = await pool.query(
            `UPDATE users
             SET account_status='suspended', suspended_until=$2, admin_note=$3, updated_at=NOW()
             WHERE telegram_id=$1
             RETURNING telegram_id,username,first_name,account_status,suspended_until,admin_note`,
            [telegramId,until.toISOString(),reason]
          );
          if (!result.rowCount) return res.status(404).json({success:false,message:'User not found'});

          await pool.query(
            `INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,reason,metadata,ip_hash)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [req.admin?.telegramId || null,'user_suspended','user',telegramId,reason,{until:until.toISOString(),authType:req.admin?.type || 'unknown'},hash(req.ip).slice(0,32)]
          );
          const notification=await notifyAdminUser(telegramId,`⏳ MAI Network account notice\n\nYour account has been suspended until ${until.toISOString()}.\nReason: ${reason}`);
          res.json({success:true,user:result.rows[0],notification});
        } catch (error) { next(error); }
      }
    );

    app.post(
      '/admin/users/:telegramId/unban',
      authenticate,
      admin,
      async (req, res, next) => {
        try {
          const telegramId = String(req.params.telegramId || '').trim();
          const reason = String(req.body?.reason || '').trim().slice(0,1000);
          if (!/^\d+$/.test(telegramId)) return res.status(400).json({success:false,message:'Invalid Telegram user id'});
          if (!reason) return res.status(400).json({success:false,message:'Reason is required'});

          const result = await pool.query(
            `UPDATE users
             SET account_status='active', suspended_until=NULL, admin_note=$2, updated_at=NOW()
             WHERE telegram_id=$1
             RETURNING telegram_id,username,first_name,account_status,suspended_until,admin_note`,
            [telegramId,reason]
          );
          if (!result.rowCount) return res.status(404).json({success:false,message:'User not found'});

          await pool.query(
            `INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,reason,metadata,ip_hash)
             VALUES($1,$2,$3,$4,$5,$6,$7)`,
            [req.admin?.telegramId || null,'user_access_restored','user',telegramId,reason,{authType:req.admin?.type || 'unknown'},hash(req.ip).slice(0,32)]
          );
          const notification=await notifyAdminUser(telegramId,`✅ MAI Network account notice\n\nYour account access has been restored.\nAdmin note: ${reason}`);
          res.json({success:true,user:result.rows[0],notification});
        } catch (error) { next(error); }
      }
    );


    app.post('/admin/users/:telegramId/message',authenticate,admin,async(req,res,next)=>{
      try { const telegramId=String(req.params.telegramId || '').trim(); const message=String(req.body?.message || '').trim().slice(0,3500); if(!/^\d+$/.test(telegramId)) return res.status(400).json({success:false,message:'Invalid Telegram user id'}); if(!message) return res.status(400).json({success:false,message:'Message is required'}); const exists=await pool.query('SELECT telegram_id FROM users WHERE telegram_id=$1 LIMIT 1',[telegramId]); if(!exists.rowCount) return res.status(404).json({success:false,message:'User not found'}); const notification=await notifyAdminUser(telegramId,`📣 MAI Network\n\n${message}`); await pool.query(`INSERT INTO admin_audit_logs(admin_id,action,target_type,target_id,reason,metadata,ip_hash) VALUES($1,$2,$3,$4,$5,$6,$7)`,[req.admin?.telegramId || null,'user_message_sent','user',telegramId,null,{sent:notification.sent,reason:notification.reason || null},hash(req.ip).slice(0,32)]); if(!notification.sent) return res.status(502).json({success:false,message:'Telegram message could not be delivered',notification}); res.json({success:true,notification}); } catch(error){next(error);}
    });

    /* =========================================================
       ADMIN CAMPAIGNS
       ========================================================= */

    app.get(

      '/admin/campaigns',
      authenticate,
      admin,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              SELECT *

              FROM campaigns

              ORDER BY
                created_at DESC

              LIMIT 300
              `
            );


          res.json({

            success:
              true,

            items:
              result.rows

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       ADMIN CAMPAIGN / PAYMENT SOFT DELETE

       These endpoints never hard-delete financial or campaign rows.
       They only hide records from the relevant Admin Panel view.
       ========================================================= */

    app.delete(
      '/admin/campaigns/:id',
      authenticate,
      admin,
      async (req, res, next) => {
        const campaignId = safeInteger(req.params.id, 0);

        if (campaignId <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid campaign id'
          });
        }

        try {
          const result = await pool.query(
            `
            UPDATE campaigns
            SET admin_hidden=TRUE
            WHERE id=$1
            RETURNING id, status, payment_status, payment_tx_hash
            `,
            [campaignId]
          );

          if (!result.rowCount) {
            return res.status(404).json({
              success: false,
              message: 'Campaign not found'
            });
          }

          const row = result.rows[0];

          await pool.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id, action, target_type, target_id, reason, metadata, ip_hash
            )
            VALUES($1,$2,$3,$4,$5,$6,$7)
            `,
            [
              req.admin?.telegramId || null,
              'campaign_admin_hidden',
              'campaign',
              String(campaignId),
              'Hidden from Promotions Admin view',
              {
                preservedHistory: true,
                status: row.status,
                paymentStatus: row.payment_status,
                hasTransactionHash: !!row.payment_tx_hash
              },
              hash(req.ip).slice(0,32)
            ]
          );

          res.json({
            success: true,
            hidden: true,
            preservedHistory: true
          });
        } catch (error) {
          next(error);
        }
      }
    );

    app.delete(
      '/admin/payments/promotion/:id',
      authenticate,
      admin,
      async (req, res, next) => {
        const campaignId = safeInteger(req.params.id, 0);

        if (campaignId <= 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid campaign id'
          });
        }

        try {
          const result = await pool.query(
            `
            UPDATE campaigns
            SET payment_admin_hidden=TRUE
            WHERE id=$1
            RETURNING id, status, payment_status, payment_tx_hash
            `,
            [campaignId]
          );

          if (!result.rowCount) {
            return res.status(404).json({
              success: false,
              message: 'Promotion payment record not found'
            });
          }

          const row = result.rows[0];

          await pool.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id, action, target_type, target_id, reason, metadata, ip_hash
            )
            VALUES($1,$2,$3,$4,$5,$6,$7)
            `,
            [
              req.admin?.telegramId || null,
              'promotion_payment_admin_hidden',
              'campaign_payment',
              String(campaignId),
              'Hidden from Payments Admin view',
              {
                preservedHistory: true,
                status: row.status,
                paymentStatus: row.payment_status,
                hasTransactionHash: !!row.payment_tx_hash
              },
              hash(req.ip).slice(0,32)
            ]
          );

          res.json({
            success: true,
            hidden: true,
            preservedHistory: true
          });
        } catch (error) {
          next(error);
        }
      }
    );


    /* =========================================================
       VERIFY GRAM PROMOTION PAYMENT

       The client cannot mark a payment as paid. This endpoint scans
       low-level finalized account transactions from TonAPI and only
       activates the campaign after an exact, unused on-chain payment
       is found at the server-configured receiver wallet.
       ========================================================= */

    app.post(

      '/api/campaigns/:id/verify-payment',

      authenticate,

      rateLimit(
        12,
        60000
      ),

      async (
        req,
        res,
        next
      ) => {

        const campaignId =
          safeInteger(
            req.params.id,
            0
          );


        if (
          campaignId <= 0
        ) {

          return res
            .status(400)
            .json({

              success:
                false,

              message:
                'Invalid campaign id'

            });

        }


        try {

          const snapshot =
            await pool.query(
              `
              SELECT *

              FROM campaigns

              WHERE
                id=$1
                AND owner_id=$2

              LIMIT 1
              `,
              [
                campaignId,
                req.auth.id
              ]
            );


          const campaign =
            snapshot.rows[0];


          if (!campaign) {

            return res
              .status(404)
              .json({

                success:
                  false,

                message:
                  'Campaign not found'

              });

          }


          if (
            ![
              'GRAM',
              'MAI'
            ].includes(
              campaign.payment_method
            )
          ) {

            return res
              .status(400)
              .json({

                success:
                  false,

                message:
                  'Unsupported campaign payment method'

              });

          }


          if (
            campaign.payment_status ===
            'paid'
          ) {

            return res.json({

              success:
                true,

              verified:
                true,

              campaign

            });

          }


          if (
            !PROMOTE_RECEIVER_WALLET ||
            campaign.payment_wallet !==
              PROMOTE_RECEIVER_WALLET
          ) {

            return res
              .status(503)
              .json({

                success:
                  false,

                message:
                  'Promotion receiver wallet configuration mismatch'

              });

          }


          const expectedNano =
            String(
              campaign.payment_nano ||
              ''
            );


          const expectedAtomic =
            String(
              campaign.payment_atomic ||
              ''
            );


          const paymentInitialized =
            campaign.payment_method ===
              'MAI'

              ? /^\d+$/.test(
                  expectedAtomic
                )

              : /^\d+$/.test(
                  expectedNano
                );


          if (
            !paymentInitialized
          ) {

            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Campaign payment amount is not initialized'

              });

          }


          await pool.query(
            `
            UPDATE campaigns

            SET
              payment_verification_attempts=
                payment_verification_attempts + 1,
              payment_last_checked_at=NOW()

            WHERE id=$1
            `,
            [
              campaignId
            ]
          );


          let onChain;


          try {

            onChain =
              campaign.payment_method ===
                'MAI'

                ? await findMaiPaymentOnChain({

                    receiverWallet:
                      PROMOTE_RECEIVER_WALLET,

                    payerWallet:
                      campaign.payer_wallet,

                    expectedAtomic,

                    createdAt:
                      campaign.created_at

                  })

                : await findGramPaymentOnChain({

                    receiverWallet:
                      PROMOTE_RECEIVER_WALLET,

                    expectedNano,

                    createdAt:
                      campaign.created_at

                  });


          } catch (
            error
          ) {

            console.warn(
              '[PROMOTION PAYMENT VERIFY]',
              error.message
            );


            return res
              .status(503)
              .json({

                success:
                  false,

                verified:
                  false,

                retryable:
                  true,

                message:
                  'Blockchain verification is temporarily unavailable. Please try again.'

              });

          }


          if (!onChain) {

            return res
              .status(409)
              .json({

                success:
                  false,

                verified:
                  false,

                retryable:
                  true,

                message:
                  'Payment is not finalized yet. Please wait a few seconds and try again.'

              });

          }


          const client =
            await pool.connect();


          try {

            await client.query(
              'BEGIN'
            );


            const locked =
              await client.query(
                `
                SELECT *

                FROM campaigns

                WHERE
                  id=$1
                  AND owner_id=$2

                FOR UPDATE
                `,
                [
                  campaignId,
                  req.auth.id
                ]
              );


            const current =
              locked.rows[0];


            if (!current) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(404)
                .json({

                  success:
                    false,

                  message:
                    'Campaign not found'

                });

            }


            if (
              current.payment_status ===
              'paid'
            ) {

              await client.query(
                'COMMIT'
              );


              return res.json({

                success:
                  true,

                verified:
                  true,

                campaign:
                  current

              });

            }


            const used =
              await client.query(
                `
                SELECT id

                FROM campaigns

                WHERE
                  payment_tx_hash=$1
                  AND id<>$2

                LIMIT 1
                `,
                [
                  onChain.hash,
                  campaignId
                ]
              );


            if (
              used.rowCount
            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(409)
                .json({

                  success:
                    false,

                  verified:
                    false,

                  message:
                    'This blockchain payment has already been used'

                });

            }


            const verified =
              await client.query(
                `
                UPDATE campaigns

                SET
             payment_status='paid',
             status='pending',
             payment_tx_hash=$2,
             payment_verified_at=NOW(),
              approved_at=NULL
                WHERE
                  id=$1
                  AND payment_status='pending'

                RETURNING *
                `,
                [
                  campaignId,
                  onChain.hash
                ]
              );


            if (
              !verified.rowCount
            ) {

              await client.query(
                'ROLLBACK'
              );


              return res
                .status(409)
                .json({

                  success:
                    false,

                  verified:
                    false,

                  message:
                    'Campaign payment state changed. Refresh and try again.'

                });

            }


            await client.query(
              `
              INSERT INTO transactions(
                telegram_id,
                type,
                amount,
                reference,
                metadata
              )

              VALUES(
                $1,
                $2,
                $3,
                $4,
                $5
              )
              `,
              [
                req.auth.id,

                current.payment_method ===
                  'MAI'
                  ? 'promotion_payment_mai_wallet'
                  : 'promotion_payment_gram',

                -safeNumber(
                  current.payment_method ===
                    'MAI'
                    ? current.quoted_mai
                    : current.quoted_gram
                ),

                String(
                  campaignId
                ),

                {
                  txHash:
                    onChain.hash,

                  paymentMethod:
                    current.payment_method,

                  amountNano:
                    current.payment_method ===
                      'GRAM'
                      ? expectedNano
                      : null,

                  amountAtomic:
                    current.payment_method ===
                      'MAI'
                      ? expectedAtomic
                      : null,

                  payerWallet:
                    current.payer_wallet ||
                    null,

                  receiverWallet:
                    PROMOTE_RECEIVER_WALLET
                }
              ]
            );


            await client.query(
              'COMMIT'
            );


            return res.json({

              success:
                true,

              verified:
                true,

              campaign:
                verified.rows[0]

            });


          } catch (
            error
          ) {

            try {
              await client.query(
                'ROLLBACK'
              );
            } catch {}


            if (
              error?.code ===
              '23505'
            ) {

              return res
                .status(409)
                .json({

                  success:
                    false,

                  verified:
                    false,

                  message:
                    'This blockchain payment has already been used'

                });

            }


            throw error;


          } finally {

            client.release();

          }


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );


    /* =========================================================
       ADMIN CAMPAIGN APPROVE

       GRAM payment state is NEVER accepted from the admin request.
       GRAM campaigns can be approved only after the on-chain
       verifier has already marked payment_status='paid'.
       ========================================================= */

    app.post(

      '/admin/campaigns/:id/approve',
      authenticate,
      admin,

      async (
        req,
        res,
        next
      ) => {

        try {

          const result =
            await pool.query(
              `
              UPDATE campaigns

              SET
                status='approved',
                approved_at=
                  COALESCE(
                    approved_at,
                    NOW()
                  )

              WHERE
                id=$1
                AND payment_status='paid'

              RETURNING *
              `,
              [
                req.params.id
              ]
            );


          if (
            !result.rowCount
          ) {

            return res
              .status(409)
              .json({

                success:
                  false,

                message:
                  'Campaign cannot be approved until payment is verified as paid'

              });

          }

           await pool.query(
  `
  INSERT INTO admin_audit_logs(
    action,
    target_type,
    target_id,
    metadata,
    ip_hash
  )

  VALUES(
    $1,
    $2,
    $3,
    $4,
    $5
  )
  `,
  [
    'campaign_approved',

    'campaign',

    String(req.params.id),

    {
      paymentStatus:
        result.rows[0].payment_status,

      paymentMethod:
        result.rows[0].payment_method,

      ownerId:
        result.rows[0].owner_id
    },

    hash(
      req.ip
    ).slice(
      0,
      32
    )
  ]
);
          res.json({

            success:
              true,

            item:
              result.rows[0]

          });


        } catch (
          error
        ) {

          next(
            error
          );

        }

      }

    );

    /* =========================================================
   ADMIN CAMPAIGN REJECT

   Paid campaigns are NOT deleted.
   Rejection only prevents the campaign from being published.
   Payment records and blockchain proof remain intact.
   ========================================================= */

app.post(
  '/admin/campaigns/:id/reject',

  authenticate,
  admin,

  async (req, res, next) => {
    try {
      const campaignId =
        safeInteger(
          req.params.id,
          0
        );

      if (campaignId <= 0) {
        return res
          .status(400)
          .json({
            success: false,
            message: 'Invalid campaign id'
          });
      }

      const result =
        await pool.query(
          `
          UPDATE campaigns

          SET
            status='rejected',
            approved_at=NULL

          WHERE
            id=$1
            AND status='pending'

          RETURNING *
          `,
          [
            campaignId
          ]
        );

      if (!result.rowCount) {
        return res
          .status(409)
          .json({
            success: false,
            message:
              'Campaign cannot be rejected in its current state'
          });
      }
       await pool.query(
  `
  INSERT INTO admin_audit_logs(
    action,
    target_type,
    target_id,
    metadata,
    ip_hash
  )

  VALUES(
    $1,
    $2,
    $3,
    $4,
    $5
  )
  `,
  [
    'campaign_rejected',

    'campaign',

    String(campaignId),

    {
      paymentStatus:
        result.rows[0].payment_status,

      paymentMethod:
        result.rows[0].payment_method,

      ownerId:
        result.rows[0].owner_id
    },

    hash(
      req.ip
    ).slice(
      0,
      32
    )
  ]
      );
      res.json({
        success: true,
        item: result.rows[0]
      });

    } catch (error) {
      next(error);
    }
  }
    );
    /* =========================================================
       ADMIN SECURITY CONFIG
       ========================================================= */

    app.get(

      '/admin/security/config',
      authenticate,
      admin,

      (
        req,
        res
      ) => {

        res.json({

          success:
            true,

          config: {

            devicePolicy:
              cfg.devicePolicy,

            maxAccountsPerDevice:
              cfg.maxAccountsDevice,

            maxAccountsPerIpDay:
              cfg.maxAccountsIpDay,

            blockWithdrawOnRisk:
              cfg.blockWithdrawOnRisk,

            promoteReceiverWallet:
              PROMOTE_RECEIVER_WALLET ||
              null,

            promoteGramPerCompletion:
              cfg.promoteGramPerSlot,

            gramPriceInMai:
              cfg.gramPriceInMai

          }

        });

      }

    );



    /* =========================================================
       MAI NETWORK — OFFICIAL MODULES V5
       Tasks/Missions integration companion
       Giveaway
       Broadcast
       Referral Control Center
       Launch Control
       ========================================================= */

    let maiV5SchemaReady = false;

    async function ensureMaiV5Schema() {
      if (maiV5SchemaReady) return;

      // Referral epoch marker used by the one-time official launch reset.
      // NULL is valid for legacy/pre-launch relationships.
      await pool.query(`
        ALTER TABLE users
          ADD COLUMN IF NOT EXISTS referral_assigned_at TIMESTAMPTZ
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_referral_reward_events(
          id BIGSERIAL PRIMARY KEY,
          inviter_id TEXT NOT NULL,
          referred_user_id TEXT,
          reward_type TEXT NOT NULL,
          amount NUMERIC(30,8) NOT NULL DEFAULT 0,
          source_reference TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'available',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          claimed_at TIMESTAMPTZ,
          claim_reference TEXT
        )
      `);

      await pool.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS
          mai_referral_reward_events_unique_source
        ON mai_referral_reward_events(
          inviter_id,
          reward_type,
          source_reference
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_giveaways(
          id BIGSERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          image_url TEXT,
          giveaway_type TEXT NOT NULL,
          config JSONB NOT NULL DEFAULT '{}'::jsonb,
          show_on_home BOOLEAN NOT NULL DEFAULT FALSE,
          featured BOOLEAN NOT NULL DEFAULT FALSE,
          allow_multiple_entries BOOLEAN NOT NULL DEFAULT FALSE,
          status TEXT NOT NULL DEFAULT 'draft',
          starts_at TIMESTAMPTZ,
          ends_at TIMESTAMPTZ,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          admin_deleted_at TIMESTAMPTZ,
          admin_deleted_by TEXT
        )
      `);

      await pool.query(`ALTER TABLE mai_giveaways ADD COLUMN IF NOT EXISTS admin_deleted_at TIMESTAMPTZ`);
      await pool.query(`ALTER TABLE mai_giveaways ADD COLUMN IF NOT EXISTS admin_deleted_by TEXT`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_giveaway_entries(
          id BIGSERIAL PRIMARY KEY,
          giveaway_id BIGINT NOT NULL REFERENCES mai_giveaways(id) ON DELETE CASCADE,
          telegram_id TEXT NOT NULL,
          entry_key TEXT NOT NULL DEFAULT 'primary',
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(giveaway_id, telegram_id, entry_key)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_giveaway_entry_requests(
          id BIGSERIAL PRIMARY KEY,
          giveaway_id BIGINT NOT NULL REFERENCES mai_giveaways(id) ON DELETE CASCADE,
          telegram_id TEXT NOT NULL,
          request_key TEXT NOT NULL DEFAULT 'primary',
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
          reviewed_by TEXT,
          reviewed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(giveaway_id, telegram_id, request_key)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_giveaway_winners(
          id BIGSERIAL PRIMARY KEY,
          giveaway_id BIGINT NOT NULL REFERENCES mai_giveaways(id) ON DELETE CASCADE,
          telegram_id TEXT NOT NULL,
          prize NUMERIC(30,8) NOT NULL DEFAULT 0,
          selection_method TEXT NOT NULL,
          payment_status TEXT NOT NULL DEFAULT 'pending',
          paid_at TIMESTAMPTZ,
          paid_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(giveaway_id, telegram_id)
        )
      `);

      await pool.query(`ALTER TABLE mai_giveaway_winners ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ`);
      await pool.query(`ALTER TABLE mai_giveaway_winners ADD COLUMN IF NOT EXISTS paid_by TEXT`);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_broadcasts(
          id BIGSERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          image_url TEXT,
          destination TEXT NOT NULL DEFAULT 'mini_app',
          audience_type TEXT NOT NULL DEFAULT 'all',
          audience_config JSONB NOT NULL DEFAULT '{}'::jsonb,
          cta JSONB NOT NULL DEFAULT '{}'::jsonb,
          priority TEXT NOT NULL DEFAULT 'normal',
          status TEXT NOT NULL DEFAULT 'draft',
          scheduled_at TIMESTAMPTZ,
          sent_at TIMESTAMPTZ,
          targeted_count INTEGER NOT NULL DEFAULT 0,
          delivered_count INTEGER NOT NULL DEFAULT 0,
          failed_count INTEGER NOT NULL DEFAULT 0,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        ALTER TABLE mai_broadcasts
          ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

        ALTER TABLE mai_broadcasts
          ADD COLUMN IF NOT EXISTS archived_by TEXT;
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_broadcast_receipts(
          broadcast_id BIGINT NOT NULL REFERENCES mai_broadcasts(id) ON DELETE CASCADE,
          telegram_id TEXT NOT NULL,
          viewed_at TIMESTAMPTZ,
          clicked_at TIMESTAMPTZ,
          PRIMARY KEY(broadcast_id, telegram_id)
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_system_state(
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_account_corrections(
          id BIGSERIAL PRIMARY KEY,
          telegram_id BIGINT NOT NULL,
          action TEXT NOT NULL CHECK (action IN ('reset_balance','compensation')),
          before_balance NUMERIC(30,8) NOT NULL DEFAULT 0,
          change_amount NUMERIC(30,8) NOT NULL DEFAULT 0,
          after_balance NUMERIC(30,8) NOT NULL DEFAULT 0,
          reason TEXT NOT NULL,
          reference TEXT NOT NULL UNIQUE,
          created_by TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_mai_account_corrections_user_created
        ON mai_account_corrections(telegram_id, created_at DESC)
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_launch_snapshots(
          id BIGSERIAL PRIMARY KEY,
          snapshot_key TEXT NOT NULL UNIQUE,
          created_by TEXT,
          summary JSONB NOT NULL,
          users_snapshot JSONB NOT NULL,
          referrals_snapshot JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      /*
       * Production-safe launch archives.
       *
       * Do not pack the entire user base into one JSONB value. These
       * normalized tables let PostgreSQL archive rows with INSERT ... SELECT
       * inside the launch transaction, avoiding a large Node.js memory spike
       * and preserving exact pre-launch accounting records.
       *
       * The two legacy JSONB columns above remain for backward compatibility
       * and contain only small storage metadata for new snapshots.
       */
      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_launch_snapshot_users(
          snapshot_key TEXT NOT NULL REFERENCES mai_launch_snapshots(snapshot_key) ON DELETE CASCADE,
          telegram_id BIGINT NOT NULL,
          balance NUMERIC(30,8) NOT NULL DEFAULT 0,
          locked_balance NUMERIC(30,8) NOT NULL DEFAULT 0,
          referred_by BIGINT,
          referral_assigned_at TIMESTAMPTZ,
          referral_qualified BOOLEAN NOT NULL DEFAULT FALSE,
          wallet_address TEXT,
          account_status TEXT,
          suspended_until TIMESTAMPTZ,
          admin_note TEXT,
          PRIMARY KEY(snapshot_key, telegram_id)
        )
      `);

      await pool.query(`
        ALTER TABLE mai_launch_snapshot_users
          ADD COLUMN IF NOT EXISTS referral_assigned_at TIMESTAMPTZ
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS mai_launch_snapshot_referral_events(
          snapshot_key TEXT NOT NULL REFERENCES mai_launch_snapshots(snapshot_key) ON DELETE CASCADE,
          event_id BIGINT NOT NULL,
          inviter_id TEXT NOT NULL,
          referred_user_id TEXT,
          reward_type TEXT NOT NULL,
          amount NUMERIC(30,8) NOT NULL,
          source_reference TEXT NOT NULL,
          status TEXT NOT NULL,
          claim_reference TEXT,
          claimed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ,
          PRIMARY KEY(snapshot_key, event_id)
        )
      `);

      maiV5SchemaReady = true;
    }

    function adminActor(req) {
      return String(
        req.admin?.telegramId ||
        req.auth?.id ||
        'server-admin'
      );
    }

    async function getOfficialLaunchState() {
      await ensureMaiV5Schema();

      const row = (
        await pool.query(
          `SELECT value FROM mai_system_state WHERE key='official_launch'`
        )
      ).rows[0];

      return row?.value || {
        launched: false,
        officialLaunchAt: null
      };
    }

    async function referralRewardSummary(telegramId, client = pool) {
      await ensureMaiV5Schema();

      const rows = (
        await client.query(
          `
          SELECT
            reward_type,
            COALESCE(SUM(amount),0)::numeric AS amount
          FROM mai_referral_reward_events
          WHERE inviter_id=$1
            AND status='available'
          GROUP BY reward_type
          `,
          [String(telegramId)]
        )
      ).rows;

      const map = Object.fromEntries(
        rows.map(row => [
          row.reward_type,
          safeNumber(row.amount)
        ])
      );

      return {
        successfulInviteRewards:
          safeNumber(map.successful_invite),
        referralFarmingRewards:
          safeNumber(map.farming_5_percent)
      };
    }

    /* -------------------------
       REFERRAL FARMING 5%
       ------------------------- */

    async function accrueReferralFarmReward(
      client,
      farmerId,
      claimReference,
      claimAmount
    ) {
      const farmer = (
        await client.query(
          `
          SELECT referred_by, referral_qualified
          FROM users
          WHERE telegram_id=$1
          `,
          [String(farmerId)]
        )
      ).rows[0];

      if (
        !farmer?.referred_by ||
        !farmer.referral_qualified
      ) {
        return;
      }

      const amount =
        Number(
          (
            safeNumber(claimAmount) *
            0.05
          ).toFixed(8)
        );

      if (amount <= 0) return;

      await client.query(
        `
        INSERT INTO mai_referral_reward_events(
          inviter_id,
          referred_user_id,
          reward_type,
          amount,
          source_reference,
          status
        )
        VALUES($1,$2,'farming_5_percent',$3,$4,'available')
        ON CONFLICT(
          inviter_id,
          reward_type,
          source_reference
        )
        DO NOTHING
        `,
        [
          String(farmer.referred_by),
          String(farmerId),
          amount,
          String(claimReference)
        ]
      );
    }

    /*
     * Farm claims already write one authoritative 'farm_claim'
     * transaction. This reconciler converts any not-yet-accounted
     * successful-referral farm claims into the separate 5% bucket.
     * The unique source constraint makes it idempotent.
     */
    async function reconcileReferralFarmRewardsFor(
      telegramId
    ) {
      await ensureMaiV5Schema();

      const referrals = (
        await pool.query(
          `
          SELECT telegram_id
          FROM users
          WHERE referred_by=$1
            AND referral_qualified=TRUE
          `,
          [String(telegramId)]
        )
      ).rows;

      for (const referral of referrals) {
        const claims = (
          await pool.query(
            `
            SELECT
              telegram_id,
              amount,
              COALESCE(
                NULLIF(reference,''),
                'tx:' || id::text
              ) AS source_reference
            FROM transactions
            WHERE telegram_id=$1
              AND type='farm_claim'
            ORDER BY created_at ASC
            LIMIT 5000
            `,
            [String(referral.telegram_id)]
          )
        ).rows;

        const client = await pool.connect();

        try {
          await client.query('BEGIN');

          for (const claim of claims) {
            await accrueReferralFarmReward(
              client,
              claim.telegram_id,
              claim.source_reference,
              claim.amount
            );
          }

          await client.query('COMMIT');
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          throw error;
        } finally {
          client.release();
        }
      }
    }

    app.get(
      '/api/referrals/v2',
      authenticate,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();
          await reconcileReferralFarmRewardsFor(req.auth.id);
          const launchState = await getOfficialLaunchState();
          const officialLaunchAt =
            launchState?.launched && launchState?.officialLaunchAt
              ? new Date(launchState.officialLaunchAt)
              : null;

          const rows = (
            await pool.query(
              `
              SELECT
                u.telegram_id,
                u.first_name,
                u.username,
                u.photo_url,
                u.referral_qualified,
                u.created_at,
                (
                  SELECT COUNT(DISTINCT d.task_key)::int
                  FROM daily_task_completions d
                  WHERE d.telegram_id=u.telegram_id
                    AND d.task_key=ANY(ARRAY['news','payout','chat']::text[])
                    AND ($2::timestamptz IS NULL OR d.created_at >= $2)
                ) = 3 AS required_activity_done,
                (
                  SELECT COUNT(*)::int
                  FROM users child
                  WHERE child.referred_by=u.telegram_id
                    AND ($2::timestamptz IS NULL OR child.referral_assigned_at >= $2)
                ) AS invited_users
              FROM users u
              WHERE u.referred_by=$1
                AND ($2::timestamptz IS NULL OR u.referral_assigned_at >= $2)
              ORDER BY u.created_at DESC
              LIMIT 250
              `,
              [String(req.auth.id), officialLaunchAt]
            )
          ).rows;

          const rewards =
            await referralRewardSummary(
              req.auth.id
            );

          const successful =
            rows.filter(
              row => row.referral_qualified
            ).length;

          const items =
            rows.map(row => ({
              ...row,
              status:
                row.referral_qualified
                  ? 'successful'
                  : 'pending',
              requirements: {
                requiredTasks:
                  Boolean(row.required_activity_done),
                inviteOneUser:
                  Number(row.invited_users || 0) >= 1
              }
            }));

          res.json({
            success: true,
            link: referralLink(req.auth.id),
            total: rows.length,
            successful,
            pending: rows.length - successful,
            rewards,
            items
          });
        } catch (error) {
          next(error);
        }
      }
    );

    app.post(
      '/api/referrals/rewards/:type/claim',
      authenticate,
      rateLimit(10,60000),
      async (req,res,next) => {
        const type =
          req.params.type === 'successful'
            ? 'successful_invite'
            : req.params.type === 'farming'
              ? 'farming_5_percent'
              : null;

        if (!type) {
          return res.status(404).json({
            success:false,
            message:'Unknown referral reward type'
          });
        }

        const client = await pool.connect();

        try {
          await ensureMaiV5Schema();
          await client.query('BEGIN');

          await client.query(
            `
            SELECT telegram_id
            FROM users
            WHERE telegram_id=$1
            FOR UPDATE
            `,
            [String(req.auth.id)]
          );

          const events = (
            await client.query(
              `
              SELECT id, amount
              FROM mai_referral_reward_events
              WHERE inviter_id=$1
                AND reward_type=$2
                AND status='available'
              FOR UPDATE
              `,
              [String(req.auth.id),type]
            )
          ).rows;

          const total =
            Number(
              events
                .reduce(
                  (sum,row) =>
                    sum + safeNumber(row.amount),
                  0
                )
                .toFixed(8)
            );

          if (total <= 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              success:false,
              message:'No referral rewards are available'
            });
          }

          const claimReference =
            `refclaim:${type}:${crypto.randomUUID()}`;

          await client.query(
            `
            UPDATE users
            SET
              balance=balance+$2,
              updated_at=NOW()
            WHERE telegram_id=$1
            `,
            [String(req.auth.id),total]
          );

          await client.query(
            `
            UPDATE mai_referral_reward_events
            SET
              status='claimed',
              claimed_at=NOW(),
              claim_reference=$3
            WHERE inviter_id=$1
              AND reward_type=$2
              AND status='available'
            `,
            [
              String(req.auth.id),
              type,
              claimReference
            ]
          );

          await client.query(
            `
            INSERT INTO transactions(
              telegram_id,
              type,
              amount,
              reference,
              metadata
            )
            VALUES($1,$2,$3,$4,$5)
            `,
            [
              String(req.auth.id),
              type === 'successful_invite'
                ? 'successful_invite_claim'
                : 'referral_farming_claim',
              total,
              claimReference,
              JSON.stringify({
                rewardType:type,
                eventCount:events.length
              })
            ]
          );

          await client.query('COMMIT');

          res.json({
            success:true,
            claimed:total,
            rewards:
              await referralRewardSummary(
                req.auth.id
              ),
            user:
              await buildUser(req.auth.id)
          });
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          next(error);
        } finally {
          client.release();
        }
      }
    );

    /* -------------------------
       GIVEAWAY — USER
       ------------------------- */

    function normalizeGiveawayAnswer(value) {
      return String(value ?? '').trim().toLowerCase();
    }

    function hashGiveawayAnswer(value) {
      return crypto
        .createHash('sha256')
        .update(normalizeGiveawayAnswer(value))
        .digest('hex');
    }

    function publicGiveawayConfig(giveaway) {
      const config = { ...(giveaway.config || {}) };
      delete config.correctOption;
      delete config.customAnswer;
      delete config.customAnswerHash;
      return config;
    }

    async function giveawayLeaderboardPosition(giveaway, telegramId, db = pool) {
      const config = giveaway.config || {};
      const metric = String(config.leaderboardMetric || 'balance');
      let query;

      if (metric === 'referrals') {
        query = `
          WITH scores AS (
            SELECT u.telegram_id,
                   COUNT(r.telegram_id)::numeric AS score
            FROM users u
            LEFT JOIN users r
              ON r.referred_by=u.telegram_id
             AND r.referral_qualified=TRUE
            WHERE u.account_status='active'
            GROUP BY u.telegram_id
          ), ranked AS (
            SELECT telegram_id, score,
                   ROW_NUMBER() OVER (ORDER BY score DESC, telegram_id ASC) AS rank
            FROM scores
          )
          SELECT score, rank::int FROM ranked WHERE telegram_id=$1
        `;
      } else if (metric === 'tasks') {
        query = `
          WITH scores AS (
            SELECT u.telegram_id,
                   COUNT(c.id)::numeric AS score
            FROM users u
            LEFT JOIN managed_task_completions c
              ON c.telegram_id=u.telegram_id
             AND c.claimed_at IS NOT NULL
            WHERE u.account_status='active'
            GROUP BY u.telegram_id
          ), ranked AS (
            SELECT telegram_id, score,
                   ROW_NUMBER() OVER (ORDER BY score DESC, telegram_id ASC) AS rank
            FROM scores
          )
          SELECT score, rank::int FROM ranked WHERE telegram_id=$1
        `;
      } else {
        query = `
          WITH ranked AS (
            SELECT telegram_id, balance::numeric AS score,
                   ROW_NUMBER() OVER (ORDER BY balance DESC, telegram_id ASC) AS rank
            FROM users
            WHERE account_status='active'
          )
          SELECT score, rank::int FROM ranked WHERE telegram_id=$1
        `;
      }

      return (await db.query(query,[String(telegramId)])).rows[0] || null;
    }

    async function giveawayEligibility(
      giveaway,
      telegramId,
      submission = {}
    ) {
      const type = String(giveaway.giveaway_type || '').toLowerCase();
      const config = giveaway.config || {};

      if (type === 'holding') {
        const user = (await pool.query(
          `SELECT * FROM users WHERE telegram_id=$1`,
          [String(telegramId)]
        )).rows[0];
        if (!user) return {eligible:false,reason:'User not found'};
        const holding = await getUserHoldingSnapshot(user,pool,{forceWallet:true});
        const minimum = safeNumber(config.minimumMai);
        return {eligible:holding.total>=minimum,reason:holding.total>=minimum?null:`Minimum ${minimum} MAI holding required`};
      }

      if (type === 'referral') {
        const count=(await pool.query(`SELECT COUNT(*)::int AS c FROM users WHERE referred_by=$1 AND referral_qualified=TRUE`,[String(telegramId)])).rows[0]?.c||0;
        const required=Math.max(1,Number(config.successfulInvites||1));
        return {eligible:Number(count)>=required,reason:Number(count)>=required?null:`${required} successful invites required`,metadata:{qualifiedReferrals:Number(count)},evidenceKey:`referral:${Number(count)}`};
      }

      if (type === 'task') {
        const requiredKeys=Array.isArray(config.taskKeys)?config.taskKeys:[];
        if (!requiredKeys.length) return {eligible:false,reason:'This giveaway has no required tasks configured'};
        const count=(await pool.query(`SELECT COUNT(DISTINCT task_key)::int AS c FROM daily_task_completions WHERE telegram_id=$1 AND task_key=ANY($2::text[])`,[String(telegramId),requiredKeys])).rows[0]?.c||0;
        return {eligible:Number(count)>=requiredKeys.length,reason:Number(count)>=requiredKeys.length?null:'Complete the required tasks first'};
      }

      if (type === 'social') {
        const ids=Array.isArray(config.socialTaskIds)?config.socialTaskIds.map(Number).filter(Number.isFinite):[];
        if (!ids.length) return {eligible:false,reason:'This social giveaway has no verified social tasks configured'};
        const count=(await pool.query(`SELECT COUNT(DISTINCT task_id)::int AS c FROM managed_task_completions WHERE telegram_id=$1 AND task_id=ANY($2::bigint[]) AND verified_at IS NOT NULL`,[String(telegramId),ids])).rows[0]?.c||0;
        return {eligible:Number(count)>=ids.length,reason:Number(count)>=ids.length?null:'Complete the required verified social actions first'};
      }

      if (type === 'quiz') {
        const answer=Number(submission.answerIndex);
        const correct=Number(config.correctOption);
        const ok=Number.isInteger(answer)&&Number.isInteger(correct)&&answer===correct;
        return {eligible:ok,reason:ok?null:'Quiz answer is incorrect'};
      }

      if (type === 'purchase') {
        const currency=String(config.purchaseCurrency||'MAI').toUpperCase()==='GRAM'?'GRAM':'MAI';
        const minimum=Math.max(0,safeNumber(config.minimumPurchase));
        const total=safeNumber((await pool.query(`SELECT COALESCE(SUM(payment_amount),0) AS total FROM campaigns WHERE owner_id=$1 AND payment_status='paid' AND payment_method=$2`,[String(telegramId),currency])).rows[0]?.total);
        return {eligible:total>=minimum,reason:total>=minimum?null:`At least ${minimum} ${currency} verified promotion purchase is required`,metadata:{verifiedPurchaseTotal:total,currency},evidenceKey:`purchase:${currency}:${total}`};
      }

      if (type === 'leaderboard') {
        const topN=Math.max(1,Math.min(100000,Number(config.leaderboardTop||100)));
        const row=await giveawayLeaderboardPosition(giveaway,telegramId,pool);
        const ok=!!row&&Number(row.rank)<=topN;
        return {eligible:ok,reason:ok?null:`Reach the Top ${topN} leaderboard first`,metadata:row?{rank:Number(row.rank),score:safeNumber(row.score)}:{}};
      }

      if (type === 'custom') {
        const expected=String(config.customAnswerHash||'');
        const supplied=hashGiveawayAnswer(submission.customAnswer||'');
        const ok=expected.length===64 && supplied===expected;
        return {eligible:ok,reason:ok?null:'Custom verification answer/code is incorrect'};
      }

      if (type === 'lucky_draw') return {eligible:true,reason:null};
      return {eligible:false,reason:'Unsupported giveaway type'};
    }

    app.get(
      '/api/giveaways',
      authenticate,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const rows = (
            await pool.query(
              `
              SELECT *
              FROM mai_giveaways
              WHERE status='live'
                AND admin_deleted_at IS NULL
                AND (starts_at IS NULL OR starts_at<=NOW())
                AND (ends_at IS NULL OR ends_at>NOW())
              ORDER BY featured DESC, created_at DESC
              `
            )
          ).rows;

          const entries = (
            await pool.query(
              `
              SELECT giveaway_id
              FROM mai_giveaway_entries
              WHERE telegram_id=$1
              `,
              [String(req.auth.id)]
            )
          ).rows;

          const joined =
            new Set(
              entries.map(
                row => String(row.giveaway_id)
              )
            );

          res.json({
            success:true,
            featured: (() => {
              const row = rows.find(item => item.featured) || rows[0] || null;
              return row
                ? {
                    ...row,
                    config: publicGiveawayConfig(row),
                    joined: joined.has(String(row.id))
                  }
                : null;
            })(),
            showHomeGift:
              rows.some(row => row.show_on_home),
            items:
              rows.map(row => ({
                ...row,
                config: publicGiveawayConfig(row),
                joined:
                  joined.has(String(row.id))
              }))
          });
        } catch (error) {
          next(error);
        }
      }
    );

    app.post(
      '/api/giveaways/:id/join',
      authenticate,
      rateLimit(20,60000),
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const giveaway = (
            await pool.query(
              `
              SELECT *
              FROM mai_giveaways
              WHERE id=$1
                AND status='live'
                AND admin_deleted_at IS NULL
                AND (starts_at IS NULL OR starts_at<=NOW())
                AND (ends_at IS NULL OR ends_at>NOW())
              `,
              [req.params.id]
            )
          ).rows[0];

          if (!giveaway) {
            return res.status(404).json({
              success:false,
              message:'Giveaway is not active'
            });
          }

          const eligibility =
            await giveawayEligibility(
              giveaway,
              req.auth.id,
              req.body || {}
            );

          if (!eligibility.eligible) {
            return res.status(409).json({
              success:false,
              message:eligibility.reason
            });
          }

          const entryKey =
            giveaway.allow_multiple_entries && eligibility.evidenceKey
              ? String(eligibility.evidenceKey).slice(0,160)
              : 'primary';

          const entryInsert = await pool.query(
            `
            INSERT INTO mai_giveaway_entries(
              giveaway_id,
              telegram_id,
              entry_key,
              metadata
            )
            VALUES($1,$2,$3,$4)
            ON CONFLICT DO NOTHING
            RETURNING id
            `,
            [
              giveaway.id,
              String(req.auth.id),
              entryKey,
              JSON.stringify(eligibility.metadata || {})
            ]
          );

          res.json({
            success:true,
            joined:true,
            newEntry: entryInsert.rowCount > 0,
            message: entryInsert.rowCount > 0
              ? 'Giveaway entry confirmed'
              : 'This qualifying evidence already has an entry'
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /* -------------------------
       GIVEAWAY — ADMIN
       ------------------------- */

    app.get(
      '/admin/giveaways',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const rows = (
            await pool.query(
              `
              SELECT
                g.*,
                (
                  SELECT COUNT(*)::int
                  FROM mai_giveaway_entries e
                  WHERE e.giveaway_id=g.id
                ) AS entries
              FROM mai_giveaways g
              WHERE g.admin_deleted_at IS NULL
              ORDER BY g.created_at DESC
              `
            )
          ).rows;

          res.json({
            success:true,
            items:rows
          });
        } catch (error) {
          next(error);
        }
      }
    );

    app.post(
      '/admin/giveaways',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const body = req.body || {};
          const title =
            String(body.title || '').trim();
          const type =
            String(body.giveawayType || '').trim().toLowerCase();

          const allowed = new Set([
            'task',
            'referral',
            'lucky_draw',
            'leaderboard',
            'social',
            'quiz',
            'holding',
            'purchase',
            'custom'
          ]);

          if (!title || !allowed.has(type)) {
            return res.status(400).json({
              success:false,
              message:'Valid title and giveaway type are required'
            });
          }

          /*
           * Types without an authoritative verifier may be saved
           * as draft, but cannot be published live.
           */
          const verifierReady =
            ['task','referral','lucky_draw','leaderboard','social','quiz','holding','purchase','custom']
              .includes(type);

          let status =
            String(body.status || 'draft').toLowerCase();

          if (
            ['live','scheduled'].includes(status) &&
            !verifierReady
          ) {
            status='draft';
          }

          const startsAt = body.startsAt || null;
          const endsAt = body.endsAt || null;
          if (startsAt && Number.isNaN(Date.parse(startsAt))) {
            return res.status(400).json({success:false,message:'Invalid giveaway start date'});
          }
          if (endsAt && Number.isNaN(Date.parse(endsAt))) {
            return res.status(400).json({success:false,message:'Invalid giveaway end date'});
          }
          if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
            return res.status(400).json({success:false,message:'Giveaway end time must be after start time'});
          }

          const rawConfig = body.config && typeof body.config === 'object' ? body.config : {};
          const config = { ...rawConfig };
          if ('winnerCount' in config) config.winnerCount = Math.max(1, Math.min(100, Number(config.winnerCount) || 1));
          if ('prizePool' in config) config.prizePool = Math.max(0, safeNumber(config.prizePool));
          if ('prizePerWinner' in config) config.prizePerWinner = Math.max(0, safeNumber(config.prizePerWinner));
          if ('successfulInvites' in config) config.successfulInvites = Math.max(1, Number(config.successfulInvites) || 1);
          if ('minimumMai' in config) config.minimumMai = Math.max(0, safeNumber(config.minimumMai));
          if (type === 'task' && Array.isArray(config.taskKeys)) {
            config.taskKeys = [...new Set(config.taskKeys.map(x => String(x || '').trim()).filter(Boolean))].slice(0,100);
          }
          if (type === 'social') {
            config.socialTaskIds = [...new Set((Array.isArray(config.socialTaskIds) ? config.socialTaskIds : []).map(Number).filter(Number.isFinite))].slice(0,100);
            if (!config.socialTaskIds.length && ['live','scheduled'].includes(status)) return res.status(400).json({success:false,message:'Social giveaway requires at least one verified managed task'});
          }
          if (type === 'quiz') {
            config.quizQuestion = String(config.quizQuestion || '').trim().slice(0,500);
            config.quizOptions = (Array.isArray(config.quizOptions) ? config.quizOptions : []).map(x=>String(x||'').trim().slice(0,200)).filter(Boolean).slice(0,8);
            config.correctOption = Number(config.correctOption);
            if ((!config.quizQuestion || config.quizOptions.length < 2 || !Number.isInteger(config.correctOption) || config.correctOption < 0 || config.correctOption >= config.quizOptions.length) && ['live','scheduled'].includes(status)) return res.status(400).json({success:false,message:'Quiz requires a question, at least two choices, and a valid correct answer'});
          }
          if (type === 'purchase') {
            config.purchaseCurrency = String(config.purchaseCurrency || 'MAI').toUpperCase() === 'GRAM' ? 'GRAM' : 'MAI';
            config.minimumPurchase = Math.max(0, safeNumber(config.minimumPurchase));
          }
          if (type === 'leaderboard') {
            config.leaderboardMetric = ['balance','referrals','tasks'].includes(String(config.leaderboardMetric)) ? String(config.leaderboardMetric) : 'balance';
            config.leaderboardTop = Math.max(1, Math.min(100000, Number(config.leaderboardTop) || 100));
          }
          if (type === 'custom') {
            config.customPrompt = String(config.customPrompt || '').trim().slice(0,500);
            const answer = String(config.customAnswer || '').trim();
            if ((!config.customPrompt || !answer) && ['live','scheduled'].includes(status)) return res.status(400).json({success:false,message:'Custom giveaway requires a verification prompt and answer/code'});
            if (answer) config.customAnswerHash = hashGiveawayAnswer(answer);
            delete config.customAnswer;
          }
          if (['live','scheduled'].includes(status)) {
            if (type === 'task' && !(Array.isArray(config.taskKeys) && config.taskKeys.length)) return res.status(400).json({success:false,message:'Task giveaway requires at least one task key'});
            if (type === 'purchase' && !(safeNumber(config.minimumPurchase) > 0)) return res.status(400).json({success:false,message:'Purchase giveaway requires a minimum verified purchase greater than zero'});
            if (type === 'social') {
              const found = (await pool.query(`SELECT COUNT(*)::int AS c FROM managed_tasks WHERE id=ANY($1::bigint[])`,[config.socialTaskIds])).rows[0]?.c || 0;
              if (Number(found) !== config.socialTaskIds.length) return res.status(400).json({success:false,message:'One or more Social Task IDs do not exist'});
            }
          }

          const row = (
            await pool.query(
              `
              INSERT INTO mai_giveaways(
                title,
                description,
                image_url,
                giveaway_type,
                config,
                show_on_home,
                featured,
                allow_multiple_entries,
                status,
                starts_at,
                ends_at,
                created_by
              )
              VALUES(
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12
              )
              RETURNING *
              `,
              [
                title,
                String(body.description || ''),
                body.imageUrl
                  ? String(body.imageUrl)
                  : null,
                type,
                JSON.stringify(config),
                Boolean(body.showOnHome),
                Boolean(body.featured),
                Boolean(body.allowMultipleEntries),
                status,
                startsAt,
                endsAt,
                adminActor(req)
              ]
            )
          ).rows[0];

          await logSecurity(
            req,
            'admin_giveaway_created',
            'info',
            {
              giveawayId:row.id,
              type,
              status
            }
          );

          res.json({
            success:true,
            item:row,
            verifierReady
          });
        } catch (error) {
          next(error);
        }
      }
    );

    app.post(
      '/admin/giveaways/:id/status',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const requested =
            String(req.body?.status || '')
              .toLowerCase();

          if (
            !['draft','scheduled','live','paused','ended','completed']
              .includes(requested)
          ) {
            return res.status(400).json({
              success:false,
              message:'Invalid giveaway status'
            });
          }

          const current = (
            await pool.query(
              `SELECT * FROM mai_giveaways WHERE id=$1`,
              [req.params.id]
            )
          ).rows[0];

          if (!current) {
            return res.status(404).json({
              success:false,
              message:'Giveaway not found'
            });
          }

          const verifierReady =
            ['task','referral','lucky_draw','leaderboard','social','quiz','holding','purchase','custom']
              .includes(current.giveaway_type);

          if (
            ['live','scheduled'].includes(requested) &&
            !verifierReady
          ) {
            return res.status(409).json({success:false,message:'This giveaway type has no authoritative verifier yet'});
          }

          if (['live','scheduled'].includes(requested)) {
            const cfg = current.config || {};
            if (current.giveaway_type === 'task' && !(Array.isArray(cfg.taskKeys) && cfg.taskKeys.length)) return res.status(409).json({success:false,message:'Task giveaway requires task keys'});
            if (current.giveaway_type === 'social') {
              const socialIds=[...new Set((Array.isArray(cfg.socialTaskIds)?cfg.socialTaskIds:[]).map(Number).filter(Number.isFinite))];
              if (!socialIds.length) return res.status(409).json({success:false,message:'Social giveaway requires verified managed tasks'});
              const found=(await pool.query(`SELECT COUNT(*)::int AS c FROM managed_tasks WHERE id=ANY($1::bigint[])`,[socialIds])).rows[0]?.c||0;
              if (Number(found)!==socialIds.length) return res.status(409).json({success:false,message:'One or more Social Task IDs no longer exist'});
            }
            if (current.giveaway_type === 'quiz') {
              const optionCount=Array.isArray(cfg.quizOptions)?cfg.quizOptions.length:0;
              const correct=Number(cfg.correctOption);
              if (!cfg.quizQuestion || optionCount<2 || !Number.isInteger(correct) || correct<0 || correct>=optionCount) return res.status(409).json({success:false,message:'Quiz configuration is incomplete'});
            }
            if (current.giveaway_type === 'purchase' && !(safeNumber(cfg.minimumPurchase)>0)) return res.status(409).json({success:false,message:'Purchase giveaway requires a minimum verified promotion purchase greater than zero'});
            if (current.giveaway_type === 'custom' && (!cfg.customPrompt || !cfg.customAnswerHash)) return res.status(409).json({success:false,message:'Custom verification configuration is incomplete'});
          }

          const row = (
            await pool.query(
              `
              UPDATE mai_giveaways
              SET
                status=$2,
                updated_at=NOW()
              WHERE id=$1
              RETURNING *
              `,
              [req.params.id,requested]
            )
          ).rows[0];

          res.json({
            success:true,
            item:row
          });
        } catch (error) {
          next(error);
        }
      }
    );

    app.post(
      '/admin/giveaways/:id/draw',
      authenticate,
      admin,
      async (req,res,next) => {
        const client = await pool.connect();

        try {
          await ensureMaiV5Schema();
          await client.query('BEGIN');

          const giveaway = (
            await client.query(
              `
              SELECT *
              FROM mai_giveaways
              WHERE id=$1
              FOR UPDATE
              `,
              [req.params.id]
            )
          ).rows[0];

          if (!giveaway) {
            await client.query('ROLLBACK');
            return res.status(404).json({
              success:false,
              message:'Giveaway not found'
            });
          }

          const winnerCount =
            Math.max(
              1,
              Math.min(
                Number(req.body?.winnerCount || 1),
                100
              )
            );

          const entries = (
            await client.query(
              `SELECT DISTINCT telegram_id FROM mai_giveaway_entries WHERE giveaway_id=$1 ORDER BY telegram_id`,
              [giveaway.id]
            )
          ).rows;

          if (!entries.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({success:false,message:'No eligible entries'});
          }

          let selected = [];
          let selectionMethod = 'crypto_random';

          if (giveaway.giveaway_type === 'leaderboard') {
            const ranked = [];
            for (const entry of entries) {
              const pos = await giveawayLeaderboardPosition(giveaway,entry.telegram_id,client);
              if (pos) ranked.push({...entry,rank:Number(pos.rank),score:safeNumber(pos.score)});
            }
            ranked.sort((a,b)=>a.rank-b.rank || String(a.telegram_id).localeCompare(String(b.telegram_id)));
            selected = ranked.slice(0,winnerCount);
            selectionMethod = 'leaderboard_rank';
          } else {
            const poolRows = [...entries];
            while (selected.length < winnerCount && poolRows.length) {
              const index = crypto.randomInt(0,poolRows.length);
              selected.push(poolRows.splice(index,1)[0]);
            }
          }

          const prize =
            safeNumber(
              giveaway.config?.prizePerWinner
            );

          for (const winner of selected) {
            await client.query(
              `
              INSERT INTO mai_giveaway_winners(
                giveaway_id,
                telegram_id,
                prize,
                selection_method
              )
              VALUES($1,$2,$3,$4)
              ON CONFLICT DO NOTHING
              `,
              [
                giveaway.id,
                winner.telegram_id,
                prize,
                selectionMethod
              ]
            );
          }

          await client.query(
            `
            UPDATE mai_giveaways
            SET
              status='completed',
              updated_at=NOW()
            WHERE id=$1
            `,
            [giveaway.id]
          );

          await client.query('COMMIT');

          res.json({
            success:true,
            winners:selected
          });
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          next(error);
        } finally {
          client.release();
        }
      }
    );

    /*
     * Award an in-app MAI giveaway prize exactly once.
     * This is intentionally separate from the W5 withdrawal/payout worker.
     */
    app.post(
      '/admin/giveaway-winners/:id/award',
      authenticate,
      admin,
      async (req,res,next) => {
        const client = await pool.connect();

        try {
          await ensureMaiV5Schema();
          await client.query('BEGIN');

          const winner = (
            await client.query(
              `
              SELECT w.*, g.title AS giveaway_title, g.admin_deleted_at
              FROM mai_giveaway_winners w
              JOIN mai_giveaways g ON g.id=w.giveaway_id
              WHERE w.id=$1
              FOR UPDATE OF w
              `,
              [req.params.id]
            )
          ).rows[0];

          if (!winner || winner.admin_deleted_at) {
            await client.query('ROLLBACK');
            return res.status(404).json({success:false,message:'Giveaway winner not found'});
          }

          if (String(winner.payment_status || '').toLowerCase() === 'paid') {
            await client.query('ROLLBACK');
            return res.status(409).json({success:false,message:'This giveaway prize has already been awarded'});
          }

          const prize = safeNumber(winner.prize);
          if (!(prize > 0)) {
            await client.query('ROLLBACK');
            return res.status(409).json({success:false,message:'Winner prize must be greater than zero'});
          }

          const credited = await client.query(
            `
            UPDATE users
            SET balance=balance+$2, updated_at=NOW()
            WHERE telegram_id::text=$1
            RETURNING telegram_id, balance
            `,
            [String(winner.telegram_id),prize]
          );

          if (!credited.rowCount) {
            await client.query('ROLLBACK');
            return res.status(404).json({success:false,message:'Winner user account not found'});
          }

          await client.query(
            `
            UPDATE mai_giveaway_winners
            SET payment_status='paid', paid_at=NOW(), paid_by=$2
            WHERE id=$1
            `,
            [req.params.id,String(req.admin?.telegramId || req.auth?.id || '')]
          );

          await client.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id,action,target_type,target_id,metadata,ip_hash
            )
            VALUES($1,'giveaway_prize_awarded','giveaway_winner',$2,$3,$4)
            `,
            [
              req.admin?.telegramId || null,
              String(req.params.id),
              {
                giveawayId:winner.giveaway_id,
                telegramId:String(winner.telegram_id),
                prize,
                giveawayTitle:winner.giveaway_title
              },
              hash(req.ip).slice(0,32)
            ]
          );

          await client.query('COMMIT');
          res.json({
            success:true,
            message:`${prize} MAI awarded`,
            winnerId:winner.id,
            telegramId:String(winner.telegram_id),
            prize,
            balance:safeNumber(credited.rows[0]?.balance)
          });
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          next(error);
        } finally {
          client.release();
        }
      }
    );

    /*
     * "Delete" completed giveaway history from Admin UI without destroying
     * entries, winner/payment evidence, or audit records.
     */
    app.delete(
      '/admin/giveaways/:id',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const current = (
            await pool.query(
              `SELECT id,title,status,admin_deleted_at FROM mai_giveaways WHERE id=$1`,
              [req.params.id]
            )
          ).rows[0];

          if (!current || current.admin_deleted_at) {
            return res.status(404).json({success:false,message:'Giveaway not found'});
          }

          if (!['ended','completed'].includes(String(current.status))) {
            return res.status(409).json({
              success:false,
              message:'Only ended or completed giveaway history can be deleted'
            });
          }

          await pool.query(
            `
            UPDATE mai_giveaways
            SET admin_deleted_at=NOW(), admin_deleted_by=$2, show_on_home=FALSE, featured=FALSE, updated_at=NOW()
            WHERE id=$1
            `,
            [req.params.id,String(req.admin?.telegramId || req.auth?.id || '')]
          );

          await pool.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id,action,target_type,target_id,metadata,ip_hash
            )
            VALUES($1,'giveaway_history_deleted','giveaway',$2,$3,$4)
            `,
            [
              req.admin?.telegramId || null,
              String(req.params.id),
              {title:current.title,status:current.status,softDelete:true},
              hash(req.ip).slice(0,32)
            ]
          );

          res.json({success:true,message:'Giveaway history removed from Admin Panel'});
        } catch (error) {
          next(error);
        }
      }
    );

    app.get(
      '/admin/giveaway-winners',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const rows = (
            await pool.query(
              `
              SELECT
                w.*,
                u.username,
                u.wallet_address,
                g.title AS giveaway_title
              FROM mai_giveaway_winners w
              JOIN mai_giveaways g
                ON g.id=w.giveaway_id
              LEFT JOIN users u
                ON u.telegram_id::text=w.telegram_id
              WHERE g.admin_deleted_at IS NULL
              ORDER BY w.created_at DESC
              LIMIT 1000
              `
            )
          ).rows;

          res.json({
            success:true,
            items:rows
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /* -------------------------
       BROADCAST
       ------------------------- */

    app.get(
      '/api/announcements',
      authenticate,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const rows = (
            await pool.query(
              `
              SELECT
                b.id,
                b.title,
                b.message,
                b.image_url,
                b.cta,
                b.priority,
                b.sent_at,
                r.viewed_at,
                r.clicked_at
              FROM mai_broadcasts b
              JOIN mai_broadcast_receipts r
                ON r.broadcast_id=b.id
               AND r.telegram_id=$1
              WHERE b.status='sent'
                AND b.destination IN('mini_app','both')
              ORDER BY b.sent_at DESC NULLS LAST
              LIMIT 30
              `,
              [String(req.auth.id)]
            )
          ).rows;

          res.json({
            success:true,
            items:rows
          });
        } catch (error) {
          next(error);
        }
      }
    );

    app.post(
      '/api/announcements/:id/view',
      authenticate,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          await pool.query(
            `
            INSERT INTO mai_broadcast_receipts(
              broadcast_id,
              telegram_id,
              viewed_at
            )
            VALUES($1,$2,NOW())
            ON CONFLICT(broadcast_id,telegram_id)
            DO UPDATE SET
              viewed_at=COALESCE(
                mai_broadcast_receipts.viewed_at,
                NOW()
              )
            `,
            [req.params.id,String(req.auth.id)]
          );

          res.json({success:true});
        } catch (error) {
          next(error);
        }
      }
    );

    const BROADCAST_AUDIENCE_TYPES = new Set([
      'all',
      'top_inviters',
      'top_wallet_holders',
      'specific'
    ]);

    const BROADCAST_DESTINATIONS = new Set([
      'mini_app',
      'telegram',
      'both'
    ]);

    const BROADCAST_PRIORITIES = new Set([
      'normal',
      'important',
      'critical'
    ]);

    function normalizeBroadcastLimit(value) {
      return clamp(safeInteger(value, 10), 1, 500);
    }

    function normalizeBroadcastIds(value) {
      const source = Array.isArray(value)
        ? value
        : String(value || '').split(/[\s,]+/);

      return [...new Set(
        source
          .map(item => String(item || '').trim())
          .filter(id => /^\d{5,20}$/.test(id))
      )].slice(0, 500);
    }

    function normalizeBroadcastCreateBody(body = {}) {
      const title = String(body.title || '').trim();
      const message = String(body.message || '').trim();
      const destination = String(body.destination || 'mini_app').trim();
      const audienceType = String(body.audienceType || 'all').trim();
      const priority = String(body.priority || 'normal').trim();
      const imageUrl = String(body.imageUrl || '').trim();
      const scheduledAtRaw = String(body.scheduledAt || '').trim();
      const config = body.audienceConfig && typeof body.audienceConfig === 'object'
        ? body.audienceConfig
        : {};

      if (!title || title.length > 120) {
        throw Object.assign(new Error('Broadcast title must be 1-120 characters'), {statusCode:400});
      }
      if (!message || message.length > 3500) {
        throw Object.assign(new Error('Broadcast message must be 1-3500 characters'), {statusCode:400});
      }
      if (!BROADCAST_DESTINATIONS.has(destination)) {
        throw Object.assign(new Error('Unsupported broadcast destination'), {statusCode:400});
      }
      if (!BROADCAST_AUDIENCE_TYPES.has(audienceType)) {
        throw Object.assign(new Error('Unsupported broadcast audience type'), {statusCode:400});
      }
      if (!BROADCAST_PRIORITIES.has(priority)) {
        throw Object.assign(new Error('Unsupported broadcast priority'), {statusCode:400});
      }
      if (imageUrl && (!/^https:\/\//i.test(imageUrl) || imageUrl.length > 1000)) {
        throw Object.assign(new Error('Image URL must be a valid HTTPS URL'), {statusCode:400});
      }

      let audienceConfig = {};
      if (audienceType === 'specific') {
        const telegramIds = normalizeBroadcastIds(config.telegramIds);
        if (!telegramIds.length) {
          throw Object.assign(new Error('At least one valid Telegram ID is required'), {statusCode:400});
        }
        audienceConfig = {telegramIds};
      } else if (audienceType === 'top_inviters' || audienceType === 'top_wallet_holders') {
        audienceConfig = {limit: normalizeBroadcastLimit(config.limit)};
      }

      let scheduledAt = null;
      if (scheduledAtRaw) {
        const parsed = new Date(scheduledAtRaw);
        if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now() + 30000) {
          throw Object.assign(new Error('Scheduled time must be a valid future time'), {statusCode:400});
        }
        scheduledAt = parsed.toISOString();
      }

      return {
        title,
        message,
        destination,
        audienceType,
        audienceConfig,
        priority,
        imageUrl: imageUrl || null,
        scheduledAt
      };
    }

    async function resolveTopWalletHolders(limit) {
      const users = (
        await pool.query(
          `SELECT telegram_id,wallet_address
           FROM users
           WHERE account_status='active'
             AND wallet_address IS NOT NULL
             AND BTRIM(wallet_address)<>''
           ORDER BY telegram_id ASC`
        )
      ).rows;

      const ranked = [];
      for (const user of users) {
        try {
          // Wallet-only MAI. Never use users.balance/in-game balance here.
          const walletBalance = await fetchMaiWalletBalance(user.wallet_address);
          if (walletBalance > 0) {
            ranked.push({
              telegram_id:user.telegram_id,
              wallet_balance:safeNumber(walletBalance)
            });
          }
        } catch (error) {
          console.warn('[MAI BROADCAST] wallet ranking read failed:', String(user.telegram_id), error.message);
        }
      }

      ranked.sort((a,b) =>
        b.wallet_balance - a.wallet_balance ||
        String(a.telegram_id).localeCompare(String(b.telegram_id))
      );

      return ranked.slice(0, normalizeBroadcastLimit(limit));
    }

    async function resolveBroadcastAudience(broadcast) {
      const type = String(broadcast.audience_type || 'all');
      const config = broadcast.audience_config || {};

      // SECURITY: unknown audience types fail closed. Never fall back to all users.
      if (!BROADCAST_AUDIENCE_TYPES.has(type)) {
        throw new Error(`Unsupported broadcast audience type: ${type}`);
      }

      if (type === 'specific') {
        const ids = normalizeBroadcastIds(config.telegramIds);
        if (!ids.length) return [];
        return (await pool.query(
          `SELECT telegram_id
           FROM users
           WHERE account_status='active'
             AND telegram_id::text=ANY($1::text[])`,
          [ids]
        )).rows;
      }

      if (type === 'top_inviters') {
        const limit = normalizeBroadcastLimit(config.limit);
        return (await pool.query(
          `SELECT u.telegram_id, COUNT(r.telegram_id)::int AS qualified_invites
           FROM users u
           JOIN users r
             ON r.referred_by=u.telegram_id
            AND r.referral_qualified=TRUE
           WHERE u.account_status='active'
           GROUP BY u.telegram_id
           ORDER BY qualified_invites DESC, u.telegram_id ASC
           LIMIT $1`,
          [limit]
        )).rows;
      }

      if (type === 'top_wallet_holders') {
        return resolveTopWalletHolders(config.limit);
      }

      return (await pool.query(
        `SELECT telegram_id
         FROM users
         WHERE account_status='active'
         ORDER BY telegram_id ASC`
      )).rows;
    }

    app.get(
      '/admin/broadcasts',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();
          const rows = (
            await pool.query(
              `SELECT *
               FROM mai_broadcasts
               WHERE archived_at IS NULL
               ORDER BY created_at DESC
               LIMIT 500`
            )
          ).rows;
          res.json({success:true,items:rows});
        } catch (error) { next(error); }
      }
    );

    app.post(
      '/admin/broadcasts/preview',
      authenticate,
      admin,
      rateLimit(12,60000),
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();
          const normalized = normalizeBroadcastCreateBody({
            title:req.body?.title || 'Preview',
            message:req.body?.message || 'Preview',
            destination:req.body?.destination || 'mini_app',
            audienceType:req.body?.audienceType,
            audienceConfig:req.body?.audienceConfig,
            priority:req.body?.priority || 'normal'
          });
          const audience = await resolveBroadcastAudience({
            audience_type:normalized.audienceType,
            audience_config:normalized.audienceConfig
          });
          res.json({
            success:true,
            count:audience.length,
            sample:audience.slice(0,10).map(item => ({
              telegramId:String(item.telegram_id),
              qualifiedInvites:item.qualified_invites ?? null,
              walletBalance:item.wallet_balance ?? null
            }))
          });
        } catch (error) {
          if (error.statusCode) return res.status(error.statusCode).json({success:false,message:error.message});
          next(error);
        }
      }
    );

    app.post(
      '/admin/broadcasts',
      authenticate,
      admin,
      rateLimit(20,60000),
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();
          const body = normalizeBroadcastCreateBody(req.body || {});
          const row = (
            await pool.query(
              `INSERT INTO mai_broadcasts(
                 title,message,image_url,destination,audience_type,audience_config,
                 cta,priority,status,scheduled_at,created_by
               )
               VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               RETURNING *`,
              [
                body.title,
                body.message,
                body.imageUrl,
                body.destination,
                body.audienceType,
                JSON.stringify(body.audienceConfig),
                JSON.stringify({}),
                body.priority,
                body.scheduledAt ? 'scheduled' : 'draft',
                body.scheduledAt,
                adminActor(req)
              ]
            )
          ).rows[0];
          res.json({success:true,item:row});
        } catch (error) {
          if (error.statusCode) return res.status(error.statusCode).json({success:false,message:error.message});
          next(error);
        }
      }
    );

    async function sendTelegramBroadcastMessage(targetTelegramId, broadcast) {
      let lastError = null;
      for (let attempt=1; attempt<=3; attempt++) {
        try {
          return await telegram('sendMessage', {
            chat_id:targetTelegramId,
            text:`${broadcast.title}\n\n${broadcast.message}`,
            disable_web_page_preview:true
          });
        } catch (error) {
          lastError = error;
          if (attempt < 3) await new Promise(resolve => setTimeout(resolve,350 * attempt));
        }
      }
      throw lastError || new Error('Telegram broadcast delivery failed');
    }

    async function deliverBroadcast(broadcast) {
      if (broadcast.archived_at) throw new Error('Archived broadcast cannot be delivered');
      const audience = await resolveBroadcastAudience(broadcast);
      if (!audience.length) throw new Error('Broadcast audience is empty');

      for (const target of audience) {
        await pool.query(
          `INSERT INTO mai_broadcast_receipts(broadcast_id,telegram_id)
           VALUES($1,$2)
           ON CONFLICT(broadcast_id,telegram_id) DO NOTHING`,
          [broadcast.id,String(target.telegram_id)]
        );
      }

      let delivered = 0;
      let failed = 0;
      if (['telegram','both'].includes(broadcast.destination)) {
        for (const target of audience) {
          try {
            await sendTelegramBroadcastMessage(target.telegram_id,broadcast);
            delivered += 1;
          } catch (error) {
            failed += 1;
            console.error('[MAI BROADCAST] Telegram delivery failed:', broadcast.id, target.telegram_id, error.message);
          }
          await new Promise(resolve => setTimeout(resolve,35));
        }
      } else {
        delivered = audience.length;
      }

      await pool.query(
        `UPDATE mai_broadcasts
         SET status='sent',sent_at=NOW(),targeted_count=$2,
             delivered_count=$3,failed_count=$4,updated_at=NOW()
         WHERE id=$1 AND archived_at IS NULL`,
        [broadcast.id,audience.length,delivered,failed]
      );
      return {targeted:audience.length,delivered,failed};
    }

    app.post(
      '/admin/broadcasts/:id/send',
      authenticate,
      admin,
      rateLimit(8,60000),
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();
          const confirmation = String(req.body?.confirmation || '');
          if (confirmation !== 'SEND MAI BROADCAST') {
            return res.status(409).json({success:false,message:'Type SEND MAI BROADCAST to confirm'});
          }

          const claimed = (await pool.query(
            `UPDATE mai_broadcasts
             SET status='sending',updated_at=NOW()
             WHERE id=$1
               AND archived_at IS NULL
               AND status IN('draft','scheduled','failed')
             RETURNING *`,
            [req.params.id]
          )).rows[0];

          if (!claimed) {
            const existing=(await pool.query(
              `SELECT status,archived_at FROM mai_broadcasts WHERE id=$1`,
              [req.params.id]
            )).rows[0];
            if (!existing) return res.status(404).json({success:false,message:'Broadcast not found'});
            return res.status(409).json({success:false,message:existing.archived_at?'Broadcast is archived':`Broadcast cannot be sent from status ${existing.status}`});
          }

          try {
            const result=await deliverBroadcast(claimed);
            res.json({success:true,...result});
          } catch (error) {
            await pool.query(
              `UPDATE mai_broadcasts SET status='failed',updated_at=NOW()
               WHERE id=$1 AND status='sending'`,
              [claimed.id]
            );
            throw error;
          }
        } catch (error) { next(error); }
      }
    );

    app.delete(
      '/admin/broadcasts/:id',
      authenticate,
      admin,
      rateLimit(20,60000),
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();
          const confirmation = String(req.body?.confirmation || '');
          if (confirmation !== 'DELETE BROADCAST HISTORY') {
            return res.status(409).json({success:false,message:'Type DELETE BROADCAST HISTORY to confirm'});
          }

          // Soft archive only: preserve receipts, delivery counts and audit evidence.
          const row=(await pool.query(
            `UPDATE mai_broadcasts
             SET archived_at=NOW(),archived_by=$2,updated_at=NOW()
             WHERE id=$1
               AND archived_at IS NULL
               AND status IN('sent','failed')
             RETURNING id,status`,
            [req.params.id,adminActor(req)]
          )).rows[0];

          if (!row) {
            return res.status(409).json({success:false,message:'Only completed or failed broadcast history can be deleted'});
          }
          res.json({success:true,id:String(row.id)});
        } catch (error) { next(error); }
      }
    );

    let broadcastSchedulerStarted = false;
    function startMaiBroadcastScheduler() {
      if (broadcastSchedulerStarted) return;
      broadcastSchedulerStarted = true;

      const tick = async () => {
        try {
          await ensureMaiV5Schema();
          const due=(await pool.query(
            `SELECT id FROM mai_broadcasts
             WHERE status='scheduled'
               AND archived_at IS NULL
               AND scheduled_at IS NOT NULL
               AND scheduled_at<=NOW()
             ORDER BY scheduled_at ASC LIMIT 10`
          )).rows;

          for (const row of due) {
            const claimed=(await pool.query(
              `UPDATE mai_broadcasts SET status='sending',updated_at=NOW()
               WHERE id=$1 AND status='scheduled' AND archived_at IS NULL
               RETURNING *`,
              [row.id]
            )).rows[0];
            if (!claimed) continue;
            try {
              await deliverBroadcast(claimed);
            } catch (error) {
              console.error('[MAI BROADCAST] scheduled send failed:', claimed.id, error.message);
              await pool.query(
                `UPDATE mai_broadcasts SET status='failed',updated_at=NOW()
                 WHERE id=$1 AND status='sending'`,
                [claimed.id]
              );
            }
          }
        } catch (error) {
          console.error('[MAI BROADCAST] scheduler tick failed:', error.message);
        }
      };

      setInterval(tick,60000).unref?.();
      setTimeout(tick,5000).unref?.();
    }

    /* -------------------------
       REFERRAL ADMIN
       ------------------------- */

    app.get(
      '/admin/referrals',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const overview = (
            await pool.query(
              `
              SELECT
                COUNT(*) FILTER(
                  WHERE referred_by IS NOT NULL
                )::int AS total_invited,
                COUNT(*) FILTER(
                  WHERE referred_by IS NOT NULL
                    AND referral_qualified=TRUE
                )::int AS successful,
                COUNT(*) FILTER(
                  WHERE referred_by IS NOT NULL
                    AND referral_qualified=FALSE
                )::int AS pending
              FROM users
              `
            )
          ).rows[0];

          const users = (
            await pool.query(
              `
              SELECT
                u.telegram_id,
                u.username,
                u.referred_by,
                u.referral_qualified,
                u.created_at,
                (
                  SELECT COUNT(*)::int
                  FROM users c
                  WHERE c.referred_by=u.telegram_id
                ) AS total_invites,
                (
                  SELECT COUNT(*)::int
                  FROM users c
                  WHERE c.referred_by=u.telegram_id
                    AND c.referral_qualified=TRUE
                ) AS successful_invites
              FROM users u
              WHERE u.referred_by IS NOT NULL
              ORDER BY u.created_at DESC
              LIMIT 1000
              `
            )
          ).rows;

          const rewardTotals = (
            await pool.query(
              `
              SELECT
                reward_type,
                status,
                COALESCE(SUM(amount),0) AS amount
              FROM mai_referral_reward_events
              GROUP BY reward_type,status
              `
            )
          ).rows;

          res.json({
            success:true,
            overview,
            users,
            rewardTotals
          });
        } catch (error) {
          next(error);
        }
      }
    );

    /* -------------------------
       LAUNCH CONTROL
       ------------------------- */

    const LAUNCH_TEST_RESET_LIMIT = 10;

    function normalizeAdminCorrectionKey(value) {
      const key = String(value || '').trim();
      return /^[A-Za-z0-9:_-]{16,120}$/.test(key) ? key : '';
    }

    async function getLaunchTestResetState(client = pool) {
      const row = (
        await client.query(
          `SELECT value FROM mai_system_state WHERE key='prelaunch_test_reset'`
        )
      ).rows[0];

      const value = row?.value || {};
      return {
        count: Math.max(0, safeInteger(value.count, 0)),
        limit: LAUNCH_TEST_RESET_LIMIT,
        lastResetAt: value.lastResetAt || null,
        lastSnapshotKey: value.lastSnapshotKey || null,
        lastExecutedBy: value.lastExecutedBy || null
      };
    }

    async function buildLaunchPreview(client = pool) {
      const summary = (
        await client.query(
          `
          SELECT
            COUNT(*)::int AS users,
            COALESCE(SUM(balance),0) AS game_balance,
            COUNT(*) FILTER(
              WHERE referred_by IS NOT NULL
            )::int AS referral_links,
            COUNT(*) FILTER(
              WHERE referral_qualified=TRUE
            )::int AS successful_referrals
          FROM users
          `
        )
      ).rows[0];

      const rewards = (
        await client.query(
          `
          SELECT COALESCE(SUM(amount),0) AS amount
          FROM mai_referral_reward_events
          WHERE status='available'
          `
        )
      ).rows[0];

      return {
        ...summary,
        unclaimedReferralRewards: safeNumber(rewards.amount),
        hardProtected: [
          'Telegram identity',
          'bound wallet',
          'security/risk history',
          'ban/suspension state',
          'audit logs',
          'withdrawal/payout history',
          'transaction hashes',
          'locked withdrawal balance',
          'blockchain balances/assets'
        ]
      };
    }

    async function archiveLaunchState(client, snapshotKey, actor, kind, sequence = null) {
      const userSummary = (
        await client.query(
          `
          SELECT
            COUNT(*)::int AS users,
            COALESCE(SUM(balance),0)::numeric AS game_balance
          FROM users
          `
        )
      ).rows[0];

      const referralSummary = (
        await client.query(
          `
          SELECT COUNT(*)::int AS referral_events
          FROM mai_referral_reward_events
          `
        )
      ).rows[0];

      const summary = {
        users: safeInteger(userSummary?.users, 0),
        gameBalance: safeNumber(userSummary?.game_balance),
        referralEvents: safeInteger(referralSummary?.referral_events, 0),
        storage: 'normalized_v1',
        kind,
        sequence
      };

      await client.query(
        `
        INSERT INTO mai_launch_snapshots(
          snapshot_key, created_by, summary, users_snapshot, referrals_snapshot
        )
        VALUES($1,$2,$3,$4,$5)
        `,
        [
          snapshotKey,
          actor,
          JSON.stringify(summary),
          JSON.stringify({storage:'mai_launch_snapshot_users'}),
          JSON.stringify({storage:'mai_launch_snapshot_referral_events'})
        ]
      );

      await client.query(
        `
        INSERT INTO mai_launch_snapshot_users(
          snapshot_key, telegram_id, balance, locked_balance, referred_by,
          referral_assigned_at, referral_qualified, wallet_address,
          account_status, suspended_until, admin_note
        )
        SELECT
          $1, telegram_id, balance, locked_balance, referred_by,
          referral_assigned_at, referral_qualified, wallet_address,
          account_status, suspended_until, admin_note
        FROM users
        `,
        [snapshotKey]
      );

      await client.query(
        `
        INSERT INTO mai_launch_snapshot_referral_events(
          snapshot_key, event_id, inviter_id, referred_user_id, reward_type,
          amount, source_reference, status, claim_reference, claimed_at, created_at
        )
        SELECT
          $1, id, inviter_id, referred_user_id, reward_type,
          amount, source_reference, status, claim_reference, claimed_at, created_at
        FROM mai_referral_reward_events
        `,
        [snapshotKey]
      );

      return summary;
    }

    async function resetPrelaunchGameState(client) {
      await client.query(
        `
        UPDATE users
        SET
          balance=0,
          referred_by=NULL,
          referral_assigned_at=NULL,
          referral_qualified=FALSE,
          updated_at=NOW()
        `
      );

      await client.query(
        `
        UPDATE mai_referral_reward_events
        SET status='archived_prelaunch'
        WHERE status='available'
        `
      );
    }

    app.get(
      '/admin/launch-control',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          const [state, testReset, preview, corrections] = await Promise.all([
            getOfficialLaunchState(),
            getLaunchTestResetState(),
            buildLaunchPreview(),
            pool.query(
              `
              SELECT
                id, telegram_id, action, before_balance, change_amount,
                after_balance, reason, reference, created_by, created_at
              FROM mai_account_corrections
              ORDER BY created_at DESC
              LIMIT 30
              `
            )
          ]);

          res.json({
            success:true,
            state,
            testReset,
            preview,
            corrections: corrections.rows
          });
        } catch (error) {
          next(error);
        }
      }
    );

    app.get(
      '/admin/launch-control/account/:telegramId',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();
          const telegramId = String(req.params.telegramId || '').trim();
          if (!/^\d+$/.test(telegramId)) {
            return res.status(400).json({success:false,message:'Invalid Telegram ID'});
          }

          const user = (
            await pool.query(
              `
              SELECT
                telegram_id, username, first_name, last_name,
                balance, locked_balance, wallet_address,
                account_status, suspended_until, referral_qualified,
                created_at
              FROM users
              WHERE telegram_id=$1
              LIMIT 1
              `,
              [telegramId]
            )
          ).rows[0];

          if (!user) {
            return res.status(404).json({success:false,message:'User not found'});
          }

          res.json({success:true,user});
        } catch (error) {
          next(error);
        }
      }
    );

    app.post(
      '/admin/launch-control/test-reset',
      authenticate,
      admin,
      async (req,res,next) => {
        const confirmation = String(req.body?.confirmation || '');
        if (confirmation !== 'TEST RESET MAI NETWORK') {
          return res.status(409).json({
            success:false,
            message:'Type TEST RESET MAI NETWORK exactly to confirm'
          });
        }

        const client = await pool.connect();
        try {
          await ensureMaiV5Schema();
          await client.query('BEGIN');

          const official = (
            await client.query(
              `SELECT value FROM mai_system_state WHERE key='official_launch' FOR UPDATE`
            )
          ).rows[0]?.value || {};

          if (official.launched) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              success:false,
              message:'Test Reset is permanently disabled after Official Launch'
            });
          }

          const currentRow = (
            await client.query(
              `SELECT value FROM mai_system_state WHERE key='prelaunch_test_reset' FOR UPDATE`
            )
          ).rows[0];

          const currentCount = Math.max(0, safeInteger(currentRow?.value?.count, 0));
          if (currentCount >= LAUNCH_TEST_RESET_LIMIT) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              success:false,
              message:`Pre-launch Test Reset limit reached (${LAUNCH_TEST_RESET_LIMIT}/${LAUNCH_TEST_RESET_LIMIT})`
            });
          }

          const nextCount = currentCount + 1;
          const actor = adminActor(req);
          const resetAt = new Date().toISOString();
          const snapshotKey = `test-reset:${nextCount}:${Date.now()}`;

          const summary = await archiveLaunchState(
            client, snapshotKey, actor, 'test_reset', nextCount
          );

          await resetPrelaunchGameState(client);

          await client.query(
            `
            INSERT INTO mai_system_state(key,value,updated_at)
            VALUES('prelaunch_test_reset',$1,NOW())
            ON CONFLICT(key)
            DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()
            `,
            [JSON.stringify({
              count:nextCount,
              limit:LAUNCH_TEST_RESET_LIMIT,
              lastResetAt:resetAt,
              lastSnapshotKey:snapshotKey,
              lastExecutedBy:actor
            })]
          );

          await client.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id,action,target_type,target_id,reason,metadata,ip_hash
            )
            VALUES($1,'prelaunch_test_reset','launch_control',$2,$3,$4,$5)
            `,
            [
              req.admin?.telegramId || null,
              String(nextCount),
              String(req.body?.reason || 'Pre-launch test reset').slice(0,500),
              {snapshotKey,resetAt,summary,count:nextCount,limit:LAUNCH_TEST_RESET_LIMIT},
              hash(req.ip).slice(0,32)
            ]
          );

          await client.query('COMMIT');

          await logSecurity(req,'prelaunch_test_reset','warn',{
            snapshotKey, resetAt, count:nextCount, limit:LAUNCH_TEST_RESET_LIMIT
          });

          res.json({
            success:true,
            count:nextCount,
            limit:LAUNCH_TEST_RESET_LIMIT,
            resetAt,
            snapshotKey,
            summary
          });
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          next(error);
        } finally {
          client.release();
        }
      }
    );

    app.post(
      '/admin/launch-control/account/:telegramId/reset-balance',
      authenticate,
      admin,
      async (req,res,next) => {
        const telegramId = String(req.params.telegramId || '').trim();
        const reason = String(req.body?.reason || '').trim().slice(0,500);
        const confirmation = String(req.body?.confirmation || '');
        const idempotencyKey = normalizeAdminCorrectionKey(req.body?.idempotencyKey);

        if (!idempotencyKey) {
          return res.status(400).json({success:false,message:'A valid idempotency key is required'});
        }
        if (!/^\d+$/.test(telegramId)) {
          return res.status(400).json({success:false,message:'Invalid Telegram ID'});
        }
        if (reason.length < 5) {
          return res.status(400).json({success:false,message:'A clear reason is required'});
        }
        if (confirmation !== `RESET ${telegramId}`) {
          return res.status(409).json({
            success:false,
            message:`Type RESET ${telegramId} exactly to confirm`
          });
        }

        const client = await pool.connect();
        try {
          await ensureMaiV5Schema();
          await client.query('BEGIN');

          const reference = `admin-reset:${idempotencyKey}`;
          const prior = (
            await client.query(
              `SELECT telegram_id,before_balance,after_balance,reference
               FROM mai_account_corrections
               WHERE reference=$1
               LIMIT 1`,
              [reference]
            )
          ).rows[0];

          if (prior) {
            await client.query('COMMIT');
            return res.json({
              success:true,
              replayed:true,
              telegramId:String(prior.telegram_id),
              beforeBalance:safeNumber(prior.before_balance),
              afterBalance:safeNumber(prior.after_balance),
              reference:prior.reference
            });
          }

          const user = (
            await client.query(
              `SELECT telegram_id,balance,locked_balance,wallet_address FROM users WHERE telegram_id=$1 FOR UPDATE`,
              [telegramId]
            )
          ).rows[0];

          if (!user) {
            await client.query('ROLLBACK');
            return res.status(404).json({success:false,message:'User not found'});
          }

          const before = safeNumber(user.balance);

          await client.query(
            `UPDATE users SET balance=0,updated_at=NOW() WHERE telegram_id=$1`,
            [telegramId]
          );

          await client.query(
            `
            INSERT INTO transactions(telegram_id,type,amount,reference,metadata)
            VALUES($1,'admin_balance_reset',$2,$3,$4)
            `,
            [telegramId, -before, reference, {reason,beforeBalance:before,afterBalance:0}]
          );

          await client.query(
            `
            INSERT INTO mai_account_corrections(
              telegram_id,action,before_balance,change_amount,after_balance,
              reason,reference,created_by
            )
            VALUES($1,'reset_balance',$2,$3,0,$4,$5,$6)
            `,
            [telegramId,before,-before,reason,reference,adminActor(req)]
          );

          await client.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id,action,target_type,target_id,reason,metadata,ip_hash
            )
            VALUES($1,'user_ingame_balance_reset','user',$2,$3,$4,$5)
            `,
            [
              req.admin?.telegramId || null, telegramId, reason,
              {beforeBalance:before,afterBalance:0,reference,lockedBalance:safeNumber(user.locked_balance)},
              hash(req.ip).slice(0,32)
            ]
          );

          await client.query('COMMIT');
          await logSecurity(req,'user_ingame_balance_reset','warn',{telegramId,beforeBalance:before,reference});
          res.json({success:true,telegramId,beforeBalance:before,afterBalance:0,reference});
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          next(error);
        } finally {
          client.release();
        }
      }
    );

    app.post(
      '/admin/launch-control/account/:telegramId/compensate',
      authenticate,
      admin,
      async (req,res,next) => {
        const telegramId = String(req.params.telegramId || '').trim();
        const reason = String(req.body?.reason || '').trim().slice(0,500);
        const amount = safeNumber(req.body?.amount);
        const confirmation = String(req.body?.confirmation || '');
        const idempotencyKey = normalizeAdminCorrectionKey(req.body?.idempotencyKey);

        if (!idempotencyKey) {
          return res.status(400).json({success:false,message:'A valid idempotency key is required'});
        }
        if (!/^\d+$/.test(telegramId)) {
          return res.status(400).json({success:false,message:'Invalid Telegram ID'});
        }
        if (!(amount > 0) || amount > 1000000000) {
          return res.status(400).json({success:false,message:'Compensation must be greater than 0 and within the safe limit'});
        }
        if (reason.length < 5) {
          return res.status(400).json({success:false,message:'A clear reason is required'});
        }
        if (confirmation !== `ADD ${amount} MAI TO ${telegramId}`) {
          return res.status(409).json({
            success:false,
            message:`Type ADD ${amount} MAI TO ${telegramId} exactly to confirm`
          });
        }

        const client = await pool.connect();
        try {
          await ensureMaiV5Schema();
          await client.query('BEGIN');

          const reference = `admin-compensation:${idempotencyKey}`;
          const prior = (
            await client.query(
              `SELECT telegram_id,before_balance,change_amount,after_balance,reference
               FROM mai_account_corrections
               WHERE reference=$1
               LIMIT 1`,
              [reference]
            )
          ).rows[0];

          if (prior) {
            await client.query('COMMIT');
            return res.json({
              success:true,
              replayed:true,
              telegramId:String(prior.telegram_id),
              beforeBalance:safeNumber(prior.before_balance),
              amount:safeNumber(prior.change_amount),
              afterBalance:safeNumber(prior.after_balance),
              reference:prior.reference
            });
          }

          const user = (
            await client.query(
              `SELECT telegram_id,balance,locked_balance,wallet_address FROM users WHERE telegram_id=$1 FOR UPDATE`,
              [telegramId]
            )
          ).rows[0];

          if (!user) {
            await client.query('ROLLBACK');
            return res.status(404).json({success:false,message:'User not found'});
          }

          const before = safeNumber(user.balance);
          const after = before + amount;

          await client.query(
            `UPDATE users SET balance=balance+$2,updated_at=NOW() WHERE telegram_id=$1`,
            [telegramId,amount]
          );

          await client.query(
            `
            INSERT INTO transactions(telegram_id,type,amount,reference,metadata)
            VALUES($1,'admin_compensation',$2,$3,$4)
            `,
            [telegramId,amount,reference,{reason,beforeBalance:before,afterBalance:after}]
          );

          await client.query(
            `
            INSERT INTO mai_account_corrections(
              telegram_id,action,before_balance,change_amount,after_balance,
              reason,reference,created_by
            )
            VALUES($1,'compensation',$2,$3,$4,$5,$6,$7)
            `,
            [telegramId,before,amount,after,reason,reference,adminActor(req)]
          );

          await client.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id,action,target_type,target_id,reason,metadata,ip_hash
            )
            VALUES($1,'user_compensation_added','user',$2,$3,$4,$5)
            `,
            [
              req.admin?.telegramId || null, telegramId, reason,
              {beforeBalance:before,amount,afterBalance:after,reference,lockedBalance:safeNumber(user.locked_balance)},
              hash(req.ip).slice(0,32)
            ]
          );

          await client.query('COMMIT');
          await logSecurity(req,'user_compensation_added','warn',{telegramId,amount,reference});
          res.json({success:true,telegramId,beforeBalance:before,amount,afterBalance:after,reference});
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          next(error);
        } finally {
          client.release();
        }
      }
    );

    app.post(
      '/admin/launch-control/execute',
      authenticate,
      admin,
      async (req,res,next) => {
        const confirmation = String(req.body?.confirmation || '');

        if (confirmation !== 'LAUNCH MAI NETWORK') {
          return res.status(409).json({
            success:false,
            message:'Type LAUNCH MAI NETWORK exactly to confirm'
          });
        }

        const client = await pool.connect();

        try {
          await ensureMaiV5Schema();
          await client.query('BEGIN');

          const existing = (
            await client.query(
              `
              SELECT value
              FROM mai_system_state
              WHERE key='official_launch'
              FOR UPDATE
              `
            )
          ).rows[0];

          if (existing?.value?.launched) {
            await client.query('ROLLBACK');
            return res.status(409).json({
              success:false,
              message:'MAI Network official launch has already been executed'
            });
          }

          const actor = adminActor(req);
          const officialLaunchAt = new Date().toISOString();
          const snapshotKey = `official-launch:${Date.now()}`;
          const summary = await archiveLaunchState(
            client, snapshotKey, actor, 'official_launch', null
          );

          await resetPrelaunchGameState(client);

          await client.query(
            `
            INSERT INTO mai_system_state(key,value,updated_at)
            VALUES('official_launch',$1,NOW())
            ON CONFLICT(key)
            DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()
            `,
            [JSON.stringify({
              launched:true,
              officialLaunchAt,
              snapshotKey,
              executedBy:actor
            })]
          );

          await client.query(
            `
            INSERT INTO admin_audit_logs(
              admin_id,action,target_type,target_id,reason,metadata,ip_hash
            )
            VALUES($1,'official_launch_executed','launch_control',$2,$3,$4,$5)
            `,
            [
              req.admin?.telegramId || null,
              snapshotKey,
              'One-time MAI Network Official Launch',
              {snapshotKey,officialLaunchAt,summary},
              hash(req.ip).slice(0,32)
            ]
          );

          await client.query('COMMIT');

          await logSecurity(req,'official_launch_executed','warn',{
            snapshotKey, officialLaunchAt, users:summary.users
          });

          res.json({
            success:true,
            launched:true,
            officialLaunchAt,
            snapshotKey,
            summary
          });
        } catch (error) {
          try { await client.query('ROLLBACK'); } catch {}
          next(error);
        } finally {
          client.release();
        }
      }
    );

    /* -------------------------
       V5 HEALTH / CAPABILITIES
       ------------------------- */

    app.get(
      '/admin/modules/status',
      authenticate,
      admin,
      async (req,res,next) => {
        try {
          await ensureMaiV5Schema();

          res.json({
            success:true,
            modules:{
              tasksMissions:true,
              giveaway:true,
              broadcast:true,
              referrals:true,
              launchControl:true,
              autoPayout:
                Boolean(MAI_PAYOUT_ENABLED)
            },
            payout:{
              auto:
                Boolean(MAI_PAYOUT_ENABLED),
              manualMarkPaidRecommended:false
            }
          });
        } catch (error) {
          next(error);
        }
      }
    );



    /* =========================================================
       NOT FOUND
       Keep this below every route.
       ========================================================= */

    app.use(

      (
        req,
        res,
        next
      ) => {

        if (
          res.headersSent
        ) {

          return next();

        }


        res
          .status(404)
          .json({

            success:
              false,

            message:
              'Route not found'

          });

      }

    );


    /* =========================================================
       ERROR HANDLER
       ========================================================= */

    app.use(

      (
        error,
        req,
        res,
        next
      ) => {

        console.error(

          '[SERVER ERROR]',

          {
            method: req.method,
            path: req.path,
            telegramId: req.auth?.id || null,
            name: error?.name || 'Error',
            message: error?.message || 'Unknown error'
          }

        );

        // Do not await here: the error response must not be delayed by logging.
        logSecurity(
          req,
          'server_error',
          'error',
          { method: req.method, path: req.path, errorName: error?.name || 'Error' }
        ).catch(() => {});


        if (
          res.headersSent
        ) {

          return next(
            error
          );

        }


        res
          .status(500)
          .json({

            success:
              false,

            message:
              IS_PRODUCTION
                ? 'Server error'
                : (error.message || 'Server error')

          });

      }

    );


    /* =========================================================
       GRACEFUL DATABASE SHUTDOWN
       ========================================================= */

    async function shutdown(
      signal
    ) {

      console.log(
        `${signal} received. Shutting down...`
      );


      try {

        if (maiPayoutWorkerTimer) {
          clearInterval(
            maiPayoutWorkerTimer
          );
          maiPayoutWorkerTimer = null;
        }

        await pool.end();

      } catch (
        error
      ) {

        console.error(
          'Database shutdown error:',
          error.message
        );

      }


      process.exit(
        0
      );

    }


    process.on(
      'SIGTERM',
      () =>
        shutdown(
          'SIGTERM'
        )
    );


    process.on(
      'SIGINT',
      () =>
        shutdown(
          'SIGINT'
        )
    );


    /* =========================================================
       START SERVER
       ========================================================= */

    initDb()

      .then(
        () => {

          app.listen(

            PORT,

            async () => {

              console.log(
                `MAI Network API running on ${PORT}`
              );


              console.log(
                `MAI Jetton: ${MAI_JETTON_MASTER}`
              );


              console.log(
                'Level mode: in-game + TON wallet holding'
              );


              console.log(
                'Daily Task mode: JOIN → CHECK → CLAIM → CLAIMED'
              );


              console.log(
                'Daily reset: 00:00 UTC'
              );


              console.log(
                `Promote price: 100 completions = ${promoteGramPrice(100)} GRAM`
              );


              if (
                PROMOTE_RECEIVER_WALLET
              ) {

                console.log(
                  'Promote payment wallet configured'
                );

              } else {

                console.log(
                  'Promote payment wallet not configured yet'
                );

              }


              try {

                await registerTelegramWebhook();


              } catch (
                error
              ) {

                console.error(

                  'Telegram webhook registration failed:',

                  error.message

                );

              }



              // Start only after DB initialization and HTTP server startup.
              // The worker itself fails closed if its signer configuration is invalid.
              startMaiPayoutWorker();

              // Scheduled broadcasts are processed only after DB/server startup.
              startMaiBroadcastScheduler();

            }

          );

        }

      )

      .catch(
        error => {

          console.error(

            'MAI Network startup failed:',

            error

          );


          process.exit(
            1
          );

        }

      );


    /* =========================================================
       END OF SERVER.JS
       ========================================================= */
