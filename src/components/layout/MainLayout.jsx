import React from "react";
import { Outlet } from "react-router";

const MainLayout = () => {
  return (
    <div className="bg-slate-900 h-screen grid w-screen place-items-center">
      <Outlet /> {/* Renders the current page */}
    </div>
  );
};

export default MainLayout;
