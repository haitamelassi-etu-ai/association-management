const OpenAI = require('openai');

// Lazy-init: created on first call so the module can be required
// even when the key is missing (e.g. during frontend-only builds).
let _client;
function getClient() {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set – add it to your .env file');
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Generate a professional monthly social report for the association.
 *
 * @param {Object} data - Aggregated KPI data
 * @param {number} data.totalBeneficiaries
 * @param {number} data.activeBeneficiaries
 * @param {number} data.totalMeals
 * @param {number} data.hygieneDistributions
 * @param {string[]} data.stockAlerts
 * @param {number} data.occupancyRate
 * @param {number} data.donationsReceived
 * @param {string} [data.period]  - e.g. "Janvier 2026"
 * @returns {Promise<string>} Clean professional French report text
 */
async function generateMonthlyReport(data) {
  const {
    totalBeneficiaries = 0,
    activeBeneficiaries = 0,
    totalMeals = 0,
    hygieneDistributions = 0,
    stockAlerts = [],
    occupancyRate = 0,
    donationsReceived = 0,
    period = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
  } = data;

  const systemPrompt = `Tu es un assistant professionnel spécialisé dans la rédaction de rapports sociaux pour les ONG.
Tu rédiges des rapports mensuels clairs, structurés et professionnels en français.
Tu travailles pour l'association "Deuxième Chance" (جمعية الفرصة الثانية - Adel Elouerif) qui accompagne les personnes sans-abri au Maroc.
Tes rapports doivent être formels, factuels et prêts à être présentés aux partenaires institutionnels et bailleurs de fonds.`;

  const userPrompt = `Génère le rapport d'activité mensuel de l'association pour la période : ${period}.

Voici les données agrégées du mois :

- Nombre total de bénéficiaires enregistrés : ${totalBeneficiaries}
- Bénéficiaires actuellement hébergés (actifs) : ${activeBeneficiaries}
- Repas distribués ce mois : ${totalMeals}
- Distributions d'hygiène réalisées : ${hygieneDistributions}
- Alertes de stock en cours : ${stockAlerts.length > 0 ? stockAlerts.join(', ') : 'Aucune alerte'}
- Taux d'occupation des chambres : ${occupancyRate}%
- Dons reçus ce mois : ${donationsReceived} MAD

Rédige un rapport structuré avec les sections suivantes :

1. **Situation générale** – Contexte et vue d'ensemble de l'activité du mois.
2. **Activités réalisées** – Détail des actions menées (hébergement, restauration, hygiène, accompagnement).
3. **Indicateurs clés** – Présentation chiffrée des KPI avec analyse.
4. **Difficultés rencontrées** – Problèmes identifiés (stocks, capacité, financement, etc.).
5. **Recommandations** – Actions proposées pour le mois suivant.

Important :
- Utilise un ton professionnel et institutionnel.
- Inclus les chiffres fournis dans le corps du texte.
- Ne génère que le contenu du rapport, pas de méta-commentaires.`;

  const client = getClient();

  const completion = await client.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0.3,
    max_tokens: 2500,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: userPrompt },
    ],
  });

  const text = completion.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenAI returned an empty response');
  }

  return text.trim();
}

module.exports = { generateMonthlyReport };
