const crypto = require('crypto');

function computeScores(answerRows, pointsCorrect = 1) {
  const scores = new Map();
  for (const row of answerRows) {
    const current = scores.get(row.group_id) || 0;
    scores.set(row.group_id, current + (row.is_correct ? pointsCorrect : 0));
  }
  return scores;
}

function selectLotteryCandidates(ruleType, rankedGroups, topN = 10) {
  if (!rankedGroups.length) return [];
  if (ruleType === 'A') {
    const max = rankedGroups[0].score;
    return rankedGroups.filter((g) => g.score === max);
  }
  const slice = rankedGroups.slice(0, topN);
  return slice.flatMap((g) => Array(Math.max(1, g.score)).fill(g));
}

function securePick(candidates) {
  if (!candidates.length) throw new Error('No candidates for lottery');
  const random = crypto.randomBytes(32);
  const index = random.readUInt32BE(0) % candidates.length;
  return { selected: candidates[index], randomHex: random.toString('hex') };
}

function buildDrawProof(ruleType, candidateGroupIds, winnerGroupId, randomHex) {
  const timestamp = new Date().toISOString();
  const inputHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ ruleType, candidateGroupIds }))
    .digest('hex');
  return {
    timestamp,
    ruleType,
    candidateGroupIds,
    randomHex,
    winnerGroupId,
    inputHash,
  };
}

module.exports = { computeScores, selectLotteryCandidates, securePick, buildDrawProof };
