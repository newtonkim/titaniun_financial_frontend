const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
const SCALES: [number, string][] = [
  [1_000_000_000_000, 'trillion'],
  [1_000_000_000, 'billion'],
  [1_000_000, 'million'],
  [1_000, 'thousand'],
]

function belowThousand(value: number): string {
  const hundreds = Math.floor(value / 100)
  const rest = value % 100
  const tens = rest < 20 ? ONES[rest] : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? `-${ONES[rest % 10]}` : ''}`
  return [hundreds ? `${ONES[hundreds]} hundred` : '', tens].filter(Boolean).join(' and ')
}

function wholeInWords(value: number): string {
  if (value === 0) return 'zero'
  const parts: string[] = []
  let remaining = value
  for (const [size, name] of SCALES) {
    if (remaining >= size) {
      parts.push(`${belowThousand(Math.floor(remaining / size))} ${name}`)
      remaining %= size
    }
  }
  if (remaining) parts.push(belowThousand(remaining))
  return parts.join(' ')
}

/** "Ninety six thousand shillings only", as written on a receipt. Cents are added when there are any. */
export function amountInWords(value: string | number): string {
  const [whole = '0', cents = '00'] = Number(value).toFixed(2).split('.')
  const words = `${wholeInWords(Number(whole))} shillings${Number(cents) ? ` and ${wholeInWords(Number(cents))} cents` : ''} only`
  return words.charAt(0).toUpperCase() + words.slice(1)
}
