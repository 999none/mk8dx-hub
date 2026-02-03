# MK8DX Squad Queue Schedule Bot

Bot Discord qui synchronise le planning Squad Queue depuis le serveur MK8DX Lounge vers GitHub.

## 🎯 Fonctionnement

1. Le bot écoute un salon Discord qui suit (via Follow) le `#sq-schedule` du MK8DX Lounge
2. Chaque lundi, le Lounge publie le planning de la semaine
3. Le bot parse automatiquement les messages et extrait les données
4. Les données sont envoyées vers un fichier JSON sur GitHub

## 📋 Prérequis

- Node.js >= 18.0.0
- Un bot Discord avec les permissions appropriées
- Un token GitHub avec accès au repo

## 🔧 Installation

### 1. Créer le Bot Discord

1. Allez sur [Discord Developer Portal](https://discord.com/developers/applications)
2. Cliquez "New Application" et donnez un nom
3. Allez dans "Bot" > "Add Bot"
4. Activez:
   - `MESSAGE CONTENT INTENT` (obligatoire pour lire les messages)
   - `SERVER MEMBERS INTENT` (optionnel)
5. Copiez le token du bot

### 2. Inviter le Bot sur votre serveur

Utilisez ce lien (remplacez CLIENT_ID par l'ID de votre application):
```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=68608&scope=bot
```

Permissions requises:
- Read Messages/View Channels
- Read Message History

### 3. Créer le Token GitHub

1. Allez sur [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Générez un nouveau token (classic) avec le scope `repo`
3. Copiez le token

### 4. Configuration

```bash
# Copier le fichier exemple
cp .env.example .env

# Éditer avec vos valeurs
nano .env
```

Variables requises:
```env
DISCORD_BOT_TOKEN=votre_token_discord
DISCORD_SCHEDULE_CHANNEL_ID=id_du_salon_schedule
GITHUB_TOKEN=votre_token_github
GITHUB_OWNER=999none
GITHUB_REPO=mk8dx-hub
GITHUB_BRANCH=emergent
```

### 5. Obtenir l'ID du salon Discord

1. Activez le Mode Développeur dans Discord (Paramètres > Avancés)
2. Clic droit sur le salon "schedule" > "Copier l'identifiant"

## 🚀 Lancement

```bash
# Installer les dépendances
npm install

# Lancer le bot
npm start

# Mode développement (auto-reload)
npm run dev
```

## 📝 Format des messages parsés

Le bot parse les lignes au format:
```
#ID 12p FORMAT : <t:TIMESTAMP:f> - <t:TIMESTAMP:R>
```

Exemple:
```
#4243 12p 2v2 : <t:1769941200:f> - <t:1769941200:R>
#4244 12p 3v3 : <t:1769944800:f> - <t:1769944800:R>
```

## 📊 Format JSON de sortie

```json
[
  {
    "id": "4243",
    "format": "2v2",
    "time": 1769941200000
  },
  {
    "id": "4244",
    "format": "3v3",
    "time": 1769944800000
  }
]
```

## 🔍 Fonctionnalités

- ✅ Parse automatique des messages de planning
- ✅ Ignore les messages avec @everyone
- ✅ Accumulation des messages avant push GitHub
- ✅ Fusion intelligente (pas de doublons par ID)
- ✅ Tri chronologique automatique
- ✅ Logs détaillés

## 📁 Structure du projet

```
discord-bot/
├── index.js          # Code principal du bot
├── package.json      # Dépendances
├── .env.example      # Template de configuration
├── .env              # Configuration (à créer)
└── README.md         # Documentation
```

## ⚠️ Notes importantes

- Le bot doit rester en ligne pour capturer les messages
- Utilisez un service comme PM2 ou systemd pour le garder actif
- Les timestamps sont convertis en millisecondes (format JS)
