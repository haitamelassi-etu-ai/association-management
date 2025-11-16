# 🚀 Backend API - Association Adel Elouerif

## 📋 Professional Portal Backend

Backend API pour la plateforme professionnelle de l'association Adel Elouerif.

---

## 🛠️ Installation

### 1. Installer MongoDB

Téléchargez et installez MongoDB Community Server:
https://www.mongodb.com/try/download/community

### 2. Démarrer MongoDB

```bash
mongod
```

### 3. Installer les dépendances

```bash
cd backend
npm install
```

### 4. Configuration

Le fichier `.env` est déjà configuré avec les paramètres par défaut.

---

## 🚀 Démarrage

### Mode développement (avec auto-reload):
```bash
npm run dev
```

### Mode production:
```bash
npm start
```

Le serveur démarre sur: **http://localhost:5000**

---

## 📡 API Endpoints

### 🔐 Authentication (`/api/auth`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/register` | Créer un nouvel utilisateur | Admin |
| POST | `/login` | Se connecter | Public |
| GET | `/me` | Obtenir l'utilisateur connecté | Private |

### 👥 Bénéficiaires (`/api/beneficiaries`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Liste des bénéficiaires | Private |
| GET | `/:id` | Détails d'un bénéficiaire | Private |
| POST | `/` | Créer un bénéficiaire | Private |
| PUT | `/:id` | Modifier un bénéficiaire | Private |
| DELETE | `/:id` | Supprimer un bénéficiaire | Admin |
| POST | `/:id/suivi` | Ajouter une note de suivi | Private |
| GET | `/stats/dashboard` | Statistiques | Private |

### 📢 Annonces (`/api/announcements`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/` | Liste des annonces | Private |
| POST | `/` | Créer une annonce | Admin/Staff |
| DELETE | `/:id` | Supprimer une annonce | Admin |

### ⏰ Pointage (`/api/attendance`)

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/checkin` | Pointer l'arrivée | Private |
| PUT | `/checkout/:id` | Pointer le départ | Private |
| GET | `/me` | Mon pointage | Private |
| GET | `/` | Tout le pointage | Admin/Staff |

---

## 📝 Exemples d'utilisation

### 1. Créer un utilisateur Admin (Premier utilisateur)

```bash
POST http://localhost:5000/api/auth/register
Content-Type: application/json

{
  "nom": "Admin",
  "prenom": "Principal",
  "email": "admin@adelelouerif.org",
  "password": "admin123",
  "role": "admin",
  "telephone": "0612345678",
  "poste": "Directeur"
}
```

### 2. Se connecter

```bash
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "admin@adelelouerif.org",
  "password": "admin123"
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "_id": "...",
    "nom": "Admin",
    "prenom": "Principal",
    "email": "admin@adelelouerif.org",
    "role": "admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 3. Utiliser le token pour les requêtes

```bash
GET http://localhost:5000/api/beneficiaries
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 👤 Rôles utilisateurs

- **admin**: Accès complet
- **staff**: Personnel - peut gérer les bénéficiaires
- **volunteer**: Bénévole - accès limité

---

## 📊 Modèles de données

### User
- nom, prenom, email, password
- role: admin/staff/volunteer
- telephone, poste
- isActive

### Beneficiary
- nom, prenom, dateNaissance, cin
- dateEntree, dateSortie
- statut: heberge/sorti/en_suivi/transfere
- situationFamiliale, nombreEnfants
- notes, documents, suiviSocial

### Announcement
- titre, contenu
- type: info/urgent/tache/evenement
- priorite: basse/normale/haute
- destinataires: all/admin/staff/volunteer

### Attendance
- user, date
- checkIn, checkOut
- location (GPS), notes
- statut: present/absent/retard/conge

---

## ✅ État actuel

✅ Backend structure complète
✅ Authentication JWT
✅ CRUD Bénéficiaires
✅ Système d'annonces
✅ Système de pointage
✅ Role-based access control
✅ API documentée

---

## 🔜 Prochaines étapes

1. Tester l'API avec Postman/Insomnia
2. Créer le Frontend (Professional Portal)
3. Ajouter le système de Chat (Socket.io)
4. Ajouter l'upload de fichiers
5. Déploiement

---

## 📞 Support

Pour toute question, contactez l'équipe de développement.

**Bon développement! 🚀**
