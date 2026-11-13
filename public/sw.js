/* sw.js — the service worker verum.cam serves now that the messenger has
 * moved to chat.verum.cam.
 *
 * Nothing on the hub registers a worker. But browsers that used the
 * messenger here still have its worker (e2ee-chat-frontend public/sw.js)
 * registered for this origin, and, with notifications on, a push
 * subscription. They fetch /sw.js again to update it: on a visit, and when a
 * push arrives more than a day after the last check. They get this file,
 * which takes the old worker's place:
 *  - on activation it ends the old push subscription (the push service then
 *    answers the server 410 Gone, and the server drops it) and, if there was
 *    one, says once where the messenger went: notifications now come from
 *    chat.verum.cam, once they are allowed there;
 *  - a push that still arrives is shown as before (a browser penalises a
 *    push that shows nothing), and every click opens chat.verum.cam, with
 *    the chat's id in the hash the messenger reads (#chat=<id>);
 *  - no fetch handler: the hub's pages always come from the network.
 * src/sw.test.js runs it against a fake worker scope.
 */
'use strict';

var CHAT_URL = 'https://chat.verum.cam/';

var MOVED = {
  en: { title: 'Verum Chat has moved', body: 'Open chat.verum.cam and allow notifications there to keep getting them.' },
  ru: { title: 'Verum Chat переехал', body: 'Откройте chat.verum.cam и разрешите там уведомления, чтобы получать их и дальше.' },
  uz: { title: 'Verum Chat ko‘chdi', body: 'Bildirishnomalarni olishda davom etish uchun chat.verum.cam’ni oching va u yerda ularga ruxsat bering.' },
};

function language() {
  var lang = '';
  try { lang = String(self.navigator.language || '').toLowerCase(); } catch (e) { /* none */ }
  if (lang.indexOf('ru') === 0) return 'ru';
  if (lang.indexOf('uz') === 0) return 'uz';
  return 'en';
}

function chatLink(chatId) {
  return chatId ? CHAT_URL + '#chat=' + encodeURIComponent(chatId) : CHAT_URL;
}

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (event) {
  event.waitUntil(
    self.registration.pushManager.getSubscription()
      .then(function (subscription) {
        if (!subscription) return null;
        var moved = MOVED[language()];
        return subscription.unsubscribe()
          .catch(function () { return false; })
          .then(function () {
            return self.registration.showNotification(moved.title, {
              body:  moved.body,
              tag:   'verum-moved',
              icon:  '/favicon.svg',
              badge: '/favicon.svg',
              data:  { url: CHAT_URL },
            });
          });
      })
      .catch(function () { return null; })
  );
});

// The old worker's payloads: metadata only ({ title, body, tag, chatId })
self.addEventListener('push', function (event) {
  var data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { /* opaque payload */ }
  event.waitUntil(self.registration.showNotification(data.title || 'Verum', {
    body:  data.body || '🔒 Encrypted message',
    tag:   data.tag || 'verum-message',
    icon:  '/favicon.svg',
    badge: '/favicon.svg',
    data:  { chatId: data.chatId || null },
  }));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  var data = event.notification.data || {};
  event.waitUntil(self.clients.openWindow(data.chatId ? chatLink(data.chatId) : (data.url || CHAT_URL)));
});
