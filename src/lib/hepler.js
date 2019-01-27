// https://drafts.csswg.org/css-values-3/#absolute-lengths
export const ABSOLUTE_LENGTH_UNITS = [
  'cm',
  'mm',
  // 'Q', // unsupported css-unit-converter
  'in',
  'pt',
  'pc',
  'px'
]

export function isCompatibleTypes(left, right) {
  if (left.type !== right.type) {
    return false
  }
  if (left.type === "Length") {
    if (left.unit === right.unit) {
      return true
    }
    return (
      ABSOLUTE_LENGTH_UNITS.includes(left.unit) &&
      ABSOLUTE_LENGTH_UNITS.includes(right.unit)
    )
  }
  return true;
}
