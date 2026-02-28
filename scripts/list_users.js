require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if(!DATABASE_URL){ console.error('DATABASE_URL not set in .env'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL });

async function main(){
  try{
    const r = await pool.query('SELECT username, email, created_at FROM users ORDER BY created_at');
    if(r.rowCount === 0){
      console.log('No users');
      return;
    }
    r.rows.forEach(row => console.log(`${row.username} | ${row.email}`));
  }catch(err){
    console.error('Query failed', err);
    process.exit(2);
  }finally{
    await pool.end();
  }
}

main();
