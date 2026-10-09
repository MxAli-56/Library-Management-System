import { useEffect } from "react";
import { setNavigate } from "./utils/navigate";
import { Route, Routes, useNavigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { Toaster } from "react-hot-toast";
import AuthRoutes from "./routes/AuthRoutes.jsx";
import PrivateRoutes from "./routes/PrivateRoutes.jsx";
import RootRedirect from "./routes/RootRedirect.jsx";

const NavigationSetter = () => {
  const navigate = useNavigate();

  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);
  return null;
};

const App = () => {
  return (
    <div>
      <Toaster position="center" />
      <AuthProvider>
        <NavigationSetter />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard/*" element={<PrivateRoutes />} />
          <Route path="/*" element={<AuthRoutes />} />
        </Routes>
      </AuthProvider>
    </div>
  );
};

export default App;