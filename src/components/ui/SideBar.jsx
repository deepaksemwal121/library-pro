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
    <aside className="w-64 h-screen bg-slate-900 text-white flex flex-col p-4 ">
      <h1 className="text-xl font-bold mb-8 px-2">Library Pro</h1>

      <nav className="flex-1 space-y-2">
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

      <button className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 transition-colors">
        <LogOut size={20} />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
