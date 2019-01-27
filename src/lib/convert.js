import convertUnits from 'css-unit-converter';

import { isCompatibleTypes, ABSOLUTE_LENGTH_UNITS } from './hepler';

function convertNodes(left, right, precision) {
  switch (left.type) {
    case 'Length':
      if (ABSOLUTE_LENGTH_UNITS.includes(left.unit)) {
        return convertAbsoluteLength(left, right, precision);
      }
      break;
    case 'Angle':
    case 'Time':
    case 'Frequency':
    case 'Resolution':
      return convertAbsoluteLength(left, right, precision);
    default:
  }
  return { left, right };
}

function convertAbsoluteLength(left, right, precision) {
  if (isCompatibleTypes(right, left)) {
    right = {
      type: left.type,
      value: convertUnits(right.value, right.unit, left.unit, precision),
      unit: left.unit,
    };
  }
  return { left, right };
}

export default convertNodes;
