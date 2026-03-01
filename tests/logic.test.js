const test = require('node:test');
const assert = require('node:assert/strict');
const { computeScores, selectLotteryCandidates } = require('../src/logic');

test('computeScores awards only correct answers', () => {
  const scores = computeScores([
    { group_id: 1, is_correct: 1 },
    { group_id: 1, is_correct: 0 },
    { group_id: 2, is_correct: 1 },
  ], 10);
  assert.equal(scores.get(1), 10);
  assert.equal(scores.get(2), 10);
});

test('rule A returns all top-tied groups', () => {
  const out = selectLotteryCandidates('A', [
    { group_id: 1, score: 5 },
    { group_id: 2, score: 5 },
    { group_id: 3, score: 3 },
  ]);
  assert.equal(out.length, 2);
});

test('rule B is weighted by score', () => {
  const out = selectLotteryCandidates('B', [
    { group_id: 1, score: 3 },
    { group_id: 2, score: 1 },
  ], 10);
  assert.equal(out.filter(x => x.group_id === 1).length, 3);
  assert.equal(out.filter(x => x.group_id === 2).length, 1);
});
