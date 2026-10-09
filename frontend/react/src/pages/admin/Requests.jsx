import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";
import {
  approveRequestSchema,
  rejectRequestSchema,
} from "../../zod/requestZod";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

const Requests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [approveCoverFile, setApproveCoverFile] = useState(null);

  const [statusesList, setStatusesList] = useState([]);
  const [categories, setCategories] = useState([]);

  const canView = user?.stamps?.includes("view_request") || false;
  const canApprove = user?.stamps?.includes("view_approve_request") || false;
  const canReject = user?.stamps?.includes("view_delete_request") || false;

  const {
    register: registerApprove,
    handleSubmit: handleSubmitApprove,
    formState: { errors: errorsApprove, isSubmitting: isSubmittingApprove },
    reset: resetApprove,
  } = useForm({
    resolver: zodResolver(approveRequestSchema),
  });

  const {
    register: registerReject,
    handleSubmit: handleSubmitReject,
    formState: { errors: errorsReject, isSubmitting: isSubmittingReject },
    reset: resetReject,
  } = useForm({
    resolver: zodResolver(rejectRequestSchema),
  });

  const fetchCategories = async () => {
    try {
      const res = await api.get("/book/categories");
      setCategories(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter) params.append("status", statusFilter);
      params.append("sort_by", sortBy);
      params.append("order", order);
      params.append("limit", limit);
      params.append("offset", offset);

      const res = await api.get(`/request/getall?${params.toString()}`);
      setRequests(res.data.data);
      setTotal(res.data.pagination.total);
      if (res.data.statuses) {
        setStatusesList(res.data.statuses);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [search, statusFilter, sortBy, order, limit, offset]);

  useEffect(() => {
    if (!canView) {
      navigate("/dashboard", { replace: true });
    }
  }, [canView, navigate]);

  const handleSortChange = (e) => {
    const [field, ord] = e.target.value.split("-");
    setSortBy(field);
    setOrder(ord);
    setOffset(0);
  };

  const openApproveModal = (r) => {
    setApproveTarget(r);
    setApproveCoverFile(null);
    resetApprove({
      quantity: "1",
      fine_per_day: "0.5",
      total_price: "0",
      borrow_price: "0",
      category_id: "",
    });
    fetchCategories();
  };

  const openRejectModal = (r) => {
    setRejectTarget(r);
    resetReject({
      rejection_reason: "",
    });
  };

  const onSubmitApprove = async (data) => {
    if (!approveTarget) return;

    if (!approveCoverFile && !approveTarget.cover_image) {
      toast.error(
        "Cover image is required. User didn't provide one, please upload.",
      );
      return;
    }

    try {
      const formData = new FormData();
      formData.append("quantity", Number(data.quantity));
      formData.append("fine_per_day", Number(data.fine_per_day));
      formData.append("total_price", Number(data.total_price));
      formData.append("borrow_price", Number(data.borrow_price));
      formData.append("category_id", Number(data.category_id));
      if (approveCoverFile) {
        formData.append("cover_image", approveCoverFile);
      }

      await api.patch(`/request/approve/${approveTarget.request_id}`, formData);
      toast.success("Request approved successfully!");
      setApproveTarget(null);
      setApproveCoverFile(null);
      resetApprove();
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve request");
    }
  };

  const onSubmitReject = async (data) => {
    if (!rejectTarget) return;
    try {
      await api.delete(`/request/reject/${rejectTarget.request_id}`, {
        data: {
          rejection_reason: data.rejection_reason || undefined,
        },
      });
      toast.success("Request rejected successfully!");
      setRejectTarget(null);
      resetReject();
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    }
  };

  const getStatusBadge = (status) => {
    if (status === "Pending") return "bg-yellow-100 text-yellow-800";
    if (status === "Approved") return "bg-green-100 text-green-800";
    if (status === "Rejected") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "2-digit",
    });
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Book Request Management</h1>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by book, author, ISBN, or user"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          {statusesList.map((s) => (
            <option key={s.status_id} value={s.name}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={`${sortBy}-${order}`}
          onChange={handleSortChange}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="request_date-desc">Request Date (Latest)</option>
          <option value="request_date-asc">Request Date (Earliest)</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={30}>30 per page</option>
          <option value={40}>40 per page</option>
          <option value={50}>50 per page</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-6">Loading...</div>
      ) : requests.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No requests found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Cover
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  User
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Book
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Author
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  ISBN
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Requested
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                {(canApprove || canReject) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.request_id} className="border-t">
                  <td className="px-4 py-3 text-sm">{r.request_id}</td>
                  <td className="px-4 py-3">
                    {r.cover_image ? (
                      <img
                        src={`${API_URL}/uploads/covers/${r.cover_image}`}
                        alt={r.name}
                        className="w-10 h-14 object-cover rounded border"
                      />
                    ) : (
                      <div className="w-10 h-14 flex items-center justify-center bg-gray-100 rounded border text-gray-400">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                          />
                        </svg>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="relative group inline-block">
                      <span className="border-b border-dotted border-gray-400 cursor-help">
                        {r.user_name} ({r.user_role})
                      </span>
                      {r.user_branches && r.user_branches.length > 0 && (
                        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-50 shadow-lg">
                          Branch: {r.user_branches.join(", ")}
                          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">{r.name}</td>
                  <td className="px-4 py-3 text-sm">{r.author}</td>
                  <td className="px-4 py-3 text-sm">{r.isbn}</td>
                  <td className="px-4 py-3 text-sm">
                    {formatDate(r.request_date)}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusBadge(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  {(canApprove || canReject) && (
                    <td className="px-4 py-3 text-sm space-x-2">
                      {r.status === "Pending" && canApprove && (
                        <button
                          onClick={() => openApproveModal(r)}
                          className="text-green-600 hover:underline"
                        >
                          Approve
                        </button>
                      )}
                      {r.status === "Pending" && canReject && (
                        <button
                          onClick={() => openRejectModal(r)}
                          className="text-red-600 hover:underline"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages} ({total} requests)
        </span>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {approveTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Approve Request</h3>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
              <div>
                <span className="font-medium text-gray-700">Book:</span>{" "}
                <span className="text-gray-900">{approveTarget.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Author:</span>{" "}
                <span className="text-gray-900">{approveTarget.author}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">ISBN:</span>{" "}
                <span className="text-gray-900">{approveTarget.isbn}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Requested by:</span>{" "}
                <span className="text-gray-900">
                  {approveTarget.user_name}
                  {approveTarget.user_role
                    ? ` (${approveTarget.user_role})`
                    : ""}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmitApprove(onSubmitApprove)}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...registerApprove("quantity")}
                />
                {errorsApprove.quantity && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsApprove.quantity.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fine Per Day
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...registerApprove("fine_per_day")}
                />
                {errorsApprove.fine_per_day && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsApprove.fine_per_day.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Price
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...registerApprove("total_price")}
                />
                {errorsApprove.total_price && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsApprove.total_price.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Borrow Price
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...registerApprove("borrow_price")}
                />
                {errorsApprove.borrow_price && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsApprove.borrow_price.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  {...registerApprove("category_id")}
                >
                  <option value="">Select Category</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {errorsApprove.category_id && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsApprove.category_id.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cover Image
                </label>

                {approveTarget.cover_image && !approveCoverFile && (
                  <div className="flex items-center gap-3 mb-2 bg-gray-50 border rounded-lg p-2">
                    <img
                      src={`${API_URL}/uploads/covers/${approveTarget.cover_image}`}
                      alt="User provided"
                      className="w-12 h-16 object-cover rounded border"
                    />
                    <div className="text-xs text-gray-600">
                      User provided this cover. Leave blank to use it, or upload
                      a new one to replace.
                    </div>
                  </div>
                )}

                {!approveTarget.cover_image && !approveCoverFile && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-2 text-xs text-red-700">
                    User did not provide a cover image. You must upload one.
                  </div>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={(e) =>
                    setApproveCoverFile(e.target.files[0] || null)
                  }
                  className="w-full px-3 py-2 border rounded-lg file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-green-600 file:text-white file:cursor-pointer hover:file:bg-green-700"
                />
                {approveCoverFile && (
                  <p className="text-xs text-green-600 mt-1">
                    New file selected: {approveCoverFile.name}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setApproveTarget(null);
                    setApproveCoverFile(null);
                    resetApprove();
                  }}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingApprove}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {isSubmittingApprove ? "Approving..." : "Approve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h3 className="text-lg font-semibold mb-4">Reject Request</h3>

            <div className="bg-gray-50 rounded-lg p-3 mb-4 space-y-1 text-sm">
              <div>
                <span className="font-medium text-gray-700">Book:</span>{" "}
                <span className="text-gray-900">{rejectTarget.name}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Author:</span>{" "}
                <span className="text-gray-900">{rejectTarget.author}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">ISBN:</span>{" "}
                <span className="text-gray-900">{rejectTarget.isbn}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Requested by:</span>{" "}
                <span className="text-gray-900">
                  {rejectTarget.user_name}
                  {rejectTarget.user_role ? ` (${rejectTarget.user_role})` : ""}
                </span>
              </div>
            </div>

            <form
              onSubmit={handleSubmitReject(onSubmitReject)}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason (optional)
                </label>
                <textarea
                  rows="3"
                  className="w-full px-3 py-2 border rounded-lg"
                  {...registerReject("rejection_reason")}
                />
                {errorsReject.rejection_reason && (
                  <p className="text-red-500 text-sm mt-1">
                    {errorsReject.rejection_reason.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectTarget(null);
                    resetReject();
                  }}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReject}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmittingReject ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Requests;