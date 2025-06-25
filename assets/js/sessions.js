// =============================================================================
// SESSIONS.JS - Gestion des sessions d'évaluation
// =============================================================================

import { supabaseClient } from './supabase-client.js'; 
import Swal from 'sweetalert2';

// Configuration Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('sessions', () => ({
        // =========================================================================
        // ÉTAT DE L'APPLICATION
        // =========================================================================
        isLoading: false,
        isSidebarCollapsed: false,
        sessions: [],
        teachers: [], // Liste des enseignants pour le select
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
            try {
                this.isLoading = true;
                await this.checkAuth();
                await Promise.all([
                    this.loadSessions(),
                    this.loadTeachers()
                ]);
                this.setupEventListeners();
            } catch (error) {
                console.error('Erreur d\'initialisation:', error);
                this.showError('Erreur lors du chargement des données');
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Vérifie l'authentification
         */
        async checkAuth() {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
                window.location.href = 'index.html';
            }
        },

        /**
         * Charge la liste des sessions
         */
        async loadSessions() {
            try {
                // Récupérer les sessions avec les données liées (enseignements, enseignants, classes, matières)
                const { data, error } = await supabaseClient
                    .from('sessions_evaluation')
                    .select(`
                        *,
                        enseignements:enseignements(
                            *,
                            enseignant:enseignants(*),
                            classe:classes(*),
                            matiere:matieres(*)
                        )
                    `)
                    .order('date_ouverture', { ascending: false });

                if (error) throw error;

                // Transformer les données pour l'affichage
                this.sessions = data.map(session => ({
                    ...session,
                    // Ajouter des propriétés calculées pour faciliter l'affichage
                    status: this.calculateSessionStatus(session),
                    enseignant: session.enseignements?.[0]?.enseignant,
                    classe: session.enseignements?.[0]?.classe,
                    matiere: session.enseignements?.[0]?.matiere
                }));

                this.updateStats();
            } catch (error) {
                console.error('Erreur de chargement des sessions:', error);
                this.showError('Erreur lors du chargement des sessions');
            }
        },

        /**
         * Charge la liste des enseignants
         */
        async loadTeachers() {
            try {
                const { data, error } = isDevMode
                    ? { data: window.mockData.data.enseignants, error: null }
                    : await supabaseClient
                        .from('enseignants')
                        .select('*')
                        .order('nom', { ascending: true });
                if (error) throw error;
                this.teachers = data;
                this.updateStats();
            } catch (error) {
                this.showError('Erreur lors du chargement des enseignants');
            }
        },

        /**
         * Met à jour les statistiques
         */
        updateStats() {
            this.stats.totalSessions = this.sessions.length;
            this.stats.activeSessions = this.sessions.filter(s => this.calculateSessionStatus(s) === 'active').length;
        },

        /**
         * Calcule le statut d'une session
         */
        calculateSessionStatus(session) {
            const now = new Date();
            const dateOuverture = new Date(session.date_ouverture);
            const dateFermeture = new Date(session.date_fermeture);
            
            if (!session.is_active) return 'inactive';
            if (now < dateOuverture) return 'scheduled';
            if (now > dateFermeture) return 'closed';
            return 'active';
        },

        // =========================================================================
        // MÉTHODES DE GESTION DES SESSIONS
        // =========================================================================

        /**
         * Affiche le modal d'ajout de session
         */
        showAddSessionModal() {
            const modal = new bootstrap.Modal(document.getElementById('addSessionModal'));
            modal.show();
        },

        /**
         * Soumet le formulaire d'ajout de session
         */
        async submitAddSession() {
            try {
                const form = document.getElementById('addSessionForm');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                // 1. Vérifier si l'enseignement existe
                const enseignantId = document.getElementById('sessionTeacher').value;
                const matiereId = document.getElementById('sessionSubject').value;
                const classeId = document.getElementById('sessionClass').value;
                const anneeAcademiqueId = document.getElementById('sessionAcademicYear').value;

                // 2. Créer ou récupérer l'enseignement
                const { data: enseignement, error: enseignementError } = await supabaseClient
                    .from('enseignements')
                    .select('id')
                    .eq('enseignant_id', enseignantId)
                    .eq('matiere_id', matiereId)
                    .eq('classe_id', classeId)
                    .single();

                let enseignementId;
                
                if (enseignementError || !enseignement) {
                    // Créer un nouvel enseignement
                    const { data: newEnseignement, error: createError } = await supabaseClient
                        .from('enseignements')
                        .insert({
                            enseignant_id: enseignantId,
                            matiere_id: matiereId,
                            classe_id: classeId,
                            annee_academique_id: anneeAcademiqueId,
                            volume_horaire: 0,
                            semestre: 'S1',
                            date_debut: new Date().toISOString(),
                            date_fin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                            is_active: true
                        })
                        .select('id')
                        .single();
                    
                    if (createError) throw createError;
                    enseignementId = newEnseignement.id;
                } else {
                    enseignementId = enseignement.id;
                }

                // 3. Créer la session d'évaluation
                const sessionData = {
                    enseignement_id: enseignementId,
                    titre: document.getElementById('sessionName').value,
                    description: document.getElementById('sessionDescription').value || '',
                    token: crypto.randomUUID(),
                    date_ouverture: document.getElementById('sessionStartDate').value,
                    date_fermeture: document.getElementById('sessionEndDate').value,
                    created_by_id: (await supabaseClient.auth.getUser()).data.user.id,
                    is_active: true,
                    nb_reponses: 0,
                    nb_vues: 0
                };

                const { data, error } = await supabaseClient
                    .from('sessions_evaluation')
                    .insert([sessionData])
                    .select('*');

                if (error) throw error;

                await this.loadSessions();
                
                const modal = bootstrap.Modal.getInstance(document.getElementById('addSessionModal'));
                modal.hide();
                form.reset();

                this.showSuccess('Session créée avec succès');
            } catch (error) {
                console.error('Erreur de création de session:', error);
                this.showError(`Erreur lors de la création de la session: ${error.message}`);
            }
        },

        /**
         * Modifie une session
         */
        async editSession(session) {
            try {
                // Implémentation de la modification
                console.log('Modifier session:', session);
            } catch (error) {
                console.error('Erreur de modification:', error);
                this.showError('Erreur lors de la modification');
            }
        },

        /**
         * Supprime une session
         */
        async closeSession(session) {
            try {
                const { error } = await supabaseClient
                    .from('sessions_evaluation')
                    .update({ 
                        is_active: false,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', session.id);

                if (error) throw error;

                await this.loadSessions();
                this.showSuccess('Session clôturée avec succès');
            } catch (error) {
                console.error('Erreur de clôture de session:', error);
                this.showError(`Erreur lors de la clôture de la session: ${error.message}`);
            }
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
                cancelButtonColor: '#cc0000'
            });
            if (result.isConfirmed) {
                const { error } = await supabaseClient
                    .from('sessions_evaluation')
                    .update({ is_active: false, date_fermeture: new Date().toISOString() })
                    .eq('id', session.id);
                if (!error) {
                    await this.loadSessions();
                    this.showSuccess('Session fermée avec succès');
                } else {
                    this.showError('Erreur lors de la fermeture de la session');
                }
            }
        }
    }));
}); 