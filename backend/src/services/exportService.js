import { Parser } from "json2csv";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

async function loadLatestDatasetRecords(taskId) {
  const dataset = await prisma.dataset.findFirst({ where: { taskId }, orderBy: { version: "desc" } });
  if (!dataset) throw new AppError("No dataset found for this task", 404);

  const records = await prisma.record.findMany({
    where: { datasetId: dataset.id },
    include: { source: true },
    orderBy: { createdAt: "asc" },
  });

  return { dataset, records };
}

export async function exportDatasetCsv(taskId) {
  const { records } = await loadLatestDatasetRecords(taskId);

  const rows = records.map((r) => ({
    ...r.data,
    validation_status: r.validationStatus,
    source_url: r.source?.url || "",
    collected_at: r.source?.createdAt?.toISOString() || "",
  }));

  if (rows.length === 0) return "";
  const parser = new Parser();
  return parser.parse(rows);
}

export async function exportDatasetJson(taskId) {
  const { dataset, records } = await loadLatestDatasetRecords(taskId);

  return {
    dataset: {
      id: dataset.id,
      version: dataset.version,
      usedMockData: dataset.usedMockData,
      createdAt: dataset.createdAt,
    },
    records: records.map((r) => ({
      ...r.data,
      validation_status: r.validationStatus,
      validation_errors: r.validationErrors || [],
      source_url: r.source?.url || null,
      collected_at: r.source?.createdAt || null,
    })),
  };
}
