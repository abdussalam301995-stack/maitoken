    require('dotenv').config();

    const express = require('express');
    const cors = require('cors');
    const helmet = require('helmet');
    const crypto = require('crypto');

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
          500
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
          0
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

          id UUID
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

          id UUID
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

            hash(
              req.ip
            ).slice(
              0,
              32
            ),

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

            metadata

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

        await pool.query(
          `
          INSERT INTO users(

            telegram_id,

            username,

            first_name,

            photo_url,

            balance,

            referred_by

          )

          VALUES(
            $1,$2,$3,$4,$5,$6
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

            updated_at=
              NOW()
          `,
          [

            auth.id,

            auth.username,

            auth.firstName,

            auth.photoUrl,

            cfg.initialBalance,

            referredBy

          ]
        );


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

              telegram_id

            )

            VALUES(
              $1,$2
            )

            ON CONFLICT(
              device_hash,
              telegram_id
            )

            DO UPDATE SET

              last_seen=
                NOW()
            `,
            [

              req.deviceHash,

              auth.id

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
        hash(
          req.ip
        ).slice(
          0,
          32
        );


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

      const result =
        await client.query(
          `
          SELECT

            referred_by,

            referral_qualified

          FROM users

          WHERE
            telegram_id=$1

          FOR UPDATE
          `,
          [
            userId
          ]
        );


      const user =
        result.rows[0];


      if (
        !user ||
        !user.referred_by ||
        user.referral_qualified
      ) {

        return;

      }


      await client.query(
        `
        UPDATE users

        SET

          referral_qualified=
            TRUE,

          balance=
            balance + $2,

          updated_at=
            NOW()

        WHERE
          telegram_id=$1
        `,
        [

          userId,

          cfg.referredReward

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

        WHERE
          telegram_id=$1
        `,
        [

          user.referred_by,

          cfg.referrerReward

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

        VALUES

          (
            $1,
            'referral_welcome',
            $2,
            $3
          ),

          (
            $3,
            'referral_reward',
            $4,
            $1
          )
        `,
        [

          userId,

          cfg.referredReward,

          String(
            user.referred_by
          ),

          cfg.referrerReward

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


      const adCount =
        (
          await pool.query(
            `
            SELECT

              COUNT(*)::int AS c

            FROM ad_sessions

            WHERE

              telegram_id=$1

              AND day=$2

              AND claimed_at
                IS NOT NULL
            `,
            [
              userId,
              day
            ]
          )
        ).rows[0].c;


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

          limit:
            cfg.adDailyLimit,

          completed:
            adCount,

          remaining:
            Math.max(

              0,

              cfg.adDailyLimit -
              adCount

            ),

          reward:
            cfg.adReward,

          cooldown:
            cfg.adCooldown,

          resetAt:
            nextUtcResetAt()

        },


        joins,


        hasIncomplete:

          adCount <
          cfg.adDailyLimit ||

          joins.some(
            task =>
              !task.claimed
          )

      };

    }


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
              crypto
                .randomUUID(),
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

                  AND claimed_at
                  IS NOT NULL
                `,
                [
                  req.auth.id,
                  day
                ]
              )
            ).rows[0].c;


          if (
            used >=
            cfg.adDailyLimit
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

                ORDER BY
                  started_at DESC

                LIMIT 1
                `,
                [
                  req.auth.id
                ]
              )
            ).rows[0];


          if (
            last
          ) {

            const wait =

              cfg.adCooldown -

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
              day
            )

            VALUES(
              $1,$2,$3
            )
            `,
            [
              id,
              req.auth.id,
              day
            ]
          );


          let url =
            '';


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

                  AND claimed_at
                  IS NOT NULL
                `,
                [
                  req.auth.id,
                  ad.day
                ]
              )
            ).rows[0].c;


          if (
            used >=
            cfg.adDailyLimit
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
              cfg.adReward
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
              cfg.adReward,
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
            { rewardType: 'ad', sessionId: ad.id, amount: cfg.adReward }
          );


          res.json({

            success:
              true,

            reward:
              cfg.adReward,

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


          if (

            cfg.devicePolicy ===
              'hard' &&

            cfg.blockWithdrawOnRisk &&

            risk.length

          ) {

            return res
              .status(403)
              .json({

                success:
                  false,

                message:
                  'Withdrawal requires security review',

                riskFlags:
                  risk

              });

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

                  'processing'

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
                req.params.id
              ]
            );


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

            [
              'completed',
              'rejected'
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
          !txHash
        ) {

          return res
            .status(400)
            .json({

              success:
                false,

              message:
                'txHash required'

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


          await client.query(
            `
            UPDATE withdrawals

            SET

              status='completed',

              tx_hash=$2,

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
                txHash
              }

            ]
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
      const result =
        await pool.query(
          `
          SELECT

            (SELECT COUNT(*)::int
             FROM users)
              AS total_users,

            (SELECT COUNT(*)::int FROM users WHERE account_status='banned')
              AS banned_users,

            (SELECT COUNT(*)::int
             FROM users
             WHERE account_status='suspended'
               AND (suspended_until IS NULL OR suspended_until > NOW()))
              AS suspended_users,

            (SELECT COUNT(*)::int
             FROM campaigns
             WHERE payment_status='paid'
               AND status='pending')
              AS pending_campaigns,

            (SELECT COUNT(*)::int
             FROM campaigns
             WHERE payment_status='paid'
               AND status='approved')
              AS active_campaigns,

            (SELECT COUNT(*)::int
             FROM withdrawals
             WHERE status IN (
               'pending',
               'security_check'
             ))
              AS pending_withdrawals,

            (SELECT COUNT(*)::int
             FROM withdrawals
             WHERE status='security_check')
              AS risky_withdrawals,

            (SELECT COUNT(*)::int
             FROM security_logs
             WHERE severity='warn'
               AND created_at >=
                   NOW() - INTERVAL '24 hours')
              AS security_warnings_24h,

            (SELECT COUNT(DISTINCT device_hash)::int
             FROM device_accounts)
              AS known_devices,

            (SELECT COUNT(*)::int
             FROM (
               SELECT device_hash
               FROM device_accounts
               GROUP BY device_hash
               HAVING COUNT(DISTINCT telegram_id) > 1
             ) shared_devices)
              AS shared_devices

          `
        );

      res.json({
        success: true,
        dashboard: result.rows[0]
      });

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
            u.mining_level,
            u.mining_speed,
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
        items: result.rows
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
            mining_level,
            mining_speed,
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
            first_seen,
            last_seen

          FROM device_accounts

          WHERE telegram_id=$1

          ORDER BY last_seen DESC
          `,
          [
            telegramId
          ]
        );

      const linkedAccounts =
        await pool.query(
          `
          SELECT DISTINCT
            u.telegram_id,
            u.username,
            u.first_name,
            u.wallet_address,
            da.device_hash,
            da.first_seen,
            da.last_seen

          FROM device_accounts mine

          JOIN device_accounts da
            ON da.device_hash = mine.device_hash

          JOIN users u
            ON u.telegram_id = da.telegram_id

          WHERE
            mine.telegram_id=$1
            AND da.telegram_id<>$1

          ORDER BY
            da.last_seen DESC

          LIMIT 200
          `,
          [
            telegramId
          ]
        );

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

      const sharedIpAccounts =
        await pool.query(
          `
          SELECT DISTINCT
            u.telegram_id,
            u.username,
            u.first_name,
            sl.ip_hash

          FROM security_logs mine

          JOIN security_logs sl
            ON sl.ip_hash = mine.ip_hash

          JOIN users u
            ON u.telegram_id = sl.telegram_id

          WHERE
            mine.telegram_id=$1
            AND mine.ip_hash IS NOT NULL
            AND sl.telegram_id IS NOT NULL
            AND sl.telegram_id<>$1

          ORDER BY
            u.telegram_id

          LIMIT 200
          `,
          [
            telegramId
          ]
        );

      res.json({
        success: true,

        user:
          userResult.rows[0],

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
          if (telegramId === String(req.auth.id)) return res.status(409).json({success:false,message:'You cannot ban your own admin account'});

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
          res.json({success:true,user:result.rows[0]});
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
          if (telegramId === String(req.auth.id)) return res.status(409).json({success:false,message:'You cannot suspend your own admin account'});

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
          res.json({success:true,user:result.rows[0]});
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
          res.json({success:true,user:result.rows[0]});
        } catch (error) { next(error); }
      }
    );


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
