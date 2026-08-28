-- Sehat Awaaz Seed Data
-- Red-flag rules (clinician-authored emergency symptom combinations)

INSERT INTO red_flag_rules (version, name, description, conditions, tier, created_by, rationale) VALUES
(1, 'chest_pain_cardiac', 'Chest pain with cardiac red flags',
 '{"all_of": ["chest_pain"], "any_of": ["radiating_to_arm", "radiating_to_jaw", "diaphoresis", "shortness_of_breath", "nausea"]}',
 'emergency', 'clinical_team', 'Chest pain with radiation or associated symptoms suggests acute coronary syndrome'),

(1, 'difficulty_breathing_rest', 'Difficulty breathing at rest',
 '{"all_of": ["difficulty_breathing", "at_rest"]}',
 'emergency', 'clinical_team', 'Dyspnea at rest is always an emergency until proven otherwise'),

(1, 'meningitis_triad', 'Stiff neck with fever and photophobia',
 '{"all_of": ["stiff_neck", "fever", "photophobia"]}',
 'emergency', 'clinical_team', 'Classic meningitis presentation requiring immediate evaluation'),

(1, 'stroke_signs', 'Sudden neurological deficit',
 '{"any_of": ["sudden_weakness_one_side", "sudden_speech_difficulty", "sudden_vision_loss", "sudden_severe_headache", "facial_droop"]}',
 'emergency', 'clinical_team', 'FAST criteria for stroke — time-critical emergency'),

(1, 'severe_bleeding', 'Uncontrolled severe bleeding',
 '{"all_of": ["severe_bleeding", "uncontrolled"]}',
 'emergency', 'clinical_team', 'Uncontrolled hemorrhage is immediately life-threatening'),

(1, 'anaphylaxis', 'Signs of severe allergic reaction',
 '{"all_of": ["allergic_reaction"], "any_of": ["difficulty_breathing", "swelling_face_throat", "dizziness_fainting"]}',
 'emergency', 'clinical_team', 'Anaphylaxis requires immediate epinephrine and emergency care'),

(1, 'seizure_active', 'Active or prolonged seizure',
 '{"any_of": ["active_seizure", "seizure_over_5min", "repeated_seizures"]}',
 'emergency', 'clinical_team', 'Status epilepticus or first-time seizure requires emergency evaluation'),

(1, 'head_injury_severe', 'Severe head injury with altered consciousness',
 '{"all_of": ["head_injury"], "any_of": ["loss_of_consciousness", "confusion", "vomiting_repeated", "seizure"]}',
 'emergency', 'clinical_team', 'Head injury with neurological signs suggests traumatic brain injury'),

(1, 'high_fever_confusion', 'High fever with confusion',
 '{"all_of": ["high_fever", "confusion"]}',
 'emergency', 'clinical_team', 'High fever with altered mental status may indicate sepsis or encephalitis'),

(1, 'suicidal_ideation', 'Expressed intent of self-harm',
 '{"any_of": ["suicidal_thoughts", "self_harm_intent", "suicide_attempt"]}',
 'emergency', 'clinical_team', 'Any expression of suicidal intent requires immediate crisis intervention'),

(1, 'child_high_fever', 'High fever in young child',
 '{"all_of": ["fever"], "any_of": ["age_under_3months", "fever_over_40c", "lethargy", "not_drinking"]}',
 'emergency', 'clinical_team', 'High fever in infants/young children has lower threshold for emergency'),

(1, 'pregnancy_emergency', 'Pregnancy with danger signs',
 '{"all_of": ["pregnant"], "any_of": ["severe_abdominal_pain", "heavy_bleeding", "severe_headache_pregnancy", "reduced_fetal_movement"]}',
 'emergency', 'clinical_team', 'Obstetric emergencies are time-critical for both mother and baby');

-- Emergency numbers for Pakistan
INSERT INTO emergency_numbers (province, city, number, service_type, is_primary) VALUES
('Punjab', NULL, '1122', 'rescue', true),
('Punjab', NULL, '15', 'police', false),
('Punjab', NULL, '16', 'fire', false),
('Sindh', NULL, '1122', 'rescue', true),
('Sindh', NULL, '15', 'police', false),
('KPK', NULL, '1122', 'rescue', true),
('KPK', NULL, '15', 'police', false),
('Balochistan', NULL, '1122', 'rescue', true),
('Balochistan', NULL, '15', 'police', false),
('Islamabad', NULL, '1122', 'rescue', true),
('Islamabad', NULL, '15', 'police', false);

