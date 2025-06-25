/**
 * =============================================================================
 * SUPABASE CLIENT - EvalESI Pro
 * Système d'Évaluation des Enseignements ESI
 * Version : 1.0
 * Auteur : Vétéran Dev (40 ans d'expérience)
 * =============================================================================
 */

// Import des dépendances
import { createClient } from '@supabase/supabase-js';
import Alpine from 'alpinejs'
import Plotly from 'plotly.js'

 

// Mode développement
// const isDevMode = import.meta.env.MODE === 'development';
// CI-DESSUS COMMENTÉ: import.meta.env.MODE n'est pas disponible sans outil de build comme Vite.
// Si le mode développement est nécessaire, il faudra le gérer autrement (ex: variable globale, config serveur)
const isDevMode = (window.APP_CONFIG && window.APP_CONFIG.MODE === 'development') || false;
if(isDevMode){
    console.warn("Mode développement activé pour SupabaseClient. Les données fictives peuvent être utilisées.");
}

// Initialisation d'Alpine.js
window.Alpine = Alpine
Alpine.start()

// Export de Plotly pour utilisation globale
window.Plotly = Plotly

class SupabaseClient {
    constructor() {
        // =================================================================================
        // !! IMPORTANT CONFIGURATION MANUELLE REQUISE !!
        // =================================================================================
        // Les variables VITE_SUPABASE_URL et VITE_SUPABASE_KEY ne sont pas automatiquement
        // injectées car Vite n'est pas configuré dans ce projet.
        // Vous DEVEZ fournir ces valeurs manuellement pour que le client Supabase fonctionne.
        //
        // OPTION 1: Définir globalement (par exemple, dans un <script> en haut de votre HTML)
        //    window.APP_CONFIG = {
        //        SUPABASE_URL: "VOTRE_URL_SUPABASE",
        //        SUPABASE_KEY: "VOTRE_CLE_ANON_SUPABASE"
        //    };
        //
        // OPTION 2: Remplacer directement les placeholders ci-dessous (moins flexible)
        //
        // Pour une solution de production robuste, il est FORTEMENT RECOMMANDÉ d'intégrer
        // un outil de build (comme Vite, Webpack, Rollup) pour gérer les variables d'environnement.
        // =================================================================================

        const supabaseUrl = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_URL) || "YOUR_SUPABASE_URL_PLACEHOLDER";
        const supabaseKey = (window.APP_CONFIG && window.APP_CONFIG.SUPABASE_KEY) || "YOUR_SUPABASE_KEY_PLACEHOLDER";

        if (supabaseUrl === "YOUR_SUPABASE_URL_PLACEHOLDER" || supabaseKey === "YOUR_SUPABASE_KEY_PLACEHOLDER") {
            console.error("***********************************************************************************");
            console.error("ERREUR CRITIQUE: URL ou Clé Supabase non configurée pour le client.");
            console.error("Veuillez définir window.APP_CONFIG.SUPABASE_URL et window.APP_CONFIG.SUPABASE_KEY,");
            console.error("ou remplacer les placeholders dans supabase-client.js.");
            console.error("Le client Supabase ne pourra pas s'initialiser correctement.");
            console.error("***********************************************************************************");
        }

        this.supabase = createClient(supabaseUrl, supabaseKey);

        // Cache local pour optimiser les performances
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        
        // Configuration des retry et timeout
        this.MAX_RETRIES = 3;
        this.RETRY_DELAY = 1000;
        this.REQUEST_TIMEOUT = 10000;
        
