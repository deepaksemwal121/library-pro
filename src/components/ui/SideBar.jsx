import { LayoutDashboard, Users, Grid2x2Check, Settings, LogOut, Command } from "lucide-react";
import { NavLink, useNavigate } from "react-router";
import supabase from "../../../helpers/supabase";

const Sidebar = () => {
  const navigate = useNavigate();
  const menuItems = [
    { path: "/dashboard", name: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { path: "/members", name: "Members", icon: <Users size={20} /> },
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
      <h1 className="mb-3 shrink-0 px-2 text-lg font-bold md:mb-8 md:text-xl">Library Pro</h1>

      <nav className="flex min-h-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden pb-1 md:block md:space-y-2 md:overflow-y-auto md:pr-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-colors md:gap-3 md:px-4 md:py-3 md:text-base ${
                isActive ? "bg-blue-600 text-white" : "hover:bg-slate-800 text-slate-400"
              }`
            }
          >
            {item.icon}
            {item.name}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-red-400 md:hidden"
        >
          <LogOut size={20} />
          Logout
        </button>
      </nav>

      <button
        type="button"
        onClick={handleLogout}
        className="mt-3 hidden shrink-0 items-center gap-3 px-4 py-3 text-slate-400 transition-colors hover:text-red-400 md:flex"
      >
        <LogOut size={20} />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
