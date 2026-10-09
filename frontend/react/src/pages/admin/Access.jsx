import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { accessSchema } from "../../zod/accessZod";
import { useNavigate } from "react-router-dom";
import Tooltip from "../../components/cards/ToolTip";


const Access = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [accesses, setAccesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingAccess, setEditingAccess] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [manageTarget, setManageTarget] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [assignedRoleIds, setAssignedRoleIds] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [savingRoles, setSavingRoles] = useState(false);

  const canViewAccess = user?.stamps?.includes("view_access") || false;
  const canCreateAccess = user?.stamps?.includes("view_create_access") || false;
  const canUpdateAccess = user?.stamps?.includes("view_update_access") || false;
  const canDeleteAccess = user?.stamps?.includes("view_delete_access") || false;
  const canAssignAccess = user?.stamps?.includes("view_assign_access") || false;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(accessSchema),
  });

  const fetchAccesses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("sort_by", sortBy);
      params.append("order", order);
      params.append("limit", limit);
      params.append("offset", offset);

      const res = await api.get(`/access/getall?${params.toString()}`);
      setAccesses(res.data.data);
      setTotal(res.data.pagination.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccesses();
  }, [search, sortBy, order, limit, offset]);

  const handleSortChange = (e) => {
    const [field, ord] = e.target.value.split("-");
    setSortBy(field);
    setOrder(ord);
    setOffset(0);
  };

  const openAddForm = () => {
    setEditingAccess(null);
    reset({
      name: "",
      description: "",
    });
    setShowForm(true);
  };

  const openEditForm = (a) => {
    setEditingAccess(a);
    reset({
      name: a.name,
      description: a.description || "",
    });
    setShowForm(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingAccess) {
        await api.patch(`/access/update/${editingAccess.access_id}`, {
          name: data.name,
          description: data.description,
        });
        toast.success("Access updated successfully!");
      } else {
        await api.post("/access/create", {
          name: data.name,
          description: data.description,
        });
        toast.success("Access created successfully!");
      }
      setShowForm(false);
      setEditingAccess(null);
      reset();
      fetchAccesses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save access");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/access/delete/${deleteTarget.access_id}`);
      toast.success("Access deleted successfully!");
      setDeleteTarget(null);
      fetchAccesses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const confirmRestore = async () => {
    if (!deleteTarget) return;
    try {
      await api.patch(`/access/restore/${deleteTarget.access_id}/restore`);
      toast.success("Access restored successfully!");
      setDeleteTarget(null);
      fetchAccesses();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore");
    }
  };

  const openManageModal = async (a) => {
    setManageTarget(a);
    setLoadingRoles(true);
    try {
      const res = await api.get(`/access/${a.access_id}/roles`);
      setAllRoles(res.data.allRoles || []);
      setAssignedRoleIds(res.data.assignedRoleIds || []);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Failed to load roles");
      setManageTarget(null);
    } finally {
      setLoadingRoles(false);
    }
  };

  const toggleRole = (roleId) => {
    setAssignedRoleIds((prev) => {
      if (prev.includes(roleId)) {
        return prev.filter((id) => id !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const saveRoles = async () => {
    if (!manageTarget) return;
    setSavingRoles(true);
    try {
      await api.patch(`/access/${manageTarget.access_id}/roles`, {
        roleIds: assignedRoleIds,
      });
      toast.success("Roles updated successfully!");
      setManageTarget(null);
      setAllRoles([]);
      setAssignedRoleIds([]);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update roles");
    } finally {
      setSavingRoles(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  useEffect(() => {
    if (!canViewAccess) {
      navigate("/dashboard", { replace: true });
    }
  }, [canViewAccess, navigate]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Access</h1>
        {canCreateAccess && (
          <button
            onClick={openAddForm}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
          >
            + Add Access
          </button>
        )}
      </div>

      {(canCreateAccess || canUpdateAccess) && showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
        >
          <h2 className="font-semibold">
            {editingAccess ? "Edit Access" : "Add Access"}
          </h2>

          <div>
            <input
              type="text"
              placeholder="Name"
              className="w-full px-3 py-2 border rounded-lg"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description 
            </label>
            <input
              type="text"
              placeholder="One-line description, e.g. 'Allows adding new books'"
              className="w-full px-3 py-2 border rounded-lg"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingAccess(null);
                reset();
              }}
              className="bg-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Search by name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
          className="px-4 py-2 border rounded-lg"
        />
        <select
          value={`${sortBy}-${order}`}
          onChange={handleSortChange}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="created_at-desc">Newest First</option>
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
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
      ) : accesses.length === 0 ? (
        <div className="text-center py-6 text-gray-500">No accesses found</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Name
                </th>
                {(canUpdateAccess || canDeleteAccess || canAssignAccess) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {accesses.map((a) => (
                <tr key={a.access_id} className="border-t">
                  <td className="px-4 py-3 text-sm">{a.access_id}</td>
                  <td className="px-4 py-3 text-sm">
                    <Tooltip text={a.description}>
                      <span className="cursor-help border-b border-dotted border-gray-400">
                        {a.name}
                      </span>
                    </Tooltip>
                  </td>
                  {(canUpdateAccess || canDeleteAccess || canAssignAccess) && (
                    <td className="px-4 py-3 text-sm space-x-2">
                      {canUpdateAccess && (
                        <button
                          onClick={() => openEditForm(a)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {canAssignAccess && (
                        <button
                          onClick={() => openManageModal(a)}
                          className="text-green-600 hover:underline"
                        >
                          Manage Roles
                        </button>
                      )}
                      {canDeleteAccess && (
                        <button
                          onClick={() => setDeleteTarget(a)}
                          className="text-red-600 hover:underline"
                        >
                          Delete
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
          Page {currentPage} of {totalPages} ({total} accesses)
        </span>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={offset + limit >= total}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">
              {deleteTarget.deleted_at ? "Confirm Restore" : "Confirm Delete"}
            </h3>
            <p className="text-gray-600 mb-4">
              {deleteTarget.deleted_at
                ? `Are you sure you want to restore "${deleteTarget.name}"?`
                : `Are you sure you want to delete "${deleteTarget.name}"?`}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={
                  deleteTarget.deleted_at ? confirmRestore : confirmDelete
                }
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {deleteTarget.deleted_at ? "Restore" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {manageTarget && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">
              Manage Roles for {manageTarget.name}
            </h3>
            {loadingRoles ? (
              <div className="text-center py-4">Loading roles...</div>
            ) : (
              <div className="space-y-2 mb-4 max-h-80 overflow-y-auto">
                {allRoles.map((role) => (
                  <label
                    key={role.role_id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={assignedRoleIds.includes(role.role_id)}
                      onChange={() => toggleRole(role.role_id)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{role.name}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setManageTarget(null);
                  setAllRoles([]);
                  setAssignedRoleIds([]);
                }}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
                disabled={savingRoles}
              >
                Cancel
              </button>
              <button
                onClick={saveRoles}
                disabled={savingRoles || loadingRoles}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingRoles ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Access;
