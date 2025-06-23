// =============================================================================
// ML-ENGINE.JS - Moteur d'analyse prédictive et de machine learning
// =============================================================================


import { RandomForestRegression as RandomForest } from 'ml-random-forest';
import { Matrix } from 'ml-matrix';

class MLEngine {
    constructor() {
        this.models = new Map();
        this.trainingData = new Map();
        this.predictionCache = new Map();
        this.modelConfigs = {
            nEstimators: 100,
            maxDepth: 10,
            minSamplesSplit: 2,
            minSamplesLeaf: 1,
            maxFeatures: 'sqrt'
        };
    }

    // =========================================================================
    // MÉTHODES DE PRÉPARATION DES DONNÉES
    // =========================================================================

    /**
     * Prépare les données pour l'entraînement
     * @param {Array} rawData - Données brutes
     * @returns {Object} Données préparées
     */
    prepareTrainingData(rawData) {
        const features = [];
        const labels = [];

        rawData.forEach(record => {
            features.push([
                record.satisfaction,
                record.engagement,
                record.participation,
                record.qualite_enseignement,
                record.charge_travail
            ]);
            labels.push(record.performance);
        });

        return {
            features: new Matrix(features),
            labels: labels
        };
    }

    /**
     * Normalise les données
     * @param {Matrix} data - Données à normaliser
     * @returns {Object} Données normalisées et paramètres de normalisation
     */
    normalizeData(data) {
        const means = data.mean('column');
        const stds = data.standardDeviation('column', { unbiased: true });
        
        const normalized = data.subRowVector(means).divRowVector(stds);
        
        return {
            normalized,
            means,
            stds
        };
    }

    // =========================================================================
    // MÉTHODES D'ENTRAÎNEMENT
    // =========================================================================

    /**
     * Entraîne un modèle pour un type d'évaluation spécifique
     * @param {string} modelType - Type de modèle
     * @param {Array} trainingData - Données d'entraînement
     */
    async trainModel(modelType, trainingData) {
        try {
            const { features, labels } = this.prepareTrainingData(trainingData);
            const { normalized, means, stds } = this.normalizeData(features);

            const model = new RandomForest(this.modelConfigs);
            await model.train(normalized, labels);

            this.models.set(modelType, {
                model,
                normalizationParams: { means, stds }
            });

            this.trainingData.set(modelType, {
                features: normalized,
                labels
            });

            return {
                success: true,
                modelType,
                metrics: this.evaluateModel(modelType)
            };
        } catch (error) {
            console.error(`Erreur lors de l'entraînement du modèle ${modelType}:`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Évalue les performances d'un modèle
     * @param {string} modelType - Type de modèle
     * @returns {Object} Métriques d'évaluation
     */
    evaluateModel(modelType) {
        const modelData = this.trainingData.get(modelType);
        if (!modelData) return null;

        const predictions = this.models.get(modelType).model.predict(modelData.features);
        
        return {
            mse: this.calculateMSE(predictions, modelData.labels),
            r2: this.calculateR2(predictions, modelData.labels)
        };
    }

    // =========================================================================
    // MÉTHODES DE PRÉDICTION
    // =========================================================================

    /**
     * Effectue une prédiction avec le modèle spécifié
     * @param {string} modelType - Type de modèle
     * @param {Object} features - Caractéristiques pour la prédiction
     * @returns {Object} Résultat de la prédiction
     */
    predict(modelType, features) {
        const modelData = this.models.get(modelType);
        if (!modelData) {
            throw new Error(`Modèle ${modelType} non trouvé`);
        }

        const { model, normalizationParams } = modelData;
        const normalizedFeatures = this.normalizeFeatures(features, normalizationParams);
        
        const prediction = model.predict(normalizedFeatures);
        const confidence = this.calculateConfidence(prediction, modelType);

        return {
            prediction,
            confidence,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Normalise les caractéristiques pour la prédiction
     * @param {Array} features - Caractéristiques à normaliser
     * @param {Object} params - Paramètres de normalisation
     * @returns {Matrix} Caractéristiques normalisées
     */
    normalizeFeatures(features, params) {
        const featureMatrix = new Matrix([features]);
        return featureMatrix.subRowVector(params.means).divRowVector(params.stds);
    }

    // =========================================================================
    // MÉTHODES D'ÉVALUATION
    // =========================================================================

    /**
     * Calcule l'erreur quadratique moyenne
     * @param {Array} predictions - Prédictions du modèle
     * @param {Array} actuals - Valeurs réelles
     * @returns {number} MSE
     */
    calculateMSE(predictions, actuals) {
        return predictions.reduce((sum, pred, i) => {
            return sum + Math.pow(pred - actuals[i], 2);
        }, 0) / predictions.length;
    }

    /**
     * Calcule le coefficient de détermination R²
     * @param {Array} predictions - Prédictions du modèle
     * @param {Array} actuals - Valeurs réelles
     * @returns {number} R²
     */
    calculateR2(predictions, actuals) {
        const mean = actuals.reduce((sum, val) => sum + val, 0) / actuals.length;
        const ssTotal = actuals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0);
        const ssResidual = predictions.reduce((sum, pred, i) => {
            return sum + Math.pow(pred - actuals[i], 2);
        }, 0);
        
        return 1 - (ssResidual / ssTotal);
    }

    /**
     * Calcule le niveau de confiance de la prédiction
     * @param {number} prediction - Valeur prédite
     * @param {string} modelType - Type de modèle
     * @returns {number} Niveau de confiance (0-1)
     */
    calculateConfidence(prediction, modelType) {
        const modelData = this.trainingData.get(modelType);
        if (!modelData) return 0;

        const std = Math.sqrt(this.calculateMSE(
            modelData.labels,
            Array(modelData.labels.length).fill(prediction)
        ));

        return Math.max(0, 1 - (std / Math.max(...modelData.labels)));
    }

    // =========================================================================
    // MÉTHODES DE PERSISTANCE
    // =========================================================================

    /**
     * Sauvegarde un modèle entraîné
     * @param {string} modelType - Type de modèle
     * @returns {Object} État du modèle
     */
    async saveModel(modelType) {
        const modelData = this.models.get(modelType);
        if (!modelData) return null;
        const { data, error } = await supabaseClient
            .from('ml_models')
            .insert([{
                model_type: modelType,
                model_data: modelData.model.toJSON(),
                metrics: this.evaluateModel(modelType)
            }])
            .select()
            .single();
        return data;
    }

    /**
     * Charge les modèles existants
     * @param {Object} savedModel - Modèle sauvegardé
     */
    async loadSavedModels() {
        try {
            const { data, error } = await supabaseClient
                .from('ml_models')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            data.forEach(savedModel => {
                this.loadModel({
                    type: savedModel.model_type,
                    model: savedModel.model_data,
                    normalizationParams: savedModel.metrics?.normalizationParams
                });
            });
        } catch (error) {
            console.error('Erreur chargement des modèles:', error);
        }
    }
}

// Export de l'instance unique
export const mlEngine = new MLEngine(); 