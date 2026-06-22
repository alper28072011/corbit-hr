import { useState, useEffect } from "react";
import { useLocation, useOutlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../../lib/utils";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(isCollapsed));
  }, [isCollapsed]);

  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div className="flex min-h-screen w-full bg-[#FDFCFB] text-[#1A1C18] font-sans">
      {/* Sidebar Component */}
      <Sidebar 
         open={sidebarOpen} 
         setOpen={setSidebarOpen} 
         isCollapsed={isCollapsed}
         setIsCollapsed={setIsCollapsed}
      />

      {/* Main Container */}
      <div 
        className={cn(
          "flex flex-1 flex-col overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
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
              className="h-full"
            >
              {outlet}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
