import { useState, useEffect, useRef } from "react";

const SERVER = "https://quartzlinux.vercel.app";

const C = {
  bg:      "#0a0a0f",
  surface: "#13131a",
  border:  "#1e1e2a",
  text:    "#e8e8f0",
  muted:   "#9898b0",
  purple:  "#a78bfa",
  blue:    "#4FC3F7",
  white:   "#ffffff",
  orange:  "#FF7A00",
  yellow:  "#FFD600",
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
    z-index: 2;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(167,139,250,0.12) 0%, rgba(167,139,250,0.04) 40%, transparent 70%);
    filter: blur(22px);
    animation: cursorPulse 3s ease-in-out infinite;
    mix-blend-mode: screen;
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

  .pkg-tab-btn {
    padding: 7px 20px;
    border-radius: 6px;
    border: 1px solid ${C.border};
    background: transparent;
    color: ${C.muted};
    font-size: 13px;
    font-weight: 500;
    cursor: none;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
  }
  .pkg-tab-btn:hover { border-color: ${C.purple}40; color: ${C.text}; }
  .pkg-tab-btn.active { background: ${C.purple}18; border-color: ${C.purple}; color: ${C.purple}; }

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
  .doc-section p  { font-size: 14px; color: #b8b8cc; line-height: 1.7; margin-bottom: 12px; }
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
    position: relative;
    z-index: 5;
  }
  .stat-card:hover { border-color: ${C.purple}40; transform: translateY(-2px); }

  .hero-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 22px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'Inter', sans-serif;
    cursor: none;
    transition: all 0.2s;
    border: none;
  }
  .hero-btn-yellow {
    background: ${C.yellow};
    color: #0a0a0f;
  }
  .hero-btn-yellow:hover { background: #ffe033; transform: translateY(-1px); box-shadow: 0 4px 20px rgba(255,214,0,0.25); }
  .hero-btn-ghost {
    background: transparent;
    color: ${C.text};
    border: 1px solid ${C.border} !important;
  }
  .hero-btn-ghost:hover { border-color: ${C.purple} !important; color: ${C.purple}; transform: translateY(-1px); }

  /* Infinite scroll topics */
  .topics-scroll-wrap {
    width: 100%;
    overflow-y: auto;
    max-height: calc(100vh - 120px);
    scroll-behavior: smooth;
    padding-right: 8px;
  }
  .topics-scroll-wrap::-webkit-scrollbar { width: 3px; }
  .topics-scroll-wrap::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }

  .topic-section {
    padding: 36px 0;
    border-bottom: 1px solid ${C.border};
    animation: fadeIn 0.3s ease both;
  }
  .topic-section:last-child { border-bottom: none; padding-bottom: 80px; }
  .topic-section h2 {
    font-size: 20px; font-weight: 700; color: ${C.white};
    margin-bottom: 6px; display: flex; align-items: center; gap: 10px;
  }
  .topic-section h3 {
    font-size: 12px; font-weight: 500; color: ${C.purple};
    margin: 24px 0 10px; text-transform: uppercase; letter-spacing: 0.08em;
  }
  .topic-section p { font-size: 14.5px; color: #b8b8cc; line-height: 1.8; margin-bottom: 14px; }
  .topic-section code {
    font-family: 'JetBrains Mono', monospace; font-size: 12px;
    background: #1a1a24; padding: 2px 6px; border-radius: 4px; color: ${C.blue};
  }

  /* Footer bar */
  .footer-bar {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    height: 40px;
    background: ${C.surface};
    border-top: 1px solid ${C.border};
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 100;
    backdrop-filter: blur(12px);
  }

  * { cursor: none !important; }
`;

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

function LangDonut({ langs, logoSrc }: { langs: LangData[]; logoSrc: string }) {
  const SIZE   = 280;
  const STROKE = 28;
  const R      = (SIZE - STROKE) / 2;
  const CIRC   = 2 * Math.PI * R;
  const CX     = SIZE / 2;
  const total  = langs.reduce((s, l) => s + l.bytes, 0);

  let offset = 0;
  const segments = langs.map(l => {
    const frac = l.bytes / total;
    const dash = frac * CIRC;
    const seg  = { ...l, dash, gap: CIRC - dash, offset, frac };
    offset += dash;
    return seg;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={CX} cy={CX} r={R} fill="none" stroke={C.border} strokeWidth={STROKE} />
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
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <img src={logoSrc} alt="QLPM"
            style={{ width: 72, height: 72, filter: "drop-shadow(0 0 12px rgba(167,139,250,0.4))" }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 28px", maxWidth: 340, width: "100%" }}>
        {segments.map(s => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: langColor(s.name), flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.text, fontFamily: "JetBrains Mono" }}>{s.name}</span>
            <span style={{ fontSize: 12, color: C.muted, marginLeft: "auto" }}>{(s.frac * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Topics data ───────────────────────────────────────────
const TOPICS = [
  {
    id: "intro",
    label: "Introduction",
    icon: "◆",
    content: (
      <>
        <p>
          QLPM (Quartz Linux Package Manager) is a fast, declarative package manager built for developers.
          Every package is described by a <code>QZMAKE</code> file — a plain TOML document that specifies
          where to fetch the binary, what to install, and how to remove it cleanly.
        </p>
        <p>
          There are no hidden scripts, no daemon processes, and no global state beyond a small JSON lock file.
          If you can read TOML, you can audit any package in the registry.
        </p>
      </>
    ),
  },
  {
    id: "install",
    label: "Install",
    icon: "↓",
    content: (
      <>
        <h3>Installing a package</h3>
        <p>
          Use <code>qz -i</code> followed by the package name. QLPM fetches the QZMAKE from the registry,
          shows you what it will place on disk, and asks for confirmation before touching anything.
        </p>
        <div className="code-block" style={{ marginBottom: 16, fontSize: 12 }}>
          <div><span style={{ color: C.muted }}># install a single package</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-i</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.muted }}># install multiple at once</span></div>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-i</span> <span style={{ color: "#6ee7b7" }}>ripgrep neovim fd</span></div>
        </div>
        <h3>Flags</h3>
        <p><code>--yes</code> skips confirmation. Useful for scripts and CI environments.</p>
        <div className="code-block" style={{ fontSize: 12 }}>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-i</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span> <span style={{ color: C.orange }}>--yes</span></div>
        </div>
      </>
    ),
  },
  {
    id: "remove",
    label: "Remove",
    icon: "✕",
    content: (
      <>
        <h3>Removing a package</h3>
        <p>
          Use <code>qz -r</code> to remove. QLPM reads the <code>[remove]</code> section of the QZMAKE
          and deletes only the files it placed — nothing more, nothing less.
        </p>
        <div className="code-block" style={{ fontSize: 12 }}>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-r</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
        </div>
      </>
    ),
  },
  {
    id: "update",
    label: "Update",
    icon: "↑",
    content: (
      <>
        <h3>Update a single package</h3>
        <p>QLPM checks the registry for a newer version and reinstalls if one exists.</p>
        <div className="code-block" style={{ marginBottom: 16, fontSize: 12 }}>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-u</span> <span style={{ color: "#6ee7b7" }}>ripgrep</span></div>
        </div>
        <h3>Update everything</h3>
        <p>Running without a package name updates all installed packages in one pass.</p>
        <div className="code-block" style={{ fontSize: 12 }}>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-u</span></div>
        </div>
      </>
    ),
  },
  {
    id: "search",
    label: "Search",
    icon: "⌕",
    content: (
      <>
        <h3>Searching the registry</h3>
        <p>Use <code>qz -s</code> to search packages by name or keyword. Results show name, version, and a short description.</p>
        <div className="code-block" style={{ fontSize: 12 }}>
          <div><span style={{ color: C.purple }}>qz</span> <span style={{ color: C.blue }}>-s</span> <span style={{ color: "#6ee7b7" }}>neovim</span></div>
        </div>
      </>
    ),
  },
  {
    id: "qzmake",
    label: "QZMAKE format",
    icon: "⊞",
    content: (
      <>
        <h3>What is a QZMAKE file?</h3>
        <p>
          Every package in the Quartz registry is described by a <code>QZMAKE</code> file — a TOML document
          with five required sections. Here is an annotated example:
        </p>
        <div className="code-block" style={{ fontSize: 12 }}>
          <div><span style={{ color: C.purple }}>[package]</span></div>
          <div><span style={{ color: C.blue }}>name</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"ripgrep"</span></div>
          <div><span style={{ color: C.blue }}>version</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"14.1.0"</span></div>
          <div><span style={{ color: C.blue }}>description</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"Fast grep replacement"</span></div>
          <div><span style={{ color: C.blue }}>github</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"BurntSushi/ripgrep"</span></div>
          <div><span style={{ color: C.blue }}>maintainer</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"xansidev"</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.purple }}>[source]</span></div>
          <div><span style={{ color: C.blue }}>url</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"https://github.com/..."</span></div>
          <div><span style={{ color: C.blue }}>sha256</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"abc123..."</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.purple }}>[install]</span></div>
          <div><span style={{ color: C.blue }}>bin</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>["rg"]</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.purple }}>[remove]</span></div>
          <div><span style={{ color: C.blue }}>bin</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>["rg"]</span></div>
          <div style={{ marginTop: 8 }}><span style={{ color: C.purple }}>[log]</span></div>
          <div><span style={{ color: C.blue }}>install_log</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"Installed rg to /usr/local/bin"</span></div>
          <div><span style={{ color: C.blue }}>remove_log</span><span style={{ color: C.muted }}> = </span><span style={{ color: "#6ee7b7" }}>"Removed rg"</span></div>
        </div>
      </>
    ),
  },
  {
    id: "contributing",
    label: "Contributing",
    icon: "⊕",
    content: (
      <>
        <h3>Adding a package</h3>
        <p>
          Fork <code>Xansidev/quartz-packages</code>, create a folder with your package name, add a <code>QZMAKE</code> file,
          and open a pull request. A maintainer will review it within a few days.
        </p>
        <h3>Reporting issues</h3>
        <p>Open an issue on <code>Xansidev/qlpm</code> for client bugs, or <code>Xansidev/quartz-server</code> for registry issues.</p>
      </>
    ),
  },
];

// ── Package Manager Page ──────────────────────────────────
function PackageManagerPage() {
  const [langs, setLangs]       = useState<LangData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [repoInfo, setRepoInfo] = useState<{ stars: number; desc: string } | null>(null);
  const [activeTopicId, setActiveTopicId] = useState("intro");
  const [topicSearch, setTopicSearch]     = useState("");
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredTopics = topicSearch.trim()
    ? TOPICS.filter(t => t.label.toLowerCase().includes(topicSearch.toLowerCase()))
    : TOPICS;

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

  function scrollToTopic(id: string) {
    setActiveTopicId(id);
    const el = topicRefs.current[id];
    if (el && scrollRef.current) {
      scrollRef.current.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
    }
  }

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    function onScroll() {
      const containerTop = container!.scrollTop;
      let current = TOPICS[0].id;
      for (const topic of TOPICS) {
        const el = topicRefs.current[topic.id];
        if (el && el.offsetTop - 40 <= containerTop) current = topic.id;
      }
      setActiveTopicId(current);
    }
    container.addEventListener("scroll", onScroll);
    return () => container.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fade-in" style={{ display: "flex", gap: 32, width: "100%" }}>

      {/* ── Left column: hero + donut (unchanged sizes) ── */}
      <div style={{ width: 300, flexShrink: 0, display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Hero intro — no "Xansidev / qlpm" label */}
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: C.white, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 10 }}>
            QLPM
          </h1>
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 14 }}>
            The Quartz Linux Package Manager. Install, remove, search and update packages
            defined by <code style={{ fontFamily: "JetBrains Mono", fontSize: 12, background: "#1a1a24", padding: "2px 5px", borderRadius: 4, color: C.blue }}>QZMAKE</code> files.
          </p>
          {repoInfo && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: C.muted, marginBottom: 16 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill={C.purple} stroke="none">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span style={{ color: C.purple, fontWeight: 600 }}>{repoInfo.stars}</span>
              <span>stars on GitHub</span>
            </div>
          )}
          <a href={`https://github.com/${OWNER}/qlpm`} target="_blank" rel="noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: C.purple, borderBottom: `1px solid ${C.purple}40`, paddingBottom: 2 }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.purple)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = `${C.purple}40`)}
          >
            View on GitHub →
          </a>
        </div>

        {/* Lang donut — no box */}
        <div style={{ padding: "8px 0" }}>
          {loading
            ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}><Skeleton w="200px" h={200} /><Skeleton w="160px" /></div>
            : langs.length > 0
              ? <LangDonut langs={langs} logoSrc="/quartzlinux.svg" />
              : <p style={{ color: C.muted, fontSize: 12, textAlign: "center" }}>Could not load language data.</p>
          }
        </div>
      </div>

      {/* ── Middle column: topics nav (unchanged size) ── */}
      <div style={{ width: 160, flexShrink: 0, paddingTop: 4 }}>
        {/* Topics search */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <svg style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", opacity: 0.4, pointerEvents: "none" }}
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search…"
            value={topicSearch}
            onChange={e => setTopicSearch(e.target.value)}
            style={{ padding: "7px 10px 7px 28px", fontSize: 12 }}
          />
        </div>

        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: C.muted, textTransform: "uppercase", marginBottom: 10 }}>Topics</div>

        {filteredTopics.length === 0
          ? <div style={{ fontSize: 12, color: C.muted, padding: "4px 0" }}>No matches.</div>
          : filteredTopics.map(t => (
            <div key={t.id} onClick={() => scrollToTopic(t.id)}
              style={{
                padding: "7px 10px", borderRadius: 6, cursor: "none", fontSize: 13,
                color: activeTopicId === t.id ? C.purple : C.muted,
                background: activeTopicId === t.id ? "#1e1a2e" : "transparent",
                borderLeft: `2px solid ${activeTopicId === t.id ? C.purple : "transparent"}`,
                transition: "all 0.15s", marginBottom: 2,
                display: "flex", alignItems: "center", gap: 7,
              }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>{t.icon}</span>
              {t.label}
            </div>
          ))
        }
      </div>

      {/* ── Right column: infinite scroll content, takes all remaining space ── */}
      <div ref={scrollRef} className="topics-scroll-wrap" style={{ flex: 1, minWidth: 0 }}>
        {TOPICS.map(t => (
          <div
            key={t.id}
            ref={el => { topicRefs.current[t.id] = el; }}
            className="topic-section"
          >
            <h2>
              <span style={{ fontSize: 14, color: C.purple, fontFamily: "JetBrains Mono" }}>{t.icon}</span>
              {t.label}
            </h2>
            <div style={{ width: 24, height: 2, background: C.purple, borderRadius: 1, margin: "8px 0 20px" }} />
            {t.content}
          </div>
        ))}
      </div>

    </div>
  );
}

