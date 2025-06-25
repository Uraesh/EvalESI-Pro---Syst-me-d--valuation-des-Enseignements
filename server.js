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
app.use(cors());
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