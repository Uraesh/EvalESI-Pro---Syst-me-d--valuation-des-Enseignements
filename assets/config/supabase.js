import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Charger les variables d'environnement
dotenv.config()

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("***********************************************************************************")
    console.error("ERREUR CRITIQUE: SUPABASE_URL ou SUPABASE_KEY ne sont pas définies dans le .env")
    console.error("Le client Supabase côté serveur ne pourra pas s'initialiser.")
    console.error("Veuillez créer un fichier .env à la racine du projet et y ajouter :")
    console.error("SUPABASE_URL=your_supabase_url")
    console.error("SUPABASE_KEY=your_supabase_anon_key")
    console.error("***********************************************************************************")
    // Optionnel: throw new Error("Supabase URL/Key missing"); ou process.exit(1) si l'app ne peut pas tourner sans.
    throw new Error("ERREUR CRITIQUE: SUPABASE_URL ou SUPABASE_KEY ne sont pas définies. L'application ne peut pas démarrer.");
}

// Création du client Supabase
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase 