require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const payrollRoutes = require('./routes/payroll');
const usersRoutes = require('./routes/users');
const clientsRoutes = require('./routes/clients');
const invoicesRoutes = require('./routes/invoices');
const expensesRoutes = require('./routes/expenses');
const interventionsRoutes = require('./routes/interventions');
const materialsRoutes = require('./routes/materials');
const leavesRoutes = require('./routes/leaves');
const ticketsRoutes = require('./routes/tickets');
const documentsRoutes = require('./routes/documents');
const communicationsRoutes = require('./routes/communications');
const trainingsRoutes = require('./routes/trainings');
const planningRoutes = require('./routes/planning');
const companyRoutes = require('./routes/company');
const accountingRoutes = require('./routes/accounting');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1); // nécessaire derrière le proxy Railway/Render pour les cookies "secure"

app.use(express.json({ limit: '5mb' })); // 5mb pour autoriser les photos employés en base64
app.use(cookieParser());

// CORS : autorise le frontend à envoyer des cookies. En production, restreindre
// CORS_ORIGIN à votre nom de domaine exact plutôt que d'utiliser '*'.
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));

// Sert le petit frontend de démonstration (login + employés + paie)
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/interventions', interventionsRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/leaves', leavesRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/communications', communicationsRoutes);
app.use('/api/trainings', trainingsRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/company', companyRoutes);
app.use('/api/accounting', accountingRoutes);

// Gestion d'erreurs générique (évite qu'une erreur non gérée ne fasse planter le serveur)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
});

// Filet de sécurité de dernier recours : logue l'erreur au lieu de faire planter
// le processus entier pour tous les utilisateurs connectés.
process.on('unhandledRejection', (err) => {
  console.error('Promesse rejetée non gérée :', err);
});
process.on('uncaughtException', (err) => {
  console.error('Exception non interceptée :', err);
});

app.listen(PORT, () => {
  console.log(`✓ Serveur LOUYAH backend démarré sur le port ${PORT}`);
});
