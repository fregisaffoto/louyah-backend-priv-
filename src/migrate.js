// Exécute le schéma SQL puis crée les comptes de démarrage (mots de passe hachés).
// Usage : node src/migrate.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');

const DEFAULT_ACCOUNTS = [
  { login: 'admin',       pass: 'louyah2025', role: 'dg',           nom: 'Administrateur DG',     email: 'admin@louyahservices.ci' },
  { login: 'raf',         pass: 'raf2025',     role: 'raf',          nom: 'RAF Finance',            email: 'raf@louyahservices.ci' },
  { login: 'rrh',         pass: 'rrh2025',     role: 'rrh',          nom: 'Responsable RH',         email: 'rh@louyahservices.ci' },
  { login: 'marketing',   pass: 'mkt2025',     role: 'mkt',          nom: 'Resp. Marketing',        email: 'mkt@louyahservices.ci' },
  { login: 'superviseur', pass: 'sup2025',     role: 'superviseur',  nom: 'Superviseur Tech.',      email: 'sup@louyahservices.ci' },
  { login: 'support',     pass: 'it2025',      role: 'support',      nom: 'Support Technique',      email: 'support@louyahservices.ci' }
];

async function run() {
  console.log('→ Lecture de schema.sql...');
  const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
  console.log('→ Création des tables...');
  await db.query(schema);
  console.log('✓ Tables créées.');

  console.log('→ Vérification des comptes par défaut...');
  for (const acc of DEFAULT_ACCOUNTS) {
    const existing = await db.query('SELECT id FROM users WHERE login = $1', [acc.login]);
    if (existing.rows.length > 0) {
      console.log(`  - ${acc.login} : déjà présent, ignoré`);
      continue;
    }
    const hash = await bcrypt.hash(acc.pass, 12);
    await db.query(
      'INSERT INTO users (nom, login, password_hash, role, email, statut) VALUES ($1,$2,$3,$4,$5,$6)',
      [acc.nom, acc.login, hash, acc.role, acc.email, 'Actif']
    );
    console.log(`  ✓ Compte créé : ${acc.login} (mot de passe par défaut : ${acc.pass} — À CHANGER après la première connexion)`);
  }

  console.log('\n✓ Migration terminée avec succès.');
  process.exit(0);
}

run().catch((err) => {
  console.error('✗ Échec de la migration :', err);
  process.exit(1);
});
