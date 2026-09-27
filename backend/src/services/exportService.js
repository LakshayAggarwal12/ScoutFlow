import { Parser } from "json2csv";
import * as XLSX from "xlsx";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";

async function loadLatestDatasetRecords(taskId, version) {
  const where = { taskId };
  if (version) where.version = parseInt(version, 10);

  const dataset = await prisma.dataset.findFirst({ where, orderBy: { version: "desc" } });
  if (!dataset) throw new AppError("No dataset found for this task", 404);

  const records = await prisma.record.findMany({
    where: { datasetId: dataset.id },
    include: { source: true },
    orderBy: { createdAt: "asc" },
  });

  return { dataset, records };
}

function buildRows(records) {
  return records.map((r) => ({
    ...r.data,
    validation_status: r.validationStatus,
    confidence: r.confidence ?? 1,
    source_url: r.source?.url || "",
    source_type: r.source?.type || "",
    collected_at: r.source?.createdAt?.toISOString() || r.createdAt?.toISOString() || "",
  }));
}

export async function exportDatasetCsv(taskId, version) {
  const { records } = await loadLatestDatasetRecords(taskId, version);
  const rows = buildRows(records);
  if (rows.length === 0) return "";
  const parser = new Parser();
  return parser.parse(rows);
}

export async function exportDatasetJson(taskId, version) {
  const { dataset, records } = await loadLatestDatasetRecords(taskId, version);
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
      confidence: r.confidence ?? 1,
      source_url: r.source?.url || null,
      source_type: r.source?.type || null,
      collected_at: r.source?.createdAt || r.createdAt || null,
    })),
  };
}

export async function exportDatasetXlsx(taskId, version) {
  const { dataset, records } = await loadLatestDatasetRecords(taskId, version);
  const rows = buildRows(records);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [{ note: "No records" }]);
  XLSX.utils.book_append_sheet(wb, ws, "Records");

  // Second sheet: dataset metadata
  const meta = [
    { field: "dataset_id", value: dataset.id },
    { field: "version", value: dataset.version },
    { field: "used_mock_data", value: String(dataset.usedMockData) },
    { field: "created_at", value: dataset.createdAt?.toISOString() || "" },
    { field: "record_count", value: records.length },
  ];
  const wsMeta = XLSX.utils.json_to_sheet(meta);
  XLSX.utils.book_append_sheet(wb, wsMeta, "Metadata");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
