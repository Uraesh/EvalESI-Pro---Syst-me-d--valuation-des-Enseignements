// =============================================================================
// PARAMÈTRES.JS - Gestion des paramètres et des droits d'accès
// =============================================================================

// Import des dépendances
import { supabaseClient } from './supabase-client.js';
import Swal from 'sweetalert2';

document.addEventListener('DOMContentLoaded', () => {
    // Configuration Alpine.js pour la gestion des paramètres
    Alpine.store('parametres', {
        // État de l'application
        isLoading: false,
        activeTab: 'system',
        
        // Données utilisateurs et rôles
        users: [],
        roles: [],
        selectedUser: null,
        selectedRole: null,
        newUser: null,
        newRole: null,
        
        // Configuration système
        systemConfig: {
            authMode: 'local',
            defaultSessionDuration: 60,
            minResponses: 10,
            linkExpiry: 24
        },
        
        // Configuration sécurité
        securityConfig: {
            passwordMinLength: 8,
            passwordExpiry: 90,
            sessionMaxDuration: 8,
            sessionInactivityTimeout: 30,
            logRetention: 90,
            auditNotifications: 'critical'
        },
        
        // Configuration évaluations
        evaluationConfig: {
            criteria: [
                { name: 'Intérêt de l\'enseignant pour son cours', weight: 1 },
                { name: 'Clarté de l\'exposé', weight: 1 },
                { name: 'Adéquation des supports', weight: 1 },
                { name: 'Qualité des interactions', weight: 1 }
            ],
            minScale: 1,
            maxScale: 5
        },
        
        // Configuration notifications
        notificationConfig: {
            smtpHost: '',
            smtpPort: 587,
            invitationTemplate: 'Bonjour,\n\nVous êtes invité(e) à participer à une évaluation.\n\nLien: {{link}}\n\nMerci de votre participation.',
            reminderTemplate: 'Rappel: Vous avez une évaluation à compléter.\n\nLien: {{link}}',
            reminderFrequency: 3,
            maxReminders: 3
        },
        
        // Configuration intégrations
        integrationConfig: {
            sisUrl: '',
            sisApiKey: '',
            webhookUrl: '',
            webhookSecret: ''
        },

        // Méthodes de gestion des paramètres
        saveSettings() {
            // Sauvegarde des paramètres dans le backend
            return fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    system: this.systemConfig,
                    security: this.securityConfig,
                    evaluations: this.evaluationConfig,
                    notifications: this.notificationConfig,
                    integrations: this.integrationConfig
                })
            }).then(response => {
                if (!response.ok) {
                    throw new Error('Erreur lors de la sauvegarde des paramètres');
                }
                return response.json();
            });
        },

        loadSettings() {
            // Chargement des paramètres depuis le backend
            return fetch('/api/settings')
                .then(response => response.json())
                .then(data => {
                    this.systemConfig = data.system || this.systemConfig;
                    this.securityConfig = data.security || this.securityConfig;
                    this.evaluationConfig = data.evaluations || this.evaluationConfig;
                    this.notificationConfig = data.notifications || this.notificationConfig;
                    this.integrationConfig = data.integrations || this.integrationConfig;
                });
        },

        addCriterion() {
            // Ajout d'un nouveau critère d'évaluation
            this.evaluationConfig.criteria.push({ name: '', weight: 1 });
        },

        removeCriterion(index) {
            // Suppression d'un critère d'évaluation
            this.evaluationConfig.criteria.splice(index, 1);
        },

        // Méthodes d'initialisation
        init() {
            // Initialisation de l'application et chargement des données
            this.loadSettings();
            this.checkAuth();
        },

        checkAuth() {
            // Vérification de l'authentification de l'utilisateur
            if (!localStorage.getItem('token')) {
                window.location.href = '/index.html';
            }
        },

        // Méthodes de gestion des utilisateurs
        loadUsers() {
            // Chargement de la liste des utilisateurs depuis Supabase
            return supabaseClient
                .from('users')
                .select('*')
                .then(({ data, error }) => {
                    if (error) throw error;
                    this.users = data;
                });
        },

        showAddUserModal() {
            // Affichage du modal d'ajout d'utilisateur
            const modal = new bootstrap.Modal(document.getElementById('addUserModal'));
            modal.show();
            this.newUser = { name: '', email: '', role: 'user' };
        },

        async submitNewUser() {
            // Soumission du formulaire d'ajout d'utilisateur
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
            // Préparation de la modification d'un utilisateur
            this.selectedUser = user;
            const modal = new bootstrap.Modal(document.getElementById('editUserModal'));
            modal.show();
        },

        async deleteUser(user) {
            // Suppression d'un utilisateur avec confirmation
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

        // Méthodes de gestion des rôles
        loadRoles() {
            // Chargement de la liste des rôles depuis Supabase
            return supabaseClient
                .from('roles')
                .select('*')
                .then(({ data, error }) => {
                    if (error) throw error;
                    this.roles = data;
                });
        },

        showAddRoleModal() {
            // Affichage du modal d'ajout de rôle
            const modal = new bootstrap.Modal(document.getElementById('addRoleModal'));
            modal.show();
            this.newRole = { name: '', permissions: [] };
        },

        async submitNewRole() {
            // Soumission du formulaire d'ajout de rôle
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
            // Préparation de la modification d'un rôle
            this.selectedRole = role;
            const modal = new bootstrap.Modal(document.getElementById('editRoleModal'));
            modal.show();
        },

        async deleteRole(role) {
            // Suppression d'un rôle avec confirmation
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
            // Retourne la classe CSS pour le badge de rôle selon son type
            const classes = {
                'admin': 'danger',
                'moderator': 'warning',
                'user': 'info'
            };
            return classes[role] || 'secondary';
        },

        showError(message) {
            // Affiche une notification d'erreur avec SweetAlert2 et un message temporaire
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
            // Affiche une notification de succès avec SweetAlert2 et un message temporaire
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

    // Initialisation Alpine.js pour démarrer l'application
    Alpine.start();
});