import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthShell, PrimaryButton, SecondaryButton } from "@/components/onboarding";
import { useOnboarding } from "@/lib/onboarding-store";
import { MollyLogo } from "@/components/molly-logo";

export const Route = createFileRoute("/registro/validar-email")({
  head: () => ({
    meta: [
      { title: "Validar correo — Molipay" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ValidarEmail,
});

function ValidarEmail() {
  const nav = useNavigate();
  const { registro, markEmailValidado } = useOnboarding();
  const nombre = registro.nombre ?? "";

  const validar = () => {
    markEmailValidado();
    nav({ to: "/registro/validacion-exitosa" });
  };

  return (
    <AuthShell leftEyebrow="Simulacion · Correo" leftTitle="Este es el email que recibirias en tu bandeja." step="Email de validacion">
      <div
        className="bg-white overflow-hidden"
        style={{ border: "1px solid rgba(10,22,40,0.1)", borderRadius: 2 }}
      >
        <div className="px-6 py-4 flex items-center justify-between" style={{ background: "#0A1628" }}>
          <MollyLogo variant="light" size={26} />
          <span
            className="text-white/60"
            style={{ fontFamily: "'IBM Plex Mono', ui-monospace, monospace", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase" }}
          >
            altas@molipay.com.ar
          </span>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-xs text-[#0A1628]/55">Asunto</p>
          <p className="mt-1 mb-6 text-sm font-semibold text-[#0A1628]">Valida tu cuenta Molipay</p>

          <div className="text-sm text-[#0A1628]/85 space-y-4 leading-relaxed">
            <p>Hola {nombre || "usuario"},</p>
            <p>Muchas gracias por registrarte en Molipay. Para poder ingresar a la plataforma primero debes validar el email. Para realizarlo hace clic en aqui.</p>
          </div>

          <div className="mt-8">
            <PrimaryButton onClick={validar}>Validar desde aqui</PrimaryButton>
          </div>

          <p className="mt-6 text-xs text-[#0A1628]/60 leading-relaxed">
            Si tenes una duda o inconveniente podes contactarnos en{" "}
            <a href="mailto:soporte@molipay.com.ar" className="underline underline-offset-2 hover:text-[#C41E3A]">
              soporte@molipay.com.ar
            </a>
            .
          </p>

          <p className="mt-4 text-sm font-semibold text-[#0A1628]/80">¡Muchas gracias!</p>

          <div className="mt-8 pt-4 border-t text-[10px] text-[#0A1628]/45 leading-relaxed space-y-1" style={{ borderColor: "rgba(10,22,40,0.1)" }}>
            <p>Enviado por Money Life S.R.L. — Argentina</p>
            <div className="flex gap-3">
              <a href="/" className="underline underline-offset-2 hover:text-[#C41E3A]">Molipay</a>
              <a href="/legales/terminos" className="underline underline-offset-2 hover:text-[#C41E3A]">Terminos y condiciones</a>
            </div>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
