import { Navigate, Route, Routes } from "react-router";
import ProtectedRoutes from "./ProtectedRoutes";
import Login from "../src/auth/Login";
import MainLayout from "../src/components/layout/MainLayout";
import Dashboard from "../src/features/dashboard/Dashboard";
import ProtectedLayout from "../src/components/layout/ProtectedLayout";
import { Members } from "../src/features/members/Members";
import { SeatManagement } from "../src/features/seatmanagement/SeatManagement";

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<MainLayout />}>
        <Route path="/login" element={<Login />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<ProtectedRoutes />}>
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/members" element={<Members />} />
          <Route path="/seat-management" element={<SeatManagement />} />
        </Route>
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};
