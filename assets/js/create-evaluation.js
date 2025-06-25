// =============================================================================
// CREATE-EVALUATION.JS - Gestion de la création d'évaluation
// =============================================================================

import { supabaseClient } from './supabase-client.js';
import Swal from 'sweetalert2';
import { nanoid } from 'nanoid';

// Configuration Alpine.js
// Correction: Importer getSupabaseClient et initSupabaseClient
import { getSupabaseClient, initSupabaseClient } from './supabase-client.js';

document.addEventListener('alpine:init', () => {
    Alpine.data('createEvaluation', () => ({
        // État initial
        isLoading: false,
        isSidebarCollapsed: false,
        teachers: [], // Sera rempli avec {id, nom, prenom}
        classes: [],  // Sera rempli avec {id, nom, niveau_id}
        subjects: [], // Sera rempli avec {id, libelle}
        academicYears: [], // Sera rempli avec {id, libelle}

        // Modèles pour les champs du formulaire de configuration
        // Ces IDs seront utilisés pour retrouver les libellés pour la prévisualisation et la génération du lien
        configTeacherId: null,
        configSubjectId: null,
        configLevelId: null, // Supposons que les niveaux sont aussi chargés, sinon ce sera un texte direct
        configClassId: null,
        configAcademicYearId: null,
        configSemester: '', // ex: "S1", "S2"
        configTitle: '', // Titre de l'évaluation (optionnel, peut être auto-généré)

        previewLink: '',
        generatedLinkDisplay: '',
        isLinkGenerated: false,

        stats: { // Ces stats ne semblent pas être utilisées activement dans ce composant pour l'instant
            totalEvaluations: 0,
            responseRate: 0
        },

        // Vérification d'authentification
        async checkAuth(supabase) { // supabase est passé en argument depuis init
            if (!supabase) {
                console.error("Supabase client not available for checkAuth");
                window.location.href = '/index.html';
                throw new Error("Client Supabase non initialisé.");
            }
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error || !session) {
                window.location.href = '/index.html';
            }
        },

        // Initialisation
        async init() {
            // Correction: Utiliser getSupabaseClient() qui retourne l'instance initialisée
            // ou s'assurer que supabaseClient est l'instance initialisée globalement.
            // Pour plus de robustesse, utilisons getSupabaseClient()
            const supabase = getSupabaseClient();
            if (!supabase) {
                console.error("Supabase client not available for init in createEvaluation");
                this.showError("Erreur critique: client de base de données non initialisé.");
                return;
            }
            await this.checkAuth(supabase); // Passer l'instance
            await Promise.all([
                this.loadTeachers(supabase),
                this.loadClasses(supabase),
                this.loadSubjects(supabase),
                this.loadAcademicYears(supabase) // Charger les années académiques
            ]);
            this.setupEventListeners(); // Garder pour les événements spécifiques à cette page comme copyLinkBtn
        },

        // Méthodes de chargement des données
        async loadTeachers(supabase) {
            try {
                // Remplacer isDevMode par une vérification de window.APP_CONFIG.MODE si nécessaire, ou utiliser supabase.getEnseignants()
                // const data = await supabase.getEnseignants(); // Si getEnseignants gère isDevMode
                // Pour l'instant, gardons la logique existante mais en utilisant l'instance passée
                const { data, error } = (window.APP_CONFIG && window.APP_CONFIG.MODE === 'development')
                    ? { data: window.mockData.data.enseignants, error: null } // Assurez-vous que mockData est chargé
                    : await supabase
                        .from('enseignants')
                        .select('id, nom, prenom') // Sélectionner uniquement les champs nécessaires
                        .order('nom', { ascending: true });
                if (error) throw error;
                this.teachers = data;
                // this.updateStats(); // updateStats sera appelé ailleurs ou n'est pas pertinent ici
            } catch (error) {
                this.showError('Erreur lors du chargement des enseignants');
            }
        },

        async loadClasses(supabase) {
            try {
                const { data, error } = await supabase
                    .from('classes')
                    .select('id, nom, niveau_id') // Ajuster les champs sélectionnés
                    .order('nom', { ascending: true });

                if (error) throw error;
                this.classes = data;
            } catch (error) {
                console.error('Erreur de chargement des classes:', error);
                this.showError('Erreur lors du chargement des classes');
            }
        },

        async loadSubjects(supabase) {
            try {
                const { data, error } = await supabase
                    .from('matieres')
                    .select('id, libelle') // Ajuster les champs sélectionnés
                    .order('libelle', { ascending: true });

                if (error) throw error;
                this.subjects = data;
            } catch (error) {
                console.error('Erreur de chargement des matières:', error);
                this.showError('Erreur lors du chargement des matières');
            }
        },

        // Méthode de prévisualisation
        previewEvaluationForm() {
            // Utiliser les propriétés x-model liées: this.configTeacherName, etc.
            if (!this.configTeacherName || !this.configSubject || !this.configLevel || !this.configClassName || !this.configAcademicYear || !this.configSemester) {
                this.showError('Veuillez remplir tous les champs de configuration pour la prévisualisation.');
                return;
            }

            const previewData = {
                teacherName: this.teachers.find(t => t.id == this.configTeacherName)?.nom + ' ' + this.teachers.find(t => t.id == this.configTeacherName)?.prenom, // Pour obtenir le nom complet
                subjectName: this.subjects.find(s => s.id == this.configSubject)?.libelle,
                levelName: this.configLevel, // Supposons que configLevel stocke directement le libellé ou un ID à résoudre
                className: this.configClassName, // Idem
                academicYear: this.academicYears.find(ay => ay.id == this.configAcademicYear)?.libelle,
                semester: this.configSemester,
                 // Ajouter d'autres informations si nécessaire pour le formulaire d'évaluation
            };

            // Résoudre les noms si les IDs sont stockés
            // Pour levelName et className, si ce sont des IDs, il faudrait les résoudre.
            // Pour simplifier, on va supposer qu'ils sont déjà des libellés ou que le formulaire d'évaluation peut gérer les IDs.
            // S'ils sont des IDs de la table 'niveaux' ou 'classes', il faudrait les charger et les filtrer.
            // Pour l'instant, on passe ce qui est dans les champs de config.

            sessionStorage.setItem('evaluationPreviewData', JSON.stringify(previewData));
            this.previewLink = `../pages/evaluation-form.html?preview=true&t=${Date.now()}`; // Ajouter un timestamp pour forcer le rechargement de l'iframe

            // Ouvrir la modal de prévisualisation
            const modalElement = document.getElementById('previewEvaluationModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement) || new bootstrap.Modal(modalElement);
                modal.show();
            } else {
                this.showError("La modal de prévisualisation est introuvable.");
            }
        },


        // Méthodes utilitaires (showError, showSuccess sont ok)
        // La méthode generateLink est conservée et appelée par le bouton "Générer le lien"
        // La méthode createEvaluation n'est plus nécessaire telle quelle si generateLink fait le travail.
        // Renommons createEvaluation en submitActualEvaluation pour plus de clarté, ou intégrons sa logique dans generateLink.
        // Pour l'instant, concentrons-nous sur la prévisualisation.

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

        updateStats() {
            // Mise à jour des statistiques
            this.stats.totalEvaluations = this.teachers.length;
            this.stats.responseRate = 0; // À implémenter selon vos besoins
        },

        setupEventListeners() {
            // Configuration des écouteurs d'événements
            const copyLinkBtn = document.getElementById('copyLinkBtn');
            const generatedLink = document.getElementById('generatedLink');
            const copyFeedback = document.getElementById('copyFeedback');

            if (copyLinkBtn && generatedLink) {
                copyLinkBtn.addEventListener('click', async () => {
                    try {
                        await navigator.clipboard.writeText(generatedLink.textContent);
                        copyFeedback.style.display = 'block';
                        setTimeout(() => {
                            copyFeedback.style.display = 'none';
                        }, 2500);
                    } catch (err) {
                        console.error('Erreur lors de la copie:', err);
                    }
                });
            }
        },

        //Dans create-evaluation.html, intègre un fichier create-evaluation.js pour gérer la génération des liens et l'envoi par email :
        async loadAcademicYears(supabase) { // supabase est passé en argument
            try {
                const { data, error } = await supabase
                    .from('annees_academiques')
                    .select('id, libelle')
                    .order('libelle', { ascending: false });
                if (error) throw error;
                this.academicYears = data;
            } catch (error) {
                this.showError('Erreur lors du chargement des années académiques.');
            }
        },

        async generateLink() {
            const supabase = getSupabaseClient();
            if (!supabase) {
                this.showError("Client Supabase non disponible.");
                return;
            }

            // Valider que les champs de configuration (IDs) sont remplis
            if (!this.configTeacherId || !this.configSubjectId || !this.configClassId || !this.configAcademicYearId || !this.configSemester) {
                this.showError('Veuillez remplir tous les champs de configuration (Enseignant, Matière, Classe, Année Académique, Semestre).');
                return;
            }

            // Construire le titre de l'évaluation
            const teacher = this.teachers.find(t => t.id == this.configTeacherId);
            const subject = this.subjects.find(s => s.id == this.configSubjectId);
            const defaultTitle = `Évaluation de ${teacher?.prenom} ${teacher?.nom} - ${subject?.libelle} (${this.configSemester})`;

            const sessionData = {
                enseignant_id: this.configTeacherId,
                matiere_id: this.configSubjectId,
                classe_id: this.configClassId,
                annee_academique_id: this.configAcademicYearId,
                semestre: this.configSemester,
                titre: this.configTitle || defaultTitle, // Utiliser le titre configuré ou un titre par défaut
                description: `Session d'évaluation pour ${defaultTitle}`, // Ajouter une description
                is_preview: false // C'est une session réelle
            };

            this.isLoading = true;
            try {
                const data = await supabase.createSessionEvaluation(sessionData); // createSessionEvaluation est dans supabase-client.js
                if (data && data.lien_public) {
                    this.generatedLinkDisplay = data.lien_public;
                    this.isLinkGenerated = true;
                    this.showSuccess('Lien d\'évaluation généré avec succès !');
                    // Optionnel: Copier dans le presse-papier automatiquement
                    // navigator.clipboard.writeText(data.lien_public).catch(err => console.error('Erreur copie auto:', err));
                } else {
                    throw new Error("Le lien n'a pas pu être généré.");
                }
            } catch (error) {
                console.error('Erreur de génération du lien:', error);
                this.showError(`Erreur lors de la génération du lien: ${error.message}`);
                this.isLinkGenerated = false;
            } finally {
                this.isLoading = false;
            }
        }
    }));
});



