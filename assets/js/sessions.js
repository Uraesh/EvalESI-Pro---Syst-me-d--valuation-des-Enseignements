// =============================================================================
// SESSIONS.JS - Gestion des sessions d'évaluation
// =============================================================================

import { getSupabaseClient, initSupabaseClient } from './supabase-client.js';
import Swal from 'sweetalert2';

// Configuration Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('sessions', () => ({
        // =========================================================================
        // ÉTAT DE L'APPLICATION
        // =========================================================================
        isLoading: true,
        isSidebarCollapsed: false,
        sessions: [], // Sera la liste des sessions formatées pour l'affichage
        error: null,

        // Données pour les formulaires/modales
        teachers: [],
        subjects: [],
        classes: [],
        academicYears: [],
        newSession: { // Modèle pour la modale d'ajout
            date_ouverture: '',
            date_fermeture: '',
            enseignant_id: null,
            matiere_id: null,
            classe_id: null,
            annee_academique_id: null,
            semestre: '',
            titre: ''
        },

        stats: {
            totalSessions: 0,
            activeSessions: 0
        },

        // =========================================================================
        // MÉTHODES D'INITIALISATION
        // =========================================================================

        /**
         * Initialise l'application
         */
        async init() {
            this.isLoading = true;
            this.error = null;
            try {
                await initSupabaseClient();
                const supabase = getSupabaseClient();
                if (!supabase) throw new Error("Client Supabase non initialisé.");

                await this.checkAuth(supabase);

                // Charger toutes les données nécessaires en parallèle
                await Promise.all([
                    this.loadSessions(supabase),
                    this.loadTeachers(supabase),
                    this.loadSubjects(supabase),
                    this.loadClasses(supabase),
                    this.loadAcademicYears(supabase)
                ]);
                // this.setupEventListeners(); // Si des écouteurs globaux sont nécessaires
            } catch (error) {
                console.error('Erreur d\'initialisation (sessions.js):', error);
                this.error = `Erreur chargement page: ${error.message}`;
                // showError est déjà appelé dans les méthodes de chargement individuelles
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Vérifie l'authentification
         */
        async checkAuth(supabase) {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                window.location.href = '/index.html'; // Redirection
                throw new Error("Utilisateur non authentifié.");
            }
             const isAdmin = await supabase.checkAdminRights(session.user.id);
            if (!isAdmin) {
                this.showError("Accès non autorisé. Droits administrateur requis.");
                window.location.href = '/pages/dashboard.html';
                throw new Error("Droits administrateur manquants.");
            }
        },

        /**
         * Charge la liste des sessions formatées pour l'affichage
         */
        async loadSessions(supabase) {
            this.isLoading = true; // Spécifique à cette opération
            try {
                const rawSessions = await supabase.getSessionsActives(); // Utilise la méthode existante qui fait les jointures
                if (rawSessions) {
                    this.sessions = rawSessions.map(session => {
                        let statusText = 'Inconnu';
                        const now = new Date();
                        const dateOuverture = new Date(session.date_ouverture);
                        const dateFermeture = new Date(session.date_fermeture);

                        if (!session.is_active || now > dateFermeture) {
                            statusText = 'Terminée';
                        } else if (now < dateOuverture) {
                            statusText = 'En attente';
                        } else {
                            statusText = 'Active';
                        }

                        return {
                            id: session.id,
                            dateStart: session.date_ouverture,
                            dateEnd: session.date_fermeture,
                            enseignant: session.enseignements?.enseignants ? `${session.enseignements.enseignants.nom} ${session.enseignements.enseignants.prenom}` : 'N/A',
                            module: session.enseignements?.matieres ? session.enseignements.matieres.libelle : (session.titre || 'N/A'),
                            classe: session.enseignements?.classes ? session.enseignements.classes.nom : 'N/A',
                            status: statusText, // Statut dérivé
                            is_active_db: session.is_active, // Statut brut de la DB pour la logique de fermeture
                            reponses: session.nombre_reponses || 0, // Supposons que cette info vienne de la BDD ou calculée
                            total: session.nombre_etudiants_cible || 'N/A', // Idem
                            // Garder l'objet enseignement complet si besoin pour la modale d'édition
                            enseignementComplet: session.enseignements,
                            titreComplet: session.titre
                        };
                    });
                    this.updateStats();
                } else {
                    this.sessions = [];
                }
            } catch (error) {
                console.error('Erreur de chargement des sessions:', error);
                this.showError(`Erreur chargement sessions: ${error.message}`);
                this.sessions = [];
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Charge la liste des enseignants pour les listes déroulantes
         */
        async loadTeachers(supabase) {
            try {
                const data = await supabase.getEnseignants(); // getEnseignants gère déjà le cache et le mode dev
                this.teachers = data || [];
            } catch (error) {
                this.showError(`Erreur chargement enseignants: ${error.message}`);
            }
        },
        async loadSubjects(supabase) {
            try {
                const data = await supabase.getMatieres();
                this.subjects = data || [];
            } catch (error) {
                this.showError(`Erreur chargement matières: ${error.message}`);
            }
        },
        async loadClasses(supabase) {
            try {
                // getClassesDetails retourne déjà les détails nécessaires
                const data = await supabase.getClassesDetails();
                this.classes = data || [];
            } catch (error) {
                this.showError(`Erreur chargement classes: ${error.message}`);
            }
        },
        async loadAcademicYears(supabase) {
             try {
                const { data, error } = await supabase
                    .from('annees_academiques') // Assumant que cette table existe
                    .select('id, libelle')
                    .order('libelle', { ascending: false });
                if (error) throw error;
                this.academicYears = data || [];
            } catch (error) {
                this.showError(`Erreur chargement années académiques: ${error.message}`);
            }
        },


        /**
         * Met à jour les statistiques
         */
        updateStats() {
            this.stats.totalSessions = this.sessions.length;
            this.stats.activeSessions = this.sessions.filter(s => s.status === 'Active').length;
        },

        // =========================================================================
        // MÉTHODES DE GESTION DES SESSIONS
        // =========================================================================

        /**
         * Affiche le modal d'ajout de session et réinitialise le formulaire
         */
        openAddSessionModal() {
            this.newSession = {
                date_ouverture: new Date().toISOString().split('T')[0], // Aujourd'hui par défaut
                date_fermeture: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +7 jours par défaut
                enseignant_id: null,
                matiere_id: null,
                classe_id: null,
                annee_academique_id: this.academicYears.length > 0 ? this.academicYears[0].id : null, // Année la plus récente par défaut
                semestre: '',
                titre: ''
            };
            const modalElement = document.getElementById('addSessionModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                console.error("Modal 'addSessionModal' non trouvé.");
            }
        },

        /**
         * Soumet le formulaire d'ajout de session
         */
        async submitAddSessionForm() {
            const supabase = getSupabaseClient();
            if (!supabase) {
                this.showError("Client Supabase non disponible.");
                return;
            }

            // Validation
            if (!this.newSession.date_ouverture || !this.newSession.date_fermeture || !this.newSession.enseignant_id ||
                !this.newSession.matiere_id || !this.newSession.classe_id || !this.newSession.annee_academique_id || !this.newSession.semestre) {
                this.showError("Veuillez remplir tous les champs obligatoires : dates, enseignant, matière, classe, année académique et semestre.");
                return;
            }

            const titreSession = this.newSession.titre ||
                                 `Évaluation ${this.teachers.find(t => t.id === this.newSession.enseignant_id)?.nom || ''} - ${this.subjects.find(s => s.id === this.newSession.matiere_id)?.libelle || ''}`;

            const sessionData = {
                date_ouverture: this.newSession.date_ouverture,
                date_fermeture: this.newSession.date_fermeture,
                enseignant_id: parseInt(this.newSession.enseignant_id),
                matiere_id: parseInt(this.newSession.matiere_id),
                classe_id: parseInt(this.newSession.classe_id),
                annee_academique_id: parseInt(this.newSession.annee_academique_id),
                semestre: this.newSession.semestre,
                titre: titreSession,
                description: `Session d'évaluation pour ${titreSession}`
                // is_preview est false par défaut dans createSessionEvaluation
            };

            this.isLoading = true; // Indiquer le chargement
            const submitButton = document.querySelector('#addSessionModal .modal-footer button.btn-primary');
            if(submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Création...';
            }

            try {
                const createdSession = await supabase.createSessionEvaluation(sessionData);
                if (createdSession && createdSession.id) {
                    await this.loadSessions(supabase); // Recharger la liste
                    this.showSuccess('Nouvelle session d\'évaluation créée avec succès !');

                    const modalElement = document.getElementById('addSessionModal');
                    if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) modal.hide();
                    }
                } else {
                    throw new Error("La création de la session a échoué ou n'a pas retourné de données.");
                }
            } catch (error) {
                console.error('Erreur lors de la création de la session:', error);
                this.showError(`Erreur création session: ${error.message}`);
            } finally {
                this.isLoading = false;
                if(submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Créer';
                }
            }
        },

        /**
         * Modifie une session (Placeholder)
         */
        async openEditSessionModal(session) {
            // TODO: Implémenter la logique d'édition de session
            console.log('Ouvrir modal édition pour session (TODO):', session);
            Swal.fire('Fonctionnalité à venir', `L'édition de la session "${session.titreComplet || session.module}" sera bientôt disponible.`, 'info');
        },

        /**
         * Demande confirmation et supprime une session
         */
        async confirmDeleteSession(sessionToDelete) { // Renommée pour correspondre à l'appel HTML et au plan
            const supabase = getSupabaseClient();
            if (!supabase) {
                this.showError("Client Supabase non disponible.");
                return;
            }

            Swal.fire({
                title: 'Êtes-vous sûr(e) ?',
                text: `Voulez-vous vraiment supprimer la session "${sessionToDelete.titreComplet || sessionToDelete.module}" ? Cette action est irréversible.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33', // Rouge pour suppression
                cancelButtonColor: '#3085d6', // Bleu standard pour annuler
                confirmButtonText: 'Oui, supprimer !',
                cancelButtonText: 'Annuler'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    this.isLoading = true;
                    try {
                        const { error } = await supabase
                            .from('sessions_evaluation')
                            .delete()
                            .eq('id', sessionToDelete.id);

                        if (error) throw error;

                        await this.loadSessions(supabase); // Recharger la liste
                        this.showSuccess('Session supprimée avec succès.');
                    } catch (error) {
                        console.error('Erreur de suppression de session:', error);
                        this.showError(`Erreur suppression: ${error.message}`);
                    } finally {
                        this.isLoading = false;
                    }
                }
            });
        },

        // =========================================================================
        // MÉTHODES D'INTERFACE
        // =========================================================================

        /**
         * Formate une date
         */
        formatDate(date) {
            return new Date(date).toLocaleDateString('fr-FR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        },

        /**
         * Retourne la classe CSS pour le statut
         */
        getStatusClass(status) {
            const classes = {
                'active': 'bg-success',
                'pending': 'bg-warning',
                'completed': 'bg-info',
                'cancelled': 'bg-danger'
            };
            return classes[status] || 'bg-secondary';
        },

        /**
         * Retourne le texte du statut
         */
        getStatusText(status) {
            const texts = {
                'active': 'Active',
                'pending': 'En attente',
                'completed': 'Terminée',
                'cancelled': 'Annulée'
            };
            return texts[status] || 'Inconnu';
        },

        /**
         * Configure les écouteurs d'événements
         */
        setupEventListeners() {
            // Écouteurs spécifiques à la page des sessions
        },

        // =========================================================================
        // MÉTHODES UTILITAIRES
        // =========================================================================

        /**
         * Affiche une erreur
         */
        showError(message) {
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: message,
                confirmButtonColor: '#0066cc'
            });
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-danger';
            errorDiv.textContent = message;
            document.querySelector('.container').prepend(errorDiv);
            setTimeout(() => errorDiv.remove(), 5000); // Supprime après 5 secondes
        },

        /**
         * Affiche un succès
         */
        showSuccess(message) {
            Swal.fire({
                icon: 'success',
                title: 'Succès',
                text: message,
                confirmButtonColor: '#0066cc'
            });
            const successDiv = document.createElement('div');
            successDiv.className = 'alert alert-success';
            successDiv.textContent = message;
            document.querySelector('.container').prepend(successDiv);
            setTimeout(() => successDiv.remove(), 5000);
        },
        
        //Dans sessions.js, ajoute une méthode pour fermer une session
        async closeSession(session) {
            const result = await Swal.fire({
                title: 'Confirmer la fermeture',
                text: `Voulez-vous vraiment fermer la session "${session.titre}" ?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0066cc',
                cancelButtonColor: '#cc0000',
                confirmButtonText: 'Oui, fermer la session'
            });
            if (result.isConfirmed) {
                const supabase = getSupabaseClient();
                if (!supabase) {
                    this.showError("Client Supabase non disponible.");
                    return;
                }
                this.isLoading = true;
                try {
                    const { error } = await supabase
                        .from('sessions_evaluation')
                        .update({ is_active: false, date_fermeture: new Date().toISOString() })
                        .eq('id', session.id);
                    if (error) throw error;
                    await this.loadSessions(supabase); // Passer supabase
                    this.showSuccess('Session fermée avec succès');
                } catch (error) {
                    console.error("Erreur lors de la fermeture de la session:", error);
                    this.showError(`Erreur fermeture: ${error.message}`);
                } finally {
                    this.isLoading = false;
                }
            }
        }
    }));
}); 