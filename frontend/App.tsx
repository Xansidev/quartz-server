import { useState, useEffect, useRef } from "react";

const SERVER = "https://quartzlinux.vercel.app";

const C = {
  bg:      "#0a0a0f",
  surface: "#13131a",
  border:  "#1e1e2a",
  text:    "#e8e8f0",
  muted:   "#5a5a72",
  purple:  "#a78bfa",
  blue:    "#4FC3F7",
  white:   "#ffffff",
  orange:  "#FF7A00",
};

type Contributor = { login: string; avatar: string; contributions: number; url: string };
type PackageDetail = { package: any; source: any; install: any; remove: any; log: any };
type CommitInfo = { sha: string; message: string; author: string; avatar: string; url: string; date: string };
type LangData = { name: string; bytes: number; color: string };

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

// GitHub language colours (common ones)
const LANG_COLORS: Record<string, string> = {
  Rust:         "#dea584",
  Python:       "#3572A5",
  TypeScript:   "#3178c6",
  JavaScript:   "#f1e05a",
  Shell:        "#89e051",
  C:            "#555555",
  "C++":        "#f34b7d",
  Go:           "#00ADD8",
  Zig:          "#ec915c",
  Makefile:     "#427819",
  TOML:         "#9c4221",
  Nix:          "#7e7eff",
  HTML:         "#e34c26",
  CSS:          "#563d7c",
  Ruby:         "#701516",
  Kotlin:       "#A97BFF",
  Swift:        "#F05138",
  Haskell:      "#5e5086",
  Lua:          "#000080",
};

function langColor(name: string) {
  return LANG_COLORS[name] ?? "#8b8b9e";
}

const globalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'Inter', sans-serif; cursor: none; }
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
    100% { background-position:  400px 0; }
  }
  @keyframes cursorPulse {
    0%, 100% { opacity: 0.55; transform: translate(-50%,-50%) scale(1); }
    50%       { opacity: 0.7;  transform: translate(-50%,-50%) scale(1.08); }
  }
  .fade-in  { animation: fadeIn  0.35s ease both; }
  .slide-in { animation: slideIn 0.25s ease both; }

  /* Custom cursor */
  #cursor-dot {
    position: fixed;
    width: 8px; height: 8px;
    background: ${C.purple};
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    transform: translate(-50%, -50%);
    transition: transform 0.05s;
    mix-blend-mode: screen;
  }
  #cursor-glow {
    position: fixed;
    width: 260px; height: 260px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(167,139,250,0.18) 0%, rgba(167,139,250,0.07) 40%, transparent 70%);
    filter: blur(18px);
    animation: cursorPulse 3s ease-in-out infinite;
    transition: left 0.12s ease-out, top 0.12s ease-out;
  }

  .pkg-card {
    padding: 14px 18px;
    border-radius: 8px;
    cursor: none;
    transition: background 0.15s, border-color 0.15s, transform 0.15s;
    font-size: 13px;
    font-family: 'JetBrains Mono', monospace;
    color: ${C.muted};
    border: 1px solid ${C.border};
    background: ${C.surface};
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .pkg-card:hover { background: #1a1a24; color: ${C.text}; border-color: ${C.purple}40; transform: translateY(-1px); }
  .pkg-card.active { background: #1e1a2e; color: ${C.purple}; border-color: ${C.purple}60; }

  .tab-btn {
    padding: 6px 16px;
    border-radius: 20px;
    border: 1px solid ${C.border};
    background: transparent;
    color: ${C.muted};
    font-size: 13px;
    cursor: none;
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
    cursor: none;
  }
  .contrib-card:hover { border-color: ${C.purple}40; transform: translateY(-1px); }

  .skeleton {
    background: linear-gradient(90deg, ${C.surface} 25%, #1a1a24 50%, ${C.surface} 75%);
    background-size: 400px 100%;
    animation: shimmer 1.2s infinite;
    border-radius: 4px;
    height: 14px;
  }

  .search-input {
    width: 100%;
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 10px 14px 10px 36px;
    color: ${C.text};
    font-size: 13px;
    font-family: 'Inter', sans-serif;
    outline: none;
    transition: border-color 0.2s;
    cursor: none;
  }
  .search-input:focus { border-color: ${C.purple}60; }
  .search-input::placeholder { color: ${C.muted}; }

  .stat-card {
    background: ${C.surface};
    border: 1px solid ${C.border};
    border-radius: 10px;
    padding: 20px 24px;
    transition: border-color 0.2s, transform 0.2s;
  }
  .stat-card:hover { border-color: ${C.purple}40; transform: translateY(-2px); }

  * { cursor: none !important; }
`;

// ── Custom cursor ─────────────────────────────────────────
function Cursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ax = window.innerWidth / 2, ay = window.innerHeight / 2;
    let gx = ax, gy = ay;
    let raf: number;

    function onMove(e: MouseEvent) {
      ax = e.clientX; ay = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = ax + "px";
        dotRef.current.style.top  = ay + "px";
      }
    }

    function animate() {
      gx += (ax - gx) * 0.1;
      gy += (ay - gy) * 0.1;
      if (glowRef.current) {
        glowRef.current.style.left = gx + "px";
        glowRef.current.style.top  = gy + "px";
      }
      raf = requestAnimationFrame(animate);
    }

    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(animate);
    return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
  }, []);

  return (
    <>
      <div id="cursor-dot"  ref={dotRef}  />
      <div id="cursor-glow" ref={glowRef} />
    </>
  );
}

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
        <QZField k="url"    v={pkg.source?.url    ?? ""} link />
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

// ── Commit badge ──────────────────────────────────────────
function CommitBadge({ commit }: { commit: CommitInfo }) {
  return (
    <a href={commit.url} target="_blank" rel="noreferrer"
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", borderRadius: 8,
        border: `1px solid ${C.border}`, background: C.surface,
        marginBottom: 16, transition: "border-color 0.2s",
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = `${C.purple}50`)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
    >
      {commit.avatar && (
        <img src={commit.avatar} alt={commit.author}
          style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {commit.message}
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
          {commit.author} · {new Date(commit.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </div>
      </div>
      <span style={{ fontSize: 11, color: C.purple, fontFamily: "JetBrains Mono", flexShrink: 0 }}>
        {commit.sha.slice(0, 7)}
      </span>
    </a>
  );
}

// ── Language donut ────────────────────────────────────────
function LangDonut({ langs, logoSrc }: { langs: LangData[]; logoSrc: string }) {
  const SIZE   = 280;
  const STROKE = 28;
  const R      = (SIZE - STROKE) / 2;
  const CIRC   = 2 * Math.PI * R;
  const CX     = SIZE / 2;
  const total  = langs.reduce((s, l) => s + l.bytes, 0);

  // Build arc segments
  let offset = 0;
  const segments = langs.map(l => {
    const frac = l.bytes / total;
    const dash = frac * CIRC;
    const seg  = { ...l, dash, gap: CIRC - dash, offset, frac };
    offset += dash;
    return seg;
  });

  // Label positions (outside the ring)
  const LABEL_R = R + STROKE / 2 + 22;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
          {/* Background ring */}
          <circle cx={CX} cy={CX} r={R}
            fill="none" stroke={C.border} strokeWidth={STROKE} />
          {/* Language arcs */}
          {segments.map((s, i) => (
            <circle key={i} cx={CX} cy={CX} r={R}
              fill="none"
              stroke={langColor(s.name)}
              strokeWidth={STROKE}
              strokeDasharray={`${s.dash - 3} ${s.gap + 3}`}
              strokeDashoffset={-s.offset}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.6s ease", opacity: 0.92 }}
            />
          ))}
        </svg>

        {/* Center logo */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <img src={logoSrc} alt="QLPM"
            style={{ width: 72, height: 72, filter: "drop-shadow(0 0 12px rgba(167,139,250,0.4))" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "10px 28px",
        maxWidth: 340,
        width: "100%",
      }}>
        {segments.map(s => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: langColor(s.name), flexShrink: 0,
            }} />
            <span style={{ fontSize: 13, color: C.text, fontFamily: "JetBrains Mono" }}>{s.name}</span>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>
              {(s.frac * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Package Manager page ──────────────────────────────────
function PackageManagerPage() {
  const [langs, setLangs]     = useState<LangData[]>([]);
  const [loading, setLoading] = useState(true);
  const [repoInfo, setRepoInfo] = useState<{ stars: number; desc: string } | null>(null);

  useEffect(() => {
    Promise.all([
      ghFetch(`/repos/${OWNER}/qlpm/languages`),
      ghFetch(`/repos/${OWNER}/qlpm`),
    ]).then(([langData, repoData]: [Record<string, number>, any]) => {
      const sorted = Object.entries(langData)
        .sort(([, a], [, b]) => b - a)
        .map(([name, bytes]) => ({ name, bytes, color: langColor(name) }));
      setLangs(sorted);
      setRepoInfo({ stars: repoData.stargazers_count, desc: repoData.description ?? "" });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      {/* Hero */}
      <div style={{ position: "relative", marginBottom: 56, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* blurred logo backdrop */}
        <img src="/quartzlinux-colored.svg" alt="" aria-hidden
          style={{
            position: "absolute", width: 220, height: 220,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            filter: "blur(52px)", opacity: 0.3,
            pointerEvents: "none",
          }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", color: C.purple, textTransform: "uppercase", marginBottom: 12 }}>
            Xansidev / qlpm
          </div>
          <h1 style={{
            fontSize: 72, fontWeight: 800, color: C.white,
            letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 16,
          }}>
            QLPM
          </h1>
          <p style={{ fontSize: 15, color: C.muted, maxWidth: 420, lineHeight: 1.7, margin: "0 auto 24px" }}>
            The Quartz Linux Package Manager. Install, remove, search and update packages
            defined by <code style={{ fontFamily: "JetBrains Mono", fontSize: 13, background: "#1a1a24", padding: "2px 6px", borderRadius: 4, color: C.blue }}>QZMAKE</code> files.
          </p>
          {repoInfo && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 13, color: C.muted }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill={C.purple} stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span style={{ color: C.purple, fontWeight: 600 }}>{repoInfo.stars}</span>
              <span>stars on GitHub</span>
            </div>
          )}
        </div>
      </div>

      {/* Donut chart */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 16, padding: "40px 48px",
        marginBottom: 48, width: "100%", maxWidth: 480,
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 28 }}>
          Languages
        </div>
        {loading
          ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <Skeleton w="280px" h={280} />
              <Skeleton w="200px" />
              <Skeleton w="200px" />
            </div>
          )
          : langs.length > 0
            ? <LangDonut langs={langs} logoSrc="/quartzlinux-colored.svg" />
            : <p style={{ color: C.muted, fontSize: 13 }}>Could not load language data.</p>
        }
      </div>

      {/* Usage */}
      <div style={{
        background: C.surface, border: `1px solid ${C.border}`,
        borderRadius: 10, padding: "20px 28px",
        width: "100%", maxWidth: 480, textAlign: "left",
      }}>
        <div style={{ fontSize: 11, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 14 }}>
          Usage
        </div>
        <div className="code-block" style={{ fontSize: 12 }}>
          <div><span style={{ color: C.muted }}># install a package</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-i</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}># remove a package</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-r</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}># search packages</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-s</span> <span style={{ color: "#6ee7b7" }}>neovim</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}># update all</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-u</span></div>
        </div>
        <a
          href={`https://github.com/${OWNER}/qlpm`}
          target="_blank" rel="noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            marginTop: 16, fontSize: 13, color: C.purple,
            borderBottom: `1px solid ${C.purple}40`, paddingBottom: 2,
            transition: "border-color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.purple)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = `${C.purple}40`)}
        >
          View on GitHub →
        </a>
      </div>
    </div>
  );
}

// ── Home page ─────────────────────────────────────────────
function HomePage({ pkgCount }: { pkgCount: number }) {
  const [stars, setStars]             = useState<number | null>(null);
  const [totalContribs, setTotalContribs] = useState<number | null>(null);

  useEffect(() => {
    ghFetch(`/repos/${OWNER}/qlpm`)
      .then((d: any) => setStars(d.stargazers_count ?? 0))
      .catch(() => setStars(0));

    Promise.all(
      REPOS.map(name =>
        ghFetch(`/repos/${OWNER}/${name}/contributors?per_page=100`)
          .then((d: any[]) => d.reduce((s, c) => s + (c.contributions ?? 0), 0))
          .catch(() => 0)
      )
    ).then(counts => setTotalContribs(counts.reduce((a, b) => a + b, 0)));
  }, []);

  const stats = [
    { label: "Packages",      value: pkgCount > 0 ? pkgCount.toString() : "—" },
    { label: "Stars",         value: stars !== null ? stars.toString() : "—" },
    { label: "Contributions", value: totalContribs !== null ? totalContribs.toString() : "—" },
  ];

  return (
    <div className="fade-in" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      {/* Hero */}
      <div style={{ position: "relative", marginBottom: 48, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img src="/quartzlinux-colored.svg" alt="" aria-hidden
          style={{
            position: "absolute", width: 260, height: 260,
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            filter: "blur(48px)", opacity: 0.35,
            pointerEvents: "none", userSelect: "none",
          }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div style={{ position: "relative", zIndex: 1 }}>
          <h1 style={{
            fontSize: 64, fontWeight: 800, color: C.white,
            letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 20,
          }}>
            Quartz Linux
          </h1>
          <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.7, maxWidth: 480, margin: "0 auto" }}>
            A dev-oriented package manager for Linux. Fast, and human-readable.
            Every package is defined by a{" "}
            <code style={{ fontFamily: "JetBrains Mono", fontSize: 13, background: "#1a1a24", padding: "2px 6px", borderRadius: 4, color: C.orange }}>TOML</code>
            {" "}file that tells Quartz how packages work declaratively.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, width: "100%", maxWidth: 560, marginBottom: 48 }}>
        {stats.map(({ label, value }) => (
          <div key={label} className="stat-card">
            <div style={{ fontSize: 32, fontWeight: 700, color: C.white, fontFamily: "JetBrains Mono", marginBottom: 6 }}>{value}</div>
            <div style={{ fontSize: 12, color: C.muted, letterSpacing: "0.04em" }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Packages page ─────────────────────────────────────────
function PackagesPage() {
  const [list, setList]         = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail]     = useState<PackageDetail | null>(null);
  const [commit, setCommit]     = useState<CommitInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetch(`${SERVER}/packages`)
      .then(r => r.json())
      .then(d => { setList(d.packages ?? []); setFiltered(d.packages ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    setFiltered(q ? list.filter(n => n.toLowerCase().includes(q)) : list);
  }, [query, list]);

  async function selectPkg(name: string) {
    setSelected(name);
    setDetail(null);
    setCommit(null);
    setDetailLoading(true);
    const [pkgRes, commitsData] = await Promise.all([
      fetch(`${SERVER}/packages/${name}`).then(r => r.json()).catch(() => null),
      ghFetch(`/repos/${OWNER}/quartz-packages/commits?path=${encodeURIComponent(name + "/QZMAKE")}&per_page=1`).catch(() => []),
    ]);
    setDetail(pkgRes);
    if (Array.isArray(commitsData) && commitsData.length > 0) {
      const c = commitsData[0];
      setCommit({
        sha: c.sha, message: c.commit.message.split("\n")[0],
        author: c.commit.author.name, avatar: c.author?.avatar_url ?? "",
        url: c.html_url, date: c.commit.author.date,
      });
    }
    setDetailLoading(false);
  }

  return (
    <div className="fade-in" style={{ display: "flex", gap: 28, height: "calc(100vh - 120px)", maxWidth: 960, margin: "0 auto", width: "100%" }}>
      <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", opacity: 0.4, pointerEvents: "none" }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="search-input" type="text" placeholder="Search packages…"
            value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {loading
            ? [1, 2, 3, 4].map(i => <Skeleton key={i} h={44} />)
            : filtered.length === 0
              ? <div style={{ color: C.muted, fontSize: 13, padding: "12px 4px" }}>No packages found.</div>
              : filtered.map((name, i) => (
                <div key={name}
                  className={`pkg-card${selected === name ? " active" : ""} slide-in`}
                  style={{ animationDelay: `${Math.min(i, 20) * 0.03}s` }}
                  onClick={() => selectPkg(name)}>
                  <span style={{ color: selected === name ? C.purple : C.blue, fontSize: 10, flexShrink: 0 }}>◆</span>
                  {name}
                </div>
              ))
          }
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {!selected && !loading && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: C.muted }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity={0.4}>
              <rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 9h6M9 12h6M9 15h4"/>
            </svg>
            <span style={{ fontSize: 13 }}>Select a package to view its details</span>
          </div>
        )}
        {detailLoading && (
          <div style={{ padding: 4 }}>
            <Skeleton w="40%" h={24} />
            <Skeleton w="60%" />
            <Skeleton w="100%" h={180} />
          </div>
        )}
        {detail && !detailLoading && (
          <div className="fade-in">
            <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: C.white }}>{detail.package?.name}</span>
              <span style={{ fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono" }}>v{detail.package?.version}</span>
            </div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>{detail.package?.description}</p>
            {commit && (
              <>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>Latest Commit</div>
                <CommitBadge commit={commit} />
              </>
            )}
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 8 }}>QZMAKE</div>
            <QZMAKEView pkg={detail} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Docs page ─────────────────────────────────────────────
function DocsPage() {
  const [active, setActive] = useState("installing");
  const docs: Record<string, { title: string; content: React.ReactNode }> = {
    installing: {
      title: "Installing & Removing Packages",
      content: (
        <>
          <h3>Installing a package</h3>
          <p>Use <code>qz -i</code> followed by the package name. Quartz will fetch the QZMAKE file, show you the install plan, and ask for confirmation.</p>
          <div className="code-block" style={{ marginBottom: 16, fontSize: 12 }}>
            <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-i</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          </div>
          <h3>Removing a package</h3>
          <p>Use <code>qz -r</code> to remove. Quartz reads the <code>[remove]</code> section of the QZMAKE and deletes only the files it placed.</p>
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
          <p>Fork <code>Xansidev/quartz-packages</code>, create a folder with your package name, and add a <code>QZMAKE</code> file. Open a pull request and a maintainer will review it.</p>
          <h3>QZMAKE format</h3>
          <p>Every QZMAKE file is a TOML file with five required sections: <code>[package]</code>, <code>[source]</code>, <code>[install]</code>, <code>[remove]</code>, and <code>[log]</code>.</p>
          <h3>Reporting issues</h3>
          <p>Open an issue on <code>Xansidev/qlpm</code> for client bugs, or <code>Xansidev/quartz-server</code> for registry issues.</p>
        </>
      )
    }
  };

  return (
    <div style={{ display: "flex", gap: 32, maxWidth: 820, margin: "0 auto", width: "100%" }}>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 12 }}>Topics</div>
        {Object.entries(docs).map(([key, { title }]) => (
          <div key={key} onClick={() => setActive(key)}
            style={{
              padding: "8px 12px", borderRadius: 6, cursor: "none", fontSize: 13,
              color: active === key ? C.purple : C.muted,
              background: active === key ? "#1e1a2e" : "transparent",
              borderLeft: `2px solid ${active === key ? C.purple : "transparent"}`,
              transition: "all 0.15s", marginBottom: 2,
            }}>
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

// ── Contributors page ─────────────────────────────────────
function ContribPage() {
  const [contribs, setContribs] = useState<Contributor[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    Promise.all(
      REPOS.map(name =>
        ghFetch(`/repos/${OWNER}/${name}/contributors?per_page=100`)
          .then((d: any[]) => d.map((c: any) => ({ login: c.login, avatar: c.avatar_url, contributions: c.contributions, url: c.html_url })))
          .catch(() => [] as Contributor[])
      )
    ).then(results => {
      const merged: Record<string, Contributor> = {};
      results.flat().forEach(c => {
        if (merged[c.login]) merged[c.login].contributions += c.contributions;
        else merged[c.login] = { ...c };
      });
      setContribs(Object.values(merged).sort((a, b) => b.contributions - a.contributions));
      setLoading(false);
    });
  }, []);

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", color: C.purple, textTransform: "uppercase", marginBottom: 8 }}>all repos</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 20 }}>Contributors</h2>
      {loading
        ? [1, 2, 3].map(i => <Skeleton key={i} h={60} />)
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
              <div style={{ marginLeft: "auto", fontSize: 11, color: C.purple, alignSelf: "center" }}>#{i + 1}</div>
            </a>
          ))
      }
    </div>
  );
}

// ── App ───────────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState<"home" | "packages" | "docs" | "contrib" | "pkgmgr">("home");
  const [pkgCount, setPkgCount] = useState(0);

  useEffect(() => {
    fetch(`${SERVER}/packages`)
      .then(r => r.json())
      .then(d => setPkgCount(d.packages?.length ?? 0))
      .catch(() => {});
  }, []);

  const navItems: { key: typeof page; label: string }[] = [
    { key: "home",     label: "Home" },
    { key: "packages", label: "Packages" },
    { key: "pkgmgr",  label: "Package Manager" },
    { key: "docs",     label: "Docs" },
    { key: "contrib",  label: "Contributors" },
  ];

  return (
    <>
      <style>{globalCSS}</style>
      <Cursor />

      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 56,
        background: `${C.bg}ee`,
        backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 24px", zIndex: 50,
      }}>
        {/* Logo left */}
        <div style={{ position: "absolute", left: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/quartzlinux.svg" alt="Quartz Linux" style={{ width: 24, height: 24 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: C.white, letterSpacing: "-0.02em" }}>
            Quartz Linux
          </span>
        </div>

        {/* Nav centered */}
        <nav style={{ display: "flex", gap: 4 }}>
          {navItems.map(({ key, label }) => (
            <button key={key} className={`tab-btn${page === key ? " active" : ""}`} onClick={() => setPage(key)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{ paddingTop: 96, paddingLeft: 40, paddingRight: 40, paddingBottom: 60, maxWidth: 1100, margin: "0 auto" }}>
        {page === "home"     && <HomePage pkgCount={pkgCount} />}
        {page === "packages" && <PackagesPage />}
        {page === "pkgmgr"  && <PackageManagerPage />}
        {page === "docs"     && <DocsPage />}
        {page === "contrib"  && <ContribPage />}
      </main>
    </>
  );
}
