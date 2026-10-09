import { useAuth } from "../../context/AuthContext";

const AdminHome = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-800">
        Welcome to Admin Panel, {user?.name}!
      </h1>
      <p className="text-gray-600 mt-2">
        Use the sidebar to manage different sections.
      </p>
    </div>
  );
};

export default AdminHome;