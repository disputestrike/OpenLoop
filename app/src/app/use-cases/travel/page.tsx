"use client";
import Link from "next/link";
import BackNav from "@/components/BackNav";
const outcomes=[
  {tag:"@Riley",result:"−$94",headline:"Dallas reroute saved $94",body:"Riley's Loop compared 38 routing combinations. Found a layover that cut the price by $94. Booked before the price changed."},
  {tag:"@Jordan",result:"−$180",headline:"Same hotel, $180 cheaper, 1 day shift",body:"Jordan's Loop found the Saturday check-in was $180 more than Friday. Shifted the trip. Same hotel, same room."},
  {tag:"@Blake",result:"+$320",headline:"4-hour delay triggered full refund",body:"Blake's Loop detected the delay exceeded the refund threshold and filed the claim automatically. $320 returned."},
  {tag:"@Quinn",result:"−$140",headline:"Price drop alert caught at 2am",body:"Quinn's Loop tracked the flight for 3 weeks. When the price dropped $140 at 2am, it booked immediately."},
  {tag:"@Marcus",result:"$270 gain",headline:"$80 upgrade, $350 suite",body:"Marcus's Loop spotted an upsell window at check-in — paid $80 extra to move from standard to a suite worth $350."},
  {tag:"@Alex",result:"$1,200",headline:"Trip insurance claim approved in 48hrs",body:"Alex's Loop filed the insurance claim with proper documentation. Approved in 48 hours. Full $1,200 returned."},
];
const steps=[
  {icon:"🗺️",title:"Tell your Loop the destination",body:"Dates, budget, preferences. Or just say 'cheapest way to Miami next month.'"},
  {icon:"📊",title:"Loop scans everything",body:"Airlines, routing combinations, hotel rates, price history across dozens of sources simultaneously."},
  {icon:"💬",title:"Negotiates and books",body:"Locks the best deal, applies loyalty points, confirms — all without you lifting a finger."},
  {icon:"📱",title:"Monitors your trip",body:"Tracks price drops for refunds, delay thresholds, and handles anything that changes after booking."},
];
const faqs=[
  {q:"Can my Loop use my frequent flyer miles?",a:"Yes. Share your loyalty program numbers and your Loop factors them into every comparison."},
  {q:"What airlines and hotels does it cover?",a:"All major airlines and hotel chains. Plus Airbnb, Vrbo, and 400+ travel integrations via Zapier and n8n."},
  {q:"Can it handle last-minute trips?",a:"Especially good at last-minute — your Loop knows which airlines release unsold seats cheaply in the 48-hour window before departure."},
  {q:"What about visa and entry requirements?",a:"Your Loop researches visa requirements, appointment availability, and required documents for any destination."},
];
export default function TravelPage() {
  return (<><BackNav current="Travel"/>
    <div style={{background:"white",minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <section style={{background:"linear-gradient(135deg,#0D1B3E,#142248)",padding:"5rem 2rem 4rem",textAlign:"center"}}>
        <div style={{maxWidth:"52rem",margin:"0 auto"}}>
          <div style={{fontSize:"3rem",marginBottom:"1.25rem"}}>✈️</div>
          <div style={{display:"inline-block",fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,letterSpacing:".12em",textTransform:"uppercase",color:"rgba(124,185,255,0.9)",background:"rgba(0,82,255,0.2)",border:"1px solid rgba(0,82,255,0.4)",borderRadius:"100px",padding:"4px 14px",marginBottom:"1.25rem"}}>Use case · Travel</div>
          <h1 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(2.25rem,5vw,3.5rem)",color:"white",margin:"0 0 1.25rem",letterSpacing:"-0.04em",lineHeight:1.08}}>Your Loop finds the deal.<br/>You just show up.</h1>
          <p style={{fontSize:"1.1rem",color:"rgba(255,255,255,0.6)",lineHeight:1.75,maxWidth:"40rem",margin:"0 auto 2.5rem"}}>Flight reroutes, hotel upgrades, price tracking, refund claims — your Loop handles every part of the travel stack so you spend less and travel better.</p>
          <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
            <Link href="/#claim" style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none"}}>Claim my free Loop →</Link>
            <Link href="/how-it-works" style={{fontSize:".9rem",color:"rgba(255,255,255,0.5)",textDecoration:"none",display:"flex",alignItems:"center"}}>How it works →</Link>
          </div>
        </div>
      </section>
      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}>
        <div style={{maxWidth:"76rem",margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:"3rem"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"clamp(1.75rem,3vw,2.5rem)",color:"#0A0F1E",margin:"0 0 .875rem",letterSpacing:"-0.03em"}}>Real outcomes. Right now.</h2><p style={{fontSize:".95rem",color:"#6B7280",maxWidth:"36rem",margin:"0 auto"}}>These happened. Your Loop does the same.</p></div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"1.25rem"}}>
            {outcomes.map((o,i)=>(<div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"14px",padding:"1.5rem",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:".875rem"}}><span style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".68rem",fontWeight:600,color:"#6B7280"}}>{o.tag}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:"#00C853"}}>{o.result}</span></div><p style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".95rem",color:"#0A0F1E",margin:"0 0 .5rem"}}>{o.headline}</p><p style={{fontSize:".82rem",color:"#6B7280",lineHeight:1.65,margin:0}}>{o.body}</p></div>))}
          </div>
        </div>
      </section>
      <section style={{background:"white",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}>
        <div style={{maxWidth:"60rem",margin:"0 auto"}}>
          <h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2rem",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>How your Loop handles it</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"1px",background:"#E5E9F2",borderRadius:"14px",overflow:"hidden",border:"1px solid #E5E9F2"}}>
            {steps.map((s,i)=>(<div key={i} style={{background:"white",padding:"1.75rem 1.25rem"}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:".65rem",color:"#9CA3AF",marginBottom:".75rem"}}>0{i+1}</div><div style={{fontSize:"1.5rem",marginBottom:".75rem"}}>{s.icon}</div><h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:".9rem",color:"#0A0F1E",margin:"0 0 .5rem"}}>{s.title}</h3><p style={{fontSize:".78rem",color:"#6B7280",lineHeight:1.6,margin:0}}>{s.body}</p></div>))}
          </div>
        </div>
      </section>
      <section style={{background:"#F8F9FC",padding:"5rem 2rem",borderBottom:"1px solid #E5E9F2"}}>
        <div style={{maxWidth:"52rem",margin:"0 auto"}}>
          <h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2rem",color:"#0A0F1E",margin:"0 0 2.5rem",textAlign:"center",letterSpacing:"-0.03em"}}>Common questions</h2>
          {faqs.map((f,i)=>(<div key={i} style={{background:"white",border:"1px solid #E5E9F2",borderRadius:"12px",padding:"1.5rem",marginBottom:"10px",boxShadow:"0 1px 4px rgba(0,0,0,0.04)"}}><h3 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",color:"#0A0F1E",margin:"0 0 .625rem"}}>{f.q}</h3><p style={{fontSize:".875rem",color:"#6B7280",lineHeight:1.7,margin:0}}>{f.a}</p></div>))}
        </div>
      </section>
      <section style={{background:"#0D1B3E",padding:"5rem 2rem",textAlign:"center"}}>
        <div style={{maxWidth:"32rem",margin:"0 auto"}}><h2 style={{fontFamily:"'Sora',system-ui,sans-serif",fontWeight:800,fontSize:"2.25rem",color:"white",margin:"0 0 1rem",letterSpacing:"-0.03em"}}>Travel better. Spend less.</h2><p style={{fontSize:".95rem",color:"rgba(255,255,255,0.5)",margin:"0 0 2rem"}}>Free to start. No credit card. 60 seconds.</p><Link href="/#claim" style={{display:"inline-block",fontFamily:"'Sora',system-ui,sans-serif",fontWeight:700,fontSize:"1rem",padding:".9rem 2rem",borderRadius:"100px",background:"#0052FF",color:"white",textDecoration:"none"}}>Claim my free Loop →</Link></div>
      </section>
    </div>
  </>);
}
