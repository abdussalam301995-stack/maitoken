require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

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


const ALLOW_DEV_AUTH =
  String(
    process.env.ALLOW_DEV_AUTH ||
    ''
  ).toLowerCase() ===
  'true';


const ADMIN_KEY =
  String(
    process.env.ADMIN_KEY ||
    ''
  );


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

      if (
        !origin ||
        allowedOrigins.includes(
          origin
        )
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
   LEVEL
   ========================================================= */

function levelFor(
  totalHolding
) {

  const total =
    Math.max(
      0,
      safeNumber(
        totalHolding
      )
    );


  const step =
    Math.max(
      1,
      cfg.holdingStep
    );


  return clamp(

    Math.floor(
      total /
      step
    ),

    0,

    cfg.maxLevel

  );

}


/* =========================================================
   LEVEL MINING SPEED
   ========================================================= */

function levelSpeed(
  level
) {

  const safeLevel =
    Math.max(
      0,
      safeInteger(
        level
      )
    );


  if (
    safeLevel <= 0
  ) {

    return 0;

  }


  return (

    cfg.level1Daily +

    (
      safeLevel -
      1
    ) *

    cfg.levelStep

  );

}


/* =========================================================
   TOTAL DAILY MINING RATE
   ========================================================= */

function totalDailyFor(
  totalHolding
) {

  return (

    cfg.freeDaily +

    levelSpeed(

      levelFor(
        totalHolding
      )

    )

  );

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

  if (
    !ADMIN_KEY ||
    req.get(
      'X-Admin-Key'
    ) !==
    ADMIN_KEY
  ) {

    return res
      .status(401)
      .json({

        success:
          false,

        message:
          'Admin authorization failed'

      });

  }


  next();

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

    const key =

      `${req.ip}:` +
      `${req.method}:` +
      `${req.path}`;


    const now =
      Date.now();


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
        0,

      levelSpeed:
        0,

      totalDaily:
        cfg.freeDaily

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


  const levelSpeedValue =
    levelSpeed(
      level
    );


  const totalDaily =

    cfg.freeDaily +

    levelSpeedValue;


  return {

    inGame,

    wallet,

    total,

    level,

    levelSpeed:
      levelSpeedValue,

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

      daily_bonus_date
        DATE,

      referred_by BIGINT,

      referral_qualified BOOLEAN
        NOT NULL
        DEFAULT FALSE,

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
      ADD COLUMN IF NOT EXISTS daily_bonus_date DATE;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS referred_by BIGINT;

    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS referral_qualified BOOLEAN
      NOT NULL
      DEFAULT FALSE;

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
      ADD COLUMN IF NOT EXISTS owner_id TEXT;
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
    age > 86400
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


    const initData =

      req.get(
        'X-Telegram-Init-Data'
      ) ||

      req.body?.initData;


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

    const rawDevice =
      req.get(
        'X-MAI-Device-ID'
      ) ||
      '';


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
    !PUBLIC_BASE_URL
  ) {

    console.warn(

      'Telegram webhook not registered: BOT_TOKEN or PUBLIC_BASE_URL missing'

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
   FARM STATE
   ========================================================= */

function farmState(
  row,
  holding
) {

  const currentRate =
    safeNumber(

      holding?.totalDaily ??

      cfg.freeDaily

    );


  const started =

    row.farm_started_at

      ? new Date(
          row.farm_started_at
        ).getTime()

      : null;


  if (
    !started
  ) {

    return {

      active:
        false,

      ready:
        false,

      remaining:
        cfg.farmSeconds,

      pending:
        0,

      rateDaily:
        currentRate,

      rateSecond:
        currentRate /
        86400,

      startedAt:
        null

    };

  }


  const elapsed =
    Math.max(

      0,

      (
        Date.now() -
        started
      ) /
      1000

    );


  const progress =
    Math.min(

      1,

      elapsed /
      cfg.farmSeconds

    );


  return {

    active:
      true,

    ready:
      elapsed >=
      cfg.farmSeconds,

    remaining:
      Math.max(

        0,

        Math.ceil(

          cfg.farmSeconds -
          elapsed

        )

      ),

    pending:
      currentRate *
      progress,

    rateDaily:
      currentRate,

    rateSecond:
      currentRate /
      86400,

    startedAt:
      row.farm_started_at

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
      holding.levelSpeed,

    miningSpeed:
      holding.totalDaily,

    freeMiningSpeed:
      cfg.freeDaily,

    maxLevel:
      cfg.maxLevel,

    holdingStep:
      cfg.holdingStep,


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
   FARM START
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

          WHERE
            telegram_id=$1

          FOR UPDATE
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
              'Farming is already active'

          });

      }


      const holding =
        await getUserHoldingSnapshot(
          user,
          client
        );


      await client.query(
        `
        UPDATE users

        SET

          farm_started_at=
            NOW(),

          farm_rate_daily=
            $2,

          updated_at=
            NOW()

        WHERE
          telegram_id=$1
        `,
        [
          req.auth.id,
          holding.totalDaily
        ]
      );


      await client.query(
        'COMMIT'
      );


      res.json({

        success:
          true,

        level:
          holding.level,

        totalHolding:
          holding.total,

        rateDaily:
          holding.totalDaily,

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
   FARM CLAIM
   ========================================================= */

app.post(

  '/api/farm/claim',

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

          WHERE
            telegram_id=$1

          FOR UPDATE
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


      const holding =
        await getUserHoldingSnapshot(
          user,
          client
        );


      const state =
        farmState(
          user,
          holding
        );


      if (
        !state.active ||
        !state.ready
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
              `Farming not ready. ${state.remaining}s remaining`

          });

      }


      const reward =
        holding.totalDaily;


      const gameBalanceAfter =
        safeNumber(
          user.balance
        ) +
        reward;


      const totalAfter =

        gameBalanceAfter +

        holding.wallet;


      const nextRate =
        totalDailyFor(
          totalAfter
        );


      await client.query(
        `
        UPDATE users

        SET

          balance=
            balance + $2,

          farm_started_at=
            NOW(),

          farm_rate_daily=
            $3,

          updated_at=
            NOW()

        WHERE
          telegram_id=$1
        `,
        [

          req.auth.id,

          reward,

          nextRate

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

          utcDay(),

          {

            previousLevel:
              holding.level,

            inGame:
              holding.inGame,

            wallet:
              holding.wallet,

            total:
              holding.total,

            miningRate:
              holding.totalDaily

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

            id,

            type,

            title,

            target_url,

            description,

            target_count,

            completed_count,

            reward_per_user,

            verification_type,

            chat_id

          FROM campaigns

          WHERE

            status='approved'

            AND payment_status='paid'

            AND completed_count <
              target_count

          ORDER BY

            approved_at DESC,

            id DESC

          LIMIT 100
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


        /* ---------------------------------------------------
           MAI PAYMENT
           Deducts from IN-GAME balance.

           GRAM payment stays pending until
           payment verification/admin approval.
           --------------------------------------------------- */

        if (
          method ===
          'MAI'
        ) {

          const deducted =
            await client.query(
              `
              UPDATE users

              SET

                balance=
                  balance - $2,

                updated_at=
                  NOW()

              WHERE

                telegram_id=$1

                AND balance >= $2

              RETURNING
                balance
              `,
              [
                req.auth.id,
                paymentAmount
              ]
            );


          if (
            !deducted.rowCount
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
                  `Not enough in-game MAI. Required: ${paymentAmount} MAI`

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
              ),

              method,

              paymentAmount,

              quotedGram,

              quotedMai,

              PROMOTE_RECEIVER_WALLET ||
              null,

              method ===
                'MAI'
                ? 'paid'
                : 'pending',

              verificationType,

              chatId

            ]
          );


        let campaign =
          inserted.rows[0];


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


        if (
          method ===
          'MAI'
        ) {

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
              'promotion_payment',
              $2,
              $3,
              $4
            )
            `,
            [

              req.auth.id,

              -paymentAmount,

              String(
                campaign.id
              ),

              {

                paymentMethod:
                  method,

                completions:
                  count,

                quotedGram,

                quotedMai

              }

            ]
          );

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


      const reward =
        safeNumber(
          campaign.reward_per_user
        );


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
        key.length < 8
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
   ADMIN CAMPAIGNS
   ========================================================= */

app.get(

  '/admin/campaigns',

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
        campaign.payment_method !==
        'GRAM'
      ) {

        return res
          .status(400)
          .json({

            success:
              false,

            message:
              'This campaign does not use GRAM payment'

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


      if (
        !/^\d+$/.test(
          expectedNano
        )
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
          await findGramPaymentOnChain({

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
          '[GRAM PAYMENT VERIFY]',
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
              status='approved',
              payment_tx_hash=$2,
              payment_verified_at=NOW(),
              approved_at=COALESCE(approved_at,NOW())

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
            'promotion_payment_gram',
            $2,
            $3,
            $4
          )
          `,
          [
            req.auth.id,
            -safeNumber(
              current.quoted_gram
            ),
            String(
              campaignId
            ),
            {
              txHash:
                onChain.hash,
              amountNano:
                expectedNano,
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
   ADMIN SECURITY CONFIG
   ========================================================= */

app.get(

  '/admin/security/config',

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

      error

    );


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
          error.message ||
          'Server error'

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