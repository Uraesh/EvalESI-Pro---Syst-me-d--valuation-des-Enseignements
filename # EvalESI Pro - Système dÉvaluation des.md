# EvalESI Pro - Système d'Évaluation des Enseignements

## 📋 Description
EvalESI Pro est une application web moderne dédiée à l'évaluation des enseignements à l'École Supérieure d'Informatique (ESI). Cette plateforme offre une interface intuitive et sécurisée pour la gestion, la soumission et l'analyse des évaluations pédagogiques.

## 🚀 Fonctionnalités Principales

### Pour l'Administration
- Interface d'authentification sécurisée
- Tableau de bord analytique en temps réel
- Gestion complète des sessions d'évaluation 
- Génération de liens uniques temporaires
- Rapports détaillés et visualisations
- Classements et statistiques par enseignant

### Pour les Étudiants
- Formulaire d'évaluation moderne et intuitif
- Interface immersive en plein écran
- 44 critères répartis en 7 sections
- Soumission anonyme sécurisée
- Progression en temps réel
- Confirmation de soumission

### Intelligence Artificielle
- Modèle Random Forest pour prédictions
- Analyses de tendances automatisées
- Recommandations intelligentes
- Détection des patterns d'amélioration

## 🛠️ Technologies Utilisées

### Frontend
- HTML5/CSS3 avec design responsive
- JavaScript (ES6+) 
- Bootstrap 5.3.2
- Alpine.js pour la réactivité
- Plotly.js pour les visualisations
- Font Awesome 6.5.1 pour les icônes

### Backend & Base de données
- Supabase (PostgreSQL + Auth)
- API RESTful
- Système de cache Redis
- Node.js & Express

### Sécurité
- Protection XSS et CSRF 
- Headers de sécurité renforcés
- Validation des données
- Rate limiting
- Authentification JWT

## 🎨 Design System

### Architecture CSS
Le projet utilise une architecture CSS modulaire avec :


### Variables CSS (Design Tokens)
- Palette de couleurs ESI
- Système de grille et espacement 
- Ombres et élévations
- Transitions et animations
- Typographie et rayons

## 📦 Installation

1. **Cloner le repository**
```bash
git clone https://github.com/esi/evalesi-pro.git
cd evalesi-pro
```

2. **Configurer l'environnement**
```bash
cp .env.example .env
# Éditer .env avec vos configurations
```

3. **Installer les dépendances**
```bash
npm install
```
4. **Lancer l'application**
```bash
npm run dev     # Mode développement
npm run build   # Construction
npm start       # Production
```

🔧 Configuration

Prérequis

Node.js 16+
NPM ou Yarn
Compte Supabase
Variables d'environnement
Copiez .env.example vers .env et configurez :

SUPABASE_URL : URL de votre projet Supabase
SUPABASE_KEY : Clé API Supabase
JWT_SECRET : Secret pour les tokens JWT
Autres configurations (cache, uploads, etc.)


📄 Génération des Liens

Le système utilise nanoid pour générer des liens d'évaluation uniques :
const evaluationId = nanoid(10);
const evaluationUrl = `${baseUrl}/evaluation/${evaluationId}`;

Avantages :

IDs cryptographiquement sécurisés
Génération rapide (10 caractères)
Compatible avec les URLs
Probabilité de collision quasi-nulle
🤝 Contribution
Les contributions sont les bienvenues ! Pour contribuer :

Forker le projet
Créer une branche (git checkout -b feature/amelioration)
Commiter vos changements (git commit -am 'Ajout de fonctionnalité')
Pusher la branche (git push origin feature/amelioration)
Ouvrir une Pull Request

📝 Licence
© 2025 École Supérieure d'Informatique (ESI). Tous droits réservés.

📞 Support
Pour toute question ou assistance :

Email : support@esi.dz
Documentation : docs.evalesi.esi.dz
Issues GitHub : github.com/esi/evalesi-pro/issues
