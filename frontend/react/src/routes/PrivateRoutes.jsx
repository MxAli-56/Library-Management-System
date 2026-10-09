import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoutes.jsx";
import StaffRoute from "./StaffRoute.jsx";
import Layout from "../layouts/Layout";
import Dashboard from "../pages/user/Dashboard";
import Profile from "../pages/user/Profile";
import Books from "../pages/user/Book";
import BookDetails from "../pages/user/BookDetails";
import MyBorrows from "../pages/user/MyBorrows";
import BookRequest from "../pages/user/BookRequest";
import Membership from "../pages/user/Membership";
import AdminHome from "../pages/admin/AdminHome";
import Users from "../pages/admin/Users";
import BooksAdmin from "../pages/admin/Books";
import MembershipsAdmin from "../pages/admin/Memberships";
import RolesAdmin from "../pages/admin/Roles";
import BranchesAdmin from "../pages/admin/Branches";
import AccessAdmin from "../pages/admin/Access";
import BorrowsAdmin from "../pages/admin/Borrows";
import RequestsAdmin from "../pages/admin/Requests";
import CategoriesAdmin from "../pages/admin/Categories";
import DashboardStats from "../pages/admin/DashboardStats";

const PrivateRoutes = () => {
  return (
    <ProtectedRoute>
      <Routes>
        <Route
          path="/"
          element={
            <Layout>
              <Dashboard />
            </Layout>
          }
        />
        <Route
          path="/books"
          element={
            <Layout>
              <Books />
            </Layout>
          }
        />
        <Route
          path="/books/:id"
          element={
            <Layout>
              <BookDetails />
            </Layout>
          }
        />
        <Route
          path="/my-borrows"
          element={
            <Layout>
              <MyBorrows />
            </Layout>
          }
        />
        <Route
          path="/book-request"
          element={
            <Layout>
              <BookRequest />
            </Layout>
          }
        />
        <Route
          path="/membership"
          element={
            <Layout>
              <Membership />
            </Layout>
          }
        />
        <Route
          path="/profile"
          element={
            <Layout>
              <Profile />
            </Layout>
          }
        />

        <Route
          path="/admin"
          element={
            <StaffRoute>
              <Layout>
                <AdminHome />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <StaffRoute>
              <Layout>
                <Users />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/books"
          element={
            <StaffRoute>
              <Layout>
                <BooksAdmin />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/memberships"
          element={
            <StaffRoute>
              <Layout>
                <MembershipsAdmin />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/roles"
          element={
            <StaffRoute>
              <Layout>
                <RolesAdmin />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/branches"
          element={
            <StaffRoute>
              <Layout>
                <BranchesAdmin />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/access"
          element={
            <StaffRoute>
              <Layout>
                <AccessAdmin />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/borrows"
          element={
            <StaffRoute>
              <Layout>
                <BorrowsAdmin />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/requests"
          element={
            <StaffRoute>
              <Layout>
                <RequestsAdmin />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/categories"
          element={
            <StaffRoute>
              <Layout>
                <CategoriesAdmin />
              </Layout>
            </StaffRoute>
          }
        />
        <Route
          path="/admin/stats"
          element={
            <StaffRoute>
              <Layout>
                <DashboardStats />
              </Layout>
            </StaffRoute>
          }
        />
      </Routes>
    </ProtectedRoute>
  );
};

export default PrivateRoutes;