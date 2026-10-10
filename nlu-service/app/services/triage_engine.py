"""
Combined triage engine: Rule Layer (deterministic) -> LLM Reasoning Layer (fallback).

Safety principle: The rule layer runs FIRST. If a rule fires, the LLM CANNOT downgrade it.
Low-confidence home-care recommendations are rounded up to clinic.
"""

import json
from app.services import rule_engine, llm_client
from app.models.schemas import SymptomProfile
from app.config import CONFIDENCE_THRESHOLD


class TriageAssessmentError(RuntimeError):
    """Raised when the model cannot return a valid triage assessment."""

TRIAGE_SYSTEM_PROMPT = """You are a medical triage assistant for Sehat Awaaz, a healthcare triage platform for Pakistan.
You MUST classify the patient's symptoms into exactly ONE of these tiers:
- "emergency" — needs immediate emergency care (call 1122 or go to ER now)
- "clinic" — should see a healthcare provider within 24-48 hours
- "home_care" — symptoms can be managed at home with monitoring

Rules:
1. NEVER give medical diagnoses, drug names, or dosages.
2. NEVER reassure someone who might have a serious condition.
3. When in doubt, classify as the MORE CAUTIOUS tier (clinic over home_care, emergency over clinic).
4. Provide a brief rationale (1-2 sentences) for the classification.

Output ONLY valid JSON in this exact format:
{
  "tier": "emergency|clinic|home_care",
  "rationale": "Brief explanation of why this tier was chosen",
  "confidence": 0.0
}

The confidence should be a number between 0.0 and 1.0 indicating how confident you are in this classification."""

TRIAGE_PROMPT_TEMPLATE = """Classify the following patient symptoms into a triage tier.

Symptoms: {symptoms}
Duration: {duration}
Severity: {severity}
Associated symptoms: {associated}
Age group: {age_band}
Clarification answers: {clarification_answers}
Other notes: {notes}

Respond with ONLY the JSON object."""


async def evaluate(profile: SymptomProfile, language: str = "en") -> dict:
    """
    Evaluate triage using the two-layer approach:
    1. Rule Layer (deterministic) — runs first
    2. LLM Layer — only if no rule fires

    Returns dict with: tier, rationale, confidence, rule_id, rule_version, model_version
    """

    # Layer 1: Deterministic red-flag rules
    rule_result = rule_engine.evaluate(profile)
    if rule_result:
        return {
            **rule_result,
            "model_version": None,  # Rule-based, not LLM
        }

    # Layer 2: LLM reasoning for ambiguous cases
    llm_result = await _llm_evaluate(profile, language)

    # Low confidence can move home care to clinic, but is not evidence for an
    # emergency when the model selected clinic.
    if llm_result["confidence"] < CONFIDENCE_THRESHOLD:
        previous_tier = llm_result["tier"]
        llm_result["tier"] = _round_up_tier(previous_tier)
        llm_result["rationale"] += " (confidence below threshold — rounded up to more cautious tier)"
        if llm_result["tier"] == previous_tier:
            llm_result["rationale"] = llm_result["rationale"].split(" (confidence below threshold")[0]

    llm_result["model_version"] = "ollama-local"
    llm_result["rule_id"] = None
    llm_result["rule_version"] = rule_engine.get_version()

    return llm_result


async def _llm_evaluate(profile: SymptomProfile, language: str) -> dict:
    """Run LLM-based triage evaluation."""
    answers_text = "None"
    if profile.clarification_answers:
        answers_text = "; ".join(
            f"{a.get('question_id') or a.get('questionId')}: {a.get('answer')}"
            for a in profile.clarification_answers
        )

    prompt = TRIAGE_PROMPT_TEMPLATE.format(
        symptoms=", ".join(profile.symptoms) if profile.symptoms else "Not specified",
        duration=profile.duration or "Not specified",
        severity=profile.severity or "Not specified",
        associated=", ".join(profile.associated_symptoms) if profile.associated_symptoms else "None mentioned",
        age_band=profile.age_band or "Not specified",
        clarification_answers=answers_text,
        notes=f"Chronic conditions: {', '.join(profile.chronic_conditions) if profile.chronic_conditions else 'None mentioned'}",
    )

    try:
        response_text = await llm_client.chat(
            prompt=prompt,
            system=TRIAGE_SYSTEM_PROMPT,
            response_format="json",
        )

        result = json.loads(response_text)

        # Validate tier
        valid_tiers = {"emergency", "clinic", "home_care"}
        if result.get("tier") not in valid_tiers:
            raise TriageAssessmentError("NLU returned an invalid triage tier")

        if not isinstance(result.get("rationale"), str) or not result["rationale"].strip():
            raise TriageAssessmentError("NLU returned no triage rationale")

        # Validate confidence
        confidence = result.get("confidence")
        if isinstance(confidence, bool) or not isinstance(confidence, (int, float)) or not 0 <= confidence <= 1:
            raise TriageAssessmentError("NLU returned an invalid confidence")
        result["confidence"] = float(confidence)

        return result

    except TriageAssessmentError:
        raise
    except Exception as exc:
        raise TriageAssessmentError("Unable to complete NLU triage assessment") from exc


def _round_up_tier(tier: str) -> str:
    """Round up to the more cautious tier."""
    if tier == "home_care":
        return "clinic"
    if tier == "clinic":
        return "clinic"
    return tier  # Already at highest
