"""
Deterministic red-flag rule engine.
Runs BEFORE the LLM layer — if a rule fires, the result is FINAL (LLM cannot override).

Rules are loaded from a JSON file (versioned, clinician-approved).
Each rule has conditions using "all_of" (AND) and "any_of" (OR) logic on symptom_keys.
"""

import json
import os
from pathlib import Path
from typing import Optional
from app.models.schemas import SymptomProfile, TriageTier

# Load rules from data directory
RULES_FILE = Path(__file__).parent.parent / "data" / "red_flag_rules.json"

_rules_cache: list[dict] = []
_rules_version: int = 1


def load_rules():
    """Load rules from JSON file into memory cache."""
    global _rules_cache, _rules_version
    try:
        with open(RULES_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            _rules_cache = data.get("rules", [])
            _rules_version = data.get("version", 1)
    except FileNotFoundError:
        _rules_cache = []
        _rules_version = 1


def evaluate(profile: SymptomProfile) -> Optional[dict]:
    """
    Evaluate the symptom profile against all red-flag rules.

    Returns:
        dict with {tier, rule_id, rule_version, rationale} if a rule fires,
        None if no rule matches.
    """
    if not _rules_cache:
        load_rules()

    symptom_keys = set(profile.symptom_keys)

    for rule in _rules_cache:
        if not rule.get("is_active", True):
            continue

        if _matches_conditions(rule.get("conditions", {}), symptom_keys):
            return {
                "tier": rule.get("tier", "emergency"),
                "rule_id": rule.get("id"),
                "rule_version": _rules_version,
                "rationale": rule.get("rationale", f"Red-flag rule matched: {rule.get('name', 'unknown')}"),
                "confidence": 1.0,  # Deterministic rules always have full confidence
            }

    return None


def _matches_conditions(conditions: dict, symptom_keys: set) -> bool:
    """
    Evaluate rule conditions against symptom keys.

    Conditions format:
    {
        "all_of": ["symptom_a", "symptom_b"],  // ALL must be present
        "any_of": ["symptom_c", "symptom_d"]   // At least ONE must be present
    }
    """
    all_of = conditions.get("all_of", [])
    any_of = conditions.get("any_of", [])

    # Check all_of: every listed symptom must be present
    if all_of:
        if not all(symptom in symptom_keys for symptom in all_of):
            return False

    # Check any_of: at least one listed symptom must be present
    if any_of:
        if not any(symptom in symptom_keys for symptom in any_of):
            return False

    # If both lists are empty, rule doesn't match
    if not all_of and not any_of:
        return False

    return True


def get_version() -> int:
    """Return the current rule set version."""
    if not _rules_cache:
        load_rules()
    return _rules_version


# Load rules on module import
load_rules()
