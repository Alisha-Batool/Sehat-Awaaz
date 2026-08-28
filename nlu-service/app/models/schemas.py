from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class TriageTier(str, Enum):
    EMERGENCY = "emergency"
    CLINIC = "clinic"
    HOME_CARE = "home_care"


class SymptomProfile(BaseModel):
    """Structured clinical variables extracted from free text."""
    symptoms: list[str] = Field(default_factory=list, description="List of identified symptoms")
    onset: Optional[str] = None
    duration: Optional[str] = None
    severity: Optional[str] = None
    aggravating_factors: list[str] = Field(default_factory=list)
    relieving_factors: list[str] = Field(default_factory=list)
    associated_symptoms: list[str] = Field(default_factory=list)
    age_band: Optional[str] = None
    sex: Optional[str] = None
    pregnancy_status: Optional[str] = None
    chronic_conditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    # Normalized symptom keys for rule engine matching
    symptom_keys: list[str] = Field(default_factory=list, description="Normalized keys for rule matching")


class ExtractionRequest(BaseModel):
    text: str
    language: str = "en"


class ExtractionResponse(BaseModel):
    symptom_profile: SymptomProfile


class TriageRequest(BaseModel):
    symptom_profile: dict
    language: str = "en"


class TriageResponse(BaseModel):
    tier: str
    rationale: str
    confidence: float
    rule_id: Optional[str] = None
    rule_version: Optional[int] = None
    model_version: Optional[str] = None


class ClarificationRequest(BaseModel):
    symptom_profile: dict
    previous_answers: list = Field(default_factory=list)
    language: str = "en"


class ClarificationResponse(BaseModel):
    needs_clarification: bool
    question: Optional[str] = None
    question_id: Optional[str] = None
    options: list[dict] = Field(default_factory=list)
    turn_count: int = 0
