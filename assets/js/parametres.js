// =============================================================================
// PARAMETRES.JS - Gestion des paramètres et des droits d'accès
// =============================================================================

import { supabaseClient } from './supabase-client.js';
import Swal from 'sweetalert2';

// Configuration Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('parametres', () => ({
        // =========================================================================
        // ÉTAT DE L'APPLICATION
        // =========================================================================
        isLoading: false,
        isSidebarCollapsed: false,
        activeTab: 'users',
        users: [],
        roles: [],
        newUser: {
            name: '',
            email: '',
            role: '',
            password: ''
        },
        newRole: {
            name: '',
            level: 'user',
            permissions: []
        },
        availablePermissions: [
            'Gérer les utilisateurs',
            'Gérer les évaluations',
            'Voir les statistiques',
            'Gérer les sessions',
            'Gérer les enseignants',
            'Exporter les données'
        ],

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
                await this.loadUsers();
                await this.loadRoles();
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

        // =========================================================================
        // MÉTHODES DE GESTION DES UTILISATEURS
        // =========================================================================

        /**
         * Charge la liste des utilisateurs
         */
        async loadUsers() {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*')
                    .order('name');

                if (error) throw error;
                this.users = data;
            } catch (error) {
                console.error('Erreur de chargement des utilisateurs:', error);
                this.showError('Erreur lors du chargement des utilisateurs');
            }
        },

        /**
         * Affiche le modal d'ajout d'utilisateur
         */
        showAddUserModal() {
            this.newUser = {
                name: '',
                email: '',
                role: '',
                password: ''
            };
            const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
            modal.show();
        },

        /**
         * Ajoute un nouvel utilisateur
         */
        async submitNewUser() {
            try {
                const { data, error } = await supabaseClient.auth.signUp({
                    email: this.newUser.email,
                    password: this.newUser.password,
                    options: {
                        data: {
                            name: this.newUser.name,
                            role: this.newUser.role
                        }
                    }
                });

                if (error) throw error;

                await this.loadUsers();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                modal.hide();
                this.showSuccess('Utilisateur ajouté avec succès');
            } catch (error) {
                console.error('Erreur d\'ajout d\'utilisateur:', error);
                this.showError('Erreur lors de l\'ajout de l\'utilisateur');
            }
        },

        /**
         * Modifie un utilisateur
         */
        async editUser(user) {
            // Implémentation de la modification d'utilisateur
            console.log('Modification de l\'utilisateur:', user);
        },

        /**
         * Supprime un utilisateur
         */
        async deleteUser(user) {
            try {
                const result = await Swal.fire({
                    title: 'Êtes-vous sûr ?',
                    text: "Cette action est irréversible !",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Oui, supprimer',
                    cancelButtonText: 'Annuler'
                });

                if (result.isConfirmed) {
                    const { error } = await supabaseClient
                        .from('users')
                        .delete()
                        .eq('id', user.id);

                    if (error) throw error;

                    await this.loadUsers();
                    this.showSuccess('Utilisateur supprimé avec succès');
                }
            } catch (error) {
                console.error('Erreur de suppression:', error);
                this.showError('Erreur lors de la suppression de l\'utilisateur');
            }
        },

        // =========================================================================
        // MÉTHODES DE GESTION DES RÔLES
        // =========================================================================

        /**
         * Charge la liste des rôles
         */
        async loadRoles() {
            try {
                const { data, error } = await supabaseClient
                    .from('roles')
                    .select('*')
                    .order('level');

                if (error) throw error;
                this.roles = data;
            } catch (error) {
                console.error('Erreur de chargement des rôles:', error);
                this.showError('Erreur lors du chargement des rôles');
            }
        },

        /**
         * Affiche le modal d'ajout de rôle
         */
        showAddRoleModal() {
            this.newRole = {
                name: '',
                level: 'user',
                permissions: []
            };
            const modal = new bootstrap.Modal(document.getElementById('addRoleModal'));
            modal.show();
        },

        /**
         * Ajoute un nouveau rôle
         */
        async submitNewRole() {
            try {
                const { data, error } = await supabaseClient
                    .from('roles')
                    .insert([this.newRole]);

                if (error) throw error;

                await this.loadRoles();
                const modal = bootstrap.Modal.getInstance(document.getElementById('addRoleModal'));
                modal.hide();
                this.showSuccess('Rôle ajouté avec succès');
            } catch (error) {
                console.error('Erreur d\'ajout de rôle:', error);
                this.showError('Erreur lors de l\'ajout du rôle');
            }
        },

        /**
         * Modifie un rôle
         */
        async editRole(role) {
            // Implémentation de la modification de rôle
            console.log('Modification du rôle:', role);
        },

        /**
         * Supprime un rôle
         */
        async deleteRole(role) {
            try {
                const result = await Swal.fire({
                    title: 'Êtes-vous sûr ?',
                    text: "Cette action est irréversible !",
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Oui, supprimer',
                    cancelButtonText: 'Annuler'
                });

                if (result.isConfirmed) {
                    const { error } = await supabaseClient
                        .from('roles')
                        .delete()
                        .eq('id', role.id);

                    if (error) throw error;

                    await this.loadRoles();
                    this.showSuccess('Rôle supprimé avec succès');
                }
            } catch (error) {
                console.error('Erreur de suppression:', error);
                this.showError('Erreur lors de la suppression du rôle');
            }
        },

        // =========================================================================
        // MÉTHODES UTILITAIRES
        // =========================================================================

        /**
         * Retourne la classe CSS pour le badge de rôle
         */
        getRoleBadgeClass(role) {
            const classes = {
                'admin': 'danger',
                'moderator': 'warning',
                'user': 'info'
            };
            return classes[role] || 'secondary';
        },

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
            setTimeout(() => errorDiv.remove(), 5000);
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