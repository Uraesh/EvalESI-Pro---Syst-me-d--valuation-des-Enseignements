
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

// Fonction Alpine.js pour le formulaire d'évaluation
function evaluationForm() {
    return {
        // État initial
        teacherName: 'Chargement...',
        subjectName: 'Chargement...',
        className: 'Chargement...',
        semester: 'Chargement...',
        globalProgress: 0,
        evaluatedCriteria: 0,
        globalScore: 0,
        sectionAverages: Array(7).fill('-'),
        criteria: evaluationCriteria.sections.map(section => section.criteria),
        ratings: {},
        comments: '',
        
        // Options d'évaluation
        ratingOptions: [
            { value: 0, text: 'Jamais' },
            { value: 5, text: 'Rarement' },
            { value: 10, text: 'Souvent' },
            { value: 20, text: 'Toujours' }
        ],

        // Initialisation
        init() {
            this.loadEvaluationData();
            this.initializeRatings();
            console.log('Total critères configurés:', this.getTotalCriteria());
        },

        // Obtenir le nombre total de critères
        getTotalCriteria() {
            return evaluationCriteria.sections.reduce((total, section) => {
                return total + section.criteria.length;
            }, 0);
        },

        // Les liens publics (lien_public dans sessions_evaluation) sont accessibles à tous. Ajoute une vérification côté client pour s'assurer que la session est ouverte :
        async loadEvaluationData() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            try {
                const session = await supabaseClient.getSessionByToken(token);
                this.teacherName = session.enseignements.enseignants.nom + ' ' + session.enseignements.enseignants.prenom;
                this.subjectName = session.enseignements.matieres.libelle;
                this.className = session.enseignements.classes.nom;
            } catch (error) {
                alert('Session invalide ou fermée');
                window.location.href = '/';
            }
        },

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
            if (this.evaluatedCriteria < this.getTotalCriteria()) {
                alert(`Veuillez évaluer tous les critères avant de soumettre le formulaire. (${this.evaluatedCriteria}/${this.getTotalCriteria()} complétés)`);
                return;
            }
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');
                const session = await supabaseClient.getSessionByToken(token);
                const evaluationData = {
                    session_id: session.id,
                    reponses: this.ratings,
                    commentaire: this.comments
                };
                const { success, reponse_id } = await supabaseClient.submitEvaluation(
                    evaluationData.session_id,
                    evaluationData.reponses,
                    evaluationData.commentaire
                );
                if (success) {
                    window.location.href = '/pages/thank-you.html';
                }
            } catch (error) {
                console.error('Erreur lors de la soumission:', error);
                alert('Une erreur est survenue lors de la soumission. Veuillez réessayer.');
            }
        }
    };
}