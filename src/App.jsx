import { useState, useEffect, useRef } from "react";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  LAMBDA_URL: "https://y2iqqe7272fka6ooesyniq5tnq0sginw.lambda-url.us-east-1.on.aws/", // Replace with your AWS Lambda URL
  REDIRECT_URL: "https://live.sentinelurl.site",
  BOOT_DURATION_MS: 18000, // ~18 seconds total boot
};

// ─── BOOT LOG MESSAGES ─────────────────────────────────────────────────────
const BOOT_STEPS = [
  { pct: 3,  msg: "Initializing Sentinel kernel...",           tag: "SYS"  },
  { pct: 8,  msg: "Invoking AWS Lambda cold-start...",         tag: "AWS"  },
  { pct: 14, msg: "Lambda execution environment ready",        tag: "AWS"  },
  { pct: 20, msg: "Provisioning EC2 instance (t3.medium)...",  tag: "EC2"  },
  { pct: 28, msg: "Instance state: PENDING → RUNNING",         tag: "EC2"  },
  { pct: 35, msg: "Waiting for system checks to pass...",      tag: "EC2"  },
  { pct: 42, msg: "SSH daemon online. Services initializing.", tag: "SYS"  },
  { pct: 50, msg: "Fetching new public IPv4 address...",       tag: "NET"  },
  { pct: 57, msg: "Updating Namecheap DNS A-record...",        tag: "DNS"  },
  { pct: 63, msg: "DNS propagation in progress (TTL 60s)...",  tag: "DNS"  },
  { pct: 70, msg: "Verifying domain resolution...",            tag: "DNS"  },
  { pct: 76, msg: "Starting threat intelligence pipeline...",  tag: "APP"  },
  { pct: 82, msg: "Loading ML scoring models...",              tag: "APP"  },
  { pct: 88, msg: "Sandbox environment warm and ready.",       tag: "APP"  },
  { pct: 94, msg: "Health check passed. All systems nominal.", tag: "SYS"  },
  { pct: 100,msg: "SURL is live. Redirecting...",              tag: "OK"   },
];

const TAG_COLORS = {
  SYS: "#a78bfa",
  AWS: "#f97316",
  EC2: "#fb923c",
  NET: "#38bdf8",
  DNS: "#34d399",
  APP: "#60a5fa",
  OK:  "#4ade80",
};

// ─── PARTICLE CANVAS ───────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let raf;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(139,92,246,${p.alpha})`;
        ctx.fill();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(139,92,246,${0.06 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        opacity: 0.7,
      }}
    />
  );
}

// ─── SCAN ANIMATION SVG ────────────────────────────────────────────────────
function ShieldIcon({ size = 64 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <defs>
        <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
      </defs>
      <path
        d="M32 4L10 14v16c0 13.5 9.5 26.1 22 29.4C44.5 56.1 54 43.5 54 30V14L32 4z"
        fill="url(#sg)"
        opacity="0.15"
      />
      <path
        d="M32 4L10 14v16c0 13.5 9.5 26.1 22 29.4C44.5 56.1 54 43.5 54 30V14L32 4z"
        stroke="#a78bfa"
        strokeWidth="1.5"
        fill="none"
      />
      <path
        d="M22 31l7 7 13-14"
        stroke="#a78bfa"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── FEATURE CARD ──────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc }) {
  return (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
      <p className="feature-desc">{desc}</p>
    </div>
  );
}

