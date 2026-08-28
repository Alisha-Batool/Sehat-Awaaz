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


async def extract_symptoms(text: str, language: str = "en") -> SymptomProfile:
    """
    Extract structured symptom profile from free text using Ollama.
    Validates output against Pydantic schema before returning.
    """
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
        return profile

    except json.JSONDecodeError as e:
        # LLM returned invalid JSON — return minimal profile for clarification
        return SymptomProfile(
            symptoms=[text],
            symptom_keys=[],
            severity=None,
        )
    except Exception as e:
        # If Ollama is unavailable, return raw text as symptoms
        return SymptomProfile(
            symptoms=[text],
            symptom_keys=[],
        )
