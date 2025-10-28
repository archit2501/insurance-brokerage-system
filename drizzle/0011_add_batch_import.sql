CREATE TABLE IF NOT EXISTS import_batches (id INTEGER PRIMARY KEY AUTOINCREMENT, batch_number TEXT NOT NULL UNIQUE, import_type TEXT NOT NULL, file_name TEXT NOT NULL, file_size INTEGER, total_rows INTEGER NOT NULL DEFAULT 0, success_rows INTEGER NOT NULL DEFAULT 0, failed_rows INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', validation_errors TEXT, imported_data TEXT, started_at TEXT, completed_at TEXT, imported_by INTEGER REFERENCES users(id), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS import_batch_type_idx ON import_batches(import_type);
CREATE INDEX IF NOT EXISTS import_batch_status_idx ON import_batches(status);
CREATE TABLE IF NOT EXISTS import_batch_sequences (id INTEGER PRIMARY KEY AUTOINCREMENT, year INTEGER NOT NULL, last_seq INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS unique_import_batch_year ON import_batch_sequences(year);
