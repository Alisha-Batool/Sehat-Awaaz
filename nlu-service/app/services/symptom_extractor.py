"""
Symptom extraction using Ollama LLM.
Extracts structured clinical variables from free text and validates against schema.
"""

import json
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


def _derive_symptom_keys(text: str, symptoms: list[str]) -> set[str]:
    """Map known phrases in the raw text and symptom list to canonical keys."""
    haystack = " ".join(symptoms + [text]).lower()
    derived = set()
    for key, phrases in KEYWORD_MAP.items():
        for phrase in phrases:
            if phrase.lower() in haystack:
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
