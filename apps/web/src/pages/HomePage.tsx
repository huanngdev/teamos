export function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">Team workspace</p>
          <h1 id="hero-title">Build calmly. Ship together.</h1>
          <p className="hero-description">
            TeamOS brings projects, issues, conversations, and schedules into one focused place for
            your team.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#workspace">
              Open workspace
            </a>
            <a className="button button-secondary" href="#learn-more">
              Learn more
            </a>
          </div>
        </div>

        <div className="hero-card" aria-label="Workspace overview">
          <div className="card-heading">
            <span className="status-dot" aria-hidden="true" />
            <span>Today in your workspace</span>
          </div>
          <div className="card-stat">
            <strong>12</strong>
            <span>active issues</span>
          </div>
          <div className="card-progress" aria-hidden="true">
            <span />
          </div>
          <div className="card-footer">
            <span>Project momentum</span>
            <strong>82%</strong>
          </div>
        </div>
      </section>

      <section className="feature-strip" id="learn-more" aria-label="TeamOS foundations">
        <article>
          <span className="feature-number">01</span>
          <h2>Clear priorities</h2>
          <p>Keep important work visible and moving forward.</p>
        </article>
        <article>
          <span className="feature-number">02</span>
          <h2>Shared context</h2>
          <p>Connect decisions, discussions, and delivery.</p>
        </article>
        <article>
          <span className="feature-number">03</span>
          <h2>Healthy pace</h2>
          <p>Make room for focused work and real collaboration.</p>
        </article>
      </section>

      <span id="workspace" className="anchor-target" aria-hidden="true" />
    </main>
  );
}
