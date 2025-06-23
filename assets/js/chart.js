// =============================================================================
// CHART.JS - Gestion des visualisations avancées et des graphiques 3D
// =============================================================================

// Import des données fictives
import '../js/mock-data.js';

import Plotly from 'plotly.js';

class ChartManager {
    constructor() {
        this.chartConfigs = {
            defaultTheme: {
                paper_bgcolor: 'rgba(0,0,0,0)',
                plot_bgcolor: 'rgba(0,0,0,0)',
                font: {
                    color: '#ffffff',
                    family: 'Inter, sans-serif'
                },
                margin: {
                    l: 50,
                    r: 50,
                    b: 50,
                    t: 50,
                    pad: 4
                }
            },
            colorPalette: {
                primary: '#0066cc',
                secondary: '#00cc66',
                tertiary: '#cc0066',
                quaternary: '#cc6600',
                success: '#00cc66',
                warning: '#cccc00',
                danger: '#cc0000'
            }
        };
    }

    // =========================================================================
    // MÉTHODES DE CONFIGURATION DES GRAPHIQUES
    // =========================================================================

    /**
     * Crée un graphique 3D de tendances d'évaluation
     * @param {string} elementId - ID de l'élément DOM
     * @param {Object} data - Données du graphique
     */
    create3DTrendChart(elementId, data) {
        const layout = {
            ...this.chartConfigs.defaultTheme,
            scene: {
                xaxis: {
                    title: 'Temps',
                    gridcolor: 'rgba(255,255,255,0.1)',
                    showgrid: true
                },
                yaxis: {
                    title: 'Satisfaction',
                    gridcolor: 'rgba(255,255,255,0.1)',
                    showgrid: true
                },
                zaxis: {
                    title: 'Engagement',
                    gridcolor: 'rgba(255,255,255,0.1)',
                    showgrid: true
                },
                camera: {
                    eye: { x: 1.5, y: 1.5, z: 1.5 }
                }
            },
            margin: {
                l: 0,
                r: 0,
                b: 0,
                t: 0,
                pad: 0
            }
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
            modeBarButtonsToAdd: ['rotate3d', 'resetCameraDefault3d'],
            modeBarButtonsToRemove: ['lasso2d', 'select2d']
        };

        Plotly.newPlot(elementId, data, layout, config);
    }

    /**
     * Crée un graphique de corrélation avec heatmap
     * @param {string} elementId - ID de l'élément DOM
     * @param {Object} data - Données de corrélation
     */
    createCorrelationHeatmap(elementId, data) {
        const layout = {
            ...this.chartConfigs.defaultTheme,
            title: 'Matrice de Corrélation des Critères d\'Évaluation',
            xaxis: {
                title: 'Critères',
                tickangle: -45
            },
            yaxis: {
                title: 'Critères'
            },
            annotations: []
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };

        Plotly.newPlot(elementId, [{
            z: data.correlation,
            x: data.labels,
            y: data.labels,
            type: 'heatmap',
            colorscale: 'RdBu',
            zmin: -1,
            zmax: 1
        }], layout, config);
    }

    /**
     * Crée un graphique de distribution des notes
     * @param {string} elementId - ID de l'élément DOM
     * @param {Object} data - Données de distribution
     */
    createDistributionChart(elementId, data) {
        const layout = {
            ...this.chartConfigs.defaultTheme,
            title: 'Distribution des Notes',
            xaxis: {
                title: 'Notes',
                range: [0, 5]
            },
            yaxis: {
                title: 'Fréquence'
            },
            showlegend: true
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            displaylogo: false
        };

        Plotly.newPlot(elementId, [{
            x: data.values,
            type: 'histogram',
            name: 'Distribution',
            marker: {
                color: this.chartConfigs.colorPalette.primary,
                line: {
                    color: 'white',
                    width: 1
                }
            }
        }], layout, config);
    }

    // =========================================================================
    // MÉTHODES DE MISE À JOUR DES GRAPHIQUES
    // =========================================================================

    /**
     * Met à jour un graphique existant avec de nouvelles données
     * @param {string} elementId - ID de l'élément DOM
     * @param {Object} newData - Nouvelles données
     * @param {Object} newLayout - Nouvelle mise en page (optionnel)
     */
    updateChart(elementId, newData, newLayout = null) {
        Plotly.update(elementId, newData, newLayout);
    }

    /**
     * Ajoute des données à un graphique existant
     * @param {string} elementId - ID de l'élément DOM
     * @param {Object} additionalData - Données supplémentaires
     */
    addDataToChart(elementId, additionalData) {
        Plotly.extendTraces(elementId, additionalData, [0]);
    }

    // =========================================================================
    // MÉTHODES D'INTERACTION
    // =========================================================================

    /**
     * Configure les événements de zoom et de pan
     * @param {string} elementId - ID de l'élément DOM
     */
    setupChartInteractions(elementId) {
        const element = document.getElementById(elementId);
        
        element.on('plotly_relayout', (eventdata) => {
            // Gestion du zoom
            if (eventdata['xaxis.range[0]'] && eventdata['xaxis.range[1]']) {
                this.handleZoom(elementId, eventdata);
            }
        });

        element.on('plotly_click', (data) => {
            // Gestion des clics
            this.handleClick(elementId, data);
        });
    }

    /**
     * Gère le zoom sur un graphique
     * @param {string} elementId - ID de l'élément DOM
     * @param {Object} eventdata - Données de l'événement
     */
    handleZoom(elementId, eventdata) {
        // Implémentation de la logique de zoom
        console.log('Zoom event:', eventdata);
    }

    /**
     * Gère les clics sur un graphique
     * @param {string} elementId - ID de l'élément DOM
     * @param {Object} data - Données du clic
     */
    handleClick(elementId, data) {
        // Implémentation de la logique de clic
        console.log('Click event:', data);
    }
}

// Export de l'instance unique
export const chartManager = new ChartManager(); 