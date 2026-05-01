import React from "react";
import { Outlet } from "react-router";

const MainLayout = () => {
  return (
    <div className="min-h-screen bg-slate-950">
      <Outlet /> {/* Renders the current page */}
    </div>
  );
};

export default MainLayout;
