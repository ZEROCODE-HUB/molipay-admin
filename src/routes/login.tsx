import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { MollyLogo } from "@/components/molly-logo";
import { useDemoMode } from "@/contexts/demo-mode";
import { useOnboarding, type TipoCuenta } from "@/lib/onboarding-store";
import { AuthShell, Field, PasswordField, PrimaryButton, validatePassword } from "@/components/onboarding";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, string | undefined>) => ({
    register: search.register as "pf" | "pj" | undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ingresar — Molly Money Life" },
      { name: "description", content: "Accede al portal de Molly Money Life. Modo demo disponible." },
    ],
  }),
  component: LoginPage,
});

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSuccess();
      }}
    >
      <Field label="Correo Electronico" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hola@empresa.com" />
      <PasswordField label="Contrasena" value={pw} onChange={setPw} />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => alert("Flujo de recuperacion de contrasena (demo)")}
          className="text-xs text-[#0A1628]/60 hover:text-[#C41E3A] underline underline-offset-2 transition-colors"
        >
          ¿Olvidaste tu contrasena?
        </button>
      </div>
      <div className="pt-1">
        <PrimaryButton type="submit">Iniciar sesion</PrimaryButton>
      </div>
      <div className="text-center text-xs text-[#0A1628]/60 space-y-2 pt-2">
        <p>
          ¿No tienes una cuenta?{" "}
          <Link to="/login" search={{ register: "pf" }} className="text-[#C41E3A] underline underline-offset-2 hover:opacity-80">
            Registrate
          </Link>
        </p>
        <p>
          <button
            type="button"
            onClick={() => alert("Correo reenviado (demo)")}
            className="text-[#0A1628]/60 hover:text-[#C41E3A] underline underline-offset-2 transition-colors"
          >
            ¿No te llego el email de verificacion?
          </button>
        </p>
      </div>
    </form>
  );
}

function RegisterForm({
  tipo,
  onSuccess,
  onSwitchToLogin,
}: {
  tipo: TipoCuenta;
  onSuccess: (data: { nombre: string; apellido: string; fechaNac: string; email: string }) => void;
  onSwitchToLogin?: () => void;
}) {
  const [f, setF] = useState({ nombre: "", apellido: "", fechaNac: "", email: "", pw: "", pw2: "" });
  const [terms, setTerms] = useState(false);
  const [touched, setTouched] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email);
  const pwOk = validatePassword(f.pw);
  const pwMatch = f.pw && f.pw === f.pw2;
  const valid = f.nombre && f.apellido && f.fechaNac && emailOk && pwOk && pwMatch && terms;

  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!valid) return;
        onSuccess({ nombre: f.nombre, apellido: f.apellido, fechaNac: f.fechaNac, email: f.email });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field
          label="Nombre"
          value={f.nombre}
          onChange={(e) => setF({ ...f, nombre: e.target.value })}
          error={touched && !f.nombre ? "Requerido" : undefined}
        />
        <Field
          label="Apellido"
          value={f.apellido}
          onChange={(e) => setF({ ...f, apellido: e.target.value })}
          error={touched && !f.apellido ? "Requerido" : undefined}
        />
      </div>
      <Field
        label="Fecha de Nacimiento"
        type="date"
        value={f.fechaNac}
        onChange={(e) => setF({ ...f, fechaNac: e.target.value })}
        error={touched && !f.fechaNac ? "Requerido" : undefined}
      />
      <Field
        label="Correo Electronico"
        type="email"
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
        placeholder="nombre@dominio.com"
        error={touched && !emailOk ? "Ingresa un email valido" : undefined}
      />
      <PasswordField
        label="Contrasena"
        value={f.pw}
        onChange={(v) => setF({ ...f, pw: v })}
        showRules
        error={touched && !pwOk ? "La contrasena no cumple los requisitos" : undefined}
      />
      <PasswordField
        label="Confirmar Contrasena"
        value={f.pw2}
        onChange={(v) => setF({ ...f, pw2: v })}
        error={touched && !pwMatch ? "Las contrasenas no coinciden" : undefined}
      />

      <label className="flex items-start gap-2.5 text-xs text-[#0A1628]/75 pt-1">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5 accent-[#C41E3A]"
        />
        <span>
          He leido y acepto los{" "}
          <a href="/legales/terminos" className="underline underline-offset-2 hover:text-[#C41E3A]">
            Terminos y Condiciones
          </a>
          .
        </span>
      </label>

      <div className="pt-1">
        <PrimaryButton type="submit" disabled={!valid}>
          Registrarse
        </PrimaryButton>
      </div>

      <div className="text-center text-xs text-[#0A1628]/60 space-y-2 pt-2">
        <p>
          ¿Ya tienes una cuenta?{" "}
          <button type="button" onClick={onSwitchToLogin} className="text-[#C41E3A] underline underline-offset-2 hover:opacity-80">
            Inicia Sesion
          </button>
        </p>
        <p>
            {tipo === "juridica" ? (
            <Link to="/login" search={{ register: "pf" }} className="text-[#0A1628]/60 hover:text-[#C41E3A] underline underline-offset-2 transition-colors">
              ¿Eres una persona fisica? Registrarse como persona fisica
            </Link>
          ) : (
            <Link to="/login" search={{ register: "pj" }} className="text-[#0A1628]/60 hover:text-[#C41E3A] underline underline-offset-2 transition-colors">
              ¿Quieres registrar a tu empresa? Registrar Empresa
            </Link>
          )}
        </p>
      </div>
    </form>
  );
}