        // Initialisation
        this.init();
    }

    /**
     * Initialisation du client
     */
    async init() {
        try {
            console.log('🚀 Initialisation Supabase Client...');
            const { data, error } = await this.supabase.from('annees_academiques').select('count').limit(1);
            if (error) {
                console.error('⚠️ Erreur connexion Supabase:', error.message, error.details);
                return false;
            }
            console.log('✅ Supabase Client initialisé avec succès');
            return true;
        } catch (error) {
            console.error('❌ Erreur initialisation Supabase:', error);
            return false;
        }
    }

    /**
     * =============================================================================
     * GESTION DE L'AUTHENTIFICATION
     * =============================================================================
     */

    /**
     * Connexion administrateur
     */
    async login(email, password) {
        try {
            if (isDevMode) {
                // Mode développement : utiliser les données fictives
                const user = window.mockData.data.users.find(u => u.email === email && u.password === password);
                if (!user) {
                    throw new Error('Email ou mot de passe incorrect');
                }
                return { success: true, user };
            }

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // Vérification des droits admin
            const isAdmin = await this.checkAdminRights(data.user.id);
            if (!isAdmin) {
                throw new Error('Accès non autorisé. Droits administrateur requis.');
            }

            // Mise en cache des infos utilisateur
            this.setCache('current_user', data.user);
            
            console.log('✅ Connexion administrateur réussie');
            return { success: true, user: data.user };

        } catch (error) {
            console.error('❌ Erreur de connexion:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Déconnexion
     */
    async logout() {
        try {
            const { error } = await this.supabase.auth.signOut();
            if (error) throw error;

            // Nettoyage du cache
            this.clearCache();
            
            console.log('✅ Déconnexion réussie');
            return { success: true };

        } catch (error) {
            console.error('❌ Erreur de déconnexion:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Vérification des droits administrateur
     */
    async checkAdminRights(userId) {
        const { data, error } = await this.supabase
            .from('profiles')
            .select('is_admin, is_active')
            .eq('id', userId)
            .single();
        return data?.is_admin && data?.is_active;
    }

    /**
     * Obtenir l'utilisateur actuel
     */
    async getCurrentUser() {
        try {
            // Vérifier d'abord le cache
            const cachedUser = this.getCache('current_user');
            if (cachedUser) return cachedUser;

            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error) throw error;

            if (user) {
                this.setCache('current_user', user);
            }

            return user;

        } catch (error) {
            console.error('❌ Erreur récupération utilisateur:', error);
            return null;
        }
    }

    /**
     * =============================================================================
     * GESTION DES ENSEIGNANTS
     * =============================================================================
     */

    /**
     * Récupérer tous les enseignants actifs
     */
    async getEnseignants() {
        const cacheKey = 'enseignants_list';
        
        try {
            // Vérifier le cache
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            if (isDevMode) {
                // Mode développement : utiliser les données fictives
                return { data: window.mockData.data.enseignants, error: null };
            }

            const { data, error } = await this.supabase
                .from('enseignants')
                .select('*')
                .eq('is_active', true)
                .order('nom', { ascending: true });

            if (error) throw error;

            // Mise en cache
            this.setCache(cacheKey, data);
            
            return data;

        } catch (error) {
            console.error('❌ Erreur récupération enseignants:', error);
            throw error;
        }
    }

    /**
     * Créer un nouvel enseignant
     */
    async createEnseignant(enseignantData) {
        const { data, error } = await this.supabase
            .from('enseignants')
            .insert([enseignantData])
            .select()
            .single();
        if (!error) {
            this.clearCache('enseignants_list');
            return data;
        }
        throw error;
    }

    /**
     * =============================================================================
     * GESTION DES CLASSES ET NIVEAUX
     * =============================================================================
     */

    /**
     * Récupérer toutes les classes avec leurs détails
     */
    async getClassesDetails() {
        const cacheKey = 'classes_details';
        
        try {
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            if (isDevMode) {
                // Mode développement : utiliser les données fictives
                return { data: window.mockData.data.classes, error: null };
            }

            const { data, error } = await this.supabase
                .from('classes')
                .select(`
                    *,
                    niveaux:niveau_id (id, code, libelle, ordre),
                    filieres:filiere_id (id, code, libelle)
                `)
                .eq('is_active', true)
                .order('nom');

            if (error) throw error;

            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('❌ Erreur récupération classes:', error);
            throw error;
        }
    }

    /**
     * Récupérer les niveaux
     */
    async getNiveaux() {
        const cacheKey = 'niveaux_list';
        
        try {
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const { data, error } = await this.supabase
                .from('niveaux')
                .select('*')
                .order('ordre');

            if (error) throw error;

            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('❌ Erreur récupération niveaux:', error);
            throw error;
        }
    }

    /**
     * Récupérer les filières
     */
    async getFilieres() {
        const cacheKey = 'filieres_list';
        
        try {
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            const { data, error } = await this.supabase
                .from('filieres')
                .select('*')
                .order('libelle');

            if (error) throw error;

            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('❌ Erreur récupération filières:', error);
            throw error;
        }
    }

    /**
     * =============================================================================
     * GESTION DES MATIÈRES
     * =============================================================================
     */

    /**
     * Récupérer toutes les matières
     */
    async getMatieres() {
        const cacheKey = 'matieres_list';
        
        try {
            const cached = this.getCache(cacheKey);
            if (cached) return cached;

            if (isDevMode) {
                // Mode développement : utiliser les données fictives
                return { data: window.mockData.data.matieres, error: null };
            }

            const { data, error } = await this.supabase
                .from('matieres')
                .select('*')
                .order('libelle');

            if (error) throw error;

            this.setCache(cacheKey, data);
            return data;

        } catch (error) {
            console.error('❌ Erreur récupération matières:', error);
            throw error;
        }
    }

    /**
     * =============================================================================
     * GESTION DES SESSIONS D'ÉVALUATION
     * =============================================================================
     */

    /**
     * Créer une nouvelle session d'évaluation
     */
     
    async createSessionEvaluation(sessionData) {
        try {
            // Créer l'enseignement si nécessaire
            const enseignement = await this.createOrGetEnseignement({
                enseignant_id: sessionData.enseignant_id,
                classe_id: sessionData.classe_id,
                matiere_id: sessionData.matiere_id,
                annee_academique_id: sessionData.annee_academique_id,
                semestre: sessionData.semestre
            });
    
            // Générer un token unique
            const token = this.generateSecureToken();
            
            // Calculer les dates
            const dateOuverture = new Date();
            const dateFermeture = new Date();
            dateFermeture.setDate(dateFermeture.getDate() + (sessionData.duree_jours || 7));
    
            const { data, error } = await this.supabase
                .from('sessions_evaluation')
                .insert([{
                    enseignement_id: enseignement.id,
                    titre: sessionData.titre,
                    description: sessionData.description || 'Évaluation temporaire',
                    token: token,
                    date_ouverture: dateOuverture.toISOString(),
                    date_fermeture: dateFermeture.toISOString(),
                    created_by_id: (await this.getCurrentUser())?.id,
                    lien_public: `${window.location.origin}/pages/evaluation-form.html?token=${token}`,
                    is_preview: sessionData.is_preview || false
                }])
                .select(`
                    *,
                    enseignements (
                        *,
                        enseignants (nom, prenom),
                        classes (nom),
                        matieres (libelle)
                    )
                `)
                .single();
    
            if (error) throw error;
    
            console.log('✅ Session d\'évaluation créée:', data);
            return data;
        } catch (error) {
            console.error('❌ Erreur création session:', error);
            throw error;
        }
    }

    /**
     * Récupérer une session par token
     */
    async getSessionByToken(token) {
        const { data, error } = await this.supabase
            .from('sessions_evaluation')
            .select(`
                *,
                enseignements (
                    *,
                    enseignants (nom, prenom, specialite),
                    classes (nom, niveaux(libelle), filieres(libelle)),
                    matieres (libelle, code)
                )
            `)
            .eq('token', token)
            .eq('is_active', true)
            .single();
        if (error) throw error;
        return data;
    }

    /**
     * Récupérer toutes les sessions actives
     */
    async getSessionsActives() {
        try {
            const { data, error } = await this.supabase
                .from('sessions_evaluation')
                .select(`
                    *,
                    enseignements (
                        enseignants (nom, prenom),
                        classes (nom),
                        matieres (libelle)
                    )
                `)
                .eq('is_active', true)
                .gte('date_fermeture', new Date().toISOString())
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Erreur récupération sessions actives:', error);
            throw error;
        }
    }

    /**
     * =============================================================================
     * GESTION DES CRITÈRES D'ÉVALUATION
     * =============================================================================
     */

    /**
     * Récupérer tous les critères d'évaluation
     */
    async getSectionsEvaluation() {
        try {
            const { data, error } = await this.supabase
                .from('sections_evaluation')
                .select('*')
                .order('ordre', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de la récupération des sections:', error);
            throw error;
        }
    }

    async getCriteresEvaluation() {
        try {
            const { data, error } = await this.supabase
                .from('criteres_evaluation')
                .select('*')
                .order('section_id, ordre', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erreur lors de la récupération des critères:', error);
            throw error;
        }
    }

    /**
     * =============================================================================
     * SOUMISSION DES ÉVALUATIONS
     * =============================================================================
     */

    /**
     * Soumettre une évaluation d'étudiant
     */
    async submitEvaluation(sessionId, reponses, commentaire = '', fingerprint = null) {
        try {
            // Hachage de l'IP et du user agent pour l'anonymat
            const ipHash = await this.hashString(this.getClientIP());
            const userAgentHash = await this.hashString(navigator.userAgent);
            const fingerprintHash = fingerprint ? await this.hashString(fingerprint) : null;

            // Vérifier si cette IP n'a pas déjà voté
            const { data: existingResponse } = await this.supabase
                .from('reponses_evaluation')
                .select('id')
                .eq('session_id', sessionId)
                .eq('ip_hash', ipHash)
                .single();

            if (existingResponse) {
                throw new Error('Vous avez déjà participé à cette évaluation');
            }

            // Calculer les scores
            const scoreTotal = Object.values(reponses).reduce((sum, score) => sum + parseInt(score), 0);
            const nbCriteres = Object.keys(reponses).length;
            const scoreGlobal = nbCriteres > 0 ? (scoreTotal / (nbCriteres * 20)) * 100 : 0;

            // Insérer la réponse principale
            const { data: reponseData, error: reponseError } = await this.supabase
                .from('reponses_evaluation')
                .insert([{
                    session_id: sessionId,
                    ip_hash: ipHash,
                    user_agent_hash: userAgentHash,
                    fingerprint_hash: fingerprintHash,
                    score_total: scoreTotal,
                    score_global: parseFloat(scoreGlobal.toFixed(2)),
                    commentaire: commentaire.trim(),
                    is_complete: true,
                    completion_time: Date.now() - (window.evaluationStartTime || Date.now())
                }])
                .select()
                .single();

            if (reponseError) throw reponseError;

            // Insérer les détails des réponses
            const reponseDetails = Object.entries(reponses).map(([critereId, score]) => ({
                reponse_id: reponseData.id,
                critere_id: parseInt(critereId),
                score: parseInt(score)
            }));

            const { error: detailsError } = await this.supabase
                .from('reponses_details')
                .insert(reponseDetails);

            if (detailsError) throw detailsError;

            console.log('✅ Évaluation soumise avec succès');
            return { success: true, reponse_id: reponseData.id };

        } catch (error) {
            console.error('❌ Erreur soumission évaluation:', error);
            throw error;
        }
    }

    /**
     * =============================================================================
     * STATISTIQUES ET ANALYTICS
     * =============================================================================
     */

    /**
     * Récupérer les statistiques d'un enseignant
     */
    async getStatistiquesEnseignant(enseignantId, anneeAcademiqueId = null) {
        try {
            let query = this.supabase
                .from('statistiques_enseignants')
                .select(`
                    *,
                    enseignants (nom, prenom, email),
                    annees_academiques (libelle)
                `)
                .eq('enseignant_id', enseignantId);

            if (anneeAcademiqueId) {
                query = query.eq('annee_academique_id', anneeAcademiqueId);
            }

            const { data, error } = await query.order('annee_academique_id', { ascending: false });

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Erreur récupération statistiques enseignant:', error);
            throw error;
        }
    }

    /**
     * Récupérer le classement général
     */
    async getClassementGeneral(anneeAcademiqueId = null) {
        try {
            let query = this.supabase
                .from('statistiques_enseignants')
                .select(`
                    *,
                    enseignants (nom, prenom, email)
                `)
                .gte('nb_evaluations', 1);

            if (anneeAcademiqueId) {
                query = query.eq('annee_academique_id', anneeAcademiqueId);
            }

            const { data, error } = await query
                .order('score_global_moyen', { ascending: false })
                .limit(50);

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Erreur récupération classement:', error);
            throw error;
        }
    }

    /**
     * Calculer les statistiques en temps réel
     */
    async calculateStatistiques(enseignantId, anneeAcademiqueId) {
        try {
            // Appel de fonction PostgreSQL pour calculer les stats
            const { data, error } = await this.supabase
                .rpc('calculate_teacher_statistics', {
                    p_enseignant_id: enseignantId,
                    p_annee_academique_id: anneeAcademiqueId
                });

            if (error) throw error;

            console.log('✅ Statistiques calculées pour enseignant:', enseignantId);
            return data;

        } catch (error) {
            console.error('❌ Erreur calcul statistiques:', error);
            throw error;
        }
    }

    /**
     * =============================================================================
     * UTILITAIRES ET HELPERS
     * =============================================================================
     */

    /**
     * Créer ou récupérer un enseignement
     */
    async createOrGetEnseignement(enseignementData) {
        try {
            // Chercher d'abord s'il existe
            const { data: existing, error: searchError } = await this.supabase
                .from('enseignements')
                .select('*')
                .eq('enseignant_id', enseignementData.enseignant_id)
                .eq('classe_id', enseignementData.classe_id)
                .eq('matiere_id', enseignementData.matiere_id)
                .eq('annee_academique_id', enseignementData.annee_academique_id)
                .eq('semestre', enseignementData.semestre)
                .single();

            if (!searchError && existing) {
                return existing;
            }

            // Sinon créer un nouveau
            const { data, error } = await this.supabase
                .from('enseignements')
                .insert([{
                    ...enseignementData,
                    date_debut: new Date().toISOString(),
                    date_fin: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString() // +4 mois
                }])
                .select()
                .single();

            if (error) throw error;

            return data;

        } catch (error) {
            console.error('❌ Erreur création enseignement:', error);
            throw error;
        }
    }

    /**
     * Générer un token sécurisé
     */
    generateSecureToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * Hacher une chaîne de caractères
     */
    async hashString(str) {
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Obtenir l'IP du client (approximative)
     */
    getClientIP() {
        // En production, utiliser un service externe ou headers de proxy
        return 'anonymous_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * =============================================================================
     * GESTION DU CACHE
     * =============================================================================
     */

    /**
     * Mettre en cache
     */
    setCache(key, data) {
        this.cache.set(key, data);
        this.cacheExpiry.set(key, Date.now() + this.CACHE_DURATION);
    }

    /**
     * Récupérer du cache
     */
    getCache(key) {
        const expiry = this.cacheExpiry.get(key);
        if (!expiry || Date.now() > expiry) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return null;
        }
        return this.cache.get(key);
    }

    /**
     * Vider le cache
     */
    clearCache(key = null) {
        if (key) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
        } else {
            this.cache.clear();
            this.cacheExpiry.clear();
        }
    }

    /**
     * =============================================================================
     * LOGS ET AUDIT
     * =============================================================================
     */

    /**
     * Enregistrer un log d'audit
     */
    async logAudit(action, entityType = null, entityId = null, details = {}) {
        try {
            const user = await this.getCurrentUser();
            
            await this.supabase
                .from('audit_logs')
                .insert([{
                    user_id: user?.id,
                    action: action,
                    entity_type: entityType,
                    entity_id: entityId,
                    details: details,
                    ip_address: this.getClientIP(),
                    user_agent: navigator.userAgent.substring(0, 500)
                }]);

        } catch (error) {
            console.warn('⚠️ Erreur enregistrement audit:', error);
        }
    }

    /**
     * =============================================================================
     * GESTION D'ERREURS ET RETRY
     * =============================================================================
     */

    /**
     * Exécuter une requête avec retry automatique
     */
    async executeWithRetry(operation, maxRetries = this.MAX_RETRIES) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                
                if (attempt < maxRetries) {
                    console.warn(`⚠️ Tentative ${attempt} échouée, retry dans ${this.RETRY_DELAY}ms...`);
                    await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * attempt));
                }
            }
        }
        
        throw lastError;
    }
}

// =============================================================================
// INITIALISATION GLOBALE
// =============================================================================

 // Fin de supabase-client.js
let supabaseClientInstance = null;

async function initSupabaseClient() {
    if (!supabaseClientInstance) {
        supabaseClientInstance = new SupabaseClient();
        await supabaseClientInstance.init();
    }
    return supabaseClientInstance;
}

export { initSupabaseClient };
export const getSupabaseClient = () => supabaseClientInstance;

// Initialisation automatique
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initSupabaseClient();
        console.log('🚀 Supabase Client prêt pour EvalESI Pro');
    } catch (error) {
        console.error('❌ Erreur initialisation Supabase Client:', error);
    }
});
// =============================================================================
// UTILITAIRES GLOBAUX POUR LES AUTRES SCRIPTS
// =============================================================================

/**
 * Fonction helper pour les autres scripts
 */
window.SupabaseUtils = {
    // Vérifier si l'utilisateur est connecté
    async isLoggedIn() {
        try {
            const client = getSupabaseClient();
            const user = await client.getCurrentUser();
            return !!user;
        } catch {
            return false;
        }
    },

    // Rediriger vers login si non connecté
    async requireAuth(redirectUrl = 'index.html') {
        const isLoggedIn = await this.isLoggedIn();
        if (!isLoggedIn) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    },

    // Formatter les erreurs pour l'affichage
    formatError(error) {
        if (typeof error === 'string') return error;
        return error?.message || 'Une erreur inattendue s\'est produite';
    },

    // Afficher une notification
    showNotification(message, type = 'info') {
        // Intégration avec le système de notifications de l'interface
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Si vous avez un système de toast/notification, l'appeler ici
        if (window.showToast) {
            window.showToast(message, type);
        }
    }
};