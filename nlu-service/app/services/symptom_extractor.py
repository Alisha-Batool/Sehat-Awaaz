"""
Symptom extraction using Ollama LLM.
Extracts structured clinical variables from free text and validates against schema.
"""

import json
import re
from app.services import llm_client
from app.models.schemas import SymptomProfile

EXTRACTION_SYSTEM_PROMPT = """You are a medical NLU assistant for Sehat Awaaz, a healthcare triage app for Pakistan.
Your job is to extract structured clinical information from a patient's symptom description.

You MUST output ONLY valid JSON. Never include medical advice, drug names, or dosages.
Extract what is stated — do not invent symptoms that are not mentioned.

The output must follow this exact JSON structure:
{
  "symptoms": ["list of symptom descriptions"],
  "onset": "when it started (e.g., '2 days ago', 'sudden') or null",
  "duration": "how long (e.g., '3 days') or null",
  "severity": "mild, moderate, severe, or null",
  "aggravating_factors": ["things that make it worse"],
  "relieving_factors": ["things that make it better"],
  "associated_symptoms": ["other symptoms mentioned alongside"],
  "age_band": "child, adult, elderly, or null",
  "sex": "male, female, or null",
  "pregnancy_status": "pregnant, not_pregnant, or null",
  "chronic_conditions": ["known conditions mentioned"],
  "medications": ["medications mentioned (name only, no dosage)"],
  "symptom_keys": ["normalized keyword tags for rule matching — use snake_case medical terms like chest_pain, fever, difficulty_breathing, etc."]
}

For symptom_keys, map the patient's language to standard English medical keyword tags. Examples:
- "seene mein dard" → ["chest_pain"]
- "bukhar" → ["fever"]
- "saans nahi aa rahi" → ["difficulty_breathing"]
- "sar dard" → ["headache"]
- "ulti" → ["vomiting"]
- "pet dard" → ["abdominal_pain"]
"""

EXTRACTION_PROMPT_TEMPLATE = """Extract clinical information from this patient's symptom description.
Language: {language}

Patient says: "{text}"

Respond with ONLY the JSON object, no other text."""

# Deterministic fallback mapping for common terms in English, Urdu, Roman Urdu, and Pashto.
# This guarantees the rule engine and question selector see the right keys even when the
# local LLM returns an empty or incomplete symptom_keys list.
KEYWORD_MAP = {
    "difficulty_breathing": [
        "saans", "saan", "سانس", "ساه", "breath", "breathing", "dyspnea", "shortness of breath",
        "saans ka phoolna", "saans nahi aa rahi", "سانس پھولنا", "سانس نہیں آ رہی",
    ],
    "chest_pain": [
        "chest", "seene", "seena", "seene ka dard", "سینے", "سینه", "چھاتی", "chhati",
    ],
    "radiating_to_arm": [
        "arm", "left arm", "shoulder", "bazoo", "بازو", "بنس", "kandha",
    ],
    "radiating_to_jaw": [
        "jaw", "neck", "mandible", "dahan", "دھڑ", "مږ",
    ],
    "diaphoresis": [
        "sweating", "sweat", "perspiration", "paseena", "pasina", "پسینہ", "ږل",
    ],
    "headache": [
        "headache", "head ache", "sar dard", "sar", "سر درد", "سردرد", "سر",
    ],
    "fever": [
        "fever", "bukhar", "takleef", "تب", "بخار", "تودوخه", "تودوخې",
    ],
    "abdominal_pain": [
        "abdominal", "stomach", "pet dard", "pet", "pait", "پیٹ", "نس", "معده",
    ],
    "vomiting": [
        "vomit", "vomiting", "ulti", "qay", "qee", "الٹی", "قي", "تق",
    ],
    "severe_bleeding": [
        "bleeding", "blood", "khoon", "véine", "وینه", "خون", "khoon nikalna",
    ],
    "diarrhea": [
        "diarrhea", "diarrhoea", "dast", "dast lagna", "اسہال", "دست",
    ],
    "rash": [
        "rash", "kharish", "dhabbay", "خارش", "پړسوب", "دانه",
    ],
}


