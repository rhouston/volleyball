export default function HomePage() {
  return (
    <main>
      <h1>Volleyball Season Manager</h1>
      <p>Fixtures, duties, standings, and player votes in one place.</p>
      <section
        style={{
          marginTop: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.9rem',
        }}
      >
        <article
          style={{
            background: 'var(--surface-card)',
            border: '1px solid var(--border-soft)',
            borderRadius: '0.9rem',
            boxShadow: 'var(--shadow-soft)',
            padding: '1rem',
          }}
        >
          <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.2rem' }}>Admin Workspace</h2>
          <p style={{ marginBottom: '0.85rem', color: 'var(--text-muted)' }}>
            Run the V1 season setup workflow from one screen: create seasons, add teams, generate fixtures and duties, and publish.
          </p>
          <a className="button-link primary" href="/admin">
            Open Admin Workspace
          </a>
        </article>
      </section>
    </main>
  );
}
