import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const hasAdminPanel = user?.stamps?.includes("view_admin_panel") || false;

  return (
    <nav className="bg-white shadow-md px-6 py-3 flex items-center justify-between">
      <Link to="/dashboard" className="text-xl font-bold text-blue-600">
        LMS
      </Link>

      <div className="flex items-center gap-6 text-sm font-medium">
        <Link to="/dashboard" className="hover:text-blue-600">
          Dashboard
        </Link>

        {!hasAdminPanel && (
          <>
            <Link to="/dashboard/my-borrows" className="hover:text-blue-600">
              My Borrows
            </Link>
            <Link to="/dashboard/books" className="hover:text-blue-600">
              Books
            </Link>
            <Link to="/dashboard/book-request" className="hover:text-blue-600">
              Book Request
            </Link>
            <Link to="/dashboard/membership" className="hover:text-blue-600">
              Membership
            </Link>
          </>
        )}

        {hasAdminPanel && (
          <Link
            to="/dashboard/admin"
            className="hover:text-blue-600 text-amber-600"
          >
            Admin Panel
          </Link>
        )}

        <Link to="/dashboard/profile" className="hover:text-blue-600">
          Profile
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <div className="text-right">
            <p className="text-sm font-medium text-gray-800">{user.name}</p>
            <p className="text-xs text-gray-500">{user.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-4 py-1.5 rounded text-sm hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;