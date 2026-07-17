import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Wallet,
  Globe2,
  Building2,
  Smartphone,
  ShieldCheck,
  FileCheck2,
  BarChart3,
  Cog,
  Briefcase,
  Lock,
  HeartHandshake,
  Plane,
  Target,
  Compass,
} from "lucide-react";
import { MollyLogo } from "@/components/molly-logo";
import heroShotSrc from "@/assets/Capturadepantalla.png";
import ogImageSrc from "@/assets/miniatura.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MoliPay — Soluciones financieras digitales" },
      {
        name: "description",
        content:
          "MoliPay integra pagos, cobros y remesas para individuos, PyMEs y empresas en América Latina. Plataforma regulada bajo marco normativo BCRA.",
      },
      { property: "og:title", content: "MoliPay — Soluciones financieras digitales" },
      {
        property: "og:description",
        content:
          "Cuenta de pago, Crossborder, CVU Collect y Billetera. Plataforma tecnológica escalable y regulada.",
      },
      { property: "og:image", content: ogImageSrc },
      { property: "og:image:width", content: "1166" },
      { property: "og:image:height", content: "552" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: ogImageSrc },
    ],
  }),
  component: Landing,
});

/* ---------- Design primitives ---------- */

const heading = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 600,
  letterSpacing: "-0.01em",
} as const;

const headingHeavy = {
  fontFamily: "Inter, sans-serif",
  fontWeight: 700,
  letterSpacing: "-0.02em",
} as const;

const mono = {
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  textTransform: "uppercase" as const,
  letterSpacing: "0.14em",
  fontSize: "0.72rem",
  fontWeight: 500,
};

function Eyebrow({
  children,
  tone = "ink",
}: {
  children: React.ReactNode;
  tone?: "ink" | "accent" | "paper";
}) {
  const color =
    tone === "accent" ? "#0891B2" : tone === "paper" ? "rgba(245,246,248,0.7)" : "#6B7280";
  return <div style={{ ...mono, color }}>{children}</div>;
}

/* Glass card on light background */
function GlassCard({
  children,
  padding,
  className = "",
}: {
  children: React.ReactNode;
  padding?: string;
  className?: string;
}) {
  return (
    <div
      className={`transition-all duration-300 hover:-translate-y-1 ${className}`}
      style={{
        padding: padding ?? undefined,
        background: "#FFFFFF",
        border: "1px solid #E2E8F0",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      {children}
    </div>
  );
}

/* ---------- Page ---------- */

function Landing() {
  return (
    <div style={{ background: "#FFFFFF", color: "#131A2A" }}>
      <SiteHeader />
      <Hero />
      <LedgerStrip />
      <Servicios />
      <ContamosCon />
      <MisionVision />
      <PorQueElegirnos />
      <RegulatoryStrip />
      <SiteFooter />
    </div>
  );
}

/* ---------- Header ---------- */

function SiteHeader() {
  return (
    <header
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid #D8DCE3",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between gap-3">
        <MollyLogo size={32} />
        <nav
          className="hidden md:flex items-center gap-8 lg:gap-10"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "0.975rem",
            fontWeight: 500,
            color: "#0A1628",
          }}
        >
          <a href="#servicios" className="hover:text-[#C8102E] transition-colors">
            Servicios
          </a>
          <a href="#nosotros" className="hover:text-[#C8102E] transition-colors">
            Nosotros
          </a>
          <a href="#contacto" className="hover:text-[#C8102E] transition-colors">
            Contacto
          </a>
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/login"
            search={{ register: undefined }}
            className="hidden md:inline-flex h-10 items-center px-4 transition-colors hover:bg-[#0A1628]/5"
            style={{
              border: "1px solid #0A1628",
              color: "#0A1628",
              borderRadius: 8,
              fontFamily: "Inter, sans-serif",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Inicia sesion
          </Link>
          <Link
            to="/login"
            search={{ register: "pf" }}
            className="hidden sm:inline-flex h-10 items-center px-4 transition-colors hover:bg-[#0A1628]/5"
            style={{
              border: "1px solid #0A1628",
              color: "#0A1628",
              borderRadius: 8,
              fontFamily: "Inter, sans-serif",
              fontSize: "0.9rem",
              fontWeight: 500,
            }}
          >
            Registrate
          </Link>
          <Link
            to="/login"
            search={{ register: "pj" }}
            className="inline-flex h-9 sm:h-10 items-center px-3 sm:px-4 text-white transition-colors hover:opacity-90 whitespace-nowrap"
            style={{
              background: "#C8102E",
              borderRadius: 8,
              fontFamily: "Inter, sans-serif",
              fontSize: "0.8125rem",
              fontWeight: 500,
            }}
          >
            <span className="hidden sm:inline">Registra tu empresa</span>
            <span className="sm:hidden">Registrar</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function DashboardMockup() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: 16,
        padding: "0.5rem",
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}
    >
      <img
        src={heroShotSrc}
        alt="Panel de control MoliPay"
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          borderRadius: 12,
        }}
      />
    </div>
  );
}

