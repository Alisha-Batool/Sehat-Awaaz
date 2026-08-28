const config = require('../config');
const logger = require('../utils/logger');

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
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`NLU service error: ${response.status}`, { endpoint, error: errorText });
        throw new Error(`NLU service returned ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (err) {
      logger.error(`NLU service request failed: ${err.message}`, { endpoint });
      throw err;
    }
  }

  /**
   * Extract structured symptom profile from free text
   */
  async extractSymptoms(text, language) {
    return this.request('/api/extract-symptoms', { text, language });
  }

  /**
   * Evaluate triage: runs rule engine + LLM reasoning
   */
  async evaluateTriage(symptomProfile, language) {
    return this.request('/api/triage-evaluate', { symptom_profile: symptomProfile, language });
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
