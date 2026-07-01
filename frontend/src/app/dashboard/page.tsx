import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardCharts from "@/components/dashboard/DashboardCharts";
import {
  BookOpen,
  Users,
  CalendarDays,
  ShieldCheck,
  TrendingUp,
  Activity,
} from "lucide-react";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  description?: string;
}

function StatCard({ label, value, icon: Icon, iconColor, iconBg, description }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 flex items-start gap-4">
      <div className={`${iconBg} p-2.5 rounded-xl shrink-0`}>
        <Icon className={iconColor} size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 font-medium truncate uppercase tracking-wide">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1 leading-none">{value}</p>
        {description && (
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("nombre, roles(nombre)")
    .eq("auth_user_id", user.id)
    .single();

  const rol = (perfil?.roles as unknown as { nombre: string } | null)?.nombre ?? "";
  const esAdmin = rol === "administrador";

  const hoyInicio = new Date();
  hoyInicio.setDate(1);
  hoyInicio.setHours(0, 0, 0, 0);

  const [
    { count: programasActivos },
    { count: totalParticipantes },
    { count: actividadesMes },
    { count: totalUsuarios },
  ] = await Promise.all([
    supabase.from("programas").select("*", { count: "exact", head: true }).eq("estatus", true),
    supabase.from("participantes").select("*", { count: "exact", head: true }),
    supabase.from("actividades").select("*", { count: "exact", head: true }).gte("created_at", hoyInicio.toISOString()),
    esAdmin
      ? supabase.from("usuarios").select("*", { count: "exact", head: true }).eq("estatus", true)
      : Promise.resolve({ count: null }),
  ]);

  const { data: actividadesRecientes } = await supabase
    .from("actividades")
    .select("id, nombre, tipo, fecha_inicio, programas(nombre)")
    .order("created_at", { ascending: false })
    .limit(5);

  const nombre = perfil?.nombre ?? "Usuario";

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">
          Bienvenida, {nombre}
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Resumen del estado actual del sistema
        </p>
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-2 ${esAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 mb-8`}>
        <StatCard
          label="Programas activos"
          value={programasActivos ?? 0}
          icon={BookOpen}
          iconColor="text-brand-500"
          iconBg="bg-brand-50"
          description="Con estatus activo"
        />
        <StatCard
          label="Participantes"
          value={totalParticipantes ?? 0}
          icon={Users}
          iconColor="text-forest-500"
          iconBg="bg-forest-50"
          description="Registrados en el sistema"
        />
        <StatCard
          label="Actividades este mes"
          value={actividadesMes ?? 0}
          icon={CalendarDays}
          iconColor="text-brand-800"
          iconBg="bg-brand-50"
          description="Creadas en el mes actual"
        />
        {esAdmin && (
          <StatCard
            label="Usuarios del sistema"
            value={totalUsuarios ?? 0}
            icon={ShieldCheck}
            iconColor="text-forest-600"
            iconBg="bg-forest-50"
            description="Administradores y coordinadores"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">Actividades recientes</h2>
          </div>
          {actividadesRecientes && actividadesRecientes.length > 0 ? (
            <ul className="space-y-2">
              {actividadesRecientes.map((act) => (
                <li
                  key={act.id}
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{act.nombre}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {(act.programas as unknown as { nombre: string } | null)?.nombre ?? "—"}
                      {act.tipo ? ` · ${act.tipo}` : ""}
                      {act.fecha_inicio
                        ? ` · ${new Date(act.fecha_inicio).toLocaleDateString("es-MX")}`
                        : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-300 text-center py-8">
              No hay actividades registradas aún.
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-700">Accesos rápidos</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Programas", href: "/dashboard/programas", icon: BookOpen, bg: "bg-brand-50", text: "text-brand-700" },
              { label: "Participantes", href: "/dashboard/participantes", icon: Users, bg: "bg-forest-50", text: "text-forest-700" },
              ...(esAdmin
                ? [{ label: "Usuarios", href: "/dashboard/usuarios", icon: ShieldCheck, bg: "bg-brand-50", text: "text-brand-800" }]
                : []),
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl ${item.bg} ${item.text} hover:opacity-80 transition-opacity text-center`}
              >
                <item.icon size={20} />
                <span className="text-xs font-medium">{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Gráficas y filtros (cliente) */}
      <DashboardCharts />
    </div>
  );
}
