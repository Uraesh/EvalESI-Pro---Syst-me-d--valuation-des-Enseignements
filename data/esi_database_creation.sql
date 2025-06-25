-- =============================================================================
-- SCRIPT DE CRÉATION DE LA BASE DE DONNÉES POSTGRESQL
-- Système d'Évaluation des Enseignements ESI
-- Version : 1.0
-- Compatible : PostgreSQL 12+
-- =============================================================================

-- Création de la base de données (à exécuter en tant que superutilisateur)
-- CREATE DATABASE esi_evaluation_db
--     WITH 
--     OWNER = postgres
--     ENCODING = 'UTF8'
--     LC_COLLATE = 'fr_FR.UTF-8'
--     LC_CTYPE = 'fr_FR.UTF-8'
--     TABLESPACE = pg_default
--     CONNECTION LIMIT = -1;

-- Se connecter à la base de données esi_evaluation_db avant d'exécuter le reste

-- =============================================================================
-- EXTENSIONS NÉCESSAIRES
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- SCHÉMA ET TYPES PERSONNALISÉS
-- =============================================================================

-- Enum pour les semestres
CREATE TYPE semestre_enum AS ENUM ('S1', 'S2');

-- Enum pour l'échelle d'évaluation
CREATE TYPE echelle_evaluation AS ENUM ('0', '5', '10', '20');

-- Enum pour les types de prix
CREATE TYPE type_prix_enum AS ENUM ('GLOBAL', 'NIVEAU', 'FILIERE', 'CLASSE');

-- Enum pour les actions d'audit
CREATE TYPE action_audit_enum AS ENUM (
    'CREATE_SESSION', 'SUBMIT_EVALUATION', 'CLOSE_SESSION', 
    'CALCULATE_STATS', 'AWARD_PRIZE', 'LOGIN', 'LOGOUT'
);

-- =============================================================================
-- GESTION DES UTILISATEURS ET AUTHENTIFICATION
-- =============================================================================

CREATE TABLE auth_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) NOT NULL UNIQUE,
    email VARCHAR(254) NOT NULL UNIQUE,
    password VARCHAR(128) NOT NULL,
    first_name VARCHAR(150) NOT NULL DEFAULT '',
    last_name VARCHAR(150) NOT NULL DEFAULT '',
    is_staff BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_superuser BOOLEAN NOT NULL DEFAULT FALSE,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index sur email pour les recherches
CREATE INDEX idx_auth_users_email ON auth_users(email);
CREATE INDEX idx_auth_users_username ON auth_users(username);

-- =============================================================================
-- GESTION TEMPORELLE ET ACADÉMIQUE
-- =============================================================================

CREATE TABLE annees_academiques (
    id SERIAL PRIMARY KEY,
    libelle VARCHAR(20) NOT NULL UNIQUE,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT chk_dates_annee CHECK (date_fin > date_debut),
    CONSTRAINT chk_libelle_format CHECK (libelle ~ '^\d{4}-\d{4}$')
);

-- Index pour recherches par période
CREATE INDEX idx_annees_academiques_dates ON annees_academiques(date_debut, date_fin);
CREATE INDEX idx_annees_academiques_active ON annees_academiques(is_active);

-- Trigger pour s'assurer qu'une seule année est active
CREATE OR REPLACE FUNCTION ensure_single_active_year()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = TRUE THEN
        UPDATE annees_academiques 
        SET is_active = FALSE 
        WHERE id != NEW.id AND is_active = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_single_active_year
    BEFORE INSERT OR UPDATE ON annees_academiques
    FOR EACH ROW
    WHEN (NEW.is_active = TRUE)
    EXECUTE FUNCTION ensure_single_active_year();

-- =============================================================================
-- ENTITÉS PRINCIPALES ACADÉMIQUES
-- =============================================================================

