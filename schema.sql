-- ============================================================
-- LOUYAH SERVICES SARL — Schéma de base de données (Fondations)
-- Modules couverts : Authentification, Employés, Paramètres de paie, Bulletins
-- À exécuter une seule fois sur la base PostgreSQL (voir README.md)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(150) NOT NULL,
  login         VARCHAR(60)  NOT NULL UNIQUE,
  password_hash TEXT         NOT NULL,
  role          VARCHAR(30)  NOT NULL DEFAULT 'dg',
  email         VARCHAR(150),
  tel           VARCHAR(40),
  statut        VARCHAR(20)  NOT NULL DEFAULT 'Actif',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employees (
  id            SERIAL PRIMARY KEY,
  matricule     VARCHAR(30)  UNIQUE,
  nom           VARCHAR(150) NOT NULL,
  poste         VARCHAR(120),
  service       VARCHAR(120),
  contrat       VARCHAR(30)  DEFAULT 'CDI',
  date_entree   DATE,
  date_sortie   DATE,
  statut        VARCHAR(20)  NOT NULL DEFAULT 'Actif',
  salaire_base  NUMERIC(14,2) NOT NULL DEFAULT 0,
  cnps          VARCHAR(40),
  nationalite   VARCHAR(60),
  genre         VARCHAR(20),
  photo_data    TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll_config (
  id        INT PRIMARY KEY DEFAULT 1,
  smig      NUMERIC(14,2) NOT NULL DEFAULT 75000,
  plafond   NUMERIC(14,2) NOT NULL DEFAULT 1647315,
  tx_sal    NUMERIC(5,2)  NOT NULL DEFAULT 6.3,
  tx_pat    NUMERIC(5,2)  NOT NULL DEFAULT 13.5,
  atmp      NUMERIC(5,2)  NOT NULL DEFAULT 2.0,
  transport NUMERIC(14,2) NOT NULL DEFAULT 30000,
  CONSTRAINT single_row CHECK (id = 1)
);
INSERT INTO payroll_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS payslips (
  id           SERIAL PRIMARY KEY,
  employee_id  INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  mois         VARCHAR(20) NOT NULL,
  brut         NUMERIC(14,2) NOT NULL,
  cnps_sal     NUMERIC(14,2) NOT NULL,
  cnps_pat     NUMERIC(14,2) NOT NULL,
  its          NUMERIC(14,2) NOT NULL,
  transport    NUMERIC(14,2) NOT NULL,
  net          NUMERIC(14,2) NOT NULL,
  statut       VARCHAR(20) NOT NULL DEFAULT 'Genere',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(employee_id, mois)
);

CREATE INDEX IF NOT EXISTS idx_payslips_mois ON payslips(mois);
CREATE INDEX IF NOT EXISTS idx_employees_statut ON employees(statut);

-- ============================================================
-- MODULES SUIVANTS : CRM, Facturation, Dépenses, Stock, Congés,
-- Support, Documents, Planning, Communications, Formations,
-- Infos société (comptabilité = agrégation en lecture seule, pas de table)
-- ============================================================

CREATE TABLE IF NOT EXISTS company_info (
  id       INT PRIMARY KEY DEFAULT 1,
  nom      VARCHAR(150) NOT NULL DEFAULT 'LOUYAH SERVICES SARL',
  rccm     VARCHAR(60)  NOT NULL DEFAULT 'CI-ABJ-2019-B-12847',
  nif      VARCHAR(60)  NOT NULL DEFAULT '2019347810',
  tel      VARCHAR(40)  NOT NULL DEFAULT '+225 07 07 07 07 07',
  email    VARCHAR(150) NOT NULL DEFAULT 'contact@louyahservices.ci',
  adresse  VARCHAR(200) NOT NULL DEFAULT 'Cocody, Abidjan, Côte d''Ivoire',
  CONSTRAINT single_row_company CHECK (id = 1)
);
INSERT INTO company_info (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS clients (
  id            SERIAL PRIMARY KEY,
  nom           VARCHAR(150) NOT NULL,
  secteur       VARCHAR(120),
  ca_annuel     NUMERIC(14,2) DEFAULT 0,
  statut        VARCHAR(20) NOT NULL DEFAULT 'Prospect',
  contact_email VARCHAR(150),
  contact_tel   VARCHAR(40),
  adresse       VARCHAR(200),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invoices (
  id         SERIAL PRIMARY KEY,
  num        VARCHAR(40) NOT NULL UNIQUE,
  type       VARCHAR(10) NOT NULL DEFAULT 'facture' CHECK (type IN ('facture','devis')),
  client     VARCHAR(150) NOT NULL,
  service    VARCHAR(200),
  ht         NUMERIC(14,2) NOT NULL DEFAULT 0,
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  echeance   DATE,
  statut     VARCHAR(20) NOT NULL DEFAULT 'En attente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS expenses (
  id          SERIAL PRIMARY KEY,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  categorie   VARCHAR(100),
  description VARCHAR(300),
  fournisseur VARCHAR(150),
  montant     NUMERIC(14,2) NOT NULL DEFAULT 0,
  mode        VARCHAR(40),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS interventions (
  id          SERIAL PRIMARY KEY,
  client      VARCHAR(150) NOT NULL,
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  agent       VARCHAR(150),
  service     VARCHAR(150),
  statut      VARCHAR(30) NOT NULL DEFAULT 'Planifiee',
  description VARCHAR(500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS materials (
  id         SERIAL PRIMARY KEY,
  ref        VARCHAR(40) UNIQUE,
  nom        VARCHAR(150) NOT NULL,
  categorie  VARCHAR(100),
  stock      INT NOT NULL DEFAULT 0,
  stock_min  INT NOT NULL DEFAULT 5,
  valeur     NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leaves (
  id           SERIAL PRIMARY KEY,
  employee_id  INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type         VARCHAR(40) NOT NULL DEFAULT 'Congé annuel',
  debut        DATE NOT NULL,
  fin          DATE NOT NULL,
  jours        INT NOT NULL,
  motif        VARCHAR(300),
  statut       VARCHAR(30) NOT NULL DEFAULT 'En attente N1',
  commentaire  VARCHAR(300),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tickets (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(150) NOT NULL,
  categorie  VARCHAR(100),
  sujet      VARCHAR(200) NOT NULL,
  priorite   VARCHAR(20) NOT NULL DEFAULT 'normal',
  statut     VARCHAR(20) NOT NULL DEFAULT 'Ouvert',
  description VARCHAR(1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(200) NOT NULL,
  type       VARCHAR(80),
  taille_ko  INT,
  data       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS planning_entries (
  id          SERIAL PRIMARY KEY,
  employee_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,
  day_index   INT NOT NULL CHECK (day_index BETWEEN 0 AND 5),
  type        VARCHAR(20) NOT NULL DEFAULT 'assigned',
  UNIQUE(employee_id, week_start, day_index)
);

CREATE TABLE IF NOT EXISTS communications (
  id         SERIAL PRIMARY KEY,
  dest       VARCHAR(150) NOT NULL,
  type       VARCHAR(80),
  message    VARCHAR(2000) NOT NULL,
  statut     VARCHAR(20) NOT NULL DEFAULT 'Brouillon',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trainings (
  id           SERIAL PRIMARY KEY,
  titre        VARCHAR(200) NOT NULL,
  formateur    VARCHAR(150),
  date         DATE,
  duree        VARCHAR(60),
  participants VARCHAR(200),
  statut       VARCHAR(30) NOT NULL DEFAULT 'Planifiée',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(type);
CREATE INDEX IF NOT EXISTS idx_leaves_employee ON leaves(employee_id);
CREATE INDEX IF NOT EXISTS idx_planning_week ON planning_entries(week_start);