// Inline B&W SVGs for tech logos
const VITE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 410 404"><path fill="white" d="M399.641 59.525l-183.998 329.02c-3.792 6.783-13.559 6.823-17.409.075L10.582 59.6C6.38 52.295 12.53 43.507 20.836 44.717L204.25 71.081c1.24.183 2.499.184 3.74.003L389.798 44.74c8.291-1.222 14.458 7.537 9.843 14.785z"/><path fill="#aaaaaa" d="M292.965 1.428L156.801 27.593c-3.609.679-6.209 3.822-6.209 7.491v157.371c0 4.141 3.354 7.497 7.495 7.497h35.907c4.179 0 7.55-3.407 7.495-7.585l-1.572-124.58c-.058-4.24 3.42-7.691 7.659-7.608l36.317.705c4.205.082 7.587 3.498 7.587 7.704v124.759c0 4.141 3.354 7.497 7.495 7.497h35.658c4.141 0 7.495-3.356 7.495-7.497V9.016c0-4.577-4.131-8.05-8.663-7.588z"/></svg>`;

const REACT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.5 -10.23 23 20.46"><circle cx="0" cy="0" r="2.05" fill="white"/><g stroke="white" stroke-width="1" fill="none"><ellipse rx="11" ry="4.2"/><ellipse rx="11" ry="4.2" transform="rotate(60)"/><ellipse rx="11" ry="4.2" transform="rotate(120)"/></g></svg>`;

