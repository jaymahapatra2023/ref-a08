/**
 * The branching. Two branches are the difference between a conversation and a form.
 */
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { nextQuestion, outstanding, parseAnswer } from '../src/flow.js'

test('it opens by asking who depends on the person', () => {
  assert.equal(nextQuestion({}).id, 'dependents')
})

test('somebody with no dependents is asked about the mortgage term, not about education', () => {
  const answers = { dependents: [], incomeToReplaceAnnual: 50000, debtsTotal: 180000 }
  assert.equal(nextQuestion(answers).id, 'mortgageYearsRemaining')
  assert.ok(!outstanding(answers).includes('educationTotal'))
})

test('somebody with dependents is asked about education, not about the mortgage term', () => {
  const answers = {
    dependents: [{ name: 'child', age: 4 }], incomeToReplaceAnnual: 50000, debtsTotal: 180000,
  }
  assert.equal(nextQuestion(answers).id, 'educationTotal')
})

test('somebody with no dependents and no debt skips both and goes to existing cover', () => {
  const answers = { dependents: [], incomeToReplaceAnnual: 50000, debtsTotal: 0 }
  assert.equal(nextQuestion(answers).id, 'existingCoverage')
})

test('two different answer sets produce two different question sequences', () => {
  const walk = (seed) => {
    const answers = { ...seed }
    const asked = []
    for (let i = 0; i < 10; i++) {
      const q = nextQuestion(answers)
      if (!q) break
      asked.push(q.id)
      answers[q.id] = q.id === 'dependents' ? (seed.dependents ?? []) : 1
    }
    return asked
  }
  const withKids = walk({ dependents: [{ name: 'c', age: 3 }] })
  const without = walk({ dependents: [] })
  assert.notDeepEqual(withKids, without)
  assert.ok(withKids.includes('educationTotal'))
  assert.ok(without.includes('mortgageYearsRemaining'))
})

test('the conversation ends when everything it needs has been answered', () => {
  const answers = {
    dependents: [{ name: 'c', age: 3 }], incomeToReplaceAnnual: 60000, debtsTotal: 1000,
    educationTotal: 0, existingCoverage: 0, affordableMonthly: 40,
  }
  assert.equal(nextQuestion(answers), null)
  assert.deepEqual(outstanding(answers), [])
})

test('"nobody" is a valid answer about dependents', () => {
  assert.deepEqual(parseAnswer('dependents', 'nobody').value, [])
})

test('a dependent without an age is refused, with the reason', () => {
  assert.match(parseAnswer('dependents', [{ name: 'child' }]).error, /needs an age/)
})

test('money is read with the symbols people type, and negatives are refused', () => {
  assert.equal(parseAnswer('debtsTotal', '$240,000').value, 240000)
  assert.match(parseAnswer('debtsTotal', '-5').error, /negative/)
})
