import express from "express";
const app=express();
const port=Number(process.env.PORT||3000);
app.use(express.json());
app.get("/health",(_req,res)=>res.json({ok:true,service:"foundry-express-ts"}));
app.get("/",(_req,res)=>res.json({name:"Foundry Express TypeScript Starter",ok:true}));
app.listen(port,()=>console.log("listening on "+port));
