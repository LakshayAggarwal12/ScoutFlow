import { Router } from "express";
import { getDashboardStats } from "../controllers/statsController.js";

const router = Router();
router.get("/", getDashboardStats);

export default router;
