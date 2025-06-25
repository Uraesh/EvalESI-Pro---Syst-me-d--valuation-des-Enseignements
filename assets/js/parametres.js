// =============================================================================
// PARAMÈTRES.JS - Gestion des paramètres et des droits d'accès
// =============================================================================

// Import des dépendances
import { getSupabaseClient, initSupabaseClient } from './supabase-client.js'; // Correction
import Swal from 'sweetalert2';

document.addEventListener('DOMContentLoaded', async () => { // Rendre async pour await initSupabaseClient
    // Initialiser Supabase avant de configurer le store Alpine
    // try {
    //     await initSupabaseClient();
    // } catch (error) {
    //     console.error("Erreur critique: Impossible d'initialiser Supabase Client pour parametres.js", error);
    //     // Afficher une erreur à l'utilisateur ici si nécessaire, car le store ne sera pas fonctionnel
    //     Swal.fire({
    //         icon: 'error',
    //         title: 'Erreur Critique',
    //         text: "Impossible de charger la configuration de l'application. Veuillez contacter le support.",
    //         confirmButtonColor: '#d33'
    //     });
    //     return; // Arrêter l'exécution si Supabase ne s'initialise pas
    // }

    // Configuration Alpine.js pour la gestion des paramètres
    Alpine.store('parametres', {
        // État de l'application
        isLoading: true, // Mettre à true initialement
        activeTab: 'system', // Onglet par défaut
        
        // Données utilisateurs et rôles
        users: [],
        availableRoles: [], // Pour la liste déroulante des rôles
        availablePermissions: [ // Liste statique des permissions disponibles
            'manage_users', 'view_users',
            'manage_roles', 'view_roles',
            'manage_settings',
            'manage_evaluations', 'view_evaluations',
            'view_reports',
            'manage_teachers', 'view_teachers',
            'manage_sessions', 'view_sessions'
        ],
        selectedUser: null,
        selectedRole: null,
        newUser: { name: '', email: '', role_id: null, password: '' },
        newRole: { name: '', level: 'user', permissions: [] }, // Valeur par défaut pour level, et permissions initialisé
        
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
        async init() {
            this.isLoading = true;
            try {
                await initSupabaseClient(); // Assurer l'initialisation
                const supabase = getSupabaseClient();
                if (!supabase) throw new Error("Client Supabase non disponible pour init.");

                await this.checkAuth(supabase);
                // await this.loadSettings(supabase); // Si loadSettings doit utiliser supabase
                await this.loadRoles(supabase); // Charger les rôles ici
                // await this.loadUsers(supabase); // Charger les utilisateurs si un onglet les affiche par défaut
            } catch (error) {
                console.error("Erreur lors de l'initialisation du store parametres:", error);
                this.showError(`Erreur d'initialisation: ${error.message}`);
            } finally {
                this.isLoading = false;
            }
        },

        async checkAuth(supabase) {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                window.location.href = '/index.html';
                throw new Error("Utilisateur non authentifié.");
            }
            const isAdmin = await supabase.checkAdminRights(session.user.id);
            if (!isAdmin) {
                this.showError("Accès non autorisé. Droits administrateur requis.");
                window.location.href = '/pages/dashboard.html';
                throw new Error("Droits administrateur manquants.");
            }
        },

        // Méthodes de gestion des utilisateurs
        async loadUsers(supabase) { // Passer supabase
            this.isLoading = true;
            try {
                // Exemple: si vous avez une table 'profiles' liée à auth.users
                const { data, error } = await supabase
                    .from('profiles') // ou votre table d'utilisateurs/profils
                    .select(`
                        id,
                        full_name,
                        email,
                        role,
                        is_active
                        // ...autres champs nécessaires
                    `);
                if (error) throw error;
                this.users = data || [];
            } catch (error) {
                console.error("Erreur chargement utilisateurs:", error);
                this.showError(`Erreur chargement utilisateurs: ${error.message}`);
            } finally {
                this.isLoading = false;
            }
        },

        showAddUserModal() {
            this.newUser = { name: '', email: '', role_id: null, password: '' }; // Réinitialiser newUser
            // Charger les rôles disponibles si ce n'est pas déjà fait ou s'ils peuvent changer
            // if (this.availableRoles.length === 0) await this.loadRoles(getSupabaseClient());
            const modalElement = document.getElementById('addUserModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                modal.show();
            }
        },

        async submitNewUser() {
            const supabase = getSupabaseClient();
            if(!supabase) {
                this.showError("Client Supabase non disponible.");
                return;
            }
            if (!this.newUser.email || !this.newUser.password || !this.newUser.name || !this.newUser.role_id) {
                this.showError("Nom complet, email, rôle et mot de passe sont requis.");
                return;
            }

            this.isLoading = true;
            try {
                // Création de l'utilisateur dans Supabase Auth
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: this.newUser.email,
                    password: this.newUser.password,
                    options: {
                        data: {
                            full_name: this.newUser.name, // Sera dans user_metadata
                            // Le rôle est plus complexe à gérer directement dans user_metadata pour les permissions Supabase RLS.
                            // Souvent, on stocke role_id dans une table 'profiles' séparée.
                        }
                    }
                });

                if (authError) throw authError;

                // Si la création Auth réussit et que vous avez une table 'profiles' liée par user_id (UUID)
                // et que cette table n'est pas automatiquement peuplée par un trigger :
                if (authData.user) {
                    const { error: profileError } = await supabase
                        .from('profiles') // Assurez-vous que 'profiles' est le nom correct de votre table
                        .insert({
                            id: authData.user.id, // Lie au auth.users.id
                            full_name: this.newUser.name,
                            email: this.newUser.email, // Redondant si vous joignez auth.users, mais peut être utile
                            role_id: this.newUser.role_id, // L'ID du rôle sélectionné
                            is_active: true // Par défaut, un nouvel utilisateur est actif
                        });

                    if (profileError) {
                        // Que faire si l'utilisateur Auth est créé mais le profil échoue ?
                        // Pour l'instant, on logue une alerte et on continue, mais une stratégie de compensation pourrait être nécessaire.
                        console.warn("Utilisateur Auth créé, mais erreur lors de la création/mise à jour du profil:", profileError);
                        this.showError(`Utilisateur authentifié créé, mais échec de la création du profil détaillé: ${profileError.message}`);
                        // On pourrait vouloir supprimer l'utilisateur Auth ici si le profil est critique.
                        // await supabase.auth.admin.deleteUser(authData.user.id); // Nécessite les droits admin pour le client Supabase
                    }
                }
                
                await this.loadUsers(supabase); // Recharger la liste des utilisateurs (depuis la table profiles)
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
        async loadRoles(supabase) { // Passer supabase, rendre async
            this.isLoading = true; // Peut être spécifique à cette section si les onglets chargent séparément
            try {
                const { data, error } = await supabase
                    .from('roles') // Assurez-vous que cette table existe et contient 'id' et 'name'
                    .select('id, name'); // Sélectionner seulement id et name pour la liste déroulante

                if (error) throw error;
                this.availableRoles = data || []; // Stocker dans availableRoles
            } catch (error) {
                console.error("Erreur chargement des rôles:", error);
                this.showError(`Erreur chargement des rôles: ${error.message}`);
                this.availableRoles = [];
            } finally {
                // Peut-être ne pas mettre isLoading à false ici si d'autres chargements sont en cours dans init
            }
        },

        showAddRoleModal() {
            this.newRole = { name: '', level: 'user', permissions: [] }; // Réinitialisation complète
            const modalElement = document.getElementById('addRoleModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                console.error("Modal 'addRoleModal' non trouvé.");
            }
        },

        async submitNewRole() {
            const supabase = getSupabaseClient(); // Utiliser getSupabaseClient
            if (!supabase) {
                this.showError("Client Supabase non disponible.");
                return;
            }
            if (!this.newRole.name || !this.newRole.level) {
                this.showError("Le nom du rôle et le niveau sont requis.");
                return;
            }
            this.isLoading = true;
            try {
                const { data, error } = await supabase // Utiliser supabase instance
                    .from('roles')
                    .insert([{
                        name: this.newRole.name,
                        level: this.newRole.level,
                        permissions: this.newRole.permissions
                    }])
                    .select();
                
                if (error) throw error;
                
                await this.loadRoles(supabase); // Passer supabase
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

        async deleteRole(role) { // Renommer en confirmDeleteRole pour la cohérence
            const supabase = getSupabaseClient(); // Utiliser getSupabaseClient
            if (!supabase) {
                this.showError("Client Supabase non disponible.");
                return;
            }
            try {
                const { isConfirmed } = await Swal.fire({
                    title: 'Confirmer la suppression',
                    text: `Voulez-vous vraiment supprimer le rôle ${role.name} ?`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33', // Rouge pour suppression
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Oui, supprimer !',
                    cancelButtonText: 'Annuler'
                });

                if (isConfirmed) {
                    this.isLoading = true; // Gérer isLoading
                    const { error } = await supabase // Utiliser supabase instance
                        .from('roles')
                        .delete()
                        .eq('id', role.id);

                    if (error) throw error;

                    await this.loadRoles(supabase); // Passer supabase
                    this.showSuccess('Rôle supprimé avec succès');
                }
            } catch (error) {
                console.error("Erreur lors de la suppression du rôle:", error); // Log plus détaillé
                this.showError(`Erreur lors de la suppression du rôle: ${error.message}`);
            } finally {
                this.isLoading = false; // Gérer isLoading
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