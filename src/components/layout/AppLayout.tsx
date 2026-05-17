import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-[#FDFCFB] text-[#1A1C18] font-sans">
      {/* Sidebar Component */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Container */}
      <div className="flex flex-1 flex-col">
        {/* Navbar Component */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Content Area */}
        <main className="flex-1 px-8 py-8 space-y-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
