import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import AuthRoute from "./route/AuthRoute.js";
import staffRoute from "./route/StaffRoute.js";
import membershipRoute from "./route/MembershipRoute.js";
import bookRoute from "./route/BookRoute.js";
import accessRoute from "./route/AccessRoute.js";
import roleRoute from "./route/RoleRoute.js";
import roleAccessRoute from "./route/RoleAccessRoute.js";
import branchRoute from "./route/BranchRoute.js";
import bookBorrowRoute from "./route/BookBorrowRoute.js";
import bookRequestRoute from "./route/BookRequestRoute.js";
import statusRoute from "./route/StatusRoute.js";
import categoryRoute from "./route/CategoryRoute.js";
import dashboardRoute from "./route/DashboardRoute.js";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/auth", AuthRoute);
app.use("/staff", staffRoute);
app.use("/membership", membershipRoute);
app.use("/book", bookRoute);
app.use("/access", accessRoute);
app.use("/role", roleRoute);
app.use("/stamp", roleAccessRoute);
app.use("/branch", branchRoute);
app.use("/borrow", bookBorrowRoute);
app.use("/request", bookRequestRoute);
app.use("/status", statusRoute);
app.use("/category", categoryRoute);
app.use("/dashboard", dashboardRoute);

app.listen(process.env.SERVER_PORT, () => {
  console.log(
    `Server is running at http://localhost:${process.env.SERVER_PORT}`,
  );
});