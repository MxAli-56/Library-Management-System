import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const formatTimeAgo = (dateString) => {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now - past;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return past.toLocaleDateString();
};

const StatCard = (props) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <p className="text-gray-500 text-sm">{props.label}</p>
      <p className="text-3xl font-bold text-gray-800 mt-2">{props.value}</p>
    </div>
  );
};

const DashboardStats = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user?.stamps?.includes("view_dashboard_stats")) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const fetchStats = async () => {
      try {
        const res = await api.get("/dashboard/stats");
        setStats(res.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load stats</p>
      </div>
    );
  }

  const statusBadge = (status) => {
    if (status === "Pending") return "bg-yellow-100 text-yellow-700";
    if (status === "Approved") return "bg-green-100 text-green-700";
    if (status === "Rejected") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard Stats</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Books"
          value={stats.global.total_books.toLocaleString()}
        />
        <StatCard
          label="Total Users"
          value={stats.global.total_users.toLocaleString()}
        />
        <StatCard
          label="Total Branches"
          value={stats.global.total_branches.toLocaleString()}
        />
        <StatCard
          label="Active Memberships"
          value={stats.global.active_memberships.toLocaleString()}
        />
        <StatCard
          label="Active Borrows"
          value={stats.global.active_borrows.toLocaleString()}
        />
        <StatCard
          label="Overdue Borrows"
          value={stats.global.overdue_borrows.toLocaleString()}
        />
        <StatCard
          label="Pending Requests"
          value={stats.global.pending_requests.toLocaleString()}
        />
        <StatCard
          label="Total Revenue"
          value={`$${stats.global.total_revenue}`}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Branch-wise Overview</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Branch
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Books
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Borrows
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold">
                Members
              </th>
            </tr>
          </thead>
          <tbody>
            {stats.branch_wise.map((b) => (
              <tr key={b.branch_id} className="border-t">
                <td className="px-4 py-3 text-sm">{b.branch_name}</td>
                <td className="px-4 py-3 text-sm">{b.books}</td>
                <td className="px-4 py-3 text-sm">{b.borrows}</td>
                <td className="px-4 py-3 text-sm">{b.members}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-lg font-semibold mb-3">Recent Borrows</h2>
          {stats.recent_borrows.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent borrows</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_borrows.map((r) => (
                <div
                  key={r.borrow_id}
                  className="border-b pb-2 last:border-b-0"
                >
                  <p className="font-medium text-gray-800 text-sm">
                    {r.book_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {r.user_name} · {r.branch_name} ·{" "}
                    {formatTimeAgo(r.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-5">
          <h2 className="text-lg font-semibold mb-3">Recent Requests</h2>
          {stats.recent_requests.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent requests</p>
          ) : (
            <div className="space-y-3">
              {stats.recent_requests.map((r) => (
                <div
                  key={r.request_id}
                  className="border-b pb-2 last:border-b-0"
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className="font-medium text-gray-800 text-sm">
                      {r.name}{" "}
                      <span className="text-gray-500 font-normal">
                        by {r.author}
                      </span>
                    </p>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.user_name} · {r.branch_name} ·{" "}
                    {formatTimeAgo(r.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;