-- Sample healthcare facilities
INSERT INTO facilities (name, type, province, district, lat, lng, phone, emergency_capable, last_verified) VALUES
('Jinnah Hospital', 'Hospital', 'Punjab', 'Lahore', 31.5204, 74.3587, '+92-42-99231111', true, '2026-01-15'),
('Mayo Hospital', 'Hospital', 'Punjab', 'Lahore', 31.5611, 74.3154, '+92-42-99211101', true, '2026-01-15'),
('Services Hospital', 'Hospital', 'Punjab', 'Lahore', 31.5497, 74.3436, '+92-42-99203051', true, '2026-01-15'),
('PIMS Hospital', 'Hospital', 'Islamabad', 'Islamabad', 33.7294, 73.0479, '+92-51-9261161', true, '2026-02-01'),
('Holy Family Hospital', 'Hospital', 'Punjab', 'Rawalpindi', 33.6167, 73.0667, '+92-51-9290301', true, '2026-02-01'),
('Civil Hospital', 'Hospital', 'Sindh', 'Karachi', 24.8607, 67.0011, '+92-21-99215740', true, '2026-01-20'),
('JPMC', 'Hospital', 'Sindh', 'Karachi', 24.8500, 67.0200, '+92-21-99201301', true, '2026-01-20'),
('Lady Reading Hospital', 'Hospital', 'KPK', 'Peshawar', 34.0075, 71.5398, '+92-91-9211141', true, '2026-03-01'),
('BHU Model Town', 'BHU', 'Punjab', 'Lahore', 31.5100, 74.3400, NULL, false, '2025-11-01'),
('RHC Gulberg', 'RHC', 'Punjab', 'Lahore', 31.5250, 74.3600, '+92-42-99231234', false, '2025-12-15');

-- Clarification question bank
INSERT INTO question_bank (symptom_category, question_key, question_text, options, priority) VALUES
('general', 'duration',
 '{"en": "How long have you had this symptom?", "ur": "یہ علامت کتنے عرصے سے ہے؟", "ur-roman": "Yeh alaamat kitne arsay se hai?"}',
 '[{"value": "less_than_24h", "en": "Less than 24 hours", "ur": "24 گھنٹے سے کم"}, {"value": "1_3_days", "en": "1 to 3 days", "ur": "1 سے 3 دن"}, {"value": "more_than_3_days", "en": "More than 3 days", "ur": "3 دن سے زیادہ"}, {"value": "more_than_a_week", "en": "More than a week", "ur": "ایک ہفتے سے زیادہ"}]',
 10),

('general', 'severity',
 '{"en": "How severe is the pain/discomfort?", "ur": "درد/تکلیف کتنی شدید ہے؟", "ur-roman": "Dard/takleef kitni shadeed hai?"}',
 '[{"value": "mild", "en": "Mild — I can manage", "ur": "ہلکا"}, {"value": "moderate", "en": "Moderate — it is bothering me", "ur": "درمیانہ"}, {"value": "severe", "en": "Severe — very hard to bear", "ur": "بہت شدید"}, {"value": "not_sure", "en": "Not sure", "ur": "پتا نہیں"}]',
 9),

('fever', 'fever_temp',
 '{"en": "Do you know your temperature?", "ur": "کیا آپ کو اپنا درجہ حرارت معلوم ہے؟", "ur-roman": "Kya aap ko apna darja hararat maloom hai?"}',
 '[{"value": "low_grade", "en": "Low fever (below 38.5°C)", "ur": "ہلکا بخار"}, {"value": "high", "en": "High fever (above 38.5°C)", "ur": "تیز بخار"}, {"value": "very_high", "en": "Very high (above 40°C)", "ur": "بہت تیز بخار"}, {"value": "not_measured", "en": "Haven''t measured", "ur": "نہیں ناپا"}]',
 8),

('pain', 'pain_location',
 '{"en": "Where exactly is the pain?", "ur": "درد کہاں ہے؟", "ur-roman": "Dard kahan hai?"}',
 '[{"value": "head", "en": "Head", "ur": "سر"}, {"value": "chest", "en": "Chest", "ur": "سینہ"}, {"value": "abdomen", "en": "Stomach/Belly", "ur": "پیٹ"}, {"value": "other", "en": "Other", "ur": "دوسری جگہ"}]',
 10),

('breathing', 'breathing_context',
 '{"en": "When does the breathing difficulty happen?", "ur": "سانس کی تکلیف کب ہوتی ہے؟", "ur-roman": "Saans ki takleef kab hoti hai?"}',
 '[{"value": "at_rest", "en": "Even when resting", "ur": "آرام کرتے وقت بھی"}, {"value": "on_exertion", "en": "Only with activity", "ur": "صرف کام کرتے وقت"}, {"value": "lying_down", "en": "When lying down", "ur": "لیٹتے وقت"}, {"value": "not_sure", "en": "Not sure", "ur": "پتا نہیں"}]',
 9);

-- Explanation templates
INSERT INTO explanation_templates (tier, template_key, text) VALUES
('emergency', 'main',
 '{"en": "Your symptoms may indicate a serious condition that needs immediate medical attention. Please seek emergency care right away.", "ur": "آپ کی علامات کسی سنگین حالت کی نشاندہی کر سکتی ہیں۔ فوری ہنگامی طبی امداد حاصل کریں۔"}'),
('clinic', 'main',
 '{"en": "Your symptoms suggest you should see a healthcare provider soon. Please visit a nearby clinic or hospital.", "ur": "آپ کی علامات بتاتی ہیں کہ جلد ڈاکٹر سے ملیں۔"}'),
('home_care', 'main',
 '{"en": "Your symptoms appear manageable at home. Rest, stay hydrated, and monitor your condition.", "ur": "آپ کی علامات گھر پر سنبھالی جا سکتی ہیں۔ آرام کریں اور پانی پیتے رہیں۔"}');
