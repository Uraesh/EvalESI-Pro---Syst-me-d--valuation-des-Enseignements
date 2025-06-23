# EvalESI Pro - Système d'Évaluation des Enseignements

## 📋 Description
EvalESI Pro est une application web moderne dédiée à l'évaluation des enseignements à l'École Supérieure d'Informatique (ESI). Cette plateforme offre une interface intuitive pour la gestion et l'analyse des évaluations pédagogiques.

## 🚀 Fonctionnalités
- Interface d'authentification sécurisée
- Tableau de bord administratif
- Gestion des sessions d'évaluation
- Analyse des résultats en temps réel
- Rapports détaillés et visualisations
- Support multilingue (Français/Arabe)
- Création d'évaluations personnalisées
- Génération de liens uniques pour chaque évaluation
- Calcul automatique des moyennes

## 🛠️ Technologies Utilisées
- **Frontend**
  - HTML5/CSS3 avec design responsive
  - JavaScript (ES6+)
  - Bootstrap 5.3.2
  - Font Awesome 6.5.1
  - Alpine.js pour la réactivité
  - Plotly.js pour les visualisations
- **Backend**
  - Supabase pour la base de données et l'authentification
  - API RESTful
  - Système de cache intelligent
- **Autres**
  - SweetAlert2 11.10.1
  - nanoid 4.0.2

## 🔒 Sécurité
- Headers de sécurité configurés
- Protection contre les attaques XSS
- Authentification robuste
- Validation des données
- Chiffrement des communications

## 🎨 Design
- Interface moderne et intuitive
- Thème sombre par défaut
- Animations fluides
- Palette de couleurs ESI
- Design responsive

## 🎨 Design System
### Architecture CSS
Le projet utilise une architecture CSS modulaire et maintenable avec les sections suivantes :

1. **Variables CSS (Design Tokens)**
   - Palette de couleurs ESI
   - Système de grille et espacement
   - Ombres et profondeur
   - Transitions et animations
   - Rayons de bordure

2. **Styles de Base**
   - Reset CSS
   - Typographie
   - Arrière-plans animés
   - Layout fondamental

3. **Composants UI**
   - Navigation (Sidebar & Topbar)
   - Cartes et conteneurs
   - Boutons et actions
   - États de chargement
   - Animations d'entrée

4. **Utilitaires**
   - Classes de mise en page
   - Effets visuels (glass, glow)
   - Responsive design
   - Accessibilité

### Structure des Fichiers CSS
```
assets/css/
├── style.css          # Styles globaux et variables
├── forms.css          # Styles des formulaires
├── dashboard.css      # Styles spécifiques au dashboard
└── animations.css     # Animations et transitions
```

## 📦 Installation
1. Cloner le repository
```bash
git clone [URL_DU_REPO]
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env
```

4. Lancer l'application
```bash
npm start
```

## 🔧 Configuration
- Créer un compte Supabase
- Configurer les clés d'API dans le fichier `.env`
- Personnaliser les paramètres dans `config/supabase.js`

## 📝 Structure du Projet
```
evalesi-pro/
├── assets/
│   ├── css/
│   ├── js/
│   └── images/
├── components/
├── pages/
├── data/
└── config/
```

## 🤝 Contribution
Les contributions sont les bienvenues ! Consultez notre guide de contribution pour plus de détails.

## 📄 Licence
© 2025 ESI. Tous droits réservés.

## 📞 Support
Pour toute question ou assistance, veuillez contacter l'équipe de support à [support@esi.dz](mailto:support@esi.dz)

## 📄 Licence
Ce projet est sous licence MIT.

## 📄 Installation des Dépendances
```bash
npm install nanoid
```

## 📄 Génération des Liens d'Évaluation
Le système utilise la bibliothèque `nanoid` pour générer des identifiants uniques pour chaque évaluation. Cette approche offre plusieurs avantages :

- **Sécurité** : Génération d'IDs cryptographiquement sécurisés
- **Performance** : Génération rapide d'IDs de 10 caractères
- **Unicité** : Probabilité extrêmement faible de collision
- **URL-friendly** : Caractères compatibles avec les URLs

### 📄 Exemple d'Utilisation
```javascript
// Génération d'un ID unique de 10 caractères
const evaluationId = nanoid(10);

// Construction de l'URL d'évaluation
const evaluationUrl = `${baseUrl}evaluation-form.html?id=${evaluationId}&teacher=${encodeURIComponent(teacherName)}&subject=${encodeURIComponent(subject)}&level=${level}&class=${encodeURIComponent(className)}`;
``` 