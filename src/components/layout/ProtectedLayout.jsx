import React from "react";
import { Outlet } from "react-router";
import Sidebar from "../ui/SideBar";

const ProtectedLayout = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-slate-50 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedLayout;
