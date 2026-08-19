const CACHE="nova-shell-v3";
const APP=["/","/index.html"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(self.clients.claim()));
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return r;
  }).catch(()=>caches.match(e.request).then(r=>r||caches.match("/index.html"))));
});
self.addEventListener("sync",e=>{
  if(e.tag==="nova-outbox") e.waitUntil(self.clients.matchAll({type:"window"}).then(cs=>cs.forEach(c=>c.postMessage({type:"SYNC_OUTBOX"}))));
});
