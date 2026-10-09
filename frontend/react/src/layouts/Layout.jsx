import { useLocation } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import Sidebar from "../components/common/Sidebar";

const Layout = ({ children }) => {
  const location = useLocation();
  const isAdminArea = location.pathname.startsWith("/dashboard/admin");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="flex">
        {isAdminArea && <Sidebar />}

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
};

export default Layout;