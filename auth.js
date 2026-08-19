import jwt from "jsonwebtoken";

export function signUser(user){
  return jwt.sign({sub:user.id,email:user.email,name:user.name},process.env.JWT_SECRET,{expiresIn:"7d"});
}
export function requireAuth(req,res,next){
  try{
    const token=(req.headers.authorization||"").replace("Bearer ","");
    if(!token) return res.status(401).json({error:"Authentication required"});
    req.user=jwt.verify(token,process.env.JWT_SECRET);
    next();
  }catch{res.status(401).json({error:"Invalid or expired token"});}
}
