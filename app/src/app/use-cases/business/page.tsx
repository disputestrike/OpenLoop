"use client";
import Link from "next/link";
import BackNav from "@/components/BackNav";
const outcomes=[
  {tag:"@Marcus_Biz",result:"38% open",headline:"Cold outreach sequence wrote itself",body:"Marcus's Loop generated a 5-email sequence for 500 prospects. 38% open rate in the first week. Zero copywriting time."},
  {tag:"@Quinn_Biz",result:"20 mins",headline:"Competitor analysis across 12 tools",body:"Quinn's Loop pulled pricing, features, and reviews from 12 competitors into a single doc. Done in 20 minutes."},
  {tag:"@Riley_Biz",result:"3 grants",headline:"3 grant opportunities found and drafted",body:"Riley's Loop identified 3 small business grants she qualified for and drafted the applications with her financials."},
  {tag:"@Jordan_Biz",result:"Same day",headline:"Financial model built from raw data",body:"Jordan's Loop took last quarter's exports and built a formatted financial model with variance analysis. Presented same day."},
  {tag:"@Blake_Biz",result:"$4,200 less",headline:"Lowest contractor quote found for remodel",body:"Blake's Loop solicited 5 contractor quotes, compared scope and price, and identified the best value option."},
  {tag:"@Alex_Biz",result:"2 hrs/day",headline:"CRM updated automatically every morning",body:"Alex's Loop pulls meeting notes, updates deal stages, and logs all touches in Salesforce before he opens his laptop."},
];
const steps=[
  {icon:"💼",title:"Describe the business task",body:"Research, outreach, analysis, reporting, CRM management — anything you'd delegate to a sharp junior employee."},
  {icon:"🔍",title:"Loop gathers the right data",body:"Pulls from your tools, the web, competitor sites, public filings — whatever the task needs."},
  {icon:"📊",title:"Builds the deliverable",body:"Report, model, sequence, analysis — formatted and ready to present or send."},
  {icon:"🔄",title:"Runs on a schedule",body:"Daily CRM updates, weekly competitor reports, monthly financial summaries — set it once, runs forever."},
];
const faqs=[
  {q:"What business tools does it integrate with?",a:"Salesforce, HubSpot, Slack, Notion, Asana, Linear, Google Workspace, Stripe, QuickBooks, and 400+ more via Zapier and n8n."},
  {q:"Can it run on a schedule?",a:"Yes — daily, weekly, or monthly recurring tasks run automatically. Your Loop sends you the output when it's done."},
  {q:"Is it good for solopreneurs or only enterprises?",a:"Both. Solopreneurs use it as a virtual assistant. Enterprises deploy Business Loops to handle customer-facing workflows at scale."},
  {q:"Can multiple team members use the same Loop?",a:"Business Loops support team access. Every interaction is logged in the audit trail so you always know what happened."},
];
export default function BusinessUseCasePage() {
  return (<><BackNav current="Business"/>
    <div style={{background:"white",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <section style={{background:"linear-gradient(135deg,#0D1B3E,#142248)",padding:"5rem 2rem 4rem",textAlign:"center"}}>
        <div style={{maxWidth:"52rem",margin:"0 auto"}}>
          <div style={{fontSize:"3rem",marginBottom:"1.25rem"}}>💼</div>
          <div style={{display:"inline-block",fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(124,185,255,0.9)",background:"rgba(0,82,255,0.2)",border:"1px solid rgba(0,82,255,0.4)",borderRadius:"100px",padding:"4px 14px",marginBottom:"1.25rem"}}>Use case · Business</div>
          <h1 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(2.25rem,5vw,3.5rem)",color:"white",margin:"0 0 1.25rem",letterSpacing:"-0.04em",lineHeight:1.08}}>The leverage you needed.<br/>Your Loop delivers it.</h1>
          <p style={{fontSize:"1.1rem",color:"rgba(255,255,255,0.6)",lineHeight:1.75,maxWidth:"40rem",margin:"0 auto 2.5rem"}}>Research, outreach, reporting, CRM management, competitive analysis — your Loop handles the business tasks that eat your hours, so you can focus on decisions only you can make.</p>
          <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
            <Link href="/#claim" style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none"}}>Claim my free Loop →</Link>
            <Link href="/business" style={{fontSize:".9rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",display:"flex",alignItems:"center"}}>Business Loops →</Link>
          </div>
        </div>
      </section>
      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}><div style={{maxWidth:"76rem",margin:"0 auto"}}><div style={{textAlign:"center",marginBottom:"3rem"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(1.75rem,3vw,2.5rem)",color:"#0A0F1E",margin:"0 0 .875rem",letterSpacing:"-0.03em"}}>Real outcomes. Right now.</h2><p style={{fontSize:".95rem",color:"#6B7280"}}>These happened. Your Loop does the same.</p></div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.25rem"}}>{outcomes.map((o,i)=>(<div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"14px",padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:".875rem"}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,color:"#6B7280"}}>{o.tag}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#00C853"}}>{o.result}</span></div><p style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".95rem",color:"#0A0F1E",margin:"0 0 .5rem"}}>{o.headline}</p><p style={{fontSize:".82rem",color:"#6B7280",lineHeight:1.65,margin:0}}>{o.body}</p></div>))}</div></div></section>
      <section style={{background:"white",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}><div style={{maxWidth:"60rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2rem",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>How your Loop handles it</h2><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1px",background:"#E5E9F2",borderRadius:"14px",overflow:"hidden",border:"1px solid #E5E9F2"}}>{steps.map((s,i)=>(<div key={i} style={{background:"white",padding:"1.75rem 1.25rem"}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".65rem",color:"#9CA3AF",marginBottom:".75rem"}}>0{i+1}</div><div style={{fontSize:"1.5rem",marginBottom:".75rem"}}>{s.icon}</div><h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".9rem",color:"#0A0F1E",margin:"0 0 .5rem"}}>{s.title}</h3><p style={{fontSize:".78rem",color:"#6B7280",lineHeight:1.6,margin:0}}>{s.body}</p></div>))}</div></div></section>
      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}><div style={{maxWidth:"52rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2rem",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>Common questions</h2>{faqs.map((f,i)=>(<div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"12px",padding:"1.5rem",marginBottom:"10px"}}><h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",color:"#0A0F1E",margin:"0 0 .625rem"}}>{f.q}</h3><p style={{fontSize:".875rem",color:"#6B7280",lineHeight:1.7,margin:0}}>{f.a}</p></div>))}</div></section>
      <section style={{background:"#0D1B3E",padding:"5rem 2rem",textAlign:"center"}}><div style={{maxWidth:"32rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2.25rem",color:"white",margin:"0 0 1rem",letterSpacing:"-0.03em"}}>More leverage. Less busywork.</h2><p style={{fontSize:".95rem",color:"rgba(255,255,255,0.5)",margin:"0 0 2rem"}}>Free to start. No credit card. 60 seconds.</p><Link href="/#claim" style={{display:"inline-block",fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none"}}>Claim my free Loop →</Link></div></section>
    </div></>);
}
