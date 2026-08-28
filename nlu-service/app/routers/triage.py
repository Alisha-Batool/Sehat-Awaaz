from fastapi import APIRouter
from app.models.schemas import TriageRequest, TriageResponse, SymptomProfile
from app.services.triage_engine import evaluate

router = APIRouter()


@router.post("/triage-evaluate", response_model=TriageResponse)
async def triage_evaluate(request: TriageRequest):
    """
    Evaluate triage using rule engine + LLM reasoning.
    Rule layer runs first — if a rule fires, LLM cannot override.
    """
    profile = SymptomProfile(**request.symptom_profile)
    result = await evaluate(profile, request.language)
    return TriageResponse(**result)