const TS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="50" fill="white"/><path fill="#0a0a0f" d="M317 407v52c9 4 19 7 30 9s23 3 35 3c11 0 22-1 32-3s20-6 27-11 13-12 18-21 7-19 7-32c0-9-1-17-4-24s-6-13-11-18-10-10-17-14-14-8-22-12c-6-3-11-5-16-8s-9-5-12-7-5-5-7-7-2-5-2-9c0-3 1-6 2-8s4-4 6-6 6-3 9-4 7-1 11-1c3 0 6 0 10 1s7 1 11 2 7 2 10 4 6 3 9 5v-48c-9-3-18-5-27-6s-19-2-30-2c-11 0-22 1-31 3s-19 6-26 11-13 12-17 20-6 19-6 32c0 16 4 29 13 39s21 19 37 26c6 3 12 5 17 8s10 5 13 8 6 5 7 8 2 7 2 11c0 3 0 6-2 9s-3 5-6 7-6 3-10 4-8 2-13 2c-9 0-18-2-27-5s-18-8-25-14zm-121-6h-62V197h-60v-47h182v47h-60z"/></svg>`;

const GITHUB_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="white" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/></svg>`;

const ORBIT_ITEMS = [
  { svg: VITE_SVG,  label: "Vite",       href: "https://vite.dev",            size: 36 },
  { svg: REACT_SVG, label: "React",      href: "https://react.dev",             size: 34 },
  { svg: TS_SVG,    label: "TypeScript", href: "https://www.typescriptlang.org", size: 34 },
];

