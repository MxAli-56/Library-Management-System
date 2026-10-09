import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const getDaysRemaining = (endDate) => {
  const today = new Date();
  const end = new Date(endDate);
  const diffInMs = end - today;
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
  return diffInDays;
};

const Membership = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [currentMembership, setCurrentMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("fee");
  const [order, setOrder] = useState("asc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const fetchMyMembership = async () => {
    try {
      const res = await api.get("/membership/my-membership");
      setCurrentMembership(res.data.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("sort_by", sortBy);
      params.append("order", order);
      params.append("limit", limit);
      params.append("offset", offset);

      const res = await api.get(`/membership/available?${params.toString()}`);
      setPlans(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyMembership();
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [search, sortBy, order, limit, offset]);

  const handleSortChange = (e) => {
    const [field, ord] = e.target.value.split("-");
    setSortBy(field);
    setOrder(ord);
    setOffset(0);
  };

  if (user?.stamps?.includes("view_create_membership")) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-blue-800 font-medium">
            Please use the Admin Panel to manage membership plans.
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

  const statusStyles = {
    Active: "bg-green-100 text-green-700",
    Expired: "bg-red-100 text-red-700",
    Pending: "bg-yellow-100 text-yellow-700",
    Inactive: "bg-gray-100 text-gray-700",
  };

  const isNonMember = !user?.role;

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Membership</h1>

      {isNonMember && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm font-medium">
            Visit the library to buy a membership.
          </p>
        </div>
      )}

      {currentMembership && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Current Plan</h2>
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-2xl font-bold text-gray-800">
                {currentMembership.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                ${parseFloat(currentMembership.fee).toFixed(2)} /{" "}
                {currentMembership.duration} days
              </p>
              {currentMembership.branch && (
                <p className="text-sm text-gray-500 mt-1">
                  <span className="font-medium">Branch:</span>{" "}
                  {currentMembership.branch}
                </p>
              )}
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                statusStyles[currentMembership.status] ||
                "bg-gray-100 text-gray-700"
              }`}
            >
              {currentMembership.status}
            </span>
          </div>

          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mt-4">
            <p>
              <span className="font-medium">Start:</span>{" "}
              {new Date(currentMembership.start_date).toLocaleDateString()}
            </p>
            <p>
              <span className="font-medium">End:</span>{" "}
              {new Date(currentMembership.end_date).toLocaleDateString()}
            </p>
            {currentMembership.status === "Active" && (
              <p>
                <span className="font-medium">Days Remaining:</span>{" "}
                {Math.max(0, getDaysRemaining(currentMembership.end_date))} days
              </p>
            )}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Available Plans</h2>

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by plan name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={`${sortBy}-${order}`}
          onChange={handleSortChange}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="fee-asc">Fee (Low to High)</option>
          <option value="fee-desc">Fee (High to Low)</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="duration-asc">Duration (Low to High)</option>
          <option value="duration-desc">Duration (High to Low)</option>
          <option value="created_at-desc">Newest First</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setOffset(0);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={10}>10 per page</option>
          <option value={20}>20 per page</option>
          <option value={30}>30 per page</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Loading...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No membership plans available.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent =
              currentMembership?.membership_id === plan.membership_id;
            return (
              <div
                key={plan.membership_id}
                className={`bg-white rounded-lg shadow p-5 ${
                  isCurrent ? "border-2 border-blue-500" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-800">
                    {plan.name}
                  </h3>
                  {isCurrent && (
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-blue-600 mb-3">
                  ${parseFloat(plan.fee).toFixed(2)}
                </p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>
                    <span className="font-medium">Duration:</span>{" "}
                    {plan.duration} days
                  </p>
                  <p>
                    <span className="font-medium">Discount:</span>{" "}
                    {parseFloat(plan.discount).toFixed(2)}%
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          Page {currentPage} of {totalPages} ({total} plans)
        </span>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default Membership;