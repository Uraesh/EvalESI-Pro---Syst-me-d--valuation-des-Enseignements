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
                const { data, error } = await supabaseClient
                    .from('sessions_evaluation')
                    .select('*')
                    .order('date_evaluation', { ascending: false });

                if (error) throw error;

                this.sessions = data;
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
            this.stats.activeSessions = this.sessions.filter(s => s.status === 'active').length;
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
                const sessionData = {
                    date_ouverture: document.getElementById('sessionDateStart').value,
                    date_fermeture: document.getElementById('sessionDateEnd').value,
                    enseignant_id: document.getElementById('sessionTeacher').value,
                    titre: document.getElementById('sessionModule').value,
                    status: document.getElementById('sessionStatus').value,
                    reponses: 0,
                    total: 0
                };
                if (!sessionData.enseignant_id || !sessionData.titre) {
                    this.showError('Veuillez remplir tous les champs requis');
                    return;
                }
                const { error } = await supabaseClient
                    .from('sessions_evaluation')
                    .insert([sessionData]);
                if (error) throw error;
                const modal = bootstrap.Modal.getInstance(document.getElementById('addSessionModal'));
                modal.hide();
                form.reset();
                await this.loadSessions();
                this.showSuccess('Session créée avec succès');
            } catch (error) {
                this.showError('Erreur lors de la création de la session');
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
        async deleteSession(session) {
            try {
                const { error } = await supabaseClient
                    .from('sessions_evaluation')
                    .delete()
                    .eq('id', session.id);

                if (error) throw error;

                await this.loadSessions();
                this.showSuccess('Session supprimée avec succès');
            } catch (error) {
                console.error('Erreur de suppression:', error);
                this.showError('Erreur lors de la suppression');
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