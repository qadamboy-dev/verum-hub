/**
 * site.js — every string of verum.cam outside the legal documents, in EN,
 * RU and UZ, plus the ecosystem's URLs.
 *
 * Kept as data, like e2ee-chat-frontend's pages/welcomeContent.js (whose
 * hero badge, specs and tone this reuses), so the pages stay layout only and
 * the three languages always have the same shape (site.test.js checks it).
 * The build renders all three into the HTML and CSS shows the chosen one
 * (src/render/html.js `t()`), so nothing here runs in the browser.
 *
 * Every claim must hold for the shipped products. The traps, shared with the
 * messenger's Welcome page and Privacy Policy:
 *  - the Verum Audio bot reads what is sent to it (the one E2EE exception);
 *  - the server holds metadata (email, who talks to whom and when, file
 *    sizes, IP addresses): never "the server knows nothing";
 *  - sign-in is split-key since 2026-11-22: an account on v2 sends a key
 *    derived from the password, but accounts still on v1 and Android before
 *    1.0.8 send the password itself. Never "passwordless" or "the server
 *    never sees your password";
 *  - the messenger has cookie-free Vercel statistics: say "no ad trackers or
 *    third-party cookies", never "no analytics";
 *  - Verum Notes is open (notes.verum.cam, repo verum-notes): what its card
 *    says must hold there: the same account and sign-in, notes encrypted on
 *    the device, only encrypted data on the server (verum-notes CLAUDE.md);
 *  - one account, but each product signs in on its own: storage is per
 *    origin, so never "sign in once for everything".
 */

export { LANGS, DEFAULT_LANG, LANG_LABEL, LANG_STORAGE_KEY } from './langs.js';

export const SITE_URL  = 'https://verum.cam';
export const CHAT_URL  = 'https://chat.verum.cam/';
export const NOTES_URL = 'https://notes.verum.cam/';
export const SUPPORT_EMAIL = 'support@verum.cam';

// Where the Android app is offered: the GitHub releases page, whose latest
// release carries the APK. The site itself never names a .apk file or the
// APK media type: scanners flag a page that links one ("contains-apk"), and
// scripts/checkDist.js fails the build on either.
export const ANDROID_RELEASES_URL = 'https://github.com/qadamboy-dev/verum-hub/releases/latest';

const SPECS = {
  exchange: 'ECDH P-256 + HKDF-SHA256',
  cipher:   'AES-256-GCM (unique IV)',
  backup:   'PBKDF2 (600,000 iterations)',
  calls:    'WebRTC DTLS-SRTP',
};