KEYWORD_MAP.update({
    # Canonical tags used by configured red-flag rules. These are evaluated on
    # raw text before the deterministic extraction fast path returns.
    "shortness_of_breath": ["shortness of breath", "difficulty breathing", "breathless", "can't breathe", "cannot breathe", "saans nahi aa rahi"],
    "at_rest": ["at rest", "while resting", "even when resting", "aaram karte waqt"],
    "stiff_neck": ["stiff neck", "neck stiffness", "gardan akri", "gardan mein akrao"],
    "photophobia": ["photophobia", "light sensitivity", "sensitive to light", "roshni se takleef"],
    "sudden_weakness_one_side": ["weakness on one side", "one-sided weakness", "sudden one-sided weakness", "aik taraf kamzori"],
    "sudden_speech_difficulty": ["sudden speech difficulty", "difficulty speaking", "slurred speech", "bolne mein mushkil"],
    "sudden_vision_loss": ["sudden vision loss", "suddenly lost vision", "sudden loss of vision", "achanak nazar chali"],
    "sudden_severe_headache": ["sudden severe headache", "thunderclap headache", "worst headache of my life", "zindagi ka sab se shadeed sar dard"],
    "facial_droop": ["facial droop", "face drooping", "drooping face", "chehra latak"],
    "uncontrolled": ["won't stop bleeding", "will not stop bleeding", "uncontrolled bleeding", "bleeding heavily", "khoon nahi ruk raha"],
    "allergic_reaction": ["allergic reaction", "anaphylaxis", "shadeed allergy"],
    "swelling_face_throat": ["face swelling", "throat swelling", "swollen face", "swollen throat", "gale mein soojan"],
    "dizziness_fainting": ["dizziness", "fainting", "passed out", "chakkar", "behosh"],
    "active_seizure": ["active seizure", "having a seizure", "seizing now", "daura par raha"],
    "seizure_over_5min": ["seizure over 5 minutes", "seizure longer than 5 minutes", "daura paanch minute se zyada"],
    "repeated_seizures": ["repeated seizures", "multiple seizures", "seizures one after another"],
    "head_injury": ["head injury", "hit my head", "head trauma", "sar par chot"],
    "loss_of_consciousness": ["loss of consciousness", "lost consciousness", "unconscious", "behosh ho gaya"],
    "confusion": ["confusion", "confused", "disoriented", "zehni uljhan"],
    "vomiting_repeated": ["repeated vomiting", "vomiting repeatedly", "vomited several times"],
    "seizure": ["seizure", "convulsion", "fit", "mirgi ka daura"],
    "high_fever": ["high fever", "very high fever", "tez bukhar", "bohat tez bukhar"],
    "suicidal_thoughts": ["suicidal thoughts", "thinking about suicide", "want to die", "khudkushi ka khayal"],
    "self_harm_intent": ["self harm", "self-harm", "hurt myself", "harm myself", "khud ko nuqsan"],
    "suicide_attempt": ["suicide attempt", "attempted suicide", "tried to kill myself"],
    "age_under_3months": ["under 3 months", "under three months", "less than 3 months", "3 mahine se kam"],
    "fever_over_40c": ["fever over 40", "temperature over 40", "40 c fever", "104 f fever"],
    "lethargy": ["lethargic", "very drowsy", "hard to wake", "sust"],
    "not_drinking": ["not drinking", "unable to drink", "refusing fluids", "pani nahi pee raha"],
    "pregnant": ["pregnant", "pregnancy", "hamila", "hamla"],
    "severe_abdominal_pain": ["severe abdominal pain", "severe stomach pain", "shadeed pait dard"],
    "heavy_bleeding": ["heavy bleeding", "bleeding heavily", "bohat zyada bleeding"],
    "severe_headache_pregnancy": ["severe headache during pregnancy", "pregnant severe headache"],
    "reduced_fetal_movement": ["reduced fetal movement", "baby is moving less", "baby stopped moving"],
})


def _derive_symptom_keys(text: str, symptoms: list[str]) -> set[str]:
    """Map known phrases in the raw text and symptom list to canonical keys."""
    haystack = " ".join(symptoms + [text]).lower()
    derived = set()
    for key, phrases in KEYWORD_MAP.items():
        for phrase in phrases:
            for match in re.finditer(re.escape(phrase.lower()), haystack):
                preceding_text = haystack[max(0, match.start() - 48):match.start()]
                if re.search(
                    r"\b(?:no|not|never|denies|denied|without|negative for|does not have|do not have|doesn't have|don't have)\s+(?:(?:any|a|an|the|having|experiencing|seeing|trouble|difficulty|shortness|of|breathing|or)\s+){0,4}$",
                    preceding_text,
                ):
                    continue
                derived.add(key)
                break
    return derived


async def extract_symptoms(text: str, language: str = "en") -> SymptomProfile:
    """
    Extract structured symptom profile from free text using Ollama.
    Validates output against Pydantic schema before returning.
    """
    derived_keys = _derive_symptom_keys(text, [text])
    if derived_keys:
        return SymptomProfile(symptoms=[text], symptom_keys=sorted(derived_keys))

    prompt = EXTRACTION_PROMPT_TEMPLATE.format(text=text, language=language)

    try:
        response_text = await llm_client.chat(
            prompt=prompt,
            system=EXTRACTION_SYSTEM_PROMPT,
            response_format="json",
        )

        # Parse and validate the LLM output
        parsed = json.loads(response_text)
        profile = SymptomProfile(**parsed)

        # Guarantee canonical keys via deterministic fallback mapping
        derived_keys = _derive_symptom_keys(text, profile.symptoms or [])
        existing_keys = set(profile.symptom_keys or [])
        profile.symptom_keys = sorted(existing_keys | derived_keys)

        return profile

    except json.JSONDecodeError as e:
        # LLM returned invalid JSON — still use deterministic mapping
        return SymptomProfile(
            symptoms=[text],
            symptom_keys=sorted(_derive_symptom_keys(text, [text])),
            severity=None,
        )
    except Exception as exc:
        # If Ollama is unavailable, log the failure and return raw text as symptoms
        print(f"Symptom extraction failed: {exc}")
        return SymptomProfile(
            symptoms=[text],
            symptom_keys=sorted(_derive_symptom_keys(text, [text])),
            severity=None,
        )