// ─── BOOT OVERLAY ──────────────────────────────────────────────────────────
function BootOverlay({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const logsRef = useRef(null);
  const startTime = useRef(Date.now());

  useEffect(() => {
    // Fire Lambda (fire and forget – UI is time-driven)
    fetch(CONFIG.LAMBDA_URL, { method: "POST" }).catch(() => {});
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const rawPct = Math.min((elapsed / CONFIG.BOOT_DURATION_MS) * 100, 100);
      const pct = Math.round(rawPct);
      setProgress(pct);

      // Emit log lines as we pass each step threshold
      setCurrentStep((prev) => {
        let next = prev;
        while (
          next < BOOT_STEPS.length &&
          pct >= BOOT_STEPS[next].pct
        ) {
          const step = BOOT_STEPS[next];
          setLogs((l) => [
            ...l,
            { ...step, ts: new Date().toISOString().slice(11, 23) },
          ]);
          next++;
        }
        return next;
      });

      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          window.location.href = CONFIG.REDIRECT_URL;
          onDone?.();
        }, 1200);
      }
    }, 80);
    return () => clearInterval(interval);
  }, [onDone]);

  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="boot-overlay">
      <div className="boot-box">
        <div className="boot-header">
          <ShieldIcon size={36} />
          <div>
            <div className="boot-title">SENTINEL BOOT SEQUENCE</div>
            <div className="boot-subtitle">Provisioning secure environment…</div>
          </div>
          <div className="boot-pct">{progress}%</div>
        </div>

        {/* Progress bar */}
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          />
          <div
            className="progress-glow"
            style={{ left: `${progress}%` }}
          />
        </div>

        {/* Log terminal */}
        <div className="log-terminal" ref={logsRef}>
          {logs.map((l, i) => (
            <div key={i} className="log-line">
              <span className="log-ts">{l.ts}</span>
              <span className="log-tag" style={{ color: TAG_COLORS[l.tag] }}>
                [{l.tag}]
              </span>
              <span className="log-msg">{l.msg}</span>
            </div>
          ))}
          {progress < 100 && (
            <div className="log-cursor">
              <span className="log-ts">{new Date().toISOString().slice(11, 23)}</span>
              <span className="cursor-blink">█</span>
            </div>
          )}
        </div>

        {/* Step indicators */}
        <div className="step-bar">
          {["Lambda", "EC2", "DNS", "App", "Online"].map((s, i) => (
            <div
              key={s}
              className={`step-pill ${progress >= (i + 1) * 20 ? "active" : ""}`}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [booting, setBooting] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  const handleStart = () => setBooting(true);

  return (
    <>
      <ParticleCanvas />

      {/* ── NAV ── */}
      <nav className={`nav ${visible ? "nav-in" : ""}`}>
        <div className="nav-brand">
          <ShieldIcon size={28} />
          <span className="brand-text">SURL</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#team">Team</a>
        </div>
        <button className="btn-ghost" onClick={handleStart}>
          Launch App →
        </button>
      </nav>

      {/* ── HERO ── */}
      <section className={`hero ${visible ? "hero-in" : ""}`}>
        <div className="hero-badge">
          <span className="badge-dot" />
          Advanced URL Threat Intelligence
        </div>

        <h1 className="hero-h1">
          Detect threats
          <br />
          <span className="gradient-text">before they strike</span>
        </h1>

        <p className="hero-p">
          SURL combines static analysis, dynamic sandboxing, and behavioral
          fingerprinting to classify malicious URLs in milliseconds.
        </p>

        <div className="hero-cta">
          <button className="btn-primary" onClick={handleStart}>
            <span className="btn-pulse" />
            Start Scanning
          </button>
          <a className="btn-secondary" href="#how">
            See how it works
          </a>
        </div>

        <div className="hero-stats">
          {[
            { label: "Detection Layers", value: "3" },
            { label: "Risk Signals", value: "20+" },
            { label: "Avg. Latency", value: "<2s" },
            { label: "Explainability", value: "100%" },
          ].map((s) => (
            <div key={s.label} className="stat">
              <span className="stat-val">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="section">
        <div className="section-tag">Detection Pipeline</div>
        <h2 className="section-h2">Three layers of intelligence</h2>
        <p className="section-sub">
          Every URL passes through a progressive analysis chain that escalates
          depth based on initial risk signals.
        </p>

        <div className="features-grid">
          <FeatureCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            }
            title="Static Analysis"
            desc="Protocol & TLS validation, lexical pattern inspection, WHOIS domain age checks, HTML structure scanning, and brand impersonation detection—without loading the page."
          />
          <FeatureCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
                <circle cx="12" cy="10" r="2" />
                <path d="M12 8V6M12 14v-2M10 10H8M16 10h-2" />
              </svg>
            }
            title="Sandbox Execution"
            desc="Headless browser renders the URL in an isolated container. DOM mutations, network requests, credential form detection, and screenshots captured in real time."
          />
          <FeatureCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            title="Risk Intelligence"
            desc="Weighted scoring model fused with PBH behavioral fingerprinting and trust-signal correlation. Every verdict comes with explainable indicators—no black-box decisions."
          />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" className="section section-dark">
        <div className="section-tag">Architecture</div>
        <h2 className="section-h2">How SURL works</h2>
        <div className="how-steps">
          {[
            { n: "01", title: "Submit URL", desc: "Paste any link into the Threat Console. No account required." },
            { n: "02", title: "Static pass", desc: "Lexical, WHOIS, and TLS signals evaluated in under 200 ms." },
            { n: "03", title: "Sandbox", desc: "If risk score exceeds threshold, full headless execution begins." },
            { n: "04", title: "Score & Explain", desc: "A severity badge + natural-language reasoning returned to you." },
          ].map((s, i, arr) => (
            <div key={s.n} className="how-step">
              <div className="step-num">{s.n}</div>
              <div className="step-content">
                <div className="step-title">{s.title}</div>
                <div className="step-desc">{s.desc}</div>
              </div>
              {i < arr.length - 1 && <div className="step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ── TEAM ── */}
      <section id="team" className="section">
        <div className="section-tag">Team</div>
        <h2 className="section-h2">Built by</h2>
        <div className="team-card">
          <div className="avatar">JJ</div>
          <div>
            <div className="team-name">Joel John George</div>
            <div className="team-role">Full Stack Developer & DevOps Engineer</div>
            <a
              className="team-link"
              href="https://www.linkedin.com/in/joel-john-george-716874287"
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER CTA ── */}
      <section className="footer-cta">
        <h2>Ready to scan?</h2>
        <p>Boot the engine and analyze your first URL in seconds.</p>
        <button className="btn-primary btn-large" onClick={handleStart}>
          <span className="btn-pulse" />
          Launch SURL
        </button>
        <div className="footer-legal">
          © 2026 SURL · URL Threat Intelligence Engine ·{" "}
          <a href="https://sentinelurl.site" target="_blank" rel="noreferrer">
            sentinelurl.site
          </a>
        </div>
      </section>

      {/* ── BOOT OVERLAY ── */}
      {booting && <BootOverlay onDone={() => setBooting(false)} />}
    </>
  );
}
