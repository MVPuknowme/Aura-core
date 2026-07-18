export const SKYGRID_CI_INGEST_SECRET =
  "skygrid-controlled-pilot-ci-secret-not-for-production";

if (
  String(process.env.CI || "").toLowerCase() === "true" &&
  !process.env.SKYGRID_INGEST_SECRET
) {
  process.env.SKYGRID_INGEST_SECRET = SKYGRID_CI_INGEST_SECRET;
}
