import { NavLink } from "react-router-dom";
import { sidebarConfig } from "../../config/sidebarConfig";
import { useAuth } from "../../context/AuthContext";

const Sidebar = () => {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const role = user?.role;
  const menuItems = sidebarConfig[role] || [];

  if (menuItems.length === 0) {
    return null;
  }

  return (
    <div className="w-64 min-h-screen bg-gray-800 text-white shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">LMS Admin</h2>
        <p className="text-sm text-gray-400">{role}</p>
      </div>
      <ul className="p-2 space-y-1">
        {menuItems.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.path === "/dashboard/admin"}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-700 text-gray-300"
                }`
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;