"use client";
import Link from "next/link";
import BackNav from "@/components/BackNav";
const outcomes=[
  {tag:"@Marcus",result:"$800 back",headline:"Security deposit returned in 10 days",body:"Marcus's Loop filed small claims documentation, sent a formal demand letter, and followed up twice. $800 arrived in 10 days."},
  {tag:"@Riley",result:"Unenforceable",headline:"Non-compete clause found unenforceable",body:"Riley's Loop researched her state's non-compete laws, found the clause violated 3 statutes, and drafted a formal response."},
  {tag:"@Jordan",result:"Removed 24hr",headline:"DMCA takedown processed and content removed",body:"Jordan's Loop submitted a properly formatted DMCA notice. The infringing content was removed within 24 hours."},
  {tag:"@Quinn",result:"2 clauses",headline:"Lease reviewed — 2 unenforceable clauses found",body:"Quinn's Loop reviewed her lease before signing. Found 2 clauses her landlord legally cannot enforce in her state."},
  {tag:"@Alex",result:"Denied → Paid",headline:"Insurance claim denial reversed",body:"Alex's Loop identified the denial reason, wrote an appeal citing the specific policy language, and got the claim paid."},
  {tag:"@Blake",result:"$1,400 saved",headline:"Contractor dispute settled without a lawyer",body:"Blake's Loop drafted a demand letter citing breach of contract. Contractor settled for full refund within 2 weeks."},
];
const steps=[
  {icon:"📄",title:"Describe the situation",body:"'My landlord is keeping my deposit.' 'This contract has terms I don't understand.' 'I need to dispute a denial.'"},
  {icon:"🔍",title:"Loop researches your rights",body:"Looks up relevant laws for your state, reviews similar cases, and identifies your strongest legal position."},
  {icon:"✍️",title:"Drafts the right documents",body:"Demand letters, dispute responses, DMCA notices, appeals — formatted correctly and sent on your behalf."},
  {icon:"📬",title:"Follows up until resolved",body:"Tracks deadlines, sends follow-up communications, and escalates if the other party doesn't respond."},
];
const faqs=[
  {q:"Is this legal advice?",a:"Your Loop provides legal research and document drafting based on publicly available information. For complex cases, it can help you find and brief a qualified attorney."},
  {q:"What types of disputes can it handle?",a:"Security deposits, consumer disputes, insurance denials, DMCA claims, contract reviews, employment questions, and landlord-tenant issues."},
  {q:"Does it work in every state?",a:"Yes — your Loop researches the specific laws in your jurisdiction before drafting any documents or taking any action."},
  {q:"What if the other party escalates?",a:"Your Loop helps you understand your options, prepares small claims documentation if needed, and helps find legal aid resources in your area."},
];
export default function LegalPage() {
  return (<><BackNav current="Legal & Rights"/>
    <div style={{background:"white",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <section style={{background:"linear-gradient(135deg,#0D1B3E,#142248)",padding:"5rem 2rem 4rem",textAlign:"center"}}>
        <div style={{maxWidth:"52rem",margin:"0 auto"}}>
          <div style={{fontSize:"3rem",marginBottom:"1.25rem"}}>⚖️</div>
          <div style={{display:"inline-block",fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(124,185,255,0.9)",background:"rgba(0,82,255,0.2)",border:"1px solid rgba(0,82,255,0.4)",borderRadius:"100px",padding:"4px 14px",marginBottom:"1.25rem"}}>Use case · Legal & Rights</div>
          <h1 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(2.25rem,5vw,3.5rem)",color:"white",margin:"0 0 1.25rem",letterSpacing:"-0.04em",lineHeight:1.08}}>Know your rights.<br/>Your Loop enforces them.</h1>
          <p style={{fontSize:"1.1rem",color:"rgba(255,255,255,0.6)",lineHeight:1.75,maxWidth:"40rem",margin:"0 auto 2.5rem"}}>Contract review, dispute letters, DMCA takedowns, insurance appeals — your Loop researches the law, drafts the documents, and follows up until it's resolved.</p>
          <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
            <Link href="/#claim" style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none"}}>Claim my free Loop →</Link>
            <Link href="/how-it-works" style={{fontSize:".9rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",display:"flex",alignItems:"center"}}>How it works →</Link>
          </div>
        </div>
      </section>
      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}><div style={{maxWidth:"76rem",margin:"0 auto"}}><div style={{textAlign:"center",marginBottom:"3rem"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(1.75rem,3vw,2.5rem)",color:"#0A0F1E",margin:"0 0 .875rem",letterSpacing:"-0.03em"}}>Real outcomes. Right now.</h2><p style={{fontSize:".95rem",color:"#6B7280"}}>These happened. Your Loop does the same.</p></div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.25rem"}}>{outcomes.map((o,i)=>(<div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"14px",padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:".875rem"}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,color:"#6B7280"}}>{o.tag}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#00C853"}}>{o.result}</span></div><p style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".95rem",color:"#0A0F1E",margin:"0 0 .5rem"}}>{o.headline}</p><p style={{fontSize:".82rem",color:"#6B7280",lineHeight:1.65,margin:0}}>{o.body}</p></div>))}</div></div></section>
      <section style={{background:"white",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}><div style={{maxWidth:"60rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2rem",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>How your Loop handles it</h2><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1px",background:"#E5E9F2",borderRadius:"14px",overflow:"hidden",border:"1px solid #E5E9F2"}}>{steps.map((s,i)=>(<div key={i} style={{background:"white",padding:"1.75rem 1.25rem"}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".65rem",color:"#9CA3AF",marginBottom:".75rem"}}>0{i+1}</div><div style={{fontSize:"1.5rem",marginBottom:".75rem"}}>{s.icon}</div><h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".9rem",color:"#0A0F1E",margin:"0 0 .5rem"}}>{s.title}</h3><p style={{fontSize:".78rem",color:"#6B7280",lineHeight:1.6,margin:0}}>{s.body}</p></div>))}</div></div></section>
      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}><div style={{maxWidth:"52rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2rem",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>Common questions</h2>{faqs.map((f,i)=>(<div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"12px",padding:"1.5rem",marginBottom:"10px"}}><h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",color:"#0A0F1E",margin:"0 0 .625rem"}}>{f.q}</h3><p style={{fontSize:".875rem",color:"#6B7280",lineHeight:1.7,margin:0}}>{f.a}</p></div>))}</div></section>
      <section style={{background:"#0D1B3E",padding:"5rem 2rem",textAlign:"center"}}><div style={{maxWidth:"32rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2.25rem",color:"white",margin:"0 0 1rem",letterSpacing:"-0.03em"}}>Your rights. Enforced.</h2><p style={{fontSize:".95rem",color:"rgba(255,255,255,0.5)",margin:"0 0 2rem"}}>Free to start. No credit card. 60 seconds.</p><Link href="/#claim" style={{display:"inline-block",fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none"}}>Claim my free Loop →</Link></div></section>
    </div></>);
}
