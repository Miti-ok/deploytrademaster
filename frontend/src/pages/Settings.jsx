export default function Settings() {
  return (
    <div className="space-y-10">
      <section className="glass-panel p-6">
        <p className="label">Settings</p>
        <h2 className="section-title">Workspace Preferences</h2>
        <p className="mt-3 text-sm text-[color:var(--text-muted)]">
          Customize currencies, regions, units, and alerting thresholds for your team.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="glass-panel p-6 space-y-4">
          <h3 className="section-title">Defaults</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="label">Primary Currency</label>
              <select className="input mt-2">
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </div>
            <div>
              <label className="label">Measurement Unit</label>
              <select className="input mt-2">
                <option>Metric</option>
                <option>Imperial</option>
              </select>
            </div>
            <div>
              <label className="label">Default Region</label>
              <select className="input mt-2">
                <option>North America</option>
                <option>Europe</option>
                <option>APAC</option>
              </select>
            </div>
            <div>
              <label className="label">Reporting Cadence</label>
              <select className="input mt-2">
                <option>Weekly</option>
                <option>Bi-weekly</option>
                <option>Monthly</option>
              </select>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <h3 className="section-title">Alerts</h3>
          <div className="space-y-4">
            <div>
              <label className="label">Duty Spike Threshold</label>
              <input className="input mt-2" type="text" defaultValue="> 5% change" />
            </div>
            <div>
              <label className="label">Origin Risk Flags</label>
              <input className="input mt-2" type="text" defaultValue="High / Medium / Low" />
            </div>
            <div>
              <label className="label">Notify Channels</label>
              <input className="input mt-2" type="text" defaultValue="Email, Slack" />
            </div>
          </div>
        </div>
      </section>

      <section className="glass-panel p-6">
        <h3 className="section-title">Security</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="insight-card">
            <h4>Access control</h4>
            <p>Manage roles and permissions for your workspace.</p>
          </div>
          <div className="insight-card">
            <h4>Audit trail</h4>
            <p>Track changes to tariffs, materials, and workflows.</p>
          </div>
          <div className="insight-card">
            <h4>Data retention</h4>
            <p>Define how long reports and datasets are stored.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
