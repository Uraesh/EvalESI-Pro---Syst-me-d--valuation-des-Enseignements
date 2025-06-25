
// Configuration des critères d'évaluation
const evaluationCriteria = {
    sections: [
        {
            id: 1,
            title: "Intérêt de l'enseignant pour son cours",
            criteria: [
                { id: 1, text: "Cherche à donner l'envie d'apprendre" },
                { id: 2, text: "Fait preuve d'humour" },
                { id: 3, text: "Utilise différents supports pédagogiques" },
                { id: 4, text: "Lit ses notes ou un document écrit" },
                { id: 5, text: "Suggère des implications pratiques" },
                { id: 6, text: "Montre de l'enthousiasme pour la matière" },
                { id: 7, text: "Stimule la curiosité des étudiants" }
            ]
        },
        {
            id: 2,
            title: "Clarté et organisation du cours",
            criteria: [
                { id: 8, text: "Présente clairement les objectifs du cours" },
                { id: 9, text: "Structure son cours de manière logique" },
                { id: 10, text: "Utilise des exemples concrets" },
                { id: 11, text: "Résume les points importants" },
                { id: 12, text: "Adapte son rythme au niveau de la classe" },
                { id: 13, text: "Fait des transitions claires entre les sujets" },
                { id: 14, text: "Explique les concepts difficiles simplement" }
            ]
        },
        {
            id: 3,
            title: "Interaction avec les étudiants",
            criteria: [
                { id: 15, text: "Encourage les questions" },
                { id: 16, text: "Répond clairement aux questions" },
                { id: 17, text: "Fait participer activement les étudiants" },
                { id: 18, text: "Respecte les différents points de vue" },
                { id: 19, text: "Crée une atmosphère propice aux échanges" },
                { id: 20, text: "Montre de l'empathie envers les difficultés" },
                { id: 21, text: "Favorise la collaboration entre étudiants" }
            ]
        },
        {
            id: 4,
            title: "Évaluation et feedback",
            criteria: [
                { id: 22, text: "Donne des consignes claires pour les travaux" },
                { id: 23, text: "Fournit des retours constructifs" },
                { id: 24, text: "Évalue de manière équitable" },
                { id: 25, text: "Communique clairement les critères d'évaluation" },
                { id: 26, text: "Offre des opportunités d'amélioration" },
                { id: 27, text: "Corrige rapidement les travaux" }
            ]
        },
        {
            id: 5,
            title: "Contenu du cours",
            criteria: [
                { id: 28, text: "Le contenu est à jour" },
                { id: 29, text: "Le contenu est pertinent pour la formation" },
                { id: 30, text: "La difficulté est adaptée au niveau" },
                { id: 31, text: "Les ressources sont suffisantes" },
                { id: 32, text: "Le contenu est bien organisé" },
                { id: 33, text: "Fait des liens avec d'autres matières" }
            ]
        },
        {
            id: 6,
            title: "Compétences techniques",
            criteria: [
                { id: 34, text: "Maîtrise le sujet enseigné" },
                { id: 35, text: "Utilise efficacement les outils pédagogiques" },
                { id: 36, text: "Gère bien le temps de cours" },
                { id: 37, text: "Résout les problèmes techniques" },
                { id: 38, text: "Adapte son enseignement aux besoins" },
                { id: 39, text: "Utilise les nouvelles technologies" }
            ]
        },
        {
            id: 7,
            title: "Environnement d'apprentissage",
            criteria: [
                { id: 40, text: "Le matériel est en bon état" },
                { id: 41, text: "L'environnement est propice à l'apprentissage" },
                { id: 42, text: "Les ressources sont accessibles" },
                { id: 43, text: "La sécurité est assurée" },
                { id: 44, text: "L'ambiance est professionnelle" }
            ]
        }
    ]
};

// Importer getSupabaseClient et initSupabaseClient si ce fichier est utilisé comme un module et a besoin d'initialiser/accéder à Supabase.
// Cependant, pour l'instant, `forms.js` semble définir `evaluationCriteria` et la fonction `evaluationForm`
// qui sera utilisée par `Alpine.data` dans `evaluation-form.html`.
// `supabaseClient` et `isDevMode` sont utilisés mais non définis/importés ici.
// Supposons qu'ils sont globaux ou que `evaluation-form.html` les gère.
// Pour une meilleure modularité, ce fichier devrait aussi importer `getSupabaseClient`.