const ORBIT_DURATION = 9; // seconds for one full revolution (normal speed)
const ORBIT_HOVER_DURATION = 22; // slows on hover

function OrbitRing({ pkgCount }: { pkgCount: number }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [paused, setPaused]         = useState(false);
  const [angle, setAngle]           = useState(0);
  const rafRef  = useRef<number>(0);
  const lastRef = useRef<number>(0);
  const RADIUS  = 110;
  const N       = ORBIT_ITEMS.length;

  useEffect(() => {
    function tick(ts: number) {
      if (lastRef.current) {
        const dt = ts - lastRef.current;
        const speed = paused ? 0 : (hoveredIdx !== null ? 360 / (ORBIT_HOVER_DURATION * 1000) : 360 / (ORBIT_DURATION * 1000));
        setAngle(a => (a + speed * dt) % 360);
      }
      lastRef.current = ts;
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hoveredIdx, paused]);

  return (
    <div style={{ position: "relative", width: RADIUS * 2 + 80, height: RADIUS * 2 + 80, flexShrink: 0 }}>
      {/* Orbit ring visual */}
      <div style={{
        position: "absolute",
        inset: 40,
        borderRadius: "50%",
        border: `1px solid rgba(167,139,250,0.12)`,
        pointerEvents: "none",
      }} />
      {/* Center: GitHub logo — clickable */}
      <a
        href={`https://github.com/${OWNER}/quartz-server`}
        target="_blank"
        rel="noreferrer"
        title="GitHub"
        style={{
          position: "absolute",
          left: "50%", top: "50%",
          transform: "translate(-50%,-50%)",
          width: 56, height: 56,
          display: "flex", alignItems: "center", justifyContent: "center",
          opacity: 0.7,
          transition: "opacity 0.2s, filter 0.2s",
          zIndex: 10,
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.filter = "drop-shadow(0 0 10px rgba(167,139,250,0.7))"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "0.7"; e.currentTarget.style.filter = "none"; }}
        dangerouslySetInnerHTML={{ __html: GITHUB_SVG }}
      />
      {/* Orbiting icons */}
      {ORBIT_ITEMS.map((item, i) => {
        const theta = ((angle + i * (360 / N)) * Math.PI) / 180;
        const cx = RADIUS * Math.cos(theta) + RADIUS + 40;
        const cy = RADIUS * Math.sin(theta) + RADIUS + 40;
        const isHovered = hoveredIdx === i;
        return (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            title={item.label}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              width: item.size + 16,
              height: item.size + 16,
              transform: `translate(-50%, -50%) scale(${isHovered ? 1.22 : 1})`,
              transition: "transform 0.25s ease",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isHovered ? 1 : 0.7,
              filter: isHovered ? "drop-shadow(0 0 8px rgba(167,139,250,0.6))" : "none",
              zIndex: 10,
            }}
          >
            <div style={{ width: item.size, height: item.size }}
              dangerouslySetInnerHTML={{ __html: item.svg }}
            />
          </a>
        );
      })}
    </div>
  );
}

