import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("usuarios")
    .select("nombre, apellido_paterno, roles(nombre)")
    .eq("auth_user_id", user.id)
    .single();

  // Supabase tipa la relación como arreglo; en runtime es un objeto (many-to-one)
  const raw = data as {
    nombre: string;
    apellido_paterno: string | null;
    roles: { nombre: string } | { nombre: string }[] | null;
  } | null;
  const perfil = raw
    ? { ...raw, roles: Array.isArray(raw.roles) ? raw.roles[0] ?? null : raw.roles }
    : null;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50 overflow-hidden">
      <Sidebar perfil={perfil} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
