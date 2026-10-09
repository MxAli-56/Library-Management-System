import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import api from "../../api/axios";
import {
  membershipSchema,
  allocateMembershipSchema,
} from "../../zod/membershipZod";

const Memberships = () => {
  const { user } = useAuth();

  const [memberships, setMemberships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusesList, setStatusesList] = useState([]);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingMembership, setEditingMembership] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [showAllocateForm, setShowAllocateForm] = useState(false);
  const [branchesList, setBranchesList] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const userDebounceRef = useRef(null);

  const canCreateMembership =
    user?.stamps?.includes("view_create_membership") || false;
  const canUpdateMembership =
    user?.stamps?.includes("view_update_membership") || false;
  const canDeleteMembership =
    user?.stamps?.includes("view_delete_membership") || false;

  const isPrivileged = user?.role === "Owner" || user?.role === "Admin";

  const userBranchIds = (user?.branches || []).map((b) => b.branch_id);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(membershipSchema),
  });

  const {
    register: registerAllocate,
    handleSubmit: handleSubmitAllocate,
    formState: { errors: allocateErrors, isSubmitting: isAllocating },
    reset: resetAllocate,
  } = useForm({
    resolver: zodResolver(allocateMembershipSchema),
  });

  const fetchMemberships = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      params.append("sort_by", sortBy);
      params.append("order", order);
      params.append("limit", limit);
      params.append("offset", offset);

      const res = await api.get(`/membership/getall?${params.toString()}`);
      setMemberships(res.data.data);
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

  const fetchBranches = async () => {
    setLoadingBranches(true);
    try {
      const res = await api.get("/branch/getall");
      setBranchesList(res.data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingBranches(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, [search, sortBy, order, limit, offset]);

  useEffect(() => {
    if (userDebounceRef.current) {
      clearTimeout(userDebounceRef.current);
    }

    if (!userSearchTerm || userSearchTerm.length < 2) {
      setUserResults([]);
      return;
    }

    userDebounceRef.current = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await api.get(
          `/staff/getallusers?search=${encodeURIComponent(userSearchTerm)}&limit=20&includeRoleless=true`,
        );
        setUserResults(res.data.data || []);
      } catch (error) {
        console.error(error);
      } finally {
        setSearchingUsers(false);
      }
    }, 300);

    return () => {
      if (userDebounceRef.current) {
        clearTimeout(userDebounceRef.current);
      }
    };
  }, [userSearchTerm]);

  const handleSortChange = (e) => {
    const [field, ord] = e.target.value.split("-");
    setSortBy(field);
    setOrder(ord);
    setOffset(0);
  };

  const openAddForm = () => {
    setEditingMembership(null);
    reset({
      name: "",
      fee: "",
      duration: "",
      discount: "",
      status_id: "",
    });
    setShowForm(true);
  };

  const openEditForm = (m) => {
    setEditingMembership(m);

    const matchedStatus = statusesList.find((s) => s.name === m.status);

    reset({
      name: m.name,
      fee: String(m.fee),
      duration: String(m.duration),
      discount: String(m.discount),
      status_id: matchedStatus ? String(matchedStatus.status_id) : "",
    });
    setShowForm(true);
  };

  const openAllocateForm = () => {
    setSelectedUser(null);
    setUserSearchTerm("");
    setUserResults([]);
    resetAllocate({ membership_id: "", branch_id: "" });
    fetchBranches();
    setShowAllocateForm(true);
  };

  const availableBranches = isPrivileged
    ? branchesList
    : branchesList.filter((b) => userBranchIds.includes(b.branch_id));

  const onSubmit = async (data) => {
    try {
      if (editingMembership) {
        await api.patch(
          `/membership/update/${editingMembership.membership_id}`,
          {
            name: data.name,
            fee: parseFloat(data.fee),
            duration: parseInt(data.duration),
            discount: parseFloat(data.discount),
            status_id: parseInt(data.status_id),
          },
        );
        toast.success("Membership updated successfully!");
      } else {
        await api.post("/membership/create", {
          name: data.name,
          fee: parseFloat(data.fee),
          duration: parseInt(data.duration),
          discount: parseFloat(data.discount),
          status_id: parseInt(data.status_id),
        });
        toast.success("Membership created successfully!");
      }
      setShowForm(false);
      setEditingMembership(null);
      reset();
      fetchMemberships();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save membership");
    }
  };

  const onSubmitAllocate = async (data) => {
    if (!selectedUser) {
      toast.error("Please select a user");
      return;
    }
    try {
      await api.post("/membership/allocate", {
        user_id: selectedUser.id,
        membership_id: Number(data.membership_id),
        branch_id: Number(data.branch_id),
      });
      toast.success("Membership allocated successfully!");
      setShowAllocateForm(false);
      setSelectedUser(null);
      setUserSearchTerm("");
      setUserResults([]);
      resetAllocate();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to allocate membership",
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/membership/delete/${deleteTarget.membership_id}`);
      toast.success("Membership deleted successfully!");
      setDeleteTarget(null);
      fetchMemberships();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    }
  };

  const confirmRestore = async () => {
    if (!deleteTarget) return;
    try {
      await api.patch(
        `/membership/restore/${deleteTarget.membership_id}/restore`,
      );
      toast.success("Membership restored successfully!");
      setDeleteTarget(null);
      fetchMemberships();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to restore");
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Memberships</h1>
        <div className="flex gap-2">
          {canCreateMembership && (
            <button
              onClick={openAllocateForm}
              className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700"
            >
              Allocate Membership
            </button>
          )}
          {(canCreateMembership || canUpdateMembership) && (
            <button
              onClick={openAddForm}
              className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              Add Membership
            </button>
          )}
        </div>
      </div>

      {canCreateMembership && showAllocateForm && (
        <form
          onSubmit={handleSubmitAllocate(onSubmitAllocate)}
          className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
        >
          <h2 className="font-semibold">Allocate Membership</h2>

          {!selectedUser ? (
            <div className="relative">
              <input
                type="text"
                placeholder="Search user by ID, name, or email (min 2 chars)"
                value={userSearchTerm}
                onChange={(e) => {
                  setUserSearchTerm(e.target.value);
                  setSelectedUser(null);
                }}
                className="w-full px-3 py-2 border rounded-lg"
              />
              {searchingUsers && (
                <div className="text-xs text-gray-500 mt-1">Searching...</div>
              )}
              {userSearchTerm.length >= 2 &&
                !searchingUsers &&
                userResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-lg shadow mt-1 max-h-60 overflow-y-auto">
                    {userResults.map((u) => (
                      <div
                        key={u.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedUser(u);
                          setUserSearchTerm(`${u.name} (${u.email})`);
                          setUserResults([]);
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="text-sm font-medium">{u.name}</div>
                        <div className="text-xs text-gray-500">
                          ID: {u.id} · {u.email}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              {userSearchTerm.length >= 2 &&
                !searchingUsers &&
                userResults.length === 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    No users found
                  </div>
                )}
            </div>
          ) : (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <div>
                <div className="text-sm font-medium">{selectedUser.name}</div>
                <div className="text-xs text-gray-500">
                  ID: {selectedUser.id} · {selectedUser.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setUserSearchTerm("");
                  setUserResults([]);
                }}
                className="text-red-600 hover:underline text-sm"
              >
                Clear
              </button>
            </div>
          )}

          <div>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              {...registerAllocate("membership_id")}
            >
              <option value="">Select Membership Plan</option>
              {memberships.map((m) => (
                <option key={m.membership_id} value={m.membership_id}>
                  {m.name} — {m.fee} ({m.duration} days)
                </option>
              ))}
            </select>
            {allocateErrors.membership_id && (
              <p className="text-red-500 text-sm mt-1">
                {allocateErrors.membership_id.message}
              </p>
            )}
          </div>

          <div>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              {...registerAllocate("branch_id")}
              disabled={loadingBranches}
            >
              <option value="">
                {loadingBranches ? "Loading branches..." : "Select Branch"}
              </option>
              {availableBranches.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}
                </option>
              ))}
            </select>
            {allocateErrors.branch_id && (
              <p className="text-red-500 text-sm mt-1">
                {allocateErrors.branch_id.message}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isAllocating}
              className="bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isAllocating ? "Allocating..." : "Allocate"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAllocateForm(false);
                setSelectedUser(null);
                setUserSearchTerm("");
                setUserResults([]);
                resetAllocate();
              }}
              className="bg-gray-300 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {(canCreateMembership || canUpdateMembership) && showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white p-4 rounded-lg shadow mb-6 space-y-3"
        >
          <h2 className="font-semibold">
            {editingMembership ? "Edit Membership" : "Add Membership"}
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
            <input
              type="text"
              placeholder="Fee"
              className="w-full px-3 py-2 border rounded-lg"
              {...register("fee")}
            />
            {errors.fee && (
              <p className="text-red-500 text-sm mt-1">{errors.fee.message}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Duration"
              className="w-full px-3 py-2 border rounded-lg"
              {...register("duration")}
            />
            {errors.duration && (
              <p className="text-red-500 text-sm mt-1">
                {errors.duration.message}
              </p>
            )}
          </div>

          <div>
            <input
              type="text"
              placeholder="Discount"
              className="w-full px-3 py-2 border rounded-lg"
              {...register("discount")}
            />
            {errors.discount && (
              <p className="text-red-500 text-sm mt-1">
                {errors.discount.message}
              </p>
            )}
          </div>

          <div>
            <select
              className="w-full px-3 py-2 border rounded-lg"
              {...register("status_id")}
            >
              <option value="">Select Status</option>
              {statusesList.map((s) => (
                <option key={s.status_id} value={s.status_id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.status_id && (
              <p className="text-red-500 text-sm mt-1">
                {errors.status_id.message}
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
                setEditingMembership(null);
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
          <option value="fee-asc">Fee (Low to High)</option>
          <option value="fee-desc">Fee (High to Low)</option>
          <option value="duration-asc">Duration (Low to High)</option>
          <option value="duration-desc">Duration (High to Low)</option>
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
      ) : memberships.length === 0 ? (
        <div className="text-center py-6 text-gray-500">
          No memberships found
        </div>
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
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Fee
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Duration
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Discount
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold">
                  Status
                </th>
                {(canUpdateMembership || canDeleteMembership) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => (
                <tr key={m.membership_id} className="border-t">
                  <td className="px-4 py-3 text-sm">{m.membership_id}</td>
                  <td className="px-4 py-3 text-sm">{m.name}</td>
                  <td className="px-4 py-3 text-sm">{m.fee}</td>
                  <td className="px-4 py-3 text-sm">{m.duration}</td>
                  <td className="px-4 py-3 text-sm">{m.discount}</td>
                  <td className="px-4 py-3 text-sm">{m.status || "—"}</td>
                  {(canUpdateMembership || canDeleteMembership) && (
                    <td className="px-4 py-3 text-sm space-x-2">
                      {canUpdateMembership && (
                        <button
                          onClick={() => openEditForm(m)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                      {canDeleteMembership && (
                        <button
                          onClick={() => setDeleteTarget(m)}
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
          Page {currentPage} of {totalPages} ({total} memberships)
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
    </div>
  );
};

export default Memberships;