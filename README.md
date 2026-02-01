# MK8DX Competitive Hub 🏁

Hub compétitif complet pour les joueurs de **Mario Kart 8 Deluxe Lounge**. Suivez vos stats en temps réel, progressez avec l'Academy, et dominez le classement !

## ✨ Fonctionnalités

### 📊 Dashboard
- **Stats en temps réel** : MMR, Win Rate, Rank
- **Graphique de progression** : Évolution MMR sur 30 jours (Recharts)
- **Historique des matchs** : 10 dernières courses avec notation officielle (rRR, bYV, etc.)
- **Next Rank Calculator** : Progression vers le prochain rang
- **Team Roster** : Statut en ligne/hors ligne de votre équipe

### 🎯 MK8DX Academy
- **Techniques Avancées** : Soft Drift, Motion Glider, Counter Hop, Kusaan Slide, Fast Glider
- **Meta Combos** : Builds S-Tier et A-Tier avec stats détaillées
- **Guides Complets** : Item Management (Bagging vs Running), shortcuts, techniques de planeur
- **Mindset** : Process vs Results, Learn from Loss, Manage Tilt
- **Goal Tracker** : 8 objectifs interactifs pour progresser

### 🏆 Tournois & Événements
- **Squad Queue** : Calendrier hebdomadaire
- **Wars 6v6** : Compétitions par équipes
- **Notifications** : Alerts pour les événements à venir
- **Liens externes** : MKCentral Lounge, Discord Lounge

### 🎯 Leaderboard
- **Classement global** : Top 100 joueurs du Lounge
- **Refresh automatique** : Toutes les heures
- **Cache intelligent** : MongoDB pour performances optimales
- **Intégration 8dxlounge.js** : Données officielles du Lounge

### 🔐 Authentification Discord
- **OAuth 2.0** : Connexion sécurisée avec Discord
- **Vérification serveur** : Vérifie la présence dans le serveur Lounge (445404006177570829)
- **Pseudo spécifique** : Récupère le nickname du serveur Lounge
- **Vérification semi-automatique** : Admin valide après contrôle de l'activité

### 👤 Admin Panel
- **Gestion des vérifications** : Approuver/Rejeter les nouveaux joueurs
- **Contrôle d'activité** : Vérifie automatiquement via l'API Lounge
- **Notifications** : Alertes pour nouvelles demandes

## 🛠️ Tech Stack

- **Framework** : Next.js 14 (App Router)
- **Styling** : Tailwind CSS + shadcn/ui
- **Charts** : Recharts
- **Database** : MongoDB
- **Auth** : Discord OAuth 2.0
- **API** : 8dxlounge.js (Lounge officiel)
- **Notifications** : Sonner (Toast)

## 🚀 Installation

```bash
# Installer les dépendances
yarn install

# Configurer les variables d'environnement
cp .env.example .env

# Lancer le serveur de développement
yarn dev
```

## 🔑 Variables d'Environnement

```env
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=mk8dx_hub

# Next.js
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Discord OAuth
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret
DISCORD_REDIRECT_URI=https://your-domain.com/api/auth/discord/callback
DISCORD_LOUNGE_SERVER_ID=445404006177570829

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_secret_key
```

## 📚 API Endpoints

### Public
- `GET /api/` - Informations API
- `GET /api/stats` - Statistiques globales
- `GET /api/tournaments` - Liste des tournois
- `GET /api/leaderboard` - Classement global (cache 1h)

### Player (Auth required)
- `GET /api/player` - Profil joueur
- `GET /api/player/mmr-history` - Historique MMR
- `GET /api/player/match-history` - Historique matchs
- `GET /api/player/team` - Roster équipe

### Auth
- `GET /api/auth/discord` - Initier OAuth Discord
- `GET /api/auth/discord/callback` - Callback OAuth

### Admin
- `GET /api/admin/pending-verifications` - Vérifications en attente
- `POST /api/admin/verify-player` - Approuver/Rejeter un joueur

### Lounge Integration
- `GET /api/lounge/player/:name` - Rechercher un joueur sur le Lounge

## 📂 Structure MongoDB

