import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "motion/react";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full bg-[#FDFCFB] text-[#1A1C18] font-sans">
      {/* Sidebar Component */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Main Container */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Navbar Component */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Content Area */}
        <main className="flex-1 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="px-8 py-8 h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
