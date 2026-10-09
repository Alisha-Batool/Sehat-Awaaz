"""
Clarification question generator.
Determines if the symptom profile is sufficient for triage, and if not,
selects the single most informative follow-up question from a clinician-reviewed
question bank. Symptom-dependent gating ensures headache sessions never receive
breathing questions, and red-flag questions are asked before generic ones.

Max 3 clarification turns per session.
"""

import json
from pathlib import Path
from app.services import profile_merger

QUESTIONS_FILE = Path(__file__).parent.parent / "data" / "question_bank.json"
MAX_TURNS = 3

_questions_cache: list[dict] = []


def load_questions():
    global _questions_cache
    try:
        with open(QUESTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            _questions_cache = data.get("questions", [])
    except FileNotFoundError:
        _questions_cache = []


load_questions()


def _question_key(answer_entry: dict) -> str | None:
    return answer_entry.get("question_id") or answer_entry.get("questionId") or answer_entry.get("question_key")


def _was_answered(question_key: str, previous_answers: list[dict]) -> bool:
    return any(_question_key(a) == question_key for a in previous_answers)


def _applies_to(profile: dict, applies_to: dict) -> bool:
    if applies_to.get("always"):
        return True

    symptom_keys = set(profile.get("symptom_keys", []))
    any_of = applies_to.get("any_of", [])
    if any_of and not any(k in symptom_keys for k in any_of):
        return False

    all_of = applies_to.get("all_of", [])
    if all_of and not all(k in symptom_keys for k in all_of):
        return False

    age_band = profile.get("age_band")
    allowed_age_bands = applies_to.get("age_band", [])
    if allowed_age_bands and age_band not in allowed_age_bands:
        return False

    return True


def _requirements_met(profile: dict, requires: dict | None) -> bool:
    if not requires:
        return True

    symptom_keys = set(profile.get("symptom_keys", []))
    any_of = requires.get("any_of", [])
    if any_of and not any(k in symptom_keys for k in any_of):
        return False

    all_of = requires.get("all_of", [])
    if all_of and not all(k in symptom_keys for k in all_of):
        return False

    return True


def _localize(text_obj: dict, language: str) -> str:
    return text_obj.get(language) or text_obj.get("ur-roman") or text_obj.get("en", "")


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

    # Merge answer-derived keys so gating sees the current clinical picture.
    merged_profile = profile_merger.merge(profile, previous_answers)

    answered_keys = {_question_key(a) for a in previous_answers}

    candidates = []
    for question in _questions_cache:
        if not question.get("is_active", True):
            continue

        key = question.get("key")
        if key in answered_keys:
            continue

        applies_to = question.get("applies_to", {})
        if not _applies_to(merged_profile, applies_to):
            continue

        requires = question.get("requires")
        if not _requirements_met(merged_profile, requires):
            continue

        candidates.append(question)

    if not candidates:
        return {
            "needs_clarification": False,
            "question": None,
            "question_id": None,
            "options": [],
            "turn_count": turn_count,
        }

    # Higher priority = more urgent red-flag questions first
    candidates.sort(key=lambda q: q.get("priority", 0), reverse=True)
    best = candidates[0]

    question_text = _localize(best.get("question_text", {}), language)
    options = []
    for opt in best.get("options", []):
        options.append({
            "value": opt.get("value"),
            "label": _localize(opt, language),
        })

    return {
        "needs_clarification": True,
        "question": question_text,
        "question_id": best.get("key"),
        "options": options,
        "turn_count": turn_count + 1,
    }