// ── Home page ─────────────────────────────────────────────
function HomePage({ pkgCount }: { pkgCount: number }) {
  const [stars, setStars]                 = useState<number | null>(null);
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
    <div className="fade-in" style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minHeight: "calc(100vh - 156px)", overflow: "visible" }}>

      {/* Background logo — position: fixed so it never moves on scroll */}
      <img src="/quartzlinux-colored.svg" alt="" aria-hidden
        style={{
          position: "fixed",
          width: 1200, height: 1200,
          bottom: -300, left: -670,
          filter: "blur(22px)",
          opacity: 0.22,
          pointerEvents: "none",
          userSelect: "none",
          zIndex: 0,
        }}
        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
      />

      {/* Hero text */}
      <div style={{ position: "relative", zIndex: 3, marginBottom: 36, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1 style={{
          fontSize: 64, fontWeight: 800, color: C.white,
          letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 20,
        }}>
          Quartz Linux
        </h1>
        <p style={{ fontSize: 16, color: "#b8b8cc", lineHeight: 1.7, maxWidth: 480, margin: "0 auto 28px" }}>
          A dev-oriented package manager for Linux. Fast, and human-readable.
          Every package is defined by a{" "}
          <code style={{ fontFamily: "JetBrains Mono", fontSize: 13, background: "#1a1a24", padding: "2px 6px", borderRadius: 4, color: C.orange }}>TOML</code>
          {" "}file that tells Quartz how packages work declaratively.
        </p>

        {/* CTA Buttons */}
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button className="hero-btn hero-btn-yellow">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download ISO
          </button>
          <a
            href={`https://github.com/${OWNER}`}
            target="_blank"
            rel="noreferrer"
            className="hero-btn hero-btn-ghost"
            style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            GitHub
          </a>
        </div>
      </div>

      {/* Orbit ring centered */}
<div
  style={{
    position: "relative",
    zIndex: 3,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 24,
    width: "100%",
    marginBottom: 8,
  }}
>
  <OrbitRing pkgCount={pkgCount} />

  {/* Stats row */}
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(160px, 1fr))",
      gap: 14,
      width: "100%",
      maxWidth: 720,
    }}
  >
    {stats.map(({ label, value }) => (
      <div key={label} className="stat-card" style={{ textAlign: "center" }}>
        <div
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: C.white,
            fontFamily: "JetBrains Mono",
            marginBottom: 4,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.muted,
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </div>
      </div>
    ))}
  </div>