function Hero() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        isolation: "isolate",
        background: "linear-gradient(135deg, #0A1628 0%, #16213E 50%, #1C2D50 100%)",
      }}
    >
      {/* Dot-grid pattern */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          pointerEvents: "none",
        }}
      />

      {/* Teal accent glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-15%",
          right: "5%",
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(8,145,178,0.10), transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Red accent glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-10%",
          left: "-5%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(200,16,46,0.07), transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20 lg:pt-20 lg:pb-24">
        <div className="grid lg:grid-cols-2 lg:gap-14 items-center">
          {/* Text column */}
          <div>
            <Eyebrow tone="accent">Money Life S.R.L. — Plataforma financiera digital</Eyebrow>
            <h1
              style={{
                ...headingHeavy,
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                lineHeight: 1.05,
                marginTop: "1.5rem",
                maxWidth: "26ch",
                color: "#F5F6F8",
              }}
            >
              Soluciones financieras para todos
            </h1>
            <p
              className="mt-6 max-w-lg"
              style={{
                fontFamily: "Inter, sans-serif",
                color: "rgba(245,246,248,0.72)",
                fontSize: "1rem",
                lineHeight: 1.65,
              }}
            >
              Integramos en una sola plataforma servicios de pagos y cobros para Individuos, PyMEs y
              Empresas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#servicios"
                className="inline-flex h-12 items-center gap-2 px-7 text-sm font-medium text-white transition-colors hover:opacity-90"
                style={{ background: "#C8102E", borderRadius: 8 }}
              >
                Conoce mas <ArrowRight size={16} />
              </a>
              <a
                href="#contacto"
                className="inline-flex h-12 items-center px-7 text-sm font-medium transition-colors hover:bg-white/10"
                style={{
                  border: "1px solid rgba(245,246,248,0.4)",
                  color: "#F5F6F8",
                  borderRadius: 8,
                }}
              >
                Contactanos
              </a>
            </div>
          </div>

          {/* Mockup column — hidden on small screens */}
          <div className="hidden lg:block">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Ledger strip ---------- */

