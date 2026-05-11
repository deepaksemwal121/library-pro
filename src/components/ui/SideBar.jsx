import { BadgeCheck, BookOpenCheck, LayoutDashboard, Users, Grid2x2Check, Settings, LogOut, Command } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import supabase from "../../../helpers/supabase";
import { getReadableTextColor, useLibrarySettings } from "../../features/settings/librarySettings";
import { roleLabel, useCurrentUserProfile } from "../../features/settings/userProfiles";

const Sidebar = () => {
  const navigate = useNavigate();
  const { libraryName, logoDataUrl, themeColor } = useLibrarySettings();
  const { profile } = useCurrentUserProfile();
  const themeTextColor = getReadableTextColor(themeColor);
  const menuItems = [
    { path: "/dashboard", name: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/members", name: "Members", icon: <Users size={20} /> },
    { path: "/membership-cards", name: "Cards", icon: <BadgeCheck size={20} /> },
    { path: "/seat-management", name: "Seat Management", icon: <Grid2x2Check size={20} /> },
    { path: "/library-management", name: "Library Management", icon: <Command size={20} /> },
    { path: "/settings", name: "Settings", icon: <Settings size={20} /> },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <aside className="flex max-h-[42vh] w-full shrink-0 flex-col overflow-hidden bg-slate-900 p-3 text-white md:h-full md:max-h-none md:w-64 md:p-4">
      <div className="mb-3 flex shrink-0 items-center gap-2 px-2 md:mb-8">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md"
          style={{ backgroundColor: themeColor, color: themeTextColor }}
        >
          {logoDataUrl ? <img src={logoDataUrl} alt="" className="h-full w-full object-cover" /> : <BookOpenCheck size={20} />}
        </span>
        <h1 className="min-w-0 truncate text-lg font-bold leading-tight md:text-xl" title={libraryName}>
          {libraryName}
        </h1>
      </div>

      <nav className="flex min-h-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden pb-1 md:block md:space-y-2 md:overflow-y-auto md:pr-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors md:gap-3 md:px-4 md:py-3 md:text-base ${
                isActive ? "" : "hover:bg-slate-800 text-slate-400"
              }`
            }
            style={({ isActive }) => (isActive ? { backgroundColor: themeColor, color: themeTextColor } : undefined)}
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
        <div className="flex shrink-0 flex-col justify-center rounded-lg px-3 py-2 text-xs text-slate-300 md:hidden">
          <span className="max-w-32 truncate font-semibold">{profile?.fullName || "User"}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-500">{roleLabel(profile?.role)}</span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400 md:hidden"
        >
          <LogOut size={20} />
          Logout
        </button>
      </nav>

      <div className="mt-3 hidden shrink-0 md:block">
        <div className="px-4 pb-1">
          <div className="truncate text-xs font-semibold text-slate-300">{profile?.fullName || "User"}</div>
          <div className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">{roleLabel(profile?.role)}</div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-4 py-3 text-slate-400 transition-colors hover:text-red-400"
        >
          <LogOut size={20} />
          Logout
        </button>
      </div>
      <p className="mt-2 hidden shrink-0 px-4 text-[10px] leading-relaxed text-slate-500 md:block">
        Copyright 2026 Library Pro by Deepak Semwal
      </p>
    </aside>
  );
};

export default Sidebar;
