"""
Profile merger: blend accumulated clarification answers into the original
extracted symptom profile so the rule engine and LLM see the full picture.
"""

import copy
import json
from pathlib import Path

_QUESTIONS_FILE = Path(__file__).parent.parent / "data" / "question_bank.json"
_answer_map_cache: dict[str, dict] = {}


def _load_answer_map() -> dict[str, dict]:
    global _answer_map_cache
    if _answer_map_cache:
        return _answer_map_cache

    try:
        with open(_QUESTIONS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {"questions": []}

    answer_map: dict[str, dict] = {}
    for question in data.get("questions", []):
        qid = question.get("key")
        if qid and "answer_map" in question:
            answer_map[qid] = question["answer_map"]

    _answer_map_cache = answer_map
    return answer_map


def merge(profile: dict, answers: list[dict]) -> dict:
    """
    Return a new profile dict with clarification answer effects applied.

    Effects are looked up in the question bank's answer_map. Supported effects:
      - symptom_keys: list of keys to add
      - duration: set if profile duration is missing
      - severity: set if profile severity is missing
      - associated_symptoms: list of symptoms to append

    'not_sure' and unknown question IDs are ignored.
    """
    merged = copy.deepcopy(profile)
    answer_map = _load_answer_map()

    merged.setdefault("symptom_keys", [])
    merged.setdefault("associated_symptoms", [])

    for answer_entry in answers:
        question_id = answer_entry.get("question_id") or answer_entry.get("questionId") or answer_entry.get("question_key")
        value = answer_entry.get("answer")
        if not question_id or value in (None, "not_sure", "not_measured"):
            continue

        qmap = answer_map.get(question_id, {})
        effect = qmap.get(value, {})
        if not effect:
            continue

        # Add derived symptom keys
        for key in effect.get("symptom_keys", []):
            if key not in merged["symptom_keys"]:
                merged["symptom_keys"].append(key)

        # Fill duration only if not already extracted
        if effect.get("duration") and not merged.get("duration"):
            merged["duration"] = effect["duration"]

        # Fill severity only if not already extracted
        if effect.get("severity") and not merged.get("severity"):
            merged["severity"] = effect["severity"]

        # Append associated symptoms
        for symptom in effect.get("associated_symptoms", []):
            if symptom not in merged["associated_symptoms"]:
                merged["associated_symptoms"].append(symptom)

    return merged
