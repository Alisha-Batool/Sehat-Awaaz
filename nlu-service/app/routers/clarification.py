from fastapi import APIRouter
from app.models.schemas import ClarificationRequest, ClarificationResponse
from app.services.clarification import generate_question

router = APIRouter()


@router.post("/generate-question", response_model=ClarificationResponse)
async def generate_clarification_question(request: ClarificationRequest):
    """
    Generate the single most informative clarifying question,
    or indicate that sufficient information is available for triage.
    """
    result = await generate_question(
        request.symptom_profile,
        request.previous_answers,
        request.language,
    )
    return ClarificationResponse(**result)
