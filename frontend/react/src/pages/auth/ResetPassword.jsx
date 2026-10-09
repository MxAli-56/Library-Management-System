import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { resetPasswordSchema } from "../../zod/resetPasswordZod";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [invalidMessage, setInvalidMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
  });

  const verifyToken = async (silent = false) => {
    if (!token) {
      setInvalidMessage("No reset token found in the URL.");
      setIsValid(false);
      setVerifying(false);
      return;
    }

    if (!silent) {
      setVerifying(true);
    }

    try {
      const res = await api.get(`/auth/verify-reset-token/${token}`);
      if (res.data.valid) {
        setIsValid(true);
        setInvalidMessage("");
      } else {
        setIsValid(false);
        setInvalidMessage(
          res.data.message || "This reset link is invalid or has expired.",
        );
      }
    } catch (error) {
      setIsValid(false);
      setInvalidMessage(
        error.response?.data?.message ||
          "This reset link is invalid or has expired.",
      );
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    verifyToken(false);
  }, [token]);

  useEffect(() => {
    if (!isValid) return;

    const interval = setInterval(() => {
      verifyToken(true);
    }, 5000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        verifyToken(true);
      }
    };

    const handleFocus = () => {
      verifyToken(true);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isValid, token]);

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("No reset token found in URL.");
      return;
    }

    try {
      await api.post("/auth/reset-password", {
        new_password: data.new_password,
        token: token,
      });

      toast.success(
        "✅ Password reset successfully! Please login with your new password.",
      );

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2000);
    } catch (error) {
      const message = error.response?.data?.message || "Password reset failed";
      toast.error(message);
      verifyToken(true);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Invalid or Expired Link
          </h1>
          <p className="text-gray-600 mb-6">{invalidMessage}</p>
          <Link
            to="/forgot-password"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            Request a New Reset Link
          </Link>
          <div className="mt-4">
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Reset Password
        </h1>
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              placeholder="Enter new password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register("new_password")}
            />
            {errors.new_password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.new_password.message}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Confirm new password"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register("confirm_password")}
            />
            {errors.confirm_password && (
              <p className="text-red-500 text-sm mt-1">
                {errors.confirm_password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-blue-600 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;