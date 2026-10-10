const config = require('../config');
const logger = require('../utils/logger');
const { performance } = require('node:perf_hooks');

/**
 * HTTP client for the Python NLU/FastAPI service.
 * All calls to the NLU service go through this module.
 */
class NLUClient {
  constructor() {
    this.baseUrl = config.nluServiceUrl;
  }

  async request(endpoint, body) {
    const url = `${this.baseUrl}${endpoint}`;
    const startedAt = performance.now();
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        // The response body may echo invalid request fields; retain only safe
        // transport details in logs and errors.
        logger.error('NLU service returned a non-success status', { endpoint, status: response.status });
        throw new Error(`NLU service returned ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      logger.error(`NLU service request failed: ${err.message}`, { endpoint });
      throw err;
    } finally {
      logger.info('NLU request timing', {
        endpoint,
        elapsedMs: Number((performance.now() - startedAt).toFixed(1)),
      });
    }
  }

  /**
   * Extract structured symptom profile from free text
   */
  async extractSymptoms(text, language) {
    return this.request('/api/extract-symptoms', { text, language });
  }

  /**
   * Evaluate triage: runs rule engine + LLM reasoning.
   * When clarification_answers are supplied, the NLU service merges them with
   * the original profile before evaluating rules or LLM fallback.
   */
  async evaluateTriage(symptomProfile, clarificationAnswers = [], language) {
    return this.request('/api/triage-evaluate', {
      symptom_profile: symptomProfile,
      clarification_answers: clarificationAnswers,
      language,
    });
  }

  async evaluateRules(symptomProfile, clarificationAnswers = [], language) {
    return this.request('/api/triage-evaluate', {
      symptom_profile: symptomProfile,
      clarification_answers: clarificationAnswers,
      language,
      rules_only: true,
    });
  }

  /**
   * Generate the next clarifying question
   */
  async generateQuestion(symptomProfile, previousAnswers, language) {
    return this.request('/api/generate-question', {
      symptom_profile: symptomProfile,
      previous_answers: previousAnswers,
      language,
    });
  }
}

module.exports = new NLUClient();
