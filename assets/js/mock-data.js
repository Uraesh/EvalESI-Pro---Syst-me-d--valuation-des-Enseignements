// Données fictives pour le développement
const mockData = {
    // Données de connexion
    users: [
        {
            id: 1,
            email: 'admin@esi.dz',
            password: 'admin123',
            is_admin: true,
            nom: 'Admin',
            prenom: 'System'
        },
        {
            id: 2,
            email: 'enseignant@esi.dz',
            password: 'enseignant123',
            is_admin: false,
            nom: 'Dupont',
            prenom: 'Jean'
        }
    ],

    // Données des enseignants
    enseignants: [
        {
            id: 1,
            nom: 'Benali',
            prenom: 'Ahmed',
            email: 'a.benali@esi.dz',
            specialite: 'Informatique'
        },
        {
            id: 2,
            nom: 'Kaci',
            prenom: 'Fatima',
            email: 'f.kaci@esi.dz',
            specialite: 'Mathématiques'
        }
    ],

    // Données des classes
    classes: [
        {
            id: 1,
            nom: '1CS',
            niveau_id: 1,
            filiere_id: 1
        },
        {
            id: 2,
            nom: '2CS',
            niveau_id: 2,
            filiere_id: 1
        }
    ],

    // Données des matières
    matieres: [
        {
            id: 1,
            libelle: 'Programmation Web',
            code: 'PW'
        },
        {
            id: 2,
            libelle: 'Base de données',
            code: 'BD'
        }
    ],

    // Données des sessions d'évaluation
    sessions: [
        {
            id: 1,
            token: 'abc123',
            titre: 'Évaluation du cours de Programmation Web',
            date_ouverture: new Date().toISOString(),
            date_fermeture: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
            enseignement: {
                enseignant: {
                    nom: 'Benali',
                    prenom: 'Ahmed'
                },
                classe: {
                    nom: '1CS'
                },
                matiere: {
                    libelle: 'Programmation Web'
                }
            }
        }
    ],

    // Données pour les graphiques et analyses
    analytics: {
        // Données pour le graphique 3D des tendances
        trends3D: {
            x: Array.from({length: 12}, (_, i) => i + 1), // Mois
            y: ['Satisfaction', 'Engagement', 'Participation', 'Qualité', 'Charge'],
            z: Array.from({length: 12}, () => 
                Array.from({length: 5}, () => Math.random() * 5)
            )
        },

        // Données pour la matrice de corrélation
        correlation: {
            labels: ['Satisfaction', 'Engagement', 'Participation', 'Qualité', 'Charge'],
            data: [
                [1.0, 0.8, 0.6, 0.9, -0.3],
                [0.8, 1.0, 0.7, 0.8, -0.2],
                [0.6, 0.7, 1.0, 0.6, -0.1],
                [0.9, 0.8, 0.6, 1.0, -0.4],
                [-0.3, -0.2, -0.1, -0.4, 1.0]
            ]
        },

        // Données pour la distribution des notes
        distribution: {
            labels: ['1', '2', '3', '4', '5'],
            data: [5, 15, 40, 25, 15]
        },

        // Données pour les prédictions
        predictions: {
            factors: [
                { name: 'Satisfaction', impact: 0.8 },
                { name: 'Engagement', impact: 0.7 },
                { name: 'Participation', impact: 0.6 },
                { name: 'Qualité', impact: 0.9 },
                { name: 'Charge', impact: 0.3 }
            ],
            currentScores: [4.2, 3.8, 4.0, 4.5, 3.5],
            predictedScores: [4.3, 3.9, 4.1, 4.4, 3.6]
        },

        // Métriques du modèle
        modelMetrics: {
            r2: 0.85,
            mse: 0.15,
            confidence: 92
        },

        // Données historiques pour l'entraînement
        trainingData: Array.from({length: 100}, () => ({
            satisfaction: Math.random() * 5,
            engagement: Math.random() * 5,
            participation: Math.random() * 5,
            qualite_enseignement: Math.random() * 5,
            charge_travail: Math.random() * 5,
            note_finale: Math.random() * 5
        }))
    },

    reponses_evaluation: [
        { session_id: 1, ip_hash: 'md5(192.168.1.10)', user_agent_hash: 'md5(Mozilla/5.0 Student1)', fingerprint_hash: 'md5(fingerprint1)', completion_time: 420, commentaire: "Excellent cours, très bien expliqué!" },
        { session_id: 1, ip_hash: 'md5(192.168.1.11)', user_agent_hash: 'md5(Mozilla/5.0 Student2)', fingerprint_hash: 'md5(fingerprint2)', completion_time: 380, commentaire: "Prof très pédagogue" },
        { session_id: 1, ip_hash: 'md5(192.168.1.12)', user_agent_hash: 'md5(Mozilla/5.0 Student3)', fingerprint_hash: 'md5(fingerprint3)', completion_time: 450, commentaire: "Cours intéressant et bien structuré" },
        { session_id: 1, ip_hash: 'md5(192.168.1.13)', user_agent_hash: 'md5(Mozilla/5.0 Student4)', fingerprint_hash: 'md5(fingerprint4)', completion_time: 320, commentaire: "Très bon enseignant" },
        { session_id: 1, ip_hash: 'md5(192.168.1.14)', user_agent_hash: 'md5(Mozilla/5.0 Student5)', fingerprint_hash: 'md5(fingerprint5)', completion_time: 410, commentaire: "Explications claires, merci professeur!" },
        { session_id: 1, ip_hash: 'md5(192.168.1.39)', user_agent_hash: 'md5(Mozilla/5.0 Student30)', fingerprint_hash: 'md5(fingerprint30)', completion_time: 340, commentaire: "Professeur exemplaire" }
    ]
};

// Fonction pour simuler un délai réseau
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour simuler une réponse API
const mockResponse = async (data, error = null, delayMs = 500) => {
    await delay(delayMs);
    if (error) throw error;
    return { data, error: null };
};

// Export des données et fonctions
export { mockData, delay, mockResponse }; 