</div>

// ── Packages page (Core / Extra tabs, full screen width) ──
type PkgEntry = { name: string; category: string };

function PackagesPage() {
  const [list, setList]         = useState<PkgEntry[]>([]);
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail]     = useState<PackageDetail | null>(null);
  const [commit, setCommit]     = useState<CommitInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pkgTab, setPkgTab]     = useState<"core" | "extra">("core");

  useEffect(() => {
    fetch(`${SERVER}/packages`)
      .then(r => r.json())
      .then(d => {
        // Support both old flat string[] and new {name, category}[] response shapes
        const raw = d.packages ?? [];
        const normalized: PkgEntry[] = raw.map((p: any) =>
          typeof p === "string" ? { name: p, category: "extra" } : { name: p.name, category: p.category ?? "extra" }
        );
        setList(normalized);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const coreList  = list.filter(p => p.category === "core");
  const extraList = list.filter(p => p.category !== "core");
  const activeList = pkgTab === "core" ? coreList : extraList;

  const displayList = query.trim()
    ? activeList.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : activeList;

  useEffect(() => {
    setSelected(null);
    setDetail(null);
  }, [pkgTab]);

  async function selectPkg(name: string) {
    setSelected(name); setDetail(null); setCommit(null); setDetailLoading(true);
    const [pkgRes, commitsData] = await Promise.all([
      fetch(`${SERVER}/packages/${name}`).then(r => r.json()).catch(() => null),
      ghFetch(`/repos/${OWNER}/quartz-packages/commits?path=${encodeURIComponent(name + "/QZMAKE")}&per_page=1`).catch(() => []),
    ]);
    setDetail(pkgRes);
    if (Array.isArray(commitsData) && commitsData.length > 0) {
      const c = commitsData[0];
      setCommit({ sha: c.sha, message: c.commit.message.split("\n")[0], author: c.commit.author.name, avatar: c.author?.avatar_url ?? "", url: c.html_url, date: c.commit.author.date });
    }
    setDetailLoading(false);
  }

  return (
    <div className="fade-in" style={{ display: "flex", gap: 28, height: "calc(100vh - 120px)", width: "100%" }}>

      {/* Left: search + Core/Extra tabs + package list */}
      <div style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Search */}
        <div style={{ position: "relative" }}>
          <svg style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", opacity: 0.4, pointerEvents: "none" }}
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input className="search-input" type="text" placeholder="Search packages…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>

        {/* Core / Extra tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`pkg-tab-btn${pkgTab === "core" ? " active" : ""}`} style={{ flex: 1 }} onClick={() => { setPkgTab("core"); setQuery(""); }}>
            Core
            <span style={{ marginLeft: 6, fontSize: 11, color: pkgTab === "core" ? C.purple : C.muted, fontFamily: "JetBrains Mono" }}>
              {coreList.length > 0 ? coreList.length : ""}
            </span>
          </button>
          <button className={`pkg-tab-btn${pkgTab === "extra" ? " active" : ""}`} style={{ flex: 1 }} onClick={() => { setPkgTab("extra"); setQuery(""); }}>
            Extra
            <span style={{ marginLeft: 6, fontSize: 11, color: pkgTab === "extra" ? C.purple : C.muted, fontFamily: "JetBrains Mono" }}>
              {extraList.length > 0 ? extraList.length : ""}
            </span>
          </button>
        </div>

        {/* Package list */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
          {loading
            ? [1,2,3,4,5,6].map(i => <Skeleton key={i} h={44} />)
            : displayList.length === 0
              ? <div style={{ color: C.muted, fontSize: 13, padding: "12px 4px" }}>
                  {query ? "No packages match your search." : `No ${pkgTab} packages found.`}
                </div>
              : displayList.map((pkg, i) => (
                <div key={pkg.name} className={`pkg-card${selected === pkg.name ? " active" : ""} slide-in`}
                  style={{ animationDelay: `${Math.min(i, 20) * 0.03}s` }} onClick={() => selectPkg(pkg.name)}>
                  <span style={{ color: selected === pkg.name ? C.purple : C.blue, fontSize: 10, flexShrink: 0 }}>◆</span>
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pkg.name}</span>
                  {query && pkg.category === "core" && (
                    <span style={{ fontSize: 9, color: C.purple, opacity: 0.6, letterSpacing: "0.06em", textTransform: "uppercase" }}>core</span>
                  )}
                </div>
              ))
          }
        </div>
      </div>

      {/* Right: package detail — takes full remaining space */}
      <div style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
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
          <div className="fade-in" style={{ maxWidth: 860 }}>
            <div style={{ marginBottom: 8, display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: C.white }}>{detail.package?.name}</span>
              <span style={{ fontSize: 12, color: C.muted, fontFamily: "JetBrains Mono" }}>v{detail.package?.version}</span>
              {detail.package?.category === "core" && (
                <span style={{ fontSize: 10, color: C.purple, border: `1px solid ${C.purple}40`, borderRadius: 4, padding: "2px 7px", letterSpacing: "0.06em", textTransform: "uppercase" }}>core</span>
              )}
            </div>
            <p style={{ fontSize: 14, color: C.muted, marginBottom: 24 }}>{detail.package?.description}</p>
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

// ── Installation page ─────────────────────────────────────
function InstallationPage() {
  return (
    <div className="fade-in" style={{ maxWidth: 720, margin: "0 auto", width: "100%" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", color: C.purple, textTransform: "uppercase", marginBottom: 8 }}>Quartz Linux</div>
      <h2 style={{ fontSize: 22, fontWeight: 700, color: C.white, marginBottom: 8 }}>Installation</h2>
      <div style={{ width: 32, height: 2, background: C.purple, borderRadius: 1, marginBottom: 24 }} />
      <p style={{ fontSize: 14, color: C.muted }}>Coming soon (1.3B~ Years).</p>
    </div>
  );
}

function ContribPage() {
  const [contribs, setContribs] = useState<Contributor[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    async function load() {
      const merged: Record<string, Contributor> = {};

      await Promise.all(
        REPOS.map(async (name) => {
          const [contribData, commitData] = await Promise.all([
            ghFetch(`/repos/${OWNER}/${name}/contributors?per_page=100&anon=1`).catch(() => []),
            ghFetch(`/repos/${OWNER}/${name}/commits?per_page=100`).catch(() => []),
          ]);

          if (Array.isArray(contribData)) {
            contribData.forEach((c: any) => {
              if (!c.login) return;
              if (merged[c.login]) merged[c.login].contributions += c.contributions;
              else merged[c.login] = { login: c.login, avatar: c.avatar_url, contributions: c.contributions, url: c.html_url };
            });
          }

          if (Array.isArray(commitData)) {
            commitData.forEach((c: any) => {
              const login = c.author?.login;
              if (!login) return;
              if (!merged[login]) {
                merged[login] = { login, avatar: c.author.avatar_url, contributions: 1, url: c.author.html_url };
              }
            });
          }
        })
      );

      setContribs(Object.values(merged).sort((a, b) => b.contributions - a.contributions));
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
      <div style={{ fontSize: 11, letterSpacing: "0.12em", color: C.purple, textTransform: "uppercase", marginBottom: 8 }}>all repos</div>
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
              <div style={{ marginLeft: "auto", fontSize: 11, color: C.purple, alignSelf: "center" }}>#{i + 1}</div>
            </a>
          ))
      }
    </div>
  );
}

// ── Footer bar ────────────────────────────────────────────
function FooterBar() {
  return (
    <div className="footer-bar">
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <img
          src="/react.svg"
          alt="React"
          style={{ width: 18, height: 18, opacity: 0.7 }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <span style={{ fontSize: 11, color: C.muted }}>Built with React</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.muted }}>
        website designer{" "}
        <a
          href={`https://github.com/${OWNER}`}
          target="_blank"
          rel="noreferrer"
          style={{
            color: C.purple, fontWeight: 600,
            borderBottom: `1px solid ${C.purple}40`,
            paddingBottom: 1,
            transition: "border-color 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = C.purple)}
          onMouseLeave={e => (e.currentTarget.style.borderColor = `${C.purple}40`)}
        >
          @{OWNER}
        </a>
      </div>
    </div>
  );
}

// ── Root App ──────────────────────────────────────────────
export default function App() {
  const [page, setPage]         = useState<"home" | "packages" | "pkgmgr" | "installation" | "contrib">("home");
  const [pkgCount, setPkgCount] = useState(0);

  useEffect(() => {
    fetch(`${SERVER}/packages`)
      .then(r => r.json())
      .then(d => setPkgCount(d.packages?.length ?? 0))
      .catch(() => {});
  }, []);

  const navItems: { key: typeof page; label: string }[] = [
    { key: "home",         label: "Home" },
    { key: "packages",     label: "Packages" },
    { key: "pkgmgr",       label: "Package Manager" },
    { key: "installation", label: "Installation" },
    { key: "contrib",      label: "Contributors" },
  ];

  return (
    <>
      <style>{globalCSS}</style>
      <Cursor />

      <header style={{
        position: "fixed", top: 0, left: 0, right: 0, height: 56,
        background: `${C.bg}ee`, backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0 24px", zIndex: 50,
      }}>
        <div style={{ position: "absolute", left: 24, display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/quartzlinux.svg" alt="Quartz Linux" style={{ width: 24, height: 24 }}
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <span style={{ fontWeight: 700, fontSize: 15, color: C.white, letterSpacing: "-0.02em" }}>Quartz Linux</span>
        </div>
        <nav style={{ display: "flex", gap: 4 }}>
          {navItems.map(({ key, label }) => (
            <button key={key} className={`tab-btn${page === key ? " active" : ""}`} onClick={() => setPage(key)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main style={{
        paddingTop: 96,
        paddingLeft: 40,
        paddingRight: 40,
        paddingBottom: 80,
        // No maxWidth constraint for full screen usage
        width: "100%",
      }}>
        {page === "home"         && <HomePage pkgCount={pkgCount} />}
        {page === "packages"     && <PackagesPage />}
        {page === "pkgmgr"       && <PackageManagerPage />}
        {page === "installation" && <InstallationPage />}
        {page === "contrib"      && <ContribPage />}
      </main>

      <FooterBar />
    </>
  );
}
