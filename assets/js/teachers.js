// =============================================================================
// TEACHERS.JS - Gestion des enseignants
// =============================================================================

import { getSupabaseClient, initSupabaseClient } from './supabase-client.js';
import Swal from 'sweetalert2';

// Configuration Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('teachers', () => ({
        // =========================================================================
        // ÉTAT DE L'APPLICATION
        // =========================================================================
        isLoading: true,
        isSidebarCollapsed: false,
        teachers: [], // Correspond à `x-for="teacher in teachers"` dans l'HTML
        error: null,
        stats: {
            totalTeachers: 0,
            activeTeachers: 0
        },

        // Champs pour le formulaire d'ajout
        newTeacher: {
            nom: '',
            prenom: '',
            email: '',
            telephone: '',
            specialite: '',
            date_embauche: '',
            is_active: true // Par défaut un nouvel enseignant est actif
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
                await initSupabaseClient(); // S'assurer que le client est initialisé
                await this.checkAuth();
                await this.loadTeachers();
                this.setupEventListeners();
            } catch (error) {
                console.error('Erreur d\'initialisation:', error);
                this.error = 'Erreur lors du chargement initial des données. Veuillez vérifier la console.';
                this.showError(this.error);
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Vérifie l'authentification
         */
        async checkAuth() {
            const supabase = getSupabaseClient();
            if (!supabase) {
                this.error = "Client Supabase non initialisé.";
                throw new Error(this.error);
            }
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                window.location.href = '/index.html'; // Rediriger vers la page de connexion
            }
        },

        /**
         * Charge la liste des enseignants
         */
        async loadTeachers() {
            this.isLoading = true;
            this.error = null;
            const supabase = getSupabaseClient();
            if (!supabase) {
                 this.error = "Client Supabase non initialisé lors du chargement des enseignants.";
                 this.isLoading = false;
                 return;
            }

            try {
                // Utilisation de la fonction getEnseignants() du client Supabase
                // qui gère déjà le mode dev et le cache.
                const data = await supabase.getEnseignants(); // La fonction getEnseignants retourne directement les données ou lève une erreur

                if (data) {
                     // Mapper les données pour correspondre à la structure attendue par le HTML
                    this.teachers = data.map(teacher => ({
                        ...teacher,
                        status: teacher.is_active ? 'active' : 'inactive', // Mapper is_active en status
                        evaluations: teacher.nombre_evaluations_recues || 0 // Utiliser nombre_evaluations_recues si disponible
                    }));
                    this.updateStats();
                } else {
                    this.teachers = [];
                }
            } catch (err) {
                console.error('Erreur lors du chargement des enseignants:', err);
                this.error = `Erreur chargement enseignants: ${err.message}`;
                this.showError(this.error);
                this.teachers = [];
            } finally {
                this.isLoading = false;
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
            // Réinitialiser le formulaire d'ajout
            this.newTeacher = {
                nom: '',
                prenom: '',
                email: '',
                telephone: '',
                specialite: '',
                date_embauche: '',
                is_active: true
            };
            const modalElement = document.getElementById('addTeacherModal');
            if (modalElement) {
                const modal = new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                console.error("Modal 'addTeacherModal' non trouvé.");
            }
        },

        /**
         * Soumet le formulaire d'ajout d'enseignant
         */
        async submitAddTeacher() {
            const supabase = getSupabaseClient();
            if (!supabase) {
                this.showError("Client Supabase non disponible.");
                return;
            }

            // Validation simple (peut être améliorée)
            if (!this.newTeacher.nom || !this.newTeacher.prenom || !this.newTeacher.email) {
                this.showError("Les champs Nom, Prénom et Email sont obligatoires.");
                return;
            }

            const teacherDataToInsert = { ...this.newTeacher };

            // Pas besoin de `evaluations: 0` ici, la DB devrait avoir une valeur par défaut ou ce n'est pas géré à l'insertion.
            // Le champ `status` de l'HTML est `is_active` dans la DB.

            const submitButton = document.querySelector('#addTeacherModal .modal-footer button.btn-primary');
            if(submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> En cours...';
            }

            try {
                // Utilisation de la fonction createEnseignant du client Supabase
                const insertedTeacher = await supabase.createEnseignant(teacherDataToInsert);

                if (insertedTeacher) {
                    await this.loadTeachers(); // Recharger la liste pour inclure le nouvel enseignant et mettre à jour les stats
                    this.showSuccess('Enseignant ajouté avec succès');

                    const modalElement = document.getElementById('addTeacherModal');
                     if (modalElement) {
                        const modal = bootstrap.Modal.getInstance(modalElement);
                        if (modal) modal.hide();
                    }
                }
            } catch (error) {
                console.error('Erreur d\'ajout d\'enseignant:', error);
                this.showError(`Erreur lors de l'ajout de l'enseignant: ${error.message}`);
            } finally {
                 if(submitButton) {
                    submitButton.disabled = false;
                    submitButton.innerHTML = 'Ajouter';
                }
            }
        },

        /**
         * Modifie un enseignant (placeholder - implémentation future)
         */
        async editTeacher(teacher) {
            // TODO: Implémenter la logique d'édition, probablement avec une autre modal
            console.log('Modifier enseignant (TODO):', teacher);
            Swal.fire('Fonctionnalité à venir', `L'édition de l'enseignant ${teacher.nom} ${teacher.prenom} sera bientôt disponible.`, 'info');
        },

        /**
         * Supprime un enseignant
         */
        async deleteTeacher(teacherToDelete) {
            const supabase = getSupabaseClient();
            if (!supabase) {
                this.showError("Client Supabase non disponible.");
                return;
            }

            Swal.fire({
                title: 'Êtes-vous sûr ?',
                text: `Voulez-vous vraiment supprimer l'enseignant ${teacherToDelete.nom} ${teacherToDelete.prenom} ? Cette action est irréversible.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Oui, supprimer !',
                cancelButtonText: 'Annuler'
            }).then(async (result) => {
                if (result.isConfirmed) {
                    this.isLoading = true;
                    try {
                        const { error } = await supabase
                            .from('enseignants')
                            .delete()
                            .eq('id', teacherToDelete.id);

                        if (error) throw error;

                        await this.loadTeachers(); // Recharger la liste
                        this.showSuccess('Enseignant supprimé avec succès');
                    } catch (error) {
                        console.error('Erreur de suppression:', error);
                        this.showError(`Erreur lors de la suppression: ${error.message}`);
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
         * Configure les écouteurs d'événements
         */
        setupEventListeners() {
            // Aucun écouteur d'événement global spécifique nécessaire pour l'instant
            // Les clics sont gérés par Alpine via @click dans l'HTML
        },

        // =========================================================================
        // MÉTHODES UTILITAIRES
        // =========================================================================

        /**
         * Affiche une erreur normalisée via Swal et console
         */
        showError(message) {
            console.error("teachers.js Error:", message);
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: message,
                confirmButtonColor: '#0066cc'
            });
            // Retrait de l'ajout de div d'erreur manuel pour standardiser sur Swal.
        },

        /**
         * Affiche un succès normalisé via Swal
         */
        showSuccess(message) {
            Swal.fire({
                icon: 'success',
                title: 'Succès',
                text: message,
                confirmButtonColor: '#0066cc',
                timer: 2000, // Fermer automatiquement après 2 secondes
                timerProgressBar: true
            });
        }
    }));
});