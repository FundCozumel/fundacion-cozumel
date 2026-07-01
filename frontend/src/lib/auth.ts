import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Rol } from "@/types";

export interface PerfilSesion {
  nombre: string;
  apellido_paterno: string | null;
  rol: Rol | "";
}

/**
 * Obtiene el perfil del usuario autenticado (Server Components).
 * Redirige a /login si no hay sesión.
 */
export async function getPerfil(): Promise<PerfilSesion> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, apellido_paterno, roles(nombre)")
    .eq("auth_user_id", user.id)
    .single();

  return {
    nombre: perfil?.nombre ?? "Usuario",
    apellido_paterno: perfil?.apellido_paterno ?? null,
    rol: ((perfil?.roles as unknown as { nombre: Rol } | null)?.nombre ?? "") as Rol | "",
  };
}

/**
 * Exige rol administrador. Redirige al dashboard si el usuario no lo es.
 * Usar en layouts/páginas de secciones exclusivas de administración.
 */
export async function requireAdmin(): Promise<PerfilSesion> {
  const perfil = await getPerfil();
  if (perfil.rol !== "administrador") {
    redirect("/dashboard");
  }
  return perfil;
}
