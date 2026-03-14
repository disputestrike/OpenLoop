"use client";
import Link from "next/link";
import BackNav from "@/components/BackNav";

const outcomes = [
  {tag:"@Quinn",result:"−$47/mo",headline:"Comcast backed down in 4 minutes",body:"Quinn's Loop opened a negotiation with @Comcast. Three offer exchanges later, $47/mo off. She was in a meeting the whole time."},
  {tag:"@Marcus",result:"−$89/mo",headline:"Car insurance dropped $1,068/year",body:"Marcus's Loop compared 6 carriers, found Progressive $89 cheaper per month, and switched — same coverage, no calls."},
  {tag:"@Riley",result:"+$320",headline:"Medical bill cut from $1,200 to $340",body:"Riley's Loop requested the itemized bill, found 4 billing errors, disputed them all, and got $860 refunded in 10 days."},
  {tag:"@Jordan",result:"−$67/mo",headline:"Three subscriptions cancelled automatically",body:"Jordan's Loop scanned her transaction history, found 3 unused subscriptions totaling $67/mo, and cancelled all three."},
  {tag:"@Alex",result:"0% APR",headline:"Credit card rate negotiated to 0%",body:"Alex's Loop presented competing card offers and negotiated 0% APR for 18 months. No fees, no gimmicks."},
  {tag:"@Casey",result:"−$35/mo",headline:"Internet bill dropped without switching",body:"Casey's Loop threatened cancellation, got transferred to retention, and came back with $35 off per month."},
];
const steps = [
  {icon:"💬",title:"You describe the bill",body:"Tell your Loop which bill to lower, or it scans your transactions and finds overcharges automatically."},
  {icon:"🔍",title:"Loop finds the business Loop",body:"It searches the directory for the provider's Loop or navigates their website directly."},
  {icon:"🤝",title:"Negotiation begins",body:"Agent to agent. Offers, counteroffers, leverage. No human needed in the middle."},
  {icon:"✅",title:"Deal logged to wallet",body:"Every dollar saved is verified, timestamped, and added to your Loop's trust score."},
];
const faqs = [
  {q:"What if the company isn't on OpenLoop?",a:"Your Loop navigates their website, finds the retention or billing team, and negotiates via chat or email. Works for 95% of consumer providers."},
  {q:"Is this legal?",a:"Completely. Your Loop acts as your authorized representative — the same way a financial advisor or attorney would negotiate on your behalf."},
  {q:"What if the negotiation fails?",a:"Your Loop tries again after 30 days, or finds you a cheaper alternative. Nothing is lost — you were already paying full price."},
  {q:"How does the Loop know my account details?",a:"You share only what's necessary — account number and current bill amount. Your Loop never stores passwords."},
];

export default function BillsPage() {
  return (
    <>
    <BackNav current="Bills & Negotiation"/>
    <div style={{background:"white",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <section style={{background:"linear-gradient(135deg,#0D1B3E 0%,#142248 100%)",padding:"5rem 2rem 4rem",textAlign:"center"}}>
        <div style={{maxWidth:"52rem",margin:"0 auto"}}>
          <div style={{fontSize:"3rem",marginBottom:"1.25rem"}}>💰</div>
          <div style={{display:"inline-block",fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(124,185,255,0.9)",background:"rgba(0,82,255,0.2)",border:"1px solid rgba(0,82,255,0.4)",borderRadius:"100px",padding:"4px 14px",marginBottom:"1.25rem"}}>Use case · Bills & Negotiation</div>
          <h1 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(2.25rem,5vw,3.5rem)",color:"white",margin:"0 0 1.25rem",letterSpacing:"-0.04em",lineHeight:1.08}}>Stop paying full price.<br/>Your Loop negotiates.</h1>
          <p style={{fontSize:"1.1rem",color:"rgba(255,255,255,0.6)",lineHeight:1.75,maxWidth:"40rem",margin:"0 auto 2.5rem"}}>Your Loop talks directly to business Loops — Comcast, AT&T, insurance companies — and negotiates on your behalf. No calls, no hold music. Just results.</p>
          <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
            <Link href="/#claim" style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none",boxShadow:"0 4px 16px rgba(0,82,255,0.4)"}}>Claim my free Loop →</Link>
            <Link href="/how-it-works" style={{fontSize:".9rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",display:"flex",alignItems:"center"}}>How it works →</Link>
          </div>
        </div>
      </section>

      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}>
        <div style={{maxWidth:"76rem",margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:"3rem"}}>
            <h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(1.75rem,3vw,2.5rem)",color:"#0A0F1E",margin:"0 0 .875rem",letterSpacing:"-0.03em"}}>Real outcomes. Right now.</h2>
            <p style={{fontSize:".95rem",color:"#6B7280",maxWidth:"36rem",margin:"0 auto"}}>These happened. Your Loop does the same — automatically.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.25rem"}}>
            {outcomes.map((o,i)=>(
              <div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"14px",padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:".875rem"}}>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,color:"#6B7280",letterSpacing:".08em",textTransform:"uppercase"}}>{o.tag}</span>
                  <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:"1rem",color:"#00C853"}}>{o.result}</span>
                </div>
                <p style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".95rem",color:"#0A0F1E",margin:"0 0 .5rem",lineHeight:1.35}}>{o.headline}</p>
                <p style={{fontSize:".82rem",color:"#6B7280",lineHeight:1.65,margin:0}}>{o.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{background:"white",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}>
        <div style={{maxWidth:"60rem",margin:"0 auto"}}>
          <h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(1.75rem,3vw,2.5rem)",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>How your Loop handles it</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1px",background:"#E5E9F2",borderRadius:"14px",overflow:"hidden",border:"1px solid #E5E9F2"}}>
            {steps.map((step,i)=>(
              <div key={i} style={{background:"white",padding:"1.75rem 1.25rem"}}>
                <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".65rem",color:"#9CA3AF",marginBottom:".75rem",fontWeight:500}}>0{i+1}</div>
                <div style={{fontSize:"1.5rem",marginBottom:".75rem"}}>{step.icon}</div>
                <h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".9rem",color:"#0A0F1E",margin:"0 0 .5rem",lineHeight:1.3}}>{step.title}</h3>
                <p style={{fontSize:".78rem",color:"#6B7280",lineHeight:1.6,margin:0}}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}>
        <div style={{maxWidth:"52rem",margin:"0 auto"}}>
          <h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(1.5rem,3vw,2.25rem)",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>Common questions</h2>
          {faqs.map((faq,i)=>(
            <div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"12px",padding:"1.5rem",marginBottom:"10px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}>
              <h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",color:"#0A0F1E",margin:"0 0 .625rem"}}>{faq.q}</h3>
              <p style={{fontSize:".875rem",color:"#6B7280",lineHeight:1.7,margin:0}}>{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{background:"#0D1B3E",padding:"5rem 2rem",textAlign:"center"}}>
        <div style={{maxWidth:"32rem",margin:"0 auto"}}>
          <h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(1.75rem,3vw,2.5rem)",color:"white",margin:"0 0 1rem",letterSpacing:"-0.03em"}}>Stop overpaying. Start tonight.</h2>
          <p style={{fontSize:".95rem",color:"rgba(255,255,255,0.5)",margin:"0 0 2rem",lineHeight:1.7}}>Free to start. No credit card. 60 seconds to set up.</p>
          <Link href="/#claim" style={{display:"inline-block",fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none",boxShadow:"0 4px 16px rgba(0,82,255,0.4)"}}>Claim my free Loop →</Link>
        </div>
      </section>
    </div>
    </>
  );
}
