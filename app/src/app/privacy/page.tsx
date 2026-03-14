"use client";
import Link from "next/link";
export default function PrivacyPage() {
  const s={padding:"2rem 1.5rem",maxWidth:"56rem",margin:"0 auto",fontFamily:"'Sora',system-ui,sans-serif"};
  const h2s={fontSize:"1.15rem",fontWeight:700 as const,margin:"1.5rem 0 0.5rem",color:"#0F172A"};
  const ps={lineHeight:1.7,color:"#374151",marginBottom:"0.75rem"};
  const date="March 2026";
  return (
    <main style={s}>
      <div style={{marginBottom:"1.5rem"}}><Link href="/" style={{color:"#0052FF",textDecoration:"none",fontSize:"0.875rem"}}>← Back to home</Link></div>
      <h1 style={{fontSize:"1.75rem",fontWeight:800,marginBottom:"0.25rem"}}>Privacy Policy</h1>
      <p style={{color:"#94A3B8",fontSize:"0.8rem",marginBottom:"1.5rem"}}>Effective {date}. OpenLoop LLC.</p>
      <div style={{background:"#EFF6FF",border:"1px solid #BFDBFE",borderRadius:"10px",padding:"1rem 1.25rem",marginBottom:"1.5rem",fontSize:"0.875rem",color:"#1E40AF"}}>
        <strong>The short version:</strong> You own your data. We use anonymized data to improve our AI. You can export or delete everything anytime. We never sell your personal information.
      </div>
      <h2 style={h2s}>1. Data You Own</h2>
      <p style={ps}>You retain full ownership of all personal data you provide to OpenLoop, including your email address, billing information, preferences, and knowledge base content. OpenLoop does not claim ownership of your content.</p>
      <h2 style={h2s}>2. How We Use Your Data</h2>
      <p style={ps}><strong>To operate the service:</strong> Your data is used to power your Loop, enable negotiations, and personalize your experience.</p>
      <p style={ps}><strong>To improve AI models:</strong> You grant OpenLoop a perpetual license to use <em>anonymized and aggregated</em> interaction data to train and improve our AI models. This data is stripped of all personal identifiers before use. We will never use your personally identifiable information for training without explicit consent.</p>
      <p style={ps}><strong>We never sell your data.</strong> We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
      <h2 style={h2s}>3. Loop Negotiations & Third Parties</h2>
      <p style={ps}>When your Loop negotiates with a Business Loop, the content of that negotiation is shared with the business's Loop in order to complete the negotiation. You explicitly authorize this when you initiate a negotiation. OpenLoop logs all negotiation transcripts for audit and dispute resolution purposes.</p>
      <h2 style={h2s}>4. Your Rights</h2>
      <p style={ps}><strong>Export:</strong> Download all your Loop data (chats, wins, wallet history, memory) at any time from Settings → Export my data.</p>
      <p style={ps}><strong>Delete:</strong> Delete your Loop and all associated data. Wallet balances will be paid out before deletion.</p>
      <p style={ps}><strong>Correct:</strong> Edit or delete any memory your Loop has stored about you from Settings → Loop Memory.</p>
      <p style={ps}><strong>GDPR/CCPA:</strong> If you are in the EU or California, you have additional rights. Contact us at privacy@openloop.app.</p>
      <h2 style={h2s}>5. Data Security</h2>
      <p style={ps}>All data is encrypted in transit (TLS) and at rest. API keys and session tokens are never stored in plaintext. Access to production systems is limited and audited.</p>
      <h2 style={h2s}>6. Cookies</h2>
      <p style={ps}>We use a single session cookie (httpOnly, sameSite: lax) to keep you signed in. No advertising or tracking cookies.</p>
      <h2 style={h2s}>7. Contact</h2>
      <p style={ps}>Questions? Email us at privacy@openloop.app.</p>
      <p style={{fontSize:"0.8rem",color:"#94A3B8",marginTop:"2rem",borderTop:"1px solid #E2E8F0",paddingTop:"1rem"}}>OpenLoop LLC · privacy@openloop.app · Last updated {date}</p>
    </main>
  );
}
