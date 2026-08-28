"""
Clarification question generator.
Determines if the symptom profile is sufficient for triage, and if not,
generates the single most informative follow-up question.

Uses a clinician-reviewed question bank — the LLM selects/adapts from templates,
not free-generating from scratch. Max 4 clarification turns per session.
"""

import json
from pathlib import Path
from app.services import llm_client
from app.models.schemas import SymptomProfile

QUESTIONS_FILE = Path(__file__).parent.parent / "data" / "question_bank.json"
MAX_TURNS = 4

_questions_cache: list[dict] = []


def load_questions():
    global _questions_cache
    try:
        with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
            _questions_cache = json.load(f).get("questions", [])
    except FileNotFoundError:
        _questions_cache = []


load_questions()


async def generate_question(
    profile: dict,
    previous_answers: list,
    language: str = "en",
) -> dict:
    """
    Determine if more information is needed and generate the next question.

    Returns:
        {
            needs_clarification: bool,
            question: str or None,
            question_id: str or None,
            options: list[dict],
            turn_count: int
        }
    """
    turn_count = len(previous_answers)

    # Max turns reached — proceed with triage regardless
    if turn_count >= MAX_TURNS:
        return {
            "needs_clarification": False,
            "question": None,
            "question_id": None,
            "options": [],
            "turn_count": turn_count,
        }

    # Check what key information is missing
    symptom_keys = profile.get("symptom_keys", [])
    severity = profile.get("severity")
    duration = profile.get("duration")

    # Determine which question categories are needed
    needed_categories = []

    # Always need duration if missing
    if not duration and not _was_answered("duration", previous_answers):
        needed_categories.append("general")

    # Always need severity if missing
    if not severity and not _was_answered("severity", previous_answers):
        needed_categories.append("general")

    # Symptom-specific questions
    if "fever" in symptom_keys and not _was_answered("fever_temp", previous_answers):
        needed_categories.append("fever")
    if any(k in symptom_keys for k in ["chest_pain", "abdominal_pain", "headache"]) and not _was_answered("pain_location", previous_answers):
        needed_categories.append("pain")
    if "difficulty_breathing" in symptom_keys and not _was_answered("breathing_context", previous_answers):
        needed_categories.append("breathing")

    if not needed_categories:
        return {
            "needs_clarification": False,
            "question": None,
            "question_id": None,
            "options": [],
            "turn_count": turn_count,
        }

    # Find the highest-priority unanswered question from the bank
    question = _find_best_question(needed_categories, previous_answers, language)

    if question:
        return {
            "needs_clarification": True,
            "question": question["text"],
            "question_id": question["key"],
            "options": question.get("options", []),
            "turn_count": turn_count + 1,
        }

    return {
        "needs_clarification": False,
        "question": None,
        "question_id": None,
        "options": [],
        "turn_count": turn_count,
    }


def _was_answered(question_key: str, previous_answers: list) -> bool:
    """Check if a question was already answered in previous turns."""
    return any(
        a.get("questionId") == question_key or a.get("question_key") == question_key
        for a in previous_answers
    )


def _find_best_question(categories: list[str], previous_answers: list, language: str) -> dict | None:
    """Find the highest-priority question from the bank for the needed categories."""
    answered_keys = {
        a.get("questionId") or a.get("question_key")
        for a in previous_answers
    }

    candidates = [
        q for q in _questions_cache
        if q.get("category") in categories
        and q.get("key") not in answered_keys
        and q.get("is_active", True)
    ]

    if not candidates:
        return None

    # Sort by priority (higher = more important)
    candidates.sort(key=lambda q: q.get("priority", 0), reverse=True)

    best = candidates[0]
    question_text = best.get("question_text", {})
    text = question_text.get(language, question_text.get("en", ""))

    options = []
    for opt in best.get("options", []):
        opt_text = opt.get(language, opt.get("en", ""))
        options.append({
            "value": opt.get("value"),
            "label": opt_text,
        })

    return {
        "key": best.get("key"),
        "text": text,
        "options": options,
    }
