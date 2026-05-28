import { useState, useEffect, useRef } from "react";
import sentinelViolet from "../sentinel_violet.png";

// ─── CONFIG ────────────────────────────────────────────────────────────────
const CONFIG = {
  LAMBDA_URL: "https://y2iqqe7272fka6ooesyniq5tnq0sginw.lambda-url.us-east-1.on.aws/",
  REDIRECT_URL: "https://live.sentinelurl.site",
  POLL_INTERVAL_MS: 5000,   // check every 5 s
  POLL_START_DELAY_MS: 6000, // first check after 6 s (EC2 won't be up before this)
};

// ─── TIMED STATUS MESSAGES ─────────────────────────────────────────────────
// Each entry appears after `delay` ms regardless of poll result.
const STATUS_TIMELINE = [
  { delay:    500, text: "Lambda function triggered",                     type: "success" },
  { delay:   2500, text: "EC2 instance starting up…",                     type: "info"    },
  { delay:   8000, text: "Cold start can take 30–90 seconds",             type: "warn"    },
  { delay:  20000, text: "Server auto-stops after 15 min of inactivity",  type: "warn"    },
  { delay:  40000, text: "Still warming up — please wait",                type: "muted"   },
  { delay:  75000, text: "Taking longer than usual, almost there…",       type: "muted"   },
];

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

// ─── BRAND ICON ───────────────────────────────────────────────────────────
function SentinelIcon({ size = 64 }) {
  return (
    <img
      src={sentinelViolet}
      alt=""
      aria-hidden="true"
      draggable="false"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
      }}
    />
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
function BootOverlay() {
  const [messages, setMessages]   = useState([]);
  const [dots, setDots]           = useState("");
  const [redirecting, setRedirecting] = useState(false);
  const pollTimer   = useRef(null);
  const timers      = useRef([]);

  const addMsg = (text, type) =>
    setMessages((prev) => [...prev, { id: Date.now() + Math.random(), text, type }]);

  useEffect(() => {
    // 1. Fire Lambda (fire-and-forget)
    fetch(CONFIG.LAMBDA_URL, { method: "POST" }).catch(() => {});

    // 2. Schedule informational messages
    STATUS_TIMELINE.forEach(({ delay, text, type }) => {
      const t = setTimeout(() => addMsg(text, type), delay);
      timers.current.push(t);
    });

    // 3. Poll the live site — resolves when EC2 is actually reachable
    const tryConnect = () => {
      fetch(CONFIG.REDIRECT_URL, { mode: "no-cors" })
        .then(() => {
          // Opaque response = server is up
          setRedirecting(true);
          addMsg("Server is live — redirecting now", "success");
          pollTimer.current = setTimeout(() => {
            window.location.href = CONFIG.REDIRECT_URL;
          }, 1800);
        })
        .catch(() => {
          // Network error = still down, retry
          pollTimer.current = setTimeout(tryConnect, CONFIG.POLL_INTERVAL_MS);
        });
    };
    pollTimer.current = setTimeout(tryConnect, CONFIG.POLL_START_DELAY_MS);

    // 4. Animate waiting dots
    const dotsInterval = setInterval(
      () => setDots((d) => (d.length >= 3 ? "" : d + ".")),
      500
    );

    return () => {
      timers.current.forEach(clearTimeout);
      clearTimeout(pollTimer.current);
      clearInterval(dotsInterval);
    };
  }, []);

  return (
    <div className="boot-overlay">
      <div className="boot-card">

        {/* Shield icon */}
        <div className={`boot-icon ${redirecting ? "boot-icon--done" : ""}`}>
          <SentinelIcon size={44} />
        </div>

        {/* Title + subtitle */}
        <div className="boot-head">
          <div className="boot-title">SURL IS STARTING</div>
          <div className="boot-subtitle">
            {redirecting
              ? "Redirecting you to the app…"
              : `Waiting for server${dots}`}
          </div>
        </div>

        {/* Indeterminate / complete progress bar */}
        <div className="boot-bar-track">
          <div className={`boot-bar-fill ${
            redirecting ? "boot-bar-fill--done" : "boot-bar-fill--running"
          }`} />
        </div>

        {/* Status messages */}
        <div className="boot-msgs">
          {messages.map((m) => (
            <div key={m.id} className={`boot-msg boot-msg--${m.type}`}>
              <span className="boot-msg-dot" />
              <span>{m.text}</span>
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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 100);
  }, []);

  // Close mobile menu on route change / scroll lock
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleStart = () => {
    setMenuOpen(false);
    setBooting(true);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <ParticleCanvas />

      {/* ── NAV ── */}
      <nav className={`nav ${visible ? "nav-in" : ""}`}>
        <div className="nav-brand">
          <SentinelIcon size={28} />
          <span className="brand-text">SURL</span>
        </div>
        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <a href="#team">Team</a>
        </div>
        <button className="btn-ghost nav-launch" onClick={handleStart}>
          Launch App →
        </button>
        {/* Hamburger – visible on mobile only */}
        <button
          className={`nav-hamburger ${menuOpen ? "open" : ""}`}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </nav>

      {/* ── MOBILE MENU DRAWER ── */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}>
        <a href="#features" onClick={closeMenu}>Features</a>
        <a href="#how" onClick={closeMenu}>How it works</a>
        <a href="#team" onClick={closeMenu}>Team</a>
        <button className="btn-ghost" onClick={handleStart}>Launch App →</button>
      </div>

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
      {booting && <BootOverlay />}
    </>
  );
}
