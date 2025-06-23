// =============================================================================
// CREATE-EVALUATION.JS - Gestion de la création d'évaluation
// =============================================================================

import { supabaseClient } from './supabase-client.js';
import Swal from 'sweetalert2';
import { nanoid } from 'nanoid';

// Configuration Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('createEvaluation', () => ({
        // État initial
        isLoading: false,
        isSidebarCollapsed: false,
        teachers: [],
        classes: [],
        subjects: [],
        stats: {
            totalEvaluations: 0,
            responseRate: 0
        },

        // Initialisation
        async init() {
            await Promise.all([
                this.loadTeachers(),
                this.loadClasses(),
                this.loadSubjects()
            ]);
            this.setupEventListeners();
        },

        // Méthodes de chargement des données
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

        async loadClasses() {
            try {
                const { data, error } = await supabaseClient
                    .from('classes')
                    .select('*')
                    .order('nom', { ascending: true });

                if (error) throw error;
                this.classes = data;
            } catch (error) {
                console.error('Erreur de chargement des classes:', error);
                this.showError('Erreur lors du chargement des classes');
            }
        },

        async loadSubjects() {
            try {
                const { data, error } = await supabaseClient
                    .from('matieres')
                    .select('*')
                    .order('nom_matiere', { ascending: true });

                if (error) throw error;
                this.subjects = data;
            } catch (error) {
                console.error('Erreur de chargement des matières:', error);
                this.showError('Erreur lors du chargement des matières');
            }
        },

        // Méthode de création d'évaluation
        async createEvaluation() {
            try {
                this.isLoading = true;
                
                const evaluationData = {
                    token: nanoid(10),
                    titre: this.title,
                    date_ouverture: this.startDate,
                    date_fermeture: this.endDate,
                    enseignant_id: this.selectedTeacher,
                    classe_id: this.selectedClass,
                    matiere_id: this.selectedSubject,
                    statut: 'active'
                };

                const { error } = await supabaseClient
                    .from('sessions_evaluation')
                    .insert([evaluationData]);

                if (error) throw error;

                this.showSuccess('Évaluation créée avec succès');
                this.resetForm();
            } catch (error) {
                console.error('Erreur de création:', error);
                this.showError('Erreur lors de la création de l\'évaluation');
            } finally {
                this.isLoading = false;
            }
        },

        // Méthode de prévisualisation
        previewEvaluation() {
            const teacher = document.getElementById('teacherName').value;
            const subject = document.getElementById('subject').value;
            const level = document.getElementById('level').value;
            const className = document.getElementById('className').value;

            if (!teacher || !subject || !level || !className) {
                Swal.fire({
                    title: 'Champs manquants',
                    text: 'Veuillez remplir tous les champs du formulaire avant de prévisualiser',
                    icon: 'warning',
                    confirmButtonText: 'OK'
                });
                return;
            }

            const params = new URLSearchParams({
                teacher: teacher,
                subject: subject,
                level: level,
                class: className
            });

            window.open(`evaluation-form.html?${params.toString()}`, '_blank');
        },

        // Méthodes utilitaires
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
        async loadAcademicYears() {
            try {
                const { data, error } = await supabaseClient
                    .from('annees_academiques')
                    .select('id, libelle')
                    .order('libelle', { ascending: false });
                if (error) throw error;
                this.academicYears = data;
            } catch (error) {
                this.showError('Erreur lors du chargement des années académiques');
            }
        },
        async generateLink() {
            const sessionData = {
                enseignant_id: document.getElementById('teacherName').value,
                matiere_id: document.getElementById('subject').value,
                classe_id: document.getElementById('class').value,
                annee_academique_id: document.getElementById('academicYear').value,
                semestre: document.getElementById('semestre').value,
                titre: `Évaluation ${new Date().toLocaleDateString()}`
            };
            if (!sessionData.enseignant_id || !sessionData.matiere_id || !sessionData.classe_id || !sessionData.annee_academique_id || !sessionData.semestre) {
                this.showError('Veuillez remplir tous les champs requis');
                return;
            }
            const { data } = await supabaseClient.createSessionEvaluation(sessionData);
            this.link = data.lien_public;
            this.showSuccess('Lien généré avec succès');
        }
    }));
});

// Initialisation des écouteurs d'événements au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn) {
        previewBtn.addEventListener('click', () => {
            const createEvaluation = Alpine.data('createEvaluation');
            if (createEvaluation) {
                createEvaluation.previewEvaluation();
            }
        });
    }
}); 

