import { AsyncDuckDB } from "@duckdb/duckdb-wasm";
import * as duckdb from '@duckdb/duckdb-wasm';

// Path to DuckDB WASM worker and other assets
const DUCKDB_BUNDLES = {
  mvp: {
    mainModule: '/duckdb-mvp.wasm',
    mainWorker: '/duckdb-browser-mvp.worker.js',
  },
  eh: {
    mainModule: '/duckdb-eh.wasm',
    mainWorker: '/duckdb-browser-eh.worker.js',
  },
};

// Initialize DuckDB
let db: AsyncDuckDB | null = null;

export async function initDuckDB() {
  if (db) return db;

  // Select the appropriate bundle based on browser features
  const bundle = await duckdb.selectBundle(DUCKDB_BUNDLES);

  // Instantiate the asynchronous version of DuckDB
  const worker = new Worker(bundle.mainWorker);
  const logger = new duckdb.ConsoleLogger();
  db = new AsyncDuckDB(logger, worker);

  // Initialize the database
  await db.instantiate(bundle.mainModule);

  console.log(`DuckDB initialized successfully`);
  return db;
}

// Function to load and query a Parquet file from R2
export async function queryParquetFile(url: string, query: string) {
  const database = await initDuckDB();

  try {
    // Register the remote Parquet file
    await database.registerFileURL('data.parquet', url);

    // Create a connection and execute the query
    const conn = await database.connect();
    const result = await conn.query(query);
    await conn.close();

    return result.toArray();
  } catch (error) {
    console.error(`Error querying Parquet file:`, error);
    throw error;
  }
}
