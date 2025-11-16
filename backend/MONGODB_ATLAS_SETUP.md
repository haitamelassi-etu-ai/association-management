# 📦 Setup MongoDB Atlas (Base de données Cloud Gratuite)

## 🚀 Pourquoi MongoDB Atlas?
- ✅ **Gratuit** - 512MB sans carte bancaire
- ✅ **Pas d'installation** - Tout dans le cloud
- ✅ **Rapide** - Configuration en 5 minutes
- ✅ **Sécurisé** - Backups automatiques

---

## 📝 Étapes d'installation (5 minutes)

### 1️⃣ Créer un compte
1. Allez sur: https://www.mongodb.com/cloud/atlas/register
2. Cliquez sur **"Try Free"**
3. Inscrivez-vous avec:
   - Email
   - Ou Google/GitHub

### 2️⃣ Créer un Cluster (Base de données)
1. Choisissez: **M0 Free Tier** ✅
2. Provider: **AWS** (ou autre)
3. Region: Choisissez la plus proche (ex: Paris, Frankfurt)
4. Cluster Name: `Cluster0` (par défaut)
5. Cliquez **"Create Cluster"**
6. ⏱️ Attendez 3-5 minutes (prend du café ☕)

### 3️⃣ Créer un utilisateur de base de données
1. Dans le menu gauche → **Database Access**
2. Cliquez **"Add New Database User"**
3. Choisissez: **Password Authentication**
4. Username: `admin` (ou ce que vous voulez)
5. Password: Générez un mot de passe fort (ex: `SecurePass123!`)
   - **⚠️ IMPORTANT: Copiez ce mot de passe!**
6. Database User Privileges: **Read and write to any database**
7. Cliquez **"Add User"**

### 4️⃣ Autoriser l'accès (Whitelist IP)
1. Menu gauche → **Network Access**
2. Cliquez **"Add IP Address"**
3. Choisissez: **"Allow Access from Anywhere"** (0.0.0.0/0)
   - ⚠️ Pour production, utilisez votre IP spécifique
4. Cliquez **"Confirm"**

### 5️⃣ Obtenir la Connection String
1. Retournez à **Database** (menu gauche)
2. Cliquez **"Connect"** sur votre cluster
3. Choisissez: **"Connect your application"**
4. Driver: **Node.js**
5. Version: **4.1 or later**
6. Copiez la **Connection String**:
   ```
   mongodb+srv://admin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

### 6️⃣ Configurer le projet
1. Ouvrez: `backend/.env`
2. Remplacez la ligne `MONGODB_URI` avec votre connection string
3. **⚠️ Remplacez `<password>` par votre vrai mot de passe!**

**Exemple:**
```env
MONGODB_URI=mongodb+srv://admin:SecurePass123!@cluster0.xxxxx.mongodb.net/adel-elouerif?retryWrites=true&w=majority
```

**✅ C'est tout! Vous êtes prêt!**

---

## 🧪 Tester la connexion

```bash
cd backend
npm run dev
```

Vous devriez voir:
```
✅ MongoDB connecté avec succès
🚀 Serveur démarré sur le port 5000
```

---

## 📊 Gérer votre base de données

### Voir les données:
1. Dashboard MongoDB Atlas
2. **Browse Collections**
3. Vous verrez: users, beneficiaries, announcements, attendance

### Backup automatique:
- Atlas fait des backups automatiques (version gratuite = 1 snapshot)

---

## 🆘 Problèmes courants

### ❌ "MongoNetworkError: connection timed out"
**Solution:** Vérifiez Network Access (IP whitelist)

### ❌ "Authentication failed"
**Solution:** Vérifiez username/password dans connection string

### ❌ "Could not connect to any servers"
**Solution:** Attendez 2-3 minutes si le cluster vient d'être créé

---

## 💰 Gratuit pour toujours?
Oui! Le **M0 Free Tier** est gratuit à vie:
- 512MB stockage
- Shared RAM & CPU
- Parfait pour développement et petites apps

---

## 🎯 Alternative locale (si vous voulez quand même)

Si vous préférez installer MongoDB localement:
1. Téléchargez: https://www.mongodb.com/try/download/community
2. Installez MongoDB Community Server
3. Démarrez: `mongod`
4. Dans `.env`, utilisez:
   ```env
   MONGODB_URI=mongodb://localhost:27017/adel-elouerif
   ```

---

**Bon courage! 🚀**