function LoginPage() {
  const search = Route.useSearch();
  const register = search.register;
  const [tab, setTab] = useState<"login" | "register">(register ? "register" : "login");
  const [tipoCuenta, setTipoCuenta] = useState<TipoCuenta>(register === "pj" ? "juridica" : "fisica");
  const { setRole } = useDemoMode();
  const store = useOnboarding();
  const navigate = useNavigate();

  const enterAs = () => {
    setRole("empresa");
    store.setTipo(store.tipoCuenta ?? "juridica");
    if (!store.emailValidado) {
      navigate({ to: "/registro/exito" });
    } else if (!store.aprobado) {
      const dp = store.datosPersonales;
      if (!dp.genero || !dp.cuitCuil || !dp.ocupacion) {
        navigate({ to: "/onboarding/datos-personales" });
      } else if (store.tipoCuenta === "juridica") {
        const de = store.datosEmpresa;
        if (!de.cuit || !de.nombreLegal) {
          navigate({ to: "/onboarding/datos-empresa" });
        } else if (!store.kyc.direccion) {
          navigate({ to: "/onboarding/kyc" });
        } else {
          navigate({ to: "/onboarding/en-proceso" });
        }
      } else if (!store.kyc.direccion) {
        navigate({ to: "/onboarding/kyc" });
      } else {
        navigate({ to: "/onboarding/en-proceso" });
      }
    } else {
      navigate({ to: "/app" });
    }
  };

  const handleRegisterSuccess = (data: { nombre: string; apellido: string; fechaNac: string; email: string }) => {
    store.reset();
    store.setTipo(tipoCuenta);
    store.setRegistro(data);
    navigate({ to: "/registro/exito" });
  };

  return (
    <AuthShell
      leftEyebrow="Molipay · Acceso"
      leftTitle="Tu plataforma de pagos, sin intermediarios."
      leftBody="Molipay opera bajo normativa BCRA. Tus datos viajan cifrados y se almacenan bajo los estandares del sistema financiero argentino."
    >
      {/* Tabs */}
      <div className="grid grid-cols-2 border-b mb-8" style={{ borderColor: "rgba(10,22,40,0.15)" }}>
        <button
          onClick={() => setTab("login")}
          className={`pb-3 text-sm font-semibold transition-colors ${
            tab === "login"
              ? "border-b-2 text-[#0A1628]"
              : "text-[#0A1628]/50"
          }`}
          style={{
            borderBottomColor: tab === "login" ? "#C41E3A" : "transparent",
          }}
        >
          Iniciar sesion
        </button>
        <button
          onClick={() => setTab("register")}
          className={`pb-3 text-sm font-semibold transition-colors ${
            tab === "register"
              ? "border-b-2 text-[#0A1628]"
              : "text-[#0A1628]/50"
          }`}
          style={{
            borderBottomColor: tab === "register" ? "#C41E3A" : "transparent",
          }}
        >
          Crear cuenta
        </button>
      </div>

      {/* Account type selector (only visible on register tab) */}
      {tab === "register" && (
        <div className="flex gap-3 mb-6">
          <button
            type="button"
            onClick={() => setTipoCuenta("fisica")}
            className={`flex-1 h-11 text-xs font-semibold tracking-wide transition-all ${
              tipoCuenta === "fisica"
                ? "bg-[#0A1628] text-white"
                : "bg-white text-[#0A1628]/60 border border-[rgba(10,22,40,0.15)]"
            }`}
            style={{ borderRadius: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Persona Fisica
          </button>
          <button
            type="button"
            onClick={() => setTipoCuenta("juridica")}
            className={`flex-1 h-11 text-xs font-semibold tracking-wide transition-all ${
              tipoCuenta === "juridica"
                ? "bg-[#0A1628] text-white"
                : "bg-white text-[#0A1628]/60 border border-[rgba(10,22,40,0.15)]"
            }`}
            style={{ borderRadius: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}
          >
            Persona Juridica
          </button>
        </div>
      )}

      {/* Form */}
      <div className="relative overflow-hidden">
        <div className="transition-all duration-300 ease-in-out" style={{ opacity: 1, transform: "translateX(0)" }}>
          {tab === "login" ? (
            <LoginForm onSuccess={enterAs} />
          ) : (
            <RegisterForm tipo={tipoCuenta} onSuccess={handleRegisterSuccess} onSwitchToLogin={() => setTab("login")} />
          )}
        </div>
      </div>

      {/* Demo access */}
      {tab === "login" && (
        <div className="mt-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t" style={{ borderColor: "rgba(10,22,40,0.15)" }} /></div>
            <div className="relative flex justify-center">
              <span className="bg-[#F7F5F0] px-3 text-xs text-[#0A1628]/50 uppercase tracking-wide">Acceso demo</span>
            </div>
          </div>
          <button
            onClick={() => { setRole("empresa"); navigate({ to: "/app" }); }}
            className="w-full mt-5 h-11 text-sm font-semibold transition-colors"
            style={{
              border: "1px solid rgba(10,22,40,0.2)",
              borderRadius: 2,
              color: "#0A1628",
              background: "transparent",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontSize: "0.75rem",
            }}
          >
            Demo empresa
          </button>
        </div>
      )}
    </AuthShell>
  );
}
