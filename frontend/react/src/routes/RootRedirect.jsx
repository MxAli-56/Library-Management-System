import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RootRedirect = () => {
    const { token, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">
            <p className="text-gray-500">Loading...</p>
        </div>;
    }

    const hasToken = token || localStorage.getItem('token');

    return hasToken ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

export default RootRedirect;