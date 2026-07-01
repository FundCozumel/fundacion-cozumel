import { requireAdmin } from "@/lib/auth";

// Guard de rol: toda la sección /dashboard/usuarios es exclusiva de administradores.
export default async function UsuariosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <>{children}</>;
}
