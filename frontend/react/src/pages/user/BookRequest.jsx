import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { bookRequestSchema } from "../../zod/bookRequestZod";

const API_URL = import.meta.env.VITE_API_URL;

const BookRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [reasonTarget, setReasonTarget] = useState(null);
  const [coverFile, setCoverFile] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(bookRequestSchema),
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/request/my-request");
      setRequests(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const onSubmit = async (data) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("author", data.author);
      formData.append("isbn", data.isbn);
      if (coverFile) {
        formData.append("cover_image", coverFile);
      }

      await api.post("/request/create", formData);
      toast.success("Book request submitted successfully!");
      reset();
      setCoverFile(null);
      setShowForm(false);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit request");
    }
  };

  if (!user?.role) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-800 font-medium">
            Visit the library to buy an active membership to request new books.
          </p>
          <button
            onClick={() => navigate("/dashboard/membership")}
            className="mt-4 bg-yellow-600 text-white py-2 px-6 rounded-lg hover:bg-yellow-700 transition"
          >
            View Membership Plans
          </button>
        </div>
      </div>
    );
  }

  if (user?.stamps?.includes("view_approve_request")) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800 font-medium">
            Please use the Admin Panel to manage book requests.
          </p>
          <button
            onClick={() => navigate("/dashboard/admin")}
            className="mt-4 bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition"
          >
            View Admin Panel
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  const statusStyles = {
    Pending: "bg-yellow-100 text-yellow-700",
    Approved: "bg-green-100 text-green-700",
    Rejected: "bg-red-100 text-red-700",
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Book Requests</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition text-sm"
        >
          {showForm ? "Cancel" : "Request a New Book"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white rounded-lg shadow p-6 mb-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Book Name
            </label>
            <input
              type="text"
              placeholder="Enter book name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <input
              type="text"
              placeholder="Enter author name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register("author")}
            />
            {errors.author && (
              <p className="text-red-500 text-sm mt-1">
                {errors.author.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ISBN
            </label>
            <input
              type="text"
              placeholder="Enter ISBN number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register("isbn")}
            />
            {errors.isbn && (
              <p className="text-red-500 text-sm mt-1">{errors.isbn.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cover Image (optional)
            </label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={(e) => setCoverFile(e.target.files[0] || null)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700"
            />
            {coverFile && (
              <p className="text-xs text-green-600 mt-1">
                Selected: {coverFile.name}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </button>
        </form>
      )}

      <h2 className="text-lg font-semibold mb-4">Your Requests</h2>

      {requests.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">You haven't requested any books yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.request_id}
              className="bg-white rounded-lg shadow p-5 flex gap-4"
            >
              <div className="w-16 h-24 shrink-0 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                {request.cover_image ? (
                  <img
                    src={`${API_URL}/uploads/covers/${request.cover_image}`}
                    alt={request.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                )}
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      {request.name}
                    </h3>
                    <p className="text-sm text-gray-600">by {request.author}</p>
                  </div>
                  {request.status === "Rejected" ? (
                    <button
                      onClick={() => setReasonTarget(request)}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200 hover:bg-red-200 hover:border-red-300 transition cursor-pointer"
                    >
                      <span>Rejected</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-3 h-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </button>
                  ) : (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[request.status] || "bg-gray-100 text-gray-700"}`}
                    >
                      {request.status}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">ISBN:</span> {request.isbn}
                  </p>
                  <p>
                    <span className="font-medium">Requested:</span>{" "}
                    {new Date(request.request_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {reasonTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 text-red-600">
              Request Rejected
            </h3>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
              <div>
                <span className="font-medium text-gray-700">Book:</span>{" "}
                <span className="text-gray-900">{reasonTarget.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Author:</span>{" "}
                <span className="text-gray-900">{reasonTarget.author}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">ISBN:</span>{" "}
                <span className="text-gray-900">{reasonTarget.isbn}</span>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Reason</p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 whitespace-pre-wrap">
                {reasonTarget.rejection_reason || "No reason provided."}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setReasonTarget(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookRequest;