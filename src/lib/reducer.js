import convert from './convert';
import { isCompatibleTypes } from './hepler';

function reduce(node, precision) {
  if (node.type === "MathExpression")
    return reduceMathExpression(node, precision);
  if (node.type === "Root" || node.type === "Parentheses")
    return reduceContainer(node, precision);
  if (node.type === "Function" && /^(-(webkit|moz)-)?calc$/i.test(node.name))
    return reduceContainer(node, precision);

  return node;
}

function reduceContainer(node, precision) {
  if (node.nodes.length === 1)
    return reduce(node.nodes[0], precision);

  return node;
}

function isEqual(left, right) {
  return isCompatibleTypes(left, right) && left.value === right.value;
}

function isValueType(type) {
  switch (type) {
    case "Number":
    case "Length":
    case "Angle":
    case "Time":
    case "Frequency":
    case "Resolution":
    case "Percentage":
    case "Flex":
      return true;
  }
  return false;
}

function convertMathExpression(node, precision) {
  let nodes = convert(node.left, node.right, precision);
  let left = reduce(nodes.left, precision);
  let right = reduce(nodes.right, precision);

  if (left.type === "MathExpression" && right.type === "MathExpression") {

    if (((left.operator === '/' && right.operator === '*') ||
      (left.operator === '-' && right.operator === '+')) ||
      ((left.operator === '*' && right.operator === '/') ||
      (left.operator === '+' && right.operator === '-'))) {

      if (isEqual(left.right, right.right))
        nodes = convert(left.left, right.left, precision);

      else if (isEqual(left.right, right.left))
        nodes = convert(left.left, right.right, precision);

      left = reduce(nodes.left, precision);
      right = reduce(nodes.right, precision);

    }
  }

  node.left = left;
  node.right = right;
  return node;
}

function flip(operator) {
  return operator === '+' ? '-' : '+';
}

function flipValue(node) {
  if (isValueType(node.type))
    node.value = -node.value;
  else if (node.type === 'MathExpression') {
    node.left = flipValue(node.left);
    node.right = flipValue(node.right);
  }
  return node;
}

function reduceAddSubExpression(node, precision) {
  const {left, right, operator: op} = node;

  if ((!isValueType(left.type) && left.type !== 'MathExpression') ||
    (!isValueType(right.type) && right.type !== 'MathExpression'))
    return node;

  // something + 0 => something
  // something - 0 => something
  if (right.value === 0)
    return left;

  // 0 + something => something
  if (left.value === 0 && op === "+")
    return right;

  // 0 - something => -something
  if (left.value === 0 && op === "-")
    return flipValue(right);

  // value + value
  // value - value
  if (isCompatibleTypes(left, right) && isValueType(left.type)) {
    node = Object.assign({ }, left);
    if (op === "+")
      node.value = left.value + right.value;
    else
      node.value = left.value - right.value;
  }

    // value <op> (expr)
  if (
        isValueType(left.type) &&
    (right.operator === '+' || right.operator === '-') &&
    right.type === 'MathExpression'
  ) {
    // value + (value + something) => (value + value) + something
    // value + (value - something) => (value + value) - something
    // value - (value + something) => (value - value) - something
    // value - (value - something) => (value - value) + something
    if (isCompatibleTypes(left, right.left)) {
      node = Object.assign({ }, node);
      node.left = reduce({
        type: 'MathExpression',
        operator: op,
        left: left,
        right: right.left
      }, precision);
      node.right = right.right;
            node.operator = op === '-' ? flip(right.operator) : right.operator;
      return reduce(node, precision);
    }
    // value + (something + value) => (value + value) + something
    // value + (something - value) => (value - value) + something
    // value - (something + value) => (value - value) - something
    // value - (something - value) => (value + value) - something
    else if (isCompatibleTypes(left, right.right)) {
      node = Object.assign({ }, node);
      node.left = reduce({
        type: 'MathExpression',
        operator: op === '-' ? flip(right.operator) : right.operator,
        left: left,
        right: right.right
      }, precision);
      node.right = right.left;
      return reduce(node, precision);
        }
        // value - (something + something) => value - something - something
        else if (op === '-' && right.operator === '+') {
            node = Object.assign({ }, node);
            node.right.operator = '-';
      return reduce(node, precision);
        }
  }

  // (expr) <op> value
  if (
        left.type === 'MathExpression' &&
    (left.operator === '+' || left.operator === '-') &&
    isValueType(right.type)
  ) {
    // (value + something) + value => (value + value) + something
    // (value - something) + value => (value + value) - something
    // (value + something) - value => (value - value) + something
    // (value - something) - value => (value - value) - something
    if (isCompatibleTypes(right, left.left)) {
      node = Object.assign({ }, left);
      node.left = reduce({
        type: 'MathExpression',
        operator: op,
        left: left.left,
        right: right
      }, precision);
      return reduce(node, precision);
    }
    // (something + value) + value => something + (value + value)
    // (something - value1) + value2 => something - (value2 - value1)
    // (something + value) - value => something + (value - value)
    // (something - value) - value => something - (value + value)
    else if (isCompatibleTypes(right, left.right)) {
      node = Object.assign({ }, left);
      if (left.operator === '-') {
        node.right = reduce({
          type: 'MathExpression',
          operator: flip(op),
                    left: left.right,
                    right: right
                }, precision);
                if (node.right.value && node.right.value < 0) {
                    node.right.value = Math.abs(node.right.value);
                    node.operator = '+';
                } else {
                    node.operator = left.operator;
                }
      }
      else {
        node.right = reduce({
          type: 'MathExpression',
          operator: op,
          left: left.right,
          right: right
        }, precision);
      }
      if (node.right.value < 0) {
        node.right.value *= -1;
        node.operator = node.operator === '-' ? '+' : '-';
      }
      return reduce(node, precision);
    }
    }

    if (
        left.type === 'MathExpression' && right.type === 'MathExpression' &&
        op === '-' && right.operator === '-'
    ) {
        node.right.operator = flip(node.right.operator);
    }
  return node;
}

function reduceDivisionExpression(node) {
  if (!isValueType(node.right.type))
    return node;

  if (node.right.type !== 'Number')
    throw new Error(`Cannot divide by "${node.right.unit}", number expected`);

  if (node.right.value === 0)
    throw new Error('Cannot divide by zero');

  // something / value
  if (isValueType(node.left.type)) {
    node.left.value /= node.right.value;
    return node.left;
  }
  return node;
}

function reduceMultiplicationExpression(node) {
  // (expr) * value
  if (node.left.type === 'MathExpression' && node.right.type === 'Number') {
    if (
      isValueType(node.left.left.type) &&
      isValueType(node.left.right.type)
    ) {
      node.left.left.value *= node.right.value;
      node.left.right.value *= node.right.value;
      return node.left;
    }
  }
  // something * value
  else if (isValueType(node.left.type) && node.right.type === 'Number') {
    node.left.value *= node.right.value;
    return node.left;
  }
  // value * (expr)
  else if (node.left.type === 'Number' && node.right.type === 'MathExpression') {
    if (
      isValueType(node.right.left.type) &&
      isValueType(node.right.right.type)
    ) {
      node.right.left.value *= node.left.value;
      node.right.right.value *= node.left.value;
      return node.right;
    }
  }
  // value * something
  else if (node.left.type === 'Number' && isValueType(node.right.type)) {
    node.right.value *= node.left.value;
    return node.right;
  }
  return node;
}

function reduceMathExpression(node, precision) {
  node = convertMathExpression(node, precision);

  switch (node.operator) {
    case "+":
    case "-":
      return reduceAddSubExpression(node, precision);
    case "/":
      return reduceDivisionExpression(node, precision);
    case "*":
      return reduceMultiplicationExpression(node);
  }
  return node;
}

export default reduce;