export const COPY = {
  en: {
    meta: {
      title:       'Verum — a private ecosystem: end-to-end encrypted chat and notes',
      description: 'Verum is a family of private products on one account: Verum Chat, an end-to-end encrypted messenger with calls, video notes and live location, and Verum Notes, an encrypted Markdown knowledge base. Encryption happens on your device; the server stores ciphertext.',
    },
    skip: 'Skip to content',
    nav: {
      badge:     'Ecosystem',
      lang:      'Language',
      open:      'Open Verum Chat',
      openShort: 'Chat',
      hub:       'All Verum products',
    },
    hero: {
      badge: 'VERUM (Latin for "truth, authenticity") · Zero-Knowledge Architecture',
      title: 'One account. Every product end-to-end encrypted.',
      lead:  'Verum is a family of private products. Your keys are created on your device, and what you write is encrypted there before it leaves: our servers store and deliver ciphertext they cannot read.',
      open:     'Open Verum Chat',
      products: 'All products',
      pillars: [
        { title: 'One Verum account',       text: 'The same account works in every Verum product. An email is enough: no phone number, no SIM card.' },
        { title: 'Encrypted on your device', text: 'Keys are generated on the device, and messages and files are encrypted there before they leave it.' },
        { title: 'Zero access to content',   text: 'The server stores and relays ciphertext and holds no key to it: it cannot read what you write, send or say.' },
        { title: 'No trackers',              text: 'No ads, no ad trackers, no third-party cookies. This site loads nothing from other domains.' },
      ],
    },
    products: {
      title: 'Products',
      lead:  'Separate apps with one account and one security model.',
      live:  'Live',
      chat: {
        text:      'A secure messenger with end-to-end encryption: private chats, audio and video calls, round video notes, voice messages, files, and the Live Locator for sharing where you are.',
        features:  ['Audio and video calls', 'Video notes', 'Live Locator', 'Disappearing messages', 'QR sign-in'],
        platforms: 'Web · Android · Android TV',
        open:      'Open Verum Chat',
        apk:       'Download Android APK',
      },
      notes: {
        text:     'An end-to-end encrypted Markdown knowledge base and task list in the style of Obsidian: a folder tree, two-way [[links]], a graph of connections, tags and task checkboxes, synced through your Verum account.',
        features: ['Folder tree', 'Two-way [[links]]', 'Link graph', 'Tags', 'Task checkboxes'],
        status:   'Sign in with your Verum account. Each note is encrypted on your device before it syncs: the server stores only encrypted data, and search, links and tasks work on the device.',
        open:     'Open Verum Notes',
      },
    },
    security: {
      title: 'How end-to-end encryption works in Verum',
      lead:  'Every Verum product follows one model: keys stay on your devices, the server keeps ciphertext.',
      steps: [
        { title: 'Keys are created on your device', text: 'When you sign up, your device generates an ECDH P-256 key pair. So that you can sign in on a new device, the server keeps a copy of the private key encrypted with a key derived from your password (PBKDF2, AES-256-GCM): without the password it cannot be opened.' },
        { title: 'Encrypted before it leaves',      text: 'Two devices agree on a shared key (ECDH, HKDF-SHA256) and encrypt every message with AES-256-GCM and a unique IV. Each file gets a fresh key of its own, which travels only inside an encrypted message.' },
        { title: 'The server relays ciphertext',    text: 'Verum\'s servers store and deliver encrypted bytes. What they do see is what delivery needs: your email, who talks to whom and when, the size of encrypted files and, for sessions and protection from abuse, IP addresses.' },
        { title: 'Calls go device to device',       text: 'Audio and video calls run over WebRTC with DTLS-SRTP, and their setup is end-to-end encrypted too. When a direct connection is impossible, a relay forwards traffic it cannot decrypt.' },
      ],
      specs: {
        title: 'Cryptography',
        chip:  'Client-side',
        rows: [
          { label: 'Key agreement', value: SPECS.exchange },
          { label: 'Encryption',    value: SPECS.cipher },
          { label: 'Key backup',    value: SPECS.backup },
          { label: 'Calls',         value: SPECS.calls },
        ],
      },
      verify:    'Safety numbers (60 digits, or a QR code) let you and a contact check that each of you holds the other\'s real key.',
      account:   'One account, many apps: your email and password open every Verum product. Each app signs in on its own and keeps its keys on your device.',
      exception: 'One exception: the Verum Audio bot runs on our server and reads the messages you send it, to fetch a track from a link. Your chats with people stay end-to-end encrypted.',
    },
    footer: {
      tagline:  'End-to-end encrypted · No phone number',
      products: 'Products',
      legal:    'Legal',
      privacy:  'Privacy Policy',
      terms:    'Terms of Service',
      security: 'security.txt',
      contact:  'Contact',
    },
    legal: {
      onlyIn: '',
    },
    notFound: {
      title: 'Page not found',
      text:  'There is nothing at this address. The messenger now lives at chat.verum.cam.',
      home:  'Verum home',
      open:  'Open Verum Chat',
    },
  },

  ru: {
    meta: {
      title:       'Verum — экосистема приватности: зашифрованный мессенджер и заметки',
      description: 'Verum — семейство приватных продуктов на одном аккаунте: Verum Chat, мессенджер со сквозным шифрованием, звонками, видеокружками и геолокатором, и Verum Notes, зашифрованная база знаний на Markdown. Шифрование происходит на вашем устройстве, сервер хранит только шифротекст.',
    },
    skip: 'Перейти к содержанию',
    nav: {
      badge:     'Экосистема',
      lang:      'Язык',
      open:      'Открыть Verum Chat',
      openShort: 'Чат',
      hub:       'Все продукты Verum',
    },
    hero: {
      badge: 'VERUM (лат. «Истина, подлинность») · Zero-Knowledge Architecture',
      title: 'Один аккаунт. Сквозное шифрование во всех продуктах.',
      lead:  'Verum — семейство приватных продуктов. Ключи создаются на вашем устройстве, и всё, что вы пишете, шифруется там же, до отправки: наши серверы хранят и доставляют шифротекст, который не могут прочитать.',
      open:     'Открыть Verum Chat',
      products: 'Все продукты',
      pillars: [
        { title: 'Единый аккаунт Verum',      text: 'Один аккаунт работает во всех продуктах Verum. Достаточно почты: без номера телефона и SIM-карты.' },
        { title: 'Шифрование на устройстве',  text: 'Ключи создаются на устройстве, а сообщения и файлы шифруются на нём до отправки.' },
        { title: 'Нулевой доступ к содержимому', text: 'Сервер хранит и передаёт шифротекст и не имеет к нему ключа: прочитать то, что вы пишете, отправляете или говорите, он не может.' },
        { title: 'Без трекеров',              text: 'Без рекламы, рекламных трекеров и сторонних cookie. Этот сайт ничего не загружает с других доменов.' },
      ],
    },
    products: {
      title: 'Продукты',
      lead:  'Отдельные приложения с одним аккаунтом и одной моделью безопасности.',
      live:  'Live',
      chat: {
        text:      'Защищённый мессенджер со сквозным шифрованием: личные чаты, аудио- и видеозвонки, видеокружки, голосовые сообщения, файлы и Live Locator, чтобы делиться геопозицией.',
        features:  ['Аудио- и видеозвонки', 'Видеокружки', 'Live Locator', 'Исчезающие сообщения', 'Вход по QR-коду'],
        platforms: 'Веб · Android · Android TV',
        open:      'Открыть Verum Chat',
        apk:       'Скачать Android APK',
      },
      notes: {
        text:     'База знаний и задач на Markdown в стиле Obsidian со сквозным шифрованием: дерево папок, двусторонние связи [[заметка]], граф связей, теги и чек-боксы задач с синхронизацией через ваш аккаунт Verum.',
        features: ['Дерево папок', 'Связи [[заметка]]', 'Граф связей', 'Теги', 'Чек-боксы задач'],
        status:   'Вход — аккаунтом Verum. Каждая заметка шифруется на вашем устройстве до синхронизации: сервер хранит только зашифрованные данные, а поиск, ссылки и задачи работают на устройстве.',
        open:     'Открыть Verum Notes',
      },
    },
    security: {
      title: 'Как работает сквозное шифрование в Verum',
      lead:  'Все продукты Verum устроены одинаково: ключи остаются на ваших устройствах, на сервере — шифротекст.',
      steps: [
        { title: 'Ключи создаются на устройстве', text: 'При регистрации устройство создаёт пару ключей ECDH P-256. Чтобы вы могли войти на новом устройстве, сервер хранит копию закрытого ключа, зашифрованную ключом, выведенным из вашего пароля (PBKDF2, AES-256-GCM): без пароля её не открыть.' },
        { title: 'Шифрование до отправки',        text: 'Два устройства согласуют общий ключ (ECDH, HKDF-SHA256) и шифруют каждое сообщение алгоритмом AES-256-GCM с уникальным IV. Каждый файл получает собственный новый ключ, который передаётся только внутри зашифрованного сообщения.' },
        { title: 'Сервер передаёт шифротекст',    text: 'Серверы Verum хранят и доставляют зашифрованные байты. Видят они только то, без чего доставка невозможна: вашу почту, кто с кем и когда переписывается, размер зашифрованных файлов и — для сессий и защиты от злоупотреблений — IP-адреса.' },
        { title: 'Звонки идут напрямую',          text: 'Аудио- и видеозвонки идут по WebRTC с DTLS-SRTP, а их установка тоже зашифрована сквозным шифрованием. Если прямое соединение невозможно, ретранслятор пересылает трафик, который не может расшифровать.' },
      ],
      specs: {
        title: 'Криптография',
        chip:  'На устройстве',
        rows: [
          { label: 'Обмен ключами',        value: SPECS.exchange },
          { label: 'Шифрование',           value: SPECS.cipher },
          { label: 'Резервная копия ключа', value: SPECS.backup },
          { label: 'Звонки',               value: SPECS.calls },
        ],
      },
      verify:    'Коды безопасности (60 цифр или QR-код) позволяют вам и собеседнику проверить, что у каждого настоящий ключ другого.',
      account:   'Один аккаунт — много приложений: почта и пароль открывают любой продукт Verum. Каждое приложение входит в аккаунт само и хранит ключи на вашем устройстве.',
      exception: 'Единственное исключение — бот Verum Audio: он работает на нашем сервере и читает сообщения, которые вы ему отправляете, чтобы скачать трек по ссылке. Ваши чаты с людьми остаются под сквозным шифрованием.',
    },
    footer: {
      tagline:  'Сквозное шифрование · Без номера телефона',
      products: 'Продукты',
      legal:    'Документы',
      privacy:  'Политика конфиденциальности',
      terms:    'Условия использования',
      security: 'security.txt',
      contact:  'Связь',
    },
    legal: {
      onlyIn: '',
    },
    notFound: {
      title: 'Страница не найдена',
      text:  'По этому адресу ничего нет. Мессенджер теперь живёт на chat.verum.cam.',
      home:  'Главная Verum',
      open:  'Открыть Verum Chat',
    },
  },

  uz: {
    meta: {
      title:       'Verum — maxfiylik ekotizimi: shifrlangan messenjer va qaydlar',
      description: 'Verum — bitta akkauntdagi maxfiy mahsulotlar oilasi: Verum Chat — qo‘ng‘iroqlar, video xabarlar va jonli joylashuvga ega uchdan-uchgacha shifrlangan messenjer, Verum Notes — Markdown’dagi shifrlangan bilimlar bazasi. Shifrlash qurilmangizda bajariladi, server faqat shifrlangan matnni saqlaydi.',
    },
    skip: 'Asosiy qismga o‘tish',
    nav: {
      badge:     'Ekotizim',
      lang:      'Til',
      open:      'Verum Chat’ni ochish',
      openShort: 'Chat',
      hub:       'Barcha Verum mahsulotlari',
    },
    hero: {
      badge: 'VERUM (lot. «Haqiqat, haqqoniylik») · Zero-Knowledge Architecture',
      title: 'Bitta akkaunt. Barcha mahsulotlarda uchdan-uchgacha shifrlash.',
      lead:  'Verum — maxfiy mahsulotlar oilasi. Kalitlaringiz qurilmangizda yaratiladi, yozganlaringiz esa yuborilishidan oldin o‘sha yerda shifrlanadi: serverlarimiz o‘zi o‘qiy olmaydigan shifrlangan matnni saqlaydi va yetkazadi.',
      open:     'Verum Chat’ni ochish',
      products: 'Barcha mahsulotlar',
      pillars: [
        { title: 'Yagona Verum akkaunti',    text: 'Bitta akkaunt barcha Verum mahsulotlarida ishlaydi. Elektron pochta kifoya: telefon raqami ham, SIM-karta ham kerak emas.' },
        { title: 'Qurilmada shifrlash',       text: 'Kalitlar qurilmada yaratiladi, xabarlar va fayllar esa yuborilishidan oldin unda shifrlanadi.' },
        { title: 'Mazmunga nol kirish',       text: 'Server shifrlangan matnni saqlaydi va uzatadi, lekin uning kaliti serverda yo‘q: siz yozgan, yuborgan yoki aytgan narsalarni u o‘qiy olmaydi.' },
        { title: 'Trekerlarsiz',              text: 'Reklama, reklama trekerlari va uchinchi tomon cookie fayllari yo‘q. Bu sayt boshqa domenlardan hech narsa yuklamaydi.' },
      ],
    },
    products: {
      title: 'Mahsulotlar',
      lead:  'Bitta akkaunt va bitta xavfsizlik modeliga ega alohida ilovalar.',
      live:  'Live',
      chat: {
        text:      'Uchdan-uchgacha shifrlangan xavfsiz messenjer: shaxsiy chatlar, audio va video qo‘ng‘iroqlar, dumaloq video xabarlar, ovozli xabarlar, fayllar va joylashuvingizni ulashish uchun Live Locator.',
        features:  ['Audio va video qo‘ng‘iroqlar', 'Video xabarlar', 'Live Locator', 'O‘chib ketadigan xabarlar', 'QR-kod orqali kirish'],
        platforms: 'Veb · Android · Android TV',
        open:      'Verum Chat’ni ochish',
        apk:       'Android APK’ni yuklab olish',
      },
      notes: {
        text:     'Obsidian uslubidagi, uchdan-uchgacha shifrlangan Markdown bilimlar va vazifalar bazasi: papkalar daraxti, ikki tomonlama [[havolalar]], bog‘lanishlar grafi, teglar va vazifa belgilari — Verum akkauntingiz orqali sinxronlanadi.',
        features: ['Papkalar daraxti', 'Ikki tomonlama [[havolalar]]', 'Bog‘lanishlar grafi', 'Teglar', 'Vazifa belgilari'],
        status:   'Verum akkauntingiz bilan kiring. Har bir qayd sinxronlanishidan oldin qurilmangizda shifrlanadi: server faqat shifrlangan ma’lumotni saqlaydi, qidiruv, havolalar va vazifalar esa qurilmada ishlaydi.',
        open:     'Verum Notes’ni ochish',
      },
    },
    security: {
      title: 'Verum’da uchdan-uchgacha shifrlash qanday ishlaydi',
      lead:  'Barcha Verum mahsulotlari bir xil modelga amal qiladi: kalitlar qurilmalaringizda qoladi, serverda esa shifrlangan matn saqlanadi.',
      steps: [
        { title: 'Kalitlar qurilmada yaratiladi', text: 'Ro‘yxatdan o‘tganingizda qurilmangiz ECDH P-256 kalitlar juftligini yaratadi. Yangi qurilmada kira olishingiz uchun server yopiq kalitning parolingizdan olingan kalit bilan shifrlangan nusxasini saqlaydi (PBKDF2, AES-256-GCM): parolsiz uni ochib bo‘lmaydi.' },
        { title: 'Yuborishdan oldin shifrlash',   text: 'Ikki qurilma umumiy kalitni kelishib oladi (ECDH, HKDF-SHA256) va har bir xabarni noyob IV bilan AES-256-GCM algoritmida shifrlaydi. Har bir fayl o‘zining yangi kalitini oladi, u faqat shifrlangan xabar ichida uzatiladi.' },
        { title: 'Server shifrlangan matnni uzatadi', text: 'Verum serverlari shifrlangan baytlarni saqlaydi va yetkazadi. Ular faqat yetkazish uchun zarur narsalarni ko‘radi: elektron pochtangiz, kim kim bilan va qachon yozishayotgani, shifrlangan fayllar hajmi hamda sessiyalar va suiisteʼmoldan himoya uchun IP-manzillar.' },
        { title: 'Qo‘ng‘iroqlar to‘g‘ridan-to‘g‘ri', text: 'Audio va video qo‘ng‘iroqlar WebRTC orqali DTLS-SRTP bilan ishlaydi, ularni o‘rnatish ham uchdan-uchgacha shifrlangan. To‘g‘ridan-to‘g‘ri ulanish imkonsiz bo‘lsa, retranslyator o‘zi shifrini ocha olmaydigan trafikni uzatadi.' },
      ],
      specs: {
        title: 'Kriptografiya',
        chip:  'Qurilmada',
        rows: [
          { label: 'Kalit almashinuvi',      value: SPECS.exchange },
          { label: 'Shifrlash',              value: SPECS.cipher },
          { label: 'Kalitning zaxira nusxasi', value: SPECS.backup },
          { label: 'Qo‘ng‘iroqlar',           value: SPECS.calls },
        ],
      },
      verify:    'Xavfsizlik raqamlari (60 ta raqam yoki QR-kod) siz va suhbatdoshingizga har biringizda ikkinchisining haqiqiy kaliti borligini tekshirish imkonini beradi.',
      account:   'Bitta akkaunt — ko‘p ilova: elektron pochta va parolingiz har bir Verum mahsulotini ochadi. Har bir ilova akkauntga o‘zi kiradi va kalitlarni qurilmangizda saqlaydi.',
      exception: 'Yagona istisno — Verum Audio boti: u serverimizda ishlaydi va havola bo‘yicha trekni yuklab olish uchun siz unga yuborgan xabarlarni o‘qiydi. Odamlar bilan chatlaringiz uchdan-uchgacha shifrlangan holda qoladi.',
    },
    footer: {
      tagline:  'Uchdan-uchgacha shifrlash · Telefon raqamisiz',
      products: 'Mahsulotlar',
      legal:    'Hujjatlar',
      privacy:  'Maxfiylik siyosati',
      terms:    'Foydalanish shartlari',
      security: 'security.txt',
      contact:  'Aloqa',
    },
    legal: {
      onlyIn: 'Hujjat rus va ingliz tillarida eʼlon qilingan. Quyida ruscha matn.',
    },
    notFound: {
      title: 'Sahifa topilmadi',
      text:  'Bu manzilda hech narsa yo‘q. Messenjer endi chat.verum.cam manzilida.',
      home:  'Verum bosh sahifasi',
      open:  'Verum Chat’ni ochish',
    },
  },
};