// Pour l'instant, nous allons nous concentrer sur la logique de prévisualisation.

// Fonction Alpine.js pour le formulaire d'évaluation
function evaluationForm() {
    return {
        // État initial
        teacherName: 'Chargement...',
        subjectName: 'Chargement...',
        className: 'Chargement...', // Pourrait être 'levelName' ou 'className' selon ce qu'on veut afficher
        academicYear: 'Chargement...',
        semester: 'Chargement...',
        isPreviewMode: false, // Nouveau pour gérer le mode prévisualisation
        isLoading: true, // Pour gérer l'état de chargement initial

        globalProgress: 0,
        evaluatedCriteria: 0,
        globalScore: 0,
        sectionAverages: Array(evaluationCriteria.sections.length).fill('-'), // Dynamiser la taille
        criteria: evaluationCriteria.sections.map(section => section.criteria), // Garder cette structure
        ratings: {},
        comments: '',
        
        // Options d'évaluation
        ratingOptions: [
            { value: 0, text: 'Jamais' },
            { value: 5, text: 'Rarement' },
            { value: 10, text: 'Souvent' },
            { value: 20, text: 'Toujours' } // Note: L'échelle de 0 à 20 est inhabituelle, souvent c'est 1-5 ou 1-10.
        ],

        // Initialisation
        async init() {
            this.isLoading = true;
            // `evaluationCriteria` est défini globalement dans ce fichier.
            // `initializeRatings` peut être appelé directement.
            this.initializeRatings();

            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('preview') && urlParams.get('preview') === 'true') {
                this.isPreviewMode = true;
                this.loadPreviewData();
            } else {
                this.isPreviewMode = false;
                // Assumant que `supabaseClient` est disponible globalement ou via une initialisation externe
                // et que `initSupabaseClient` a été appelé.
                // Pour plus de propreté, on devrait l'importer et l'initialiser.
                // Pour l'instant, on se base sur l'existant.
                if (typeof supabaseClient !== 'undefined' && supabaseClient) {
                     await this.loadRealEvaluationData(urlParams.get('token'));
                } else if (typeof getSupabaseClient !== 'undefined') {
                    const supabase = getSupabaseClient();
                    if (supabase) {
                        await this.loadRealEvaluationData(urlParams.get('token'), supabase);
                    } else {
                         console.error("Supabase client non disponible dans evaluationForm.init");
                         this.showError("Erreur de configuration : client de base de données non prêt.");
                    }
                } else {
                    console.error("Supabase client (ou getSupabaseClient) non défini globalement.");
                    this.showError("Erreur critique de configuration de l'application.");
                }
            }
            this.isLoading = false;
            console.log('Total critères configurés:', this.getTotalCriteria());
            console.log('Mode Aperçu:', this.isPreviewMode);
        },

        loadPreviewData() {
            const data = JSON.parse(sessionStorage.getItem('evaluationPreviewData'));
            if (data) {
                this.teacherName = data.teacherName || 'N/A';
                this.subjectName = data.subjectName || 'N/A';
                this.className = data.className || 'N/A'; // ou levelName
                this.academicYear = data.academicYear || 'N/A';
                this.semester = data.semester || 'N/A';
                // Les autres champs comme globalProgress, ratings, etc., restent à leurs valeurs initiales pour un aperçu propre.
            } else {
                this.showError("Données de prévisualisation introuvables. Veuillez réessayer depuis la page de création.");
                // Peut-être rediriger ou afficher un message plus permanent.
            }
            this.isLoading = false;
        },

        // Renommé et adapté pour prendre le client supabase en argument si nécessaire
        async loadRealEvaluationData(token, supabaseInstance) {
            const supabase = supabaseInstance || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
            if (!supabase) {
                this.showError("Client Supabase non configuré pour charger les données réelles.");
                this.isLoading = false;
                return;
            }
             if (!token) {
                this.showError("Token de session manquant pour charger l'évaluation.");
                if (!this.isPreviewMode) window.location.href = '/'; // Rediriger si pas en preview et pas de token
                this.isLoading = false;
                return;
            }

            try {
                // Utiliser la méthode getSessionByToken du client Supabase
                // La gestion isDevMode est dans supabase-client.js
                const session = await supabase.getSessionByToken(token);
                if (!session || !session.enseignements) {
                     throw new Error('Session invalide ou données de session incomplètes.');
                }

                // Vérifier si la session est toujours active (date_fermeture)
                const now = new Date();
                const dateFermeture = new Date(session.date_fermeture);
                if (now > dateFermeture) {
                    this.showError('Cette session d\'évaluation est terminée.');
                    // Optionnel: rediriger ou bloquer le formulaire
                    // Pour l'instant, on affiche juste les infos mais la soumission échouera si on garde la logique.
                    // Idéalement, la page de soumission ne devrait même pas se charger ou le formulaire être désactivé.
                }

                this.teacherName = `${session.enseignements.enseignants.nom} ${session.enseignements.enseignants.prenom}`;
                this.subjectName = session.enseignements.matieres.libelle;
                // Afficher le nom de la classe et le niveau si disponible
                let classeDisplay = session.enseignements.classes.nom;
                if (session.enseignements.classes.niveaux && session.enseignements.classes.niveaux.libelle) {
                    classeDisplay += ` (${session.enseignements.classes.niveaux.libelle})`;
                }
                this.className = classeDisplay;
                this.semester = session.enseignements.semestre || 'Non spécifié';
                // academicYear n'est pas directement dans la session retournée par getSessionByToken,
                // il faudrait l'ajouter à la requête dans supabase-client.js si nécessaire.
                // Pour l'instant, on le laisse vide ou on le récupère autrement si besoin.
                this.academicYear = session.enseignements.annee_academique?.libelle || 'Année non spécifiée';


            } catch (error) {
                console.error("Erreur chargement données d'évaluation réelles:", error);
                this.showError(`Erreur: ${error.message || 'Session invalide ou fermée.'}`);
                if (!this.isPreviewMode) window.location.href = '/'; // Rediriger si erreur critique et pas en preview
            }
        },


        // Obtenir le nombre total de critères
        getTotalCriteria() {
            return evaluationCriteria.sections.reduce((total, section) => {
                return total + section.criteria.length;
            }, 0);
        },

        // Nettoyage des sessions d'évaluation temporaire (si pertinent, sinon à retirer)
        // async cleanupPreviewSessions() {
        //     const supabase = getSupabaseClient();
        //     if (!supabase) return;
        //     await supabase
        //         .from('sessions_evaluation')
        //         .delete()
        //         .eq('is_preview', true) // Assurez-vous que cette colonne existe ou que la logique est adaptée
        //         .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
        // },

        // Initialisation des ratings
        initializeRatings() {
            evaluationCriteria.sections.forEach(section => {
                section.criteria.forEach(criterion => {
                    this.ratings[criterion.id] = null;
                });
            });
        },

        // Mise à jour d'une note
        updateRating(criterionId, value) {
            this.ratings[criterionId] = parseInt(value);
            this.updateStatistics();
        },

        // Mise à jour des statistiques en temps réel
        updateStatistics() {
            const totalCriteria = this.getTotalCriteria();
            
            // Calcul du nombre de critères évalués
            this.evaluatedCriteria = Object.values(this.ratings).filter(rating => rating !== null).length;
            
            // Calcul de la progression globale
            this.globalProgress = Math.round((this.evaluatedCriteria / totalCriteria) * 100);
            
            // Calcul des moyennes par section
            this.sectionAverages = evaluationCriteria.sections.map((section, sectionIndex) => {
                const sectionRatings = section.criteria
                    .map(criterion => this.ratings[criterion.id])
                    .filter(rating => rating !== null && rating !== undefined);
                
                if (sectionRatings.length === 0) return '-';
                
                const sum = sectionRatings.reduce((acc, val) => acc + val, 0);
                const average = sum / sectionRatings.length;
                return Math.round(average * 10) / 10;
            });
            
            // Calcul du score global
            const validRatings = Object.values(this.ratings).filter(rating => rating !== null && rating !== undefined);
            if (validRatings.length > 0) {
                const sum = validRatings.reduce((acc, val) => acc + val, 0);
                this.globalScore = Math.round((sum / validRatings.length) * 10) / 10;
            } else {
                this.globalScore = 0;
            }

            // Log pour débogage
            console.log('Statistiques mises à jour:', {
                evaluatedCriteria: this.evaluatedCriteria,
                totalCriteria: totalCriteria,
                globalProgress: this.globalProgress,
                globalScore: this.globalScore,
                sectionAverages: this.sectionAverages
            });
        },

        // Vérifier si une section est complète
        isSectionComplete(sectionIndex) {
            const section = evaluationCriteria.sections[sectionIndex];
            return section.criteria.every(criterion => 
                this.ratings[criterion.id] !== null && this.ratings[criterion.id] !== undefined
            );
        },

        // Obtenir le pourcentage de completion d'une section
        getSectionProgress(sectionIndex) {
            const section = evaluationCriteria.sections[sectionIndex];
            const completed = section.criteria.filter(criterion => 
                this.ratings[criterion.id] !== null && this.ratings[criterion.id] !== undefined
            ).length;
            return Math.round((completed / section.criteria.length) * 100);
        },

        // Soumission du formulaire
        async submitEvaluation() {
            if (this.isPreviewMode) {
                Swal.fire({
                    icon: 'info',
                    title: 'Mode Prévisualisation',
                    text: 'Ceci est un aperçu. Les réponses ne seront pas soumises.',
                    confirmButtonColor: '#0066cc'
                });
                return;
            }

            if (this.evaluatedCriteria < this.getTotalCriteria()) {
                // Remplacer alert par Swal pour la cohérence
                Swal.fire({
                    icon: 'warning',
                    title: 'Formulaire Incomplet',
                    text: `Veuillez évaluer tous les critères avant de soumettre. (${this.evaluatedCriteria}/${this.getTotalCriteria()} complétés)`,
                    confirmButtonColor: '#0066cc'
                });
                return;
            }

            this.isLoading = true; // Indiquer le chargement pendant la soumission
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');

                // Récupérer l'instance supabase client
                const supabase = getSupabaseClient();
                if (!supabase) {
                    this.showError("Client Supabase non disponible pour la soumission.");
                    this.isLoading = false;
                    return;
                }

                // Pas besoin de re-récupérer la session ici si session.id est déjà stocké,
                // mais getSessionByToken pourrait revalider le token, ce qui est bien.
                // Cependant, submitEvaluation dans supabase-client.js prend déjà session_id.
                // Nous avons besoin du session_id. Si nous ne l'avons pas stocké, nous devons le récupérer.
                // Pour l'instant, on suppose que `getSessionByToken` est nécessaire pour obtenir `session.id` si on ne l'a pas.
                // Ou mieux, `submitEvaluation` devrait juste prendre le token et gérer la recherche de session_id.
                // Pour l'instant, on va chercher la session pour avoir son ID.
                const session = await supabase.getSessionByToken(token);
                if (!session) {
                    this.showError("Session d'évaluation non trouvée ou invalide pour la soumission.");
                    this.isLoading = false;
                    return;
                }

                const evaluationData = {
                    session_id: session.id, // ID de la session d'évaluation
                    reponses: this.ratings,
                    commentaire: this.comments.trim()
                };

                // La méthode submitEvaluation de supabase-client.js gère la logique d'insertion
                const { success, reponse_id, error } = await supabase.submitEvaluation(
                    evaluationData.session_id,
                    evaluationData.reponses,
                    evaluationData.commentaire
                    // fingerprint peut être ajouté ici si implémenté
                );

                if (success) {
                    // Redirection vers une page de remerciement
                    window.location.href = '/pages/thank-you.html';
                } else {
                    throw error || new Error("La soumission de l'évaluation a échoué.");
                }
            } catch (error) {
                console.error('Erreur lors de la soumission:', error);
                this.showError(`Erreur de soumission: ${error.message || 'Veuillez réessayer.'}`);
            } finally {
                this.isLoading = false;
            }
        },

        // La méthode previewEvaluation n'a pas sa place ici, elle est pour create-evaluation.js
        // async previewEvaluation() {
        //     const errors = [];
        //     if (!this.selectedTeacher) errors.push('Enseignant requis');
        // ...
        // }

        // Ajouter une méthode showError si elle n'est pas déjà globale ou héritée
        showError(message) {
            console.error("EvaluationForm Error:", message);
            Swal.fire({
                icon: 'error',
                title: 'Erreur',
                text: message,
                confirmButtonColor: '#0066cc'
            });
        }
    };
}
            if (!this.selectedSubject) errors.push('Matière requise');
            if (!this.selectedClass) errors.push('Classe requise');
            if (!this.selectedAcademicYear) errors.push('Année académique requise');
            if (!this.selectedSemestre) errors.push('Semestre requis');
            if (!this.title) errors.push('Titre requis');
            if (errors.length) {
                this.showError(errors.join(', '));
                return;
            }
            // Reste du code...
        }
    };
}