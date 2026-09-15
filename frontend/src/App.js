import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  TonConnectButton,
  useTonAddress
} from '@tonconnect/ui-react';

import './App.css';


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
      'Connected wallets remain under the user’s control. Blockchain transactions can be irreversible and network fees may apply.',

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
      '24h farming started',

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
      'بدأ التعدين لمدة 24 ساعة',

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
      'Майнинг на 24 часа запущен',

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

function Icon({
  name
}) {

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
      '🎁',

    rocket:
      '🚀',

    wallet:
      '◈',

    bolt:
      'ϟ',

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


        return data;

      },
      []
    );


  useEffect(
    () => {

      refresh()
        .catch(
          error => {

            setToast(
              error.message
            );

          }
        );

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

              <TasksPage

                tasks={
                  tasks
                }

                setTasks={
                  setTasks
                }

                user={
                  user
                }

                setBoot={
                  setBoot
                }

                openPromote={() =>
                  openView(
                    'promote'
                  )
                }

                toast={
                  setToast
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
            'friends'
            ? (

              <FriendsPage

                data={
                  referrals
                }

                setData={
                  setReferrals
                }

                toast={
                  setToast
                }

                setBoot={
                  setBoot
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

  const [
    remain,
    setRemain
  ] =
    useState(
      user?.farm?.remaining ||
      0
    );


  const [
    sparks,
    setSparks
  ] =
    useState(
      []
    );


  const [
    coinPressed,
    setCoinPressed
  ] =
    useState(
      false
    );


  const [
    holdingLoading,
    setHoldingLoading
  ] =
    useState(
      false
    );


  const [
    walletHolding,
    setWalletHolding
  ] =
    useState(
      Number(
        user?.walletHolding ||
        0
      )
    );


  const [
    inGameBalance,
    setInGameBalance
  ] =
    useState(
      Number(
        user?.inGameBalance ??
        user?.balance ??
        0
      )
    );


  const [
    totalHolding,
    setTotalHolding
  ] =
    useState(
      Number(
        user?.totalHolding ||
        0
      )
    );


  const [
    displayLevel,
    setDisplayLevel
  ] =
    useState(
      Number(
        user?.level ||
        0
      )
    );


  /* =======================================================
     SYNC SERVER USER DATA
     ======================================================= */

  useEffect(
    () => {

      setRemain(
        Number(
          user?.farm?.remaining ||
          0
        )
      );


      setWalletHolding(
        Number(
          user?.walletHolding ||
          0
        )
      );


      setInGameBalance(
        Number(
          user?.inGameBalance ??
          user?.balance ??
          0
        )
      );


      setTotalHolding(
        Number(
          user?.totalHolding ||
          0
        )
      );


      setDisplayLevel(
        Number(
          user?.level ||
          0
        )
      );

    },
    [
      user?.farm?.remaining,
      user?.walletHolding,
      user?.inGameBalance,
      user?.balance,
      user?.totalHolding,
      user?.level
    ]
  );


  /* =======================================================
     FARM TIMER
     ======================================================= */

  useEffect(
    () => {

      const timer =
        setInterval(
          () => {

            setRemain(
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
    []
  );


  /* =======================================================
     WALLET HOLDING REFRESH
     ======================================================= */

  const refreshHolding =
    useCallback(
      async (
        force = false
      ) => {

        if (
          !walletAddress
        ) {

          setWalletHolding(
            0
          );

          return;

        }


        setHoldingLoading(
          true
        );


        try {

          const data =
            await api(
              force
                ? '/api/wallet/mai-balance/refresh'
                : '/api/wallet/mai-balance',
              force
                ? {
                    method:
                      'POST'
                  }
                : undefined
            );


          const wallet =
            Number(
              data.walletBalance ??
              data.balance ??
              0
            );


          const inGame =
            Number(
              data.inGameBalance ??
              user?.balance ??
              0
            );


          const total =
            Number(
              data.totalHolding ??
              (
                wallet +
                inGame
              )
            );


          setWalletHolding(
            wallet
          );


          setInGameBalance(
            inGame
          );


          setTotalHolding(
            total
          );


          setDisplayLevel(
            Number(
              data.level ??
              user?.level ??
              0
            )
          );


          if (
            force
          ) {

            toast(
              t(
                'walletUpdated'
              )
            );

          }


        } catch (
          error
        ) {

          console.warn(
            'Wallet holding refresh failed:',
            error
          );


          if (
            force
          ) {

            toast(
              error.message
            );

          }


        } finally {

          setHoldingLoading(
            false
          );

        }

      },
      [
        walletAddress,
        user?.balance,
        user?.level,
        toast,
        t
      ]
    );


  useEffect(
    () => {

      if (
        !walletAddress
      ) {

        return;

      }


      const timer =
        setInterval(
          () => {

            refreshHolding(
              false
            );

          },
          30000
        );


      return () =>
        clearInterval(
          timer
        );

    },
    [
      walletAddress,
      refreshHolding
    ]
  );


  /* =======================================================
     COIN TAP
     ======================================================= */

  const tapCoin =
    event => {

      if (
        coinPressed
      ) {

        return;

      }


      playClick();


      setCoinPressed(
        true
      );


      try {

        tg()
          ?.HapticFeedback
          ?.impactOccurred(
            'light'
          );

      } catch {}


      const rect =
        event.currentTarget
          .getBoundingClientRect();


      const centerX =
        rect.width /
        2;


      const centerY =
        rect.height /
        2;


      const newSparks =
        Array.from(
          {
            length:
              16
          },
          (
            _,
            index
          ) => {

            const angle =
              (
                Math.PI *
                2 *
                index
              ) /
              16;


            const distance =
              62 +
              Math.random() *
              58;


            return {

              id:
                `${Date.now()}_${index}`,

              x:
                centerX,

              y:
                centerY,

              dx:
                Math.cos(
                  angle
                ) *
                distance,

              dy:
                Math.sin(
                  angle
                ) *
                distance,

              size:
                4 +
                Math.random() *
                5,

              delay:
                Math.random() *
                50

            };

          }
        );


      setSparks(
        newSparks
      );


      setTimeout(
        () => {

          setCoinPressed(
            false
          );

        },
        430
      );


      setTimeout(
        () => {

          setSparks(
            []
          );

        },
        850
      );

  };


  /* =======================================================
     FARM ACTION
     ======================================================= */

  const handleFarm =
    () => {

      action(
        async () => {

          playClick();


          if (
            !user?.farm?.active
          ) {

            await api(
              '/api/farm/start',
              {
                method:
                  'POST'
              }
            );


            toast(
              t(
                'farmStarted'
              )
            );


            await refresh();


            return;

          }


          if (
            user?.farm?.ready ||
            remain <= 0
          ) {

            const data =
              await api(
                '/api/farm/claim',
                {
                  method:
                    'POST'
                }
              );


            playReward();


            toast(
              `+${fmtSmart(
                data.reward,
                4
              )} MAI — ${t(
                'rewardClaimed'
              )}`
            );


            await refresh();


            return;

          }


          toast(
            `${t(
              'availableIn'
            )} ${hms(
              remain
            )}`
          );

        }
      );

  };


  const farmPending =
    Number(
      user?.farm?.pending ||
      0
    );


  const farmRate =
    Number(
      user?.farm?.rateDaily ||
      user?.miningSpeed ||
      0
    );


  const farmRateSecond =
    Number(
      user?.farm?.rateSecond ||
      (
        farmRate /
        86400
      )
    );


  const walletText =
    !walletAddress
      ? t(
          'connectWallet'
        )

      : holdingLoading
      ? '...'

      : `${fmtSmart(
          walletHolding,
          4
        )} MAI`;


  /* =======================================================
     HOME UI
     ======================================================= */

  return (

    <div className="homePage">

      {/* ===================================================
          TOP GRID
          =================================================== */}

      <section className="topGrid">

        <div className="brand glass">

          <MaiLogo />


          <div>

            <strong>
              {t('appName')}
            </strong>


            <span>

              <i className="online" />

              {' '}

              {t('online')}

            </span>


            <small>
              {t('slogan')}
            </small>

          </div>

        </div>


        <button
          className="balance glass"

          onClick={() =>
            setTab(
              'profile'
            )
          }
        >

          <Icon name="wallet" />


          <div>

            <span className="balanceLabel">
              {t('totalBalance')}
            </span>


            <b className="balanceValue">

              {
                fmtSmart(
                  totalHolding,
                  4
                )
              }

            </b>


            <small>
              MAI
            </small>

          </div>


          <em>
            ›
          </em>

        </button>


        {/* =================================================
            USER MINI CARD
            ================================================= */}

        <div className="profileMini glass">

          <div className="avatar">

            {
              user?.photoUrl
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
                        ?.firstName
                        ?.[0] ||
                      'M'
                    }

                  </span>

                )
            }

          </div>


          <div className="profileMiniText">

            <span>
              {t('profile')}
            </span>


            <b>

              {
                user?.firstName ||
                'MAI User'
              }

            </b>


            <small>

              LVL {
                displayLevel
              }

            </small>

          </div>

        </div>


        {/* =================================================
            TASK MINI CARD
            ================================================= */}

        <button
          className="taskTopCard glass"

          onClick={() =>
            setTab(
              'task'
            )
          }
        >

          <span className="taskTopIcon">

            <Icon name="task" />

          </span>


          <div>

            <span>
              {t('tasks')}
            </span>


            <b>
              {t('dailyTasks')}
            </b>


            <small>

              {
                tasks
                  ?.hasIncomplete
                  ? t(
                      'claimReward'
                    )
                  : t(
                      'completedToday'
                    )
              }

            </small>

          </div>


          {
            tasks
              ?.hasIncomplete && (

              <i className="topNoticeDot" />

            )
          }


          <em>
            ›
          </em>

        </button>


        {/* =================================================
            WALLET HOLDING CARD
            ================================================= */}

       

      </section>


      {/* ===================================================
          TOTAL BALANCE COMMAND CARD
          =================================================== */}

      <section className="miningSummary glass">

        <div className="summaryMain">

          <span>
            {t('totalBalance')}
          </span>


          <strong>

            {
              fmtSmart(
                totalHolding,
                4
              )
            }

          </strong>


          <small>
            MAI
          </small>

        </div>


        <div className="summaryDivider" />


        <div className="summaryStats">

          <div>

            <span>
              {t('inGame')}
            </span>


            <b>

              {
                fmtSmart(
                  inGameBalance,
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
              {t('level')}
            </span>


            <b>

              LVL {
                displayLevel
              }

            </b>

          </div>

        </div>

      </section>


      {/* ===================================================
          MAI COIN HERO
          =================================================== */}

      <section className="coinArea">

        <span className="coinAura coinAuraOne" />

        <span className="coinAura coinAuraTwo" />

        <span className="coinAura coinAuraThree" />


        <button
          className={
            coinPressed
              ? 'mainCoin coinPressed'
              : 'mainCoin'
          }

          onClick={
            tapCoin
          }

          aria-label="MAI"
        >

          <span className="coinOuterRing">

            <span className="coinMiddleRing">

              <span className="coinInner">

                <MaiLogo
                  className="mainCoinLogo"
                />

              </span>

            </span>

          </span>


          <span className="coinShine" />

          <span className="coinShineSecond" />


          {
            sparks.map(
              spark => (

                <span
                  key={
                    spark.id
                  }

                  className="goldSpark"

                  style={{

                    left:
                      `${spark.x}px`,

                    top:
                      `${spark.y}px`,

                    width:
                      `${spark.size}px`,

                    height:
                      `${spark.size}px`,

                    animationDelay:
                      `${spark.delay}ms`,

                    '--spark-x':
                      `${spark.dx}px`,

                    '--spark-y':
                      `${spark.dy}px`,

                    '--spark-rotate':
                      `${Math.random() * 360}deg`

                  }}
                />

              )
            )
          }

        </button>


        <div className="coinTapHint">

          <span>
            {t('tapCoin')}
          </span>


          <small>
            {t('tapHint')}
          </small>

        </div>

      </section>


      {/* ===================================================
          MINING INFORMATION
          =================================================== */}

      <section className="homeCards">

        <div className="infoCard glass">

          <Icon name="bolt" />


          <div>

            <span>
              {t('autoMining')}
            </span>


            <b>

              +{
                fmt(
                  farmRateSecond,
                  8
                )
              }

              {' '}

              {t('perSecond')}

            </b>


            <small>

              {
                fmtSmart(
                  farmRate,
                  4
                )
              }

              {' '}

              {t('perDay')}

            </small>

          </div>

        </div>


        <div className="infoCard glass">

          <Icon name="clock" />


          <div>

            <span>
              {t('farmingTime')}
            </span>


            <b>

              {
                user
                  ?.farm
                  ?.ready ||
                remain <= 0

                  ? t('ready')

                  : hms(
                      remain
                    )
              }

            </b>


            <small>

              {
                user
                  ?.farm
                  ?.ready ||
                remain <= 0

                  ? t(
                      'claimReward'
                    )

                  : t(
                      'serverMining'
                    )
              }

            </small>

          </div>

        </div>


        <button
          className="infoCard glass clickable"

          onClick={() =>
            setView(
              'boost'
            )
          }
        >

          <Icon name="rocket" />


          <div>

            <span>
              {t('boost')}
            </span>


            <b>

              LVL {
                displayLevel
              }

            </b>


            <small>

              {
                fmtSmart(
                  user?.miningSpeed,
                  4
                )
              }

              {' '}

              {t('perDay')}

            </small>

          </div>


          <em>
            ›
          </em>

        </button>


        <button
          className="infoCard glass clickable farmCard"

          disabled={
            busy
          }

          onClick={
            handleFarm
          }
        >

          <Icon name="gift" />


          <div>

            <span>

              {
                !user
                  ?.farm
                  ?.active

                  ? t(
                      'startFarming'
                    )

                  : user
                      ?.farm
                      ?.ready ||
                    remain <= 0

                  ? t(
                      'claim'
                    )

                  : t(
                      'farmReward'
                    )
              }

            </span>


            <b>

              {
                user
                  ?.farm
                  ?.ready ||
                remain <= 0

                  ? `${fmtSmart(
                      farmRate,
                      4
                    )} MAI`

                  : `${fmtSmart(
                      farmPending,
                      4
                    )} MAI`
              }

            </b>


            <small>

              {
                user
                  ?.farm
                  ?.ready ||
                remain <= 0

                  ? t(
                      'nextCycle'
                    )

                  : hms(
                      remain
                    )
              }

            </small>

          </div>


          <em>
            ›
          </em>

        </button>

      </section>


      <div className="tagline">

        ✦ MAI NETWORK ✦


        <small>
          {t('together')}
        </small>

      </div>

    </div>

  );

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


  const holdingStep =
    Math.max(
      1,
      Number(
        user?.holdingStep ||
        1000
      )
    );


  const maxLevel =
    Number(
      user?.maxLevel ||
      1000
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

          1 LVL = {
            fmtSmart(
              holdingStep,
              0
            )
          } MAI

        </small>

      </section>


      {/* ===================================================
          LEVEL LIST
          =================================================== */}

      <section className="levels">

        {
          levels.map(
            level => {

              const required =
                level *
                holdingStep;


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

  const holdingStep =
    Math.max(
      1,
      Number(
        user?.holdingStep ||
        1000
      )
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
    level *
    holdingStep;


  const unlocked =
    totalHolding >=
    required;


  const baseMining =
    Number(
      user?.freeMiningSpeed ||
      0
    );


  const levelBonus =
    level > 0
      ? Number(
          user?.levelMiningSpeed ||
          0
        ) -
        (
          currentLevel > 0
            ? (
                currentLevel -
                level
              ) *
              2
            : 0
        )
      : 0;


  const computedLevelBonus =
    level <= 0
      ? 0
      : 10 +
        (
          level -
          1
        ) *
        2;


  const totalMining =
    baseMining +
    computedLevelBonus;


  const nextLevel =
    Math.min(
      Number(
        user?.maxLevel ||
        1000
      ),
      level + 1
    );


  const nextRequired =
    nextLevel *
    holdingStep;


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
                    4
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
            {t('baseMining')}
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
            {t('perDay')}
          </small>

        </div>


        <div className="levelMetric glass">

          <span>
            {t('levelBonus')}
          </span>


          <b>

            +{
              fmtSmart(
                computedLevelBonus,
                4
              )
            }

          </b>


          <small>
            {t('perDay')}
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
                4
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
        Number(
          user?.maxLevel ||
          1000
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
                  Math.max(
                    0,
                    nextRequired -
                    totalHolding
                  )
                }

                {' '}

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

          try {
            window.Telegram?.WebApp?.openLink?.(buyUrl);
          } catch (_) {}

          window.location.href = buyUrl;

        }}
      >

        {
          unlocked
            ? `✓ ${t(
                'unlocked'
              )}`

            : '🪙 BUY MAI'
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
     WATCH AD
     ======================================================= */

  const watchAd =
    () => {

      action(
        async () => {

          if (
            adsBusy ||
            cooldown > 0
          ) {

            return;

          }


          playClick();


          setAdsBusy(
            true
          );


          try {

            const started =
              await api(
                '/api/ads/start',
                {
                  method:
                    'POST'
                }
              );


            if (
              !started.url
            ) {

              throw new Error(
                'Ad provider did not return a URL'
              );

            }


            openLink(
              started.url
            );


            toast(
              'Finish the ad, then return to MAI.'
            );


            let attempts =
              0;


            const poll =
              setInterval(
                async () => {

                  attempts +=
                    1;


                  try {

                    const status =
                      await api(

                        `/api/ads/status/${started.sessionId}`

                      );


                    if (
                      status.status ===
                        'completed' &&
                      !status.claimed_at
                    ) {

                      clearInterval(
                        poll
                      );


                      const claim =
                        await api(

                          `/api/ads/claim/${started.sessionId}`,

                          {
                            method:
                              'POST'
                          }

                        );


                      setBoot(
                        old => ({

                          ...old,

                          user:
                            claim.user

                        })
                      );


                      setTasks(
                        claim.tasks
                      );


                      setCooldown(
                        Number(
                          claim
                            ?.tasks
                            ?.ads
                            ?.cooldown ||
                          0
                        )
                      );


                      playReward();


                      toast(

                        `+${fmtSmart(
                          claim.reward,
                          4
                        )} MAI`

                      );


                    } else if (
                      attempts >
                      90
                    ) {

                      clearInterval(
                        poll
                      );


                      toast(
                        'Ad was not completed.'
                      );

                    }


                  } catch {

                    /*
                      Poll errors are ignored
                      temporarily.
                    */

                  }

                },
                2000
              );


          } finally {

            setAdsBusy(
              false
            );

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

  const completeCampaign =
    campaign => {

      action(
        async () => {

          playClick();


          openLink(
            campaign.target_url
          );


          /*
            A short delay gives the user
            time to see Telegram/browser.
          */

          await new Promise(
            resolve =>
              setTimeout(
                resolve,
                900
              )
          );


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


          if (
            Number(
              data.reward ||
              0
            ) >
            0
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

                <Icon name="ad" />

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
                            task.category ===
                            'group'
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


                        <button
                          className="taskActionBtn"

                          onClick={() =>
                            completeCampaign(
                              campaign
                            )
                          }
                        >

                          {t('open')}

                        </button>

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


      playClick();


      setSubmitting(
        true
      );


      try {

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
                  (
                    type ===
                      'Channel' ||
                    type ===
                      'Group'
                  )
                    ? 'manual'
                    : 'manual'
              }
            }
          );


        toast(

          `${t(
            'campaignPending'
          )} #${data.campaign.id}`

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
                  fmtSmart(
                    user
                      ?.inGameBalance ??
                    user
                      ?.balance,
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

                : `${fmtSmart(
                    remaining,
                    0
                  )} MAI`
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

  const [
    amount,
    setAmount
  ] =
    useState(
      ''
    );


  const [
    history,
    setHistory
  ] =
    useState(
      []
    );


  const [
    minimum,
    setMinimum
  ] =
    useState(
      500
    );


  const [
    busy,
    setBusy
  ] =
    useState(
      false
    );


  /* =======================================================
     LOAD HISTORY
     ======================================================= */

  const load =
    useCallback(
      async () => {

        try {

          const data =
            await api(
              '/api/withdrawals'
            );


          setHistory(
            data.items ||
            []
          );


          setMinimum(
            Number(
              data.minWithdrawal ||
              500
            )
          );


        } catch (
          error
        ) {

          toast(
            error.message
          );

        }

      },
      [
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


  const available =
    Number(
      user?.inGameBalance ??
      user?.balance ??
      0
    );


  /* =======================================================
     SUBMIT WITHDRAWAL
     ======================================================= */

  const submit =
    async () => {

      const value =
        Number(
          amount
        );


      if (
        !Number.isFinite(
          value
        ) ||
        value <
          minimum
      ) {

        toast(
          `Minimum ${minimum} MAI`
        );


        return;

      }


      if (
        value >
        available
      ) {

        toast(
          'Insufficient in-game balance'
        );


        return;

      }


      if (
        !user.walletAddress
      ) {

        toast(
          t(
            'connectWallet'
          )
        );


        return;

      }


      playClick();


      const confirmed =
        window.confirm(

          `${t(
            'withdraw'
          )} ${fmtSmart(
            value,
            4
          )} MAI → ${short(
            user.walletAddress
          )}?`

        );


      if (
        !confirmed
      ) {

        return;

      }


      setBusy(
        true
      );


      try {

        const randomKey =

          window.crypto
            ?.randomUUID
            ? window.crypto
                .randomUUID()
            : `${Date.now()}_${Math.random()}`;


        const data =
          await api(
            '/api/withdrawals',
            {
              method:
                'POST',

              body: {
                amount:
                  value
              },

              idempotency:
                randomKey
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


        playReward();


        toast(

          `Withdrawal: ${data
            .withdrawal
            .status}`

        );


        setAmount(
          ''
        );


        await load();


      } catch (
        error
      ) {

        toast(
          error.message
        );


      } finally {

        setBusy(
          false
        );

      }

  };


  return (

    <PageShell

      title={
        t(
          'withdrawTitle'
        )
      }

      back={
        back
      }

      playClick={
        playClick
      }
    >

      <section className="withdrawBox glass">

        <div className="balanceBig">

          <span>
            {t('availableBalance')}
          </span>


          <b>

            {
              fmtSmart(
                available,
                4
              )
            }

            {' '}

            MAI

          </b>

        </div>


        <div className="miniGrid">

          <div>

            <span>
              {t('minimum')}
            </span>


            <b>

              {
                fmtSmart(
                  minimum,
                  0
                )
              }

              {' '}

              MAI

            </b>

          </div>


          <div>

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

        </div>


        <label>

          {t('amount')}


          <div className="amount">

            <input
              type="number"

              min={
                minimum
              }

              value={
                amount
              }

              onChange={
                event =>
                  setAmount(
                    event
                      .target
                      .value
                  )
              }

              placeholder={
                `Min ${minimum}`
              }
            />


            <button
              type="button"

              onClick={() => {

                playClick();

                setAmount(
                  String(
                    available
                  )
                );

              }}
            >

              {t('max')}

            </button>

          </div>

        </label>


        <div className="walletDest">

          <span>
            {t('destination')}
          </span>


          <b>

            {
              short(
                user.walletAddress,
                t(
                  'notConnected'
                )
              )
            }

          </b>

        </div>


        <button
          className="goldBtn full holdBtn"

          disabled={
            busy ||
            !user.walletAddress ||
            Number(
              amount
            ) <
              minimum ||
            Number(
              amount
            ) >
              available
          }

          onClick={
            submit
          }
        >

          {
            busy
              ? t(
                  'checking'
                )

              : t(
                  'holdWithdraw'
                )
          }

        </button>

      </section>


      <h3 className="withdrawHistoryTitle">

        {
          t(
            'withdrawalHistory'
          )
        }

      </h3>


      <div className="stack">

        {
          history.length
            ? history.map(
                item => (

                  <div
                    className="history glass"

                    key={
                      item.id
                    }
                  >

                    <div>

                      <b>

                        {
                          fmtSmart(
                            item.amount,
                            4
                          )
                        }

                        {' '}

                        MAI

                      </b>


                      <span>

                        {
                          new Date(
                            item.created_at
                          )
                            .toLocaleString()
                        }

                      </span>


                      <small>

                        {
                          short(
                            item.wallet_address
                          )
                        }

                      </small>

                    </div>


                    <em
                      className={
                        `st ${item.status}`
                      }
                    >

                      {
                        String(
                          item.status
                        )
                          .replace(
                            /_/g,
                            ' '
                          )
                      }

                    </em>

                  </div>

                )
              )

            : (

              <div className="empty glass">

                {
                  t(
                    'noWithdrawals'
                  )
                }

              </div>

            )
        }

      </div>

    </PageShell>

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