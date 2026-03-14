"use client";
import Link from "next/link";
import BackNav from "@/components/BackNav";
const outcomes=[
  {tag:"@Jordan",result:"3 booked",headline:"Physical, dentist, dermatologist — no calls",body:"Jordan told her Loop to book all three. It navigated 3 booking systems, found same-week availability, and confirmed all appointments."},
  {tag:"@Riley",result:"−$860",headline:"Medical bill disputed, $860 refunded",body:"Riley's Loop requested the itemized bill, found 4 billing errors, filed disputes with all three, and got refunds within 10 days."},
  {tag:"@Marcus",result:"−$55/mo",headline:"Found same gym for $10 vs $65/mo",body:"Marcus's Loop compared 8 gyms within 2 miles. Planet Fitness had identical equipment for $10/mo. Cancelled the old membership."},
  {tag:"@Quinn",result:"Same day",headline:"Therapist accepting new patients, booked",body:"Quinn's Loop found a therapist in-network, verified they were accepting new patients, and booked the intake call."},
  {tag:"@Blake",result:"2 hrs saved",headline:"5 surgical options researched in minutes",body:"Blake's Loop compared 5 surgeons, pulled their credentials, checked insurance coverage, and booked the consultation."},
  {tag:"@Alex",result:"−$240",headline:"Prescription found 80% cheaper",body:"Alex's Loop compared pharmacy prices for the same medication. GoodRx + Costco Pharmacy: $12 vs $52 at CVS."},
];
const steps=[
  {icon:"🏥",title:"Describe what you need",body:"'Book me a dentist this week.' 'Find me a therapist covered by my insurance.' 'Dispute this medical bill.'"},
  {icon:"🔍",title:"Loop researches and compares",body:"Checks availability, insurance coverage, credentials, pricing — across every option."},
  {icon:"📅",title:"Books or files on your behalf",body:"Navigates booking systems, fills forms, sends required documents. Done."},
  {icon:"📱",title:"Reminds and follows up",body:"Sends reminders, follows up on disputes, tracks refunds until resolved."},
];
const faqs=[
  {q:"Is my health information safe?",a:"Yes. Your Loop only accesses what you explicitly share. All health data is encrypted end-to-end and never stored beyond the session."},
  {q:"Can it handle insurance pre-authorization?",a:"Yes. Your Loop researches whether a procedure requires pre-auth, submits the request with the right codes, and follows up."},
  {q:"Does it work with all insurance providers?",a:"It works with all major US insurers. For smaller plans, it navigates the provider portal directly."},
  {q:"Can it find mental health providers?",a:"Yes — therapists, psychiatrists, counselors. Filters by specialty, insurance, availability, and telehealth options."},
];
export default function HealthPage() {
  return (<><BackNav current="Health & Wellness"/>
    <div style={{background:"white",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <section style={{background:"linear-gradient(135deg,#0D1B3E,#142248)",padding:"5rem 2rem 4rem",textAlign:"center"}}>
        <div style={{maxWidth:"52rem",margin:"0 auto"}}>
          <div style={{fontSize:"3rem",marginBottom:"1.25rem"}}>🏥</div>
          <div style={{display:"inline-block",fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(124,185,255,0.9)",background:"rgba(0,82,255,0.2)",border:"1px solid rgba(0,82,255,0.4)",borderRadius:"100px",padding:"4px 14px",marginBottom:"1.25rem"}}>Use case · Health & Wellness</div>
          <h1 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(2.25rem,5vw,3.5rem)",color:"white",margin:"0 0 1.25rem",letterSpacing:"-0.04em",lineHeight:1.08}}>Healthcare admin is broken.<br/>Your Loop handles it.</h1>
          <p style={{fontSize:"1.1rem",color:"rgba(255,255,255,0.6)",lineHeight:1.75,maxWidth:"40rem",margin:"0 auto 2.5rem"}}>Booking appointments, disputing medical bills, comparing insurance, finding therapists — the administrative burden of healthcare ends here.</p>
          <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
            <Link href="/#claim" style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none"}}>Claim my free Loop →</Link>
            <Link href="/how-it-works" style={{fontSize:".9rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",display:"flex",alignItems:"center"}}>How it works →</Link>
          </div>
        </div>
      </section>
      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}>
        <div style={{maxWidth:"76rem",margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:"3rem"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(1.75rem,3vw,2.5rem)",color:"#0A0F1E",margin:"0 0 .875rem",letterSpacing:"-0.03em"}}>Real outcomes. Right now.</h2><p style={{fontSize:".95rem",color:"#6B7280"}}>These happened. Your Loop does the same.</p></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.25rem"}}>
            {outcomes.map((o,i)=>(<div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"14px",padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:".875rem"}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,color:"#6B7280"}}>{o.tag}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#00C853"}}>{o.result}</span></div><p style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".95rem",color:"#0A0F1E",margin:"0 0 .5rem"}}>{o.headline}</p><p style={{fontSize:".82rem",color:"#6B7280",lineHeight:1.65,margin:0}}>{o.body}</p></div>))}
          </div>
        </div>
      </section>
      <section style={{background:"white",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}>
        <div style={{maxWidth:"60rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2rem",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>How your Loop handles it</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1px",background:"#E5E9F2",borderRadius:"14px",overflow:"hidden",border:"1px solid #E5E9F2"}}>
            {steps.map((s,i)=>(<div key={i} style={{background:"white",padding:"1.75rem 1.25rem"}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".65rem",color:"#9CA3AF",marginBottom:".75rem"}}>0{i+1}</div><div style={{fontSize:"1.5rem",marginBottom:".75rem"}}>{s.icon}</div><h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".9rem",color:"#0A0F1E",margin:"0 0 .5rem"}}>{s.title}</h3><p style={{fontSize:".78rem",color:"#6B7280",lineHeight:1.6,margin:0}}>{s.body}</p></div>))}
          </div>
        </div>
      </section>
      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}><div style={{maxWidth:"52rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2rem",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>Common questions</h2>{faqs.map((f,i)=>(<div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"12px",padding:"1.5rem",marginBottom:"10px"}}><h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",color:"#0A0F1E",margin:"0 0 .625rem"}}>{f.q}</h3><p style={{fontSize:".875rem",color:"#6B7280",lineHeight:1.7,margin:0}}>{f.a}</p></div>))}</div></section>
      <section style={{background:"#0D1B3E",padding:"5rem 2rem",textAlign:"center"}}><div style={{maxWidth:"32rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2.25rem",color:"white",margin:"0 0 1rem",letterSpacing:"-0.03em"}}>Healthcare on autopilot.</h2><p style={{fontSize:".95rem",color:"rgba(255,255,255,0.5)",margin:"0 0 2rem"}}>Free to start. No credit card. 60 seconds.</p><Link href="/#claim" style={{display:"inline-block",fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none"}}>Claim my free Loop →</Link></div></section>
    </div></>);
}
