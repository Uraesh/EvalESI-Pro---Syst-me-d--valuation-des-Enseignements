// =============================================================================
// ANALYTICS.JS - Gestion des interactions et de l'analyse avancée
// =============================================================================

import { supabaseClient } from './supabase-client.js';
import { chartManager } from './chart.js';
import { mlEngine } from './ml-engine.js';
import Swal from 'sweetalert2';
 

// Configuration Alpine.js
document.addEventListener('alpine:init', () => {
    Alpine.data('analytics', () => ({
        // =========================================================================
        // ÉTAT DE L'APPLICATION
        // =========================================================================
        isLoading: false,
        isSidebarCollapsed: false,
        currentSection: 'trends',
        correlationPeriod: '30d',
        modelMetrics: {
            r2: 0,
            mse: 0,
            confidence: 0
        },
        predictionInputs: {
            satisfaction: 3,
            engagement: 3,
            participation: 3
        },
        predictionResult: null,

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
                await this.loadInitialData();
                this.setupEventListeners();
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

        /**
         * Charge les données initiales
         */
        async loadInitialData() {
            await Promise.all([
                this.loadTrendsData(),
                this.loadCorrelationData(),
                this.loadDistributionData()
            ]);
        },

        // =========================================================================
        // MÉTHODES DE CHARGEMENT DES DONNÉES
        // =========================================================================

        /**
         * Charge les données de tendances
         */
        async loadTrendsData() {
            try {
                const { data, error } = await supabaseClient
                    .from('sessions_evaluation')
                    .select('*')
                    .order('date_evaluation', { ascending: true });

                if (error) throw error;

                const trendData = this.prepareTrendData(data);
                chartManager.create3DTrendChart('trends3DChart', trendData);
            } catch (error) {
                console.error('Erreur de chargement des tendances:', error);
                this.showError('Erreur lors du chargement des tendances');
            }
        },

        /**
         * Charge les données de corrélation
         */
        async loadCorrelationData() {
            try {
                const { data, error } = await supabaseClient.rpc('calculate_correlations');
                if (error) throw error;
                const correlationData = this.prepareCorrelationData(data);
                chartManager.createCorrelationHeatmap('correlationHeatmap', correlationData);
            } catch (error) {
                this.showError('Erreur lors du chargement des corrélations');
            }
        },

        /**
         * Charge les données de distribution
         */
        async loadDistributionData() {
            try {
                const { data, error } = await supabaseClient
                    .from('sessions_evaluation')
                    .select('note_finale');

                if (error) throw error;

                const distributionData = this.prepareDistributionData(data);
                chartManager.createDistributionChart('distributionChart', distributionData);
            } catch (error) {
                console.error('Erreur de chargement de la distribution:', error);
                this.showError('Erreur lors du chargement de la distribution');
            }
        },

        // =========================================================================
        // MÉTHODES DE PRÉPARATION DES DONNÉES
        // =========================================================================

        /**
         * Prépare les données pour le graphique 3D
         */
        prepareTrendData(data) {
            return [{
                type: 'scatter3d',
                mode: 'lines+markers',
                x: data.map(d => new Date(d.date_evaluation)),
                y: data.map(d => d.satisfaction),
                z: data.map(d => d.engagement),
                marker: {
                    size: 5,
                    color: data.map(d => d.note_finale),
                    colorscale: 'Viridis'
                }
            }];
        },

        /**
         * Prépare les données de corrélation
         */
        prepareCorrelationData(data) {
            const metrics = ['satisfaction', 'engagement', 'participation', 'qualite_enseignement', 'charge_travail'];
            const correlation = metrics.map(m1 => 
                metrics.map(m2 => this.calculateCorrelation(data, m1, m2))
            );

            return {
                correlation,
                labels: metrics.map(m => this.formatMetricName(m))
            };
        },

        /**
         * Prépare les données de distribution
         */
        prepareDistributionData(data) {
            return {
                values: data.map(d => d.note_finale)
            };
        },

        // =========================================================================
        // MÉTHODES D'ANALYSE
        // =========================================================================

        /**
         * Calcule la corrélation entre deux métriques
         */
        calculateCorrelation(data, metric1, metric2) {
            const values1 = data.map(d => d[metric1]);
            const values2 = data.map(d => d[metric2]);
            
            const mean1 = values1.reduce((a, b) => a + b, 0) / values1.length;
            const mean2 = values2.reduce((a, b) => a + b, 0) / values2.length;
            
            const variance1 = values1.reduce((a, b) => a + Math.pow(b - mean1, 2), 0);
            const variance2 = values2.reduce((a, b) => a + Math.pow(b - mean2, 2), 0);
            
            const covariance = values1.reduce((a, b, i) => 
                a + (b - mean1) * (values2[i] - mean2), 0);
            
            return covariance / Math.sqrt(variance1 * variance2);
        },

        /**
         * Entraîne le modèle d'IA
         */
        async trainModel() {
            try {
                this.isLoading = true;
                const { data, error } = await supabaseClient
                    .from('sessions_evaluation')
                    .select('*')
                    .order('date_evaluation', { ascending: false })
                    .limit(1000);

                if (error) throw error;

                const result = await mlEngine.trainModel('evaluation', data);
                if (result.success) {
                    this.modelMetrics = result.metrics;
                    this.showSuccess('Modèle entraîné avec succès');
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Erreur d\'entraînement:', error);
                this.showError('Erreur lors de l\'entraînement du modèle');
            } finally {
                this.isLoading = false;
            }
        },

        /**
         * Effectue une prédiction
         */
        async makePrediction() {
            try {
                const features = [
                    this.predictionInputs.satisfaction,
                    this.predictionInputs.engagement,
                    this.predictionInputs.participation
                ];

                const result = mlEngine.predict('evaluation', features);
                this.predictionResult = result;
            } catch (error) {
                console.error('Erreur de prédiction:', error);
                this.showError('Erreur lors de la prédiction');
            }
        },

        // =========================================================================
        // MÉTHODES D'INTERFACE
        // =========================================================================

        /**
         * Affiche une section
         */
        showSection(section) {
            this.currentSection = section;
        },

        /**
         * Actualise les tendances
         */
        async refreshTrends() {
            await this.loadTrendsData();
        },

        /**
         * Exporte les données de distribution
         */
        exportDistribution() {
            // Implémentation de l'export
            console.log('Export des données de distribution');
        },

        /**
         * Configure les écouteurs d'événements
         */
        setupEventListeners() {
            // Écouteur pour le changement de période
            this.$watch('correlationPeriod', async (newValue) => {
                await this.loadCorrelationData();
            });

            // Écouteur pour les prédictions
            this.$watch('predictionInputs', async () => {
                await this.makePrediction();
            });

            supabaseClient
                    .channel('reponses_evaluation')
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reponses_evaluation' }, async () => {
                        await analytics.loadTrendsData();
                        await analytics.loadCorrelationData();
                        await analytics.loadDistributionData();
                    })
                    .subscribe();
        },

        // =========================================================================
        // MÉTHODES UTILITAIRES
        // =========================================================================

        /**
         * Formate le nom d'une métrique
         */
        formatMetricName(metric) {
            return metric
                .split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
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
            setTimeout(() => errorDiv.remove(), 5000); // Supprime après 5 secondes
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
    return analytics;
}); 