### Collections

#### `users`
```javascript
{
  discordId: String,
  serverNickname: String,
  loungeData: Object,
  mmr: Number,
  verified: Boolean,
  verifiedAt: Date,
  createdAt: Date
}
```

#### `pending_verifications`
```javascript
{
  discordId: String,
  username: String,
  serverNickname: String,
  avatar: String,
  status: String, // 'pending', 'approved', 'rejected', 'not_active'
  createdAt: Date
}
```

#### `leaderboard_cache`
```javascript
{
  type: 'global',
  data: Array,
  lastUpdate: Date
}
```

#### `goals`
```javascript
{
  userId: String,
  completedGoals: Array,
  updatedAt: Date
}
```

## 🎮 Système de Rangs

| Rang | MMR Requis | Couleur |
|------|------------|----------|
| Iron | 0 | Gris |
| Bronze | 2000 | Bronze |
| Silver | 4000 | Argent |
| Gold | 6000 | Or |
| Platinum | 8000 | Platine |
| Sapphire | 10000 | Bleu |
| Ruby | 12000 | Rouge |
| Diamond | 14000 | Cyan |
| Master | 16000 | Violet |
| Grandmaster | 17000 | Orange |

## 🔄 Synchronisation Lounge

### Automatique
- **Leaderboard** : Refresh toutes les heures
- **Cache intelligent** : MongoDB pour réduire les appels API

### Manuel
- Bouton "Actualiser" sur le Leaderboard
- Admin peut forcer la synchro des profils

## 👥 Workflow de Vérification

1. **Joueur se connecte** avec Discord OAuth
2. **Vérification automatique** : Présence dans serveur Lounge
3. **Récupération pseudo** : Nickname spécifique au serveur
4. **Demande en attente** : Enregistrée dans `pending_verifications`
5. **Admin valide** : Vérifie activité sur Lounge via API
6. **Si actif** : Compte créé, profil importé
7. **Si inactif** : Message "Jouez quelques parties d'abord"

## 🔗 Liens Utiles

- [MKCentral Lounge](https://lounge.mkcentral.com/mk8dx/)
- [MK World Builder](https://www.mkworldbuilder.com/)
- [Discord Lounge 150cc](https://discord.gg/revmGkE)
- [8dxlounge.js Documentation](https://github.com/iamtakagi/8dxlounge.js)

## 📝 Notes de Développement

### Design
- **Minimaliste B&W** : Inspiré de mkworldbuilder.com
- **Dark mode** : Par défaut
- **Animations** : Float, Pulse Subtle
- **Grid pattern** : Background avec lignes subtiles

### Performance
- **Cache MongoDB** : Réduit les appels API Lounge
- **Incremental Static Regeneration** : Next.js pour pages statiques
- **Lazy loading** : Images et composants lourds

### Sécurité
- **Discord OAuth** : Sécurisé avec client secret
- **Admin routes** : À protéger avec middleware auth
- **Rate limiting** : À implémenter pour API publique

## 🛣️ Roadmap

- [ ] Authentification complète avec sessions
- [ ] Notifications Discord webhook pour admin
- [ ] Historique de progression MMR personnel
- [ ] Système de teams/clans
- [ ] Analyse avancée des performances
- [ ] Export de stats en PDF
- [ ] Integration avec replays YouTube

## 👨‍💻 Contribution

Ce projet est ouvert aux contributions ! N'hésitez pas à ouvrir des issues ou pull requests.

## 🔐 Discord OAuth Integration

This application includes a complete Discord OAuth integration allowing users to authenticate with their Discord accounts.

### Setup

1. Create a Discord Application at https://discord.com/developers/applications
2. Configure the following environment variables in `.env.local`:
   ```
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3000
   ```
3. The integration is already configured with the necessary NextAuth setup in `lib/auth.js`

### Features

- Discord login button component
- User profile display with Discord information
- Protected dashboard route
- Session management
- Automatic redirection for unauthenticated users

## 📝 License

MIT License - Projet non officiel, non affilié à Nintendo ou MKCentral.

---

**Fait avec ❤️ pour la communauté MK8DX Lounge**
