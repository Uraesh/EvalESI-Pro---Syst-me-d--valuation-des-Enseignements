// =============================================================================
// SECURITY.JS - Gestion de la sécurité et des rôles
// =============================================================================

// Import des dépendances
import { supabaseClient } from './supabase-client.js';
import Swal from 'sweetalert2';

document.addEventListener('DOMContentLoaded', () => {
    // Configuration Alpine.js pour la gestion de la sécurité
    Alpine.store('security', {
        // État de l'application
        isLoading: false,
        
        // Données utilisateurs et rôles
        users: [],
        roles: [],
        selectedUser: null,
        selectedRole: null,
        newUser: null,
        newRole: null,
        
        // Liste des permissions disponibles
        availablePermissions: [
            'view_dashboard',
            'create_evaluation',
            'manage_users',
            'manage_roles',
            'view_reports',
            'export_data'
        ],

        // Méthodes d'initialisation
        init() {
            this.loadUsers();
            this.loadRoles();
            this.checkAuth();
        },

        checkAuth() {
            if (!localStorage.getItem('token')) {
                window.location.href = '/index.html';
            }
        },

        // Méthodes de gestion des utilisateurs
        async loadUsers() {
            try {
                this.isLoading = true;
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('*');
                
                if (error) throw error;
                this.users = data;
            } catch (error) {
                this.showError('Erreur lors du chargement des utilisateurs');
            } finally {
                this.isLoading = false;
            }
        },

        showAddUserModal() {
            this.newUser = { name: '', email: '', role: 'user' };
            const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
            modal.show();
        },

        async submitNewUser() {
            try {
                const { error } = await supabaseClient
                    .from('users')
                    .insert([this.newUser]);
                
                if (error) throw error;
                
                await this.loadUsers();
                this.showSuccess('Utilisateur ajouté avec succès');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addUserModal'));
                modal.hide();
            } catch (error) {
                this.showError('Erreur lors de l\'ajout de l\'utilisateur');
            }
        },

        editUser(user) {
            this.selectedUser = user;
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        },

        async deleteUser(user) {
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'Confirmer la suppression',
                    text: `Voulez-vous vraiment supprimer l\'utilisateur ${user.name} ?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#0066cc',
                    cancelButtonColor: '#cc0000'
                });

                if (isConfirmed) {
                    const { error } = await supabaseClient
                        .from('users')
                        .delete()
                        .eq('id', user.id);

                    if (error) throw error;

                    await this.loadUsers();
                    this.showSuccess('Utilisateur supprimé avec succès');
                }
            } catch (error) {
                this.showError('Erreur lors de la suppression de l\'utilisateur');
            }
        },

        // Méthodes de gestion des boutons
        getActionButtonClass() {
            return {
                'btn-primary': true,
                'd-flex': true,
                'align-items': 'center',
                'gap': 'var(--spacing-sm)'
            };
        },

        getActionButtonIcon(icon) {
            return `<i class="fas fa-${icon}"></i>`;
        },

        // Méthodes de gestion des rôles
        async loadRoles() {
            try {
                this.isLoading = true;
                const { data, error } = await supabaseClient
                    .from('roles')
                    .select('*');
                
                if (error) throw error;
                this.roles = data;
            } catch (error) {
                this.showError('Erreur lors du chargement des rôles');
            } finally {
                this.isLoading = false;
            }
        },

        showAddRoleModal() {
            this.newRole = { name: '', permissions: [] };
            const modal = new bootstrap.Modal(document.getElementById('addRoleModal'));
            modal.show();
        },

        async submitNewRole() {
            try {
                const { error } = await supabaseClient
                    .from('roles')
                    .insert([this.newRole]);
                
                if (error) throw error;
                
                await this.loadRoles();
                this.showSuccess('Rôle ajouté avec succès');
                const modal = bootstrap.Modal.getInstance(document.getElementById('addRoleModal'));
                modal.hide();
            } catch (error) {
                this.showError('Erreur lors de l\'ajout du rôle');
            }
        },

        editRole(role) {
            this.selectedRole = role;
            const modal = new bootstrap.Modal(document.getElementById('editRoleModal'));
            modal.show();
        },

        async deleteRole(role) {
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'Confirmer la suppression',
                    text: `Voulez-vous vraiment supprimer le rôle ${role.name} ?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#0066cc',
                    cancelButtonColor: '#cc0000'
                });

                if (isConfirmed) {
                    const { error } = await supabaseClient
                        .from('roles')
                        .delete()
                        .eq('id', role.id);

                    if (error) throw error;

                    await this.loadRoles();
                    this.showSuccess('Rôle supprimé avec succès');
                }
            } catch (error) {
                this.showError('Erreur lors de la suppression du rôle');
            }
        },

        // Méthodes utilitaires
        getRoleBadgeClass(role) {
            const classes = {
                'admin': 'danger',
                'moderator': 'warning',
                'user': 'info'
            };
            return classes[role] || 'secondary';
        },

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
    });

    // Initialisation Alpine.js
    Alpine.start();
});