function LedgerStrip() {
  const items = [
    ["Entidad registrada", "Money Life S.R.L."],
    ["Cobertura", "América Latina"],
    ["Compliance", "Marco normativo BCRA"],
    ["Plataforma", "100% digital"],
  ];
  return (
    <section
      style={{
        background: "#16213E",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        color: "#F5F6F8",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {items.map(([label, value], i) => (
            <div
              key={label}
              className="py-3 md:py-7 px-2 md:px-6"
              style={{ borderLeft: i === 0 ? "none" : "1px solid rgba(255,255,255,0.12)" }}
            >
              <div style={{ ...mono, color: "#0891B2", fontSize: "0.6rem" }}>{label}</div>
              <div
                className="mt-1 md:mt-2"
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: "clamp(0.7rem, 2.5vw, 0.875rem)",
                  color: "#F5F6F8",
                  letterSpacing: "0.02em",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Servicios ---------- */

function Servicios() {
  const items = [
    {
      icon: Wallet,
      t: "Cuenta de Pago",
      d: "CVU para enviar y recibir dinero de cuentas bancarias y billeteras virtuales de manera ágil y segura.",
    },
    {
      icon: Globe2,
      t: "Crossborder",
      d: "Servicios de transferencias internacionales y remesas con cobertura en América Latina.",
    },
    {
      icon: Building2,
      t: "CVU Collect",
      d: "Soluciones de recaudación para desarrolladores inmobiliarios, consorcios e inmobiliarias.",
    },
    {
      icon: Smartphone,
      t: "Billetera",
      d: "QR, tarjetas prepagas físicas y virtuales, pagos NFC, wireless y pagos de servicios para individuos. Para comercios: QR estático y dinámico, Smartpos y link de pago.",
    },
  ];
  return (
    <section
      id="servicios"
      style={{
        background: "linear-gradient(180deg, #F5F6F8 0%, #EDF0F4 100%)",
        borderTop: "1px solid #D8DCE3",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Subtle blurred accent for glass depth */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "20%",
          left: "-8%",
          width: 420,
          height: 420,
          background: "radial-gradient(circle, rgba(200,16,46,0.08), transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-20 md:py-32">
        <Eyebrow tone="accent">Servicios</Eyebrow>
        <h2
          style={{
            ...heading,
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            lineHeight: 1.1,
            marginTop: "1rem",
            maxWidth: "20ch",
          }}
        >
          Nuestros Servicios
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-12 md:mt-16">
          {items.map(({ icon: Icon, t, d }) => (
            <GlassCard key={t} className="flex flex-col h-full p-5 sm:p-7">
              <div
                style={{ height: 1, background: "#0891B2", width: 32, marginBottom: "1.5rem" }}
              />
              <Icon size={22} strokeWidth={1.4} color="#0A1628" />
              <h3
                style={{
                  ...heading,
                  fontSize: "1.375rem",
                  color: "#131A2A",
                  marginTop: "1rem",
                  lineHeight: 1.2,
                }}
              >
                {t}
              </h3>
              <p
                className="mt-3"
                style={{
                  fontFamily: "Inter, sans-serif",
                  color: "#4B5563",
                  fontSize: "0.9375rem",
                  lineHeight: 1.65,
                }}
              >
                {d}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Contamos con ---------- */

function ContamosCon() {
  const items = [
    {
      icon: Cog,
      t: "Plataforma Tecnológica",
      d: "Sistema escalable y seguro que garantiza el cumplimiento de normas nacionales y compliance.",
    },
    {
      icon: ShieldCheck,
      t: "Compliance Integral",
      d: "Políticas y procedimientos personalizados garantizando el cumplimiento normativo.",
    },
    {
      icon: FileCheck2,
      t: "Reporting",
      d: "Informes y declaraciones obligatorias ante autoridades competentes.",
    },
    {
      icon: BarChart3,
      t: "Administración",
      d: "Seguimiento y control de gestión de toda la actividad.",
    },
    {
      icon: Briefcase,
      t: "Management",
      d: "Acompañamiento estratégico para el crecimiento y desarrollo empresarial.",
    },
  ];
  return (
    <section
      id="nosotros"
      style={{
        background: "linear-gradient(180deg, #EDF0F4 0%, #F5F6F8 100%)",
        borderTop: "1px solid #D8DCE3",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "10%",
          right: "-6%",
          width: 420,
          height: 420,
          background: "radial-gradient(circle, rgba(30,58,138,0.08), transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
        <Eyebrow tone="accent">Capacidades</Eyebrow>
        <h2
          style={{
            ...heading,
            fontSize: "clamp(2rem, 3.5vw, 3rem)",
            lineHeight: 1.1,
            marginTop: "1rem",
          }}
        >
          Contamos con
        </h2>
        {/* 2 cols mobile, 3 tablet, 5 desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mt-12 md:mt-16">
          {items.map(({ icon: Icon, t, d }) => (
            <CapabilityCard key={t} Icon={Icon} t={t} d={d} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CapabilityCard({
  Icon,
  t,
  d,
}: {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
  t: string;
  d: string;
}) {
  return (
    <GlassCard className="h-full flex flex-col p-4 sm:p-5">
      <div
        style={{
          width: 42,
          height: 42,
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          border: "1px solid rgba(8,145,178,0.4)",
          borderRadius: 8,
          background: "rgba(8,145,178,0.06)",
        }}
      >
        <Icon size={18} strokeWidth={1.5} color="#0A1628" />
      </div>
      <h3
        className="mt-4"
        style={{
          ...heading,
          fontSize: "1rem",
          color: "#131A2A",
          lineHeight: 1.25,
        }}
      >
        {t}
      </h3>
      <p
        className="mt-2"
        style={{
          fontFamily: "Inter, sans-serif",
          color: "#4B5563",
          fontSize: "0.8125rem",
          lineHeight: 1.55,
        }}
      >
        {d}
      </p>
    </GlassCard>
  );
}

/* ---------- Misión / Visión ---------- */

function MisionVision() {
  return (
    <section
      style={{ background: "#0A1628", color: "#F5F6F8", position: "relative", overflow: "hidden" }}
    >
      {/* Ambient glow */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "-10%",
          left: "40%",
          width: 600,
          height: 600,
          background: "radial-gradient(circle, rgba(8,145,178,0.10), transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
        <div className="grid md:grid-cols-2 gap-8">
          {/* Misión */}
          <article
            style={{
              padding: "2.5rem 2.25rem 2.75rem",
              background:
                "linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Target size={22} strokeWidth={1.4} color="#0891B2" />
              <div style={{ ...mono, color: "#0891B2", fontSize: "0.65rem" }}>01 — Misión</div>
            </div>
            <h3
              style={{
                ...heading,
                fontSize: "clamp(1.75rem, 2.4vw, 2.15rem)",
                color: "#F5F6F8",
                marginTop: "1.25rem",
                lineHeight: 1.15,
              }}
            >
              Facilitar la gestión digital de cobros y pagos.
            </h3>
            <p
              className="mt-6"
              style={{
                fontFamily: "Inter, sans-serif",
                color: "rgba(245,246,248,0.76)",
                fontSize: "1rem",
                lineHeight: 1.7,
              }}
            >
              Proporcionar soluciones financieras seguras, transparentes y simples que faciliten la
              gestión de cobros y pagos para todos nuestros usuarios en un entorno digital en
              constante evolución.
            </p>
          </article>

          {/* Visión */}
          <article
            style={{
              padding: "2.5rem 2.25rem 2.75rem",
              background: "#16213E",
              border: "1px solid rgba(8,145,178,0.35)",
              borderRadius: 12,
              position: "relative",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Compass size={22} strokeWidth={1.4} color="#0891B2" />
              <div style={{ ...mono, color: "#0891B2", fontSize: "0.65rem" }}>02 — Visión</div>
            </div>
            <h3
              style={{
                ...heading,
                fontSize: "clamp(1.75rem, 2.4vw, 2.15rem)",
                color: "#F5F6F8",
                marginTop: "1.25rem",
                lineHeight: 1.15,
              }}
            >
              Ser un referente Fintech en la región.
            </h3>
            <p
              className="mt-6"
              style={{
                fontFamily: "Inter, sans-serif",
                color: "rgba(245,246,248,0.76)",
                fontSize: "1rem",
                lineHeight: 1.7,
              }}
            >
              Posicionarnos como un referente en el sector Fintech, acompañando la evolución de
              cobros y pagos digitales con soluciones ágiles y simples.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

/* ---------- ¿Por qué elegirnos? ---------- */

function PorQueElegirnos() {
  const items = [
    {
      icon: Lock,
      t: "Tecnología Segura",
      d: "Plataforma diseñada para ser dinámica, escalable y segura, cumpliendo con todas las normativas vigentes.",
    },
    {
      icon: HeartHandshake,
      t: "Atención Personalizada",
      d: "Acompañamos a nuestros clientes con una atención cercana, atendiendo todas sus necesidades.",
    },
    {
      icon: Plane,
      t: "Alcance Internacional",
      d: "Operaciones en múltiples países de América Latina con alianzas estratégicas sólidas.",
    },
  ];
  return (
    <section
      style={{
        background: "#FFFFFF",
        borderTop: "1px solid #D8DCE3",
        position: "relative",
      }}
    >
      <div className="relative max-w-6xl mx-auto px-6 py-20 md:py-32">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 md:mb-16">
          <div>
            <Eyebrow tone="accent">Diferenciales</Eyebrow>
            <h2
              style={{
                ...heading,
                fontSize: "clamp(2rem, 3.5vw, 3rem)",
                lineHeight: 1.1,
                marginTop: "1rem",
              }}
            >
              ¿Por qué elegirnos?
            </h2>
          </div>
          <p
            className="md:max-w-sm"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "0.9375rem",
              color: "#4B5563",
              lineHeight: 1.65,
            }}
          >
            Tres pilares que definen la forma en la que trabajamos y nos diferencian del resto del
            sector.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {items.map(({ icon: Icon, t, d }) => (
            <article
              key={t}
              className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(10,22,40,0.25)]"
              style={{
                padding: "2.25rem 1.75rem 2rem",
                background: "#FFFFFF",
                color: "#131A2A",
                borderRadius: 12,
                border: "1px solid #D8DCE3",
                borderTop: "2px solid #C8102E",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 999,
                  background: "rgba(200,16,46,0.08)",
                  border: "1px solid rgba(200,16,46,0.25)",
                }}
              >
                <Icon size={22} strokeWidth={1.5} color="#C8102E" />
              </div>

              <h3
                style={{
                  ...heading,
                  fontSize: "1.375rem",
                  marginTop: "1.5rem",
                  color: "#131A2A",
                  lineHeight: 1.2,
                }}
              >
                {t}
              </h3>
              <div
                style={{
                  height: 1,
                  width: 32,
                  background: "#0891B2",
                  marginTop: "0.875rem",
                  marginBottom: "0.875rem",
                }}
              />
              <p
                style={{
                  fontFamily: "Inter, sans-serif",
                  color: "#4B5563",
                  fontSize: "0.9375rem",
                  lineHeight: 1.65,
                }}
              >
                {d}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Regulatory strip ---------- */

function RegulatoryStrip() {
  return (
    <section
      style={{
        background: "#16213E",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        color: "#F5F6F8",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-8 md:py-10 flex flex-col md:flex-row gap-6 md:items-center md:justify-between">
        <div className="flex items-center gap-5">
          <div
            style={{
              border: "1px solid #0891B2",
              padding: "0.5rem 0.85rem",
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: "0.7rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#F5F6F8",
            }}
          >
            BCRA
          </div>
          <div>
            <div style={{ ...mono, color: "#0891B2", fontSize: "0.65rem" }}>
              Usuarios financieros
            </div>
            <div
              className="mt-1"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "0.875rem",
                color: "rgba(245,246,248,0.85)",
              }}
            >
              Banco Central de la República Argentina — protección al usuario financiero.
            </div>
          </div>
        </div>
        <a
          href="https://www.usuariosfinancieros.gob.ar"
          target="_blank"
          rel="noreferrer"
          style={{ ...mono, color: "#F5F6F8", borderBottom: "1px solid #0891B2", paddingBottom: 2 }}
        >
          usuariosfinancieros.gob.ar →
        </a>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function SiteFooter() {
  return (
    <footer
      id="contacto"
      style={{
        background: "#0A1628",
        color: "#F5F6F8",
        borderTop: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-20 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-1">
          <div
            style={{
              background: "#F5F6F8",
              display: "inline-block",
              padding: "0.75rem 1rem",
              borderRadius: 4,
            }}
          >
            <MollyLogo size={32} />
          </div>
          <p
            className="mt-6"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "0.8125rem",
              color: "rgba(245,246,248,0.55)",
              lineHeight: 1.6,
              maxWidth: 260,
            }}
          >
            © 2026 MONEY LIFE S.R.L. Todos los derechos reservados.
          </p>
          <p className="mt-4" style={{ ...mono, color: "#0891B2", fontSize: "0.65rem" }}>
            PSPCP · Marco BCRA
          </p>
        </div>

        <div>
          <div style={{ ...mono, color: "#0891B2", fontSize: "0.65rem" }}>Enlaces útiles</div>
          <ul
            className="mt-5 space-y-3"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "0.9rem",
              color: "rgba(245,246,248,0.72)",
            }}
          >
            <li>
              <Link to="/legales/privacidad" className="hover:text-white transition-colors">
                Políticas de privacidad
              </Link>
            </li>
            <li>
              <Link to="/legales/terminos" className="hover:text-white transition-colors">
                Términos y condiciones
              </Link>
            </li>
            <li>
              <Link to="/legales/comisiones" className="hover:text-white transition-colors">
                Comisiones
              </Link>
            </li>
            <li>
              <Link to="/legales/arrepentimiento" className="hover:text-white transition-colors">
                Botón de arrepentimiento
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <div style={{ ...mono, color: "#0891B2", fontSize: "0.65rem" }}>Contactános</div>
          <ul
            className="mt-5 space-y-3"
            style={{
              fontFamily: "Inter, sans-serif",
              fontSize: "0.9rem",
              color: "rgba(245,246,248,0.72)",
            }}
          >
            <li>
              <a
                href="mailto:contacto@molipay.com.ar"
                className="hover:text-white transition-colors"
              >
                contacto@molipay.com.ar
              </a>
            </li>
            <li>
              <a href="mailto:admin@molipay.com.ar" className="hover:text-white transition-colors">
                admin@molipay.com.ar
              </a>
            </li>
            <li>
              <a
                href="mailto:reclamos@molipay.com.ar"
                className="hover:text-white transition-colors"
              >
                reclamos@molipay.com.ar
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div style={{ ...mono, color: "#0891B2", fontSize: "0.65rem" }}>Ente fiscalizador</div>
          <div
            className="mt-5"
            style={{
              border: "1px solid rgba(255,255,255,0.15)",
              padding: "1rem 1.15rem",
              background: "#16213E",
            }}
          >
            <div style={{ ...mono, color: "#0891B2", fontSize: "0.6rem" }}>BCRA</div>
            <div
              className="mt-1.5"
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "0.8125rem",
                color: "rgba(245,246,248,0.8)",
                lineHeight: 1.5,
              }}
            >
              Banco Central de la República Argentina
            </div>
            <a
              href="https://www.bcra.gob.ar"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block"
              style={{ ...mono, color: "#F5F6F8", fontSize: "0.6rem" }}
            >
              bcra.gob.ar →
            </a>
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div
          className="max-w-6xl mx-auto px-6 py-5 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"
          style={{
            fontFamily: "Inter, sans-serif",
            fontSize: "0.7rem",
            color: "rgba(245,246,248,0.45)",
          }}
        >
          <div>MONEY LIFE S.R.L. — CUIT 30-71000000-0</div>
          <div>
            Los fondos depositados no constituyen depósitos en una entidad financiera ni cuentan
            con la garantía de la Ley 24.485.
          </div>
        </div>
      </div>
    </footer>
  );
}
