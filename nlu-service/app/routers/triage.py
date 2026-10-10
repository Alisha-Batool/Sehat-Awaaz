from fastapi import APIRouter, HTTPException
from app.models.schemas import TriageRequest, TriageResponse, SymptomProfile
from app.services.triage_engine import evaluate, TriageAssessmentError
from app.services import profile_merger, rule_engine

router = APIRouter()


@router.post("/triage-evaluate", response_model=TriageResponse)
async def triage_evaluate(request: TriageRequest):
    """
    Evaluate triage using rule engine + LLM reasoning.
    Clarification answers are merged into the original profile before evaluation
    so rule-derived keys from prior turns are visible to the safety layer.
    Rule layer runs first — if a rule fires, LLM cannot override.
    """
    merged_profile = profile_merger.merge(request.symptom_profile, request.clarification_answers)
    profile = SymptomProfile(**merged_profile)

    if request.rules_only:
        result = rule_engine.evaluate(profile) or {
            "tier": "clinic",
            "rationale": "No red-flag rule matched",
            "confidence": 0.0,
            "rule_id": None,
            "rule_version": rule_engine.get_version(),
            "model_version": None,
        }
        return TriageResponse(**result)

    try:
        result = await evaluate(profile, request.language)
    except TriageAssessmentError as exc:
        raise HTTPException(status_code=503, detail="Triage assessment is temporarily unavailable") from exc
    return TriageResponse(**result)
