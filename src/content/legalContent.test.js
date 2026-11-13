/**
 * legalContent — the Privacy Policy and Terms say what the user asked for
 * and nothing the code does not do. Each check runs on RU and EN.
 *
 * Ported with the text from e2ee-chat-frontend (src/pages/legalContent.test.js);
 * the last block is the hub's own: the documents cover the ecosystem.
 */
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGAL_COPY, LEGAL_EMAIL, LEGAL_UPDATED } from './legalContent.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const file = (rel) => readFileSync(path.join(ROOT, rel), 'utf8');

const flat = (doc) => JSON.stringify(doc);
const blocksOf = (doc) => doc.sections.map(s => s.blocks.map(b => (typeof b === 'string' ? 'p' : `ul${b.list.length}`)));
const idsOf = (doc) => doc.sections.map(s => s.id);
const section = (lang, doc, id) => LEGAL_COPY[lang][doc].sections.find(s => s.id === id);

describe('legalContent — shape', () => {
  test('RU and EN have the same documents, sections, ids and blocks', () => {
    const shape = (c) => ({
      keys:    Object.keys(c).sort(),
      nav:     Object.keys(c.nav).sort(),
      privacy: { summary: c.privacy.summary.length, intro: c.privacy.intro.length, ids: idsOf(c.privacy), blocks: blocksOf(c.privacy) },
      terms:   { summary: c.terms.summary.length, intro: c.terms.intro.length, ids: idsOf(c.terms), blocks: blocksOf(c.terms) },
    });
    expect(shape(LEGAL_COPY.en)).toEqual(shape(LEGAL_COPY.ru));
  });

  test('every section has a unique, URL-safe id (they are link targets)', () => {
    for (const doc of ['privacy', 'terms']) {
      const ids = idsOf(LEGAL_COPY.en[doc]);
      expect(ids.every(id => /^[a-z][a-z0-9-]*$/.test(id))).toBe(true);
      expect(new Set(ids).size).toBe(ids.length);
    }
    // the targets other places point at
    expect(section('en', 'privacy', 'delete-account')).toBeTruthy(); // Google Play deletion URL
    expect(section('en', 'terms', 'security')).toBeTruthy();         // security.txt Policy
  });

  test('the contact address is the constant, and the date is November 2026', () => {
    expect(LEGAL_EMAIL).toBe('support@verum.cam');
    expect(LEGAL_UPDATED).toMatch(/^2026-11-\d\d$/);
    expect(LEGAL_COPY.ru.updated).toContain('ноябрь 2026');
    expect(LEGAL_COPY.en.updated).toContain('November 2026');
    for (const lang of ['ru', 'en']) {
      // the address itself is never typed into the copy: {email} links it
      expect(flat(LEGAL_COPY[lang])).not.toContain('@verum.cam');
      expect(flat(LEGAL_COPY[lang].privacy)).toContain('{email}');
      expect(flat(LEGAL_COPY[lang].terms)).toContain('{email}');
    }
  });

  test('security.txt names the vulnerability section as its Policy', () => {
    const policy = file('public/.well-known/security.txt').match(/^Policy: (\S+)$/m)?.[1];
    expect(policy).toBe('https://verum.cam/terms#security');
    expect(section('en', 'terms', policy.split('#')[1]).title).toMatch(/vulnerabilit/);
  });

  test('the sitemap dates both documents with LEGAL_UPDATED', () => {
    const sitemap = file('public/sitemap.xml');
    for (const doc of ['privacy', 'terms']) {
      const entry = sitemap.match(new RegExp(`<loc>https://verum\\.cam/${doc}</loc>\\s*<lastmod>([^<]+)</lastmod>`));
      expect(entry?.[1]).toBe(LEGAL_UPDATED);
    }
  });
});

