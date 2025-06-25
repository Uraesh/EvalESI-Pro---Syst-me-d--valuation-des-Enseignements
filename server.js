import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import supabase from './assets/config/supabase.js';

// Configuration des variables d'environnement
dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware

// Configuration CORS
// TODO: Remplacez 'https://votre-domaine-frontend.com' par votre domaine frontend réel en production.
// Pour le développement local, vous pouvez autoriser localhost avec le port de votre frontend.
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? ['https://votre-domaine-frontend.com'] // Ajoutez ici d'autres domaines de production si nécessaire
  : [`http://localhost:${process.env.PORT || 3000}`, `http://127.0.0.1:${process.env.PORT || 3000}`]; // Autorise le serveur lui-même pour servir les pages

const corsOptions = {
  origin: function (origin, callback) {
    // Autoriser les requêtes sans origine (ex: Postman, requêtes serveur à serveur, applications mobiles)
    // ou si l'origine est dans la liste autorisée.
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Non autorisé par CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Spécifiez les méthodes HTTP autorisées
  allowedHeaders: ['Content-Type', 'Authorization'], // Spécifiez les en-têtes autorisés
  credentials: true // Si vous utilisez des cookies ou des sessions
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(join(__dirname, 'pages')));
// Configuration des routes pour les fichiers statiques
app.use('/assets', express.static(join(__dirname, 'assets')));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
});
 

app.get('/api/enseignants', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('enseignants')
            .select('*')
            .eq('is_active', true);

        if (error) {
            console.error('Erreur Supabase:', error);
            return res.status(500).json({ message: 'Erreur interne du serveur', details: error.message });
        }

        res.json(data);
    } catch (err) {
        console.error('Erreur API:', err);
        res.status(500).json({ message: 'Erreur interne du serveur' });
    }
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});