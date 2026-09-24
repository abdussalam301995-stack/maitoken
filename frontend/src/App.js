import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  TonConnectButton,
  useTonAddress,
  useTonConnectUI
} from '@tonconnect/ui-react';

import {
  Address,
  beginCell,
  toNano
} from '@ton/core';

import './App.css';
import AdminPanel from './Admin/AdminPanel';
import Tasks from './Tasks';
import Friends from './Friends/Friends';

/* =========================================================
   MAI NETWORK
   App.js — PART 1 / 4

   Core
   API
   Language System
   Audio System
   App Navigation
   ========================================================= */


/* =========================================================
   FRONTEND CONFIG
   ========================================================= */

const API = (
  process.env.REACT_APP_API_URL ||
  'http://localhost:5000'
).replace(
  /\/$/,
  ''
);


const LOGO =
  '/assets/mai-logo.png';

const BG =
  '/assets/background.jpg';

const LOADING =
  '/assets/loading.jpg';


/* =========================================================
   TELEGRAM
   ========================================================= */

function tg() {

  return (
    window.Telegram?.WebApp ||
    null
  );

}


/* =========================================================
   DEVICE ID
   ========================================================= */

function deviceId() {

  let id =
    localStorage.getItem(
      'mai_device_id'
    );


  if (!id) {

    if (
      window.crypto
        ?.randomUUID
    ) {

      id =
        window.crypto
          .randomUUID();

    } else {

      id =
        `mai_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2)}`;

    }


    localStorage.setItem(
      'mai_device_id',
      id
    );

  }


  return id;

}


/* =========================================================
   API
   ========================================================= */

async function api(
  path,
  {
    method = 'GET',
    body,
    idempotency
  } = {}
) {

  const web =
    tg();


  const headers = {

    'Content-Type':
      'application/json',

    'X-MAI-Device-ID':
      deviceId()

  };


  if (
    web?.initData
  ) {

    headers[
      'X-Telegram-Init-Data'
    ] =
      web.initData;


  } else if (
    process.env
      .REACT_APP_DEV_USER_ID
  ) {

    headers[
      'X-Dev-User'
    ] =
      process.env
        .REACT_APP_DEV_USER_ID;

  }


  if (
    idempotency
  ) {

    headers[
      'X-Idempotency-Key'
    ] =
      idempotency;

  }


  const response =
    await fetch(
      `${API}${path}`,
      {
        method,
        headers,

        body:
          body !== undefined
            ? JSON.stringify(
                body
              )
            : undefined
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
        data.message ||
        `Request failed (${response.status})`
      );


    error.status =
      response.status;

    error.data =
      data;


    throw error;

  }


  return data;

}


/* =========================================================
   TON CELL BASE64
   ========================================================= */

function bytesToBase64(
  bytes
) {

  let binary =
    '';


  for (
    let i = 0;
    i < bytes.length;
    i += 1
  ) {

    binary +=
      String.fromCharCode(
        bytes[i]
      );

  }


  return btoa(
    binary
  );

}


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

function fmt(
  value,
  digits = 4
) {

  return Number(
    value ||
    0
  ).toLocaleString(
    'en-US',
    {
      minimumFractionDigits:
        digits,

      maximumFractionDigits:
        digits
    }
  );

}


function fmtSmart(
  value,
  max = 4
) {

  return Number(
    value ||
    0
  ).toLocaleString(
    'en-US',
    {
      minimumFractionDigits:
        0,

      maximumFractionDigits:
        max
    }
  );

}


/* =========================================================
   TIMER
   ========================================================= */

function hms(
  seconds
) {

  const s =
    Math.max(
      0,
      Math.floor(
        Number(
          seconds ||
          0
        )
      )
    );


  const h =
    Math.floor(
      s /
      3600
    );


  const m =
    Math.floor(
      (
        s %
        3600
      ) /
      60
    );


  const sec =
    s %
    60;


  return (

    `${String(h).padStart(2, '0')}:` +

    `${String(m).padStart(2, '0')}:` +

    `${String(sec).padStart(2, '0')}`

  );

}


/* =========================================================
   WALLET SHORTENER
   ========================================================= */

function short(
  address,
  emptyText = 'Not connected'
) {

  if (
    !address
  ) {

    return emptyText;

  }


  if (
    address.length <=
    18
  ) {

    return address;

  }


  return (

    `${address.slice(0, 8)}` +

    '…' +

    `${address.slice(-6)}`

  );

}


/* =========================================================
   LANGUAGE DICTIONARY
   ========================================================= */

const TEXT = {

  en: {

    appName:
      'MAI NETWORK',

    online:
      'Online',

    slogan:
      'Bigger Dreams · Higher Goals',

    home:
      'Home',

    tasks:
      'Tasks',

    friends:
      'Friends',

    profile:
      'Profile',

    totalBalance:
      'TOTAL MAI BALANCE',

    inGame:
      'IN-GAME',

    wallet:
      'WALLET',

    level:
      'LEVEL',

    walletHolding:
      'WALLET HOLDING',

    connectWallet:
      'Connect Wallet',

    refresh:
      'Refresh',

    autoMining:
      'AUTO MINING',

    farmingTime:
      'FARMING TIME',

    boost:
      'BOOST',

    farmReward:
      'FARM REWARD',

    startFarming:
      'START FARMING',

    claim:
      'CLAIM',

    claimed:
      'CLAIMED',

    ready:
      'READY',

    pending:
      'Pending',

    serverMining:
      'Server-counted mining',

    claimReward:
      'Claim your reward',

    nextCycle:
      'Starts next cycle automatically',

    perDay:
      'MAI / Day',

    perSecond:
      'MAI / SEC',

    tapCoin:
      'TAP THE MAI',

    tapHint:
      'Power your network',

    together:
      'TOGETHER WE BUILD A BRIGHTER FUTURE',

    boostCenter:
      'Mining Power Center',

    boostIntro:
      'Your MAI holding determines your mining level and daily earning power.',

    currentLevel:
      'Current Level',

    unlocked:
      'UNLOCKED',

    locked:
      'LOCKED',

    levelUnlocked:
      'LEVEL UNLOCKED',

    levelLocked:
      'LEVEL LOCKED',

    requiredHolding:
      'Required Holding',

    currentHolding:
      'Current Holding',

    miningPower:
      'Mining Power',

    baseMining:
      'Base Mining',

    levelBonus:
      'Level Bonus',

    totalDailyMining:
      'Total Daily Mining',

    nextLevel:
      'Next Level',

    maxLevel:
      'MAX LEVEL',

    daily:
      'Daily',

    partner:
      'Partner',

    exclusive:
      'Exclusive',

    dailyTasks:
      'Daily Missions',

    dailyTasksSub:
      'Complete verified missions and earn MAI every day.',

    watchAds:
      'Watch Ads & Earn',

    dailyLimit:
      'Daily Limit',

    utcReset:
      'Resets at 00:00 UTC',

    watch:
      'WATCH',

    join:
      'JOIN',

    check:
      'CHECK',

    tryAgain:
      'TRY AGAIN',

    reward:
      'Reward',

    membershipRequired:
      'Telegram membership required',

    verified:
      'VERIFIED',

    completedToday:
      'Completed today',

    checking:
      'Checking...',

    claiming:
      'Claiming...',

    partnerPromotions:
      'Partner Promotions',

    promoteSubtitle:
      'Grow your Telegram channel, group, bot or project with the MAI community.',

    addPromote:
      'ADD TO PROMOTE',

    premiumReach:
      'Reach real MAI users',

    premiumReachText:
      'Create a campaign, select your target and submit it for secure review.',

    approval:
      'Admin Review',

    tracking:
      'Live Progress',

    payment:
      'MAI / GRAM',

    campaignType:
      'Promotion Type',

    campaignTitle:
      'Campaign Title',

    campaignLink:
      'Campaign Link',

    campaignDescription:
      'Description',

    completions:
      'Target Completions',

    promotionPackage:
      'Promotion Package',

    paymentMethod:
      'Payment Method',

    promotionCost:
      'Promotion Cost',

    gramEquivalent:
      'GRAM Equivalent',

    maiEquivalent:
      'MAI Equivalent',

    paymentWallet:
      'Payment Wallet',

    walletNotConfigured:
      'Payment wallet will be added soon',

    submitPromotion:
      'SUBMIT PROMOTION',

    submitting:
      'Submitting...',

    promoteNotice:
      '100 completions cost 0.2 GRAM. MAI payments use the configured GRAM-to-MAI equivalent.',

    campaignPending:
      'Campaign submitted for approval',

    exclusiveMissions:
      'Exclusive Missions',

    exclusiveSub:
      'Official MAI partner campaigns and limited missions.',

    noCampaigns:
      'No exclusive campaigns available yet.',

    open:
      'OPEN',

    inviteFriends:
      'Invite Friends',

    inviteHero:
      'Build Your MAI Network',

    inviteDescription:
      'Invite real users, grow your community and unlock milestone rewards.',

    successful:
      'Successful',

    pendingFriends:
      'Pending',

    maiEarned:
      'MAI Earned',

    inviteFriend:
      'INVITE FRIEND',

    copyLink:
      'COPY LINK',

    copied:
      'Referral link copied',

    milestones:
      'Milestone Rewards',

    referralHistory:
      'Referral History',

    noReferrals:
      'No referrals yet.',

    profileCenter:
      'Account Center',

    walletCenter:
      'Wallet Center',

    connected:
      'Connected',

    notConnected:
      'Not connected',

    maiHolding:
      'MAI Holding',

    holdingDescription:
      'Wallet + in-game MAI determine your mining level.',

    withdraw:
      'Withdraw MAI',

    withdrawSub:
      'Secure withdrawal center',

    securityCenter:
      'Security Center',

    telegramAuth:
      'Telegram Authentication',

    walletBinding:
      'Wallet Binding',

    active:
      'Active',

    required:
      'Required',

    lockedBalance:
      'Locked Balance',

    settingsHelp:
      'Settings & Help',

    notifications:
      'Notifications',

    sound:
      'Sound Effects',

    language:
      'Language',

    termsPrivacy:
      'Terms & Privacy',

    support:
      'Support',

    on:
      'ON',

    off:
      'OFF',

    english:
      'English',

    arabic:
      'Arabic',

    russian:
      'Russian',

    settingsSaved:
      'Settings saved',

    termsTitle:
      'Terms & Privacy',

    termsIntro:
      'MAI Network provides mining, reward, wallet and promotional tools inside Telegram.',

    termsRewardsTitle:
      'Rewards & Mining',

    termsRewards:
      'In-app rewards depend on MAI Network rules and may change as the project develops. Displayed mining balances are not guaranteed fiat value.',

    termsWalletTitle:
      'Wallet & Blockchain',

    termsWallet:
  "Connected wallets remain under the user's control. Blockchain transactions can be irreversible and network fees may apply.",

    termsDataTitle:
      'Privacy & Data',

    termsData:
      'MAI Network may process Telegram account information, device identifiers, wallet addresses and activity needed for security, rewards and abuse prevention.',

    termsExternalTitle:
      'External Links',

    termsExternal:
      'Partner campaigns and external links may lead to third-party services. Users should review third-party terms before interacting.',

    termsPromoTitle:
      'Promotions',

    termsPromo:
      'Promotion campaigns require payment and approval. Fraudulent, misleading or abusive campaigns may be rejected.',

    close:
      'CLOSE',

    withdrawTitle:
      'WITHDRAW',

    availableBalance:
      'Available Balance',

    minimum:
      'Minimum',

    amount:
      'Amount',

    destination:
      'Destination',

    max:
      'MAX',

    holdWithdraw:
      'HOLD TO WITHDRAW',

    withdrawalHistory:
      'Withdrawal History',

    noWithdrawals:
      'No withdrawals yet.',

    openTelegram:
      'Open Telegram',

    somethingWrong:
      'Something went wrong',

    insideTelegram:
      'Open this Mini App inside Telegram.',

    loading:
      'INITIALIZING...',

    walletUpdated:
      'Wallet holding updated',

    farmStarted:
      'Continuous mining started',

    availableIn:
      'Available in',

    rewardClaimed:
      'Reward claimed',

    taskVerified:
      'Task verified. Claim your reward.',

    taskNotJoined:
      'You have not joined yet. Please join and try again.',

    supportOpening:
      'Opening support...'

  },


  ar: {

    appName:
      'شبكة MAI',

    online:
      'متصل',

    slogan:
      'أحلام أكبر · أهداف أعلى',

    home:
      'الرئيسية',

    tasks:
      'المهام',

    friends:
      'الأصدقاء',

    profile:
      'الملف الشخصي',

    totalBalance:
      'إجمالي رصيد MAI',

    inGame:
      'داخل التطبيق',

    wallet:
      'المحفظة',

    level:
      'المستوى',

    walletHolding:
      'رصيد المحفظة',

    connectWallet:
      'ربط المحفظة',

    refresh:
      'تحديث',

    autoMining:
      'التعدين التلقائي',

    farmingTime:
      'وقت التعدين',

    boost:
      'تعزيز',

    farmReward:
      'مكافأة التعدين',

    startFarming:
      'ابدأ التعدين',

    claim:
      'استلام',

    claimed:
      'تم الاستلام',

    ready:
      'جاهز',

    pending:
      'قيد الانتظار',

    serverMining:
      'تعدين محسوب على الخادم',

    claimReward:
      'استلم مكافأتك',

    nextCycle:
      'تبدأ الدورة التالية تلقائياً',

    perDay:
      'MAI / يوم',

    perSecond:
      'MAI / ثانية',

    tapCoin:
      'اضغط على MAI',

    tapHint:
      'قوِّ شبكتك',

    together:
      'معاً نبني مستقبلاً أكثر إشراقاً',

    boostCenter:
      'مركز قوة التعدين',

    boostIntro:
      'رصيد MAI الخاص بك يحدد مستوى التعدين وقوة الربح اليومية.',

    currentLevel:
      'المستوى الحالي',

    unlocked:
      'مفتوح',

    locked:
      'مغلق',

    levelUnlocked:
      'المستوى مفتوح',

    levelLocked:
      'المستوى مغلق',

    requiredHolding:
      'الرصيد المطلوب',

    currentHolding:
      'الرصيد الحالي',

    miningPower:
      'قوة التعدين',

    baseMining:
      'التعدين الأساسي',

    levelBonus:
      'مكافأة المستوى',

    totalDailyMining:
      'إجمالي التعدين اليومي',

    nextLevel:
      'المستوى التالي',

    maxLevel:
      'أقصى مستوى',

    daily:
      'يومي',

    partner:
      'شركاء',

    exclusive:
      'حصري',

    dailyTasks:
      'المهام اليومية',

    dailyTasksSub:
      'أكمل المهام الموثقة واكسب MAI يومياً.',

    watchAds:
      'شاهد الإعلانات واكسب',

    dailyLimit:
      'الحد اليومي',

    utcReset:
      'إعادة الضبط 00:00 UTC',

    watch:
      'مشاهدة',

    join:
      'انضم',

    check:
      'تحقق',

    tryAgain:
      'حاول مجدداً',

    reward:
      'المكافأة',

    membershipRequired:
      'يتطلب الانضمام إلى Telegram',

    verified:
      'تم التحقق',

    completedToday:
      'اكتمل اليوم',

    checking:
      'جارٍ التحقق...',

    claiming:
      'جارٍ الاستلام...',

    partnerPromotions:
      'إعلانات الشركاء',

    promoteSubtitle:
      'نمِّ قناتك أو مجموعتك أو بوتك داخل مجتمع MAI.',

    addPromote:
      'إضافة إعلان',

    premiumReach:
      'الوصول إلى مستخدمي MAI',

    premiumReachText:
      'أنشئ حملة وحدد هدفك وأرسلها للمراجعة.',

    approval:
      'مراجعة الإدارة',

    tracking:
      'تتبع مباشر',

    payment:
      'MAI / GRAM',

    campaignType:
      'نوع الإعلان',

    campaignTitle:
      'عنوان الحملة',

    campaignLink:
      'رابط الحملة',

    campaignDescription:
      'الوصف',

    completions:
      'عدد الإكمالات',

    promotionPackage:
      'حزمة الإعلان',

    paymentMethod:
      'طريقة الدفع',

    promotionCost:
      'تكلفة الإعلان',

    gramEquivalent:
      'ما يعادل GRAM',

    maiEquivalent:
      'ما يعادل MAI',

    paymentWallet:
      'محفظة الدفع',

    walletNotConfigured:
      'ستتم إضافة محفظة الدفع قريباً',

    submitPromotion:
      'إرسال الإعلان',

    submitting:
      'جارٍ الإرسال...',

    promoteNotice:
      '100 إكمال تكلف 0.2 GRAM. دفع MAI يعتمد على القيمة المكافئة لـ GRAM.',

    campaignPending:
      'تم إرسال الحملة للمراجعة',

    exclusiveMissions:
      'مهام حصرية',

    exclusiveSub:
      'حملات شركاء MAI ومهام محدودة.',

    noCampaigns:
      'لا توجد حملات حصرية حالياً.',

    open:
      'فتح',

    inviteFriends:
      'دعوة الأصدقاء',

    inviteHero:
      'ابنِ شبكة MAI الخاصة بك',

    inviteDescription:
      'ادعُ مستخدمين حقيقيين وافتح مكافآت المراحل.',

    successful:
      'ناجح',

    pendingFriends:
      'قيد الانتظار',

    maiEarned:
      'MAI المكتسب',

    inviteFriend:
      'دعوة صديق',

    copyLink:
      'نسخ الرابط',

    copied:
      'تم نسخ رابط الدعوة',

    milestones:
      'مكافآت المراحل',

    referralHistory:
      'سجل الدعوات',

    noReferrals:
      'لا توجد دعوات بعد.',

    profileCenter:
      'مركز الحساب',

    walletCenter:
      'مركز المحفظة',

    connected:
      'متصل',

    notConnected:
      'غير متصل',

    maiHolding:
      'رصيد MAI',

    holdingDescription:
      'رصيد المحفظة + داخل التطبيق يحدد مستوى التعدين.',

    withdraw:
      'سحب MAI',

    withdrawSub:
      'مركز السحب الآمن',

    securityCenter:
      'مركز الأمان',

    telegramAuth:
      'مصادقة Telegram',

    walletBinding:
      'ربط المحفظة',

    active:
      'نشط',

    required:
      'مطلوب',

    lockedBalance:
      'الرصيد المقفل',

    settingsHelp:
      'الإعدادات والمساعدة',

    notifications:
      'الإشعارات',

    sound:
      'المؤثرات الصوتية',

    language:
      'اللغة',

    termsPrivacy:
      'الشروط والخصوصية',

    support:
      'الدعم',

    on:
      'تشغيل',

    off:
      'إيقاف',

    english:
      'English',

    arabic:
      'العربية',

    russian:
      'Русский',

    settingsSaved:
      'تم حفظ الإعدادات',

    termsTitle:
      'الشروط والخصوصية',

    termsIntro:
      'توفر شبكة MAI أدوات التعدين والمكافآت والمحفظة والإعلانات داخل Telegram.',

    termsRewardsTitle:
      'المكافآت والتعدين',

    termsRewards:
      'تعتمد المكافآت داخل التطبيق على قواعد شبكة MAI وقد تتغير مع تطور المشروع.',

    termsWalletTitle:
      'المحفظة والبلوكشين',

    termsWallet:
      'تبقى المحفظة تحت سيطرة المستخدم. معاملات البلوكشين قد تكون غير قابلة للعكس.',

    termsDataTitle:
      'الخصوصية والبيانات',

    termsData:
      'قد تتم معالجة معلومات Telegram ومعرف الجهاز وعنوان المحفظة والنشاط لأغراض الأمان والمكافآت.',

    termsExternalTitle:
      'الروابط الخارجية',

    termsExternal:
      'قد تؤدي حملات الشركاء إلى خدمات خارجية ويجب مراجعة شروطها قبل الاستخدام.',

    termsPromoTitle:
      'الإعلانات',

    termsPromo:
      'تتطلب الحملات الإعلانية الدفع والموافقة وقد يتم رفض الحملات المضللة.',

    close:
      'إغلاق',

    withdrawTitle:
      'سحب',

    availableBalance:
      'الرصيد المتاح',

    minimum:
      'الحد الأدنى',

    amount:
      'المبلغ',

    destination:
      'الوجهة',

    max:
      'الكل',

    holdWithdraw:
      'اضغط للسحب',

    withdrawalHistory:
      'سجل السحب',

    noWithdrawals:
      'لا توجد عمليات سحب.',

    openTelegram:
      'فتح Telegram',

    somethingWrong:
      'حدث خطأ',

    insideTelegram:
      'افتح التطبيق داخل Telegram.',

    loading:
      'جارٍ التحميل...',

    walletUpdated:
      'تم تحديث رصيد المحفظة',

    farmStarted:
      'بدأ التعدين المستمر',

    availableIn:
      'متاح خلال',

    rewardClaimed:
      'تم استلام المكافأة',

    taskVerified:
      'تم التحقق. استلم مكافأتك.',

    taskNotJoined:
      'لم تنضم بعد. انضم ثم حاول مجدداً.',

    supportOpening:
      'جارٍ فتح الدعم...'

  },


  ru: {

    appName:
      'MAI NETWORK',

    online:
      'Онлайн',

    slogan:
      'Большие мечты · Высокие цели',

    home:
      'Главная',

    tasks:
      'Задания',

    friends:
      'Друзья',

    profile:
      'Профиль',

    totalBalance:
      'ОБЩИЙ БАЛАНС MAI',

    inGame:
      'В ИГРЕ',

    wallet:
      'КОШЕЛЁК',

    level:
      'УРОВЕНЬ',

    walletHolding:
      'MAI В КОШЕЛЬКЕ',

    connectWallet:
      'Подключить кошелёк',

    refresh:
      'Обновить',

    autoMining:
      'АВТОМАЙНИНГ',

    farmingTime:
      'ВРЕМЯ МАЙНИНГА',

    boost:
      'БУСТ',

    farmReward:
      'НАГРАДА',

    startFarming:
      'НАЧАТЬ МАЙНИНГ',

    claim:
      'ПОЛУЧИТЬ',

    claimed:
      'ПОЛУЧЕНО',

    ready:
      'ГОТОВО',

    pending:
      'Ожидание',

    serverMining:
      'Майнинг рассчитывается сервером',

    claimReward:
      'Получите награду',

    nextCycle:
      'Следующий цикл начнётся автоматически',

    perDay:
      'MAI / день',

    perSecond:
      'MAI / сек',

    tapCoin:
      'НАЖМИТЕ MAI',

    tapHint:
      'Усильте свою сеть',

    together:
      'ВМЕСТЕ МЫ СТРОИМ ЛУЧШЕЕ БУДУЩЕЕ',

    boostCenter:
      'Центр мощности майнинга',

    boostIntro:
      'Количество MAI определяет уровень и ежедневную мощность майнинга.',

    currentLevel:
      'Текущий уровень',

    unlocked:
      'ОТКРЫТО',

    locked:
      'ЗАКРЫТО',

    levelUnlocked:
      'УРОВЕНЬ ОТКРЫТ',

    levelLocked:
      'УРОВЕНЬ ЗАКРЫТ',

    requiredHolding:
      'Необходимо MAI',

    currentHolding:
      'Текущий баланс',

    miningPower:
      'Мощность майнинга',

    baseMining:
      'Базовый майнинг',

    levelBonus:
      'Бонус уровня',

    totalDailyMining:
      'Майнинг за день',

    nextLevel:
      'Следующий уровень',

    maxLevel:
      'МАКС. УРОВЕНЬ',

    daily:
      'Ежедневно',

    partner:
      'Партнёры',

    exclusive:
      'Эксклюзив',

    dailyTasks:
      'Ежедневные задания',

    dailyTasksSub:
      'Выполняйте проверенные задания и получайте MAI каждый день.',

    watchAds:
      'Смотрите рекламу',

    dailyLimit:
      'Дневной лимит',

    utcReset:
      'Сброс в 00:00 UTC',

    watch:
      'СМОТРЕТЬ',

    join:
      'ВСТУПИТЬ',

    check:
      'ПРОВЕРИТЬ',

    tryAgain:
      'ЕЩЁ РАЗ',

    reward:
      'Награда',

    membershipRequired:
      'Требуется подписка в Telegram',

    verified:
      'ПРОВЕРЕНО',

    completedToday:
      'Выполнено сегодня',

    checking:
      'Проверка...',

    claiming:
      'Получение...',

    partnerPromotions:
      'Партнёрская реклама',

    promoteSubtitle:
      'Продвигайте канал, группу, бота или проект в сообществе MAI.',

    addPromote:
      'ДОБАВИТЬ РЕКЛАМУ',

    premiumReach:
      'Охватите пользователей MAI',

    premiumReachText:
      'Создайте кампанию, выберите цель и отправьте её на проверку.',

    approval:
      'Проверка администратора',

    tracking:
      'Отслеживание',

    payment:
      'MAI / GRAM',

    campaignType:
      'Тип рекламы',

    campaignTitle:
      'Название кампании',

    campaignLink:
      'Ссылка',

    campaignDescription:
      'Описание',

    completions:
      'Количество выполнений',

    promotionPackage:
      'Пакет продвижения',

    paymentMethod:
      'Способ оплаты',

    promotionCost:
      'Стоимость',

    gramEquivalent:
      'Эквивалент GRAM',

    maiEquivalent:
      'Эквивалент MAI',

    paymentWallet:
      'Кошелёк оплаты',

    walletNotConfigured:
      'Кошелёк оплаты будет добавлен позже',

    submitPromotion:
      'ОТПРАВИТЬ КАМПАНИЮ',

    submitting:
      'Отправка...',

    promoteNotice:
      '100 выполнений = 0.2 GRAM. Оплата MAI рассчитывается по эквиваленту GRAM.',

    campaignPending:
      'Кампания отправлена на проверку',

    exclusiveMissions:
      'Эксклюзивные задания',

    exclusiveSub:
      'Официальные партнёрские кампании MAI.',

    noCampaigns:
      'Эксклюзивных кампаний пока нет.',

    open:
      'ОТКРЫТЬ',

    inviteFriends:
      'Пригласить друзей',

    inviteHero:
      'Создайте свою сеть MAI',

    inviteDescription:
      'Приглашайте реальных пользователей и открывайте награды.',

    successful:
      'Успешно',

    pendingFriends:
      'Ожидание',

    maiEarned:
      'Заработано MAI',

    inviteFriend:
      'ПРИГЛАСИТЬ',

    copyLink:
      'КОПИРОВАТЬ',

    copied:
      'Ссылка скопирована',

    milestones:
      'Награды за этапы',

    referralHistory:
      'История приглашений',

    noReferrals:
      'Приглашений пока нет.',

    profileCenter:
      'Центр аккаунта',

    walletCenter:
      'Кошелёк',

    connected:
      'Подключён',

    notConnected:
      'Не подключён',

    maiHolding:
      'MAI Holding',

    holdingDescription:
      'MAI в кошельке и приложении определяют ваш уровень.',

    withdraw:
      'Вывести MAI',

    withdrawSub:
      'Безопасный центр вывода',

    securityCenter:
      'Центр безопасности',

    telegramAuth:
      'Telegram авторизация',

    walletBinding:
      'Привязка кошелька',

    active:
      'Активно',

    required:
      'Требуется',

    lockedBalance:
      'Заблокировано',

    settingsHelp:
      'Настройки и помощь',

    notifications:
      'Уведомления',

    sound:
      'Звуковые эффекты',

    language:
      'Язык',

    termsPrivacy:
      'Условия и конфиденциальность',

    support:
      'Поддержка',

    on:
      'ВКЛ',

    off:
      'ВЫКЛ',

    english:
      'English',

    arabic:
      'العربية',

    russian:
      'Русский',

    settingsSaved:
      'Настройки сохранены',

    termsTitle:
      'Условия и конфиденциальность',

    termsIntro:
      'MAI Network предоставляет инструменты майнинга, наград, кошелька и продвижения в Telegram.',

    termsRewardsTitle:
      'Награды и майнинг',

    termsRewards:
      'Награды зависят от правил MAI Network и могут изменяться по мере развития проекта.',

    termsWalletTitle:
      'Кошелёк и блокчейн',

    termsWallet:
      'Пользователь сохраняет контроль над кошельком. Блокчейн-транзакции могут быть необратимыми.',

    termsDataTitle:
      'Конфиденциальность',

    termsData:
      'Для безопасности и наград могут обрабатываться Telegram-данные, идентификатор устройства и адрес кошелька.',

    termsExternalTitle:
      'Внешние ссылки',

    termsExternal:
      'Партнёрские ссылки могут вести на сторонние сервисы.',

    termsPromoTitle:
      'Продвижение',

    termsPromo:
      'Рекламные кампании требуют оплаты и одобрения администратора.',

    close:
      'ЗАКРЫТЬ',

    withdrawTitle:
      'ВЫВОД',

    availableBalance:
      'Доступный баланс',

    minimum:
      'Минимум',

    amount:
      'Сумма',

    destination:
      'Адрес',

    max:
      'МАКС',

    holdWithdraw:
      'ВЫВЕСТИ MAI',

    withdrawalHistory:
      'История вывода',

    noWithdrawals:
      'Выводов пока нет.',

    openTelegram:
      'Открыть Telegram',

    somethingWrong:
      'Произошла ошибка',

    insideTelegram:
      'Откройте Mini App внутри Telegram.',

    loading:
      'ЗАГРУЗКА...',

    walletUpdated:
      'Баланс кошелька обновлён',

    farmStarted:
      'Непрерывный майнинг запущен',

    availableIn:
      'Доступно через',

    rewardClaimed:
      'Награда получена',

    taskVerified:
      'Задание проверено. Получите награду.',

    taskNotJoined:
      'Вы ещё не вступили. Вступите и повторите.',

    supportOpening:
      'Открываем поддержку...'

  }

};


/* =========================================================
   TRANSLATOR
   ========================================================= */

function makeTranslator(
  language
) {

  const selected =
    TEXT[language] ||
    TEXT.en;


  return key =>

    selected[key] ??

    TEXT.en[key] ??

    key;

}


/* =========================================================
   LANGUAGE NAME
   ========================================================= */

function languageName(
  code
) {

  const map = {

    en:
      'English',

    ar:
      'العربية',

    ru:
      'Русский'

  };


  return (
    map[code] ||
    'English'
  );

}


/* =========================================================
   OPEN EXTERNAL / TELEGRAM LINK
   ========================================================= */

function openLink(
  url
) {

  if (
    !url
  ) {

    return;

  }


  const web =
    tg();


  try {

    if (
      /^https:\/\/t\.me\//i.test(
        url
      ) &&
      web?.openTelegramLink
    ) {

      web.openTelegramLink(
        url
      );


    } else if (
      web?.openLink
    ) {

      web.openLink(
        url
      );


    } else {

      window.open(
        url,
        '_blank',
        'noopener,noreferrer'
      );

    }


  } catch {

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );

  }

}


/* =========================================================
   HAPTIC
   ========================================================= */

function haptic(
  type = 'light'
) {

  try {

    tg()
      ?.HapticFeedback
      ?.impactOccurred(
        type
      );

  } catch {}

}


/* =========================================================
   SOUND ENGINE
   ========================================================= */

let audioContext =
  null;


function getAudioContext() {

  const AudioCtx =

    window.AudioContext ||

    window.webkitAudioContext;


  if (
    !AudioCtx
  ) {

    return null;

  }


  if (
    !audioContext
  ) {

    audioContext =
      new AudioCtx();

  }


  if (
    audioContext.state ===
    'suspended'
  ) {

    audioContext
      .resume()
      .catch(
        () => {}
      );

  }


  return audioContext;

}


