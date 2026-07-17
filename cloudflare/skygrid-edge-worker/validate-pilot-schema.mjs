import {
  mkdirSync,
  readFileSync,
  rmSync
} from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const temporaryDirectory = fileURLToPath(
  new URL("./.tmp/", import.meta.url)
);

const databasePath = fileURLToPath(
  new URL(
    "./.tmp/skygrid-pilot-schema.sqlite",
    import.meta.url
  )
);

const schemaPath = fileURLToPath(
  new URL(
    "./schema/skygrid-pilot-events.sql",
    import.meta.url
  )
);

mkdirSync(temporaryDirectory, {
  recursive: true
});

rmSync(databasePath, {
  force: true
});

const schema = readFileSync(schemaPath, "utf8");
const database = new DatabaseSync(databasePath);

try {
  database.exec(schema);

  const tables = database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table'
    ORDER BY name
  `).all();

  const columns = database
    .prepare(
      "PRAGMA table_info('SkygridPilotEvents')"
    )
    .all();

  const indexes = database
    .prepare(
      "PRAGMA index_list('SkygridPilotEvents')"
    )
    .all();

  console.log(JSON.stringify({
    ok: true,
    databasePath,
    tables,
    columnCount: columns.length,
    columns,
    indexes
  }, null, 2));
} finally {
  database.close();
}