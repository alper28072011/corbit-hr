/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import FacilityManagement from "./pages/FacilityManagement";
import RoomManagement from "./pages/RoomManagement";
import StaffManagement from "./pages/StaffManagement";
import Maintenance from "./pages/Maintenance";
import Settings from "./pages/Settings";
import AuthProvider from "./components/auth/AuthProvider";
import ProtectedRoute from "./components/auth/ProtectedRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="facilities" element={<FacilityManagement />} />
            <Route path="rooms" element={<RoomManagement />} />
            <Route path="staff" element={<StaffManagement />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
              <Route path="settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