describe.each(['ru', 'en'])('Privacy Policy (%s)', (lang) => {
  const p = flat(LEGAL_COPY[lang].privacy);
  const of = (id) => flat(section(lang, 'privacy', id));

  test('lists the data the server holds, with the real algorithms', () => {
    for (const fact of ['ECDH P-256', 'HKDF-SHA-256', 'AES-256-GCM', 'PBKDF2-HMAC-SHA-256', 'bcrypt', 'Cloudflare R2', 'IV', '.bin', 'IP', 'User-Agent', 'DDoS']) {
      expect(p).toContain(fact);
    }
    expect(p).toMatch(/600[ ,]000/);
    // the older key copies are not hidden
    expect(p).toMatch(/210[ ,]000/);
  });

  test('says what the server cannot see (zero knowledge), calls included', () => {
    expect(of('zero-knowledge')).toMatch(/Zero-Knowledge|zero knowledge/i);
    expect(of('zero-knowledge')).toContain('WebRTC');
    expect(of('zero-knowledge')).toContain('DTLS-SRTP');
    // the call setup itself is end-to-end encrypted (callSignaling.js)
    expect(of('zero-knowledge')).toMatch(/отпечатки DTLS|DTLS fingerprints/);
  });

  test('the key backup is always on, not an option', () => {
    expect(of('zero-knowledge')).toMatch(/всегда хранится|always kept/);
    expect(p).not.toMatch(/при включении (облачного )?бэкап|if you (turn on|enable) (the )?(cloud )?backup/i);
  });

  test('spells out the Verum Audio Bot exception', () => {
    const bot = LEGAL_COPY[lang].privacy.sections.find(s => /Verum Audio/.test(s.title));
    expect(bot).toBeTruthy();
    expect(flat(bot)).toMatch(/расшифровываются на сервере|decrypted on the server/);
    // and authorities could reach that chat, because the server holds the bot's key
    expect(of('authorities')).toMatch(/ключ бота хранится на сервере|server holds the bot's key/);
  });

  test('covers disappearing-message timers and account deletion', () => {
    expect(p).toMatch(/1 минута, 1 час или 1 день|1 minute, 1 hour or 1 day/);
    expect(of('delete-account')).toMatch(/Delete my account permanently/);
    expect(of('delete-account')).toMatch(/\{email\} с адреса почты|\{email\} from the email address/);
  });

  test('says who erases a disappearing message from the server, and when that can lag', () => {
    // services/expiredMessages.js: only the sender's app reports it
    expect(of('data-we-collect')).toMatch(/приложение отправителя просит сервер стереть|sender's app asks the server to erase/);
    expect(of('data-we-collect')).toContain('1.0.6');
    expect(of('retention')).toMatch(/последнего участника|last member/);
  });

  test('separates what is end-to-end encrypted from the metadata the server handles', () => {
    const split = of('what-is-encrypted');
    for (const content of [/фото и файлы|photos and files/, /звонки|calls/, /геопозиция|location/]) {
      expect(split).toMatch(content);
    }
    for (const metadata of [/почты|email/, /username/, /открытые ключи|public keys/, /участников чатов|chat members/, /размер зашифрованных файлов|size of encrypted files/, /push/]) {
      expect(split).toMatch(metadata);
    }
    // "the server has no access to keys" would hide the backup it holds
    expect(split).toMatch(/зашифрованная копия закрытого ключа|encrypted copy of your private key/);
    expect(split).toContain('Verum Audio');
    expect(LEGAL_COPY[lang].privacy.sections[0].id).toBe('what-is-encrypted');
  });

  test('says location leaves the device only on request, and never for ads', () => {
    const location = of('location');
    expect(location).toMatch(/явному действию|explicit action/);
    expect(location).toMatch(/15 минут|15 minutes/);
    expect(location).toMatch(/не сохраняет|does not store/);
    expect(location).toMatch(/рекламы или профилирования|advertising or profiling/);
  });

  test('names every service the data passes through, and where the API runs', () => {
    const providers = of('subprocessors');
    for (const provider of ['Vercel Inc.', 'Render Services, Inc.', 'MongoDB Atlas', 'Cloudflare, Inc.', 'Brevo', 'ipapi.co', 'Google', 'Cobalt',
      'OpenFreeMap', 'CARTO', 'Esri', 'MapTiler', 'verum.cam/r2', 'files.verum.cam', 'api.verum.cam']) {
      expect(providers).toContain(provider);
    }
    // the API runs in Render's Oregon region (USA); it was once given as Frankfurt
    expect(providers).toMatch(/Орегоне, США|Oregon, USA/);
    expect(p).not.toMatch(/Франкфурт|Frankfurt|Германи|Germany/);
    // data leaves the user's country: said, not hidden
    expect(providers).toMatch(/за пределами Узбекистана|outside Uzbekistan/);
  });

  test('has the AI declaration, permissions and legal bases', () => {
    expect(of('ai')).toMatch(/не используются модели искусственного интеллекта|use artificial intelligence models/);
    expect(of('ai')).toContain('LLM');
    for (const permission of [/Микрофон|Microphone/, /Камера|Camera/, /Геопозиция|Location/]) {
      expect(of('permissions')).toMatch(permission);
    }
    expect(of('legal-bases')).toMatch(/Исполнение договора|Performance of a contract/);
    expect(of('legal-bases')).toMatch(/Законный интерес|Legitimate interests/);
  });

  test('lists the rights under the GDPR and Law No. ZRU-547, and the age limit', () => {
    const rights = of('your-rights');
    expect(rights).toContain('GDPR');
    expect(rights).toContain(lang === 'ru' ? 'ЗРУ-547' : 'ZRU-547');
    expect(rights).toMatch(/переносимость|portability/);
    expect(rights).toMatch(/подать жалобу|complain/);
    expect(of('children')).toContain('16');
  });

  test('claims nothing the code does not do', () => {
    // the password does reach the server at sign-in (bcrypt check)
    expect(p).toMatch(/HTTPS/);
    expect(p).not.toMatch(/passwordless|без пароля|never sees your password|не знает (ваш )?пароль/i);
    // there are no avatars, and the server keeps disappearing messages' ciphertext
    expect(p).not.toMatch(/avatar|аватар/i);
    expect(p).toMatch(/остаётся на сервере|stays on the server/);
    // Vercel's statistics exist: "no analytics" would be false
    expect(p).toContain('Vercel Web Analytics');
    expect(p).not.toMatch(/no (third-party )?analytics|аналитическ\S* трекер/i);
    // the server has no keys; "mathematically impossible" overclaims
    expect(p).not.toMatch(/математически|mathematically/i);
    // the data is not stored in Uzbekistan: no claim of meeting its localisation rule
    expect(p).not.toMatch(/compl(y|ies|iant) with|соответству/i);
  });
});

describe.each(['ru', 'en'])('Terms of Service (%s)', (lang) => {
  const t = flat(LEGAL_COPY[lang].terms);
  const of = (id) => flat(section(lang, 'terms', id));

  test('disclaims warranties ("as is", "as available") and limits liability', () => {
    expect(t).toMatch(/«как есть»|\\"as is\\"/); // JSON-escaped quotes
    expect(t).toMatch(/«по мере доступности»|\\"as available\\"/);
    expect(of('liability')).toMatch(/косвенные|indirect/);
    expect(of('liability')).toMatch(/потерю данных|lost data/);
    expect(of('liability')).toMatch(/вашего собственного устройства|your own device/);
  });

  test('sets the age limit at 16', () => {
    expect(of('service')).toContain('16');
  });

  test('makes the password and keys the user\'s responsibility', () => {
    expect(of('password-and-keys')).toMatch(/Zero-Knowledge|zero-knowledge/);
    expect(of('password-and-keys')).toMatch(/не может никто, включая нас|nobody, including us/);
  });

  test('has an acceptable-use policy and enforcement without reading chats', () => {
    for (const banned of [/спам|spam/, /вредоносн|malware/, /фишинг|phish/, /мошенничеств|defraud/, /DDoS/]) {
      expect(of('acceptable-use')).toMatch(banned);
    }
    expect(of('enforcement')).toMatch(/не можем читать зашифрованные|cannot read encrypted/);
    expect(of('acceptable-use')).toMatch(/ограничить доступ к вашему аккаунту|restrict access to your account/);
  });

  test('has the disclosure rules security.txt points to (RFC 9116)', () => {
    const security = of('security');
    expect(security).toContain('RFC 9116');
    expect(security).toContain('https://verum.cam/.well-known/security.txt');
    expect(security).toMatch(/пока она не устранена|until it is fixed/);
  });

  test('covers the Verum Audio bot, copyright and notices from rights holders', () => {
    expect(t).toContain('Creative Commons');
    expect(t).toMatch(/Правообладатель может прислать уведомление на \{email\}|Copyright holders can send a notice to \{email\}/);
  });

  test('the bot: the user starts each download, and there is no public library', () => {
    const bot = of('bot-and-copyright');
    expect(bot).toMatch(/Инициатор загрузки — вы|You start every download/);
    expect(bot).toMatch(/вправе её использовать|have the right to use it/);
    expect(bot).toMatch(/не ведёт публичной библиотеки|keeps no public library/);
    expect(bot).toMatch(/обращения и жалобы на \{email\}|requests and complaints to \{email\}/);
    // the server fetches and encrypts the audio itself: encrypted, not end-to-end
    expect(bot).not.toMatch(/сквозн|end-to-end/i);
  });

  test('a copyright notice has the statutory parts, and safe harbor is never claimed outright', () => {
    const bot = of('bot-and-copyright');
    expect(bot).toContain('DMCA');
    expect(bot).toMatch(/лжесвидетельство|penalty of perjury/);
    expect(bot).toMatch(/электронную подпись|electronic signature/);
    // it takes an agent registered with the US Copyright Office, among other things
    expect(bot).toMatch(/Там, где это применимо, мы вправе ссылаться|Where it applies, we may rely/);
  });

  test('states that Verum (verum.cam) is independent of same-named products', () => {
    expect(t).toMatch(/независимый проект|independent project/);
    expect(t).toMatch(/одноимённым|same or a similar name/);
  });
});

describe.each(['ru', 'en'])('the ecosystem the documents cover (%s)', (lang) => {
  const c = LEGAL_COPY[lang];

  test('both intros name the hub, the messenger\'s host and the Android app', () => {
    for (const intro of [flat(c.privacy.intro), flat(c.terms.intro)]) {
      expect(intro).toContain('verum.cam');
      expect(intro).toContain('chat.verum.cam');
      expect(intro).toMatch(/Android/);
      expect(intro).toContain('notes.verum.cam');
      expect(intro).toMatch(/одном аккаунте Verum|Один аккаунт Verum|one Verum account|One Verum account/);
    }
  });

  test('Verum Notes has its own section: what the server keeps (encrypted data only), what stays in the browser, what a reset means', () => {
    expect(flat(c.privacy.intro)).not.toMatch(/ещё не открыт|not open yet/);
    const notes = flat(section(lang, 'privacy', 'verum-notes'));
    // the same account and the same sign-in, the password included
    expect(notes).toMatch(/Verum Chat/);
    expect(notes).toMatch(/HTTPS/);
    expect(notes).toMatch(/не меняет ни ваши ключи|never changes your keys/);
    // encryption on the device, a key derived from the account's private key
    expect(notes).toContain('AES-256-GCM');
    expect(notes).toContain('HKDF');
    // exactly the fields NoteItem keeps (e2ee-chat-backend src/models/NoteItem.js)
    expect(notes).toMatch(/вектор инициализации|initialisation vector/);
    expect(notes).toMatch(/номер версии|version number/);
    expect(notes).toMatch(/отметку об удалении|whether it was deleted/);
    // the metadata the server does see, said plainly
    expect(notes).toMatch(/сколько у вас заметок|how many notes/);
    expect(notes).toMatch(/2000|2,000/);
    // the browser's copy, and a reset
    expect(notes).toContain('IndexedDB');
    expect(notes).toMatch(/прежний ключ|previous key/);
    // no claim beyond the code
    expect(notes).not.toMatch(/never sees your password|не видит ваш пароль|no analytics|без аналитики/i);
  });

  test('the account deletion and the retention lists cover the notes', () => {
    expect(flat(section(lang, 'privacy', 'delete-account'))).toMatch(/заметки и папки Verum Notes|Verum Notes notes and folders/);
    expect(flat(section(lang, 'privacy', 'retention'))).toMatch(/Verum Notes/);
    expect(flat(section(lang, 'privacy', 'subprocessors'))).toContain('notes.verum.cam');
  });

  test('the Terms name Verum Notes as part of the Service, and what a reset means for it', () => {
    expect(flat(section(lang, 'terms', 'service'))).toContain('Verum Notes');
    expect(flat(section(lang, 'terms', 'password-and-keys'))).toContain('Verum Notes');
  });

  test('the hosts and the /r2 relays of both sites are named', () => {
    const providers = flat(section(lang, 'privacy', 'subprocessors'));
    expect(providers).toContain('chat.verum.cam/r2');
    expect(providers).toContain('verum.cam/r2');
    expect(providers).toMatch(/поддоменов|subdomains/);
  });

  test('the home link leads to every product, and the dark-only hub has no theme menu', () => {
    expect(c.nav.home).toMatch(/Все продукты Verum|All Verum products/);
    expect(c.nav).not.toHaveProperty('theme');
  });
});
