import { Router } from "express";
import * as taskController from "../controllers/taskController.js";

const router = Router();

router.post("/", taskController.createTask);
router.get("/", taskController.listTasks);
router.get("/:id", taskController.getTask);
router.post("/:id/run", taskController.runTask);
router.post("/:id/cancel", taskController.cancelTask);

router.get("/:id/workflow", taskController.getWorkflow);
router.get("/:id/logs", taskController.getLogs);

router.get("/:id/dataset", taskController.getDataset);
router.get("/:id/dataset/versions", taskController.listDatasetVersions);
router.get("/:id/records", taskController.getRecords);

router.get("/:id/export/csv", taskController.exportCsv);
router.get("/:id/export/json", taskController.exportJson);

export default router;
