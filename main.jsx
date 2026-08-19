import React,{useEffect,useState} from "react";
import {createRoot} from "react-dom/client";
import {io} from "socket.io-client";
import {all,put,remove} from "./offlineDb.js";
import "./styles.css";

const API="http://localhost:4000", socket=io(API,{autoConnect:false});
const styles=["photorealistic","cinematic","anime","3D render","watercolor","oil painting","comic","pixel art","cyberpunk","fantasy","minimalist","claymation"];

function App(){
 const [online,setOnline]=useState(navigator.onLine);
 const [syncing,setSyncing]=useState(false);
 const [auth,setAuth]=useState(()=>JSON.parse(localStorage.getItem("novaAuth")||"null"));
 const [chats,setChats]=useState([]),[selected,setSelected]=useState(null),[msgs,setMsgs]=useState([]);
 const [text,setText]=useState(""),[tab,setTab]=useState("chat"),[prompt,setPrompt]=useState("");
 const [style,setStyle]=useState(styles[0]),[output,setOutput]=useState(null),[busy,setBusy]=useState(false);

 useEffect(()=>{
  const on=()=>{setOnline(true);syncOutbox()};
  const off=()=>setOnline(false);
  window.addEventListener("online",on);window.addEventListener("offline",off);
  if("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
  return()=>{window.removeEventListener("online",on);window.removeEventListener("offline",off)}
},[]);
useEffect(()=>{if(auth){if(online) {socket.connect();loadChats()} else loadOfflineChats()}},[auth,online]);
 async function loadChats(){
 try{const r=await api("/api/conversations");const x=await r.json();setChats(x);
   for(const c of x) await put("conversations",c);
   if(!selected&&x[0])setSelected(x[0].id);
 }catch{await loadOfflineChats()}
}
async function loadOfflineChats(){
 const x=await all("conversations");setChats(x);if(!selected&&x[0])setSelected(x[0].id);
}
async function syncOutbox(){
 if(!auth||!navigator.onLine)return;
 const items=await all("outbox");if(!items.length)return;
 setSyncing(true);
 try{
   const r=await api("/api/sync/outbox",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({items})});
   const data=await r.json();for(const x of items) await remove("outbox",x.id);
   setSyncing(false);if(selected)loadMessages(selected);
 }catch{setSyncing(false)}
}
 useEffect(()=>{if(!selected||!auth)return;loadMessages(selected);if(online)socket.emit("join",selected);const h=m=>{if(m.conversation_id===selected){setMsgs(v=>[...v.filter(x=>x.id!==m.id),m]);put("messages",m)}};socket.on("message:new",h);return()=>socket.off("message:new",h)},[selected,auth,online]);
 async function loadMessages(id){
   try{const r=await api(`/api/conversations/${id}/messages`);const x=await r.json();setMsgs(x);for(const m of x)await put("messages",m)}
   catch{const x=(await all("messages")).filter(m=>m.conversation_id===id);setMsgs(x)}
 }
 async function api(path,opt={}){opt.headers={...(opt.headers||{}),Authorization:`Bearer ${auth?.token}`};return fetch(API+path,opt)}
 async function login(){const r=await fetch(API+"/api/auth/demo",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Nova User",email:`user-${Date.now()}@local.test`})});const a=await r.json();localStorage.setItem("novaAuth",JSON.stringify(a));setAuth(a)}
 async function send(){
 if(!text.trim()||!selected)return;const body=text.trim();setText("");
 const m={id:crypto.randomUUID(),conversation_id:selected,sender_id:auth.user.id,kind:"text",body,created_at:new Date().toISOString(),pending:!online};
 setMsgs(v=>[...v,m]);await put("messages",m);
 if(!online){await put("outbox",{id:m.id,conversationId:selected,body,kind:"text"});try{const reg=await navigator.serviceWorker.ready;if(reg.sync)await reg.sync.register("nova-outbox")}catch{};return}
 await api("/api/messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({clientId:m.id,conversationId:selected,body})});
 if(chats.find(c=>c.id===selected)?.title==="Nova AI"){const r=await api("/api/ai/chat",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({input:body})});const a=await r.json();await api("/api/messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({conversationId:selected,body:a.text||a.error})})}
}
 async function generate(mode){setBusy(true);setOutput(null);try{const r=await api(mode==="image"?"/api/ai/image":"/api/ai/video",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({mode,prompt,style,duration:8})});setOutput(await r.json())}finally{setBusy(false)}}

 if(!auth)return <div className="login"><div className="card"><div className="logo">Nova<span>Chat</span></div><p>Private messaging with an AI media studio.</p><button onClick={login}>Enter demo</button></div></div>;

 return <div className="app"><div className={"status "+(online?"online":"offline")}>{online?"● Online":"○ Offline"} {syncing&&"• Syncing"}</div><aside><div className="logo">Nova<span>Chat</span></div><button className="new" onClick={async()=>{await api("/api/conversations",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({title:"New Group",isGroup:true})});loadChats()}}>＋ New chat</button><div className="label">CONVERSATIONS</div>{chats.map(c=><button className={"chat "+(c.id===selected?"active":"")} key={c.id} onClick={()=>setSelected(c.id)}><b>{c.title||"Chat"}</b><small>{c.member_count} member(s)</small></button>)}</aside><main><header><div><b>{chats.find(c=>c.id===selected)?.title||"Chat"}</b><small> ● online</small></div><span>⌕　⋮</span></header><div className="messages">{msgs.map(m=><div className={"bubble "+(m.sender_id===auth.user.id?"mine":"theirs")} key={m.id}>{m.body}<small>{new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}</small></div>)}</div><div className="composer"><input value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Message…"/><button onClick={send}>➤</button></div><section className="studio"><nav><button className={tab==="chat"?"on":""} onClick={()=>setTab("chat")}>Chat</button><button className={tab==="image"?"on":""} onClick={()=>setTab("image")}>Generate image</button><button className={tab==="video"?"on":""} onClick={()=>setTab("video")}>Text → video</button><button className={tab==="image-video"?"on":""} onClick={()=>setTab("image-video")}>Image → video</button></nav>{tab!=="chat"&&<div className="panel"><textarea value={prompt} onChange={e=>setPrompt(e.target.value)} placeholder="Describe your creation…"/><div className="controls"><select value={style} onChange={e=>setStyle(e.target.value)}>{styles.map(s=><option key={s}>{s}</option>)}</select><button disabled={busy} onClick={()=>generate(tab==="image"?"image":"video")}>{busy?"Working…":"Generate"}</button></div>{output&&<pre>{JSON.stringify(output,null,2)}</pre>}</div>}</section></main></div>
}
createRoot(document.getElementById("root")).render(<App/>);
