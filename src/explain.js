/**
 * The recommendation in words, built from the computed assessment.
 *
 * Three rules, and they are the point of the challenge rather than decoration. The arithmetic is
 * shown, not summarised, so a reader can check it. Nothing is framed to frighten. And the product
 * explanation is written from this person's own answers, so it could not be pasted to anyone else.
 */

const money = (n) => `$${Number(n).toLocaleString('en-US')}`

export function explainAssessment(answers, assessment) {
  const lines = assessment.terms
    .filter((t) => t.amount > 0 || t.key === 'existing')
    .map((t) => ({
      label: t.label,
      amount: `${t.sign} ${money(t.amount)}`,
      because: t.from,
    }))

  const arithmetic = assessment.terms
    .map((t) => `${t.sign === '-' ? 'minus' : 'plus'} ${money(t.amount)}`)
    .join(' ')
    .replace(/^plus /, '')

  const summary = assessment.coveredAlready
    ? 'On these answers, the cover you already have is enough to meet what you described. ' +
      'Nothing here says you need more.'
    : `On these answers, somewhere between ${money(assessment.range.lower)} and ` +
      `${money(assessment.range.upper)} of cover would meet what you described. ` +
      `The single figure is ${money(assessment.recommended)}.`

  return {
    summary,
    arithmetic: `${arithmetic} = ${money(assessment.recommended)}`,
    lines,
    whyThisMuch: `The largest part is ${assessment.terms.find((t) => t.key === assessment.largestTerm)?.label ?? 'the income replacement'}. ` +
      `The horizon is ${assessment.horizon.years} years because ${assessment.horizon.because}.`,
    range:
      'It is a range rather than one number because the horizon, future costs and what you ' +
      'already hold are all estimates. Changing any answer moves it, and you can change one.',
    affordability: assessment.affordability?.note ?? null,
    notAdvice:
      'This is an estimate produced from what you typed, not personalised financial advice and ' +
      'not a quote. It does not account for your age, health, tax position or anything else a ' +
      'real recommendation would. Take it to a licensed professional before acting on it.',
  }
}

/**
 * Term against permanent, written around this person's answers.
 *
 * The two definitions are fixed and deliberately unembellished: term is cover for a defined
 * period; permanent is designed to stay in place longer and may include features beyond the death
 * benefit, depending on the product. Nothing about price, guarantees or named product features is
 * claimed, because this tool has no product data and inventing some would be worse than silence.
 */
export function explainTermVersusPermanent(answers, assessment) {
  const years = assessment.horizon.years
  const ages = (answers.dependents ?? []).map((d) => Number(d.age)).filter(Number.isFinite)
  const youngest = ages.length > 0 ? Math.min(...ages) : null
  const mortgageYears = answers.mortgageYearsRemaining ?? null

  const anchor = youngest !== null
    ? `your youngest dependent turns 18 in about ${Math.max(18 - youngest, 1)} years`
    : mortgageYears !== null
      ? `your mortgage has about ${mortgageYears} years left`
      : 'you did not describe a date by which the need ends'

  const boundedNeed = youngest !== null || mortgageYears !== null

  return {
    definitions: [
      { type: 'Term', meaning: 'Cover for a defined period.' },
      {
        type: 'Permanent',
        meaning: 'Cover designed to remain in place longer, and which may include features ' +
          'beyond the death benefit depending on the product.',
      },
    ],
    // Interpolated from this person's answers: a different household reads a different sentence.
    inYourCase: boundedNeed
      ? `Most of what you described ends: ${anchor}. Cover for a defined period lines up with a ` +
        `need that has an end date, and ${years} years is the horizon your answers imply.`
      : `Nothing in your answers gives the need an end date — ${anchor} — so a defined period ` +
        'would have to be chosen rather than read off your situation.',
    tradeOffs: tradeOffsFor(answers, assessment, boundedNeed),
    caveat:
      'Terminology, features and availability differ by product, and this tool holds no product ' +
      'information. It cannot tell you what any particular policy costs or guarantees.',
  }
}

/** Selected by the shape of the answers, so two households do not get the same paragraph. */
function tradeOffsFor(answers, assessment, boundedNeed) {
  const out = []
  const affordable = answers.affordableMonthly == null ? null : Number(answers.affordableMonthly)
  const existing = Number(answers.existingCoverage ?? 0)

  if (boundedNeed) {
    out.push({
      point: 'Your need has an end date',
      because: `${assessment.horizon.because}. Cover that runs past the need is cover you pay for ` +
        'after the reason for it has gone.',
    })
  } else {
    out.push({
      point: 'Your need has no end date in these answers',
      because: 'Without dependents or a mortgage term, nothing here says when the need stops, ' +
        'which is the question to settle before choosing a period.',
    })
  }

  if (affordable !== null && affordable > 0 && assessment.recommended / (affordable * 12) > 2000) {
    out.push({
      point: 'The amount is large against what you said is comfortable',
      because: `${money(assessment.recommended)} is a lot of cover relative to ${money(affordable)} ` +
        'a month. Cover you keep paying for is worth more than cover you cancel, so a smaller ' +
        'amount you can sustain is worth considering.',
    })
  }

  if (existing > 0) {
    out.push({
      point: 'You already hold cover',
      because: `${money(existing)} is already subtracted above. Employer cover often ends when the ` +
        'job does, which is worth checking before relying on it for the whole horizon.',
    })
  }

  if ((answers.dependents ?? []).length > 1) {
    out.push({
      point: 'More than one person depends on you',
      because: 'The horizon above is set by the youngest, so the older dependents are covered ' +
        'for longer than they strictly need and the youngest sets the cost.',
    })
  }

  return out
}
