/**
 * What the person actually reads: the arithmetic, the tone, and whether the product explanation
 * is about them.
 */
import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { computeNeed } from '../src/needs.js'
import { explainAssessment, explainTermVersusPermanent } from '../src/explain.js'

const FAMILY = {
  dependents: [{ name: 'child', age: 6 }],
  incomeToReplaceAnnual: 60000, debtsTotal: 240000, educationTotal: 80000,
  existingCoverage: 100000, affordableMonthly: 60,
}
const SINGLE = {
  dependents: [], mortgageYearsRemaining: 7, incomeToReplaceAnnual: 50000,
  debtsTotal: 180000, educationTotal: 0, existingCoverage: 0, affordableMonthly: 120,
}

test('the arithmetic is shown, not summarised', () => {
  const e = explainAssessment(FAMILY, computeNeed(FAMILY))
  assert.match(e.arithmetic, /\$[\d,]+ plus .* minus .* = \$[\d,]+/)
  assert.ok(e.lines.every((l) => l.because.length > 0))
})

test('the recommendation names why the horizon is what it is', () => {
  const e = explainAssessment(FAMILY, computeNeed(FAMILY))
  assert.match(e.whyThisMuch, /12 years/)
  assert.match(e.whyThisMuch, /youngest dependent is 6/)
})

test('it says plainly that it is not advice and not a quote', () => {
  const e = explainAssessment(FAMILY, computeNeed(FAMILY))
  assert.match(e.notAdvice, /not personalised financial advice/)
  assert.match(e.notAdvice, /not a quote/)
})

test('nothing in it is framed to frighten', () => {
  const e = explainAssessment(FAMILY, computeNeed(FAMILY))
  const text = [e.summary, e.whyThisMuch, e.range, e.affordability].join(' ')
  assert.doesNotMatch(text, /risk of leaving|devastat|catastroph|too late|act now|urgent/i)
})

test('term against permanent is written from this person\'s own answers', () => {
  const t = explainTermVersusPermanent(FAMILY, computeNeed(FAMILY))
  assert.match(t.inYourCase, /youngest dependent turns 18 in about 12 years/)
  assert.equal(t.definitions.length, 2)
})

test('a different household reads a different explanation', () => {
  const family = explainTermVersusPermanent(FAMILY, computeNeed(FAMILY))
  const single = explainTermVersusPermanent(SINGLE, computeNeed(SINGLE))
  assert.notEqual(family.inYourCase, single.inYourCase)
  assert.match(single.inYourCase, /mortgage has about 7 years left/)
  assert.notDeepEqual(family.tradeOffs, single.tradeOffs)
})

test('it claims no price, guarantee or product feature', () => {
  const t = explainTermVersusPermanent(FAMILY, computeNeed(FAMILY))
  const text = JSON.stringify(t)
  assert.doesNotMatch(text, /premium of|costs \$|guarantee[sd]? (a|the)|rider/i)
  assert.match(t.caveat, /holds no product information/)
})

test('the trade-offs pick up that the person already holds cover', () => {
  const t = explainTermVersusPermanent(FAMILY, computeNeed(FAMILY))
  assert.ok(t.tradeOffs.some((x) => /already hold cover/i.test(x.point)))
})
