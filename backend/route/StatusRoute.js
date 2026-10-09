import express from "express";
import { getAllStatuses } from "../controller/StatusController.js";

const statusRoute = express.Router();

statusRoute.get("/", getAllStatuses);

export default statusRoute;
