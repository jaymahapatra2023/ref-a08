/**
 * The arithmetic, and the horizon rule that drives most of it.
 */
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { computeNeed, yearsToReplace } from '../src/needs.js'

const FAMILY = {
  dependents: [{ name: 'child', age: 6 }, { name: 'child', age: 11 }],
  incomeToReplaceAnnual: 60000,
  debtsTotal: 240000,
  educationTotal: 80000,
  existingCoverage: 100000,
  affordableMonthly: 60,
}

test('the horizon runs to the youngest dependent turning 18, and says so', () => {
  const h = yearsToReplace(FAMILY)
  assert.equal(h.years, 12)
  assert.match(h.because, /youngest dependent is 6/)
})

test('with nobody depending on the income, the mortgage term sets the horizon', () => {
  const h = yearsToReplace({ dependents: [], mortgageYearsRemaining: 7 })
  assert.equal(h.years, 7)
  assert.match(h.because, /7 years left on your mortgage/)
})

test('with neither, it falls back to ten years and admits that is a default', () => {
  const h = yearsToReplace({ dependents: [] })
  assert.equal(h.years, 10)
  assert.match(h.because, /default/)
})

test('the recommendation is income over the horizon, plus debts and education, less existing cover', () => {
  const a = computeNeed(FAMILY)
  // 60000 * 12 + 240000 + 80000 - 100000
  assert.equal(a.recommended, 940000)
  assert.equal(a.range.lower, 846000)
  assert.equal(a.range.upper, 1034000)
})

test('every term carries where it came from, so the figure can be decomposed', () => {
  for (const term of computeNeed(FAMILY).terms) {
    assert.ok(term.from.length > 0, `${term.key} has no provenance`)
    assert.ok(['+', '-'].includes(term.sign))
  }
})

test('it names the largest term, which is what a reader asks about first', () => {
  assert.equal(computeNeed(FAMILY).largestTerm, 'income')
})

test('existing cover above the need is reported as covered, not as a negative figure', () => {
  const a = computeNeed({ ...FAMILY, existingCoverage: 5_000_000 })
  assert.equal(a.recommended, 0)
  assert.equal(a.coveredAlready, true)
})

test('a zero income answer does not produce a negative or NaN figure', () => {
  const a = computeNeed({ dependents: [], incomeToReplaceAnnual: 0, debtsTotal: 0, educationTotal: 0, existingCoverage: 0, affordableMonthly: 0 })
  assert.equal(a.recommended, 0)
  assert.ok(Number.isFinite(a.range.lower))
})

test('nothing spare each month is answered without alarm', () => {
  const a = computeNeed({ ...FAMILY, affordableMonthly: 0 })
  assert.match(a.affordability.note, /still does/)
  assert.doesNotMatch(a.affordability.note, /risk|danger|urgent/i)
})
