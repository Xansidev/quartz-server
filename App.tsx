import { useState, useEffect } from "react";

const SERVER = "https://your-quartz-server.vercel.app";

type PackageDetail = {
  package: {
    name: string;
    version: string;
    description: string;
    github: string;
    maintainer: string;
    deps: string[];
  };
  source: {
    url: string;
    sha256: string;
  };
  install: {
    bin: string[];
  };
  remove: {
    bin: string[];
  };
  log: {
    install_log: string;
    remove_log: string;
  };
};

function QZMAKEView({ pkg }: { pkg: PackageDetail }) {
  return (
    <div style={{
      background: "#0d0d0d",
      border: "1px solid #2a2a2a",
      borderRadius: 8,
      padding: "1.5rem",
      fontFamily: "monospace",
      fontSize: 13,
      lineHeight: 1.8,
      color: "#cdd6f4"
    }}>
      <Section title="package">
        <Field k="name" v={pkg.package.name} />
        <Field k="version" v={pkg.package.version} />
        <Field k="description" v={pkg.package.description} />
        <Field k="github" v={pkg.package.github} link />
        <Field k="maintainer" v={pkg.package.maintainer} />
        <Field k="deps" v={pkg.package.deps.length ? `[${pkg.package.deps.join(", ")}]` : "[]"} />
      </Section>
      <Section title="source">
        <Field k="url" v={pkg.source.url} />
        <Field k="sha256" v={pkg.source.sha256} />
      </Section>
      <Section title="install">
        {pkg.install.bin.map((b, i) => <Field key={i} k="bin" v={`["${b}"]`} />)}
      </Section>
      <Section title="remove">
        {pkg.remove.bin.map((b, i) => <Field key={i} k="bin" v={`["${b}"]`} />)}
      </Section>
      <Section title="log">
        <Field k="install_log" v={pkg.log.install_log} />
        <Field k="remove_log" v={pkg.log.remove_log} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <span style={{ color: "#cba6f7" }}>[{title}]</span>
      <div style={{ paddingLeft: "1rem" }}>{children}</div>
    </div>
  );
}

function Field({ k, v, link }: { k: string; v: string; link?: boolean }) {
  return (
    <div>
      <span style={{ color: "#89b4fa" }}>{k}</span>
      <span style={{ color: "#6c7086" }}> = </span>
      {link
        ? <a href={v} target="_blank" rel="noreferrer" style={{ color: "#a6e3a1" }}>"{v}"</a>
        : <span style={{ color: "#a6e3a1" }}>"{v}"</span>
      }
    </div>
  );
}

export default function App() {
  const [packages, setPackages] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${SERVER}/packages`)
      .then(r => r.json())
      .then(d => setPackages(d.packages))
      .catch(() => setError("Could not reach Quartz server"));
  }, []);

  async function selectPackage(name: string) {
    setSelected(name);
    setDetail(null);
    setLoading(true);
    try {
      const res = await fetch(`${SERVER}/packages/${name}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      setError("Failed to load package");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1e1e2e",
      color: "#cdd6f4",
      fontFamily: "monospace",
      display: "flex",
      flexDirection: "column"
    }}>
      <header style={{
        padding: "1.5rem 2rem",
        borderBottom: "1px solid #2a2a2a",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem"
      }}>
        <span style={{ color: "#cba6f7", fontSize: 22, fontWeight: "bold" }}>◆ Quartz</span>
        <span style={{ color: "#6c7086", fontSize: 14 }}>package registry</span>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: 220,
          borderRight: "1px solid #2a2a2a",
          padding: "1rem 0"
        }}>
          <div style={{ padding: "0 1rem 0.5rem", color: "#6c7086", fontSize: 11, letterSpacing: 1 }}>
            PACKAGES
          </div>
          {error && <div style={{ padding: "0 1rem", color: "#f38ba8", fontSize: 12 }}>{error}</div>}
          {packages.map(name => (
            <div
              key={name}
              onClick={() => selectPackage(name)}
              style={{
                padding: "0.5rem 1rem",
                cursor: "pointer",
                background: selected === name ? "#2a2a3e" : "transparent",
                color: selected === name ? "#cba6f7" : "#cdd6f4",
                borderLeft: selected === name ? "2px solid #cba6f7" : "2px solid transparent",
                fontSize: 14
              }}
            >
              {name}
            </div>
          ))}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: "1.5rem 2rem" }}>
          {!selected && (
            <div style={{ color: "#6c7086", fontSize: 14, marginTop: "2rem" }}>
              ← select a package to view its QZMAKE
            </div>
          )}
          {loading && (
            <div style={{ color: "#6c7086", fontSize: 14 }}>loading...</div>
          )}
          {detail && !loading && (
            <div>
              <div style={{ marginBottom: "1rem" }}>
                <span style={{ fontSize: 20, fontWeight: "bold", color: "#cba6f7" }}>
                  {detail.package.name}
                </span>
                <span style={{ marginLeft: "0.75rem", color: "#6c7086", fontSize: 13 }}>
                  v{detail.package.version}
                </span>
              </div>
              <div style={{ color: "#a6adc8", fontSize: 13, marginBottom: "1.5rem" }}>
                {detail.package.description}
              </div>
              <div style={{ color: "#6c7086", fontSize: 11, letterSpacing: 1, marginBottom: "0.5rem" }}>
                QZMAKE
              </div>
              <QZMAKEView pkg={detail} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
