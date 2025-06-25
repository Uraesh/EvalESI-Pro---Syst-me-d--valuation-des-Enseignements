// =============================================================================
// DASHBOARD.JS - Gestion des interactions du tableau de bord administrateur
// =============================================================================

import { initSupabaseClient, getSupabaseClient } from './supabase-client.js';
import '../js/mock-data.js';
import Swal from 'sweetalert2';

// Configuration Alpine.js pour la réactivité
document.addEventListener('alpine:init', async () => {
    const supabaseClient = await initSupabaseClient();
    Alpine.data('dashboard', () => ({
                       
        stats: {
            totalEvaluations: 0,
            responseRate: 0,
            satisfaction: 0
        },
        recentActivity: [],
        selectedPeriod: '7d',
        
        // Initialisation
        async init() {
            await this.loadDashboardData();
            await this.loadRecentActivity();
            this.initializeCharts();
            this.setupEventListeners();
            supabaseClient
                .channel('statistiques_enseignants')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'statistiques_enseignants' }, () => {
                    this.loadDashboardData();
                })
                .subscribe();
        },

        // Chargement des données. Utilise la méthode executeWithRetry de supabase-client.js pour réessayer les requêtes échouées
        lastUpdate: '--:--',
        updateLastUpdate() {
            const now = new Date();
            this.lastUpdate = now.toLocaleTimeString();
        },
        async loadDashboardData() {
            try {
                this.isLoading = true;
                const user = await supabaseClient.getCurrentUser();
                if (!user || !(await supabaseClient.checkAdminRights(user.id))) {
                    this.showError('Accès non autorisé');
                    window.location.href = '/index.html';
                    return;
                }

                // Récupérer les statistiques agrégées
                const { data: stats, error: statsError } = await supabaseClient
                    .from('sessions_evaluation')
                    .select(`
                        id,
                        nb_reponses,
                        nb_vues,
                        questions:questions_repenses(
                            note
                        )
                    `);

                if (statsError) throw statsError;

                // Calculer les statistiques
                const totalSessions = stats.length;
                const totalReponses = stats.reduce((sum, session) => sum + (session.nb_reponses || 0), 0);
                const totalVues = stats.reduce((sum, session) => sum + (session.nb_vues || 0), 0);
                const totalNotes = stats.flatMap(session => 
                    session.questions?.map(q => q.note) || []
                );
                const moyenneSatisfaction = totalNotes.length > 0 
                    ? (totalNotes.reduce((a, b) => a + b, 0) / totalNotes.length).toFixed(1)
                    : 0;

                this.stats = {
                    totalEvaluations: totalSessions,
                    responseRate: totalVues > 0 ? Math.round((totalReponses / totalVues) * 100) : 0,
                    satisfaction: moyenneSatisfaction
                };

                this.updateLastUpdate();
            } catch (error) {
                console.error('Erreur détaillée:', error);
                this.showError('Erreur lors du chargement des données du tableau de bord');
            } finally {
                this.isLoading = false;
            }
        },

        async loadRecentActivity() {
            try {
                const { data, error } = await supabaseClient
                    .from('sessions_evaluation')
                    .select(`
                        id,
                        titre,
                        date_ouverture,
                        date_fermeture,
                        is_active,
                        created_at,
                        nb_reponses,
                        nb_vues,
                        enseignements (
                            id,
                            enseignant:enseignants (
                                id,
                                nom,
                                prenom
                            ),
                            matiere:matieres (
                                id,
                                libelle
                            ),
                            classe:classes (
                                id,
                                nom
                            )
                        )
                    `)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (error) throw error;

                this.recentActivity = data.map(item => ({
                    id: item.id,
                    titre: item.titre,
                    date: new Date(item.created_at).toLocaleDateString('fr-FR'),
                    enseignant: item.enseignements?.enseignant 
                        ? `${item.enseignements.enseignant.nom} ${item.enseignements.enseignant.prenom}`
                        : 'Non défini',
                    matiere: item.enseignements?.matiere?.libelle || 'Non définie',
                    classe: item.enseignements?.classe?.nom || 'Non définie',
                    statut: this.getSessionStatus(item),
                    reponses: item.nb_reponses || 0,
                    vues: item.nb_vues || 0
                }));
            } catch (error) {
                console.error('Erreur détaillée:', error);
                this.showError('Erreur lors du chargement de l\'activité récente');
            }
        },

        /**
         * Détermine le statut d'une session
         */
        getSessionStatus(session) {
            const now = new Date();
            const dateOuverture = new Date(session.date_ouverture);
            const dateFermeture = new Date(session.date_fermeture);
            
            if (!session.is_active) return 'Fermée';
            if (now < dateOuverture) return 'Planifiée';
            if (now > dateFermeture) return 'Terminée';
            return 'En cours';
        },

        // Initialisation des graphiques
        async initializeCharts() {
            try {
                // Récupérer les statistiques des 30 derniers jours
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                
                const { data, error } = await supabaseClient
                    .from('sessions_evaluation')
                    .select(`
                        created_at,
                        nb_reponses,
                        nb_vues,
                        questions:questions_repenses(
                            note
                        )
                    `)
                    .gte('created_at', thirtyDaysAgo.toISOString())
                    .order('created_at', { ascending: true });
                if (error) throw error;
                const chartData = {
                    x: data.map(d => d.created_at),
                    y: data.map(d => d.nb_reponses),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: 'Évaluations',
                    line: { color: '#0066cc', width: 2 },
                    marker: { size: 6, color: '#0066cc' }
                };
                const layout = {
                    title: 'Évolution des évaluations',
                    paper_bgcolor: 'rgba(0,0,0,0)',
                    plot_bgcolor: 'rgba(0,0,0,0)',
                    font: { color: '#ffffff' },
                    xaxis: { title: 'Date', gridcolor: 'rgba(255,255,255,0.1)' },
                    yaxis: { title: 'Nombre d\'évaluations', gridcolor: 'rgba(255,255,255,0.1)' }
                };
                Plotly.newPlot('evaluationChart', [chartData], layout);
            } catch (error) {
                this.showError('Erreur lors de l\'initialisation du graphique');
            }
        },


        async updateFilters() {
            const type = document.querySelector('[name="dataType"]').value;
            const granularity = document.querySelector('[name="granularity"]').value;
            try {
                const { data, error } = await supabaseClient
                    .from('statistiques_enseignants')
                    .select(`date, ${type}`)
                    .gte('date', this.getDateFromPeriod(this.selectedPeriod))
                    .order('date', { ascending: true });
                if (error) throw error;
                const chartData = {
                    x: data.map(d => d.date),
                    y: data.map(d => d[type]),
                    type: 'scatter',
                    mode: 'lines+markers',
                    name: type === 'nombre_evaluations' ? 'Évaluations' : type === 'score_moyen' ? 'Satisfaction' : 'Participation'
                };
                Plotly.update('evaluationChart', chartData);
            } catch (error) {
                this.showError('Erreur lors de la mise à jour des filtres');
            }
        },

        // Gestion des événements
        setupEventListeners() {
            document.querySelectorAll('.chart-period').forEach(button => {
                button.addEventListener('click', async (e) => {
                    const period = e.target.dataset.period;
                    this.selectedPeriod = period;
                    await this.updateChartPeriod(period);
                    document.querySelectorAll('.chart-period').forEach(btn => btn.classList.remove('active'));
                    e.target.classList.add('active');
                });
            });
            document.querySelector('[name="dataType"]').addEventListener('change', () => this.updateFilters());
            document.querySelector('[name="granularity"]').addEventListener('change', () => this.updateFilters());
            document.querySelector('.sidebar-toggle').addEventListener('click', () => {
                document.querySelector('.sidebar').classList.toggle('collapsed');
            });
        },

        // Mise à jour de la période du graphique
        async updateChartPeriod(period) {
            try {
                const { data, error } = await supabaseClient
                    .from('statistiques_enseignants')
                    .select('date, nombre_evaluations')
                    .gte('date', this.getDateFromPeriod(period))
                    .order('date', { ascending: true });

                if (error) throw error;

                const chartData = {
                    x: data.map(d => d.date),
                    y: data.map(d => d.nombre_evaluations)
                };

                Plotly.update('evaluationChart', chartData);
            } catch (error) {
                console.error('Erreur lors de la mise à jour du graphique:', error);
                this.showError('Erreur lors de la mise à jour du graphique');
            }
        },

        // Utilitaires
        getDateFromPeriod(period) {
            const date = new Date();
            switch (period) {
                case '7d':
                    date.setDate(date.getDate() - 7);
                    break;
                case '30d':
                    date.setDate(date.getDate() - 30);
                    break;
                case '90d':
                    date.setDate(date.getDate() - 90);
                    break;
                default:
                    date.setDate(date.getDate() - 7);
            }
            return date.toISOString();
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
            setTimeout(() => errorDiv.remove(), 5000); // Supprime après 5 secondes
        }
    }));
     
});

// Initialisation du dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Vérification de l'authentification
    getSupabaseClient().auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            window.location.href = '/index.html';
        }
    });

    // Initialisation d'Alpine.js
    window.Alpine.start();
    
}); 