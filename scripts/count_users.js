require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if(!DATABASE_URL){ console.error('DATABASE_URL not set in .env'); process.exit(1); }

const pool = new Pool({ connectionString: DATABASE_URL });

async function main(){
  try{
    const r = await pool.query('SELECT COUNT(*)::int AS cnt FROM users');
    const cnt = r.rows[0].cnt;
    console.log(cnt);
  }catch(err){
    console.error('Query failed', err);
    process.exit(2);
  }finally{
    await pool.end();
  }
}

main();
