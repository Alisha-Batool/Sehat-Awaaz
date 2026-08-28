from fastapi import APIRouter
from app.models.schemas import ExtractionRequest, ExtractionResponse
from app.services.symptom_extractor import extract_symptoms

router = APIRouter()


@router.post("/extract-symptoms", response_model=ExtractionResponse)
async def extract_symptoms_endpoint(request: ExtractionRequest):
    """Extract structured symptom profile from free text."""
    profile = await extract_symptoms(request.text, request.language)
    return ExtractionResponse(symptom_profile=profile)
