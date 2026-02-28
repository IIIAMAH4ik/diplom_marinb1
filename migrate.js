require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const sqlPath = path.join(__dirname, 'migrations', 'create_tables.sql');
if(!fs.existsSync(sqlPath)){
  console.error('Migration file not found:', sqlPath); process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const DATABASE_URL = process.env.DATABASE_URL;
if(!DATABASE_URL){ console.error('DATABASE_URL not set'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL });

(async ()=>{
  try{
    console.log('Applying migration...');
    await pool.query(sql);
    console.log('Migration applied successfully');
    process.exit(0);
  }catch(err){ console.error('Migration failed:', err); process.exit(2); }
})();