/* =========================================================
   SHORT UI CLICK
   ========================================================= */

function playUiSound(
  enabled = true
) {

  if (
    !enabled
  ) {

    return;

  }


  try {

    const ctx =
      getAudioContext();


    if (!ctx) return;


    const now =
      ctx.currentTime;


    const osc =
      ctx.createOscillator();


    const gain =
      ctx.createGain();


    osc.type =
      'sine';


    osc.frequency
      .setValueAtTime(
        540,
        now
      );


    osc.frequency
      .exponentialRampToValueAtTime(
        720,
        now + 0.045
      );


    gain.gain
      .setValueAtTime(
        0.0001,
        now
      );


    gain.gain
      .exponentialRampToValueAtTime(
        0.11,
        now + 0.006
      );


    gain.gain
      .exponentialRampToValueAtTime(
        0.0001,
        now + 0.075
      );


    osc.connect(
      gain
    );


    gain.connect(
      ctx.destination
    );


    osc.start(
      now
    );


    osc.stop(
      now + 0.08
    );


  } catch {}

}


/* =========================================================
   REWARD / COIN SOUND
   ========================================================= */

function playRewardSound(
  enabled = true
) {

  if (
    !enabled
  ) {

    return;

  }


  try {

    const ctx =
      getAudioContext();


    if (!ctx) return;


    const now =
      ctx.currentTime;


    const tones = [

      {
        hz:
          880,

        start:
          0,

        end:
          0.18,

        gain:
          0.18
      },

      {
        hz:
          1320,

        start:
          0.045,

        end:
          0.24,

        gain:
          0.06
      },

      {
        hz:
          1760,

        start:
          0.10,

        end:
          0.28,

        gain:
          0.04
      }

    ];


    tones.forEach(
      tone => {

        const osc =
          ctx.createOscillator();


        const gain =
          ctx.createGain();


        osc.type =
          'sine';


        osc.frequency
          .setValueAtTime(
            tone.hz,
            now +
            tone.start
          );


        gain.gain
          .setValueAtTime(
            0.0001,
            now +
            tone.start
          );


        gain.gain
          .exponentialRampToValueAtTime(
            tone.gain,
            now +
            tone.start +
            0.015
          );


        gain.gain
          .exponentialRampToValueAtTime(
            0.0001,
            now +
            tone.end
          );


        osc.connect(
          gain
        );


        gain.connect(
          ctx.destination
        );


        osc.start(
          now +
          tone.start
        );


        osc.stop(
          now +
          tone.end +
          0.02
        );

      }
    );


    haptic(
      'medium'
    );


  } catch {}

}


/* =========================================================
   ICON
   ========================================================= */

