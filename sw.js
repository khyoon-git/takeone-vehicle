// 항상 최신 내용을 보여주기 위해 캐시하지 않고 네트워크로만 처리합니다.
// (fetch 핸들러가 있어야 '홈 화면에 추가'가 활성화됩니다.)
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', (e) => { /* passthrough: 네트워크 우선, 캐시 없음 */ });