CREATE TABLE enseignants (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    telephone VARCHAR(20),
    specialite VARCHAR(200),
    date_embauche DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherches
CREATE INDEX idx_enseignants_nom ON enseignants(nom, prenom);
CREATE INDEX idx_enseignants_email ON enseignants(email);
CREATE INDEX idx_enseignants_active ON enseignants(is_active);

CREATE TABLE niveaux (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    libelle VARCHAR(50) NOT NULL,
    ordre INTEGER NOT NULL DEFAULT 0
);

-- Index pour ordonner les niveaux
CREATE INDEX idx_niveaux_ordre ON niveaux(ordre);

CREATE TABLE filieres (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    libelle VARCHAR(100) NOT NULL,
    description TEXT
);

-- Index pour recherches
CREATE INDEX idx_filieres_libelle ON filieres(libelle);

CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(50) NOT NULL,
    niveau_id INTEGER NOT NULL REFERENCES niveaux(id) ON DELETE RESTRICT,
    filiere_id INTEGER NOT NULL REFERENCES filieres(id) ON DELETE RESTRICT,
    effectif_theorique INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT chk_effectif_positif CHECK (effectif_theorique >= 0),
    CONSTRAINT uk_classe_unique UNIQUE (nom, niveau_id, filiere_id)
);

-- Index pour recherches
CREATE INDEX idx_classes_niveau_filiere ON classes(niveau_id, filiere_id);
CREATE INDEX idx_classes_active ON classes(is_active);

-- =============================================================================
-- GESTION DES ENSEIGNEMENTS
-- =============================================================================

CREATE TABLE matieres (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    libelle VARCHAR(200) NOT NULL,
    description TEXT,
    credit_ects INTEGER NOT NULL DEFAULT 0,
    
    -- Contraintes
    CONSTRAINT chk_credits_positifs CHECK (credit_ects >= 0)
);

-- Index pour recherches
CREATE INDEX idx_matieres_libelle ON matieres(libelle);

CREATE TABLE enseignements (
    id SERIAL PRIMARY KEY,
    enseignant_id INTEGER NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
    classe_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    matiere_id INTEGER NOT NULL REFERENCES matieres(id) ON DELETE CASCADE,
    annee_academique_id INTEGER NOT NULL REFERENCES annees_academiques(id) ON DELETE CASCADE,
    volume_horaire INTEGER NOT NULL DEFAULT 0,
    semestre semestre_enum NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Contraintes
    CONSTRAINT chk_dates_enseignement CHECK (date_fin > date_debut),
    CONSTRAINT chk_volume_horaire_positif CHECK (volume_horaire >= 0),
    CONSTRAINT uk_enseignement_unique UNIQUE (enseignant_id, classe_id, matiere_id, annee_academique_id, semestre)
);

-- Index pour recherches
CREATE INDEX idx_enseignements_enseignant ON enseignements(enseignant_id);
CREATE INDEX idx_enseignements_classe ON enseignements(classe_id);
CREATE INDEX idx_enseignements_annee ON enseignements(annee_academique_id);
CREATE INDEX idx_enseignements_active ON enseignements(is_active);

-- =============================================================================
-- SYSTÈME D'ÉVALUATION - FORMULAIRES ET CRITÈRES
-- =============================================================================

