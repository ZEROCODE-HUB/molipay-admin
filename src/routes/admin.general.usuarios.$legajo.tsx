import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { UserModal, type UserData } from "@/components/user-modal";
import { getUserByLegajo, setUserByLegajo } from "@/lib/users";

export const Route = createFileRoute("/admin/general/usuarios/$legajo")({
  head: () => ({
    meta: [{ title: "Ficha de usuario — Admin Molly" }],
  }),
  component: UsuarioDetailPage,
});

function UsuarioDetailPage() {
  const { legajo } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<UserData | null>(() => getUserByLegajo(legajo ?? "") ?? null);

  const onUserChange = (updated: UserData) => {
    setUserByLegajo(updated);
    setUser(updated);
  };

  const backToList = () => {
    const isJuridica = user?.tipoPersona === "juridica";
    navigate({ to: isJuridica ? "/admin/general/usuarios/juridicas" : "/admin/general/usuarios" });
  };

  if (!user) {
    return (
      <>
        <PageHeader
          title="Usuario no encontrado"
          action={
            <Link
              to="/admin/general/usuarios"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary"
            >
              <ChevronLeft size={16} /> Volver a usuarios
            </Link>
          }
        />
        <EmptyState
          title="Usuario no encontrado"
          description={`No se encontró ningún usuario con legajo “${legajo ?? ""}”. Verificá el legajo e ingresá nuevamente.`}
          action={
            <Link
              to="/admin/general/usuarios"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              <ChevronLeft size={16} /> Volver a la lista de usuarios
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <div className="w-full">
        <button
          type="button"
          onClick={backToList}
          className="inline-flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-ring/20"
        >
          <ChevronLeft size={16} />
          Volver a la lista
        </button>

        <div className="min-w-0">
          <h1 className="font-display text-xl md:text-2xl font-semibold tracking-tight text-foreground truncate">
            {user.nombre} {user.apellido}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 truncate">
            {user.legajo} · {user.email}
          </p>
        </div>

        {/* Reutiliza el render del detalle (pestañas, edición, sub-modales) a pantalla completa. */}
        <UserModal open user={user} onClose={backToList} inline onUserChange={onUserChange} />
      </div>
    </>
  );
}
