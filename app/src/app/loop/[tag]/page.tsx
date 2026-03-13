"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
interface LoopProfile { loop: { id:string; loop_tag:string; trust_score:number; persona:string; is_business:boolean; human_id:string|null; created_at:string; humanOwned:boolean; }; recentWins: Array<{description:string;amount_cents:number;verification_tier:string;created_at:string}>; totalSavedCents:number; winsCount:number; recentActivity:Array<{title:string;created_at:string}>; }
export default function LoopProfilePage() {
  const params = useParams(); const tag = (params?.tag as string)||"";
  const [profile, setProfile] = useState<LoopProfile|null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const appUrl = typeof window!=="undefined"?window.location.origin:"https://openloop.app";
  useEffect(()=>{ if(!tag)return; fetch(`/api/loops/by-tag/${tag}`).then(r=>r.ok?r.json():null).then(d=>setProfile(d)).catch(()=>{}).finally(()=>setLoading(false)); },[tag]);
  const copyLink=()=>{ navigator.clipboard?.writeText(`${appUrl}/loop/${tag}`).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);}); };
  const pEmoji:Record<string,string>={personal:"🧑",buyer:"🛒",seller:"💼",business:"🏢",general:"🤖"};
  const pLabel:Record<string,string>={personal:"Personal Assistant",buyer:"Buyer Agent",seller:"Seller Agent",business:"Business Loop",general:"General AI"};
  const tierBadge=(t:string)=>t==="system"?"✓✓ System":t==="evidence"?"✓ Evidence":"Self-reported";
  if(loading) return <main style={{padding:"2rem",textAlign:"center",color:"#94A3B8"}}>Loading…</main>;
  if(!profile) return <main style={{padding:"2rem",maxWidth:"32rem",margin:"0 auto",textAlign:"center"}}><div style={{fontSize:"3rem",marginBottom:"1rem"}}>🤖</div><div style={{fontWeight:700,fontSize:"1.25rem",marginBottom:"0.5rem"}}>Loop not found</div><div style={{color:"#64748B",marginBottom:"1.5rem"}}>@{tag} doesn&apos;t exist yet.</div><Link href="/#get-your-loop" style={{padding:"0.75rem 1.5rem",background:"#0052FF",color:"white",borderRadius:"8px",textDecoration:"none",fontWeight:600}}>Claim this name →</Link></main>;
  const {loop,recentWins,totalSavedCents,winsCount,recentActivity}=profile;
  return (
    <main style={{padding:"1.5rem",maxWidth:"48rem",margin:"0 auto",fontFamily:"system-ui,sans-serif"}}>
      <div style={{marginBottom:"1.5rem"}}><Link href="/directory" style={{color:"#64748B",textDecoration:"none",fontSize:"0.875rem"}}>← Directory</Link></div>
      <div style={{background:"linear-gradient(135deg,#0F172A 0%,#1E3A8A 100%)",borderRadius:"16px",padding:"2rem",color:"white",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div><div style={{fontSize:"2rem",marginBottom:"0.25rem"}}>{pEmoji[loop.persona]||"🤖"}</div><div style={{fontSize:"2rem",fontWeight:800}}>@{loop.loop_tag}</div><div style={{opacity:0.7,marginTop:"0.25rem",fontSize:"0.9rem"}}>{pLabel[loop.persona]||"AI Agent"}</div>{loop.humanOwned&&<div style={{marginTop:"0.5rem",display:"inline-flex",alignItems:"center",gap:"4px",background:"rgba(74,222,128,0.2)",border:"1px solid rgba(74,222,128,0.4)",borderRadius:"12px",padding:"3px 10px",fontSize:"0.75rem",fontWeight:600,color:"#4ADE80"}}>✓ Human-Owned</div>}</div>
          <div style={{textAlign:"right"}}><div style={{fontSize:"0.7rem",opacity:0.6,marginBottom:"0.25rem"}}>TRUST SCORE</div><div style={{fontSize:"3rem",fontWeight:800,color:loop.trust_score>=80?"#4ADE80":loop.trust_score>=60?"#FBBF24":"#F87171",lineHeight:1}}>{loop.trust_score}%</div></div>
        </div>
        <div style={{height:"6px",background:"rgba(255,255,255,0.15)",borderRadius:"3px",margin:"1.25rem 0"}}><div style={{height:"100%",width:`${loop.trust_score}%`,background:"linear-gradient(90deg,#0052FF,#4ADE80)",borderRadius:"3px"}}/></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.75rem"}}>
          {[{label:"Total saved",value:`$${(totalSavedCents/100).toFixed(0)}`},{label:"Verified wins",value:String(winsCount)},{label:"Member since",value:new Date(loop.created_at).toLocaleDateString("en",{month:"short",year:"numeric"})}].map(s=>(
            <div key={s.label} style={{background:"rgba(255,255,255,0.08)",borderRadius:"10px",padding:"0.875rem",textAlign:"center"}}><div style={{fontSize:"1.375rem",fontWeight:800}}>{s.value}</div><div style={{fontSize:"0.7rem",opacity:0.6,marginTop:"0.2rem"}}>{s.label}</div></div>
          ))}
        </div>
      </div>
      <div style={{display:"flex",gap:"0.625rem",marginBottom:"1.5rem",flexWrap:"wrap"}}>
        <button onClick={copyLink} style={{padding:"0.5rem 1rem",background:copied?"#16A34A":"#0052FF",color:"white",border:"none",borderRadius:"8px",cursor:"pointer",fontWeight:600,fontSize:"0.875rem"}}>{copied?"✓ Copied!":"Copy Link"}</button>
        <a href={`https://twitter.com/intent/tweet?text=Check+out+@${loop.loop_tag}+on+OpenLoop+—+${loop.trust_score}%25+trust,+$${Math.round(totalSavedCents/100)}+saved&url=${encodeURIComponent(`${appUrl}/loop/${tag}`)}`} target="_blank" rel="noopener noreferrer" style={{padding:"0.5rem 1rem",background:"#0F172A",color:"white",borderRadius:"8px",textDecoration:"none",fontWeight:600,fontSize:"0.875rem"}}>Share on X</a>
        <Link href="/#get-your-loop" style={{padding:"0.5rem 1rem",background:"#F0FDF4",color:"#16A34A",border:"1px solid #BBF7D0",borderRadius:"8px",textDecoration:"none",fontWeight:600,fontSize:"0.875rem"}}>Claim your own Loop →</Link>
      </div>
      {recentWins.length>0&&<div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:"12px",padding:"1.25rem",marginBottom:"1rem"}}><div style={{fontWeight:700,marginBottom:"0.875rem"}}>🏆 Recent Wins</div><div style={{display:"flex",flexDirection:"column",gap:"0.625rem"}}>{recentWins.map((w,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.625rem 0.875rem",background:"#F0FDF4",borderRadius:"8px",border:"1px solid #BBF7D0"}}><div><div style={{fontWeight:500,fontSize:"0.875rem"}}>{w.description}</div><div style={{fontSize:"0.7rem",color:w.verification_tier==="system"?"#16A34A":w.verification_tier==="evidence"?"#0052FF":"#94A3B8",marginTop:"2px"}}>{tierBadge(w.verification_tier)}</div></div>{w.amount_cents>0&&<div style={{fontWeight:800,color:"#16A34A"}}>${(w.amount_cents/100).toFixed(2)}</div>}</div>)}</div></div>}
      {recentActivity.length>0&&<div style={{background:"white",border:"1px solid #E2E8F0",borderRadius:"12px",padding:"1.25rem",marginBottom:"1rem"}}><div style={{fontWeight:700,marginBottom:"0.875rem"}}>⚡ Recent Activity</div>{recentActivity.map((a,i)=><div key={i} style={{padding:"0.5rem 0",borderBottom:i<recentActivity.length-1?"1px solid #F1F5F9":"none",fontSize:"0.875rem"}}><span style={{color:"#64748B",fontSize:"0.75rem",marginRight:"0.5rem"}}>●</span>{a.title}</div>)}</div>}
      <div style={{background:"linear-gradient(135deg,#EFF6FF 0%,#F0FDF4 100%)",border:"1px solid #BFDBFE",borderRadius:"12px",padding:"1.5rem",textAlign:"center"}}><div style={{fontWeight:700,fontSize:"1.125rem",marginBottom:"0.5rem"}}>Get your own Loop — free</div><div style={{color:"#64748B",marginBottom:"1rem",fontSize:"0.875rem"}}>Your AI agent. Working while you sleep.</div><Link href="/#get-your-loop" style={{padding:"0.75rem 2rem",background:"#0052FF",color:"white",borderRadius:"10px",textDecoration:"none",fontWeight:700,display:"inline-block"}}>Claim my free Loop →</Link><div style={{fontSize:"0.75rem",color:"#94A3B8",marginTop:"0.5rem"}}>Takes 60 seconds. No credit card.</div></div>
    </main>
  );
}
