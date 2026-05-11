import { Navigate, Route, Routes } from "react-router";
import ProtectedRoutes from "./ProtectedRoutes";
import Login from "../src/auth/Login";
import MainLayout from "../src/components/layout/MainLayout";
import Dashboard from "../src/features/dashboard/Dashboard";
import ProtectedLayout from "../src/components/layout/ProtectedLayout";
import { Members } from "../src/features/members/Members";
import { SeatManagement } from "../src/features/seatmanagement/SeatManagement";
import { LibraryManagement } from "../src/features/librarymanagement/LibraryManagement";
import { MembershipCards } from "../src/features/membershipcards/MembershipCards";
import { Settings } from "../src/features/settings/Settings";

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
          <Route path="/membership-cards" element={<MembershipCards />} />
          <Route path="/seat-management" element={<SeatManagement />} />
          <Route path="/library-management" element={<LibraryManagement />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};
