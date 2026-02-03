import { pool } from './db-sql';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Simple migration runner for PostgreSQL
 * Run with: GOOGLE_APPLICATION_CREDENTIALS=./credentials.json npx tsx server/run-migrations.ts
 */

async function runMigrations() {
  console.log('🔄 Starting database migrations...\n');

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Get list of executed migrations
    const result = await pool.query('SELECT name FROM migrations ORDER BY id');
    const executedMigrations = new Set(result.rows.map((r: any) => r.name));

    // Read migration files
    const migrationsDir = join(__dirname, 'migrations');
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    let executed = 0;
    let skipped = 0;

    for (const file of files) {
      if (executedMigrations.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        skipped++;
        continue;
      }

      console.log(`▶️  Executing ${file}...`);
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');

      // Execute migration in a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Completed ${file}`);
        executed++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed to execute ${file}:`, error);
        throw error;
      } finally {
        client.release();
      }
    }

    console.log(`\n✨ Migration summary:`);
    console.log(`   • Executed: ${executed}`);
    console.log(`   • Skipped: ${skipped}`);
    console.log(`   • Total: ${files.length}\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('✅ Migrations completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

export { runMigrations };
