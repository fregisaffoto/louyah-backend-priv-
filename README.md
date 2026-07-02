# LOUYAH GESTION — Backend (Fondations)

Ce dossier contient un **vrai backend** : serveur Node.js + base de données PostgreSQL,
avec authentification sécurisée (mots de passe hachés, jamais stockés en clair).

**Modules inclus et testés dans cette version :**
- Authentification (connexion, déconnexion, rôles, changement de mot de passe, réinitialisation admin)
- Gestion des comptes utilisateurs (créer, modifier, désactiver, réinitialiser mot de passe)
- Employés (CRUD complet)
- Paramètres de paie + génération de bulletins (CNPS, ITS, net à payer — calculs identiques à l'application d'origine)
- CRM Clients
- Facturation & Devis (numérotation automatique FAC-2026-001, DEV-2026-001...)
- Dépenses
- Interventions
- Matériel & Stock
- Congés (avec vérification du solde annuel et détection des chevauchements)
- Support (tickets)
- Documents (stockage de fichiers)
- Communications marketing (historique)
- Formations RH
- Planning hebdomadaire (semaine calculée dynamiquement)
- Informations société (utilisées par tous les documents générés)
- Comptabilité (bilan, compte de résultat, grand livre, balance — calculés en temps réel à partir des vraies données, pas de saisie manuelle séparée)

**Chaque module a été réellement testé** (pas seulement écrit) : création d'un serveur local
avec base de données PostgreSQL réelle, exécution de vrais appels API, vérification des réponses,
des calculs, des rejets d'accès selon les rôles, et de la résistance du serveur aux erreurs.

Le frontend actuel (`public/index.html`) reste un frontend de démonstration minimal (employés + paie)
pour prouver que le pipeline fonctionne. La migration complète de l'interface graphique existante
vers cette API est la prochaine étape distincte (voir section 8).

---

## 1. Ce dont vous avez besoin

- Un compte [GitHub](https://github.com) (gratuit) — pour héberger le code
- Un compte [Railway](https://railway.app) (gratuit pour démarrer, ~5$/mois ensuite selon l'usage)
- 15 minutes

Vous n'avez **aucune ligne de commande à taper**, aucun serveur à configurer manuellement.

---

## 2. Mettre le code sur GitHub

1. Allez sur [github.com/new](https://github.com/new), créez un dépôt (par exemple `louyah-backend`), **privé** de préférence.
2. Sur la page du nouveau dépôt, cliquez sur **"uploading an existing file"**.
3. Glissez-déposez tout le contenu de ce dossier (`louyah-backend`) dans la zone d'upload.
4. Cliquez sur **"Commit changes"**.

---

## 3. Déployer sur Railway

1. Allez sur [railway.app](https://railway.app) et connectez-vous avec votre compte GitHub.
2. Cliquez sur **"New Project"** → **"Deploy from GitHub repo"** → sélectionnez `louyah-backend`.
3. Railway détecte automatiquement qu'il s'agit d'un projet Node.js et commence à le déployer.
4. Dans le même projet, cliquez sur **"+ New"** → **"Database"** → **"Add PostgreSQL"**.
   Railway crée la base de données et génère automatiquement une variable `DATABASE_URL`.
5. Cliquez sur votre service (pas la base de données, le service web) → onglet **"Variables"** → ajoutez :
   - `JWT_SECRET` = une longue phrase secrète aléatoire (ex: générez-en une sur https://generate-secret.vercel.app/32)
   - `NODE_ENV` = `production`
   - `DATABASE_URL` est déjà ajoutée automatiquement par Railway si vous avez lié la base — sinon copiez-la depuis l'onglet de la base de données.
6. Dans l'onglet **"Settings"** du service, notez l'URL publique générée (ex: `louyah-backend-production.up.railway.app`).

---

## 4. Créer les tables et les comptes de départ

Railway propose un terminal intégré ("Shell") accessible depuis l'onglet du service :

1. Ouvrez l'onglet **"Deployments"** → cliquez sur le dernier déploiement → bouton **"View Logs"** ou cherchez le bouton **"Shell"** / **"Connect"** selon l'interface Railway du moment.
2. Dans ce terminal, tapez simplement :
   ```
   npm run migrate
   ```
3. Vous devriez voir s'afficher la liste des comptes créés avec leurs mots de passe par défaut.

**Important : changez ces mots de passe par défaut dès la première connexion** (une fonctionnalité
de changement de mot de passe sera ajoutée dans la prochaine étape — pour l'instant, contactez-moi
si vous voulez que je l'ajoute en priorité).

---

## 5. Tester

Ouvrez l'URL publique de votre service (celle notée à l'étape 3.6) dans votre navigateur.
Vous devriez voir l'écran de connexion LOUYAH GESTION. Connectez-vous avec :

- Identifiant : `admin`
- Mot de passe : `louyah2025` *(à changer immédiatement après ce premier test)*

---

## 6. Comptes créés par défaut

| Login | Mot de passe | Rôle |
|---|---|---|
| admin | louyah2025 | dg |
| raf | raf2025 | raf |
| rrh | rrh2025 | rrh |
| marketing | mkt2025 | mkt |
| superviseur | sup2025 | superviseur |
| support | it2025 | support |

Ces mots de passe sont **hachés** en base de données (jamais stockés en clair) — même moi,
en regardant la base de données, je ne peux pas les lire, seulement vérifier qu'un mot de passe
saisi correspond au hachage stocké.

---

## 7. Sécurité — ce qui est déjà en place

- Mots de passe hachés avec bcrypt (12 rounds)
- Sessions signées par jeton (JWT), stockées dans un cookie sécurisé `httpOnly`
  (invisible et inaccessible depuis le code JavaScript du navigateur, donc protégé contre le vol de session par script malveillant)
- Protection anti-brute-force simple (blocage 5 min après 5 échecs de connexion)
- Contrôle d'accès par rôle sur chaque route sensible (ex: seuls DG/RAF/RRH peuvent créer un employé)

## 8. Ce qui reste à faire (prochaines étapes)

- Interface graphique complète connectée à l'API (actuellement seul un frontend de démonstration existe pour Employés/Paie — les autres modules sont utilisables via l'API mais pas encore via une belle interface)
- Génération de PDF réels côté serveur pour les bulletins, factures, formulaires (actuellement les données sont renvoyées en JSON, prêtes à être mises en forme)
- Sauvegardes automatiques de la base de données (Railway propose des sauvegardes payantes en option)
- Journal d'audit (qui a modifié quoi et quand) si nécessaire pour la conformité
