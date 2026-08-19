const DB_NAME="nova-chat-v3", DB_VERSION=1;

export function openOfflineDb(){
  return new Promise((resolve,reject)=>{
    const r=indexedDB.open(DB_NAME,DB_VERSION);
    r.onupgradeneeded=()=>{const db=r.result;
      if(!db.objectStoreNames.contains("messages"))db.createObjectStore("messages",{keyPath:"id"});
      if(!db.objectStoreNames.contains("outbox"))db.createObjectStore("outbox",{keyPath:"id"});
      if(!db.objectStoreNames.contains("conversations"))db.createObjectStore("conversations",{keyPath:"id"});
    };
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
}
export async function put(store,value){
  const db=await openOfflineDb(); return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,"readwrite"); tx.objectStore(store).put(value);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });
}
export async function all(store){
  const db=await openOfflineDb(); return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,"readonly"),r=tx.objectStore(store).getAll();
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  });
}
export async function remove(store,id){
  const db=await openOfflineDb(); return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,"readwrite");tx.objectStore(store).delete(id);
    tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);
  });
}
