import React from "react";
import { Outlet } from "react-router";
import Sidebar from "../ui/SideBar";

const ProtectedLayout = () => {
  return (
    <div className="flex h-screen flex-col overflow-hidden md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default ProtectedLayout;
