import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import multer from "multer";
import http from "node:http";
import path from "node:path";
import fs from "node:fs";
import {v4 as uuidv4} from "uuid";
import {Server} from "socket.io";
import {RateLimiterMemory} from "rate-limiter-flexible";
import {initDb,pool} from "./db.js";
import {signUser,requireAuth} from "./auth.js";
import {chat,image,transcribe} from "./ai.js";
import {createVideo} from "./video.js";

const app=express(), server=http.createServer(app);
const io=new Server(server,{cors:{origin:process.env.CLIENT_ORIGIN||"http://localhost:5173"}});
const uploadDir=path.resolve("uploads"); fs.mkdirSync(uploadDir,{recursive:true});
const upload=multer({dest:uploadDir,limits:{fileSize:50*1024*1024}});
const limiter=new RateLimiterMemory({points:100,duration:60});

app.use(helmet({crossOriginResourcePolicy:false}));
app.use(cors({origin:process.env.CLIENT_ORIGIN||"http://localhost:5173"}));
app.use(express.json({limit:"10mb"}));
app.use("/uploads",express.static(uploadDir));

app.get("/api/health",(_,res)=>res.json({ok:true,version:"2.0.0"}));

app.post("/api/auth/demo",async(req,res)=>{
  const name=req.body.name||"Demo User", email=req.body.email||`demo-${Date.now()}@local.test`;
  const result=await pool.query(
    "INSERT INTO users(name,email) VALUES($1,$2) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name RETURNING id,name,email",
    [name,email]
  );
  res.json({user:result.rows[0],token:signUser(result.rows[0])});
});

app.get("/api/conversations",requireAuth,async(req,res)=>{
  const r=await pool.query(`
    SELECT c.*, count(cm2.user_id)::int AS member_count
    FROM conversations c
    LEFT JOIN conversation_members cm2 ON cm2.conversation_id=c.id
    JOIN conversation_members cm ON cm.conversation_id=c.id AND cm.user_id=$1
    GROUP BY c.id ORDER BY c.created_at DESC`,[req.user.sub]);
  res.json(r.rows);
});

app.post("/api/conversations",requireAuth,async(req,res)=>{
  const c=await pool.query("INSERT INTO conversations(title,is_group) VALUES($1,$2) RETURNING *",[req.body.title||"New chat",!!req.body.isGroup]);
  await pool.query("INSERT INTO conversation_members(conversation_id,user_id,role) VALUES($1,$2,'owner')",[c.rows[0].id,req.user.sub]);
  res.json(c.rows[0]);
});

app.get("/api/conversations/:id/messages",requireAuth,async(req,res)=>{
  const r=await pool.query("SELECT * FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC",[req.params.id]);
  res.json(r.rows);
});

app.post("/api/messages",requireAuth,async(req,res)=>{
  const m=await pool.query(
    "INSERT INTO messages(id,conversation_id,sender_id,kind,body,media_url,reply_to) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [req.body.clientId||uuidv4(),req.body.conversationId,req.user.sub,req.body.kind||"text",req.body.body||"",req.body.mediaUrl||null,req.body.replyTo||null]
  );
  io.to(req.body.conversationId).emit("message:new",m.rows[0]);
  res.json(m.rows[0]);
});

app.post("/api/sync/outbox",requireAuth,async(req,res)=>{
  const items=Array.isArray(req.body.items)?req.body.items:[];
  const results=[];
  for(const item of items){
    try{
      const m=await pool.query(
        "INSERT INTO messages(id,conversation_id,sender_id,kind,body,media_url,reply_to) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO NOTHING RETURNING *",
        [item.id||uuidv4(),item.conversationId,req.user.sub,item.kind||"text",item.body||"",item.mediaUrl||null,item.replyTo||null]
      );
      if(m.rows[0]){io.to(item.conversationId).emit("message:new",m.rows[0]);results.push(m.rows[0]);}
    }catch(e){results.push({id:item.id,error:e.message});}
  }
  res.json({synced:results});
});

app.post("/api/upload",requireAuth,upload.single("file"),(req,res)=>{
  if(!req.file)return res.status(400).json({error:"No file"});
  res.json({url:`/uploads/${req.file.filename}`,name:req.file.originalname,mime:req.file.mimetype});
});

app.post("/api/ai/chat",requireAuth,async(req,res)=>{
  try{
    await limiter.consume(req.user.sub);
    res.json({text:await chat(req.body.input||"")});
  }catch(e){res.status(429).json({error:e.message||"Rate limited"});}
});

app.post("/api/ai/image",requireAuth,async(req,res)=>{
  try{res.json(await image(req.body.prompt||"",req.body.style||"photorealistic"))}
  catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/ai/video",requireAuth,async(req,res)=>{
  try{res.json(await createVideo(req.body))}
  catch(e){res.status(500).json({error:e.message});}
});

app.post("/api/ai/transcribe",requireAuth,upload.single("audio"),async(req,res)=>{
  try{res.json({text:await transcribe(fs.createReadStream(req.file.path))})}
  catch(e){res.status(500).json({error:e.message});}
});

io.use((socket,next)=>next());
io.on("connection",socket=>{
  socket.on("join",room=>socket.join(room));
  socket.on("typing",data=>socket.to(data.room).emit("typing",data));
  socket.on("read",async data=>{
    await pool.query("UPDATE messages SET read_at=now() WHERE id=$1",[data.messageId]);
    io.to(data.room).emit("message:read",data);
  });
});

await initDb();
const port=Number(process.env.PORT||4000);
server.listen(port,()=>console.log(`Nova API listening on ${port}`));
