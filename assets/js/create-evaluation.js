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

        // Vérification d'authentification
        async checkAuth() {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error || !session) {
                window.location.href = '/index.html';
            }
        },

        // Initialisation
        async init() {
            await this.checkAuth();
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
                    .order('libelle', { ascending: true });

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
                
                // 1. Vérifier si l'enseignement existe déjà
                const { data: enseignement, error: enseignementError } = await supabaseClient
                    .from('enseignements')
                    .select('id')
                    .eq('enseignant_id', this.selectedTeacher)
                    .eq('classe_id', this.selectedClass)
                    .eq('matiere_id', this.selectedSubject)
                    .single(); // Ajout de single() pour s'assurer d'un seul résultat

                let enseignementId;
                
                // 2. Si l'enseignement n'existe pas, le créer
                if (enseignementError || !enseignement) {
                    // Récupérer l'année académique active
                    const { data: anneeActive, error: anneeError } = await supabaseClient
                        .from('annees_academiques')
                        .select('id')
                        .eq('is_active', true)
                        .single();
                    
                    if (anneeError || !anneeActive) {
                        throw new Error('Aucune année académique active trouvée');
                    }

                    const { data: newEnseignement, error: createError } = await supabaseClient
                        .from('enseignements')
                        .insert({
                            enseignant_id: this.selectedTeacher,
                            classe_id: this.selectedClass,
                            matiere_id: this.selectedSubject,
                            annee_academique_id: anneeActive.id,
                            volume_horaire: 0,
                            semestre: 'S1',
                            date_debut: new Date().toISOString(),
                            date_fin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
                            is_active: true,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                        .select('id')
                        .single();
                    
                    if (createError) throw createError;
                    enseignementId = newEnseignement.id;
                } else {
                    enseignementId = enseignement.id;
                }

                // 3. Créer la session d'évaluation
                const evaluationData = {
                    enseignement_id: enseignementId,
                    titre: this.title,
                    description: this.description || '',
                    token: crypto.randomUUID(), // Utilisation de l'API Web Crypto pour générer un UUID sécurisé
                    date_ouverture: this.startDate,
                    date_fermeture: this.endDate,
                    created_by_id: (await supabaseClient.auth.getUser()).data.user.id,
                    is_active: true,
                    nb_reponses: 0,
                    nb_vues: 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // 4. Insérer la session d'évaluation
                const { data: session, error: sessionError } = await supabaseClient
                    .from('sessions_evaluation')
                    .insert([evaluationData])
                    .select('*');
                    
                if (sessionError) throw sessionError;
                
                // 5. Créer les questions par défaut pour cette évaluation
                const defaultQuestions = [
                    { 
                        session_id: session[0].id, 
                        type_question: 'note',
                        intitule: 'Notez globalement cet enseignement',
                        description: 'Sur une échelle de 1 à 5',
                        est_obligatoire: true,
                        ordre: 1,
                        options: JSON.stringify([
                            { valeur: 1, libelle: '1 - Très insatisfait' },
                            { valeur: 2, libelle: '2 - Insatisfait' },
                            { valeur: 3, libelle: '3 - Neutre' },
                            { valeur: 4, libelle: '4 - Satisfait' },
                            { valeur: 5, libelle: '5 - Très satisfait' }
                        ])
                    },
                    { 
                        session_id: session[0].id, 
                        type_question: 'texte',
                        intitule: 'Commentaires généraux',
                        description: 'Laissez vos commentaires sur cet enseignement',
                        est_obligatoire: false,
                        ordre: 2,
                        options: JSON.stringify({ max_length: 1000 })
                    }
                ];
                
                const { error: questionsError } = await supabaseClient
                    .from('questions_evaluation')
                    .insert(defaultQuestions);
                    
                if (questionsError) throw questionsError;

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
                    icon: 'warning',
                    title: 'Champs manquants',
                    text: 'Veuillez remplir tous les champs du formulaire avant de prévisualiser.',
                    confirmButtonText: 'OK',
                    confirmButtonColor: '#2563eb',
                    background: '#1e293b',
                    color: '#f8fafc'
                });
                return;
            }

            // Créer une nouvelle instance de la modale
            const modal = document.createElement('div');
            modal.className = 'modal fade';
            modal.id = 'evaluationPreviewModal';
            modal.setAttribute('tabindex', '-1');
            modal.setAttribute('aria-labelledby', 'evaluationPreviewModalLabel');
            modal.setAttribute('aria-hidden', 'true');
            
            // Contenu de la modale
            modal.innerHTML = `
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content bg-dark text-light">
                        <div class="modal-header border-secondary">
                            <h5 class="modal-title" id="evaluationPreviewModalLabel">
                                <i class="fas fa-eye me-2"></i>
                                Prévisualisation du formulaire d'évaluation
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fermer"></button>
                        </div>
                        <div class="modal-body p-0">
                            <iframe id="evaluationIframe" style="width: 100%; height: 100%; min-height: 80vh; border: none;"></iframe>
                        </div>
                        <div class="modal-footer border-secondary">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times me-2"></i>Fermer
                            </button>
                            <button type="button" class="btn btn-primary" onclick="window.open('evaluation-form.html?teacher=${encodeURIComponent(teacher)}&subject=${encodeURIComponent(subject)}&level=${encodeURIComponent(level)}&class=${encodeURIComponent(className)}', '_blank')">
                                <i class="fas fa-external-link-alt me-2"></i>Ouvrir dans un nouvel onglet
                            </button>
                        </div>
                    </div>
                </div>
            `;
            
            // Ajouter la modale au document
            document.body.appendChild(modal);
            
            // Initialiser la modale
            const modalInstance = new bootstrap.Modal(modal);
            modalInstance.show();
            
            // Charger le formulaire d'évaluation dans l'iframe
            const iframe = modal.querySelector('#evaluationIframe');
            iframe.onload = function() {
                // Une fois chargé, on peut ajouter des styles ou du contenu supplémentaire si nécessaire
            };
            
            // Charger le formulaire d'évaluation avec les paramètres
            iframe.src = `evaluation-form.html?teacher=${encodeURIComponent(teacher)}&subject=${encodeURIComponent(subject)}&level=${encodeURIComponent(level)}&class=${encodeURIComponent(className)}`;
            
            // Nettoyer la modale lorsqu'elle est fermée
            modal.addEventListener('hidden.bs.modal', function () {
                document.body.removeChild(modal);
            });
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



