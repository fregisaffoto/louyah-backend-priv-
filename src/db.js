const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  console.error('ERREUR: la variable d\'environnement DATABASE_URL est absente. Voir README.md.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway/Render fournissent des URL Postgres avec SSL requis en production.
  ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Erreur inattendue du pool PostgreSQL', err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
