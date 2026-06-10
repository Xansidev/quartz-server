import { useState, useEffect, useRef } from "react";

const SERVER = "";  // same origin

// ── Palette ──────────────────────────────────────────────
const C = {
  bg:       "#0a0a0f",
  surface:  "#13131a",
  border:   "#1e1e2a",
  text:     "#e8e8f0",
  muted:    "#5a5a72",
  purple:   "#a78bfa",
  blue:     "#4FC3F7",
  white:    "#ffffff",
};

// ── Types ─────────────────────────────────────────────────
type Commit = { sha: string; message: string; author: string; avatar: string; url: string; date: string };
type Repo   = { name: string; commits: Commit[] };
type Contributor = { login: string; avatar: string; contributions: number; url: string };
type PackageDetail = { package: any; source: any; install: any; remove: any; log: any };

// ── Fetch helpers ─────────────────────────────────────────
const GH = "https://api.github.com";
const OWNER = "Xansidev";
const REPOS = ["qlpm", "quartz-server", "quartz-packages"];

async function ghFetch(path: string) {
  const r = await fetch(`${GH}${path}`, {
    headers: { Accept: "application/vnd.github.v3+json" }
  });
  if (!r.ok) throw new Error(`GitHub ${r.status}`);
  return r.json();
}

// ── Global styles ─────────────────────────────────────────
const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'Inter', sans-serif; }
  ::-webkit-scrollbar { width: 4px; } 
  ::-webkit-scrollbar-track { background: ${C.bg}; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
  a { color: inherit; text-decoration: none; }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(-12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes shimmer {
    0%   { background-position: -400px 0; }
    100% { background-position: 400px 0; }
  }
  .fade-in  { animation: fadeIn  0.35s ease both; }
  .slide-in { animation: slideIn 0.25s ease both; }

  .pkg-row {
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
    font-size: 13px;
    font-family: 'JetBrains Mono', monospace;
    color: ${C.muted};
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .pkg-row:hover { background: #1a1a24; color: ${C.text}; }
  .pkg-row.active { background: #1e1a2e; color: ${C.purple}; }

  .tab-btn {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid ${C.border};
    background: transparent;
    color: ${C.muted};
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
  }
  .tab-btn:hover { border-color: ${C.purple}; color: ${C.text}; }
  .tab-btn.active { background: ${C.purple}20; border-color: ${C.purple}; color: ${C.purple}; }

  .code-block {
    background: #0d0d14;
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 20px 24px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    line-height: 1.9;
    overflow-x: auto;
  }

  .doc-section { animation: fadeIn 0.3s ease both; }
  .doc-section h2 { font-size: 20px; font-weight: 600; color: ${C.white}; margin-bottom: 8px; }
  .doc-section h3 { font-size: 14px; font-weight: 500; color: ${C.purple}; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.08em; }
  .doc-section p  { font-size: 14px; color: ${C.muted}; line-height: 1.7; margin-bottom: 12px; }
  .doc-section code { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: #1a1a24; padding: 2px 6px; border-radius: 4px; color: ${C.blue}; }

  .contrib-card {
    display: flex; align-items: center; gap: 12px;
    padding: 14px 16px;
    border: 1px solid ${C.border};
    border-radius: 8px;
    background: ${C.surface};
    transition: border-color 0.2s, transform 0.2s;
    cursor: pointer;
  }
  .contrib-card:hover { border-color: ${C.purple}40; transform: translateY(-1px); }

  .commit-row {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 0;
    border-bottom: 1px solid ${C.border};
    animation: fadeIn 0.3s ease both;
  }
  .commit-row:last-child { border-bottom: none; }

  .sidebar-overlay {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: 280px;
    background: #0e0e16;
    border-right: 1px solid ${C.border};
    z-index: 100;
    padding: 24px 16px;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4,0,0.2,1);
    overflow-y: auto;
  }
  .sidebar-trigger:hover ~ .sidebar-overlay,
  .sidebar-overlay:hover { transform: translateX(0); }

  .skeleton {
    background: linear-gradient(90deg, ${C.surface} 25%, #1a1a24 50%, ${C.surface} 75%);
    background-size: 400px 100%;
    animation: shimmer 1.2s infinite;
    border-radius: 4px;
    height: 14px;
  }
`;

// ── Skeleton loader ───────────────────────────────────────
function Skeleton({ w = "100%", h = 14 }: { w?: string; h?: number }) {
  return <div className="skeleton" style={{ width: w, height: h, marginBottom: 8 }} />;
}

// ── QZMAKE renderer ───────────────────────────────────────
function QZSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <span style={{ color: C.purple }}>[{title}]</span>
      <div style={{ paddingLeft: 16 }}>{children}</div>
    </div>
  );
}
function QZField({ k, v, link }: { k: string; v: string; link?: boolean }) {
  return (
    <div>
      <span style={{ color: C.blue }}>{k}</span>
      <span style={{ color: C.muted }}> = </span>
      {link
        ? <a href={v} target="_blank" rel="noreferrer" style={{ color: "#6ee7b7" }}>"{v}"</a>
        : <span style={{ color: "#6ee7b7" }}>"{v}"</span>}
    </div>
  );
}
function QZMAKEView({ pkg }: { pkg: PackageDetail }) {
  return (
    <div className="code-block fade-in">
      <QZSection title="package">
        <QZField k="name"        v={pkg.package?.name        ?? ""} />
        <QZField k="version"     v={pkg.package?.version     ?? ""} />
        <QZField k="description" v={pkg.package?.description ?? ""} />
        <QZField k="github"      v={pkg.package?.github      ?? ""} link />
        <QZField k="maintainer"  v={pkg.package?.maintainer  ?? ""} />
        <QZField k="deps"        v={JSON.stringify(pkg.package?.deps ?? [])} />
      </QZSection>
      <QZSection title="source">
        <QZField k="url"    v={pkg.source?.url    ?? ""} />
        <QZField k="sha256" v={pkg.source?.sha256 ?? ""} />
      </QZSection>
      <QZSection title="install">
        {(pkg.install?.bin ?? []).map((b: string, i: number) =>
          <QZField key={i} k="bin" v={`["${b}"]`} />)}
      </QZSection>
      <QZSection title="remove">
        {(pkg.remove?.bin ?? []).map((b: string, i: number) =>
          <QZField key={i} k="bin" v={`["${b}"]`} />)}
      </QZSection>
      <QZSection title="log">
        <QZField k="install_log" v={pkg.log?.install_log ?? ""} />
        <QZField k="remove_log"  v={pkg.log?.remove_log  ?? ""} />
      </QZSection>
    </div>
  );
}

// ── Sidebar overlay ───────────────────────────────────────
function Sidebar({ repos }: { repos: Repo[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div
        onMouseEnter={() => setOpen(true)}
        style={{
          position: "fixed", left: 0, top: 56, bottom: 0, width: 12,
          zIndex: 99, cursor: "pointer"
        }}
      />
      <div
        onMouseLeave={() => setOpen(false)}
        style={{
          position: "fixed", left: 0, top: 56, bottom: 0,
          width: 280,
          background: "#0e0e16",
          borderRight: `1px solid ${C.border}`,
          zIndex: 100,
          padding: "20px 16px",
          transform: open ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          overflowY: "auto"
        }}
        onMouseEnter={() => setOpen(true)}
      >
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.muted, marginBottom: 16, textTransform: "uppercase" }}>
          Repositories
        </div>
        {repos.map(repo => (
          <div key={repo.name} style={{ marginBottom: 20 }}>
            <a
              href={`https://github.com/${OWNER}/${repo.name}`}
              target="_blank" rel="noreferrer"
              style={{ fontSize: 13, fontWeight: 600, color: C.purple, display: "block", marginBottom: 8 }}
            >
              {OWNER}/{repo.name}
            </a>
            {repo.commits.slice(0, 2).map(c => (
              <div key={c.sha} className="commit-row" style={{ paddingLeft: 0 }}>
                <img src={c.avatar} alt={c.author} style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0 }} />
                <div>
                  <a href={c.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: 12, color: C.text, display: "block", lineHeight: 1.4 }}>
                    {c.message.length > 52 ? c.message.slice(0, 52) + "…" : c.message}
                  </a>
                  <span style={{ fontSize: 11, color: C.muted }}>{c.author}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

// ── Pages ─────────────────────────────────────────────────
function HomePage({ pkgCount }: { pkgCount: number }) {
  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <div style={{ marginBottom: 40 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", color: C.purple, textTransform: "uppercase", marginBottom: 12 }}>
          Package Registry
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: C.white, lineHeight: 1.2, marginBottom: 16 }}>
          Quartz Linux
        </h1>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
          A dev-oriented package manager for Linux. Fast, source-first, and human-readable.
          Every package is defined by a <code style={{ fontFamily: "JetBrains Mono", fontSize: 13, background: "#1a1a24", padding: "2px 6px", borderRadius: 4, color: C.blue }}>QZMAKE</code> file — a simple TOML manifest that tells Quartz exactly where everything goes.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 40 }}>
        {[
          { label: "Packages", value: pkgCount.toString() },
          { label: "Repos",    value: REPOS.length.toString() },
          { label: "Format",   value: "TOML" },
        ].map(({ label, value }) => (
          <div key={label} style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "16px 20px"
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: C.white, fontFamily: "JetBrains Mono" }}>{value}</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "16px 20px" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>Quick start</div>
        <div className="code-block" style={{ fontSize: 12 }}>
          <div><span style={{ color: C.muted }}># install a package</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-i</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}># remove a package</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-r</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}># search packages</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-s</span> <span style={{ color: "#6ee7b7" }}>neovim</span></div>
        </div>
      </div>
    </div>
  );
}

function PackagesPage() {
  const [list, setList]       = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail]   = useState<PackageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch(`${SERVER}/packages`)
      .then(r => r.json())
      .then(d => { setList(d.packages); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function select(name: string) {
    setSelected(name);
    setDetail(null);
    setDetailLoading(true);
    const r = await fetch(`${SERVER}/packages/${name}`);
    const d = await r.json();
    setDetail(d);
    setDetailLoading(false);
  }

  return (
    <div style={{ display: "flex", gap: 24, height: "calc(100vh - 100px)" }}>
      <div style={{
        width: 200, flexShrink: 0,
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: 8, overflowY: "auto"
      }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", padding: "8px 8px 12px" }}>
          {loading ? "Loading…" : `${list.length} packages`}
        </div>
        {loading
          ? [1,2,3].map(i => <Skeleton key={i} w="80%" />)
          : list.map((name, i) => (
            <div
              key={name}
              className={`pkg-row${selected === name ? " active" : ""} slide-in`}
              style={{ animationDelay: `${i * 0.04}s` }}
              onClick={() => select(name)}
            >
              <span style={{ color: selected === name ? C.purple : C.blue, fontSize: 10 }}>◆</span>
              {name}
            </div>
          ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {!selected && (
          <div style={{ color: C.muted, fontSize: 13, marginTop: 40, textAlign: "center" }}>
            ← select a package
          </div>
        )}
        {detailLoading && (
          <div style={{ padding: 8 }}>
            <Skeleton w="40%" h={20} />
            <Skeleton w="60%" />
            <Skeleton w="100%" h={200} />
          </div>
        )}
        {detail && !detailLoading && (
          <div className="fade-in">
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontSize: 22, fontWeight: 700, color: C.white }}>{detail.package?.name}</span>
              <span style={{ marginLeft: 10, fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono" }}>
                v{detail.package?.version}
              </span>
            </div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{detail.package?.description}</p>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>QZMAKE</div>
            <QZMAKEView pkg={detail} />
          </div>
        )}
      </div>
    </div>
  );
}

function DocsPage() {
  const [active, setActive] = useState("installing");
  const docs: Record<string, { title: string; content: React.ReactNode }> = {
    installing: {
      title: "Installing & Removing Packages",
      content: (
        <>
          <h3>Installing a package</h3>
          <p>Use <code>qz -i</code> followed by the package name. Quartz will fetch the QZMAKE file, show you the install plan, and ask for confirmation before doing anything.</p>
          <div className="code-block" style={{ marginBottom: 16, fontSize: 12 }}>
            <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-i</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          </div>
          <h3>Removing a package</h3>
          <p>Use <code>qz -r</code> to remove. Quartz reads the <code>[remove]</code> section of the QZMAKE and deletes only the files it placed. Nothing arbitrary is touched.</p>
          <div className="code-block" style={{ fontSize: 12 }}>
            <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-r</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          </div>
        </>
      )
    },
    updating: {
      title: "Updating Packages",
      content: (
        <>
          <h3>Update a single package</h3>
          <p>Quartz checks the registry for a newer version and reinstalls if one exists.</p>
          <div className="code-block" style={{ marginBottom: 16, fontSize: 12 }}>
            <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-u</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          </div>
          <h3>Update everything</h3>
          <p>Running without a package name updates all installed packages.</p>
          <div className="code-block" style={{ fontSize: 12 }}>
            <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-u</span></div>
          </div>
        </>
      )
    },
    contributing: {
      title: "Contributing",
      content: (
        <>
          <h3>Adding a package</h3>
          <p>Fork <code>Xansidev/quartz-packages</code>, create a folder with your package name, and add a <code>QZMAKE</code> file following the format below. Open a pull request and a maintainer will review it.</p>
          <h3>QZMAKE format</h3>
          <p>Every QZMAKE file is a TOML file with five required sections: <code>[package]</code>, <code>[source]</code>, <code>[install]</code>, <code>[remove]</code>, and <code>[log]</code>. See any existing package for reference.</p>
          <h3>Reporting issues</h3>
          <p>Open an issue on <code>Xansidev/qlpm</code> for client bugs, or <code>Xansidev/quartz-server</code> for registry issues.</p>
        </>
      )
    }
  };

  return (
    <div style={{ display: "flex", gap: 32 }}>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>
          Topics
        </div>
        {Object.entries(docs).map(([key, { title }]) => (
          <div
            key={key}
            onClick={() => setActive(key)}
            style={{
              padding: "8px 12px",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 13,
              color: active === key ? C.purple : C.muted,
              background: active === key ? "#1e1a2e" : "transparent",
              borderLeft: `2px solid ${active === key ? C.purple : "transparent"}`,
              transition: "all 0.15s",
              marginBottom: 2
            }}
          >
            {title}
          </div>
        ))}
      </div>
      <div className="doc-section fade-in" key={active} style={{ flex: 1, maxWidth: 600 }}>
        <h2>{docs[active].title}</h2>
        <div style={{ width: 32, height: 2, background: C.purple, borderRadius: 1, margin: "12px 0 20px" }} />
        {docs[active].content}
      </div>
    </div>
  );
}

function ContribPage() {
  const [contribs, setContribs] = useState<Contributor[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    ghFetch(`/repos/${OWNER}/qlpm/contributors`)
      .then(d => { setContribs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in" style={{ maxWidth: 640 }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", color: C.purple, textTransform: "uppercase", marginBottom: 8 }}>
        qlpm
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 20 }}>Contributors</h2>
      {loading
        ? [1,2,3].map(i => <Skeleton key={i} h={60} />)
        : contribs.length === 0
          ? <p style={{ color: C.muted, fontSize: 13 }}>No contributors found.</p>
          : contribs.map((c, i) => (
            <a key={c.login} href={c.url} target="_blank" rel="noreferrer"
              className="contrib-card fade-in"
              style={{ marginBottom: 10, display: "flex", animationDelay: `${i * 0.06}s` }}>
              <img src={c.avatar} alt={c.login} style={{ width: 40, height: 40, borderRadius: "50%" }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{c.login}</div>
                <div style={{ fontSize: 12, color: C.muted }}>{c.contributions} commits</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 11, color: C.purple, alignSelf: "center" }}>
                #{i + 1}
              </div>
            </a>
          ))
      }
    </div>
  );
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [page, setPage]   = useState<"home"|"packages"|"docs"|"contrib">("home");
  const [repos, setRepos] = useState<Repo[]>([]);
  const [pkgCount, setPkgCount] = useState(0);

  useEffect(() => {
    // fetch latest commit per repo for sidebar
    Promise.all(REPOS.map(async name => {
      try {
        const commits = await ghFetch(`/repos/${OWNER}/${name}/commits?per_page=3`);
        return {
          name,
          commits: commits.map((c: any) => ({
            sha:     c.sha,
            message: c.commit.message.split("\n")[0],
            author:  c.commit.author.name,
            avatar:  c.author?.avatar_url ?? "",
            url:     c.html_url,
            date:    c.commit.author.date
          }))
        };
      } catch { return { name, commits: [] }; }
    })).then(setRepos);

    fetch(`${SERVER}/packages`)
      .then(r => r.json())
      .then(d => setPkgCount(d.packages?.length ?? 0))
      .catch(() => {});
  }, []);

  const navItems: { key: typeof page; label: string }[] = [
    { key: "home",     label: "Home" },
    { key: "packages", label: "Packages" },
    { key: "docs",     label: "Docs" },
    { key: "contrib",  label: "Contributors" },
  ];

  return (
    <>
      <style>{globalCSS}</style>
      <Sidebar repos={repos} />

      {/* Top bar */}
      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 56,
        background: `${C.bg}ee`,
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center",
        padding: "0 24px", gap: 32, zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src="/quartzlinux.svg"
            alt="Quartz Linux"
            style={{ width: 24, height: 24 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <span style={{ fontWeight: 700, fontSize: 15, color: C.white, letterSpacing: "-0.02em" }}>
            Quartz Linux
          </span>
        </div>

        <nav style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {navItems.map(({ key, label }) => (
            <button key={key} className={`tab-btn${page === key ? " active" : ""}`} onClick={() => setPage(key)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Main content */}
      <main style={{ paddingTop: 80, paddingLeft: 40, paddingRight: 40, paddingBottom: 40, maxWidth: 1100, margin: "0 auto" }}>
        {page === "home"     && <HomePage pkgCount={pkgCount} />}
        {page === "packages" && <PackagesPage />}
        {page === "docs"     && <DocsPage />}
        {page === "contrib"  && <ContribPage />}
      </main>
    </>
  );
}