function Icon({ name }) {
  const icons = {
    home: (
      <>
        <path
          d="M3.5 11.2 12 4l8.5 7.2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M5.5 10.2V20h13v-9.8M9.5 20v-5.5h5V20"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

    task: (
      <>
        <rect
          x="5"
          y="4"
          width="14"
          height="16"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8.5 9.5 10 11l2.5-3M8.5 15h7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

    friends: (
      <>
        <circle
          cx="9"
          cy="9"
          r="3"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M3.8 19c.5-3.2 2.4-5 5.2-5s4.7 1.8 5.2 5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle
          cx="16.5"
          cy="9.5"
          r="2.2"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity="0.7"
        />
        <path
          d="M15.5 14.3c2.7-.2 4.3 1.3 4.7 3.8"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.7"
        />
      </>
    ),

    profile: (
      <>
        <circle
          cx="12"
          cy="8"
          r="3.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M5.5 20c.5-4 2.8-6.2 6.5-6.2s6 2.2 6.5 6.2"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),

    gift: (
      <>
        <rect
          x="4"
          y="9"
          width="16"
          height="11"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M3.5 9h17V6.5h-17V9ZM12 6.5V20"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="M12 6.5c-1.2-3.5-5.2-4.1-5.2-1.3 0 1.5 1.6 1.8 5.2 1.3ZM12 6.5c1.2-3.5 5.2-4.1 5.2-1.3 0 1.5-1.6 1.8-5.2 1.3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </>
    ),

    rocket: (
      <>
        <path
          d="M14.2 4.3c2.1-1.2 4.1-1.3 5.5-1.1.2 1.5.1 3.5-1.1 5.6l-6.3 6.3-3.4-3.4 5.3-7.4Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx="15.8"
          cy="7.2"
          r="1.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="m9.2 10.7-3.8.8-2.2 2.2 5.1.5M13 14.3l-.7 4-2.2 2.2-.6-5.2M6 18l-2 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

    wallet: (
      <>
        <rect
          x="3.5"
          y="6"
          width="17"
          height="13"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M4.5 8.5h12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M15 11.5h5.5v4H15a2 2 0 0 1 0-4Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <circle cx="16.5" cy="13.5" r=".7" fill="currentColor" />
      </>
    ),

    bolt: (
      <>
        <path
          d="M13.2 2.5L5.8 13h5.1l-.7 8.5L18.3 10h-5.2l.1-7.5Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M16.8 4.8l1.2-1.2M19.2 7.2h1.7M5.2 17.3 4 18.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          opacity="0.65"
        />
      </>
    ),

    clock: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M12 7.5V12L15.2 14"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 2.8H16"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.65"
        />
      </>
    ),

    shield: (
      <>
        <path
          d="M12 2.8L19 5.6V10.8C19 15.4 16.2 19.1 12 21.2C7.8 19.1 5 15.4 5 10.8V5.6L12 2.8Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.8 11.8L11 14L15.6 9.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

    globe: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M3.8 12H20.2"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        <path
          d="M12 3.5c2.3 2.3 3.5 5.1 3.5 8.5s-1.2 6.2-3.5 8.5M12 3.5C9.7 5.8 8.5 8.6 8.5 12s1.2 6.2 3.5 8.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </>
    ),

    bell: (
      <>
        <path
          d="M6.5 9.5C6.5 6.4 8.8 4 12 4s5.5 2.4 5.5 5.5v3.7L19 16H5l1.5-2.8V9.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.5 18c.5 1.2 1.3 1.8 2.5 1.8s2-.6 2.5-1.8M12 2.5V4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),

    sound: (
      <>
        <path
          d="M5 10v4h3l4 3V7l-4 3H5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 9c1 .8 1.5 1.8 1.5 3s-.5 2.2-1.5 3M17.5 6.8C19.1 8.2 20 10 20 12s-.9 3.8-2.5 5.2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),

    support: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8.5 9.5a3.5 3.5 0 0 1 7 0c0 2.5-3.5 2.5-3.5 5"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17.5" r=".8" fill="currentColor" />
      </>
    ),

    terms: (
      <>
        <rect
          x="5"
          y="3.5"
          width="14"
          height="17"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),

    people: (
      <>
        <circle
          cx="9"
          cy="8.5"
          r="2.8"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <circle
          cx="16.5"
          cy="9.5"
          r="2.2"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M3.8 19c.4-3.3 2.3-5.1 5.2-5.1s4.8 1.8 5.2 5.1M14.5 14.5c3-.3 5 1.3 5.5 4"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </>
    ),

    crown: (
      <>
        <path
          d="m4 7 4 4 4-6 4 6 4-4-1.5 11h-13L4 7Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6 18h12"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),

    check: (
      <>
        <circle
          cx="12"
          cy="12"
          r="8.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="m8 12.2 2.6 2.6 5.7-6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),

    star: (
      <path
        d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),

    ad: (
      <>
        <rect
          x="3.5"
          y="5"
          width="17"
          height="14"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="m10 9 5 3-5 3V9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </>
    ),

    link: (
      <>
        <path
          d="m9.5 14.5-1.7 1.7a3.2 3.2 0 0 1-4.5-4.5l3.3-3.3a3.2 3.2 0 0 1 4.5 0"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="m14.5 9.5 1.7-1.7a3.2 3.2 0 0 1 4.5 4.5l-3.3 3.3a3.2 3.2 0 0 1-4.5 0"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="m8.8 15.2 6.4-6.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </>
    ),

    copy: (
      <>
        <rect
          x="8"
          y="8"
          width="11"
          height="11"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </>
    ),

    lock: (
      <>
        <rect
          x="5"
          y="10"
          width="14"
          height="10"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path
          d="M8 10V7.5a4 4 0 0 1 8 0V10"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="12" cy="15" r="1" fill="currentColor" />
      </>
    ),
      news: (
    <>
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M8 9h8M8 13h8M8 17h5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),

  
  };

  const icon = icons[name];

  if (!icon) {
    return null;
  }

  return (
    <span className="ico premiumIcon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {icon}
      </svg>
    </span>
  );

  const map = {

    home:
      '⌂',

    task:
      '✓',

    friends:
      '♟',

    profile:
      '♙',

    gift:
     '◆',

   rocket:
    '▲',

    wallet:
      '◈',

   bolt:
    '✦',

    clock:
      '◷',

    shield:
      '◆',

    globe:
      '◎',

    bell:
      '◉',

    sound:
      '♪',

    support:
      '✉',

    terms:
      '▤',

    people:
      '♟',

    crown:
      '♛',

    check:
      '✓',

    star:
      '✦',

    ad:
      '▶',

    link:
      '↗',

    copy:
      '⧉',

    lock:
      '◆'

  };


  return (

    <span
      className="ico"
      aria-hidden="true"
    >

      {
        map[name] ||
        '✦'
      }

    </span>

  );

}


/* =========================================================
   MAI LOGO
   ========================================================= */

function MaiLogo({
  className = '',
  alt = 'MAI'
}) {

  return (

    <img
      className={
        className
      }

      src={
        LOGO
      }

      alt={
        alt
      }

      draggable="false"

      decoding="async"

      loading="eager"
      style={{ borderRadius: '50%', objectFit: 'cover' }}
    />

  );

}


/* =========================================================
   TOAST
   ========================================================= */

function Toast({
  text,
  onDone
}) {

  useEffect(
    () => {

      const timer =
        setTimeout(
          onDone,
          2800
        );


      return () =>
        clearTimeout(
          timer
        );

    },
    [
      onDone
    ]
  );


  return (

    <div
      className="toast"
      role="status"
    >

      {text}

    </div>

  );

}


/* =========================================================
   LOADING SCREEN
   ========================================================= */

function LoadingScreen({
  done,
  text
}) {

  const [
    progress,
    setProgress
  ] =
    useState(
      0
    );


  useEffect(
    () => {

      let value =
        0;


      const timer =
        setInterval(
          () => {

            value =
              Math.min(
                100,
                value +
                Math.ceil(
                  Math.random() *
                  7
                )
              );


            setProgress(
              value
            );


            if (
              value >=
              100
            ) {

              clearInterval(
                timer
              );


              setTimeout(
                done,
                220
              );

            }

          },
          85
        );


      return () =>
        clearInterval(
          timer
        );

    },
    [
      done
    ]
  );


  return (

    <div
      className="loading"

      style={{
        backgroundImage:
          `url(${LOADING})`
      }}
    >

      <div className="loadBox">

        <MaiLogo
          className="loadingLogo"
        />


        <div className="initializing">

          {
            text ||
            'INITIALIZING...'
          }

        </div>


        <div className="bar">

          <i
            style={{
              width:
                `${progress}%`
            }}
          />

        </div>


        <b>
          {progress}%
        </b>

      </div>

    </div>

  );

}


/* =========================================================
   BACKGROUND
   ========================================================= */

function Background() {

  return (

    <div
      className="bg"
      aria-hidden="true"
    >

      <div
        className="bgImage"

        style={{
          backgroundImage:
            `url(${BG})`
        }}
      />


      <div className="bgShade" />

      <div className="cloud c1" />

      <div className="cloud c2" />

      <div className="water" />

      <div className="stars" />

      <div className="beam" />

    </div>

  );

}


/* =========================================================
   PAGE SHELL
   ========================================================= */

function PageShell({
  title,
  back,
  children,
  playClick
}) {

  return (

    <div className="pageShell">

      <header className="pageHeader">

        <button
          className="backBtn"

          onClick={() => {

            playClick?.();

            back?.();

          }}

          aria-label="Back"
        >

          ‹

        </button>


        <div>

          <MaiLogo />

          <strong>
            {title}
          </strong>

        </div>


        <span className="headerSpace" />

      </header>


      <div className="pageContent">

        {children}

      </div>

    </div>

  );

}


/* =========================================================
   APP
   ========================================================= */

function App() {

  const [
    loading,
    setLoading
  ] =
    useState(
      true
    );


  const [
    boot,
    setBoot
  ] =
    useState(
      null
    );


  const [
    tab,
    setTab
  ] =
    useState(
      'home'
    );


  const [
    view,
    setView
  ] =
    useState(
      'main'
    );


  const [
    toast,
    setToast
  ] =
    useState(
      ''
    );


  const [
    busy,
    setBusy
  ] =
    useState(
      false
    );
  const [
    isAdmin,
    setIsAdmin
  ] =
    useState(
      false
    );

  const [
    selectedLevel,
    setSelectedLevel
  ] =
    useState(
      null
    );


  const [
    tasks,
    setTasks
  ] =
    useState(
      null
    );


  const [
    referrals,
    setReferrals
  ] =
    useState(
      null
    );


  const [
    withdrawals,
    setWithdrawals
  ] =
    useState(
      null
    );


  const address =
    useTonAddress();

      useEffect(
    () => {
      let cancelled = false;

      const checkAdminAccess =
        async () => {
          try {
            await api(
              '/admin/me'
            );

            if (!cancelled) {
              setIsAdmin(
                true
              );
            }
          } catch {
            if (!cancelled) {
              setIsAdmin(
                false
              );
            }
          }
        };

      checkAdminAccess();

      return () => {
        cancelled = true;
      };
    },
    []
  );


  /* =======================================================
     USER PREFERENCES
     ======================================================= */

  const preferences =

    boot?.user
      ?.preferences ||

    {
      language:
        'en',

      notificationsEnabled:
        true,

      soundEnabled:
        true
    };


  const language =
    preferences.language ||
    'en';


  const t =
    useMemo(
      () =>
        makeTranslator(
          language
        ),
      [
        language
      ]
    );


  const rtl =
    language ===
    'ar';


  const soundEnabled =
    preferences
      .soundEnabled !==
    false;


  /* =======================================================
     CLICK SOUND
     ======================================================= */

  const playClick =
    useCallback(
      () => {

        playUiSound(
          soundEnabled
        );


        haptic(
          'light'
        );

      },
      [
        soundEnabled
      ]
    );


  /* =======================================================
     REWARD SOUND
     ======================================================= */

  const playReward =
    useCallback(
      () => {

        playRewardSound(
          soundEnabled
        );

      },
      [
        soundEnabled
      ]
    );


  /* =======================================================
     PRELOAD IMAGES
     ======================================================= */

  useEffect(
    () => {

      [
        LOGO,
        BG,
        LOADING
      ].forEach(
        src => {

          const image =
            new Image();


          image.src =
            src;


          image
            .decode?.()
            .catch(
              () => {}
            );

        }
      );

    },
    []
  );


  /* =======================================================
     TELEGRAM SETUP
     ======================================================= */

  useEffect(
    () => {

      const web =
        tg();


      if (
        !web
      ) {

        return;

      }


      try {

        web.ready();

        web.expand();


        web.setHeaderColor?.(
          '#05070d'
        );


        web.setBackgroundColor?.(
          '#05070d'
        );


        web.disableVerticalSwipes?.();


      } catch {}

    },
    []
  );


  /* =======================================================
     BOOTSTRAP
     ======================================================= */

    const refresh =
    useCallback(
      async () => {

        const data =
          await api(
            '/api/bootstrap'
          );


        setBoot(
          data
        );


        setTasks(
          data.tasks
        );


        setToast(
          ''
        );


        return data;

      },
      []
    );


  useEffect(
    () => {

      let cancelled =
        false;

      let retryTimer =
        null;


      const bootstrapApp =
        async () => {

          /*
            Telegram Android WebView can expose
            window.Telegram.WebApp before initData
            is fully available.

            Wait briefly for initData before sending
            the authenticated bootstrap request.
          */

          const maxWaitMs =
            4000;

          const intervalMs =
            100;

          const startedAt =
            Date.now();


          while (
            !cancelled &&
            !tg()?.initData &&
            !process.env.REACT_APP_DEV_USER_ID &&
            Date.now() - startedAt < maxWaitMs
          ) {

            await new Promise(
              resolve =>
                setTimeout(
                  resolve,
                  intervalMs
                )
            );

          }


          if (
            cancelled
          ) {

            return;

          }


          try {

            await refresh();


          } catch (
            error
          ) {

            if (
              cancelled
            ) {

              return;

            }


            /*
              A Telegram startup race can still happen
              on a slow WebView. Retry bootstrap once
              after a short delay.
            */

            retryTimer =
              setTimeout(
                async () => {

                  if (
                    cancelled
                  ) {

                    return;

                  }


                  try {

                    await refresh();


                  } catch (
                    retryError
                  ) {

                    if (
                      !cancelled
                    ) {

                      setToast(
                        retryError.message
                      );

                    }

                  }

                },
                700
              );

          }

        };


      bootstrapApp();


      return () => {

        cancelled =
          true;


        if (
          retryTimer
        ) {

          clearTimeout(
            retryTimer
          );

        }

      };

    },
    [
      refresh
    ]
  );


  /* =======================================================
     TON WALLET BINDING
     ======================================================= */

  useEffect(
    () => {

      if (
        !address ||
        !boot?.user
      ) {

        return;

      }


      if (
        address ===
        boot.user
          .walletAddress
      ) {

        return;

      }


      api(
        '/api/wallet/bind',
        {
          method:
            'POST',

          body: {
            address
          }
        }
      )
        .then(
          data => {

            setBoot(
              old => ({

                ...old,

                user:
                  data.user

              })
            );

          }
        )
        .catch(
          error => {

            setToast(
              error.message
            );

          }
        );

    },
    [
      address,
      boot?.user
        ?.telegramId,
      boot?.user
        ?.walletAddress
    ]
  );


  /* =======================================================
     SAVE PREFERENCES
     ======================================================= */

  const savePreferences =
    useCallback(
      async changes => {

        const next = {

          language:
            changes.language ??
            preferences.language,

          notificationsEnabled:
            changes
              .notificationsEnabled ??
            preferences
              .notificationsEnabled,

          soundEnabled:
            changes
              .soundEnabled ??
            preferences
              .soundEnabled

        };


        /*
          Update UI immediately.
        */

        setBoot(
          old => {

            if (
              !old?.user
            ) {

              return old;

            }


            return {

              ...old,

              user: {

                ...old.user,

                preferences:
                  next

              }

            };

          }
        );


        try {

          const data =
            await api(
              '/api/preferences',
              {
                method:
                  'POST',

                body:
                  next
              }
            );


          setBoot(
            old => {

              if (
                !old?.user
              ) {

                return old;

              }


              return {

                ...old,

                user: {

                  ...old.user,

                  preferences:
                    data.preferences

                }

              };

            }
          );


          return data
            .preferences;


        } catch (
          error
        ) {

          /*
            Restore from server.
          */

          await refresh()
            .catch(
              () => {}
            );


          throw error;

        }

      },
      [
        preferences.language,
        preferences
          .notificationsEnabled,
        preferences
          .soundEnabled,
        refresh
      ]
    );


  /* =======================================================
     SAFE ACTION
     ======================================================= */

  const action =
    async fn => {

      if (
        busy
      ) {

        return;

      }


      setBusy(
        true
      );


      try {

        await fn();


      } catch (
        error
      ) {

        setToast(
          error.message
        );


      } finally {

        setBusy(
          false
        );

      }

    };


  const user =
    boot?.user;


  /* =======================================================
     LOADING
     ======================================================= */

  if (
    loading
  ) {

    return (

      <LoadingScreen
        text={
          t('loading')
        }

        done={() =>
          setLoading(
            false
          )
        }
      />

    );

  }


  /* =======================================================
     FATAL / NOT BOOTSTRAPPED
     ======================================================= */

  if (
    !boot ||
    !user
  ) {

    return (

      <div className="fatal">

        <MaiLogo />

        <h2>
          MAI NETWORK
        </h2>


        <p>

          {
            toast ||
            t(
              'insideTelegram'
            )
          }

        </p>


        <button
          className="goldBtn"

          onClick={() => {

            playClick();

            refresh()
              .catch(
                error =>
                  setToast(
                    error.message
                  )
              );

          }}
        >

          RETRY

        </button>

      </div>

    );

  }


  /* =======================================================
     NAVIGATION
     ======================================================= */

  const go =
    nextTab => {

      playClick();


      setTab(
        nextTab
      );


      setView(
        'main'
      );

  };


  const openView =
    nextView => {

      playClick();


      setView(
        nextView
      );

  };


  const closeView =
    () => {

      playClick();


      setView(
        'main'
      );

  };


  const supportUrl =

    boot?.config
      ?.supportUrl ||

    'https://t.me/MAI_News_Official';


  const promoteConfig =

    boot?.config
      ?.promote ||

    {};


  /* =======================================================
     MAIN APP
     ======================================================= */

  return (

    <div
      className={
        `app ${
          rtl
            ? 'rtl'
            : 'ltr'
        }`
      }

      dir={
        rtl
          ? 'rtl'
          : 'ltr'
      }

      lang={
        language
      }
    >

      <Background />


      {
        toast && (

          <Toast

            text={
              toast
            }

            onDone={() =>
              setToast(
                ''
              )
            }

          />

        )
      }


      <main className="screen">

        {
          view ===
          'boost'
            ? (

              <BoostPage

                user={
                  user
                }

                selectedLevel={
                  selectedLevel
                }

                setSelectedLevel={
                  setSelectedLevel
                }

                back={
                  closeView
                }

                t={
                  t
                }

                playClick={
                  playClick
                }

              />

            )


          : view ===
            'promote'
            ? (

              <PromotePage

                back={
                  closeView
                }

                user={
                  user
                }

                config={
                  promoteConfig
                }

                toast={
                  setToast
                }

                refresh={
                  refresh
                }

                t={
                  t
                }

                playClick={
                  playClick
                }

              />

            )


          : view ===
            'withdraw'
            ? (

              <WithdrawPage

                back={
                  closeView
                }

                user={
                  user
                }

                setBoot={
                  setBoot
                }

                toast={
                  setToast
                }

                playReward={
                  playReward
                }

                t={
                  t
                }

                playClick={
                  playClick
                }

              />

            )


          : view ===
            'terms'
            ? (

              <TermsPage

                back={
                  closeView
                }

                t={
                  t
                }

                playClick={
                  playClick
                }

              />

            )

                    : view ===
            'giveaway'
            ? (

              <GiveawayPage
                back={closeView}
                toast={setToast}
                playClick={playClick}
              />

            )

                    : view ===
            'admin'
            ? (

              <AdminPanel
                back={
                  closeView
                }
              />

            )
          : tab ===
            'home'
            ? (

              <Home

                user={
                  user
                }

                walletAddress={
                  address ||
                  user
                    .walletAddress
                }

                tasks={
                  tasks
                }

                setTab={
                  go
                }

                setView={
                  openView
                }

                refresh={
                  refresh
                }

                toast={
                  setToast
                }

                busy={
                  busy
                }

                action={
                  action
                }

                t={
                  t
                }

                playClick={
                  playClick
                }

                playReward={
                  playReward
                }

              />

            )


          : tab ===
            'task'
            ? (

              <Tasks
                initData={tg()?.initData || ''}
                onUserUpdate={nextUser => {
                  if (!nextUser) return;
                  setBoot(old => ({
                    ...old,
                    user: nextUser
                  }));
                }}
              />

            )


          : tab ===
            'friends'
            ? (

              <Friends
                user={user}
                initData={tg()?.initData || ''}
                apiUrl={API}
              />

            )


          : (

              <ProfilePage

                user={
                  user
                }

                openWithdraw={() =>
                  openView(
                    'withdraw'
                  )
                }

                openTerms={() =>
                  openView(
                    'terms'
                  )
                }
                               isAdmin={
                  isAdmin
                }

                openAdmin={() =>
                  openView(
                    'admin'
                  )
                }
                supportUrl={
                  supportUrl
                }

                withdrawals={
                  withdrawals
                }

                setWithdrawals={
                  setWithdrawals
                }

                toast={
                  setToast
                }

                preferences={
                  preferences
                }

                savePreferences={
                  savePreferences
                }

                languageName={
                  languageName
                }

                t={
                  t
                }

                playClick={
                  playClick
                }

              />

            )
        }

      </main>


      {
        view ===
        'main' && (
          <>
            <AnnouncementLayer
              onNavigate={cta => {
                const action = String(cta.action || '').toLowerCase();

                if (action === 'open_giveaway') {
                  openView('giveaway');
                } else if (
                  action === 'open_tasks' ||
                  action === 'open_missions'
                ) {
                  go('task');
                } else if (action === 'open_withdrawal') {
                  openView('withdraw');
                } else if (action === 'open_profile') {
                  go('profile');
                } else if (action === 'open_external' && cta.url) {
                  if (tg()?.openLink) {
                    tg().openLink(cta.url);
                  } else {
                    window.open(
                      cta.url,
                      '_blank',
                      'noopener,noreferrer'
                    );
                  }
                }
              }}
            />

            <BottomNav

            tab={
              tab
            }

            go={
              go
            }

            t={
              t
            }

            />
          </>
        )
      }

    </div>

  );

}


/* =========================================================
   END OF APP.JS PART 1 / 4
   ========================================================= */
   /* =========================================================
   APP.JS — PART 2 / 4

   HOME
   WALLET HOLDING
   FARMING
   BOOST
   LEVEL DETAILS
   ========================================================= */


/* =========================================================
   HOME
   ========================================================= */

function Home({
  user,
  walletAddress,
  tasks,
  setTab,
  setView,
  refresh,
  toast,
  busy,
  action,
  t,
  playClick,
  playReward
}) {
  const lastTapHapticRef = useRef(0);
  const coinParticlesRef = useRef(null);
  const tapAudioRef = useRef(null);
  const [holdingLoading, setHoldingLoading] = useState(false);
  const [walletHolding, setWalletHolding] = useState(Number(user?.walletHolding || 0));
  const [inGameBalance, setInGameBalance] = useState(Number(user?.inGameBalance ?? user?.balance ?? 0));
  const [totalHolding, setTotalHolding] = useState(Number(user?.totalHolding || 0));
  const [displayLevel, setDisplayLevel] = useState(Number(user?.farm?.level ?? user?.level ?? 1));
  const [livePending, setLivePending] = useState(Number(user?.farm?.pending || 0));
  const [claimRemain, setClaimRemain] = useState(Number(user?.farm?.remaining || 0));
  const [homeGiveaway, setHomeGiveaway] = useState(null);
  const [showGiveawayGift, setShowGiveawayGift] = useState(false);
  const [giveawayUnseen, setGiveawayUnseen] = useState(false);

  useEffect(() => {
    setWalletHolding(Number(user?.walletHolding || 0));
    setInGameBalance(Number(user?.inGameBalance ?? user?.balance ?? 0));
    setTotalHolding(Number(user?.totalHolding || 0));
    setDisplayLevel(Number(user?.farm?.level ?? user?.level ?? 1));
    setLivePending(Number(user?.farm?.pending || 0));
    setClaimRemain(Number(user?.farm?.remaining || 0));
  }, [
    user?.walletHolding, user?.inGameBalance, user?.balance, user?.totalHolding,
    user?.level, user?.farm?.level, user?.farm?.pending, user?.farm?.remaining
  ]);

  const baseRateDaily = Number(user?.farm?.baseRateDaily ?? user?.miningSpeed ?? 0);
  const effectiveDaily = Number(user?.farm?.rateDaily ?? (baseRateDaily * Number(user?.farm?.multiplier ?? 1)));
  const farmRateSecond = Number(user?.farm?.rateSecond ?? (effectiveDaily / 86400));
  const miningTh = Number(user?.farm?.miningTh ?? user?.miningTh ?? 0);
  const highestLevel = Number(user?.farm?.highestLevel ?? user?.highestLevel ?? displayLevel);
  const miningMultiplier = Number(user?.farm?.multiplier ?? 1);
  const miningMode = String(user?.farm?.mode || 'test').toUpperCase();
  const miningPhase = String(user?.farm?.phase || 'test').replaceAll('_', ' ').toUpperCase();

  useEffect(() => {
    let cancelled = false;

    api('/api/giveaways')
      .then(data => {
        if (cancelled) return;

        const featured =
          data.featured ||
          data.items?.[0] ||
          null;

        setHomeGiveaway(featured);
        setShowGiveawayGift(
          Boolean(data.showHomeGift && featured)
        );

        if (featured?.id) {
          let seen = false;
          try {
            seen =
              localStorage.getItem(
                `mai_giveaway_seen_${featured.id}`
              ) === '1';
          } catch {}
          setGiveawayUnseen(!seen);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHomeGiveaway(null);
          setShowGiveawayGift(false);
          setGiveawayUnseen(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Re-sync from the server whenever Home is mounted again.
  // This prevents the display-only counter from restarting from stale parent data
  // after visiting Tasks / Friends / Profile. The backend remains authoritative.
  useEffect(() => {
    refresh().catch(error => {
      console.warn('Home mining refresh failed:', error);
    });
  }, [refresh]);

  // Display-only smooth live counter. The backend remains authoritative for claims.
  // 100ms visual ticks keep the unclaimed amount moving like a calm digital counter.
  useEffect(() => {
    if (!user?.farm?.active) return undefined;

    const tickMs = 100;
    const rewardPerTick = farmRateSecond * (tickMs / 1000);
    const timer = setInterval(() => {
      setLivePending(value => value + rewardPerTick);
    }, tickMs);

    const claimTimer = setInterval(() => {
      setClaimRemain(value => Math.max(0, value - 1));
    }, 1000);

    return () => {
      clearInterval(timer);
      clearInterval(claimTimer);
    };
  }, [user?.farm?.active, farmRateSecond]);

  const refreshHolding = useCallback(async (force = false) => {
    if (!walletAddress) {
      setWalletHolding(0);
      return;
    }
    setHoldingLoading(true);
    try {
      const data = await api(
        force ? '/api/wallet/mai-balance/refresh' : '/api/wallet/mai-balance',
        force ? { method: 'POST' } : undefined
      );
      const wallet = Number(data.walletBalance ?? data.balance ?? 0);
      const inGame = Number(data.inGameBalance ?? user?.balance ?? 0);
      const total = Number(data.totalHolding ?? (wallet + inGame));
      setWalletHolding(wallet);
      setInGameBalance(inGame);
      setTotalHolding(total);
      setDisplayLevel(Number(data.level ?? user?.farm?.level ?? user?.level ?? 1));
      if (force) toast(t('walletUpdated'));
    } catch (error) {
      console.warn('Wallet holding refresh failed:', error);
      if (force) toast(error.message);
    } finally {
      setHoldingLoading(false);
    }
  }, [walletAddress, user?.balance, user?.farm?.level, user?.level, toast, t]);

  useEffect(() => {
    if (!walletAddress) return undefined;
    const timer = setInterval(() => refreshHolding(false), 30000);
    return () => clearInterval(timer);
  }, [walletAddress, refreshHolding]);

  const tapCoin = event => {
    const coin = event.currentTarget;

    // Visual-only tap feedback. Mining rewards remain server-authoritative.
    // A soft spring motion keeps the coin feeling alive without a sharp snap.
    if (typeof coin.animate === 'function') {
      // Rapid taps used to stack many transform animations at once. On some
      // Telegram Android WebViews that can force neighbouring GPU layers to
      // flicker. Keep only the newest coin animation.
      if (typeof coin.getAnimations === 'function') {
        coin.getAnimations().forEach(animation => animation.cancel());
      }

      coin.animate(
        [
          { transform: 'scale(1) translateY(0px)' },
          { transform: 'scale(0.985) translateY(2px)', offset: 0.22 },
          { transform: 'scale(1.018) translateY(-2px)', offset: 0.58 },
          { transform: 'scale(0.997) translateY(0px)', offset: 0.82 },
          { transform: 'scale(1) translateY(0px)' }
        ],
        {
          duration: 420,
          easing: 'cubic-bezier(.22,.8,.28,1)'
        }
      );
    }

    // Gentle gold particles around the tapped point. They are decorative only.
    const layer = coinParticlesRef.current;
    if (layer) {
      const rect = coin.getBoundingClientRect();
      const x = event.clientX ? event.clientX - rect.left : rect.width / 2;
      const y = event.clientY ? event.clientY - rect.top : rect.height / 2;

      // Stronger, clearly visible gold burst around the tapped point.
      // Decorative only — mining rewards remain fully server-authoritative.
      const particleCount = 16;
      const maxParticlesOnScreen = 48;

      // Bound the decorative DOM work during very fast tapping. This keeps the
      // gold burst visible without allowing hundreds of live particle nodes.
      while (layer.childElementCount > maxParticlesOnScreen - particleCount) {
        layer.firstElementChild?.remove();
      }

      for (let i = 0; i < particleCount; i += 1) {
        const particle = document.createElement('span');
        const angle =
          (Math.PI * 2 * i) / particleCount +
          (Math.random() - 0.5) * 0.42;
        const distance = 54 + Math.random() * 92;
        const size = 0.8 + Math.random() * 0.9;

        particle.className = 'maiTapParticle';
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.setProperty(
          '--tx',
          `${Math.cos(angle) * distance}px`
        );
        particle.style.setProperty(
          '--ty',
          `${Math.sin(angle) * distance - 22}px`
        );
        particle.style.setProperty(
          '--delay',
          `${Math.random() * 65}ms`
        );
        particle.style.setProperty(
          '--particle-scale',
          size.toFixed(2)
        );

        layer.appendChild(particle);
        window.setTimeout(() => particle.remove(), 1250);
      }
    }

    // Short, soft tap tone generated locally; no audio file or network request.
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = tapAudioRef.current || new AudioCtx();
        tapAudioRef.current = ctx;
        if (ctx.state === 'suspended') ctx.resume();

        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(620, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(820, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.15);
      }
    } catch {}

    const now = Date.now();
    if (now - lastTapHapticRef.current >= 100) {
      lastTapHapticRef.current = now;
      try { tg()?.HapticFeedback?.impactOccurred('soft'); } catch {}
    }
  };

  const handleFarm = () => {
    action(async () => {
      playClick();
      if (!user?.farm?.active) {
        await api('/api/farm/start', { method: 'POST' });
        toast('Continuous mining started');
        await refresh();
        return;
      }
      if (claimRemain > 0) {
        toast(`${t('availableIn')} ${hms(claimRemain)}`);
        return;
      }
      const data = await api('/api/farm/claim', { method: 'POST' });
      playReward();
      toast(`+${fmtSmart(data.reward, 6)} MAI — ${t('rewardClaimed')}`);
      setLivePending(0);
      await refresh();
    });
  };

  const walletText = !walletAddress
    ? t('connectWallet')
    : holdingLoading ? '...' : `${fmtSmart(walletHolding, 4)} MAI`;

  return (
    <div className="homePage homeV3">
      <section className="topGrid v3TopGrid">
        <div className="brand glass v3Card">
          <MaiLogo />
          <div>
            <strong>{t('appName')}</strong>
            <span><i className="online" /> {t('online')}</span>
            <small>{t('slogan')}</small>
          </div>
        </div>

        <button className="balance glass v3Card" onClick={() => setTab('profile')}>
          <div>
            <span className="balanceLabel">{t('totalBalance')}</span>
            <b className="balanceValue">{fmtSmart(totalHolding, 4)}</b>
            <small>MAI</small>
          </div>
          <em>›</em>
        </button>

        <div className="profileMini glass v3Card">
          <div className="avatar">
            {user?.photoUrl ? <img src={user.photoUrl} alt="" /> : <span>{user?.firstName?.[0] || 'M'}</span>}
          </div>
          <div className="profileMiniText">
            <span>{t('profile')}</span>
            <b>{user?.firstName || 'MAI User'}</b>
            <small>ACTIVE LVL {displayLevel} · HIGHEST {highestLevel}</small>
          </div>
        </div>

        <button className="networkPowerCard glass v3Card" onClick={() => setView('boost')}>
          <span className="networkPowerIcon"><Icon name="bolt" /></span>
          <div>
            <span>NETWORK POWER</span>
            <b>{fmtSmart(miningTh, 2)} TH/s</b>
            <small>{fmtSmart(effectiveDaily, 2)} MAI / Day</small>
          </div>
          <em>›</em>
        </button>
      </section>

      <section className="unclaimedRewardCard glass" aria-live="polite">
        <span className="unclaimedRewardLabel">UNCLAIMED MINING REWARD</span>
        <div className="unclaimedRewardValue">
          {fmtSmart(livePending, 4)}
          <small>MAI</small>
        </div>
        <div className="unclaimedRewardPower">
          <Icon name="bolt" />
          <span>Speed: <b>{fmtSmart(miningTh, 2)} TH/s</b></span>
        </div>
      </section>

      <section className="coinArea v3CoinArea">
        <span className="coinAura coinAuraOne" />
        <span className="coinAura coinAuraTwo" />
        <span className="coinAura coinAuraThree" />
        <button className="mainCoin smoothTapCoin" onClick={tapCoin} aria-label="MAI">
          <span className="coinOuterRing"><span className="coinMiddleRing"><span className="coinInner"><MaiLogo className="mainCoinLogo" /></span></span></span>
          <span className="coinShine" />
          <span className="coinShineSecond" />
          <span ref={coinParticlesRef} className="maiTapParticleLayer" aria-hidden="true" />
        </button>
        {showGiveawayGift && homeGiveaway && (
          <button
            type="button"
            className="homeGiveawayGift"
            aria-label="Open Giveaway"
            onClick={() => {
              playClick();
              try {
                localStorage.setItem(
                  `mai_giveaway_seen_${homeGiveaway.id}`,
                  '1'
                );
              } catch {}
              setGiveawayUnseen(false);
              setView('giveaway');
            }}
          >
            <Icon name="gift" />
            {giveawayUnseen && (
              <span className="homeGiveawayDot" />
            )}
          </button>
        )}

        <div className="coinTapHint"><span>{t('tapCoin')}</span><small>{t('tapHint')}</small></div>
      </section>

      <section className="v3ActionRow v3ClaimOnlyRow">
        <button className="claimAction claimActionFull claimActionSimple" disabled={busy || (user?.farm?.active && claimRemain > 0)} onClick={handleFarm}>
          <span className="actionIcon"><Icon name="gift" /></span>
          <span className="claimOnlyLabel">CLAIM NOW</span>
        </button>
      </section>

      <div className="tagline v3Tagline">✦ MAI NETWORK ✦<small>{t('together')}</small></div>
    </div>
  );
}


const MAI_MINING_LEVELS = Object.freeze([
  Object.freeze({ level: 1, requiredHolding: 0, thPerSec: 0.19, baseMaiPerDay: 6.28 }),
  Object.freeze({ level: 2, requiredHolding: 100, thPerSec: 0.19, baseMaiPerDay: 6.39 }),
  Object.freeze({ level: 3, requiredHolding: 132, thPerSec: 0.20, baseMaiPerDay: 6.51 }),
  Object.freeze({ level: 4, requiredHolding: 176, thPerSec: 0.20, baseMaiPerDay: 6.63 }),
  Object.freeze({ level: 5, requiredHolding: 233, thPerSec: 0.20, baseMaiPerDay: 6.76 }),
  Object.freeze({ level: 6, requiredHolding: 308, thPerSec: 0.21, baseMaiPerDay: 6.88 }),
  Object.freeze({ level: 7, requiredHolding: 408, thPerSec: 0.21, baseMaiPerDay: 7.01 }),
  Object.freeze({ level: 8, requiredHolding: 541, thPerSec: 0.22, baseMaiPerDay: 7.14 }),
  Object.freeze({ level: 9, requiredHolding: 717, thPerSec: 0.22, baseMaiPerDay: 7.27 }),
  Object.freeze({ level: 10, requiredHolding: 950, thPerSec: 0.22, baseMaiPerDay: 7.41 }),
  Object.freeze({ level: 11, requiredHolding: 1023, thPerSec: 0.23, baseMaiPerDay: 7.55 }),
  Object.freeze({ level: 12, requiredHolding: 1102, thPerSec: 0.23, baseMaiPerDay: 7.69 }),
  Object.freeze({ level: 13, requiredHolding: 1188, thPerSec: 0.24, baseMaiPerDay: 7.83 }),
  Object.freeze({ level: 14, requiredHolding: 1279, thPerSec: 0.24, baseMaiPerDay: 7.97 }),
  Object.freeze({ level: 15, requiredHolding: 1378, thPerSec: 0.25, baseMaiPerDay: 8.12 }),
  Object.freeze({ level: 16, requiredHolding: 1485, thPerSec: 0.25, baseMaiPerDay: 8.27 }),
  Object.freeze({ level: 17, requiredHolding: 1599, thPerSec: 0.26, baseMaiPerDay: 8.43 }),
  Object.freeze({ level: 18, requiredHolding: 1723, thPerSec: 0.26, baseMaiPerDay: 8.58 }),
  Object.freeze({ level: 19, requiredHolding: 1856, thPerSec: 0.26, baseMaiPerDay: 8.74 }),
  Object.freeze({ level: 20, requiredHolding: 1999, thPerSec: 0.27, baseMaiPerDay: 8.90 }),
  Object.freeze({ level: 21, requiredHolding: 2154, thPerSec: 0.27, baseMaiPerDay: 9.07 }),
  Object.freeze({ level: 22, requiredHolding: 2320, thPerSec: 0.28, baseMaiPerDay: 9.24 }),
  Object.freeze({ level: 23, requiredHolding: 2499, thPerSec: 0.29, baseMaiPerDay: 9.41 }),
  Object.freeze({ level: 24, requiredHolding: 2692, thPerSec: 0.29, baseMaiPerDay: 9.59 }),
  Object.freeze({ level: 25, requiredHolding: 2900, thPerSec: 0.30, baseMaiPerDay: 9.76 }),
  Object.freeze({ level: 26, requiredHolding: 3004, thPerSec: 0.30, baseMaiPerDay: 9.94 }),
  Object.freeze({ level: 27, requiredHolding: 3112, thPerSec: 0.31, baseMaiPerDay: 10.13 }),
  Object.freeze({ level: 28, requiredHolding: 3223, thPerSec: 0.31, baseMaiPerDay: 10.32 }),
  Object.freeze({ level: 29, requiredHolding: 3339, thPerSec: 0.32, baseMaiPerDay: 10.51 }),
  Object.freeze({ level: 30, requiredHolding: 3459, thPerSec: 0.32, baseMaiPerDay: 10.70 }),
  Object.freeze({ level: 31, requiredHolding: 3583, thPerSec: 0.33, baseMaiPerDay: 10.90 }),
  Object.freeze({ level: 32, requiredHolding: 3712, thPerSec: 0.34, baseMaiPerDay: 11.11 }),
  Object.freeze({ level: 33, requiredHolding: 3845, thPerSec: 0.34, baseMaiPerDay: 11.31 }),
  Object.freeze({ level: 34, requiredHolding: 3983, thPerSec: 0.35, baseMaiPerDay: 11.52 }),
  Object.freeze({ level: 35, requiredHolding: 4126, thPerSec: 0.36, baseMaiPerDay: 11.74 }),
  Object.freeze({ level: 36, requiredHolding: 4274, thPerSec: 0.36, baseMaiPerDay: 11.96 }),
  Object.freeze({ level: 37, requiredHolding: 4427, thPerSec: 0.37, baseMaiPerDay: 12.18 }),
  Object.freeze({ level: 38, requiredHolding: 4586, thPerSec: 0.38, baseMaiPerDay: 12.40 }),
  Object.freeze({ level: 39, requiredHolding: 4750, thPerSec: 0.38, baseMaiPerDay: 12.63 }),
  Object.freeze({ level: 40, requiredHolding: 4921, thPerSec: 0.39, baseMaiPerDay: 12.87 }),
  Object.freeze({ level: 41, requiredHolding: 5097, thPerSec: 0.40, baseMaiPerDay: 13.11 }),
  Object.freeze({ level: 42, requiredHolding: 5280, thPerSec: 0.40, baseMaiPerDay: 13.35 }),
  Object.freeze({ level: 43, requiredHolding: 5469, thPerSec: 0.41, baseMaiPerDay: 13.60 }),
  Object.freeze({ level: 44, requiredHolding: 5666, thPerSec: 0.42, baseMaiPerDay: 13.85 }),
  Object.freeze({ level: 45, requiredHolding: 5869, thPerSec: 0.43, baseMaiPerDay: 14.11 }),
  Object.freeze({ level: 46, requiredHolding: 6079, thPerSec: 0.44, baseMaiPerDay: 14.37 }),
  Object.freeze({ level: 47, requiredHolding: 6298, thPerSec: 0.44, baseMaiPerDay: 14.64 }),
  Object.freeze({ level: 48, requiredHolding: 6524, thPerSec: 0.45, baseMaiPerDay: 14.91 }),
  Object.freeze({ level: 49, requiredHolding: 6758, thPerSec: 0.46, baseMaiPerDay: 15.19 }),
  Object.freeze({ level: 50, requiredHolding: 7000, thPerSec: 0.47, baseMaiPerDay: 15.47 }),
  Object.freeze({ level: 51, requiredHolding: 7167, thPerSec: 0.48, baseMaiPerDay: 15.76 }),
  Object.freeze({ level: 52, requiredHolding: 7339, thPerSec: 0.49, baseMaiPerDay: 16.05 }),
  Object.freeze({ level: 53, requiredHolding: 7514, thPerSec: 0.50, baseMaiPerDay: 16.35 }),
  Object.freeze({ level: 54, requiredHolding: 7694, thPerSec: 0.50, baseMaiPerDay: 16.65 }),
  Object.freeze({ level: 55, requiredHolding: 7878, thPerSec: 0.51, baseMaiPerDay: 16.96 }),
  Object.freeze({ level: 56, requiredHolding: 8067, thPerSec: 0.52, baseMaiPerDay: 17.28 }),
  Object.freeze({ level: 57, requiredHolding: 8260, thPerSec: 0.53, baseMaiPerDay: 17.60 }),
  Object.freeze({ level: 58, requiredHolding: 8457, thPerSec: 0.54, baseMaiPerDay: 17.92 }),
  Object.freeze({ level: 59, requiredHolding: 8660, thPerSec: 0.55, baseMaiPerDay: 18.26 }),
  Object.freeze({ level: 60, requiredHolding: 8867, thPerSec: 0.56, baseMaiPerDay: 18.60 }),
  Object.freeze({ level: 61, requiredHolding: 9079, thPerSec: 0.57, baseMaiPerDay: 18.94 }),
  Object.freeze({ level: 62, requiredHolding: 9296, thPerSec: 0.58, baseMaiPerDay: 19.29 }),
  Object.freeze({ level: 63, requiredHolding: 9518, thPerSec: 0.60, baseMaiPerDay: 19.65 }),
  Object.freeze({ level: 64, requiredHolding: 9746, thPerSec: 0.61, baseMaiPerDay: 20.02 }),
  Object.freeze({ level: 65, requiredHolding: 9979, thPerSec: 0.62, baseMaiPerDay: 20.39 }),
  Object.freeze({ level: 66, requiredHolding: 10218, thPerSec: 0.63, baseMaiPerDay: 20.77 }),
  Object.freeze({ level: 67, requiredHolding: 10462, thPerSec: 0.64, baseMaiPerDay: 21.15 }),
  Object.freeze({ level: 68, requiredHolding: 10713, thPerSec: 0.65, baseMaiPerDay: 21.55 }),
  Object.freeze({ level: 69, requiredHolding: 10969, thPerSec: 0.67, baseMaiPerDay: 21.95 }),
  Object.freeze({ level: 70, requiredHolding: 11231, thPerSec: 0.68, baseMaiPerDay: 22.36 }),
  Object.freeze({ level: 71, requiredHolding: 11500, thPerSec: 0.69, baseMaiPerDay: 22.77 }),
  Object.freeze({ level: 72, requiredHolding: 11711, thPerSec: 0.70, baseMaiPerDay: 23.19 }),
  Object.freeze({ level: 73, requiredHolding: 11927, thPerSec: 0.72, baseMaiPerDay: 23.63 }),
  Object.freeze({ level: 74, requiredHolding: 12146, thPerSec: 0.73, baseMaiPerDay: 24.06 }),
  Object.freeze({ level: 75, requiredHolding: 12369, thPerSec: 0.74, baseMaiPerDay: 24.51 }),
  Object.freeze({ level: 76, requiredHolding: 12596, thPerSec: 0.76, baseMaiPerDay: 24.97 }),
  Object.freeze({ level: 77, requiredHolding: 12828, thPerSec: 0.77, baseMaiPerDay: 25.43 }),
  Object.freeze({ level: 78, requiredHolding: 13063, thPerSec: 0.78, baseMaiPerDay: 25.90 }),
  Object.freeze({ level: 79, requiredHolding: 13303, thPerSec: 0.80, baseMaiPerDay: 26.38 }),
  Object.freeze({ level: 80, requiredHolding: 13548, thPerSec: 0.81, baseMaiPerDay: 26.87 }),
  Object.freeze({ level: 81, requiredHolding: 13797, thPerSec: 0.83, baseMaiPerDay: 27.37 }),
  Object.freeze({ level: 82, requiredHolding: 14050, thPerSec: 0.84, baseMaiPerDay: 27.88 }),
  Object.freeze({ level: 83, requiredHolding: 14309, thPerSec: 0.86, baseMaiPerDay: 28.40 }),
  Object.freeze({ level: 84, requiredHolding: 14571, thPerSec: 0.88, baseMaiPerDay: 28.93 }),
  Object.freeze({ level: 85, requiredHolding: 14839, thPerSec: 0.89, baseMaiPerDay: 29.47 }),
  Object.freeze({ level: 86, requiredHolding: 15112, thPerSec: 0.91, baseMaiPerDay: 30.01 }),
  Object.freeze({ level: 87, requiredHolding: 15390, thPerSec: 0.93, baseMaiPerDay: 30.57 }),
  Object.freeze({ level: 88, requiredHolding: 15672, thPerSec: 0.94, baseMaiPerDay: 31.14 }),
  Object.freeze({ level: 89, requiredHolding: 15960, thPerSec: 0.96, baseMaiPerDay: 31.72 }),
  Object.freeze({ level: 90, requiredHolding: 16254, thPerSec: 0.98, baseMaiPerDay: 32.31 }),
  Object.freeze({ level: 91, requiredHolding: 16552, thPerSec: 1.00, baseMaiPerDay: 32.91 }),
  Object.freeze({ level: 92, requiredHolding: 16857, thPerSec: 1.02, baseMaiPerDay: 33.52 }),
  Object.freeze({ level: 93, requiredHolding: 17166, thPerSec: 1.03, baseMaiPerDay: 34.14 }),
  Object.freeze({ level: 94, requiredHolding: 17482, thPerSec: 1.05, baseMaiPerDay: 34.78 }),
  Object.freeze({ level: 95, requiredHolding: 17803, thPerSec: 1.07, baseMaiPerDay: 35.42 }),
  Object.freeze({ level: 96, requiredHolding: 18130, thPerSec: 1.09, baseMaiPerDay: 36.08 }),
  Object.freeze({ level: 97, requiredHolding: 18463, thPerSec: 1.11, baseMaiPerDay: 36.75 }),
  Object.freeze({ level: 98, requiredHolding: 18803, thPerSec: 1.13, baseMaiPerDay: 37.43 }),
  Object.freeze({ level: 99, requiredHolding: 19148, thPerSec: 1.16, baseMaiPerDay: 38.13 }),
  Object.freeze({ level: 100, requiredHolding: 19500, thPerSec: 1.18, baseMaiPerDay: 38.84 }),
  Object.freeze({ level: 101, requiredHolding: 19782, thPerSec: 1.20, baseMaiPerDay: 39.56 }),
  Object.freeze({ level: 102, requiredHolding: 20069, thPerSec: 1.22, baseMaiPerDay: 40.29 }),
  Object.freeze({ level: 103, requiredHolding: 20359, thPerSec: 1.24, baseMaiPerDay: 41.04 }),
  Object.freeze({ level: 104, requiredHolding: 20654, thPerSec: 1.27, baseMaiPerDay: 41.80 }),
  Object.freeze({ level: 105, requiredHolding: 20953, thPerSec: 1.29, baseMaiPerDay: 42.58 }),
  Object.freeze({ level: 106, requiredHolding: 21256, thPerSec: 1.31, baseMaiPerDay: 43.37 }),
  Object.freeze({ level: 107, requiredHolding: 21563, thPerSec: 1.34, baseMaiPerDay: 44.18 }),
  Object.freeze({ level: 108, requiredHolding: 21876, thPerSec: 1.36, baseMaiPerDay: 45.00 }),
  Object.freeze({ level: 109, requiredHolding: 22192, thPerSec: 1.39, baseMaiPerDay: 45.84 }),
  Object.freeze({ level: 110, requiredHolding: 22513, thPerSec: 1.41, baseMaiPerDay: 46.69 }),
  Object.freeze({ level: 111, requiredHolding: 22839, thPerSec: 1.44, baseMaiPerDay: 47.55 }),
  Object.freeze({ level: 112, requiredHolding: 23170, thPerSec: 1.47, baseMaiPerDay: 48.44 }),
  Object.freeze({ level: 113, requiredHolding: 23505, thPerSec: 1.50, baseMaiPerDay: 49.34 }),
  Object.freeze({ level: 114, requiredHolding: 23845, thPerSec: 1.52, baseMaiPerDay: 50.25 }),
  Object.freeze({ level: 115, requiredHolding: 24190, thPerSec: 1.55, baseMaiPerDay: 51.19 }),
  Object.freeze({ level: 116, requiredHolding: 24540, thPerSec: 1.58, baseMaiPerDay: 52.14 }),
  Object.freeze({ level: 117, requiredHolding: 24896, thPerSec: 1.61, baseMaiPerDay: 53.11 }),
  Object.freeze({ level: 118, requiredHolding: 25256, thPerSec: 1.64, baseMaiPerDay: 54.09 }),
  Object.freeze({ level: 119, requiredHolding: 25621, thPerSec: 1.67, baseMaiPerDay: 55.10 }),
  Object.freeze({ level: 120, requiredHolding: 25992, thPerSec: 1.70, baseMaiPerDay: 56.12 }),
  Object.freeze({ level: 121, requiredHolding: 26368, thPerSec: 1.73, baseMaiPerDay: 57.17 }),
  Object.freeze({ level: 122, requiredHolding: 26750, thPerSec: 1.76, baseMaiPerDay: 58.23 }),
  Object.freeze({ level: 123, requiredHolding: 27137, thPerSec: 1.80, baseMaiPerDay: 59.31 }),
  Object.freeze({ level: 124, requiredHolding: 27530, thPerSec: 1.83, baseMaiPerDay: 60.41 }),
  Object.freeze({ level: 125, requiredHolding: 27928, thPerSec: 1.86, baseMaiPerDay: 61.53 }),
  Object.freeze({ level: 126, requiredHolding: 28333, thPerSec: 1.90, baseMaiPerDay: 62.68 }),
  Object.freeze({ level: 127, requiredHolding: 28743, thPerSec: 1.93, baseMaiPerDay: 63.84 }),
  Object.freeze({ level: 128, requiredHolding: 29159, thPerSec: 1.97, baseMaiPerDay: 65.03 }),
  Object.freeze({ level: 129, requiredHolding: 29581, thPerSec: 2.01, baseMaiPerDay: 66.24 }),
  Object.freeze({ level: 130, requiredHolding: 30009, thPerSec: 2.04, baseMaiPerDay: 67.47 }),
  Object.freeze({ level: 131, requiredHolding: 30443, thPerSec: 2.08, baseMaiPerDay: 68.72 }),
  Object.freeze({ level: 132, requiredHolding: 30884, thPerSec: 2.12, baseMaiPerDay: 70.00 }),
  Object.freeze({ level: 133, requiredHolding: 31331, thPerSec: 2.16, baseMaiPerDay: 71.30 }),
  Object.freeze({ level: 134, requiredHolding: 31784, thPerSec: 2.20, baseMaiPerDay: 72.62 }),
  Object.freeze({ level: 135, requiredHolding: 32244, thPerSec: 2.24, baseMaiPerDay: 73.97 }),
  Object.freeze({ level: 136, requiredHolding: 32711, thPerSec: 2.28, baseMaiPerDay: 75.35 }),
  Object.freeze({ level: 137, requiredHolding: 33184, thPerSec: 2.33, baseMaiPerDay: 76.75 }),
  Object.freeze({ level: 138, requiredHolding: 33665, thPerSec: 2.37, baseMaiPerDay: 78.17 }),
  Object.freeze({ level: 139, requiredHolding: 34152, thPerSec: 2.41, baseMaiPerDay: 79.63 }),
  Object.freeze({ level: 140, requiredHolding: 34646, thPerSec: 2.46, baseMaiPerDay: 81.11 }),
  Object.freeze({ level: 141, requiredHolding: 35148, thPerSec: 2.50, baseMaiPerDay: 82.61 }),
  Object.freeze({ level: 142, requiredHolding: 35656, thPerSec: 2.55, baseMaiPerDay: 84.15 }),
  Object.freeze({ level: 143, requiredHolding: 36172, thPerSec: 2.60, baseMaiPerDay: 85.71 }),
  Object.freeze({ level: 144, requiredHolding: 36696, thPerSec: 2.65, baseMaiPerDay: 87.30 }),
  Object.freeze({ level: 145, requiredHolding: 37227, thPerSec: 2.69, baseMaiPerDay: 88.93 }),
  Object.freeze({ level: 146, requiredHolding: 37766, thPerSec: 2.74, baseMaiPerDay: 90.58 }),
  Object.freeze({ level: 147, requiredHolding: 38312, thPerSec: 2.80, baseMaiPerDay: 92.26 }),
  Object.freeze({ level: 148, requiredHolding: 38867, thPerSec: 2.85, baseMaiPerDay: 93.97 }),
  Object.freeze({ level: 149, requiredHolding: 39429, thPerSec: 2.90, baseMaiPerDay: 95.72 }),
  Object.freeze({ level: 150, requiredHolding: 40000, thPerSec: 2.95, baseMaiPerDay: 97.50 }),
  Object.freeze({ level: 151, requiredHolding: 40450, thPerSec: 3.01, baseMaiPerDay: 99.31 }),
  Object.freeze({ level: 152, requiredHolding: 40905, thPerSec: 3.07, baseMaiPerDay: 101.16 }),
  Object.freeze({ level: 153, requiredHolding: 41366, thPerSec: 3.12, baseMaiPerDay: 103.04 }),
  Object.freeze({ level: 154, requiredHolding: 41831, thPerSec: 3.18, baseMaiPerDay: 104.95 }),
  Object.freeze({ level: 155, requiredHolding: 42302, thPerSec: 3.24, baseMaiPerDay: 106.90 }),
  Object.freeze({ level: 156, requiredHolding: 42778, thPerSec: 3.30, baseMaiPerDay: 108.89 }),
  Object.freeze({ level: 157, requiredHolding: 43260, thPerSec: 3.36, baseMaiPerDay: 110.91 }),
  Object.freeze({ level: 158, requiredHolding: 43747, thPerSec: 3.42, baseMaiPerDay: 112.97 }),
  Object.freeze({ level: 159, requiredHolding: 44239, thPerSec: 3.49, baseMaiPerDay: 115.07 }),
  Object.freeze({ level: 160, requiredHolding: 44737, thPerSec: 3.55, baseMaiPerDay: 117.21 }),
  Object.freeze({ level: 161, requiredHolding: 45241, thPerSec: 3.62, baseMaiPerDay: 119.38 }),
  Object.freeze({ level: 162, requiredHolding: 45750, thPerSec: 3.68, baseMaiPerDay: 121.60 }),
  Object.freeze({ level: 163, requiredHolding: 46265, thPerSec: 3.75, baseMaiPerDay: 123.86 }),
  Object.freeze({ level: 164, requiredHolding: 46785, thPerSec: 3.82, baseMaiPerDay: 126.16 }),
  Object.freeze({ level: 165, requiredHolding: 47312, thPerSec: 3.89, baseMaiPerDay: 128.51 }),
  Object.freeze({ level: 166, requiredHolding: 47845, thPerSec: 3.97, baseMaiPerDay: 130.89 }),
  Object.freeze({ level: 167, requiredHolding: 48383, thPerSec: 4.04, baseMaiPerDay: 133.33 }),
  Object.freeze({ level: 168, requiredHolding: 48928, thPerSec: 4.12, baseMaiPerDay: 135.80 }),
  Object.freeze({ level: 169, requiredHolding: 49478, thPerSec: 4.19, baseMaiPerDay: 138.33 }),
  Object.freeze({ level: 170, requiredHolding: 50035, thPerSec: 4.27, baseMaiPerDay: 140.90 }),
  Object.freeze({ level: 171, requiredHolding: 50598, thPerSec: 4.35, baseMaiPerDay: 143.52 }),
  Object.freeze({ level: 172, requiredHolding: 51168, thPerSec: 4.43, baseMaiPerDay: 146.18 }),
  Object.freeze({ level: 173, requiredHolding: 51744, thPerSec: 4.51, baseMaiPerDay: 148.90 }),
  Object.freeze({ level: 174, requiredHolding: 52326, thPerSec: 4.60, baseMaiPerDay: 151.66 }),
  Object.freeze({ level: 175, requiredHolding: 52915, thPerSec: 4.68, baseMaiPerDay: 154.48 }),
  Object.freeze({ level: 176, requiredHolding: 53511, thPerSec: 4.77, baseMaiPerDay: 157.35 }),
  Object.freeze({ level: 177, requiredHolding: 54113, thPerSec: 4.86, baseMaiPerDay: 160.28 }),
  Object.freeze({ level: 178, requiredHolding: 54722, thPerSec: 4.95, baseMaiPerDay: 163.25 }),
  Object.freeze({ level: 179, requiredHolding: 55338, thPerSec: 5.04, baseMaiPerDay: 166.29 }),
  Object.freeze({ level: 180, requiredHolding: 55961, thPerSec: 5.13, baseMaiPerDay: 169.38 }),
  Object.freeze({ level: 181, requiredHolding: 56591, thPerSec: 5.23, baseMaiPerDay: 172.52 }),
  Object.freeze({ level: 182, requiredHolding: 57227, thPerSec: 5.33, baseMaiPerDay: 175.73 }),
  Object.freeze({ level: 183, requiredHolding: 57872, thPerSec: 5.42, baseMaiPerDay: 178.99 }),
  Object.freeze({ level: 184, requiredHolding: 58523, thPerSec: 5.52, baseMaiPerDay: 182.32 }),
  Object.freeze({ level: 185, requiredHolding: 59182, thPerSec: 5.63, baseMaiPerDay: 185.71 }),
  Object.freeze({ level: 186, requiredHolding: 59848, thPerSec: 5.73, baseMaiPerDay: 189.16 }),
  Object.freeze({ level: 187, requiredHolding: 60521, thPerSec: 5.84, baseMaiPerDay: 192.67 }),
  Object.freeze({ level: 188, requiredHolding: 61202, thPerSec: 5.95, baseMaiPerDay: 196.25 }),
  Object.freeze({ level: 189, requiredHolding: 61891, thPerSec: 6.06, baseMaiPerDay: 199.90 }),
  Object.freeze({ level: 190, requiredHolding: 62588, thPerSec: 6.17, baseMaiPerDay: 203.61 }),
  Object.freeze({ level: 191, requiredHolding: 63292, thPerSec: 6.28, baseMaiPerDay: 207.40 }),
  Object.freeze({ level: 192, requiredHolding: 64005, thPerSec: 6.40, baseMaiPerDay: 211.25 }),
  Object.freeze({ level: 193, requiredHolding: 64725, thPerSec: 6.52, baseMaiPerDay: 215.17 }),
  Object.freeze({ level: 194, requiredHolding: 65454, thPerSec: 6.64, baseMaiPerDay: 219.17 }),
  Object.freeze({ level: 195, requiredHolding: 66190, thPerSec: 6.76, baseMaiPerDay: 223.24 }),
  Object.freeze({ level: 196, requiredHolding: 66935, thPerSec: 6.89, baseMaiPerDay: 227.39 }),
  Object.freeze({ level: 197, requiredHolding: 67689, thPerSec: 7.02, baseMaiPerDay: 231.62 }),
  Object.freeze({ level: 198, requiredHolding: 68450, thPerSec: 7.15, baseMaiPerDay: 235.92 }),
  Object.freeze({ level: 199, requiredHolding: 69221, thPerSec: 7.28, baseMaiPerDay: 240.30 }),
  Object.freeze({ level: 200, requiredHolding: 70000, thPerSec: 7.42, baseMaiPerDay: 244.77 }),
  Object.freeze({ level: 201, requiredHolding: 70698, thPerSec: 7.56, baseMaiPerDay: 249.32 }),
  Object.freeze({ level: 202, requiredHolding: 71404, thPerSec: 7.70, baseMaiPerDay: 253.95 }),
  Object.freeze({ level: 203, requiredHolding: 72116, thPerSec: 7.84, baseMaiPerDay: 258.67 }),
  Object.freeze({ level: 204, requiredHolding: 72836, thPerSec: 7.98, baseMaiPerDay: 263.47 }),
  Object.freeze({ level: 205, requiredHolding: 73563, thPerSec: 8.13, baseMaiPerDay: 268.37 }),
  Object.freeze({ level: 206, requiredHolding: 74297, thPerSec: 8.28, baseMaiPerDay: 273.36 }),
  Object.freeze({ level: 207, requiredHolding: 75038, thPerSec: 8.44, baseMaiPerDay: 278.43 }),
  Object.freeze({ level: 208, requiredHolding: 75787, thPerSec: 8.59, baseMaiPerDay: 283.61 }),
  Object.freeze({ level: 209, requiredHolding: 76543, thPerSec: 8.75, baseMaiPerDay: 288.88 }),
  Object.freeze({ level: 210, requiredHolding: 77307, thPerSec: 8.92, baseMaiPerDay: 294.24 }),
  Object.freeze({ level: 211, requiredHolding: 78078, thPerSec: 9.08, baseMaiPerDay: 299.71 }),
  Object.freeze({ level: 212, requiredHolding: 78857, thPerSec: 9.25, baseMaiPerDay: 305.28 }),
  Object.freeze({ level: 213, requiredHolding: 79644, thPerSec: 9.42, baseMaiPerDay: 310.95 }),
  Object.freeze({ level: 214, requiredHolding: 80439, thPerSec: 9.60, baseMaiPerDay: 316.73 }),
  Object.freeze({ level: 215, requiredHolding: 81242, thPerSec: 9.78, baseMaiPerDay: 322.61 }),
  Object.freeze({ level: 216, requiredHolding: 82052, thPerSec: 9.96, baseMaiPerDay: 328.61 }),
  Object.freeze({ level: 217, requiredHolding: 82871, thPerSec: 10.14, baseMaiPerDay: 334.71 }),
  Object.freeze({ level: 218, requiredHolding: 83698, thPerSec: 10.33, baseMaiPerDay: 340.93 }),
  Object.freeze({ level: 219, requiredHolding: 84533, thPerSec: 10.52, baseMaiPerDay: 347.27 }),
  Object.freeze({ level: 220, requiredHolding: 85376, thPerSec: 10.72, baseMaiPerDay: 353.72 }),
  Object.freeze({ level: 221, requiredHolding: 86228, thPerSec: 10.92, baseMaiPerDay: 360.29 }),
  Object.freeze({ level: 222, requiredHolding: 87089, thPerSec: 11.12, baseMaiPerDay: 366.99 }),
  Object.freeze({ level: 223, requiredHolding: 87958, thPerSec: 11.33, baseMaiPerDay: 373.81 }),
  Object.freeze({ level: 224, requiredHolding: 88835, thPerSec: 11.54, baseMaiPerDay: 380.75 }),
  Object.freeze({ level: 225, requiredHolding: 89722, thPerSec: 11.75, baseMaiPerDay: 387.82 }),
  Object.freeze({ level: 226, requiredHolding: 90617, thPerSec: 11.97, baseMaiPerDay: 395.03 }),
  Object.freeze({ level: 227, requiredHolding: 91521, thPerSec: 12.19, baseMaiPerDay: 402.37 }),
  Object.freeze({ level: 228, requiredHolding: 92434, thPerSec: 12.42, baseMaiPerDay: 409.85 }),
  Object.freeze({ level: 229, requiredHolding: 93357, thPerSec: 12.65, baseMaiPerDay: 417.46 }),
  Object.freeze({ level: 230, requiredHolding: 94288, thPerSec: 12.89, baseMaiPerDay: 425.22 }),
  Object.freeze({ level: 231, requiredHolding: 95229, thPerSec: 13.12, baseMaiPerDay: 433.12 }),
  Object.freeze({ level: 232, requiredHolding: 96179, thPerSec: 13.37, baseMaiPerDay: 441.17 }),
  Object.freeze({ level: 233, requiredHolding: 97139, thPerSec: 13.62, baseMaiPerDay: 449.36 }),
  Object.freeze({ level: 234, requiredHolding: 98108, thPerSec: 13.87, baseMaiPerDay: 457.71 }),
  Object.freeze({ level: 235, requiredHolding: 99087, thPerSec: 14.13, baseMaiPerDay: 466.22 }),
  Object.freeze({ level: 236, requiredHolding: 100076, thPerSec: 14.39, baseMaiPerDay: 474.88 }),
  Object.freeze({ level: 237, requiredHolding: 101075, thPerSec: 14.66, baseMaiPerDay: 483.70 }),
  Object.freeze({ level: 238, requiredHolding: 102083, thPerSec: 14.93, baseMaiPerDay: 492.69 }),
  Object.freeze({ level: 239, requiredHolding: 103102, thPerSec: 15.21, baseMaiPerDay: 501.84 }),
  Object.freeze({ level: 240, requiredHolding: 104130, thPerSec: 15.49, baseMaiPerDay: 511.17 }),
  Object.freeze({ level: 241, requiredHolding: 105170, thPerSec: 15.78, baseMaiPerDay: 520.66 }),
  Object.freeze({ level: 242, requiredHolding: 106219, thPerSec: 16.07, baseMaiPerDay: 530.34 }),
  Object.freeze({ level: 243, requiredHolding: 107279, thPerSec: 16.37, baseMaiPerDay: 540.19 }),
  Object.freeze({ level: 244, requiredHolding: 108349, thPerSec: 16.67, baseMaiPerDay: 550.23 }),
  Object.freeze({ level: 245, requiredHolding: 109430, thPerSec: 16.98, baseMaiPerDay: 560.45 }),
  Object.freeze({ level: 246, requiredHolding: 110522, thPerSec: 17.30, baseMaiPerDay: 570.87 }),
  Object.freeze({ level: 247, requiredHolding: 111625, thPerSec: 17.62, baseMaiPerDay: 581.47 }),
  Object.freeze({ level: 248, requiredHolding: 112739, thPerSec: 17.95, baseMaiPerDay: 592.28 }),
  Object.freeze({ level: 249, requiredHolding: 113864, thPerSec: 18.28, baseMaiPerDay: 603.28 }),
  Object.freeze({ level: 250, requiredHolding: 115000, thPerSec: 18.62, baseMaiPerDay: 614.49 }),
  Object.freeze({ level: 251, requiredHolding: 116035, thPerSec: 18.97, baseMaiPerDay: 625.91 }),
  Object.freeze({ level: 252, requiredHolding: 117079, thPerSec: 19.32, baseMaiPerDay: 637.54 }),
  Object.freeze({ level: 253, requiredHolding: 118133, thPerSec: 19.68, baseMaiPerDay: 649.38 }),
  Object.freeze({ level: 254, requiredHolding: 119197, thPerSec: 20.04, baseMaiPerDay: 661.45 }),
  Object.freeze({ level: 255, requiredHolding: 120269, thPerSec: 20.42, baseMaiPerDay: 673.74 }),
  Object.freeze({ level: 256, requiredHolding: 121352, thPerSec: 20.80, baseMaiPerDay: 686.25 }),
  Object.freeze({ level: 257, requiredHolding: 122444, thPerSec: 21.18, baseMaiPerDay: 699.00 }),
  Object.freeze({ level: 258, requiredHolding: 123546, thPerSec: 21.58, baseMaiPerDay: 711.99 }),
  Object.freeze({ level: 259, requiredHolding: 124658, thPerSec: 21.98, baseMaiPerDay: 725.22 }),
  Object.freeze({ level: 260, requiredHolding: 125780, thPerSec: 22.38, baseMaiPerDay: 738.70 }),
  Object.freeze({ level: 261, requiredHolding: 126912, thPerSec: 22.80, baseMaiPerDay: 752.42 }),
  Object.freeze({ level: 262, requiredHolding: 128055, thPerSec: 23.22, baseMaiPerDay: 766.40 }),
  Object.freeze({ level: 263, requiredHolding: 129207, thPerSec: 23.66, baseMaiPerDay: 780.64 }),
  Object.freeze({ level: 264, requiredHolding: 130370, thPerSec: 24.10, baseMaiPerDay: 795.14 }),
  Object.freeze({ level: 265, requiredHolding: 131544, thPerSec: 24.54, baseMaiPerDay: 809.92 }),
  Object.freeze({ level: 266, requiredHolding: 132728, thPerSec: 25.00, baseMaiPerDay: 824.97 }),
  Object.freeze({ level: 267, requiredHolding: 133922, thPerSec: 25.46, baseMaiPerDay: 840.29 }),
  Object.freeze({ level: 268, requiredHolding: 135128, thPerSec: 25.94, baseMaiPerDay: 855.91 }),
  Object.freeze({ level: 269, requiredHolding: 136344, thPerSec: 26.42, baseMaiPerDay: 871.81 }),
  Object.freeze({ level: 270, requiredHolding: 137571, thPerSec: 26.91, baseMaiPerDay: 888.01 }),
  Object.freeze({ level: 271, requiredHolding: 138810, thPerSec: 27.41, baseMaiPerDay: 904.51 }),
  Object.freeze({ level: 272, requiredHolding: 140059, thPerSec: 27.92, baseMaiPerDay: 921.31 }),
  Object.freeze({ level: 273, requiredHolding: 141320, thPerSec: 28.44, baseMaiPerDay: 938.43 }),
  Object.freeze({ level: 274, requiredHolding: 142592, thPerSec: 28.97, baseMaiPerDay: 955.87 }),
  Object.freeze({ level: 275, requiredHolding: 143875, thPerSec: 29.50, baseMaiPerDay: 973.63 }),
  Object.freeze({ level: 276, requiredHolding: 145170, thPerSec: 30.05, baseMaiPerDay: 991.72 }),
  Object.freeze({ level: 277, requiredHolding: 146477, thPerSec: 30.61, baseMaiPerDay: 1010.14 }),
  Object.freeze({ level: 278, requiredHolding: 147795, thPerSec: 31.18, baseMaiPerDay: 1028.91 }),
  Object.freeze({ level: 279, requiredHolding: 149125, thPerSec: 31.76, baseMaiPerDay: 1048.03 }),
  Object.freeze({ level: 280, requiredHolding: 150467, thPerSec: 32.35, baseMaiPerDay: 1067.50 }),
  Object.freeze({ level: 281, requiredHolding: 151822, thPerSec: 32.95, baseMaiPerDay: 1087.34 }),
  Object.freeze({ level: 282, requiredHolding: 153188, thPerSec: 33.56, baseMaiPerDay: 1107.54 }),
  Object.freeze({ level: 283, requiredHolding: 154567, thPerSec: 34.19, baseMaiPerDay: 1128.12 }),
  Object.freeze({ level: 284, requiredHolding: 155958, thPerSec: 34.82, baseMaiPerDay: 1149.08 }),
  Object.freeze({ level: 285, requiredHolding: 157362, thPerSec: 35.47, baseMaiPerDay: 1170.43 }),
  Object.freeze({ level: 286, requiredHolding: 158778, thPerSec: 36.13, baseMaiPerDay: 1192.17 }),
  Object.freeze({ level: 287, requiredHolding: 160208, thPerSec: 36.80, baseMaiPerDay: 1214.32 }),
  Object.freeze({ level: 288, requiredHolding: 161650, thPerSec: 37.48, baseMaiPerDay: 1236.89 }),
  Object.freeze({ level: 289, requiredHolding: 163105, thPerSec: 38.18, baseMaiPerDay: 1259.87 }),
  Object.freeze({ level: 290, requiredHolding: 164573, thPerSec: 38.89, baseMaiPerDay: 1283.28 }),
  Object.freeze({ level: 291, requiredHolding: 166054, thPerSec: 39.61, baseMaiPerDay: 1307.12 }),
  Object.freeze({ level: 292, requiredHolding: 167549, thPerSec: 40.35, baseMaiPerDay: 1331.41 }),
  Object.freeze({ level: 293, requiredHolding: 169057, thPerSec: 41.10, baseMaiPerDay: 1356.14 }),
  Object.freeze({ level: 294, requiredHolding: 170578, thPerSec: 41.86, baseMaiPerDay: 1381.34 }),
  Object.freeze({ level: 295, requiredHolding: 172114, thPerSec: 42.64, baseMaiPerDay: 1407.01 }),
  Object.freeze({ level: 296, requiredHolding: 173663, thPerSec: 43.43, baseMaiPerDay: 1433.15 }),
  Object.freeze({ level: 297, requiredHolding: 175226, thPerSec: 44.24, baseMaiPerDay: 1459.78 }),
  Object.freeze({ level: 298, requiredHolding: 176803, thPerSec: 45.06, baseMaiPerDay: 1486.90 }),
  Object.freeze({ level: 299, requiredHolding: 178394, thPerSec: 45.89, baseMaiPerDay: 1514.52 }),
  Object.freeze({ level: 300, requiredHolding: 180000, thPerSec: 46.75, baseMaiPerDay: 1542.66 }),
  Object.freeze({ level: 301, requiredHolding: 181532, thPerSec: 47.62, baseMaiPerDay: 1562.67 }),
  Object.freeze({ level: 302, requiredHolding: 183077, thPerSec: 48.50, baseMaiPerDay: 1583.02 }),
  Object.freeze({ level: 303, requiredHolding: 184636, thPerSec: 49.40, baseMaiPerDay: 1603.74 }),
  Object.freeze({ level: 304, requiredHolding: 186208, thPerSec: 50.32, baseMaiPerDay: 1624.85 }),
  Object.freeze({ level: 305, requiredHolding: 187793, thPerSec: 51.25, baseMaiPerDay: 1646.36 }),
  Object.freeze({ level: 306, requiredHolding: 189391, thPerSec: 52.21, baseMaiPerDay: 1668.26 }),
  Object.freeze({ level: 307, requiredHolding: 191003, thPerSec: 53.18, baseMaiPerDay: 1690.57 }),
  Object.freeze({ level: 308, requiredHolding: 192629, thPerSec: 54.16, baseMaiPerDay: 1713.29 }),
  Object.freeze({ level: 309, requiredHolding: 194269, thPerSec: 55.17, baseMaiPerDay: 1736.44 }),
  Object.freeze({ level: 310, requiredHolding: 195923, thPerSec: 56.20, baseMaiPerDay: 1760.02 }),
  Object.freeze({ level: 311, requiredHolding: 197590, thPerSec: 57.24, baseMaiPerDay: 1784.03 }),
  Object.freeze({ level: 312, requiredHolding: 199272, thPerSec: 58.30, baseMaiPerDay: 1808.49 }),
  Object.freeze({ level: 313, requiredHolding: 200969, thPerSec: 59.39, baseMaiPerDay: 1833.41 }),
  Object.freeze({ level: 314, requiredHolding: 202679, thPerSec: 60.49, baseMaiPerDay: 1858.79 }),
  Object.freeze({ level: 315, requiredHolding: 204405, thPerSec: 61.61, baseMaiPerDay: 1884.64 }),
  Object.freeze({ level: 316, requiredHolding: 206145, thPerSec: 62.76, baseMaiPerDay: 1910.97 }),
  Object.freeze({ level: 317, requiredHolding: 207899, thPerSec: 63.93, baseMaiPerDay: 1937.79 }),
  Object.freeze({ level: 318, requiredHolding: 209669, thPerSec: 65.11, baseMaiPerDay: 1965.11 }),
  Object.freeze({ level: 319, requiredHolding: 211454, thPerSec: 66.32, baseMaiPerDay: 1992.93 }),
  Object.freeze({ level: 320, requiredHolding: 213254, thPerSec: 67.56, baseMaiPerDay: 2021.28 }),
  Object.freeze({ level: 321, requiredHolding: 215069, thPerSec: 68.81, baseMaiPerDay: 2050.14 }),
  Object.freeze({ level: 322, requiredHolding: 216900, thPerSec: 70.09, baseMaiPerDay: 2079.55 }),
  Object.freeze({ level: 323, requiredHolding: 218746, thPerSec: 71.39, baseMaiPerDay: 2109.50 }),
  Object.freeze({ level: 324, requiredHolding: 220608, thPerSec: 72.72, baseMaiPerDay: 2140.01 }),
  Object.freeze({ level: 325, requiredHolding: 222486, thPerSec: 74.07, baseMaiPerDay: 2171.09 }),
  Object.freeze({ level: 326, requiredHolding: 224380, thPerSec: 75.45, baseMaiPerDay: 2202.74 }),
  Object.freeze({ level: 327, requiredHolding: 226290, thPerSec: 76.85, baseMaiPerDay: 2234.98 }),
  Object.freeze({ level: 328, requiredHolding: 228216, thPerSec: 78.27, baseMaiPerDay: 2267.82 }),
  Object.freeze({ level: 329, requiredHolding: 230159, thPerSec: 79.73, baseMaiPerDay: 2301.27 }),
  Object.freeze({ level: 330, requiredHolding: 232118, thPerSec: 81.21, baseMaiPerDay: 2335.34 }),
  Object.freeze({ level: 331, requiredHolding: 234094, thPerSec: 82.72, baseMaiPerDay: 2370.04 }),
  Object.freeze({ level: 332, requiredHolding: 236086, thPerSec: 84.26, baseMaiPerDay: 2405.39 }),
  Object.freeze({ level: 333, requiredHolding: 238096, thPerSec: 85.82, baseMaiPerDay: 2441.40 }),
  Object.freeze({ level: 334, requiredHolding: 240123, thPerSec: 87.42, baseMaiPerDay: 2478.07 }),
  Object.freeze({ level: 335, requiredHolding: 242167, thPerSec: 89.04, baseMaiPerDay: 2515.43 }),
  Object.freeze({ level: 336, requiredHolding: 244228, thPerSec: 90.69, baseMaiPerDay: 2553.48 }),
  Object.freeze({ level: 337, requiredHolding: 246307, thPerSec: 92.38, baseMaiPerDay: 2592.24 }),
  Object.freeze({ level: 338, requiredHolding: 248404, thPerSec: 94.10, baseMaiPerDay: 2631.72 }),
  Object.freeze({ level: 339, requiredHolding: 250518, thPerSec: 95.84, baseMaiPerDay: 2671.93 }),
  Object.freeze({ level: 340, requiredHolding: 252651, thPerSec: 97.63, baseMaiPerDay: 2712.89 }),
  Object.freeze({ level: 341, requiredHolding: 254801, thPerSec: 99.44, baseMaiPerDay: 2754.61 }),
  Object.freeze({ level: 342, requiredHolding: 256970, thPerSec: 101.29, baseMaiPerDay: 2793.24 }),
  Object.freeze({ level: 343, requiredHolding: 259158, thPerSec: 103.17, baseMaiPerDay: 2830.88 }),
  Object.freeze({ level: 344, requiredHolding: 261364, thPerSec: 105.09, baseMaiPerDay: 2869.21 }),
  Object.freeze({ level: 345, requiredHolding: 263589, thPerSec: 107.04, baseMaiPerDay: 2908.26 }),
  Object.freeze({ level: 346, requiredHolding: 265832, thPerSec: 109.03, baseMaiPerDay: 2948.04 }),
  Object.freeze({ level: 347, requiredHolding: 268095, thPerSec: 111.05, baseMaiPerDay: 2988.55 }),
  Object.freeze({ level: 348, requiredHolding: 270377, thPerSec: 113.12, baseMaiPerDay: 3029.82 }),
  Object.freeze({ level: 349, requiredHolding: 272679, thPerSec: 115.22, baseMaiPerDay: 3071.86 }),
  Object.freeze({ level: 350, requiredHolding: 275000, thPerSec: 117.36, baseMaiPerDay: 3114.67 }),
  Object.freeze({ level: 351, requiredHolding: 277339, thPerSec: 119.54, baseMaiPerDay: 3158.28 }),
  Object.freeze({ level: 352, requiredHolding: 279698, thPerSec: 121.76, baseMaiPerDay: 3202.70 }),
  Object.freeze({ level: 353, requiredHolding: 282077, thPerSec: 124.02, baseMaiPerDay: 3247.95 }),
  Object.freeze({ level: 354, requiredHolding: 284476, thPerSec: 126.33, baseMaiPerDay: 3294.03 }),
  Object.freeze({ level: 355, requiredHolding: 286896, thPerSec: 128.67, baseMaiPerDay: 3340.98 }),
  Object.freeze({ level: 356, requiredHolding: 289336, thPerSec: 131.06, baseMaiPerDay: 3388.79 }),
  Object.freeze({ level: 357, requiredHolding: 291797, thPerSec: 133.50, baseMaiPerDay: 3437.50 }),
  Object.freeze({ level: 358, requiredHolding: 294279, thPerSec: 135.98, baseMaiPerDay: 3487.10 }),
  Object.freeze({ level: 359, requiredHolding: 296782, thPerSec: 138.51, baseMaiPerDay: 3537.64 }),
  Object.freeze({ level: 360, requiredHolding: 299306, thPerSec: 141.08, baseMaiPerDay: 3589.10 }),
  Object.freeze({ level: 361, requiredHolding: 301852, thPerSec: 143.70, baseMaiPerDay: 3641.53 }),
  Object.freeze({ level: 362, requiredHolding: 304420, thPerSec: 146.37, baseMaiPerDay: 3694.93 }),
  Object.freeze({ level: 363, requiredHolding: 307009, thPerSec: 149.09, baseMaiPerDay: 3749.32 }),
  Object.freeze({ level: 364, requiredHolding: 309620, thPerSec: 151.86, baseMaiPerDay: 3804.72 }),
  Object.freeze({ level: 365, requiredHolding: 312254, thPerSec: 154.68, baseMaiPerDay: 3861.15 }),
  Object.freeze({ level: 366, requiredHolding: 314910, thPerSec: 157.56, baseMaiPerDay: 3918.63 }),
  Object.freeze({ level: 367, requiredHolding: 317588, thPerSec: 160.48, baseMaiPerDay: 3977.18 }),
  Object.freeze({ level: 368, requiredHolding: 320289, thPerSec: 163.47, baseMaiPerDay: 4036.82 }),
  Object.freeze({ level: 369, requiredHolding: 323014, thPerSec: 166.50, baseMaiPerDay: 4097.56 }),
  Object.freeze({ level: 370, requiredHolding: 325761, thPerSec: 169.60, baseMaiPerDay: 4159.44 }),
  Object.freeze({ level: 371, requiredHolding: 328532, thPerSec: 172.75, baseMaiPerDay: 4222.46 }),
  Object.freeze({ level: 372, requiredHolding: 331326, thPerSec: 175.96, baseMaiPerDay: 4286.65 }),
  Object.freeze({ level: 373, requiredHolding: 334145, thPerSec: 179.23, baseMaiPerDay: 4352.04 }),
  Object.freeze({ level: 374, requiredHolding: 336987, thPerSec: 182.56, baseMaiPerDay: 4418.64 }),
  Object.freeze({ level: 375, requiredHolding: 339853, thPerSec: 185.95, baseMaiPerDay: 4486.48 }),
  Object.freeze({ level: 376, requiredHolding: 342744, thPerSec: 189.40, baseMaiPerDay: 4555.57 }),
  Object.freeze({ level: 377, requiredHolding: 345659, thPerSec: 192.92, baseMaiPerDay: 4625.96 }),
  Object.freeze({ level: 378, requiredHolding: 348599, thPerSec: 196.51, baseMaiPerDay: 4697.65 }),
  Object.freeze({ level: 379, requiredHolding: 351564, thPerSec: 200.16, baseMaiPerDay: 4770.35 }),
  Object.freeze({ level: 380, requiredHolding: 354554, thPerSec: 203.88, baseMaiPerDay: 4837.29 }),
  Object.freeze({ level: 381, requiredHolding: 357570, thPerSec: 207.67, baseMaiPerDay: 4905.48 }),
  Object.freeze({ level: 382, requiredHolding: 360611, thPerSec: 211.52, baseMaiPerDay: 4974.93 }),
  Object.freeze({ level: 383, requiredHolding: 363679, thPerSec: 215.45, baseMaiPerDay: 5045.67 }),
  Object.freeze({ level: 384, requiredHolding: 366772, thPerSec: 219.46, baseMaiPerDay: 5117.73 }),
  Object.freeze({ level: 385, requiredHolding: 369891, thPerSec: 223.53, baseMaiPerDay: 5191.12 }),
  Object.freeze({ level: 386, requiredHolding: 373038, thPerSec: 227.69, baseMaiPerDay: 5265.88 }),
  Object.freeze({ level: 387, requiredHolding: 376211, thPerSec: 231.92, baseMaiPerDay: 5342.03 }),
  Object.freeze({ level: 388, requiredHolding: 379410, thPerSec: 236.23, baseMaiPerDay: 5419.59 }),
  Object.freeze({ level: 389, requiredHolding: 382638, thPerSec: 240.62, baseMaiPerDay: 5498.60 }),
  Object.freeze({ level: 390, requiredHolding: 385892, thPerSec: 245.09, baseMaiPerDay: 5579.07 }),
  Object.freeze({ level: 391, requiredHolding: 389174, thPerSec: 249.64, baseMaiPerDay: 5661.03 }),
  Object.freeze({ level: 392, requiredHolding: 392485, thPerSec: 254.28, baseMaiPerDay: 5744.52 }),
  Object.freeze({ level: 393, requiredHolding: 395823, thPerSec: 259.00, baseMaiPerDay: 5829.57 }),
  Object.freeze({ level: 394, requiredHolding: 399190, thPerSec: 263.82, baseMaiPerDay: 5916.19 }),
  Object.freeze({ level: 395, requiredHolding: 402585, thPerSec: 268.72, baseMaiPerDay: 6004.42 }),
  Object.freeze({ level: 396, requiredHolding: 406009, thPerSec: 273.71, baseMaiPerDay: 6094.29 }),
  Object.freeze({ level: 397, requiredHolding: 409463, thPerSec: 278.80, baseMaiPerDay: 6185.83 }),
  Object.freeze({ level: 398, requiredHolding: 412945, thPerSec: 283.98, baseMaiPerDay: 6279.07 }),
  Object.freeze({ level: 399, requiredHolding: 416458, thPerSec: 289.25, baseMaiPerDay: 6374.04 }),
  Object.freeze({ level: 400, requiredHolding: 420000, thPerSec: 294.63, baseMaiPerDay: 6470.78 }),
  Object.freeze({ level: 401, requiredHolding: 423684, thPerSec: 300.10, baseMaiPerDay: 6569.31 }),
  Object.freeze({ level: 402, requiredHolding: 427401, thPerSec: 305.68, baseMaiPerDay: 6669.68 }),
  Object.freeze({ level: 403, requiredHolding: 431151, thPerSec: 311.36, baseMaiPerDay: 6771.91 }),
  Object.freeze({ level: 404, requiredHolding: 434933, thPerSec: 317.14, baseMaiPerDay: 6876.04 }),
  Object.freeze({ level: 405, requiredHolding: 438749, thPerSec: 323.03, baseMaiPerDay: 6982.10 }),
  Object.freeze({ level: 406, requiredHolding: 442598, thPerSec: 329.04, baseMaiPerDay: 7090.14 }),
  Object.freeze({ level: 407, requiredHolding: 446480, thPerSec: 335.15, baseMaiPerDay: 7200.18 }),
  Object.freeze({ level: 408, requiredHolding: 450397, thPerSec: 341.38, baseMaiPerDay: 7312.27 }),
  Object.freeze({ level: 409, requiredHolding: 454348, thPerSec: 347.72, baseMaiPerDay: 7426.44 }),
  Object.freeze({ level: 410, requiredHolding: 458334, thPerSec: 354.18, baseMaiPerDay: 7542.73 }),
  Object.freeze({ level: 411, requiredHolding: 462355, thPerSec: 360.76, baseMaiPerDay: 7661.18 }),
  Object.freeze({ level: 412, requiredHolding: 466411, thPerSec: 367.46, baseMaiPerDay: 7781.83 }),
  Object.freeze({ level: 413, requiredHolding: 470503, thPerSec: 374.29, baseMaiPerDay: 7904.73 }),
  Object.freeze({ level: 414, requiredHolding: 474630, thPerSec: 381.24, baseMaiPerDay: 8029.91 }),
  Object.freeze({ level: 415, requiredHolding: 478794, thPerSec: 388.33, baseMaiPerDay: 8157.41 }),
  Object.freeze({ level: 416, requiredHolding: 482994, thPerSec: 395.54, baseMaiPerDay: 8287.28 }),
  Object.freeze({ level: 417, requiredHolding: 487231, thPerSec: 402.89, baseMaiPerDay: 8419.57 }),
  Object.freeze({ level: 418, requiredHolding: 491505, thPerSec: 410.38, baseMaiPerDay: 8554.31 }),
  Object.freeze({ level: 419, requiredHolding: 495817, thPerSec: 418.00, baseMaiPerDay: 8691.56 }),
  Object.freeze({ level: 420, requiredHolding: 500167, thPerSec: 425.77, baseMaiPerDay: 8831.36 }),
  Object.freeze({ level: 421, requiredHolding: 504555, thPerSec: 433.68, baseMaiPerDay: 8973.75 }),
  Object.freeze({ level: 422, requiredHolding: 508981, thPerSec: 441.74, baseMaiPerDay: 9118.79 }),
  Object.freeze({ level: 423, requiredHolding: 513446, thPerSec: 449.95, baseMaiPerDay: 9266.52 }),
  Object.freeze({ level: 424, requiredHolding: 517950, thPerSec: 458.31, baseMaiPerDay: 9417.00 }),
  Object.freeze({ level: 425, requiredHolding: 522494, thPerSec: 466.82, baseMaiPerDay: 9570.28 }),
  Object.freeze({ level: 426, requiredHolding: 527078, thPerSec: 475.49, baseMaiPerDay: 9726.40 }),
  Object.freeze({ level: 427, requiredHolding: 531702, thPerSec: 484.33, baseMaiPerDay: 9885.43 }),
  Object.freeze({ level: 428, requiredHolding: 536366, thPerSec: 493.33, baseMaiPerDay: 10047.41 }),
  Object.freeze({ level: 429, requiredHolding: 541071, thPerSec: 502.49, baseMaiPerDay: 10204.91 }),
  Object.freeze({ level: 430, requiredHolding: 545818, thPerSec: 511.83, baseMaiPerDay: 10344.96 }),
  Object.freeze({ level: 431, requiredHolding: 550606, thPerSec: 521.34, baseMaiPerDay: 10487.61 }),
  Object.freeze({ level: 432, requiredHolding: 555436, thPerSec: 531.03, baseMaiPerDay: 10632.90 }),
  Object.freeze({ level: 433, requiredHolding: 560309, thPerSec: 540.89, baseMaiPerDay: 10780.90 }),
  Object.freeze({ level: 434, requiredHolding: 565224, thPerSec: 550.94, baseMaiPerDay: 10931.65 }),
  Object.freeze({ level: 435, requiredHolding: 570183, thPerSec: 561.18, baseMaiPerDay: 11085.20 }),
  Object.freeze({ level: 436, requiredHolding: 575185, thPerSec: 571.61, baseMaiPerDay: 11241.60 }),
  Object.freeze({ level: 437, requiredHolding: 580231, thPerSec: 582.23, baseMaiPerDay: 11400.90 }),
  Object.freeze({ level: 438, requiredHolding: 585321, thPerSec: 593.04, baseMaiPerDay: 11563.17 }),
  Object.freeze({ level: 439, requiredHolding: 590456, thPerSec: 604.06, baseMaiPerDay: 11728.45 }),
  Object.freeze({ level: 440, requiredHolding: 595635, thPerSec: 615.29, baseMaiPerDay: 11896.80 }),
  Object.freeze({ level: 441, requiredHolding: 600861, thPerSec: 626.72, baseMaiPerDay: 12068.28 }),
  Object.freeze({ level: 442, requiredHolding: 606132, thPerSec: 638.36, baseMaiPerDay: 12242.95 }),
  Object.freeze({ level: 443, requiredHolding: 611449, thPerSec: 650.22, baseMaiPerDay: 12420.86 }),
  Object.freeze({ level: 444, requiredHolding: 616813, thPerSec: 662.31, baseMaiPerDay: 12602.08 }),
  Object.freeze({ level: 445, requiredHolding: 622224, thPerSec: 674.61, baseMaiPerDay: 12786.66 }),
  Object.freeze({ level: 446, requiredHolding: 627683, thPerSec: 687.15, baseMaiPerDay: 12974.68 }),
  Object.freeze({ level: 447, requiredHolding: 633189, thPerSec: 699.91, baseMaiPerDay: 13166.19 }),
  Object.freeze({ level: 448, requiredHolding: 638744, thPerSec: 712.92, baseMaiPerDay: 13361.25 }),
  Object.freeze({ level: 449, requiredHolding: 644347, thPerSec: 726.16, baseMaiPerDay: 13559.94 }),
  Object.freeze({ level: 450, requiredHolding: 650000, thPerSec: 739.65, baseMaiPerDay: 13762.32 }),
  Object.freeze({ level: 451, requiredHolding: 655624, thPerSec: 753.40, baseMaiPerDay: 13968.46 }),
  Object.freeze({ level: 452, requiredHolding: 661297, thPerSec: 767.40, baseMaiPerDay: 14178.44 }),
  Object.freeze({ level: 453, requiredHolding: 667020, thPerSec: 781.65, baseMaiPerDay: 14392.31 }),
  Object.freeze({ level: 454, requiredHolding: 672791, thPerSec: 796.18, baseMaiPerDay: 14610.16 }),
  Object.freeze({ level: 455, requiredHolding: 678613, thPerSec: 810.97, baseMaiPerDay: 14832.05 }),
  Object.freeze({ level: 456, requiredHolding: 684485, thPerSec: 826.04, baseMaiPerDay: 15058.07 }),
  Object.freeze({ level: 457, requiredHolding: 690407, thPerSec: 841.39, baseMaiPerDay: 15288.29 }),
  Object.freeze({ level: 458, requiredHolding: 696381, thPerSec: 857.02, baseMaiPerDay: 15522.78 }),
  Object.freeze({ level: 459, requiredHolding: 702407, thPerSec: 872.94, baseMaiPerDay: 15761.63 }),
  Object.freeze({ level: 460, requiredHolding: 708485, thPerSec: 889.16, baseMaiPerDay: 16004.92 }),
  Object.freeze({ level: 461, requiredHolding: 714615, thPerSec: 905.68, baseMaiPerDay: 16252.73 }),
  Object.freeze({ level: 462, requiredHolding: 720799, thPerSec: 922.51, baseMaiPerDay: 16505.14 }),
  Object.freeze({ level: 463, requiredHolding: 727036, thPerSec: 939.65, baseMaiPerDay: 16762.25 }),
  Object.freeze({ level: 464, requiredHolding: 733327, thPerSec: 957.11, baseMaiPerDay: 17024.13 }),
  Object.freeze({ level: 465, requiredHolding: 739672, thPerSec: 974.89, baseMaiPerDay: 17290.87 }),
  Object.freeze({ level: 466, requiredHolding: 746073, thPerSec: 993.00, baseMaiPerDay: 17562.57 }),
  Object.freeze({ level: 467, requiredHolding: 752528, thPerSec: 1011.46, baseMaiPerDay: 17782.05 }),
  Object.freeze({ level: 468, requiredHolding: 759040, thPerSec: 1030.25, baseMaiPerDay: 17969.98 }),
  Object.freeze({ level: 469, requiredHolding: 765608, thPerSec: 1049.39, baseMaiPerDay: 18161.40 }),
  Object.freeze({ level: 470, requiredHolding: 772232, thPerSec: 1068.89, baseMaiPerDay: 18356.38 }),
  Object.freeze({ level: 471, requiredHolding: 778914, thPerSec: 1088.75, baseMaiPerDay: 18554.97 }),
  Object.freeze({ level: 472, requiredHolding: 785654, thPerSec: 1108.98, baseMaiPerDay: 18757.26 }),
  Object.freeze({ level: 473, requiredHolding: 792452, thPerSec: 1129.58, baseMaiPerDay: 18963.31 }),
  Object.freeze({ level: 474, requiredHolding: 799309, thPerSec: 1150.57, baseMaiPerDay: 19173.19 }),
  Object.freeze({ level: 475, requiredHolding: 806226, thPerSec: 1171.95, baseMaiPerDay: 19386.96 }),
  Object.freeze({ level: 476, requiredHolding: 813202, thPerSec: 1193.72, baseMaiPerDay: 19604.71 }),
  Object.freeze({ level: 477, requiredHolding: 820238, thPerSec: 1215.90, baseMaiPerDay: 19826.50 }),
  Object.freeze({ level: 478, requiredHolding: 827336, thPerSec: 1238.49, baseMaiPerDay: 20052.42 }),
  Object.freeze({ level: 479, requiredHolding: 834495, thPerSec: 1261.50, baseMaiPerDay: 20282.53 }),
  Object.freeze({ level: 480, requiredHolding: 841716, thPerSec: 1284.94, baseMaiPerDay: 20516.92 }),
  Object.freeze({ level: 481, requiredHolding: 848999, thPerSec: 1308.82, baseMaiPerDay: 20755.66 }),
  Object.freeze({ level: 482, requiredHolding: 856345, thPerSec: 1333.13, baseMaiPerDay: 20998.84 }),
  Object.freeze({ level: 483, requiredHolding: 863755, thPerSec: 1357.90, baseMaiPerDay: 21246.53 }),
  Object.freeze({ level: 484, requiredHolding: 871229, thPerSec: 1383.13, baseMaiPerDay: 21498.83 }),
  Object.freeze({ level: 485, requiredHolding: 878768, thPerSec: 1408.83, baseMaiPerDay: 21755.82 }),
  Object.freeze({ level: 486, requiredHolding: 886371, thPerSec: 1435.01, baseMaiPerDay: 22017.58 }),
  Object.freeze({ level: 487, requiredHolding: 894041, thPerSec: 1461.67, baseMaiPerDay: 22284.20 }),
  Object.freeze({ level: 488, requiredHolding: 901777, thPerSec: 1488.83, baseMaiPerDay: 22555.78 }),
  Object.freeze({ level: 489, requiredHolding: 909580, thPerSec: 1516.49, baseMaiPerDay: 22832.41 }),
  Object.freeze({ level: 490, requiredHolding: 917451, thPerSec: 1544.67, baseMaiPerDay: 23114.17 }),
  Object.freeze({ level: 491, requiredHolding: 925389, thPerSec: 1573.37, baseMaiPerDay: 23401.17 }),
  Object.freeze({ level: 492, requiredHolding: 933396, thPerSec: 1602.60, baseMaiPerDay: 23693.50 }),
  Object.freeze({ level: 493, requiredHolding: 941473, thPerSec: 1632.38, baseMaiPerDay: 23991.26 }),
  Object.freeze({ level: 494, requiredHolding: 949619, thPerSec: 1662.71, baseMaiPerDay: 24294.56 }),
  Object.freeze({ level: 495, requiredHolding: 957836, thPerSec: 1693.60, baseMaiPerDay: 24603.49 }),
  Object.freeze({ level: 496, requiredHolding: 966124, thPerSec: 1725.07, baseMaiPerDay: 24918.16 }),
  Object.freeze({ level: 497, requiredHolding: 974484, thPerSec: 1757.12, baseMaiPerDay: 25238.68 }),
  Object.freeze({ level: 498, requiredHolding: 982916, thPerSec: 1789.77, baseMaiPerDay: 25565.15 }),
  Object.freeze({ level: 499, requiredHolding: 991421, thPerSec: 1823.02, baseMaiPerDay: 25897.69 }),
  Object.freeze({ level: 500, requiredHolding: 1000000, thPerSec: 1856.89, baseMaiPerDay: 26236.41 }),
  Object.freeze({ level: 501, requiredHolding: 1008804, thPerSec: 1891.39, baseMaiPerDay: 26581.42 }),
  Object.freeze({ level: 502, requiredHolding: 1017685, thPerSec: 1926.53, baseMaiPerDay: 26932.84 }),
  Object.freeze({ level: 503, requiredHolding: 1026644, thPerSec: 1962.33, baseMaiPerDay: 27290.79 }),
  Object.freeze({ level: 504, requiredHolding: 1035682, thPerSec: 1998.79, baseMaiPerDay: 27655.39 }),
  Object.freeze({ level: 505, requiredHolding: 1044800, thPerSec: 2035.93, baseMaiPerDay: 28026.76 }),
  Object.freeze({ level: 506, requiredHolding: 1053998, thPerSec: 2073.75, baseMaiPerDay: 28405.04 }),
  Object.freeze({ level: 507, requiredHolding: 1063277, thPerSec: 2112.28, baseMaiPerDay: 28790.34 }),
  Object.freeze({ level: 508, requiredHolding: 1072638, thPerSec: 2151.53, baseMaiPerDay: 29182.80 }),
  Object.freeze({ level: 509, requiredHolding: 1082081, thPerSec: 2191.51, baseMaiPerDay: 29582.56 }),
  Object.freeze({ level: 510, requiredHolding: 1091607, thPerSec: 2232.22, baseMaiPerDay: 29989.74 }),
  Object.freeze({ level: 511, requiredHolding: 1101217, thPerSec: 2273.70, baseMaiPerDay: 30404.49 }),
  Object.freeze({ level: 512, requiredHolding: 1110912, thPerSec: 2315.94, baseMaiPerDay: 30826.94 }),
  Object.freeze({ level: 513, requiredHolding: 1120692, thPerSec: 2358.97, baseMaiPerDay: 31257.24 }),
  Object.freeze({ level: 514, requiredHolding: 1130558, thPerSec: 2402.80, baseMaiPerDay: 31695.54 }),
  Object.freeze({ level: 515, requiredHolding: 1140511, thPerSec: 2447.45, baseMaiPerDay: 32141.98 }),
  Object.freeze({ level: 516, requiredHolding: 1150552, thPerSec: 2492.92, baseMaiPerDay: 32596.72 }),
  Object.freeze({ level: 517, requiredHolding: 1160681, thPerSec: 2539.24, baseMaiPerDay: 33059.90 }),
  Object.freeze({ level: 518, requiredHolding: 1170899, thPerSec: 2586.42, baseMaiPerDay: 33531.69 }),
  Object.freeze({ level: 519, requiredHolding: 1181207, thPerSec: 2634.47, baseMaiPerDay: 34012.25 }),
  Object.freeze({ level: 520, requiredHolding: 1191606, thPerSec: 2683.42, baseMaiPerDay: 34501.74 }),
  Object.freeze({ level: 521, requiredHolding: 1202096, thPerSec: 2733.28, baseMaiPerDay: 35000.32 }),
  Object.freeze({ level: 522, requiredHolding: 1212679, thPerSec: 2784.07, baseMaiPerDay: 35508.16 }),
  Object.freeze({ level: 523, requiredHolding: 1223355, thPerSec: 2835.79, baseMaiPerDay: 36025.44 }),
  Object.freeze({ level: 524, requiredHolding: 1234125, thPerSec: 2888.48, baseMaiPerDay: 36552.33 }),
  Object.freeze({ level: 525, requiredHolding: 1244990, thPerSec: 2942.15, baseMaiPerDay: 37089.01 }),
  Object.freeze({ level: 526, requiredHolding: 1255950, thPerSec: 2996.82, baseMaiPerDay: 37635.66 }),
  Object.freeze({ level: 527, requiredHolding: 1267007, thPerSec: 3052.50, baseMaiPerDay: 38192.47 }),
  Object.freeze({ level: 528, requiredHolding: 1278162, thPerSec: 3109.21, baseMaiPerDay: 38759.62 }),
  Object.freeze({ level: 529, requiredHolding: 1289414, thPerSec: 3166.98, baseMaiPerDay: 39337.31 }),
  Object.freeze({ level: 530, requiredHolding: 1300766, thPerSec: 3225.82, baseMaiPerDay: 39925.74 }),
  Object.freeze({ level: 531, requiredHolding: 1312217, thPerSec: 3285.76, baseMaiPerDay: 40525.10 }),
  Object.freeze({ level: 532, requiredHolding: 1323769, thPerSec: 3346.81, baseMaiPerDay: 41135.59 }),
  Object.freeze({ level: 533, requiredHolding: 1335423, thPerSec: 3408.99, baseMaiPerDay: 41757.43 }),
  Object.freeze({ level: 534, requiredHolding: 1347180, thPerSec: 3472.33, baseMaiPerDay: 42390.82 }),
  Object.freeze({ level: 535, requiredHolding: 1359040, thPerSec: 3536.85, baseMaiPerDay: 43035.98 }),
  Object.freeze({ level: 536, requiredHolding: 1371004, thPerSec: 3602.56, baseMaiPerDay: 43693.13 }),
  Object.freeze({ level: 537, requiredHolding: 1383074, thPerSec: 3669.50, baseMaiPerDay: 44362.48 }),
  Object.freeze({ level: 538, requiredHolding: 1395250, thPerSec: 3737.68, baseMaiPerDay: 45044.27 }),
  Object.freeze({ level: 539, requiredHolding: 1407533, thPerSec: 3807.12, baseMaiPerDay: 45738.74 }),
  Object.freeze({ level: 540, requiredHolding: 1419925, thPerSec: 3877.86, baseMaiPerDay: 46446.10 }),
  Object.freeze({ level: 541, requiredHolding: 1432425, thPerSec: 3949.91, baseMaiPerDay: 47166.61 }),
  Object.freeze({ level: 542, requiredHolding: 1445036, thPerSec: 4023.30, baseMaiPerDay: 47900.50 }),
  Object.freeze({ level: 543, requiredHolding: 1457757, thPerSec: 4098.05, baseMaiPerDay: 48648.03 }),
  Object.freeze({ level: 544, requiredHolding: 1470591, thPerSec: 4174.19, baseMaiPerDay: 49409.45 }),
  Object.freeze({ level: 545, requiredHolding: 1483537, thPerSec: 4251.75, baseMaiPerDay: 50185.01 }),
  Object.freeze({ level: 546, requiredHolding: 1496598, thPerSec: 4330.75, baseMaiPerDay: 50974.99 }),
  Object.freeze({ level: 547, requiredHolding: 1509773, thPerSec: 4411.21, baseMaiPerDay: 51779.64 }),
  Object.freeze({ level: 548, requiredHolding: 1523065, thPerSec: 4493.17, baseMaiPerDay: 52599.24 }),
  Object.freeze({ level: 549, requiredHolding: 1536473, thPerSec: 4576.66, baseMaiPerDay: 53434.08 }),
  Object.freeze({ level: 550, requiredHolding: 1550000, thPerSec: 4661.69, baseMaiPerDay: 54284.42 }),
  Object.freeze({ level: 551, requiredHolding: 1563613, thPerSec: 4748.31, baseMaiPerDay: 55150.56 }),
  Object.freeze({ level: 552, requiredHolding: 1577346, thPerSec: 4836.53, baseMaiPerDay: 56032.80 }),
  Object.freeze({ level: 553, requiredHolding: 1591199, thPerSec: 4926.39, baseMaiPerDay: 56931.42 }),
  Object.freeze({ level: 554, requiredHolding: 1605174, thPerSec: 5017.92, baseMaiPerDay: 57757.12 }),
  Object.freeze({ level: 555, requiredHolding: 1619271, thPerSec: 5111.16, baseMaiPerDay: 58223.29 }),
  Object.freeze({ level: 556, requiredHolding: 1633493, thPerSec: 5206.12, baseMaiPerDay: 58698.12 }),
  Object.freeze({ level: 557, requiredHolding: 1647839, thPerSec: 5302.85, baseMaiPerDay: 59181.76 }),
  Object.freeze({ level: 558, requiredHolding: 1662312, thPerSec: 5401.38, baseMaiPerDay: 59674.40 }),
  Object.freeze({ level: 559, requiredHolding: 1676911, thPerSec: 5501.74, baseMaiPerDay: 60176.19 }),
  Object.freeze({ level: 560, requiredHolding: 1691639, thPerSec: 5603.96, baseMaiPerDay: 60687.30 }),
  Object.freeze({ level: 561, requiredHolding: 1706496, thPerSec: 5708.08, baseMaiPerDay: 61207.91 }),
  Object.freeze({ level: 562, requiredHolding: 1721483, thPerSec: 5814.14, baseMaiPerDay: 61738.19 }),
  Object.freeze({ level: 563, requiredHolding: 1736602, thPerSec: 5922.16, baseMaiPerDay: 62278.32 }),
  Object.freeze({ level: 564, requiredHolding: 1751854, thPerSec: 6032.20, baseMaiPerDay: 62828.49 }),
  Object.freeze({ level: 565, requiredHolding: 1767240, thPerSec: 6144.28, baseMaiPerDay: 63388.88 }),
  Object.freeze({ level: 566, requiredHolding: 1782761, thPerSec: 6258.44, baseMaiPerDay: 63959.68 }),
  Object.freeze({ level: 567, requiredHolding: 1798418, thPerSec: 6374.72, baseMaiPerDay: 64541.09 }),
  Object.freeze({ level: 568, requiredHolding: 1814213, thPerSec: 6493.16, baseMaiPerDay: 65133.30 }),
  Object.freeze({ level: 569, requiredHolding: 1830147, thPerSec: 6613.80, baseMaiPerDay: 65736.52 }),
  Object.freeze({ level: 570, requiredHolding: 1846220, thPerSec: 6736.69, baseMaiPerDay: 66350.94 }),
  Object.freeze({ level: 571, requiredHolding: 1862435, thPerSec: 6861.86, baseMaiPerDay: 66976.78 }),
  Object.freeze({ level: 572, requiredHolding: 1878792, thPerSec: 6989.35, baseMaiPerDay: 67614.25 }),
  Object.freeze({ level: 573, requiredHolding: 1895293, thPerSec: 7119.21, baseMaiPerDay: 68263.56 }),
  Object.freeze({ level: 574, requiredHolding: 1911938, thPerSec: 7251.49, baseMaiPerDay: 68924.93 }),
  Object.freeze({ level: 575, requiredHolding: 1928730, thPerSec: 7386.22, baseMaiPerDay: 69598.59 }),
  Object.freeze({ level: 576, requiredHolding: 1945669, thPerSec: 7523.45, baseMaiPerDay: 70284.77 }),
  Object.freeze({ level: 577, requiredHolding: 1962758, thPerSec: 7663.24, baseMaiPerDay: 70983.70 }),
  Object.freeze({ level: 578, requiredHolding: 1979996, thPerSec: 7805.62, baseMaiPerDay: 71695.62 }),
  Object.freeze({ level: 579, requiredHolding: 1997385, thPerSec: 7950.65, baseMaiPerDay: 72420.76 }),
  Object.freeze({ level: 580, requiredHolding: 2014928, thPerSec: 8098.38, baseMaiPerDay: 73159.38 }),
  Object.freeze({ level: 581, requiredHolding: 2032624, thPerSec: 8248.84, baseMaiPerDay: 73911.71 }),
  Object.freeze({ level: 582, requiredHolding: 2050476, thPerSec: 8402.11, baseMaiPerDay: 74678.03 }),
  Object.freeze({ level: 583, requiredHolding: 2068484, thPerSec: 8558.22, baseMaiPerDay: 75458.59 }),
  Object.freeze({ level: 584, requiredHolding: 2086651, thPerSec: 8717.23, baseMaiPerDay: 76253.65 }),
  Object.freeze({ level: 585, requiredHolding: 2104977, thPerSec: 8879.20, baseMaiPerDay: 77063.48 }),
  Object.freeze({ level: 586, requiredHolding: 2123464, thPerSec: 9044.17, baseMaiPerDay: 77888.35 }),
  Object.freeze({ level: 587, requiredHolding: 2142114, thPerSec: 9212.21, baseMaiPerDay: 78728.56 }),
  Object.freeze({ level: 588, requiredHolding: 2160927, thPerSec: 9383.37, baseMaiPerDay: 79584.37 }),
  Object.freeze({ level: 589, requiredHolding: 2179906, thPerSec: 9557.72, baseMaiPerDay: 80456.09 }),
  Object.freeze({ level: 590, requiredHolding: 2199051, thPerSec: 9735.30, baseMaiPerDay: 81344.00 }),
  Object.freeze({ level: 591, requiredHolding: 2218365, thPerSec: 9916.18, baseMaiPerDay: 82248.41 }),
  Object.freeze({ level: 592, requiredHolding: 2237848, thPerSec: 10100.42, baseMaiPerDay: 83169.62 }),
  Object.freeze({ level: 593, requiredHolding: 2257502, thPerSec: 10288.09, baseMaiPerDay: 84107.95 }),
  Object.freeze({ level: 594, requiredHolding: 2277329, thPerSec: 10479.24, baseMaiPerDay: 85063.72 }),
  Object.freeze({ level: 595, requiredHolding: 2297329, thPerSec: 10673.95, baseMaiPerDay: 86037.24 }),
  Object.freeze({ level: 596, requiredHolding: 2317506, thPerSec: 10872.27, baseMaiPerDay: 87028.85 }),
  Object.freeze({ level: 597, requiredHolding: 2337860, thPerSec: 11074.28, baseMaiPerDay: 88038.88 }),
  Object.freeze({ level: 598, requiredHolding: 2358392, thPerSec: 11280.04, baseMaiPerDay: 89067.68 }),
  Object.freeze({ level: 599, requiredHolding: 2379105, thPerSec: 11489.62, baseMaiPerDay: 90115.60 }),
  Object.freeze({ level: 600, requiredHolding: 2400000, thPerSec: 11703.10, baseMaiPerDay: 91182.98 }),
  Object.freeze({ level: 601, requiredHolding: 2420868, thPerSec: 11920.54, baseMaiPerDay: 92270.20 }),
  Object.freeze({ level: 602, requiredHolding: 2441917, thPerSec: 12142.02, baseMaiPerDay: 93377.62 }),
  Object.freeze({ level: 603, requiredHolding: 2463149, thPerSec: 12367.62, baseMaiPerDay: 94505.61 }),
  Object.freeze({ level: 604, requiredHolding: 2484566, thPerSec: 12597.41, baseMaiPerDay: 95654.56 }),
  Object.freeze({ level: 605, requiredHolding: 2506169, thPerSec: 12831.47, baseMaiPerDay: 96824.86 }),
  Object.freeze({ level: 606, requiredHolding: 2527959, thPerSec: 13069.88, baseMaiPerDay: 98016.91 }),
  Object.freeze({ level: 607, requiredHolding: 2549940, thPerSec: 13312.72, baseMaiPerDay: 99231.10 }),
  Object.freeze({ level: 608, requiredHolding: 2572111, thPerSec: 13560.07, baseMaiPerDay: 100467.85 }),
  Object.freeze({ level: 609, requiredHolding: 2594475, thPerSec: 13812.02, baseMaiPerDay: 101727.58 }),
  Object.freeze({ level: 610, requiredHolding: 2617034, thPerSec: 14068.64, baseMaiPerDay: 103010.72 }),
  Object.freeze({ level: 611, requiredHolding: 2639789, thPerSec: 14330.04, baseMaiPerDay: 104317.69 }),
  Object.freeze({ level: 612, requiredHolding: 2662741, thPerSec: 14596.29, baseMaiPerDay: 105648.96 }),
  Object.freeze({ level: 613, requiredHolding: 2685893, thPerSec: 14867.49, baseMaiPerDay: 107004.95 }),
  Object.freeze({ level: 614, requiredHolding: 2709247, thPerSec: 15143.73, baseMaiPerDay: 108386.14 }),
  Object.freeze({ level: 615, requiredHolding: 2732803, thPerSec: 15425.10, baseMaiPerDay: 109792.99 }),
  Object.freeze({ level: 616, requiredHolding: 2756565, thPerSec: 15711.70, baseMaiPerDay: 111225.98 }),
  Object.freeze({ level: 617, requiredHolding: 2780533, thPerSec: 16003.62, baseMaiPerDay: 112685.60 }),
  Object.freeze({ level: 618, requiredHolding: 2804709, thPerSec: 16300.97, baseMaiPerDay: 114172.34 }),
  Object.freeze({ level: 619, requiredHolding: 2829096, thPerSec: 16603.84, baseMaiPerDay: 115686.70 }),
  Object.freeze({ level: 620, requiredHolding: 2853694, thPerSec: 16912.34, baseMaiPerDay: 117229.19 }),
  Object.freeze({ level: 621, requiredHolding: 2878507, thPerSec: 17226.57, baseMaiPerDay: 118800.35 }),
  Object.freeze({ level: 622, requiredHolding: 2903535, thPerSec: 17546.64, baseMaiPerDay: 120400.70 }),
  Object.freeze({ level: 623, requiredHolding: 2928781, thPerSec: 17872.66, baseMaiPerDay: 122030.78 }),
  Object.freeze({ level: 624, requiredHolding: 2954246, thPerSec: 18204.73, baseMaiPerDay: 123691.15 }),
  Object.freeze({ level: 625, requiredHolding: 2979933, thPerSec: 18542.97, baseMaiPerDay: 125382.37 }),
  Object.freeze({ level: 626, requiredHolding: 3005843, thPerSec: 18887.50, baseMaiPerDay: 127105.01 }),
  Object.freeze({ level: 627, requiredHolding: 3031978, thPerSec: 19238.43, baseMaiPerDay: 128859.66 }),
  Object.freeze({ level: 628, requiredHolding: 3058341, thPerSec: 19595.88, baseMaiPerDay: 130646.91 }),
  Object.freeze({ level: 629, requiredHolding: 3084933, thPerSec: 19959.97, baseMaiPerDay: 132467.37 }),
  Object.freeze({ level: 630, requiredHolding: 3111756, thPerSec: 20330.83, baseMaiPerDay: 134321.65 }),
  Object.freeze({ level: 631, requiredHolding: 3138812, thPerSec: 20708.58, baseMaiPerDay: 136210.39 }),
  Object.freeze({ level: 632, requiredHolding: 3166104, thPerSec: 21093.34, baseMaiPerDay: 138134.21 }),
  Object.freeze({ level: 633, requiredHolding: 3193633, thPerSec: 21485.26, baseMaiPerDay: 140093.78 }),
  Object.freeze({ level: 634, requiredHolding: 3221401, thPerSec: 21884.45, baseMaiPerDay: 142089.76 }),
  Object.freeze({ level: 635, requiredHolding: 3249410, thPerSec: 22291.07, baseMaiPerDay: 144122.83 }),
  Object.freeze({ level: 636, requiredHolding: 3277664, thPerSec: 22705.23, baseMaiPerDay: 146193.67 }),
  Object.freeze({ level: 637, requiredHolding: 3306163, thPerSec: 23127.10, baseMaiPerDay: 148302.99 }),
  Object.freeze({ level: 638, requiredHolding: 3334909, thPerSec: 23556.80, baseMaiPerDay: 150451.49 }),
  Object.freeze({ level: 639, requiredHolding: 3363906, thPerSec: 23994.48, baseMaiPerDay: 152639.92 }),
  Object.freeze({ level: 640, requiredHolding: 3393154, thPerSec: 24440.30, baseMaiPerDay: 154869.01 }),
  Object.freeze({ level: 641, requiredHolding: 3422657, thPerSec: 24894.40, baseMaiPerDay: 157139.51 }),
  Object.freeze({ level: 642, requiredHolding: 3452417, thPerSec: 25356.94, baseMaiPerDay: 159452.20 }),
  Object.freeze({ level: 643, requiredHolding: 3482435, thPerSec: 25828.07, baseMaiPerDay: 161807.86 }),
  Object.freeze({ level: 644, requiredHolding: 3512715, thPerSec: 26307.96, baseMaiPerDay: 164207.29 }),
  Object.freeze({ level: 645, requiredHolding: 3543257, thPerSec: 26796.76, baseMaiPerDay: 166651.30 }),
  Object.freeze({ level: 646, requiredHolding: 3574065, thPerSec: 27294.64, baseMaiPerDay: 169140.72 }),
  Object.freeze({ level: 647, requiredHolding: 3605141, thPerSec: 27801.78, baseMaiPerDay: 171676.39 }),
  Object.freeze({ level: 648, requiredHolding: 3636488, thPerSec: 28318.34, baseMaiPerDay: 174259.18 }),
  Object.freeze({ level: 649, requiredHolding: 3668106, thPerSec: 28844.49, baseMaiPerDay: 176889.95 }),
  Object.freeze({ level: 650, requiredHolding: 3700000, thPerSec: 29380.42, baseMaiPerDay: 179569.60 }),
]);

function getMaiMiningLevel(level) {
  const safeLevel = Math.max(1, Math.min(650, Math.trunc(Number(level) || 1)));
  return MAI_MINING_LEVELS[safeLevel - 1];
}


/* =========================================================
   BOOST PAGE
   ========================================================= */

function BoostPage({
  user,
  selectedLevel,
  setSelectedLevel,
  back,
  t,
  playClick
}) {

  const currentLevel =
    Number(
      user?.level ||
      0
    );


  const totalHolding =
    Number(
      user?.totalHolding ||
      0
    );


  const maxLevel =
    Math.min(
      650,
      Number(
        user?.maxLevel ||
        650
      )
    );


  const [
    page,
    setPage
  ] =
    useState(
      Math.floor(
        Math.max(
          0,
          currentLevel - 1
        ) /
        10
      )
    );


  const perPage =
    10;


  const maxPage =
    Math.max(
      0,
      Math.ceil(
        maxLevel /
        perPage
      ) -
      1
    );


  const pageStart =
    page *
    perPage +
    1;


  const pageEnd =
    Math.min(
      maxLevel,
      pageStart +
      perPage -
      1
    );


  const levels =
    useMemo(
      () => {

        const arr = [];


        for (
          let level =
            pageStart;
          level <=
            pageEnd;
          level++
        ) {

          arr.push(
            level
          );

        }


        return arr;

      },
      [
        pageStart,
        pageEnd
      ]
    );


  /* =======================================================
     OPEN SELECTED LEVEL
     ======================================================= */

  if (
    selectedLevel !==
    null
  ) {

    return (

      <LevelDetail

        level={
          selectedLevel
        }

        user={
          user
        }

        back={() => {

          playClick();

          setSelectedLevel(
            null
          );

        }}

        t={
          t
        }

        playClick={
          playClick
        }

      />

    );

  }


  return (

    <PageShell

      title={
        t(
          'boost'
        )
      }

      back={
        back
      }

      playClick={
        playClick
      }
    >

      {/* ===================================================
          BOOST BALANCE HERO
          =================================================== */}

      <section className="boostBalance glass">

        <div className="boostBalanceLogo">

          <MaiLogo />

        </div>


        <div>

          <span>
            {t('currentHolding')}
          </span>


          <strong>

            {
              fmtSmart(
                totalHolding,
                4
              )
            }

            {' '}

            MAI

          </strong>


          <small>

            {
              t(
                'holdingDescription'
              )
            }

          </small>

        </div>


        <div className="currentLevelPill">

          <span>
            {t('currentLevel')}
          </span>


          <b>

            LVL {
              currentLevel
            }

          </b>

        </div>

      </section>


      {/* ===================================================
          BOOST INTRO
          =================================================== */}

      <section className="boostIntro">

        <h3>
          {t('boostCenter')}
        </h3>


        <p>
          {t('boostIntro')}
        </p>


        <small>
          Approved MAI Level 1–650 mining & holding schedule
        </small>

      </section>


      {/* ===================================================
          LEVEL LIST
          =================================================== */}

      <section className="levels">

        {
          levels.map(
            level => {

              const levelSpec =
                getMaiMiningLevel(
                  level
                );


              const required =
                levelSpec.requiredHolding;


              const unlocked =
                totalHolding >=
                required;


              const current =
                level ===
                currentLevel;


              const className = [

                'levelCard',

                unlocked
                  ? 'unlocked'
                  : 'locked',

                current
                  ? 'current'
                  : ''

              ]
                .filter(
                  Boolean
                )
                .join(
                  ' '
                );


              return (

                <button
                  key={
                    level
                  }

                  className={
                    className
                  }

                  onClick={() => {

                    playClick();

                    setSelectedLevel(
                      level
                    );

                  }}
                >

                  <div className="levelCoin">

                    <MaiLogo
                      className="levelCoinLogo"
                    />


                    {
                      !unlocked && (

                        <span className="levelCoinLock">
                          🔒
                        </span>

                      )
                    }

                  </div>


                  <div className="levelCardText">

                    <strong>

                      LVL {
                        level
                      }

                    </strong>


                    <span className="levelStatusBig">

                      {
                        unlocked
                          ? t(
                              'unlocked'
                            )

                          : t(
                              'locked'
                            )
                      }

                    </span>


                    <small>

                      {
                        fmtSmart(
                          required,
                          0
                        )
                      }

                      {' '}

                      MAI

                    </small>

                    <div className="levelCardApprovedStats">
                      <span>
                        {fmtSmart(levelSpec.thPerSec, 2)} TH/s
                      </span>
                      <span>
                        {fmtSmart(levelSpec.baseMaiPerDay, 2)} MAI/Day
                      </span>
                    </div>

                  </div>


                  {
                    current && (

                      <i className="currentMark">

                        {
                          t(
                            'currentLevel'
                          )
                        }

                      </i>

                    )
                  }

                </button>

              );

            }
          )
        }

      </section>


      {/* ===================================================
          PAGER
          =================================================== */}

      <div className="pager">

        <button
          disabled={
            page <= 0
          }

          onClick={() => {

            playClick();

            setPage(
              value =>
                Math.max(
                  0,
                  value - 1
                )
            );

          }}
        >

          ‹

        </button>


        <span>

          LVL {
            pageStart
          }

          {' — '}

          {
            pageEnd
          }

        </span>


        <button
          disabled={
            page >=
            maxPage
          }

          onClick={() => {

            playClick();

            setPage(
              value =>
                Math.min(
                  maxPage,
                  value + 1
                )
            );

          }}
        >

          ›

        </button>

      </div>

    </PageShell>

  );

}


/* =========================================================
   LEVEL DETAIL
   ========================================================= */

function LevelDetail({
  level,
  user,
  back,
  t,
  playClick
}) {

  const levelSpec =
    getMaiMiningLevel(
      level
    );


  const totalHolding =
    Number(
      user?.totalHolding ||
      0
    );


  const walletHolding =
    Number(
      user?.walletHolding ||
      0
    );


  const inGame =
    Number(
      user?.inGameBalance ??
      user?.balance ??
      0
    );


  const currentLevel =
    Number(
      user?.level ||
      0
    );


  const required =
    levelSpec.requiredHolding;


  const unlocked =
    totalHolding >=
    required;


  const baseMining =
    levelSpec.thPerSec;


  const levelBonus =
    levelSpec.baseMaiPerDay;


  const computedLevelBonus =
    levelSpec.baseMaiPerDay;


  const totalMining =
    levelSpec.baseMaiPerDay;


  const nextLevel =
    Math.min(
      650,
      Number(
        user?.maxLevel ||
        650
      ),
      level + 1
    );


  const nextRequired =
    getMaiMiningLevel(
      nextLevel
    ).requiredHolding;


  const remainingForThis =
    Math.max(
      0,
      required -
      totalHolding
    );


  const progress =
    required <= 0
      ? 100

      : Math.min(
          100,
          (
            totalHolding /
            required
          ) *
          100
        );


  const nextProgress =
    nextRequired <= 0
      ? 100

      : Math.min(
          100,
          (
            totalHolding /
            nextRequired
          ) *
          100
        );


  return (

    <PageShell

      title={
        `LVL ${level}`
      }

      back={
        back
      }

      playClick={
        playClick
      }
    >

      {/* ===================================================
          PREMIUM LEVEL HERO
          =================================================== */}

      <section className="levelDetailHero glass">

        <div
          className={
            unlocked
              ? 'levelSeal unlocked'
              : 'levelSeal locked'
          }
        >

          <div className="levelLogoWrap">

            <MaiLogo
              className="levelMaiLogo"
            />


            {
              !unlocked && (

                <span className="levelLockShade">
                  🔒
                </span>

              )
            }

          </div>


          <div className="levelNumberBadge">

            LVL {
              level
            }

          </div>

        </div>


        <div className="levelHeroCopy">

          <span
            className={
              unlocked
                ? 'statusDot unlocked'
                : 'statusDot locked'
            }
          />


          <strong>

            {
              unlocked
                ? t(
                    'levelUnlocked'
                  )

                : t(
                    'levelLocked'
                  )
            }

          </strong>


          <p>

            {
              unlocked
                ? `${fmtSmart(
                    totalHolding,
                    4
                  )} MAI`

                : `${fmtSmart(
                    remainingForThis,
                    2
                  )} MAI needed`
            }

          </p>

        </div>

      </section>


      {/* ===================================================
          HOLDING PROGRESS
          =================================================== */}

      <section className="levelProgressCard glass">

        <div className="levelProgressTop">

          <div>

            <span>
              {t('currentHolding')}
            </span>


            <b>

              {
                fmtSmart(
                  totalHolding,
                  4
                )
              }

              {' '}

              MAI

            </b>

          </div>


          <div>

            <span>
              {t('requiredHolding')}
            </span>


            <b>

              {
                fmtSmart(
                  required,
                  0
                )
              }

              {' '}

              MAI

            </b>

          </div>

        </div>


        <div className="levelProgressBar">

          <i
            style={{
              width:
                `${progress}%`
            }}
          />

        </div>


        <small>

          {
            unlocked
              ? '100% unlocked'
              : `${progress.toFixed(1)}%`
          }

        </small>

      </section>


      {/* ===================================================
          COMMAND METRICS
          =================================================== */}

      <section className="levelMetricGrid">

        <div className="levelMetric glass">

          <span>
            MINING SPEED
          </span>


          <b>

            {
              fmtSmart(
                baseMining,
                4
              )
            }

          </b>


          <small>
            TH/s
          </small>

        </div>


        <div className="levelMetric glass">

          <span>
            DAILY MINING
          </span>


          <b>

            {
              fmtSmart(
                computedLevelBonus,
                2
              )
            }

          </b>


          <small>
            MAI / Day
          </small>

        </div>


        <div className="levelMetric levelMetricWide glass">

          <span>
            {t('totalDailyMining')}
          </span>


          <b>

            {
              fmtSmart(
                totalMining,
                2
              )
            }

            {' '}

            MAI

          </b>

        </div>

      </section>


      {/* ===================================================
          HOLDING BREAKDOWN
          =================================================== */}

      <section className="detailRows">

        <div className="detailRow">

          <span>
            {t('inGame')}
          </span>


          <b>

            {
              fmtSmart(
                inGame,
                4
              )
            }

            {' '}

            MAI

          </b>

        </div>


        <div className="detailRow">

          <span>
            {t('walletHolding')}
          </span>


          <b>

            {
              fmtSmart(
                walletHolding,
                4
              )
            }

            {' '}

            MAI

          </b>

        </div>


        <div className="detailRow big">

          <span>
            {t('currentHolding')}
          </span>


          <b>

            {
              fmtSmart(
                totalHolding,
                4
              )
            }

            {' '}

            MAI

          </b>

        </div>


        <div className="detailRow">

          <span>
            {t('requiredHolding')}
          </span>


          <b>

            {
              fmtSmart(
                required,
                0
              )
            }

            {' '}

            MAI

          </b>

        </div>

      </section>


      {/* ===================================================
          NEXT LEVEL
          =================================================== */}

      {
        level <
        Math.min(
          650,
          Number(
            user?.maxLevel ||
            650
          )
        ) && (

          <section className="nextLevelCard glass">

            <div className="sectionHead">

              <div>

                <h3>
                  {t('nextLevel')}
                </h3>


                <p>

                  LVL {
                    nextLevel
                  }

                </p>

              </div>


              <b>

                {
                  fmtSmart(
                    nextRequired,
                    0
                  )
                }

                {' '}

                MAI

              </b>

            </div>


            <div className="progress">

              <i
                style={{
                  width:
                    `${nextProgress}%`
                }}
              />

            </div>


            <div className="next">

              <span>

                {
                  nextProgress
                    .toFixed(
                      1
                    )
                }%

              </span>


              <span>

                {
            Math.max(0, nextRequired - totalHolding).toLocaleString(undefined, {
             minimumFractionDigits: 2,
           maximumFractionDigits: 2
          })
        }
         {" "}
           MAI

              </span>

            </div>

          </section>

        )
      }


      <button
        className={
          unlocked
            ? 'unlockedBtn'
            : 'lockedLevelBtn'
        }

        onClick={() => {

          playClick();

          if (unlocked) {
            back();
            return;
          }

          const buyUrl = 'https://app.tonkeeper.com/dapp/https%3A%2F%2Fapp.ston.fi%2Fswap%3Fft%3DGRAM%26utm_source%3Dtonkeeper%26utm_medium%3Dorganic%26utm_campaign%3Ddefi%26utm_content%3DEQDCJL0iQHofcBBvFBHdVG233Ri2V4kCNFgfRT-gqAd3Oc86%26chartVisible%3Dfalse%26tt%3DEQD5pWilwl9ypQ1JFxoDktsQl_LAALALnqHjZoxhx_2nET-r';

         if (window.Telegram?.WebApp?.openLink) {
  window.Telegram.WebApp.openLink(buyUrl);
} else {
  window.open(buyUrl, '_blank', 'noopener,noreferrer');
}
        }}
      >

        {
          
  unlocked
    ? `✓ ${t(
        'unlocked'
      )}`
    : (
        <span className="buyMaiContent">
          <span className="buyMaiPremiumIcon">
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 2.5L15 8.6L21.7 9.6L16.85 14.3L18 21L12 17.85L6 21L7.15 14.3L2.3 9.6L9 8.6L12 2.5Z"
                fill="currentColor"
              />
            </svg>
          </span>

          <span>BUY MAI</span>
        </span>
      )
}
        

      </button>

    </PageShell>

  );

}


/* =========================================================
   END OF APP.JS PART 2 / 4
   ========================================================= */
   /* =========================================================
   APP.JS — PART 3 / 4

   TASKS
   ADS
   PARTNER
   EXCLUSIVE
   PROMOTE
   ========================================================= */


/* =========================================================
   TASK ACTION LABEL
   ========================================================= */

function taskButtonLabel(
  task,
  busyKey,
  t
) {

  if (
    busyKey ===
    task.key
  ) {

    if (
      task.state ===
      'check' ||
      task.state ===
      'try_again'
    ) {

      return t(
        'checking'
      );

    }


    if (
      task.state ===
      'claim'
    ) {

      return t(
        'claiming'
      );

    }

  }


  switch (
    task.state
  ) {

    case 'check':
      return t(
        'check'
      );


    case 'try_again':
      return t(
        'tryAgain'
      );


    case 'claim':
      return t(
        'claim'
      );


    case 'claimed':
      return t(
        'claimed'
      );


    default:
      return t(
        'join'
      );

  }

}


/* =========================================================
   TASK STATUS TEXT
   ========================================================= */

function taskStatusText(
  task,
  t
) {

  switch (
    task.state
  ) {

    case 'check':
      return t(
        'membershipRequired'
      );


    case 'try_again':
      return t(
        'taskNotJoined'
      );


    case 'claim':
      return t(
        'taskVerified'
      );


    case 'claimed':
      return t(
        'completedToday'
      );


    default:
      return t(
        'membershipRequired'
      );

  }

}


/* =========================================================
   TASKS PAGE
   ========================================================= */

function TasksPage({
  tasks,
  setTasks,
  user,
  setBoot,
  openPromote,
  toast,
  action,
  t,
  playClick,
  playReward
}) {

  const [
    sub,
    setSub
  ] =
    useState(
      'daily'
    );


  const [
    adsBusy,
    setAdsBusy
  ] =
    useState(
      false
    );


  const [
    taskBusy,
    setTaskBusy
  ] =
    useState(
      ''
    );


  const [
    campaigns,
    setCampaigns
  ] =
    useState(
      []
    );


  const [
    campaignsLoading,
    setCampaignsLoading
  ] =
    useState(
      false
    );


  const [
    campaignTimers,
    setCampaignTimers
  ] =
    useState(
      {}
    );


  const [
    campaignNow,
    setCampaignNow
  ] =
    useState(
      Date.now()
    );


  useEffect(
    () => {

      const timer =
        setInterval(
          () =>
            setCampaignNow(
              Date.now()
            ),
          250
        );


      return () =>
        clearInterval(
          timer
        );

    },
    []
  );


  const [
    cooldown,
    setCooldown
  ] =
    useState(
      0
    );


  /* =======================================================
     LOAD TASKS IF NEEDED
     ======================================================= */

  useEffect(
    () => {

      if (
        tasks
      ) {

        return;

      }


      api(
        '/api/tasks'
      )
        .then(
          data => {

            setTasks(
              data.tasks
            );

          }
        )
        .catch(
          error => {

            toast(
              error.message
            );

          }
        );

    },
    [
      tasks,
      setTasks,
      toast
    ]
  );


  /* =======================================================
     LOAD EXCLUSIVE
     ======================================================= */

  useEffect(
    () => {

      if (
        sub !==
        'exclusive'
      ) {

        return;

      }


      setCampaignsLoading(
        true
      );


      api(
        '/api/campaigns/exclusive'
      )
        .then(
          data => {

            setCampaigns(
              data.items ||
              []
            );

          }
        )
        .catch(
          error => {

            toast(
              error.message
            );

          }
        )
        .finally(
          () => {

            setCampaignsLoading(
              false
            );

          }
        );

    },
    [
      sub,
      toast
    ]
  );


  /* =======================================================
     AD COOLDOWN TIMER
     ======================================================= */

  useEffect(
    () => {

      if (
        cooldown <=
        0
      ) {

        return;

      }


      const timer =
        setInterval(
          () => {

            setCooldown(
              value =>
                Math.max(
                  0,
                  value - 1
                )
            );

          },
          1000
        );


      return () =>
        clearInterval(
          timer
        );

    },
    [
      cooldown
    ]
  );


  /* =======================================================
     TAB CHANGE
     ======================================================= */

  const changeSub =
    next => {

      playClick();


      setSub(
        next
      );

  };


  /* =======================================================
     ADSGRAM REWARDED AD
     Loads the official AdsGram browser SDK only when needed.
     Existing external-provider flow remains available.
     ======================================================= */

  const loadAdsgramSdk =
    () =>
      new Promise((resolve, reject) => {
        if (window.Adsgram?.init) {
          resolve(window.Adsgram);
          return;
        }

        const existing = document.querySelector(
          'script[data-mai-adsgram-sdk="1"]'
        );

        if (existing) {
          existing.addEventListener('load', () => resolve(window.Adsgram), { once: true });
          existing.addEventListener('error', () => reject(new Error('AdsGram SDK failed to load')), { once: true });
          return;
        }

        const script = document.createElement('script');
        script.src = 'https://sad.adsgram.ai/js/sad.min.js';
        script.async = true;
        script.dataset.maiAdsgramSdk = '1';
        script.onload = () => resolve(window.Adsgram);
        script.onerror = () => reject(new Error('AdsGram SDK failed to load'));
        document.head.appendChild(script);
      });

  const claimCompletedAd =
    async sessionId => {
      const claim = await api(
        `/api/ads/claim/${sessionId}`,
        { method: 'POST' }
      );

      setBoot(old => ({ ...old, user: claim.user }));
      setTasks(claim.tasks);
      setCooldown(Number(claim?.tasks?.ads?.cooldown || 0));
      playReward();
      toast(`+${fmtSmart(claim.reward, 4)} MAI`);
    };

  /* =======================================================
     WATCH AD
     ======================================================= */

  const watchAd =
    () => {
      action(
        async () => {
          if (adsBusy || cooldown > 0) return;

          playClick();
          setAdsBusy(true);

          try {
            const started = await api('/api/ads/start', { method: 'POST' });

            /* AdsGram Reward flow. The SDK promise resolves only after a
               rewarded ad is completed. The backend session is still the
               authority for limits, cooldown and the actual MAI credit. */
            if (started.provider === 'adsgram') {
              const Adsgram = await loadAdsgramSdk();
              if (!Adsgram?.init) {
                throw new Error('AdsGram is unavailable');
              }

              const controller = Adsgram.init({
                blockId: String(started.blockId || '49496'),
                debug: Boolean(started.debug),
                debugConsole: false,
                debugBannerType: 'FullscreenMedia'
              });

              await controller.show();

              await api(`/api/ads/adsgram-complete/${started.sessionId}`, {
                method: 'POST'
              });

              await claimCompletedAd(started.sessionId);
              return;
            }

            /* Preserve the existing external-provider integration. */
            if (!started.url) {
              throw new Error('Ad provider did not return a URL');
            }

            openLink(started.url);
            toast('Finish the ad, then return to MAI.');

            let attempts = 0;
            const poll = setInterval(async () => {
              attempts += 1;
              try {
                const status = await api(`/api/ads/status/${started.sessionId}`);

                if (status.status === 'completed' && !status.claimed_at) {
                  clearInterval(poll);
                  await claimCompletedAd(started.sessionId);
                } else if (attempts > 90) {
                  clearInterval(poll);
                  toast('Ad was not completed.');
                }
              } catch {
                /* Temporary poll errors are intentionally ignored. */
              }
            }, 2000);
          } catch (error) {
            const message = String(error?.description || error?.message || 'Ad was not completed.');
            toast(message);
          } finally {
            setAdsBusy(false);
          }
        }
      );
    };


  /* =======================================================
     JOIN TASK
     ======================================================= */

  const joinTask =
    async task => {

      setTaskBusy(
        task.key
      );


      try {

        playClick();


        /*
          Record JOIN click on server first.
        */

        const data =
          await api(

            `/api/tasks/join/${task.key}`,

            {
              method:
                'POST'
            }

          );


        setTasks(
          data.tasks
        );


        /*
          Open Telegram after state is stored.
        */

        openLink(
          data.link ||
          task.link
        );


        toast(
          t(
            'membershipRequired'
          )
        );


      } finally {

        setTaskBusy(
          ''
        );

      }

  };


  /* =======================================================
     CHECK TASK
     ======================================================= */

  const checkTask =
    async task => {

      setTaskBusy(
        task.key
      );


      try {

        playClick();


        const data =
          await api(

            `/api/tasks/check/${task.key}`,

            {
              method:
                'POST'
            }

          );


        if (
          data.tasks
        ) {

          setTasks(
            data.tasks
          );

        }


        if (
          data.state ===
          'claim'
        ) {

          toast(
            t(
              'taskVerified'
            )
          );

        }


      } catch (
        error
      ) {

        if (
          error.data
            ?.tasks
        ) {

          setTasks(
            error.data.tasks
          );

        }


        if (
          error.data
            ?.state ===
          'try_again'
        ) {

          toast(
            t(
              'taskNotJoined'
            )
          );


        } else {

          toast(
            error.message
          );

        }


      } finally {

        setTaskBusy(
          ''
        );

      }

  };


  /* =======================================================
     CLAIM TASK
     ======================================================= */

  const claimTask =
    async task => {

      setTaskBusy(
        task.key
      );


      try {

        playClick();


        const data =
          await api(

            `/api/tasks/claim/${task.key}`,

            {
              method:
                'POST'
            }

          );


        if (
          data.user
        ) {

          setBoot(
            old => ({

              ...old,

              user:
                data.user

            })
          );

        }


        if (
          data.tasks
        ) {

          setTasks(
            data.tasks
          );

        }


        if (
          data.rewarded
        ) {

          playReward();

        }


        toast(

          data.rewarded
            ? `+${fmtSmart(
                data.reward,
                4
              )} MAI — ${t(
                'claimed'
              )}`

            : t(
                'claimed'
              )

        );


      } catch (
        error
      ) {

        toast(
          error.message
        );


      } finally {

        setTaskBusy(
          ''
        );

      }

  };


  /* =======================================================
     TASK ACTION
     ======================================================= */

  const taskAction =
    task => {

      if (
        taskBusy
      ) {

        return;

      }


      switch (
        task.state
      ) {

        case 'check':
        case 'try_again':

          checkTask(
            task
          );

          break;


        case 'claim':

          claimTask(
            task
          );

          break;


        case 'claimed':

          playClick();

          break;


        default:

          joinTask(
            task
          );

          break;

      }

  };


  /* =======================================================
     COMPLETE EXCLUSIVE
     ======================================================= */

  const openCampaign =
    campaign => {

      action(
        async () => {

          playClick();


          const data =
            await api(
              `/api/campaigns/${campaign.id}/open`,
              {
                method:
                  'POST'
              }
            );


          const waitSeconds =
            Math.max(
              1,
              Number(
                data.waitSeconds ||
                8
              )
            );


          setCampaignTimers(
            old => ({
              ...old,
              [campaign.id]:
                Date.now() +
                waitSeconds *
                1000
            })
          );


          openLink(
            data.targetUrl ||
            campaign.target_url
          );


          toast(
            `Return to MAI after ${waitSeconds} seconds to claim your reward.`
          );

        }
      );

  };


  const claimCampaign =
    campaign => {

      const readyAt =
        Number(
          campaignTimers[
            campaign.id
          ] ||
          0
        );


      if (
        !readyAt ||
        Date.now() < readyAt
      ) {

        return;

      }


      action(
        async () => {

          playClick();


          if (
            ![
              'telegram_member',
              'manual'
            ].includes(
              campaign
                .verification_type
            )
          ) {

            toast(
              'This mission requires external verification.'
            );


            return;

          }


          const data =
            await api(
              `/api/campaigns/${campaign.id}/complete`,
              {
                method:
                  'POST'
              }
            );


          if (
            data.user
          ) {

            setBoot(
              old => ({
                ...old,
                user:
                  data.user
              })
            );

          }


          setCampaignTimers(
            old => {

              const next = {
                ...old
              };


              delete next[
                campaign.id
              ];


              return next;

            }
          );


          if (
            Number(
              data.reward ||
              0
            ) > 0
          ) {

            playReward();


            toast(
              `+${fmtSmart(
                data.reward,
                4
              )} MAI`
            );


          } else {

            toast(
              'Mission completed'
            );

          }


          const refreshed =
            await api(
              '/api/campaigns/exclusive'
            );


          setCampaigns(
            refreshed.items ||
            []
          );

        }
      );

  };


  if (
    !tasks
  ) {

    return (

      <div className="tasksPage">

        <div className="empty glass">
          Loading...
        </div>

      </div>

    );

  }


  const ads =
    tasks.ads ||
    {};


  const joins =
    tasks.joins ||
    [];


  return (

    <div className="tasksPage">

      {/* ===================================================
          TASK TABS
          =================================================== */}

      <div className="tabs taskTabs">

        <button
          className={
            sub ===
            'daily'
              ? 'active'
              : ''
          }

          onClick={() =>
            changeSub(
              'daily'
            )
          }
        >

          {t('daily')}

        </button>


        <button
          className={
            sub ===
            'partner'
              ? 'active'
              : ''
          }

          onClick={() =>
            changeSub(
              'partner'
            )
          }
        >

          {t('partner')}

        </button>


        <button
          className={
            sub ===
            'exclusive'
              ? 'active'
              : ''
          }

          onClick={() =>
            changeSub(
              'exclusive'
            )
          }
        >

          {t('exclusive')}

        </button>

      </div>


      {/* ===================================================
          DAILY
          =================================================== */}

      {
        sub ===
        'daily' && (

          <div className="stack">

            <section className="taskSectionIntro glass">

              <div className="taskSectionIcon">

                <Icon name="star" />

              </div>


              <div>

                <h3>
                  {t('dailyTasks')}
                </h3>


                <p>
                  {t('dailyTasksSub')}
                </p>


                <span>
                  {t('utcReset')}
                </span>

              </div>

            </section>


            {/* =============================================
                AD CARD
                ============================================= */}

            <div className="taskCard taskCardPremium feature glass">

              <div className="taskCardIcon adIcon">

               <svg
  viewBox="0 0 24 24"
  width="27"
  height="27"
  fill="none"
  stroke="currentColor"
  strokeWidth="1.8"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <rect x="3" y="5" width="18" height="14" rx="3" />
  <path d="M10 9l5 3-5 3V9z" />
  <path d="M8 2h8" />
</svg>

              </div>


              <div className="taskCardBody">

                <div className="taskCardTop">

                  <b>
                    {t('watchAds')}
                  </b>


                  <span className="rewardBadge">

                    +{
                      fmtSmart(
                        ads.reward,
                        4
                      )
                    }

                    {' '}

                    MAI

                  </span>

                </div>


                <p>

                  {
                    t(
                      'dailyLimit'
                    )
                  }

                  {' '}

                  {
                    Number(
                      ads.completed ||
                      0
                    )
                  }

                  /

                  {
                    Number(
                      ads.limit ||
                      0
                    )
                  }

                </p>


                <div className="taskProgressBar">

                  <i
                    style={{
                      width:
                        `${Math.min(
                          100,
                          (
                            Number(
                              ads.completed ||
                              0
                            ) /
                            Math.max(
                              1,
                              Number(
                                ads.limit ||
                                1
                              )
                            )
                          ) *
                          100
                        )}%`
                    }}
                  />

                </div>


                <small>
                  {t('utcReset')}
                </small>

              </div>


              <button
                className="taskActionBtn"

                disabled={
                  adsBusy ||
                  cooldown >
                    0 ||
                  Number(
                    ads.remaining ||
                    0
                  ) <=
                    0
                }

                onClick={
                  watchAd
                }
              >

                {
                  cooldown >
                  0
                    ? `${cooldown}s`

                    : Number(
                        ads.remaining ||
                        0
                      ) <=
                      0
                    ? t(
                        'claimed'
                      )

                    : t(
                        'watch'
                      )
                }

              </button>

            </div>


            {/* =============================================
                JOIN TASKS
                ============================================= */}

            {
              joins.map(
                task => {

                  const claimed =
                    task.state ===
                    'claimed';


                  const verified =
                    task.state ===
                      'claim' ||
                    claimed;


                  return (

                    <div
                      className={
                        [
                          'taskCard',
                          'taskCardPremium',
                          'glass',
                          claimed
                            ? 'taskClaimed'
                            : '',
                          verified
                            ? 'taskVerified'
                            : ''
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ' '
                          )
                      }

                      key={
                        task.key
                      }
                    >

                    <div className="taskCardIcon">
  <Icon
    name={
      task.title === 'MAI News'
        ? 'news'
        : task.title === 'MAI Pay Out'
        ? 'wallet'
        : task.title === 'MAI Chat Group'
        ? 'people'
        : 'link'
    }
  />
</div>


                      <div className="taskCardBody">

                        <div className="taskCardTop">

                          <b>
                            {task.title}
                          </b>


                          <span className="rewardBadge">

                            +{
                              fmtSmart(
                                task.reward,
                                4
                              )
                            }

                            {' '}

                            MAI

                          </span>

                        </div>


                        <p>

                          {
                            taskStatusText(
                              task,
                              t
                            )
                          }

                        </p>


                        <div className="taskStateLine">

                          {
                            task.state ===
                            'claimed'
                              ? (

                                <>

                                  <i className="stateDot stateDone" />

                                  <span>
                                    {t('claimed')}
                                  </span>

                                </>

                              )

                            : task.state ===
                              'claim'
                              ? (

                                <>

                                  <i className="stateDot stateReady" />

                                  <span>
                                    {t('verified')}
                                  </span>

                                </>

                              )

                            : task.state ===
                              'try_again'
                              ? (

                                <>

                                  <i className="stateDot stateWarn" />

                                  <span>
                                    {t('tryAgain')}
                                  </span>

                                </>

                              )

                            : (

                                <>

                                  <i className="stateDot" />

                                  <span>
                                    {t('utcReset')}
                                  </span>

                                </>

                              )
                          }

                        </div>

                      </div>


                      <button
                        className={
                          [
                            'taskActionBtn',
                            task.state ===
                            'claim'
                              ? 'claimReady'
                              : '',
                            claimed
                              ? 'done'
                              : '',
                            task.state ===
                            'try_again'
                              ? 'retry'
                              : ''
                          ]
                            .filter(
                              Boolean
                            )
                            .join(
                              ' '
                            )
                        }

                        disabled={
                          taskBusy ===
                            task.key ||
                          claimed
                        }

                        onClick={() =>
                          taskAction(
                            task
                          )
                        }
                      >

                        {
                          taskButtonLabel(
                            task,
                            taskBusy,
                            t
                          )
                        }

                      </button>

                    </div>

                  );

                }
              )
            }

          </div>

        )
      }


      {/* ===================================================
          PARTNER
          =================================================== */}

      {
        sub ===
        'partner' && (

          <div className="partner">

            <section className="partnerHero glass">

              <div className="partnerHeroGlow" />


              <div className="partnerHeroIcon">

                <Icon name="rocket" />

              </div>


              <div className="partnerHeroCopy">

                <span className="eyebrow">

                  MAI GROWTH CENTER

                </span>


                <h2>
                  {t('partnerPromotions')}
                </h2>


                <p>
                  {t('promoteSubtitle')}
                </p>

              </div>

            </section>


            <section className="promoFeatureGrid">

              <div className="promoFeature glass">

                <Icon name="people" />

                <b>
                  {t('premiumReach')}
                </b>

                <span>
                  Real MAI users
                </span>

              </div>


              <div className="promoFeature glass">

                <Icon name="shield" />

                <b>
                  {t('approval')}
                </b>

                <span>
                  Safer campaigns
                </span>

              </div>


              <div className="promoFeature glass">

                <Icon name="bolt" />

                <b>
                  {t('tracking')}
                </b>

                <span>
                  Target progress
                </span>

              </div>


              <div className="promoFeature glass">

                <Icon name="wallet" />

                <b>
                  {t('payment')}
                </b>

                <span>
                  Flexible payment
                </span>

              </div>

            </section>


            <section className="promoInfo glass">

              <Icon name="star" />


              <div>

                <b>
                  {t('premiumReach')}
                </b>


                <p>
                  {t('premiumReachText')}
                </p>


                <div className="chips">

                  <span>
                    100 = 0.2 GRAM
                  </span>

                  <span>
                    MAI / GRAM
                  </span>

                  <span>
                    Admin Review
                  </span>

                </div>

              </div>

            </section>


            <button
              className="goldBtn full promoteMainBtn"

              onClick={() => {

                playClick();

                openPromote();

              }}
            >

              ＋ {
                t(
                  'addPromote'
                )
              }

            </button>

          </div>

        )
      }


      {/* ===================================================
          EXCLUSIVE
          =================================================== */}

      {
        sub ===
        'exclusive' && (

          <div className="stack">

            <section className="sectionHead premiumSectionHead">

              <div>

                <h3>
                  {t('exclusiveMissions')}
                </h3>


                <p>
                  {t('exclusiveSub')}
                </p>

              </div>

            </section>


            {
              campaignsLoading
                ? (

                  <div className="empty glass">
                    Loading...
                  </div>

                )

              : campaigns.length
                ? campaigns.map(
                    campaign => (

                      <div
                        className="exclusiveCard glass"

                        key={
                          campaign.id
                        }
                      >

                        <div className="exclusiveIcon">

                          <Icon name="crown" />

                        </div>


                        <div className="exclusiveBody">

                          <span className="exclusiveType">

                            {
                              campaign.type
                            }

                          </span>


                          <b>

                            {
                              campaign.title
                            }

                          </b>


                          <p>

                            {
                              campaign.description ||
                              t(
                                'exclusiveSub'
                              )
                            }

                          </p>


                          <div className="exclusiveMeta">

                            <span>

                              {
                                campaign
                                  .completed_count
                              }

                              /

                              {
                                campaign
                                  .target_count
                              }

                            </span>


                            {
                              Number(
                                campaign
                                  .reward_per_user ||
                                0
                              ) >
                                0 && (

                                <strong>

                                  +{
                                    fmtSmart(
                                      campaign
                                        .reward_per_user,
                                      4
                                    )
                                  }

                                  {' '}

                                  MAI

                                </strong>

                              )
                            }

                          </div>

                        </div>


                        {(() => {

                          const readyAt =
                            Number(
                              campaignTimers[
                                campaign.id
                              ] ||
                              0
                            );


                          const remaining =
                            readyAt
                              ? Math.max(
                                  0,
                                  Math.ceil(
                                    (
                                      readyAt -
                                      campaignNow
                                    ) /
                                    1000
                                  )
                                )
                              : 0;


                          const completed =
                            campaign.completed_by_user === true;


                          const canClaim =
                            !completed &&
                            readyAt > 0 &&
                            remaining === 0;


                          return (

                            <button
                              className={`taskActionBtn campaignActionBtn ${
                                completed
                                  ? 'complete'
                                  : canClaim
                                    ? 'claimReady'
                                    : readyAt
                                      ? 'counting'
                                      : ''
                              }`}

                              disabled={
                                completed ||
                                (
                                  readyAt > 0 &&
                                  !canClaim
                                )
                              }

                              onClick={() => {

                                if (
                                  completed
                                ) {

                                  return;

                                }


                                canClaim
                                  ? claimCampaign(
                                      campaign
                                    )
                                  : openCampaign(
                                      campaign
                                    );

                              }}
                            >

                              {
                                completed
                                  ? '✓ COMPLETE'
                                  : canClaim
                                    ? 'CLAIM'
                                    : readyAt
                                      ? `${remaining}s`
                                      : t('open')
                              }

                            </button>

                          );

                        })()}

                      </div>

                    )
                  )

                : (

                  <div className="empty glass">

                    {
                      t(
                        'noCampaigns'
                      )
                    }

                  </div>

                )
            }

          </div>

        )
      }

    </div>

  );

}


/* =========================================================
   PROMOTE PAGE
   ========================================================= */

function PromotePage({
  back,
  user,
  config,
  toast,
  refresh,
  t,
  playClick
}) {

  const address =
    useTonAddress();


  const [
    tonConnectUI
  ] =
    useTonConnectUI();


  const [
    type,
    setType
  ] =
    useState(
      'Channel'
    );


  const [
    title,
    setTitle
  ] =
    useState(
      ''
    );


  const [
    url,
    setUrl
  ] =
    useState(
      ''
    );


  const [
    description,
    setDescription
  ] =
    useState(
      ''
    );


  const [
    count,
    setCount
  ] =
    useState(
      Number(
        config
          ?.minCompletions ||
        100
      )
    );


  const [
    paymentMethod,
    setPaymentMethod
  ] =
    useState(
      'GRAM'
    );


  const [
    quote,
    setQuote
  ] =
    useState({

      targetCount:
        100,

      GRAM:
        0.2,

      MAI:
        0,

      receiverWallet:
        config
          ?.receiverWallet ||
        null

    });


  const [
    quoteLoading,
    setQuoteLoading
  ] =
    useState(
      false
    );


  const [
    submitting,
    setSubmitting
  ] =
    useState(
      false
    );


  const [
    promoteWalletBalance,
    setPromoteWalletBalance
  ] =
    useState(
      0
    );


  const [
    promoteBalanceLoading,
    setPromoteBalanceLoading
  ] =
    useState(
      false
    );


  const packages =
    Array.isArray(
      config?.packages
    )
      ? config.packages
      : [
          100,
          500,
          1000,
          2000,
          5000,
          10000
        ];


  /* =======================================================
     LOAD QUOTE
     ======================================================= */

  useEffect(
    () => {

      const timer =
        setTimeout(
          () => {

            setQuoteLoading(
              true
            );


            api(
              '/api/campaigns/quote',
              {
                method:
                  'POST',

                body: {

                  targetCount:
                    Number(
                      count
                    )

                }
              }
            )
              .then(
                data => {

                  setQuote(
                    data
                  );

                }
              )
              .catch(
                error => {

                  console.warn(
                    'Promotion quote:',
                    error
                  );

                }
              )
              .finally(
                () => {

                  setQuoteLoading(
                    false
                  );

                }
              );

          },
          220
        );


      return () =>
        clearTimeout(
          timer
        );

    },
    [
      count
    ]
  );


  /* =======================================================
     LOAD CONNECTED WALLET MAI BALANCE
     ======================================================= */

  useEffect(
    () => {

      let cancelled =
        false;


      if (
        paymentMethod !==
          'MAI' ||
        !address
      ) {

        setPromoteWalletBalance(
          0
        );

        setPromoteBalanceLoading(
          false
        );

        return undefined;

      }


      setPromoteBalanceLoading(
        true
      );


      api(
        '/api/wallet/mai-balance'
      )
        .then(
          data => {

            if (
              cancelled
            ) {

              return;

            }


            setPromoteWalletBalance(
              Number(
                data?.walletBalance ??
                data?.balance ??
                0
              )
            );

          }
        )
        .catch(
          error => {

            if (
              !cancelled
            ) {

              console.warn(
                'Promotion MAI balance:',
                error
              );

              setPromoteWalletBalance(
                0
              );

            }

          }
        )
        .finally(
          () => {

            if (
              !cancelled
            ) {

              setPromoteBalanceLoading(
                false
              );

            }

          }
        );


      return () => {

        cancelled =
          true;

      };

    },
    [
      paymentMethod,
      address
    ]
  );


  /* =======================================================
     PACKAGE SELECT
     ======================================================= */

  const choosePackage =
    value => {

      playClick();


      setCount(
        Number(
          value
        )
      );

  };


  /* =======================================================
     PAYMENT SELECT
     ======================================================= */

  const choosePayment =
    method => {

      playClick();


      setPaymentMethod(
        method
      );

  };


  /* =======================================================
     SUBMIT
     ======================================================= */

  const wait =
    milliseconds =>
      new Promise(
        resolve =>
          setTimeout(
            resolve,
            milliseconds
          )
      );


  const submit =
    async () => {

      if (
        submitting
      ) {

        return;

      }


      const cleanTitle =
        title.trim();


      const cleanUrl =
        url.trim();


      if (
        !cleanTitle
      ) {

        toast(
          'Enter a campaign title.'
        );


        return;

      }


      if (
        !/^https?:\/\//i.test(
          cleanUrl
        )
      ) {

        toast(
          'Enter a valid https:// link.'
        );


        return;

      }


      if (
        !address
      ) {

        toast(
          `Connect your TON wallet before paying with ${paymentMethod}.`
        );


        try {

          await tonConnectUI
            .openModal();

        } catch {}


        return;

      }


      playClick();


      setSubmitting(
        true
      );


      try {

        /*
          Step 1:
          Server creates the campaign and calculates the payment.
          The frontend never decides the trusted GRAM amount or
          receiver wallet.
        */

        const data =
          await api(
            '/api/campaigns',
            {
              method:
                'POST',

              body: {

                type,

                title:
                  cleanTitle,

                targetUrl:
                  cleanUrl,

                description:
                  description.trim(),

                targetCount:
                  Number(
                    count
                  ),

                paymentMethod,

                verificationType:
                  'manual'
              }
            }
          );


        if (
          paymentMethod ===
          'MAI'
        ) {

          const receiverWallet =
            String(
              data?.payment
                ?.receiverWallet ||
              ''
            ).trim();


          const payerJettonWallet =
            String(
              data?.payment
                ?.payerJettonWallet ||
              ''
            ).trim();


          const amountAtomic =
            String(
              data?.payment
                ?.amountAtomic ||
              ''
            ).trim();


          const requiredMai =
            Number(
              data?.payment
                ?.amount ??
              data?.campaign
                ?.payment_amount ??
              quote.MAI ??
              0
            );


          if (
            Number.isFinite(
              requiredMai
            ) &&
            requiredMai > 0 &&
            promoteWalletBalance <
              requiredMai
          ) {

            throw new Error(
              `Insufficient MAI balance. Required ${fmtSmart(requiredMai, 4)} MAI.`
            );

          }


          if (
            !receiverWallet ||
            !payerJettonWallet ||
            !/^\d+$/.test(
              amountAtomic
            )
          ) {

            throw new Error(
              'Secure MAI wallet payment information is unavailable.'
            );

          }


          let canonicalReceiverWallet;
          let canonicalPayerJettonWallet;
          let canonicalSenderWallet;


          try {

            canonicalReceiverWallet =
             Address.parse(
           receiverWallet
              ).toString();

            canonicalPayerJettonWallet =
             Address.parse(
           payerJettonWallet
             ).toString();

           canonicalSenderWallet =
             Address.parse(
              address
             ).toString();

          } catch {

            throw new Error(
              'Invalid TON address returned for MAI payment. Please refresh and try again.'
            );

          }


          const transferBody =
            beginCell()
              .storeUint(
                0x0f8a7ea5,
                32
              )
              .storeUint(
                BigInt(
                  data.campaign.id
                ),
                64
              )
              .storeCoins(
                BigInt(
                  amountAtomic
                )
              )
              .storeAddress(
                Address.parse(
                  canonicalReceiverWallet
                )
              )
              .storeAddress(
                Address.parse(
                  canonicalSenderWallet
                )
              )
              .storeBit(
                0
              )
              .storeCoins(
                1n
              )
              .storeBit(
                0
              )
              .endCell();


          await tonConnectUI
            .sendTransaction({

              validUntil:
                Math.floor(
                  Date.now() /
                  1000
                ) +
                300,

              network:
                '-239',

              messages: [
                {
                  address:
                    canonicalPayerJettonWallet,

                  amount:
                    toNano(
                      '0.08'
                    ).toString(),

                  payload:
                    bytesToBase64(
                      transferBody
                        .toBoc()
                    )
                }
              ]

            });


          toast(
            'MAI payment sent. Waiting for blockchain confirmation...'
          );


          let verified =
            false;


          let lastError =
            null;


          for (
            let attempt = 0;
            attempt < 12;
            attempt += 1
          ) {

            if (
              attempt > 0
            ) {

              await wait(
                3000
              );

            }


            try {

              const verification =
                await api(
                  `/api/campaigns/${data.campaign.id}/verify-payment`,
                  {
                    method:
                      'POST'
                  }
                );


              if (
                verification?.verified
              ) {

                verified =
                  true;

                break;

              }


            } catch (
              error
            ) {

              lastError =
                error;

            }

          }


          if (
            !verified
          ) {

            throw new Error(
              lastError?.message ||
              'MAI payment was sent but is not finalized yet. Please try verification again shortly.'
            );

          }


          toast(
            `MAI payment verified — campaign #${data.campaign.id} activated.`
          );


          await refresh();

          back();

          return;

        }


        const receiverWallet =
          String(
            data?.payment
              ?.receiverWallet ||
            ''
          ).trim();


        const amountNano =
          String(
            data?.payment
              ?.amountNano ||
            ''
          ).trim();
      

        if (
          !receiverWallet ||
          !/^\d+$/.test(
            amountNano
          )
        ) {

          throw new Error(
            'Secure GRAM payment information is unavailable.'
          );

        }


        /*
          Step 2:
          TON Connect asks the wallet to send the exact server-issued
          nanogram amount to the server-issued receiver wallet.
        */

        await tonConnectUI
          .sendTransaction({

            validUntil:
              Math.floor(
                Date.now() /
                1000
              ) +
              300,

            network:
              '-239',

            messages: [
              {
                address:
                  receiverWallet,

                amount:
                  amountNano
              }
            ]

          });


        toast(
          'Payment sent. Waiting for blockchain confirmation...'
        );


        /*
          Step 3:
          TON Connect success means the wallet accepted/broadcast the
          transaction. It does NOT mark the campaign paid. The backend
          independently verifies the finalized incoming transaction.
        */

        let verified =
          false;


        let lastError =
          null;


        for (
          let attempt = 0;
          attempt < 10;
          attempt += 1
        ) {

          if (
            attempt > 0
          ) {

            await wait(
              3000
            );

          }


          try {

            const verification =
              await api(
                `/api/campaigns/${data.campaign.id}/verify-payment`,
                {
                  method:
                    'POST'
                }
              );


            if (
              verification?.verified
            ) {

              verified =
                true;

              break;

            }


          } catch (
            error
          ) {

            lastError =
              error;

          }

        }


        if (
          !verified
        ) {

          throw new Error(
            lastError?.message ||
            'Payment was sent but is not finalized yet. Please try verification again shortly.'
          );

        }


        toast(
          `Payment verified — campaign #${data.campaign.id} activated.`
        );


        await refresh();

        back();


      } catch (
        error
      ) {

        toast(
          error.message
        );


      } finally {

        setSubmitting(
          false
        );

      }

  };


  const selectedCost =

    paymentMethod ===
      'GRAM'

      ? Number(
          quote.GRAM ||
          0
        )

      : Number(
          quote.MAI ||
          0
        );


  return (

    <PageShell

      title={
        t(
          'addPromote'
        )
      }

      back={
        back
      }

      playClick={
        playClick
      }
    >

      {/* ===================================================
          PROMOTE HERO
          =================================================== */}

      <section className="promoteHero glass">

        <div className="promoteHeroIcon">

          <Icon name="rocket" />

        </div>


        <div>

          <span>
            MAI PROMOTION CENTER
          </span>


          <h2>
            {t('premiumReach')}
          </h2>


          <p>
            {t('promoteSubtitle')}
          </p>

        </div>

      </section>


      {/* ===================================================
          PRICING HIGHLIGHT
          =================================================== */}

      <section className="promotePriceHero glass">

        <div>

          <span>
            BASE PACKAGE
          </span>


          <strong>
            100
          </strong>


          <small>
            {t('completions')}
          </small>

        </div>


        <div className="promoteEquals">
          =
        </div>


        <div>

          <span>
            PRICE
          </span>


          <strong>
            0.2
          </strong>


          <small>
            GRAM
          </small>

        </div>

      </section>


      {/* ===================================================
          FORM
          =================================================== */}

      <section className="form promoteForm glass">

        <label>

          {t('campaignType')}


          <select
            value={
              type
            }

            onChange={
              event =>
                setType(
                  event
                    .target
                    .value
                )
            }
          >

            {
              [
                'Channel',
                'Group',
                'Bot',
                'Website',
                'Link'
              ].map(
                value => (

                  <option
                    value={
                      value
                    }

                    key={
                      value
                    }
                  >

                    {value}

                  </option>

                )
              )
            }

          </select>

        </label>


        <label>

          {t('campaignTitle')}


          <input
            value={
              title
            }

            maxLength={
              120
            }

            onChange={
              event =>
                setTitle(
                  event
                    .target
                    .value
                )
            }

            placeholder="Example: Join MAI Community"
          />

        </label>


        <label>

          {t('campaignLink')}


          <input
            value={
              url
            }

            onChange={
              event =>
                setUrl(
                  event
                    .target
                    .value
                )
            }

            placeholder="https://t.me/..."
          />

        </label>


        <label>

          {t('campaignDescription')}


          <textarea
            value={
              description
            }

            maxLength={
              700
            }

            onChange={
              event =>
                setDescription(
                  event
                    .target
                    .value
                )
            }

            placeholder="Tell MAI users why they should check out your campaign..."
          />

        </label>


        {/* =================================================
            PACKAGE OPTIONS
            ================================================= */}

        <div className="formGroup">

          <span className="formGroupLabel">

            {
              t(
                'promotionPackage'
              )
            }

          </span>


          <div className="packageGrid">

            {
              packages.map(
                value => (

                  <button
                    key={
                      value
                    }

                    type="button"

                    className={
                      Number(
                        count
                      ) ===
                      Number(
                        value
                      )
                        ? 'packageBtn active'
                        : 'packageBtn'
                    }

                    onClick={() =>
                      choosePackage(
                        value
                      )
                    }
                  >

                    <b>
                      {
                        Number(
                          value
                        ).toLocaleString()
                      }
                    </b>


                    <span>
                      USERS
                    </span>

                  </button>

                )
              )
            }

          </div>

        </div>


        <label>

          {t('completions')}


          <input
            type="number"

            min={
              Number(
                config
                  ?.minCompletions ||
                100
              )
            }

            max={
              Number(
                config
                  ?.maxCompletions ||
                10000
              )
            }

            step="100"

            value={
              count
            }

            onChange={
              event =>
                setCount(
                  Math.max(
                    Number(
                      config
                        ?.minCompletions ||
                      100
                    ),
                    Number(
                      event
                        .target
                        .value ||
                      100
                    )
                  )
                )
            }
          />

        </label>


        {/* =================================================
            PAYMENT METHOD
            ================================================= */}

        <div className="formGroup">

          <span className="formGroupLabel">

            {
              t(
                'paymentMethod'
              )
            }

          </span>


          <div className="payTabs">

            <button
              type="button"

              className={
                paymentMethod ===
                'GRAM'
                  ? 'active'
                  : ''
              }

              onClick={() =>
                choosePayment(
                  'GRAM'
                )
              }
            >

              GRAM

            </button>


            <button
              type="button"

              className={
                paymentMethod ===
                'MAI'
                  ? 'active'
                  : ''
              }

              onClick={() =>
                choosePayment(
                  'MAI'
                )
              }
            >

              MAI

            </button>

          </div>

        </div>


        {/* =================================================
            QUOTE
            ================================================= */}

        <div className="promotionQuoteCard">

          <div className="quoteHeader">

            <span>
              {t('promotionCost')}
            </span>


            <b>

              {
                quoteLoading
                  ? '...'

                  : `${fmtSmart(
                      selectedCost,
                      paymentMethod ===
                        'GRAM'
                        ? 6
                        : 4
                    )} ${paymentMethod}`
              }

            </b>

          </div>


          <div className="quoteBreakdown">

            <div>

              <span>
                {t('gramEquivalent')}
              </span>


              <b>

                {
                  fmtSmart(
                    quote.GRAM,
                    6
                  )
                }

                {' '}

                GRAM

              </b>

            </div>


            <div>

              <span>
                {t('maiEquivalent')}
              </span>


              <b>

                {
                  fmtSmart(
                    quote.MAI,
                    4
                  )
                }

                {' '}

                MAI

              </b>

            </div>


            <div>

              <span>
                {t('completions')}
              </span>


              <b>

                {
                  Number(
                    quote.targetCount ||
                    count
                  ).toLocaleString()
                }

              </b>

            </div>

          </div>

        </div>


        {/* =================================================
            PAYMENT WALLET
            ================================================= */}

        <div className="paymentWalletCard">

          <div>

            <span>
              {t('paymentWallet')}
            </span>


            <b>

              {
                quote.receiverWallet ||
                config
                  ?.receiverWallet

                  ? short(
                      quote.receiverWallet ||
                      config
                        ?.receiverWallet
                    )

                  : t(
                      'walletNotConfigured'
                    )
              }

            </b>

          </div>


          <Icon name="wallet" />

        </div>


        {/* =================================================
            USER BALANCE NOTICE
            ================================================= */}

        {
          paymentMethod ===
          'MAI' && (

            <div className="promoteBalanceNotice">

              <span>
                {t('availableBalance')}
              </span>


              <b>

                {
                  promoteBalanceLoading
                    ? '...'
                    : fmtSmart(
                        promoteWalletBalance,
                        4
                      )
                }

                {' '}

                MAI

              </b>

            </div>

          )
        }


        <p className="promoteNotice">

          {t('promoteNotice')}

        </p>


        <button
          className="goldBtn full submitPromotionBtn"

          disabled={
            submitting ||
            !title.trim() ||
            !url.trim()
          }

          onClick={
            submit
          }
        >

          {
            submitting
              ? t(
                  'submitting'
                )

              : t(
                  'submitPromotion'
                )
          }

        </button>

      </section>

    </PageShell>

  );

}


/* =========================================================
   END OF APP.JS PART 3 / 4
   ========================================================= */
   /* =========================================================
   APP.JS — PART 4 / 4

   FRIENDS
   PROFILE
   SETTINGS
   TERMS
   WITHDRAW
   BOTTOM NAVIGATION
   ========================================================= */


/* =========================================================
   FRIENDS PAGE
   ========================================================= */

function FriendsPage({
  data,
  setData,
  toast,
  setBoot,
  t,
  playClick,
  playReward
}) {

  const [
    loading,
    setLoading
  ] =
    useState(
      false
    );


  const load =
    useCallback(
      async () => {

        setLoading(
          true
        );


        try {

          const result =
            await api(
              '/api/referrals'
            );


          setData(
            result
          );


        } catch (
          error
        ) {

          toast(
            error.message
          );


        } finally {

          setLoading(
            false
          );

        }

      },
      [
        setData,
        toast
      ]
    );


  useEffect(
    () => {

      load();

    },
    [
      load
    ]
  );


  if (
    !data
  ) {

    return (

      <div className="friendsPage">

        <div className="empty glass">

          {
            loading
              ? 'Loading...'
              : t(
                  'noReferrals'
                )
          }

        </div>

      </div>

    );

  }


  /* =======================================================
     SHARE REFERRAL
     ======================================================= */

  const share =
    () => {

      playClick();


      const text =

        'Join MAI Network and start mining MAI with me 🚀';


      const shareUrl =

        `https://t.me/share/url?url=${encodeURIComponent(
          data.link
        )}` +

        `&text=${encodeURIComponent(
          text
        )}`;


      openLink(
        shareUrl
      );

  };


  /* =======================================================
     COPY REFERRAL
     ======================================================= */

  const copy =
    async () => {

      playClick();


      try {

        await navigator
          .clipboard
          .writeText(
            data.link
          );


        toast(
          t(
            'copied'
          )
        );


      } catch {

        toast(
          data.link
        );

      }

  };


  /* =======================================================
     MILESTONE CLAIM
     ======================================================= */

  const claimMilestone =
    async milestone => {

      if (
        !milestone.unlocked ||
        milestone.claimed
      ) {

        return;

      }


      playClick();


      try {

        const result =
          await api(

            `/api/referrals/milestones/${milestone.count}`,

            {
              method:
                'POST'
            }

          );


        if (
          result.user
        ) {

          setBoot(
            old => ({

              ...old,

              user:
                result.user

            })
          );

        }


        playReward();


        toast(

          `+${fmtSmart(
            result.reward,
            4
          )} MAI`

        );


        await load();


      } catch (
        error
      ) {

        toast(
          error.message
        );

      }

  };


  return (

    <div className="friendsPage">

      {/* ===================================================
          HERO
          =================================================== */}

      <section className="friendsHero glass">

        <span className="friendsGlow" />


        <div className="friendsHeroLogo">

          <MaiLogo />

        </div>


        <span className="eyebrow">

          MAI COMMUNITY

        </span>


        <h2>
          {t('inviteHero')}
        </h2>


        <p>
          {t('inviteDescription')}
        </p>


        {/* =================================================
            STATS
            ================================================= */}

        <div className="refStats premiumRefStats">

          <div>

            <span>
              {t('successful')}
            </span>


            <b>
              {data.successful}
            </b>

          </div>


          <div>

            <span>
              {t('pendingFriends')}
            </span>


            <b>
              {data.pending}
            </b>

          </div>


          <div>

            <span>
              {t('maiEarned')}
            </span>


            <b>

              {
                fmtSmart(
                  data.totalEarned,
                  2
                )
              }

            </b>

          </div>

        </div>


        {/* =================================================
            REFERRAL LINK
            ================================================= */}

        <div className="referralLinkBox">

          <span>
            REFERRAL LINK
          </span>


          <b>
            {short(data.link)}
          </b>

        </div>


        <div className="refHeroActions">

          <button
            className="goldBtn"

            onClick={
              share
            }
          >

            <Icon name="people" />

            {
              t(
                'inviteFriend'
              )
            }

          </button>


          <button
            className="copyBtn"

            onClick={
              copy
            }
          >

            <Icon name="copy" />

            {
              t(
                'copyLink'
              )
            }

          </button>

        </div>

      </section>


      {/* ===================================================
          MILESTONES
          =================================================== */}

      <section className="friendsSection">

        <div className="sectionHead premiumSectionHead">

          <div>

            <h3>
              {t('milestones')}
            </h3>


            <p>
              Unlock bonus MAI as your network grows.
            </p>

          </div>

        </div>


        <div className="milestones premiumMilestones">

          {
            data.milestones.map(
              milestone => (

                <div
                  className={
                    [
                      'mile',
                      'glass',

                      milestone.unlocked
                        ? 'ready'
                        : '',

                      milestone.claimed
                        ? 'claimed'
                        : ''

                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      )
                  }

                  key={
                    milestone.count
                  }
                >

                  <div className="mileIcon">

                    {
                      milestone.claimed
                        ? '✓'
                        : '♛'
                    }

                  </div>


                  <div className="mileContent">

                    <span>

                      {
                        milestone.count
                      }

                      {' '}

                      {
                        t(
                          'friends'
                        )
                      }

                    </span>


                    <b>

                      +{
                        fmtSmart(
                          milestone.reward,
                          2
                        )
                      }

                      {' '}

                      MAI

                    </b>

                  </div>


                  <button
                    disabled={
                      !milestone.unlocked ||
                      milestone.claimed
                    }

                    onClick={() =>
                      claimMilestone(
                        milestone
                      )
                    }
                  >

                    {
                      milestone.claimed
                        ? t(
                            'claimed'
                          )

                      : milestone.unlocked
                        ? t(
                            'claim'
                          )

                        : t(
                            'locked'
                          )
                    }

                  </button>

                </div>

              )
            )
          }

        </div>

      </section>


      {/* ===================================================
          HISTORY
          =================================================== */}

      <section className="friendsSection">

        <div className="sectionHead premiumSectionHead">

          <div>

            <h3>
              {t('referralHistory')}
            </h3>


            <p>
              Latest MAI Network invitations.
            </p>

          </div>

        </div>


        <div className="stack">

          {
            data.items.length
              ? data.items.map(
                  item => (

                    <div
                      className="refRow premiumRefRow glass"

                      key={
                        item.telegram_id
                      }
                    >

                      <div className="avatar small">

                        {
                          item.photo_url
                            ? (

                              <img
                                src={
                                  item.photo_url
                                }

                                alt=""
                              />

                            )
                            : (

                              <span>

                                {
                                  item
                                    .first_name
                                    ?.[0] ||
                                  'M'
                                }

                              </span>

                            )
                        }

                      </div>


                      <div>

                        <b>

                          {
                            item.first_name ||
                            'MAI User'
                          }

                        </b>


                        <span>

                          {
                            new Date(
                              item.created_at
                            )
                              .toLocaleDateString()
                          }

                        </span>

                      </div>


                      <em
                        className={
                          item
                            .referral_qualified
                            ? 'ok'
                            : 'pending'
                        }
                      >

                        {
                          item
                            .referral_qualified
                            ? t(
                                'successful'
                              )
                            : t(
                                'pendingFriends'
                              )
                        }

                      </em>

                    </div>

                  )
                )

              : (

                <div className="empty glass">

                  {t('noReferrals')}

                </div>

              )
          }

        </div>

      </section>

    </div>

  );

}


/* =========================================================
   PROFILE PAGE
   ========================================================= */

function ProfilePage({
  user,
  openWithdraw,
  openTerms,
    isAdmin,
  openAdmin,
  supportUrl,
  withdrawals,
  setWithdrawals,
  toast,
  preferences,
  savePreferences,
  languageName,
  t,
  playClick
}) {

  const [
    languageOpen,
    setLanguageOpen
  ] =
    useState(
      false
    );


  const [
    settingsBusy,
    setSettingsBusy
  ] =
    useState(
      false
    );


  /* =======================================================
     WITHDRAW HISTORY
     ======================================================= */

  useEffect(
    () => {

      api(
        '/api/withdrawals'
      )
        .then(
          data =>
            setWithdrawals(
              data
            )
        )
        .catch(
          () => {}
        );

    },
    [
      setWithdrawals
    ]
  );


  /* =======================================================
     HOLDING DATA
     IMPORTANT:
     TOTAL = IN-GAME + TON WALLET
     ======================================================= */

  const inGame =
    Number(
      user?.inGameBalance ??
      user?.balance ??
      0
    );


  const walletHolding =
    Number(
      user?.walletHolding ||
      0
    );


  const totalHolding =
    Number(
      user?.totalHolding ??
      (
        inGame +
        walletHolding
      )
    );


  const currentLevel =
    Number(
      user?.level ||
      0
    );


  const maxLevel =
    Number(
      user?.maxLevel ||
      1000
    );


  const holdingStep =
    Math.max(
      1,
      Number(
        user?.holdingStep ||
        1000
      )
    );


  const nextLevel =
    Math.min(
      maxLevel,
      currentLevel + 1
    );


  const nextRequired =
    nextLevel *
    holdingStep;


  const remaining =
    Math.max(
      0,
      nextRequired -
      totalHolding
    );


  const progress =
    currentLevel >=
    maxLevel
      ? 100

      : Math.min(
          100,
          (
            totalHolding -
            (
              currentLevel *
              holdingStep
            )
          ) /
          holdingStep *
          100
        );


  /* =======================================================
     SAVE SETTING
     ======================================================= */

  const updatePreference =
    async changes => {

      if (
        settingsBusy
      ) {

        return;

      }


      playClick();


      setSettingsBusy(
        true
      );


      try {

        await savePreferences(
          changes
        );


        toast(
          t(
            'settingsSaved'
          )
        );


      } catch (
        error
      ) {

        toast(
          error.message
        );


      } finally {

        setSettingsBusy(
          false
        );

      }

  };

       
  /* =======================================================
     SUPPORT
     ======================================================= */

  const openSupport =
    () => {

      playClick();


      toast(
        t(
          'supportOpening'
        )
      );


      openLink(
        supportUrl
      );

  };


  return (

    <div className="profilePage">

      {/* ===================================================
          PROFILE HERO
          =================================================== */}

      <section className="profileHero premiumProfileHero glass">

        <div className="profileHeroGlow" />


        <div className="avatar big">

          {
            user.photoUrl
              ? (

                <img
                  src={
                    user.photoUrl
                  }

                  alt=""
                />

              )
              : (

                <span>

                  {
                    user
                      .firstName
                      ?.[0] ||
                    'M'
                  }

                </span>

              )
          }

        </div>


        <span className="eyebrow">
          {t('profileCenter')}
        </span>


        <h2>

          {
            user.firstName ||
            'MAI User'
          }

        </h2>


        <span className="profileUsername">

          @{

            user.username ||
            'telegram-user'

          }

        </span>


        <div className="badges">

          <i>
            LVL {currentLevel}
          </i>


          <i>

            {
              user
                ?.referrals
                ?.successful ||
              0
            }

            {' '}

            {
              t(
                'friends'
              )
            }

          </i>


          <i>
            ✓ Telegram
          </i>

        </div>

      </section>


      {/* ===================================================
          WALLET CENTER
          =================================================== */}

      <section className="walletCard premiumWalletCard glass">

        <div className="sectionHead">

          <div>

            <h3>
              {t('walletCenter')}
            </h3>


            <p>

              {
                short(
                  user.walletAddress,
                  t(
                    'notConnected'
                  )
                )
              }

            </p>

          </div>


          <TonConnectButton />

        </div>


        <div className="securityLine">

          <span>
            TON Connect
          </span>


          <b
            className={
              user.walletAddress
                ? 'green'
                : ''
            }
          >

            {
              user.walletAddress
                ? t(
                    'connected'
                  )
                : t(
                    'notConnected'
                  )
            }

          </b>

        </div>

      </section>


      {/* ===================================================
          HOLDING CENTER

          FIX:
          Previously Profile showed user.balance only.
          Now it uses totalHolding and walletHolding.
          =================================================== */}

      <section className="holding premiumHolding glass">

        <div className="holdingHeroTop">

          <div>

            <span className="eyebrow">
              {t('maiHolding')}
            </span>


            <strong>

              {
                fmtSmart(
                  totalHolding,
                  4
                )
              }

              {' '}

              MAI

            </strong>


            <p>
              {t('holdingDescription')}
            </p>

          </div>


          <div className="profileLevelOrb">

            <span>
              LVL
            </span>


            <b>
              {currentLevel}
            </b>

          </div>

        </div>


        <div className="profileHoldingBreakdown">

          <div>

            <span>
              {t('inGame')}
            </span>


            <b>

              {
                fmtSmart(
                  inGame,
                  4
                )
              }

            </b>

          </div>


          <div>

            <span>
              {t('wallet')}
            </span>


            <b>

              {
                fmtSmart(
                  walletHolding,
                  4
                )
              }

            </b>

          </div>


          <div>

            <span>
              {t('totalBalance')}
            </span>


            <b>

              {
                fmtSmart(
                  totalHolding,
                  4
                )
              }

            </b>

          </div>

        </div>


        <div className="progress profileProgress">

          <i
            style={{
              width:
                `${Math.max(
                  0,
                  progress
                )}%`
            }}
          />

        </div>


        <div className="next">

          <span>

            {
              currentLevel >=
              maxLevel
                ? t(
                    'maxLevel'
                  )

                : `LVL ${currentLevel} → LVL ${nextLevel}`
            }

          </span>


          <span>

            {
              currentLevel >=
              maxLevel
                ? t(
                    'maxLevel'
                  )

              :  `${Number(remaining).toLocaleString(undefined, {
                 minimumFractionDigits: 2,
             maximumFractionDigits: 2
           })} MAI`
            }

          </span>

        </div>

      </section>


      {/* ===================================================
          WITHDRAW
          =================================================== */}

      <button
        className="withdrawHero premiumWithdrawHero glass"

        onClick={() => {

          playClick();

          openWithdraw();

        }}
      >

        <span className="withdrawHeroIcon">

          <MaiLogo className="withdrawMaiLogo" />

        </span>


        <div>

          <b>
            {t('withdraw')}
          </b>


          <span>
            {t('withdrawSub')}
          </span>

        </div>


        <em>
          ›
        </em>

      </button>


      {/* ===================================================
          SECURITY
          =================================================== */}

      <section className="security premiumSecurity glass">

        <div className="sectionHead premiumSectionHead">

          <div>

            <h3>
              {t('securityCenter')}
            </h3>


            <p>
              MAI account protection status
            </p>

          </div>


          <Icon name="shield" />

        </div>


        <div className="securityLine">

          <span>
            {t('telegramAuth')}
          </span>


          <b className="green">
            ✓ {t('verified')}
          </b>

        </div>


        <div className="securityLine">

          <span>
            {t('walletBinding')}
          </span>


          <b
            className={
              user.walletAddress
                ? 'green'
                : ''
            }
          >

            {
              user.walletAddress
                ? t(
                    'active'
                  )
                : t(
                    'required'
                  )
            }

          </b>

        </div>


        <div className="securityLine">

          <span>
            {t('lockedBalance')}
          </span>


          <b>

            {
              fmtSmart(
                user.lockedBalance,
                4
              )
            }

            {' '}

            MAI

          </b>

        </div>

      </section>


      {/* ===================================================
          SETTINGS & HELP
          =================================================== */}

      <section className="settings premiumSettings glass">

        <div className="sectionHead premiumSectionHead">

          <div>

            <h3>
              {t('settingsHelp')}
            </h3>


            <p>
              Personalize your MAI experience
            </p>

          </div>


          <Icon name="globe" />

        </div>


        {/* =================================================
            NOTIFICATIONS
            ================================================= */}

        <button
          className="settingRow"

          disabled={
            settingsBusy
          }

          onClick={() =>
            updatePreference({

              notificationsEnabled:
                !preferences
                  .notificationsEnabled

            })
          }
        >

          <span className="settingLeft">

            <i className="settingIcon">

              <Icon name="bell" />

            </i>


            <span>

              <b>
                {t('notifications')}
              </b>


              <small>
                Reward and activity alerts
              </small>

            </span>

          </span>


          <span
            className={
              preferences
                .notificationsEnabled
                ? 'toggle active'
                : 'toggle'
            }
          >

            <i />

          </span>

        </button>


        {/* =================================================
            SOUND
            ================================================= */}

        <button
          className="settingRow"

          disabled={
            settingsBusy
          }

          onClick={() =>
            updatePreference({

              soundEnabled:
                !preferences
                  .soundEnabled

            })
          }
        >

          <span className="settingLeft">

            <i className="settingIcon">

              <Icon name="sound" />

            </i>


            <span>

              <b>
                {t('sound')}
              </b>


              <small>
                Navigation and reward sounds
              </small>

            </span>

          </span>


          <span
            className={
              preferences
                .soundEnabled
                ? 'toggle active'
                : 'toggle'
            }
          >

            <i />

          </span>

        </button>


        {/* =================================================
            LANGUAGE
            ================================================= */}

        <button
          className="settingRow"

          onClick={() => {

            playClick();

            setLanguageOpen(
              value =>
                !value
            );

          }}
        >

          <span className="settingLeft">

            <i className="settingIcon">

              <Icon name="globe" />

            </i>


            <span>

              <b>
                {t('language')}
              </b>


              <small>

                {
                  languageName(
                    preferences
                      .language
                  )
                }

              </small>

            </span>

          </span>


          <em>
            {
              languageOpen
                ? '⌃'
                : '›'
            }
          </em>

        </button>


        {
          languageOpen && (

            <div className="languagePanel">

              <button
                className={
                  preferences.language ===
                  'en'
                    ? 'active'
                    : ''
                }

                onClick={() =>
                  updatePreference({
                    language:
                      'en'
                  })
                }
              >

                <span>
                  🇬🇧
                </span>

                <b>
                  English
                </b>

                {
                  preferences.language ===
                  'en' && (
                    <em>
                      ✓
                    </em>
                  )
                }

              </button>


              <button
                className={
                  preferences.language ===
                  'ar'
                    ? 'active'
                    : ''
                }

                onClick={() =>
                  updatePreference({
                    language:
                      'ar'
                  })
                }
              >

                <span>
                  🇸🇦
                </span>

                <b>
                  العربية
                </b>

                {
                  preferences.language ===
                  'ar' && (
                    <em>
                      ✓
                    </em>
                  )
                }

              </button>


              <button
                className={
                  preferences.language ===
                  'ru'
                    ? 'active'
                    : ''
                }

                onClick={() =>
                  updatePreference({
                    language:
                      'ru'
                  })
                }
              >

                <span>
                  🇷🇺
                </span>

                <b>
                  Русский
                </b>

                {
                  preferences.language ===
                  'ru' && (
                    <em>
                      ✓
                    </em>
                  )
                }

              </button>

            </div>

          )
        }


        {/* =================================================
            TERMS
            ================================================= */}

        <button
          className="settingRow"

          onClick={() => {

            playClick();

            openTerms();

          }}
        >

          <span className="settingLeft">

            <i className="settingIcon">

              <Icon name="terms" />

            </i>


            <span>

              <b>
                {t('termsPrivacy')}
              </b>


              <small>
                Rules, wallet and privacy information
              </small>

            </span>

          </span>


          <em>
            ›
          </em>

        </button>

{/* =================================================
    ADMIN CONTROL CENTER
    ================================================= */}

{isAdmin && (

  <button
    className="settingRow"

    onClick={() => {

      playClick();

      openAdmin();

    }}
  >

    <span className="settingLeft">

      <i className="settingIcon">

        <Icon name="shield" />

      </i>


      <span>

        <b>
          Admin Control Center
        </b>

        <small>
          MAI Network administration
        </small>

      </span>

    </span>


        <em>
          ›
         </em>

        </button>

      )}
        {/* =================================================
            SUPPORT
            ================================================= */}

        <button
          className="settingRow"

          onClick={
            openSupport
          }
        >

          <span className="settingLeft">

            <i className="settingIcon">

              <Icon name="support" />

            </i>


            <span>

              <b>
                {t('support')}
              </b>


              <small>
                MAI News / official support
              </small>

            </span>

          </span>


          <em>
            ↗
          </em>

        </button>

      </section>

    </div>

  );

}


/* =========================================================
   TERMS & PRIVACY PAGE
   ========================================================= */

function TermsPage({
  back,
  t,
  playClick
}) {

  return (

    <PageShell

      title={
        t(
          'termsTitle'
        )
      }

      back={
        back
      }

      playClick={
        playClick
      }
    >

      <section className="termsHero glass">

        <Icon name="shield" />


        <div>

          <h2>
            {t('termsTitle')}
          </h2>


          <p>
            {t('termsIntro')}
          </p>

        </div>

      </section>


      <section className="termsStack">

        <div className="termsCard glass">

          <span>
            01
          </span>


          <div>

            <h3>
              {t('termsRewardsTitle')}
            </h3>


            <p>
              {t('termsRewards')}
            </p>

          </div>

        </div>


        <div className="termsCard glass">

          <span>
            02
          </span>


          <div>

            <h3>
              {t('termsWalletTitle')}
            </h3>


            <p>
              {t('termsWallet')}
            </p>

          </div>

        </div>


        <div className="termsCard glass">

          <span>
            03
          </span>


          <div>

            <h3>
              {t('termsDataTitle')}
            </h3>


            <p>
              {t('termsData')}
            </p>

          </div>

        </div>


        <div className="termsCard glass">

          <span>
            04
          </span>


          <div>

            <h3>
              {t('termsExternalTitle')}
            </h3>


            <p>
              {t('termsExternal')}
            </p>

          </div>

        </div>


        <div className="termsCard glass">

          <span>
            05
          </span>


          <div>

            <h3>
              {t('termsPromoTitle')}
            </h3>


            <p>
              {t('termsPromo')}
            </p>

          </div>

        </div>

      </section>


      <button
        className="goldBtn full"

        onClick={() => {

          playClick();

          back();

        }}
      >

        {t('close')}

      </button>

    </PageShell>

  );

}


/* =========================================================
   WITHDRAW PAGE
   ========================================================= */

function WithdrawPage({
  back,
  user,
  setBoot,
  toast,
  playReward,
  t,
  playClick
}) {

  const [amount, setAmount] = useState('');
  const [history, setHistory] = useState([]);
  const [minimum, setMinimum] = useState(500);
  const [feeFixed, setFeeFixed] = useState(70);
  const [feePercent, setFeePercent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [challengeBusy, setChallengeBusy] = useState(false);
  const [challenge, setChallenge] = useState(null);
  const [challengeCode, setChallengeCode] = useState('');
  const [challengeSeconds, setChallengeSeconds] = useState(0);

  const load = useCallback(async () => {
    try {
      const data = await api('/api/withdrawals');
      setHistory(data.items || []);
      setMinimum(Number(data.minWithdrawal || 500));
      setFeeFixed(Number(data.withdrawFeeFixed ?? 70));
      setFeePercent(Number(data.withdrawFeePercent ?? 0));
    } catch (error) {
      toast(error.message);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!challenge?.expiresAt) {
      setChallengeSeconds(0);
      return undefined;
    }

    const tick = () => {
      const seconds = Math.max(
        0,
        Math.ceil((new Date(challenge.expiresAt).getTime() - Date.now()) / 1000)
      );
      setChallengeSeconds(seconds);
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [challenge]);

  useEffect(() => {
    if (!challenge) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [challenge]);

  const available = Number(user?.inGameBalance ?? user?.balance ?? 0);
  const numericAmount = Number(amount || 0);
  const calculatedFee = Math.max(
    0,
    feeFixed + (numericAmount * feePercent) / 100
  );
  const receiveAmount = Math.max(0, numericAmount - calculatedFee);

  const activeWithdrawal = history.find(item =>
    ['pending', 'security_check', 'approved', 'processing'].includes(
      String(item.status || '').toLowerCase()
    )
  );

  const validateAmount = () => {
    if (!Number.isFinite(numericAmount) || numericAmount < minimum) {
      toast(`Minimum ${minimum} MAI`);
      return false;
    }
    if (numericAmount > available) {
      toast('Insufficient in-game balance');
      return false;
    }
    if (!user.walletAddress) {
      toast(t('connectWallet'));
      return false;
    }
    if (receiveAmount <= 0) {
      toast('Withdrawal amount must be greater than the fee');
      return false;
    }
    if (activeWithdrawal) {
      toast('You already have an active withdrawal');
      return false;
    }
    return true;
  };

  const requestChallenge = async () => {
    if (!validateAmount()) return;

    playClick();
    setChallengeBusy(true);
    setChallengeCode('');

    try {
      const data = await api('/api/withdrawals/challenge', {
        method: 'POST',
        body: { amount: numericAmount }
      });
      setChallenge(data.challenge || null);
    } catch (error) {
      toast(error.message);
    } finally {
      setChallengeBusy(false);
    }
  };

  const closeChallenge = () => {
    if (busy) return;
    playClick();
    setChallenge(null);
    setChallengeCode('');
  };

  const submitVerifiedWithdrawal = async () => {
    if (!challenge || busy) return;

    if (challengeSeconds <= 0) {
      toast('Security code expired. Refresh and try again.');
      return;
    }

    const normalizedCode = String(challengeCode || '').trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(normalizedCode)) {
      toast('Enter the 6-character security code');
      return;
    }

    setBusy(true);
    playClick();

    try {
      const randomKey = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}_${Math.random()}`;

      const data = await api('/api/withdrawals', {
        method: 'POST',
        body: {
          amount: numericAmount,
          challengeId: challenge.id,
          challengeCode: normalizedCode
        },
        idempotency: randomKey
      });

      if (data.user) {
        setBoot(old => ({ ...old, user: data.user }));
      }

      playReward();
      toast(`Withdrawal: ${data.withdrawal.status}`);
      setAmount('');
      setChallenge(null);
      setChallengeCode('');
      await load();
    } catch (error) {
      toast(error.message);
      if (/expired|no longer valid|max|attempt/i.test(String(error.message || ''))) {
        setChallenge(null);
        setChallengeCode('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title={t('withdrawTitle')} back={back} playClick={playClick}>
      <section className="withdrawBox glass">
        <div className="balanceBig">
          <span>{t('availableBalance')}</span>
          <b>{fmtSmart(available, 4)} MAI</b>
        </div>

        <div className="miniGrid">
          <div>
            <span>{t('minimum')}</span>
            <b>{fmtSmart(minimum, 0)} MAI</b>
          </div>
          <div>
            <span>Withdrawal Fee</span>
            <b>{fmtSmart(feeFixed, 0)} MAI</b>
          </div>
          <div>
            <span>{t('lockedBalance')}</span>
            <b>{fmtSmart(user.lockedBalance, 4)} MAI</b>
          </div>
          <div>
            <span>You Receive</span>
            <b className="withdrawReceiveValue">{fmtSmart(receiveAmount, 4)} MAI</b>
          </div>
        </div>

        {activeWithdrawal && (
          <div className="withdrawActiveNotice">
            <b>Withdrawal in progress</b>
            <span>
              {fmtSmart(activeWithdrawal.amount, 4)} MAI · {String(activeWithdrawal.status).replace(/_/g, ' ')}
            </span>
          </div>
        )}

        <label>
          {t('amount')}
          <div className="amount">
            <input
              type="number"
              min={minimum}
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder={`Min ${minimum}`}
              disabled={!!activeWithdrawal}
            />
            <button
              type="button"
              disabled={!!activeWithdrawal}
              onClick={() => {
                playClick();
                setAmount(String(available));
              }}
            >
              {t('max')}
            </button>
          </div>
        </label>

        <div className="withdrawFeePreview">
          <div><span>Requested</span><b>{fmtSmart(numericAmount, 4)} MAI</b></div>
          <div><span>Network withdrawal fee</span><b>- {fmtSmart(calculatedFee, 4)} MAI</b></div>
          <div className="net"><span>Wallet receives</span><b>{fmtSmart(receiveAmount, 4)} MAI</b></div>
        </div>

        <div className="walletDest">
          <span>{t('destination')}</span>
          <b>{short(user.walletAddress, t('notConnected'))}</b>
        </div>

        <button
          className="goldBtn full holdBtn"
          disabled={
            busy ||
            challengeBusy ||
            !!activeWithdrawal ||
            !user.walletAddress ||
            numericAmount < minimum ||
            numericAmount > available ||
            receiveAmount <= 0
          }
          onClick={requestChallenge}
        >
          {challengeBusy ? 'Preparing Security Check…' : 'SECURE WITHDRAWAL'}
        </button>

        <p className="withdrawSecurityHint">
          🔒 Every withdrawal is verified server-side before MAI is locked for payout.
        </p>
      </section>

      <h3 className="withdrawHistoryTitle">{t('withdrawalHistory')}</h3>

      <div className="stack">
        {history.length ? history.map(item => (
          <div className="history glass" key={item.id}>
            <div>
              <b>{fmtSmart(item.amount, 4)} MAI</b>
              <span>{new Date(item.created_at).toLocaleString()}</span>
              <small>{short(item.wallet_address)}</small>
              {Number(item.fee || 0) > 0 && (
                <small>Fee {fmtSmart(item.fee, 4)} · Receive {fmtSmart(item.receive_amount, 4)} MAI</small>
              )}
            </div>
            <em className={`st ${item.status}`}>
              {String(item.status).replace(/_/g, ' ')}
            </em>
          </div>
        )) : (
          <div className="empty glass">{t('noWithdrawals')}</div>
        )}
      </div>

      {challenge && (
        <div className="withdrawVerifyOverlay" role="dialog" aria-modal="true">
          <div className="withdrawVerifyModal glass">
            <div className="withdrawVerifyShield">🛡</div>
            <span className="withdrawVerifyEyebrow">SECURE VERIFICATION</span>
            <h3>Confirm Withdrawal</h3>
            <p>
              Enter the security code below. The code is single-use and expires automatically.
            </p>

            <div className="withdrawVerifySummary">
              <div><span>Withdraw</span><b>{fmtSmart(challenge.amount, 4)} MAI</b></div>
              <div><span>Fee</span><b>{fmtSmart(challenge.fee, 4)} MAI</b></div>
              <div><span>You receive</span><b>{fmtSmart(challenge.receiveAmount, 4)} MAI</b></div>
            </div>

            <div className="withdrawCaptchaFrame">
              <img src={challenge.image} alt="Withdrawal security code" />
              <button
                type="button"
                disabled={challengeBusy || busy}
                onClick={requestChallenge}
                aria-label="Refresh security code"
              >
                ↻
              </button>
            </div>

            <div className="withdrawVerifyMeta">
              <span>Expires in <b>{challengeSeconds}s</b></span>
              <span>Max attempts: {challenge.maxAttempts || 5}</span>
            </div>

            <input
              className="withdrawCodeInput"
              value={challengeCode}
              onChange={event => setChallengeCode(
                event.target.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 6)
              )}
              onKeyDown={event => {
                if (event.key === 'Enter') submitVerifiedWithdrawal();
              }}
              placeholder="ENTER CODE"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck="false"
              maxLength={6}
              autoFocus
            />

            <div className="withdrawVerifyActions">
              <button type="button" className="withdrawCancelBtn" onClick={closeChallenge} disabled={busy}>
                Cancel
              </button>
              <button
                type="button"
                className="goldBtn"
                onClick={submitVerifiedWithdrawal}
                disabled={busy || challengeSeconds <= 0 || challengeCode.length !== 6}
              >
                {busy ? 'VERIFYING…' : 'VERIFY & WITHDRAW'}
              </button>
            </div>

            <small className="withdrawVerifyFootnote">
              MAI will only be locked after the server validates this code and rechecks your withdrawal.
            </small>
          </div>
        </div>
      )}
    </PageShell>
  );
}



/* =========================================================
   GIVEAWAY PAGE
   ========================================================= */

function GiveawayPage({ back, toast, playClick }) {
  const [items, setItems] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [giveawayAnswers, setGiveawayAnswers] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/giveaways');
      const nextItems = Array.isArray(data.items) ? data.items : [];
      setItems(nextItems);
      const featuredId = data.featured?.id;
      setFeatured(
        nextItems.find(item => String(item.id) === String(featuredId)) ||
        data.featured ||
        nextItems[0] ||
        null
      );
    } catch (error) {
      toast(error.message);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const join = async giveaway => {
    if (!giveaway || busy) return;
    setBusy(String(giveaway.id));
    playClick();
    try {
      const data = await api(`/api/giveaways/${giveaway.id}/join`, {
        method: 'POST',
        body: {
          answerIndex: giveawayAnswers[String(giveaway.id)]?.answerIndex,
          customAnswer: giveawayAnswers[String(giveaway.id)]?.customAnswer
        }
      });
      if (data.joined) toast(data.message || (data.newEntry === false ? 'Entry already recorded.' : 'Giveaway entry confirmed.'));
      await load();
    } catch (error) {
      toast(error.message);
    } finally {
      setBusy('');
    }
  };

  const renderCard = giveaway => {
    const config = giveaway.config || {};
    return (
      <article className={`giveawayCampaignCard ${giveaway.featured ? 'featured' : ''}`} key={giveaway.id}>
        {giveaway.image_url && (
          <img className="giveawayCampaignImage" src={giveaway.image_url} alt="" />
        )}
        <div className="giveawayCampaignBody">
          <div className="giveawayCampaignTop">
            <span>{giveaway.featured ? 'FEATURED GIVEAWAY' : 'ACTIVE GIVEAWAY'}</span>
            <em>{String(giveaway.giveaway_type || 'giveaway').replaceAll('_', ' ')}</em>
          </div>
          <h2>{giveaway.title}</h2>
          {giveaway.description && <p>{giveaway.description}</p>}
          <div className="giveawayCampaignStats">
            <div><span>Prize Pool</span><b>{Number(config.prizePool || config.prizePerWinner || 0).toLocaleString()} MAI</b></div>
            <div><span>Winners</span><b>{Number(config.winnerCount || 1).toLocaleString()}</b></div>
            <div><span>Start Date</span><b>{giveaway.starts_at ? new Date(giveaway.starts_at).toLocaleDateString() : 'Now'}</b></div>
            <div><span>End Date</span><b>{giveaway.ends_at ? new Date(giveaway.ends_at).toLocaleDateString() : 'Open'}</b></div>
          </div>
          <div className="giveawayRequirements">
            <strong>How to Join</strong>
            {giveaway.giveaway_type === 'task' && <span>✓ Complete all required MAI tasks: {(config.taskKeys || []).join(', ') || 'campaign tasks'}</span>}
            {giveaway.giveaway_type === 'referral' && <span>✓ Invite at least {Number(config.successfulInvites || 1)} successful friend(s)</span>}
            {giveaway.giveaway_type === 'holding' && <span>✓ Hold at least {Number(config.minimumMai || 0).toLocaleString()} MAI</span>}
            {giveaway.giveaway_type === 'lucky_draw' && <span>✓ Tap Join Giveaway to receive your verified entry</span>}
            {giveaway.giveaway_type === 'leaderboard' && <span>✓ Rank in the Top {Number(config.leaderboardTop || 100)} by {config.leaderboardMetric === 'referrals' ? 'successful referrals' : config.leaderboardMetric === 'tasks' ? 'completed tasks' : 'in-game MAI balance'}</span>}
            {giveaway.giveaway_type === 'social' && <span>✓ Complete all required verified Social Tasks: {(config.socialTaskIds || []).join(', ') || 'configured tasks'}</span>}
            {giveaway.giveaway_type === 'quiz' && <><span>✓ Answer the quiz correctly</span><div className="giveawayQuiz"><b>{config.quizQuestion || 'Quiz'}</b>{(config.quizOptions || []).map((option,index)=><label key={index}><input type="radio" name={`quiz-${giveaway.id}`} checked={Number(giveawayAnswers[String(giveaway.id)]?.answerIndex)===index} onChange={()=>setGiveawayAnswers(old=>({...old,[String(giveaway.id)]:{...(old[String(giveaway.id)]||{}),answerIndex:index}}))} /> <span>{option}</span></label>)}</div></>}
            {giveaway.giveaway_type === 'purchase' && <span>✓ Have at least {Number(config.minimumPurchase || 0).toLocaleString()} {config.purchaseCurrency || 'MAI'} in verified MAI Network Promote payments</span>}
            {giveaway.giveaway_type === 'custom' && <><span>✓ Complete the custom verification</span><label className="giveawayCustomVerify"><b>{config.customPrompt || 'Verification answer / code'}</b><input value={giveawayAnswers[String(giveaway.id)]?.customAnswer || ''} onChange={e=>setGiveawayAnswers(old=>({...old,[String(giveaway.id)]:{...(old[String(giveaway.id)]||{}),customAnswer:e.target.value}}))} placeholder="Enter answer / code" /></label></>}
            {giveaway.allow_multiple_entries && ['referral','purchase'].includes(giveaway.giveaway_type) && <span>✓ Additional entries require new qualifying evidence; repeated taps do not create duplicate entries</span>}
          </div>
          <button
            type="button"
            className="goldBtn full"
            disabled={busy === String(giveaway.id) || (giveaway.joined && !giveaway.allow_multiple_entries)}
            onClick={() => join(giveaway)}
          >
            {busy === String(giveaway.id) ? 'VERIFYING…' : giveaway.joined ? (giveaway.allow_multiple_entries ? 'ADD ANOTHER ENTRY' : 'JOINED ✓') : 'JOIN GIVEAWAY'}
          </button>
        </div>
      </article>
    );
  };

  return (
    <PageShell title="Giveaway" back={back} playClick={playClick}>
      <section className="giveawayHub">
        <div className="giveawayHubHead">
          <span>MAI REWARDS</span>
          <h1>Giveaway</h1>
          <p>Eligibility and entries are verified by the MAI backend.</p>
        </div>
        {loading ? (
          <div className="empty glass">Loading giveaways...</div>
        ) : (
          <>
            {featured && renderCard(featured)}
            {items.filter(item => !featured || String(item.id) !== String(featured.id)).length > 0 && (
              <div className="giveawayActiveTitle">Active Giveaways</div>
            )}
            {items
              .filter(item => !featured || String(item.id) !== String(featured.id))
              .map(renderCard)}
            {!items.length && <div className="empty glass">No live giveaway right now.</div>}
          </>
        )}
      </section>
    </PageShell>
  );
}


/* =========================================================
   MINI APP ANNOUNCEMENTS
   ========================================================= */

function AnnouncementLayer({ onNavigate }) {
  const [item, setItem] = useState(null);

  useEffect(() => {
    let cancelled = false;

    api('/api/announcements')
      .then(data => {
        if (cancelled) return;
        const unread = (data.items || []).find(row =>
          !row.viewed_at &&
          ['important', 'critical'].includes(
            String(row.priority || '').toLowerCase()
          )
        );
        if (unread) setItem(unread);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  if (!item) return null;

  const close = async () => {
    const current = item;
    setItem(null);
    try {
      await api(`/api/announcements/${current.id}/view`, {
        method: 'POST',
        body: {}
      });
    } catch {}
  };

  const cta = item.cta || {};

  return (
    <div className="announcementOverlay" role="dialog" aria-modal="true">
      <div className="announcementModal glass">
        {item.image_url && <img src={item.image_url} alt="" />}
        <span>{String(item.priority || 'important').toUpperCase()}</span>
        <h3>{item.title}</h3>
        <p>{item.message}</p>
        <div className="announcementActions">
          <button type="button" onClick={close}>Close</button>
          {cta.action && (
            <button
              type="button"
              className="goldBtn"
              onClick={async () => {
                await close();
                onNavigate?.(cta);
              }}
            >
              {cta.label || 'OPEN'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


/* =========================================================
   BOTTOM NAVIGATION
   ========================================================= */

function BottomNav({
  tab,
  go,
  t
}) {

  const items = [

    {
      id:
        'home',

      label:
        t(
          'home'
        )
    },

    {
      id:
        'task',

      label:
        t(
          'tasks'
        )
    },

    {
      id:
        'friends',

      label:
        t(
          'friends'
        )
    },

    {
      id:
        'profile',

      label:
        t(
          'profile'
        )
    }

  ];


  return (

    <nav className="bottomNav">

      {
        items.map(
          item => (

            <button
              key={
                item.id
              }

              className={
                tab ===
                item.id
                  ? 'active'
                  : ''
              }

              onClick={() =>
                go(
                  item.id
                )
              }
            >

              <Icon
                name={
                  item.id
                }
              />


              <span>

                {
                  item.label
                }

              </span>

            </button>

          )
        )
      }

    </nav>

  );

}


/* =========================================================
   EXPORT
   ========================================================= */

export default App;


/* =========================================================
   END OF APP.JS
   ========================================================= */