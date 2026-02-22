export default function About() {
  return (
    <div className="space-y-10">
      <section className="glass-panel p-6">
        <p className="label">About</p>
        <h2 className="section-title">TradeMaster Intelligence</h2>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          TradeMaster helps teams model duties, assess compliance risks, and optimize global supply
          chains with AI-driven insights.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="insight-card">
          <h4>Mission</h4>
          <p>Deliver real-time trade intelligence that keeps global operations resilient.</p>
        </div>
        <div className="insight-card">
          <h4>What we track</h4>
          <p>Tariff updates, origin rules, customs alerts, and routing efficiency.</p>
        </div>
        <div className="insight-card">
          <h4>Built for teams</h4>
          <p>Collaborate on scenarios, share reports, and standardize decisions.</p>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h3 className="section-title">Contact</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="label">Email</p>
            <p className="text-sm text-[color:var(--text-muted)]">hello@trademaster.ai</p>
          </div>
          <div>
            <p className="label">Location</p>
            <p className="text-sm text-[color:var(--text-muted)]">Global · Remote</p>
          </div>
          <div>
            <p className="label">Support</p>
            <p className="text-sm text-[color:var(--text-muted)]">Mon–Fri · 9am–6pm ET</p>
          </div>
        </div>
      </section>
    </div>
  )
}
