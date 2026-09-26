import { Router } from "express";
import * as sourceController from "../controllers/sourceController.js";

const router = Router();
router.get("/", sourceController.listSources);
router.get("/health/:taskId", sourceController.getSourceHealth);
router.get("/:id", sourceController.getSource);

export default router;
