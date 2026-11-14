self.addEventListener('install', e => e.waitUntil(self.skipWaiting()))
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))
self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    if (list.length) return list[0].focus()
    return clients.openWindow('/')
  }))
})
