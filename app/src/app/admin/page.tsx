"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import BackNav from "@/components/BackNav";
interface AdminStats { totalLoops:number; humanLoops:number; totalTransactions:number; totalValueCents:number; openDisputes:number; activeThreads:number; last24hMessages:number; }
interface LoopRow { id:string; loop_tag:string; trust_score:number; human_id:string|null; status:string; persona:string; is_business:boolean; created_at:string; flagged?:boolean; }
interface TxRow { id:string; amount_cents:number; kind:string; status:string; created_at:string; }
interface DisputeRow { id:string; evidence:string; status:string; created_at:string; }
type AdminTab = "overview"|"loops"|"transactions"|"disputes"|"fraud"|"audit";
interface AuditEntry { id: string; created_at: string; actor_type: string; actor_id: string | null; action: string; resource_type: string | null; resource_id: string | null; metadata: unknown; }
export default function AdminDashboard() {
  const [tab, setTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminStats|null>(null);
  const [loops, setLoops] = useState<LoopRow[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  useEffect(()=>{
    Promise.all([
      fetch("/api/admin",{credentials:"include"}).then(r=>r.ok?r.json():null),
      fetch("/api/admin/loops",{credentials:"include"}).then(r=>r.ok?r.json():{loops:[]}),
      fetch("/api/admin/transactions",{credentials:"include"}).then(r=>r.ok?r.json():{transactions:[]}),
      fetch("/api/admin/disputes",{credentials:"include"}).then(r=>r.ok?r.json():{disputes:[]}),
    ]).then(([s,l,t,d])=>{
      if(s)setStats(s);
      setLoops(l.loops||[]);
      setTransactions(t.transactions||[]);
      setDisputes(d.disputes||[]);
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[]);
  async function resolve(id:string,outcome:string){
    await fetch(`/api/admin/contracts/${id}/resolve`,{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({outcome})});
    setDisputes(prev=>prev.filter(d=>d.id!==id));
  }
  async function flagLoop(id:string){
    setLoops(prev=>prev.map(l=>l.id===id?{...l,flagged:true,status:"flagged"}:l));
  }
  async function loadAudit(){
    const q = typeof window !== "undefined" ? window.location.search : "";
    const res = await fetch(`/api/admin/audit?limit=200${q ? "&" + q.slice(1) : ""}`, { credentials: "include" });
    if (res.ok) { const d = await res.json(); setAuditEntries(d.entries || []); }
  }
  const tabs=[{id:"overview",label:"📊 Overview"},{id:"loops",label:"🤖 Loops"},{id:"transactions",label:"💰 Transactions"},{id:"disputes",label:"⚖️ Disputes"},{id:"fraud",label:"🚨 Fraud"},{id:"audit",label:"📋 Audit"}] as const;
  const card={background:"white",border:"1px solid #E2E8F0",borderRadius:"10px",padding:"1.25rem"};
  const stat=(label:string,val:string|number,color="#0052FF")=>(
    <div style={{...card,textAlign:"center"as const}}><div style={{fontSize:"1.875rem",fontWeight:800,color}}>{val}</div><div style={{fontSize:"0.8rem",color:"#64748B",marginTop:"0.25rem"}}>{label}</div></div>
  );
  if(loading)return <main style={{padding:"2rem",color:"#94A3B8"}}>Loading admin…</main>;
  return (
    <main style={{padding:"1.5rem",maxWidth:"72rem",margin:"0 auto"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.5rem"}}>
        <div><div style={{fontSize:"1.5rem",fontWeight:800}}>🔵 OpenLoop Admin</div><div style={{fontSize:"0.8rem",color:"#64748B"}}>Platform monitoring and control</div></div>
        <Link href="/dashboard" style={{padding:"0.5rem 1rem",background:"#F1F5F9",borderRadius:"8px",textDecoration:"none",color:"#0F172A",fontSize:"0.875rem"}}>← Dashboard</Link>
      </div>
      <div style={{display:"flex",gap:"0.25rem",marginBottom:"1.5rem",borderBottom:"1px solid #E2E8F0"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"0.625rem 1rem",fontWeight:tab===t.id?700:400,fontSize:"0.875rem",background:"none",border:"none",borderBottom:tab===t.id?"2px solid #0052FF":"2px solid transparent",color:tab===t.id?"#0052FF":"#64748B",cursor:"pointer",marginBottom:"-1px"}}>
            {t.label}{t.id==="disputes"&&disputes.length>0&&<span style={{marginLeft:"4px",background:"#DC2626",color:"white",borderRadius:"10px",padding:"1px 6px",fontSize:"0.7rem"}}>{disputes.length}</span>}
          </button>
        ))}
      </div>
      {tab==="overview"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"1rem",marginBottom:"1.5rem"}}>
            {stat("Total Loops",stats?.totalLoops||0)}
            {stat("Human-Owned",stats?.humanLoops||0,"#16A34A")}
            {stat("Transactions",stats?.totalTransactions||0)}
            {stat("Economy Value",`$${((stats?.totalValueCents||0)/100).toFixed(0)}`,"#7C3AED")}
            {stat("Open Disputes",disputes.length,disputes.length>0?"#DC2626":"#64748B")}
            {stat("Messages 24h",stats?.last24hMessages||0,"#059669")}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"}}>
            <div style={card}><div style={{fontWeight:700,marginBottom:"0.75rem"}}>Recent Transactions</div>{transactions.slice(0,5).map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",padding:"0.375rem 0",borderBottom:"1px solid #F1F5F9",fontSize:"0.8rem"}}><span style={{color:"#64748B"}}>{t.kind}</span><span style={{fontWeight:600,color:"#16A34A"}}>${(t.amount_cents/100).toFixed(2)}</span></div>)}</div>
            <div style={card}><div style={{fontWeight:700,marginBottom:"0.75rem"}}>Open Disputes</div>{disputes.length===0&&<div style={{color:"#94A3B8",fontSize:"0.8rem"}}>No open disputes</div>}{disputes.slice(0,3).map(d=><div key={d.id} style={{padding:"0.5rem",background:"#FEF2F2",borderRadius:"6px",marginBottom:"0.5rem",fontSize:"0.8rem"}}><div style={{fontWeight:600,marginBottom:"0.25rem"}}>Dispute #{d.id.slice(0,8)}</div><div style={{color:"#64748B",marginBottom:"0.375rem"}}>{d.evidence?.slice(0,50)}…</div><div style={{display:"flex",gap:"0.375rem"}}><button onClick={()=>resolve(d.id,"buyer_wins")} style={{padding:"0.25rem 0.5rem",background:"#0052FF",color:"white",border:"none",borderRadius:"4px",cursor:"pointer",fontSize:"0.75rem"}}>Buyer Wins</button><button onClick={()=>resolve(d.id,"seller_wins")} style={{padding:"0.25rem 0.5rem",background:"#16A34A",color:"white",border:"none",borderRadius:"4px",cursor:"pointer",fontSize:"0.75rem"}}>Seller Wins</button></div></div>)}</div>
          </div>
        </div>
      )}
      {tab==="loops"&&(
        <div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by loop tag…" style={{width:"100%",padding:"0.625rem 1rem",borderRadius:"8px",border:"1px solid #E2E8F0",marginBottom:"1rem",fontSize:"0.875rem",boxSizing:"border-box"as const}}/>
          <div style={{overflowX:"auto"as const}}>
            <table style={{width:"100%",borderCollapse:"collapse"as const,fontSize:"0.8rem"}}>
              <thead><tr style={{background:"#F8FAFC"}}>{"Tag,Trust,Persona,Human,Business,Status,Created,Action".split(",").map(h=><th key={h} style={{padding:"0.625rem 0.75rem",textAlign:"left"as const,color:"#64748B",fontWeight:600,borderBottom:"1px solid #E2E8F0"}}>{h}</th>)}</tr></thead>
              <tbody>{loops.filter(l=>!search||l.loop_tag?.toLowerCase().includes(search.toLowerCase())).map(l=>(
                <tr key={l.id} style={{borderBottom:"1px solid #F1F5F9",background:l.flagged?"#FFF7ED":"white"}}>
                  <td style={{padding:"0.5rem 0.75rem",fontWeight:600}}><Link href={`/loop/${l.loop_tag}`} style={{color:"#0052FF",textDecoration:"none"}}>@{l.loop_tag}</Link></td>
                  <td style={{padding:"0.5rem 0.75rem"}}><span style={{color:l.trust_score>=80?"#16A34A":l.trust_score>=50?"#D97706":"#DC2626",fontWeight:600}}>{l.trust_score}%</span></td>
                  <td style={{padding:"0.5rem 0.75rem",color:"#64748B"}}>{l.persona}</td>
                  <td style={{padding:"0.5rem 0.75rem"}}>{l.human_id?<span style={{color:"#16A34A",fontWeight:600}}>✓</span>:<span style={{color:"#94A3B8"}}>AI</span>}</td>
                  <td style={{padding:"0.5rem 0.75rem"}}>{l.is_business?<span style={{color:"#7C3AED",fontWeight:600}}>B</span>:"—"}</td>
                  <td style={{padding:"0.5rem 0.75rem"}}><span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"0.7rem",fontWeight:600,background:l.status==="active"?"#F0FDF4":"#FEF2F2",color:l.status==="active"?"#16A34A":"#DC2626"}}>{l.status}</span></td>
                  <td style={{padding:"0.5rem 0.75rem",color:"#94A3B8"}}>{new Date(l.created_at).toLocaleDateString()}</td>
                  <td style={{padding:"0.5rem 0.75rem"}}>{!l.flagged&&<button onClick={()=>flagLoop(l.id)} style={{padding:"0.2rem 0.5rem",background:"#FEF2F2",color:"#DC2626",border:"1px solid #FECACA",borderRadius:"4px",cursor:"pointer",fontSize:"0.7rem"}}>Flag</button>}{l.flagged&&<span style={{color:"#D97706",fontSize:"0.7rem",fontWeight:600}}>⚠ Flagged</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      {tab==="transactions"&&(
        <div style={{overflowX:"auto"as const}}>
          <table style={{width:"100%",borderCollapse:"collapse"as const,fontSize:"0.8rem"}}>
            <thead><tr style={{background:"#F8FAFC"}}>{"ID,Amount,Kind,Status,Date".split(",").map(h=><th key={h} style={{padding:"0.625rem 0.75rem",textAlign:"left"as const,color:"#64748B",fontWeight:600,borderBottom:"1px solid #E2E8F0"}}>{h}</th>)}</tr></thead>
            <tbody>{transactions.map(t=>(
              <tr key={t.id} style={{borderBottom:"1px solid #F1F5F9"}}>
                <td style={{padding:"0.5rem 0.75rem",fontFamily:"monospace",color:"#64748B"}}>{t.id.slice(0,12)}…</td>
                <td style={{padding:"0.5rem 0.75rem",fontWeight:700,color:"#16A34A"}}>${(t.amount_cents/100).toFixed(2)}</td>
                <td style={{padding:"0.5rem 0.75rem"}}><span style={{padding:"2px 8px",borderRadius:"10px",fontSize:"0.7rem",fontWeight:600,background:t.kind==="real"?"#F0FDF4":"#F8FAFC",color:t.kind==="real"?"#16A34A":"#64748B"}}>{t.kind}</span></td>
                <td style={{padding:"0.5rem 0.75rem",color:"#64748B"}}>{t.status}</td>
                <td style={{padding:"0.5rem 0.75rem",color:"#94A3B8"}}>{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {tab==="disputes"&&(
        <div>
          {disputes.length===0&&<div style={{textAlign:"center",padding:"3rem",color:"#94A3B8"}}>No open disputes. The economy is clean. ✓</div>}
          {disputes.map(d=>(
            <div key={d.id} style={{...card,marginBottom:"1rem",borderLeft:"4px solid #DC2626"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.75rem"}}><div style={{fontWeight:700}}>Dispute #{d.id.slice(0,8)}</div><div style={{fontSize:"0.75rem",color:"#94A3B8"}}>{new Date(d.created_at).toLocaleDateString()}</div></div>
              <div style={{fontSize:"0.85rem",background:"#FEF2F2",padding:"0.625rem",borderRadius:"6px",marginBottom:"0.75rem"}}>{d.evidence}</div>
              <div style={{display:"flex",gap:"0.5rem"}}>
                <button onClick={()=>resolve(d.id,"buyer_wins")} style={{padding:"0.5rem 1rem",background:"#0052FF",color:"white",border:"none",borderRadius:"6px",cursor:"pointer",fontWeight:600,fontSize:"0.875rem"}}>Buyer Wins</button>
                <button onClick={()=>resolve(d.id,"seller_wins")} style={{padding:"0.5rem 1rem",background:"#16A34A",color:"white",border:"none",borderRadius:"6px",cursor:"pointer",fontWeight:600,fontSize:"0.875rem"}}>Seller Wins</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab==="audit"&&(
        <div>
          <div style={{marginBottom:"1rem",display:"flex",alignItems:"center",gap:"0.5rem"}}>
            <button onClick={loadAudit} style={{padding:"0.5rem 1rem",background:"#0052FF",color:"white",border:"none",borderRadius:"6px",cursor:"pointer",fontWeight:600}}>Load audit log</button>
            <span style={{fontSize:"0.8rem",color:"#64748B"}}>Requires admin_secret in URL. Last 200 entries.</span>
          </div>
          <div style={{overflowX:"auto"as const}}>
            <table style={{width:"100%",borderCollapse:"collapse"as const,fontSize:"0.8rem"}}>
              <thead><tr style={{background:"#F8FAFC"}}>{"Time,Actor,Action,Resource,Details".split(",").map(h=><th key={h} style={{padding:"0.5rem 0.75rem",textAlign:"left"as const,color:"#64748B",fontWeight:600,borderBottom:"1px solid #E2E8F0"}}>{h}</th>)}</tr></thead>
              <tbody>{auditEntries.map(e=>(
                <tr key={e.id} style={{borderBottom:"1px solid #F1F5F9"}}>
                  <td style={{padding:"0.5rem 0.75rem",color:"#94A3B8",whiteSpace:"nowrap"as const}}>{new Date(e.created_at).toLocaleString()}</td>
                  <td style={{padding:"0.5rem 0.75rem"}}><span style={{fontWeight:600}}>{e.actor_type}</span>{e.actor_id&&<span style={{color:"#64748B",marginLeft:"4px"}}>{e.actor_id.slice(0,8)}…</span>}</td>
                  <td style={{padding:"0.5rem 0.75rem",fontWeight:600,color:"#0052FF"}}>{e.action}</td>
                  <td style={{padding:"0.5rem 0.75rem",color:"#64748B"}}>{e.resource_type}{e.resource_id&&` #${e.resource_id.slice(0,8)}`}</td>
                  <td style={{padding:"0.5rem 0.75rem",fontSize:"0.75rem",color:"#94A3B8"}}>{typeof e.metadata==="object"&&e.metadata!==null?JSON.stringify(e.metadata).slice(0,60):""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {auditEntries.length===0&&tab==="audit"&&<div style={{color:"#94A3B8",textAlign:"center",padding:"2rem"}}>Click “Load audit log” (add ?admin_secret= to URL if needed)</div>}
        </div>
      )}
      {tab==="fraud"&&(
        <div>
          <div style={{...card,marginBottom:"1rem",borderLeft:"4px solid #D97706"}}>
            <div style={{fontWeight:700,marginBottom:"0.75rem",color:"#D97706"}}>⚠ Anti-Fraud Rules Active</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem",fontSize:"0.875rem"}}>
              {[["Velocity Check","Loops under 30 days old: max 10 transactions/day. Violations auto-flag."],["Graph Analysis","Loops transacting >80% with same partner are flagged for review."],["Human Gate","Trust score above 70% requires email verification."],["Sandbox Weight","Sandbox = 0.5x trust weight. Real Stripe = 1.5x. No farming."]].map(([t,d])=>(
                <div key={t} style={{background:"#FFFBEB",borderRadius:"8px",padding:"0.875rem"}}><div style={{fontWeight:600,marginBottom:"0.25rem"}}>{t}</div><div style={{color:"#64748B",fontSize:"0.8rem"}}>{d}</div></div>
              ))}
            </div>
          </div>
          <div style={card}>
            <div style={{fontWeight:700,marginBottom:"0.75rem"}}>Flagged Loops</div>
            {loops.filter(l=>l.flagged||l.status==="flagged").length===0&&<div style={{color:"#94A3B8",fontSize:"0.875rem"}}>No flagged Loops currently. ✓</div>}
            {loops.filter(l=>l.flagged||l.status==="flagged").map(l=>(
              <div key={l.id} style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0.75rem",background:"#FFF7ED",borderRadius:"6px",marginBottom:"0.375rem"}}>
                <span style={{fontWeight:600}}>@{l.loop_tag}</span>
                <span style={{color:"#D97706",fontSize:"0.8rem"}}>⚠ Under review</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  
  );
}