CREATE TABLE sections_evaluation (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    libelle VARCHAR(200) NOT NULL,
    description TEXT,
    ordre INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Index pour l'ordre d'affichage
CREATE INDEX idx_sections_evaluation_ordre ON sections_evaluation(ordre);

CREATE TABLE criteres_evaluation (
    id SERIAL PRIMARY KEY,
    section_id INTEGER NOT NULL REFERENCES sections_evaluation(id) ON DELETE CASCADE,
    libelle VARCHAR(300) NOT NULL,
    ordre INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Contrainte d'unicité pour l'ordre dans une section
    CONSTRAINT uk_critere_ordre_section UNIQUE (section_id, ordre)
);

-- Index pour l'ordre d'affichage
CREATE INDEX idx_criteres_evaluation_section_ordre ON criteres_evaluation(section_id, ordre);

-- =============================================================================
-- SESSIONS ET COLLECTE D'ÉVALUATIONS
-- =============================================================================

CREATE TABLE sessions_evaluation (
    id SERIAL PRIMARY KEY,
    enseignement_id INTEGER NOT NULL REFERENCES enseignements(id) ON DELETE CASCADE,
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    token UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
    lien_public VARCHAR(500),
    date_ouverture TIMESTAMPTZ NOT NULL,
    date_fermeture TIMESTAMPTZ NOT NULL,
    created_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- MODIFIED: Changed to UUID and references auth.users
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    nb_reponses INTEGER NOT NULL DEFAULT 0,
    nb_vues INTEGER NOT NULL DEFAULT 0,
    
    -- Contraintes
    CONSTRAINT chk_dates_session CHECK (date_fermeture > date_ouverture),
    CONSTRAINT chk_nb_reponses_positif CHECK (nb_reponses >= 0),
    CONSTRAINT chk_nb_vues_positif CHECK (nb_vues >= 0)
);

-- Index pour recherches et performances
CREATE INDEX idx_sessions_evaluation_enseignement ON sessions_evaluation(enseignement_id);
CREATE INDEX idx_sessions_evaluation_token ON sessions_evaluation(token);
CREATE INDEX idx_sessions_evaluation_dates ON sessions_evaluation(date_ouverture, date_fermeture);
CREATE INDEX idx_sessions_evaluation_created_by ON sessions_evaluation(created_by_id);

-- =============================================================================
-- COLLECTE ET STOCKAGE DES RÉPONSES
-- =============================================================================

CREATE TABLE reponses_evaluation (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions_evaluation(id) ON DELETE CASCADE,
    ip_hash VARCHAR(64) NOT NULL,
    user_agent_hash VARCHAR(64) NOT NULL,
    fingerprint_hash VARCHAR(64),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completion_time INTEGER NOT NULL DEFAULT 0,
    score_total NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    score_global NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    commentaire TEXT,
    is_valid BOOLEAN NOT NULL DEFAULT TRUE,
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Contraintes
    CONSTRAINT chk_completion_time_positif CHECK (completion_time >= 0),
    CONSTRAINT chk_score_total_valide CHECK (score_total >= 0),
    CONSTRAINT chk_score_global_valide CHECK (score_global BETWEEN 0 AND 100),
    CONSTRAINT uk_reponse_session_ip UNIQUE (session_id, ip_hash)
);

-- Index pour recherches
CREATE INDEX idx_reponses_evaluation_session ON reponses_evaluation(session_id);
CREATE INDEX idx_reponses_evaluation_submitted_at ON reponses_evaluation(submitted_at);

CREATE TABLE reponses_details (
    id SERIAL PRIMARY KEY,
    reponse_id INTEGER NOT NULL REFERENCES reponses_evaluation(id) ON DELETE CASCADE,
    critere_id INTEGER NOT NULL REFERENCES criteres_evaluation(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    
    -- Contraintes
    CONSTRAINT chk_score_valide CHECK (score IN (0, 5, 10, 20)),
    CONSTRAINT uk_reponse_critere UNIQUE (reponse_id, critere_id)
);

-- Index pour recherches et jointures
CREATE INDEX idx_reponses_details_reponse ON reponses_details(reponse_id);
CREATE INDEX idx_reponses_details_critere ON reponses_details(critere_id);

-- =============================================================================
-- ANALYTIQUES ET STATISTIQUES
-- =============================================================================

CREATE TABLE statistiques_enseignants (
    id SERIAL PRIMARY KEY,
    enseignant_id INTEGER NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
    annee_academique_id INTEGER NOT NULL REFERENCES annees_academiques(id) ON DELETE CASCADE,
    score_global_moyen NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    score_total_moyen NUMERIC(6,2) NOT NULL DEFAULT 0.0,
    nb_evaluations INTEGER NOT NULL DEFAULT 0,
    nb_reponses_total INTEGER NOT NULL DEFAULT 0,
    score_interet NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    score_clarte NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    score_relations NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    score_organisation NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    score_participation NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    score_explications NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    score_attitude NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    rang_global INTEGER,
    rang_niveau INTEGER,
    rang_filiere INTEGER,
    derniere_maj TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_eligible_prix BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Contraintes
    CONSTRAINT chk_scores_valides CHECK (
        score_global_moyen BETWEEN 0 AND 100 AND
        score_interet BETWEEN 0 AND 100 AND
        score_clarte BETWEEN 0 AND 100 AND
        score_relations BETWEEN 0 AND 100 AND
        score_organisation BETWEEN 0 AND 100 AND
        score_participation BETWEEN 0 AND 100 AND
        score_explications BETWEEN 0 AND 100 AND
        score_attitude BETWEEN 0 AND 100
    ),
    CONSTRAINT chk_nb_evaluations_positif CHECK (nb_evaluations >= 0),
    CONSTRAINT chk_nb_reponses_positif CHECK (nb_reponses_total >= 0),
    CONSTRAINT uk_statistique_enseignant_annee UNIQUE (enseignant_id, annee_academique_id)
);

-- Index pour recherches et classements
CREATE INDEX idx_statistiques_enseignants_enseignant ON statistiques_enseignants(enseignant_id);
CREATE INDEX idx_statistiques_enseignants_annee ON statistiques_enseignants(annee_academique_id);
CREATE INDEX idx_statistiques_score_global ON statistiques_enseignants(score_global_moyen DESC);

-- Nouvelle table pour normaliser les scores par section
CREATE TABLE scores_par_section (
    id SERIAL PRIMARY KEY,
    statistique_id INTEGER NOT NULL REFERENCES statistiques_enseignants(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections_evaluation(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
    
    -- Contraintes
    CONSTRAINT chk_score_section_valide CHECK (score BETWEEN 0 AND 100),
    CONSTRAINT uk_score_section_unique UNIQUE (statistique_id, section_id)
);

-- Index pour les performances
CREATE INDEX idx_scores_par_section_statistique ON scores_par_section(statistique_id);
CREATE INDEX idx_scores_par_section_section ON scores_par_section(section_id);

CREATE TABLE historique_prix (
    id SERIAL PRIMARY KEY,
    enseignant_id INTEGER NOT NULL REFERENCES enseignants(id) ON DELETE CASCADE,
    annee_academique_id INTEGER NOT NULL REFERENCES annees_academiques(id) ON DELETE CASCADE,
    type_prix type_prix_enum NOT NULL,
    niveau_id INTEGER REFERENCES niveaux(id) ON DELETE SET NULL,
    filiere_id INTEGER REFERENCES filieres(id) ON DELETE SET NULL,
    classe_id INTEGER REFERENCES classes(id) ON DELETE SET NULL,
    score_obtenu NUMERIC(5,2) NOT NULL,
    nb_evaluations INTEGER NOT NULL,
    date_attribution TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attribue_par_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- MODIFIED: Changed to UUID and references auth.users
    commentaire_jury TEXT,
    
    -- Contraintes
    CONSTRAINT chk_score_obtenu_valide CHECK (score_obtenu BETWEEN 0 AND 100),
    CONSTRAINT chk_nb_evaluations_positif CHECK (nb_evaluations > 0),
    CONSTRAINT uk_prix_unique UNIQUE (annee_academique_id, type_prix, niveau_id, filiere_id, classe_id)
);

-- Index pour recherches
CREATE INDEX idx_historique_prix_enseignant ON historique_prix(enseignant_id);
CREATE INDEX idx_historique_prix_annee ON historique_prix(annee_academique_id);
CREATE INDEX idx_historique_prix_date ON historique_prix(date_attribution);

-- =============================================================================
-- LOGS ET AUDIT
-- =============================================================================

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- MODIFIED: Changed to UUID and references auth.users
    action action_audit_enum NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT
);

-- Index pour recherches d'audit
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Index GIN pour recherche dans les détails JSON
CREATE INDEX idx_audit_logs_details ON audit_logs USING GIN (details);

-- =============================================================================
-- FONCTIONS ET TRIGGERS UTILES
-- =============================================================================

-- Fonction pour mettre à jour automatiquement le champ updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour mettre à jour automatiquement updated_at
CREATE TRIGGER trg_auth_users_updated_at
    BEFORE UPDATE ON auth_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_enseignants_updated_at
    BEFORE UPDATE ON enseignants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sessions_evaluation_updated_at
    BEFORE UPDATE ON sessions_evaluation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Fonction pour calculer automatiquement les scores
CREATE OR REPLACE FUNCTION calculate_response_scores()
RETURNS TRIGGER AS $$
DECLARE
    total_score NUMERIC;
    max_possible_score NUMERIC;
BEGIN
    -- Calculer le score total de la réponse
    SELECT COALESCE(SUM(rd.score), 0) INTO total_score
    FROM reponses_details rd
    WHERE rd.reponse_id = NEW.reponse_id;
    
    -- Calculer le score maximum possible
    SELECT COUNT(*) * 20 INTO max_possible_score
    FROM reponses_details rd
    WHERE rd.reponse_id = NEW.reponse_id;
    
    -- Mettre à jour les scores dans la réponse
    UPDATE reponses_evaluation
    SET 
        score_total = total_score,
        score_global = CASE 
            WHEN max_possible_score > 0 
            THEN (total_score / max_possible_score) * 100 
            ELSE 0 
        END,
        is_complete = TRUE
    WHERE id = NEW.reponse_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer automatiquement les scores
CREATE TRIGGER trg_calculate_scores
    AFTER INSERT OR UPDATE ON reponses_details
    FOR EACH ROW
    EXECUTE FUNCTION calculate_response_scores();

-- Fonction pour mettre à jour le nombre de réponses dans une session
CREATE OR REPLACE FUNCTION update_session_nb_reponses()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE sessions_evaluation
        SET nb_reponses = nb_reponses + 1
        WHERE id = NEW.session_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE sessions_evaluation
        SET nb_reponses = nb_reponses - 1
        WHERE id = OLD.session_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour maintenir le compteur de réponses
CREATE TRIGGER trg_update_session_nb_reponses
    AFTER INSERT OR DELETE ON reponses_evaluation
    FOR EACH ROW
    EXECUTE FUNCTION update_session_nb_reponses();

-- =============================================================================
-- VUES UTILES POUR LES REQUÊTES FRÉQUENTES
-- =============================================================================

-- Vue pour afficher les enseignements avec tous les détails
CREATE VIEW v_enseignements_details AS
SELECT 
    e.id,
    e.volume_horaire,
    e.semestre,
    e.date_debut,
    e.date_fin,
    e.is_active,
    ens.nom || ' ' || ens.prenom AS enseignant_nom_complet,
    ens.email AS enseignant_email,
    m.libelle AS matiere_libelle,
    m.code AS matiere_code,
    c.nom AS classe_nom,
    n.libelle AS niveau_libelle,
    f.libelle AS filiere_libelle,
    aa.libelle AS annee_academique
FROM enseignements e
JOIN enseignants ens ON e.enseignant_id = ens.id
JOIN matieres m ON e.matiere_id = m.id
JOIN classes c ON e.classe_id = c.id
JOIN niveaux n ON c.niveau_id = n.id
JOIN filieres f ON c.filiere_id = f.id
JOIN annees_academiques aa ON e.annee_academique_id = aa.id;

-- Vue pour les statistiques globales par enseignant
CREATE VIEW v_statistiques_globales AS
SELECT 
    ens.id AS enseignant_id,
    ens.nom || ' ' || ens.prenom AS enseignant_nom_complet,
    COUNT(DISTINCT e.id) AS nb_enseignements_total,
    COUNT(DISTINCT se.id) AS nb_sessions_total,
    SUM(se.nb_reponses) AS nb_reponses_total,
    AVG(re.score_global) AS score_moyen_global
FROM enseignants ens
LEFT JOIN enseignements e ON ens.id = e.enseignant_id
LEFT JOIN sessions_evaluation se ON e.id = se.enseignement_id
LEFT JOIN reponses_evaluation re ON se.id = re.session_id
WHERE ens.is_active = TRUE
GROUP BY ens.id, ens.nom, ens.prenom;

-- Vue pour remplacer les colonnes en dur
CREATE VIEW v_statistiques_detaillees AS
SELECT 
    s.id AS statistique_id,
    s.enseignant_id,
    s.annee_academique_id,
    s.score_global_moyen,
    s.nb_evaluations,
    se.id AS section_id,
    se.code AS section_code,
    se.libelle AS section_libelle,
    COALESCE(sps.score, 0) AS score_section
FROM statistiques_enseignants s
CROSS JOIN sections_evaluation se
LEFT JOIN scores_par_section sps ON s.id = sps.statistique_id AND se.id = sps.section_id;
-- =============================================================================
-- DONNÉES INITIALES ET CONFIGURATION
-- =============================================================================

-- Insertion des sections d'évaluation (selon l'annexe du projet)
INSERT INTO sections_evaluation (code, libelle, description, ordre) VALUES
('INTERET', 'Intérêt de l''enseignant pour son cours', 'Évaluation de l''engagement et de l''intérêt démontré par l''enseignant', 1),
('CLARTE', 'Clarté du cours', 'Évaluation de la clarté des explications et de la présentation', 2),
('RELATIONS', 'Relations avec les apprenants', 'Évaluation de la qualité des interactions avec les étudiants', 3),
('ORGANISATION', 'Organisation du cours', 'Évaluation de la structure et de l''organisation du cours', 4),
('PARTICIPATION', 'Incitation à la participation', 'Évaluation de l''encouragement à la participation active', 5),
('EXPLICATIONS', 'Explications', 'Évaluation de la qualité des explications fournies', 6),
('ATTITUDE', 'Attitude des apprenants', 'Évaluation de l''impact sur l''attitude des étudiants', 7);

-- Insertion de quelques niveaux de base
INSERT INTO niveaux (code, libelle, ordre) VALUES
('L1', 'Licence 1', 1),
('L2', 'Licence 2', 2),
('L3', 'Licence 3', 3),
('M1', 'Master 1', 4),
('M2', 'Master 2', 5);

-- Insertion de quelques filières de base
INSERT INTO filieres (code, libelle, description) VALUES
('INFO', 'Informatique', 'Filière Informatique et Nouvelles Technologies'),
('GC', 'Génie Civil', 'Filière Génie Civil et Architecture'),
('GM', 'Génie Mécanique', 'Filière Génie Mécanique'),
('GE', 'Génie Électrique', 'Filière Génie Électrique et Électronique');

-- =============================================================================
-- PERMISSIONS ET SÉCURITÉ
-- =============================================================================

-- Création d'un rôle pour l'application
-- CREATE ROLE esi_app_user WITH LOGIN PASSWORD 'votre_mot_de_passe_securise';

-- Attribution des permissions nécessaires
-- GRANT CONNECT ON DATABASE esi_evaluation_db TO esi_app_user;
-- GRANT USAGE ON SCHEMA public TO esi_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO esi_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO esi_app_user;

-- Pour les permissions sur les futures tables
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO esi_app_user;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO esi_app_user;

-- =============================================================================
-- COMMENTAIRES SUR LES TABLES ET COLONNES
-- =============================================================================

COMMENT ON DATABASE esi_evaluation_db IS 'Base de données du système d''évaluation des enseignements ESI';

COMMENT ON TABLE auth_users IS 'Utilisateurs du système (administrateurs)';
COMMENT ON TABLE annees_academiques IS 'Années académiques pour l''historisation';
COMMENT ON TABLE enseignants IS 'Enseignants de l''institution';
COMMENT ON TABLE niveaux IS 'Niveaux d''études (L1, L2, M1, M2, etc.)';
COMMENT ON TABLE filieres IS 'Filières de formation';
COMMENT ON TABLE classes IS 'Classes/Groupes d''étudiants';
COMMENT ON TABLE matieres IS 'Matières enseignées';
COMMENT ON TABLE enseignements IS 'Association enseignant-classe-matière';
COMMENT ON TABLE sections_evaluation IS 'Sections du formulaire d''évaluation';
COMMENT ON TABLE criteres_evaluation IS 'Critères spécifiques d''évaluation';
COMMENT ON TABLE sessions_evaluation IS 'Sessions d''évaluation ouvertes';
COMMENT ON TABLE reponses_evaluation IS 'Réponses complètes des étudiants';
COMMENT ON TABLE reponses_details IS 'Détails des réponses par critère';
COMMENT ON TABLE statistiques_enseignants IS 'Statistiques précalculées par enseignant';
COMMENT ON TABLE historique_prix IS 'Historique des prix attribués';
COMMENT ON TABLE audit_logs IS 'Journal d''audit du système';

-- =============================================================================
-- OPTIMISATIONS ET MAINTENANCE
-- =============================================================================

-- Activation de l'auto-vacuum pour maintenir les performances
ALTER TABLE reponses_evaluation SET (autovacuum_enabled = true);
ALTER TABLE reponses_details SET (autovacuum_enabled = true);
ALTER TABLE audit_logs SET (autovacuum_enabled = true);

-- Configuration du log de requêtes lentes (à ajuster selon les besoins)
-- log_min_duration_statement = 1000  # Log des requêtes > 1 seconde

-- =============================================================================
-- FIN DU SCRIPT
-- =============================================================================

-- Vérification de l'intégrité
SELECT 'Script exécuté avec succès!' AS message;

-- Affichage du nombre de tables créées
SELECT 
    schemaname,
    COUNT(*) as nb_tables
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;


CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    is_admin BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);


CREATE TABLE ml_models (
    id SERIAL PRIMARY KEY,
    model_type VARCHAR(50) NOT NULL,
    model_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metrics JSONB
);

--Optimisation des requêtes : La méthode loadCorrelationData limite les résultats à 100 lignes, ce qui peut ne pas suffire pour des analyses complètes. Utilise une vue SQL ou une fonction PostgreSQL pour agréger les données côté serveur :
CREATE OR REPLACE FUNCTION calculate_correlations()
RETURNS TABLE (
    metric1 TEXT,
    metric2 TEXT,
    correlation FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m1.metric AS metric1,
        m2.metric AS metric2,
        CORR(r1.score, r2.score) AS correlation
    FROM (
        VALUES
            ('satisfaction', 1),
            ('engagement', 2),
            ('participation', 3),
            ('qualite_enseignement', 4),
            ('charge_travail', 5)
    ) AS m1(metric, ord)
    CROSS JOIN (
        VALUES
            ('satisfaction', 1),
            ('engagement', 2),
            ('participation', 3),
            ('qualite_enseignement', 4),
            ('charge_travail', 5)
    ) AS m2(metric, ord)
    JOIN reponses_details r1 ON r1.critere_id = m1.ord
    JOIN reponses_details r2 ON r2.critere_id = m2.ord
    WHERE r1.reponse_id = r2.reponse_id
    GROUP BY m1.metric, m2.metric;
END;
$$ LANGUAGE plpgsql;

--Active RLS sur toutes les tables sensibles (sessions_evaluation, reponses_evaluation, enseignants, etc.) pour sécuriser l'accès aux données. Exemple pour sessions_evaluation :
ALTER TABLE sessions_evaluation ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_access ON sessions_evaluation
    FOR SELECT
    USING (is_active = TRUE AND date_fermeture > NOW());
CREATE POLICY admin_access ON sessions_evaluation
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = TRUE
    ));

-- =============================================================================
-- PLACEHOLDER FUNCTION FOR calculate_teacher_statistics
-- This function needs to be properly implemented with the correct business logic.
-- =============================================================================
CREATE OR REPLACE FUNCTION calculate_teacher_statistics(
    p_enseignant_id INTEGER,
    p_annee_academique_id INTEGER
)
RETURNS JSONB -- Or appropriate return type
AS $$
BEGIN
    -- Placeholder implementation:
    -- Replace this with actual logic to calculate and return statistics.
    -- For now, it returns a simple JSON object indicating it's a placeholder.
    RETURN jsonb_build_object(
        'message', 'calculate_teacher_statistics placeholder - needs implementation',
        'enseignant_id', p_enseignant_id,
        'annee_academique_id', p_annee_academique_id,
        'data', '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;