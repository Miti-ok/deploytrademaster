export default function HowToUse() {
  return (
    <div className="space-y-10">
      <section className="glass-panel p-6">
        <p className="label">How to Use</p>
        <h2 className="section-title">Guided Workflow</h2>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Follow the steps below to run a trade intelligence analysis from intake to report.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        {[
          {
            title: '1. Start an analysis',
            body: 'Enter product details or upload packaging to auto-fill materials and usage.'
          },
          {
            title: '2. Validate assumptions',
            body: 'Review proposed HS codes, duty rates, and origin mix before confirming.'
          },
          {
            title: '3. Review dashboard',
            body: 'Scan risk, duty exposure, and routing recommendations in the dashboard.'
          }
        ].map((step) => (
          <div key={step.title} className="insight-card">
            <h4>{step.title}</h4>
            <p>{step.body}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6">
          <h3 className="section-title">Best Practices</h3>
          <div className="list-stack">
            <div>
              <p className="list-title">Use precise material breakdowns</p>
              <p className="list-sub">Include fabric blends, coatings, and weight if available.</p>
            </div>
            <div>
              <p className="list-title">Confirm destination policies</p>
              <p className="list-sub">Tariffs vary by region and can change quarterly.</p>
            </div>
            <div>
              <p className="list-title">Save scenario variants</p>
              <p className="list-sub">Compare alternate sourcing or route options quickly.</p>
            </div>
          </div>
        </div>
        <div className="glass-panel p-6">
          <h3 className="section-title">Need help?</h3>
          <p className="text-sm text-[color:var(--text-muted)]">
            Reach out to TradeMaster support or schedule a guided onboarding session.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="insight-card">
              <h4>Live training</h4>
              <p>Onboard your team with a custom walkthrough.</p>
            </div>
            <div className="insight-card">
              <h4>Knowledge base</h4>
              <p>Browse documentation and FAQs.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
