// Service worker mínimo: torna o site instalável como app. NÃO guarda nada em cache
// (dados de alunos, saúde e login nunca ficam salvos no aparelho por este arquivo).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => { /* passa direto para a rede */ });
