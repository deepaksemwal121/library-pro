import { LayoutDashboard, Users, Grid2x2Check, Settings, LogOut, Command } from "lucide-react";
import { NavLink } from "react-router";

const Sidebar = () => {
  const menuItems = [
    { path: "/dashboard", name: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/members", name: "Members", icon: <Users size={20} /> },
    { path: "/seat-management", name: "Seat Management", icon: <Grid2x2Check size={20} /> },
    { path: "/library-management", name: "Library Management", icon: <Command size={20} /> },
    { path: "/settings", name: "Settings", icon: <Settings size={20} /> },
  ];

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col overflow-hidden bg-slate-900 p-4 text-white">
      <h1 className="mb-8 shrink-0 px-2 text-xl font-bold">Library Pro</h1>

      <nav className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400"
              }`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
      </nav>

      <button className="mt-4 flex shrink-0 items-center gap-3 px-4 py-3 text-slate-400 transition-colors hover:text-red-400">
        <LogOut size={20} />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
