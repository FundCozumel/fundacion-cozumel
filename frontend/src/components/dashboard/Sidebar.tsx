"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  MapPin,
  ClipboardList,
  ClipboardCheck,
  CalendarDays,
  Upload,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface SidebarProps {
  perfil: {
    nombre: string;
    apellido_paterno: string | null;
    roles: { nombre: string } | null;
  } | null;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["administrador", "coordinador"] },
  { href: "/dashboard/programas", label: "Programas", icon: BookOpen, roles: ["administrador", "coordinador"] },
  { href: "/dashboard/actividades", label: "Actividades", icon: CalendarDays, roles: ["administrador", "coordinador"] },
  { href: "/dashboard/participantes", label: "Participantes", icon: Users, roles: ["administrador", "coordinador"] },
  { href: "/dashboard/sedes", label: "Sedes", icon: MapPin, roles: ["administrador", "coordinador"] },
  { href: "/dashboard/cuestionarios", label: "Cuestionarios", icon: ClipboardList, roles: ["administrador", "coordinador"] },
  { href: "/dashboard/captura", label: "Captura", icon: ClipboardCheck, roles: ["administrador", "coordinador"] },
  { href: "/dashboard/importar", label: "Importar", icon: Upload, roles: ["administrador", "coordinador"] },
  { href: "/dashboard/usuarios", label: "Usuarios", icon: ShieldCheck, roles: ["administrador"] },
];

export default function Sidebar({ perfil }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createSupabaseBrowserClient();
  const rol = perfil?.roles?.nombre ?? "";

  // Cierra el drawer móvil al navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const visibleItems = navItems.filter((item) => item.roles.includes(rol));

  const nav = (
    <nav className="flex-1 py-4 px-2 space-y-0.5">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            }`}
          >
            <item.icon
              size={17}
              className={`shrink-0 ${isActive ? "text-brand-500" : "text-gray-400"}`}
            />
            {(!collapsed || mobileOpen) && <span>{item.label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="p-3 border-t border-gray-100">
      {(!collapsed || mobileOpen) && perfil && (
        <div className="px-3 py-2 mb-1">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {perfil.nombre} {perfil.apellido_paterno}
          </p>
          <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-forest-50 text-forest-600 capitalize tracking-wide">
            {rol}
          </span>
        </div>
      )}
      <button
        onClick={handleLogout}
        title={collapsed ? "Cerrar sesión" : undefined}
        className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut size={17} className="shrink-0" />
        {(!collapsed || mobileOpen) && <span>Cerrar sesión</span>}
      </button>
    </div>
  );

  return (
    <>
      {/* Barra superior móvil */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Fundación Cozumel" width={30} height={30} />
          <div className="leading-tight">
            <p className="text-xs font-bold text-brand-800">Fundación Cozumel</p>
            <p className="text-[10px] text-gray-400">Autoevaluación</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Overlay móvil */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Drawer móvil */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col transform transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Fundación Cozumel" width={32} height={32} />
            <div className="leading-tight">
              <p className="text-xs font-bold text-brand-800">Fundación Cozumel</p>
              <p className="text-[10px] text-gray-400">Autoevaluación</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors"
            aria-label="Cerrar menú"
          >
            <X size={16} />
          </button>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Sidebar escritorio */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-gray-100 transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        } min-h-screen shrink-0`}
      >
        <div className={`flex items-center border-b border-gray-100 ${collapsed ? "justify-center py-4 px-2" : "gap-3 px-5 py-4"}`}>
          <Image
            src="/logo.png"
            alt="Fundación Cozumel"
            width={collapsed ? 32 : 36}
            height={collapsed ? 32 : 36}
            className="shrink-0"
          />
          {!collapsed && (
            <div className="leading-tight overflow-hidden">
              <p className="text-xs font-bold text-brand-800 truncate">Fundación Cozumel</p>
              <p className="text-[10px] text-gray-400 truncate">Autoevaluación</p>
            </div>
          )}
        </div>
        {nav}
        {footer}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="mx-3 mb-3 flex items-center justify-center h-8 rounded-xl border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </aside>
    </>
  );
}
