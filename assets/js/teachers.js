// =============================================================================
// TEACHERS.JS - Gestion des enseignants
// =============================================================================

import { supabaseClient } from './supabase-client.js'; 
import Swal from 'sweetalert2';

// Configuration Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('teachers', () => ({
        // =========================================================================
        // ÉTAT DE L'APPLICATION
        // =========================================================================
        isLoading: false,
        isSidebarCollapsed: false,
        teachers: [],
        stats: {
            totalTeachers: 0,
            activeTeachers: 0
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
                await this.loadTeachers();
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
                window.location.href = '/index.html';
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
            this.stats.totalTeachers = this.teachers.length;
            this.stats.activeTeachers = this.teachers.filter(t => t.status === 'active').length;
        },

        // =========================================================================
        // MÉTHODES DE GESTION DES ENSEIGNANTS
        // =========================================================================

        /**
         * Affiche le modal d'ajout d'enseignant
         */
        showAddTeacherModal() {
            const modal = new bootstrap.Modal(document.getElementById('addTeacherModal'));
            modal.show();
        },

        /**
         * Soumet le formulaire d'ajout d'enseignant
         */
        async submitAddTeacher() {
            try {
                const form = document.getElementById('addTeacherForm');
                if (!form.checkValidity()) {
                    form.reportValidity();
                    return;
                }

                const teacherData = {
                    nom: document.getElementById('teacherName').value,
                    prenom: document.getElementById('teacherPrenom').value,
                    email: document.getElementById('teacherEmail').value,
                    telephone: document.getElementById('teacherPhone').value,
                    specialite: document.getElementById('teacherSpecialty').value,
                    date_embauche: document.getElementById('teacherHireDate').value,
                    status: document.getElementById('teacherStatus').value,
                    evaluations: 0
                };

                // Désactiver le bouton pendant l'insertion
                const submitButton = form.querySelector('button[type="submit"]');
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> En cours...';

                const { data, error } = await supabaseClient
                    .from('enseignants')
                    .insert([teacherData])
                    .select('*'); // Pour récupérer l'enseignant inséré

                if (error) throw error;

                // Ajouter l'enseignant au tableau existant
                this.teachers.unshift(data[0]);
                this.updateStats();

                // Fermer le modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addTeacherModal'));
                modal.hide();

                // Réinitialiser le formulaire
                form.reset();

                // Réactiver le bouton
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-plus"></i> Ajouter';

                this.showSuccess('Enseignant ajouté avec succès');
            } catch (error) {
                console.error('Erreur d\'ajout:', error);
                this.showError('Erreur lors de l\'ajout de l\'enseignant');
            }
        },

        // Ajouter une méthode pour charger un enseignant spécifique
        async loadTeacher(id) {
            try {
                const { data, error } = await supabaseClient
                    .from('enseignants')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                console.error('Erreur lors du chargement:', error);
                throw error;
            }
        },

        // Ajouter une méthode pour mettre à jour un enseignant
        async updateTeacher(teacherId, updates) {
            try {
                const { error } = await supabaseClient
                    .from('enseignants')
                    .update(updates)
                    .eq('id', teacherId);

                if (error) throw error;
                return true;
            } catch (error) {
                console.error('Erreur lors de la mise à jour:', error);
                throw error;
            }
        },

        /**
         * Modifie un enseignant
         */
        async editTeacher(teacher) {
            try {
                // Implémentation de la modification
                console.log('Modifier enseignant:', teacher);
            } catch (error) {
                console.error('Erreur de modification:', error);
                this.showError('Erreur lors de la modification');
            }
        },

        /**
         * Supprime un enseignant
         */
        async deleteTeacher(teacher) {
            try {
                const { error } = await supabaseClient
                    .from('enseignants')
                    .delete()
                    .eq('id', teacher.id);

                if (error) throw error;

                await this.loadTeachers();
                this.showSuccess('Enseignant supprimé avec succès');
            } catch (error) {
                console.error('Erreur de suppression:', error);
                this.showError('Erreur lors de la suppression');
            }
        },

        // =========================================================================
        // MÉTHODES D'INTERFACE
        // =========================================================================

        /**
         * Configure les écouteurs d'événements
         */
        setupEventListeners() {
            // Écouteurs spécifiques à la page des enseignants
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
        }
    }));
}); 