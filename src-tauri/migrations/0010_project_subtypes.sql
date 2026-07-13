ALTER TABLE projects ADD COLUMN project_subtype TEXT NULL
CHECK (project_subtype IS NULL OR project_subtype IN (
  'eda', 'statistical', 'time_series_analysis', 'dashboard_report', 'data_pipeline', 'research_reproduction', 'other_data',
  'regression', 'classification', 'time_series_forecasting', 'recommendation', 'anomaly_detection', 'clustering',
  'nlp', 'computer_vision', 'ranking', 'other_ml'
));
