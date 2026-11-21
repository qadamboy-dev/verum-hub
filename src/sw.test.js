/**
 * public/sw.js — the worker that replaces the messenger's on verum.cam,
 * run in a fake worker scope: it ends the old push subscription and says
 * once where the messenger went, still shows a push that arrives, and every
 * click opens chat.verum.cam.
 */
import { describe, test, expect, vi } from 'vitest';
import { file } from './test/helpers.js';

const SOURCE = file('public/sw.js');

function load({ subscription = null, language = 'en-US' } = {}) {
  const listeners = {};
  const self = {
    addEventListener: (type, fn) => { listeners[type] = fn; },
    skipWaiting: vi.fn(),
    navigator: { language },
    registration: {
      pushManager: { getSubscription: vi.fn(() => Promise.resolve(subscription)) },
      showNotification: vi.fn(() => Promise.resolve()),
    },
    clients: { openWindow: vi.fn(() => Promise.resolve()) },
  };
  new Function('self', SOURCE)(self);
  const fire = async (type, extra = {}) => {
    const waits = [];
    listeners[type]({ waitUntil: (p) => waits.push(p), ...extra });
    await Promise.all(waits);
  };
  return { self, listeners, fire };
}

const subscription = (unsubscribe = vi.fn(() => Promise.resolve(true))) => ({ unsubscribe });

describe('sw.js — taking over from the messenger\'s worker', () => {
  test('it activates at once, and never handles fetches', async () => {
    const { self, listeners, fire } = load();
    await fire('install');
    expect(self.skipWaiting).toHaveBeenCalled();
    expect(Object.keys(listeners).sort()).toEqual(['activate', 'install', 'notificationclick', 'push']);
  });

  test('the old push subscription ends, and one notice says where the messenger went', async () => {
    const sub = subscription();
    const { self, fire } = load({ subscription: sub });
    await fire('activate');
    expect(sub.unsubscribe).toHaveBeenCalledTimes(1);
    expect(self.registration.showNotification).toHaveBeenCalledTimes(1);
    const [title, options] = self.registration.showNotification.mock.calls[0];
    expect(title).toBe('Verum Chat has moved');
    expect(options.body).toContain('chat.verum.cam');
    expect(options).toMatchObject({ tag: 'verum-moved', data: { url: 'https://chat.verum.cam/' } });
  });

  test.each([['ru-RU', 'Verum Chat переехал'], ['uz', 'Verum Chat ko‘chdi'], ['de', 'Verum Chat has moved']])(
    'the notice in the browser\'s language (%s)', async (language, title) => {
      const { self, fire } = load({ subscription: subscription(), language });
      await fire('activate');
      expect(self.registration.showNotification.mock.calls[0][0]).toBe(title);
    });

  test('without a subscription there is nothing to say', async () => {
    const { self, fire } = load();
    await fire('activate');
    expect(self.registration.showNotification).not.toHaveBeenCalled();
  });

  test('a failed unsubscribe still tells the person, and nothing throws', async () => {
    const { self, fire } = load({ subscription: subscription(vi.fn(() => Promise.reject(new Error('offline')))) });
    await expect(fire('activate')).resolves.toBeUndefined();
    expect(self.registration.showNotification).toHaveBeenCalledTimes(1);
  });
});

describe('sw.js — pushes and clicks', () => {
  test('a push that still arrives shows as before (metadata only)', async () => {
    const { self, fire } = load();
    await fire('push', { data: { json: () => ({ title: 'Alice', body: '🔒 Encrypted message', tag: 'chat-1', chatId: 'c1' }) } });
    expect(self.registration.showNotification).toHaveBeenCalledWith('Alice', expect.objectContaining({
      body: '🔒 Encrypted message', tag: 'chat-1', data: { chatId: 'c1' },
    }));
  });

  test('an unreadable push still shows something (browsers penalise a silent one)', async () => {
    const { self, fire } = load();
    await fire('push', { data: { json: () => { throw new Error('not JSON'); } } });
    expect(self.registration.showNotification).toHaveBeenCalledWith('Verum', expect.objectContaining({ tag: 'verum-message' }));
  });

  test('a click on a message opens its chat on chat.verum.cam', async () => {
    const { self, fire } = load();
    const notification = { data: { chatId: 'a b/c' }, close: vi.fn() };
    await fire('notificationclick', { notification });
    expect(notification.close).toHaveBeenCalled();
    expect(self.clients.openWindow).toHaveBeenCalledWith('https://chat.verum.cam/#chat=a%20b%2Fc');
  });

  test('a click on the notice, or on anything else, opens the messenger', async () => {
    for (const data of [{ url: 'https://chat.verum.cam/' }, {}, null]) {
      const { self, fire } = load();
      await fire('notificationclick', { notification: { data, close: vi.fn() } });
      expect(self.clients.openWindow).toHaveBeenCalledWith('https://chat.verum.cam/');
    }
  });

  test('an address kept in a notification is followed only when it is the messenger\'s own', async () => {
    const elsewhere = [
      'https://evil.example/',
      'https://chat.verum.cam.evil.example/',
      'https://chat.verum.cam@evil.example/',
      'http://chat.verum.cam/',
      '//evil.example/',
      '/#chat=1',
      'javascript:alert(1)',
      { toString: () => 'https://evil.example/' },
      42,
    ];
    for (const url of elsewhere) {
      const { self, fire } = load();
      await fire('notificationclick', { notification: { data: { url }, close: vi.fn() } });
      expect(self.clients.openWindow, String(url)).toHaveBeenCalledWith('https://chat.verum.cam/');
    }
    const { self, fire } = load();
    await fire('notificationclick', { notification: { data: { url: 'https://chat.verum.cam/#chat=c1' }, close: vi.fn() } });
    expect(self.clients.openWindow).toHaveBeenCalledWith('https://chat.verum.cam/#chat=c1');
  });
});
