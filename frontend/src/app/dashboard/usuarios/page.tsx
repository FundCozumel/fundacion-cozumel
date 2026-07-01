import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ShieldCheck } from "lucide-react";

export default async function UsuariosPage() {
  const supabase = await createSupabaseServerClient();

  const { data: usuarios } = await supabase
    .from("usuarios")
    .select("id, nombre, apellido_paterno, apellido_materno, correo, estatus, roles(nombre)")
    .order("nombre");

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck size={20} className="text-brand-500" />
          Usuarios del sistema
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Administradores y coordinadores con acceso a la plataforma
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {!usuarios || usuarios.length === 0 ? (
          <p className="text-sm text-gray-300 text-center py-12">
            No hay usuarios registrados.
          </p>
        ) : (
          <>
            {/* Escritorio */}
            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Nombre</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Correo</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Rol</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const rol = (u.roles as unknown as { nombre: string } | null)?.nombre ?? "—";
                  return (
                    <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-800">
                        {u.nombre} {u.apellido_paterno} {u.apellido_materno}
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{u.correo}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${rol === "administrador" ? "bg-brand-50 text-brand-700" : "bg-forest-50 text-forest-600"}`}>
                          {rol}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.estatus ? "bg-forest-50 text-forest-600" : "bg-gray-100 text-gray-400"}`}>
                          {u.estatus ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Móvil */}
            <ul className="md:hidden divide-y divide-gray-50">
              {usuarios.map((u) => {
                const rol = (u.roles as unknown as { nombre: string } | null)?.nombre ?? "—";
                return (
                  <li key={u.id} className="p-4">
                    <p className="text-sm font-medium text-gray-800">
                      {u.nombre} {u.apellido_paterno}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{u.correo}</p>
                    <div className="flex gap-2 mt-1.5">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${rol === "administrador" ? "bg-brand-50 text-brand-700" : "bg-forest-50 text-forest-600"}`}>
                        {rol}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${u.estatus ? "bg-forest-50 text-forest-600" : "bg-gray-100 text-gray-400"}`}>
                        {u.estatus ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      <p className="text-xs text-gray-300 mt-4">
        Los usuarios nuevos se crean desde el panel de Supabase Auth y se
        registran en la tabla <code className="text-gray-400">usuarios</code>.
      </p>
    </div>
  );
}
