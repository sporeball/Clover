import colors from 'picocolors';

/**
 * return whether a value is equal to one of multiple passed values
 * @param {*} value the value to check
 * @param {*[]} values array of valid values
 */
export function any (value, values) {
  return values.includes(value);
}

/**
 * @param {*} value
 */
export function defined (value) {
  return value !== undefined;
}

/**
 * return whether one value is equal to another
 * @param {*} v1
 * @param {*} v2
 */
export function equal (v1, v2) {
  return v1 === v2;
}

/**
 * return whether a value matches a regular expression
 * @param {*} value
 * @param {RegExp} regexp
 */
export function matches (value, regexp) {
  return typeof value === 'string' && value.match(regexp) !== null;
}

/**
 * manipulate a value, and return it for pretty printing
 * this mostly means giving it a bit of color
 * @param {*} value
 * @returns {string}
 */
export function pretty (value) {
  // undefined
  if (value === undefined) {
    return colors.yellow('(undefined!)');
  // number
  } else if (Number.isInteger(value)) {
    return colors.cyan(value);
  // string
  } else if (typeof value === 'string') {
    if (value.length === 0) {
      return colors.gray("''");
    }
    return colors.cyan(`'${value.replace(/\n/g, colors.yellow('\\n'))}'`);
  // array
  } else if (Array.isArray(value)) {
    if (value[0].working !== undefined) {
      return pretty(value[0]) +
        (value.length > 1
          ? `,\n${colors.cyan(`... (${value.length - 1} more)`)}`
          : ''
        );
    } else {
      return `[${colors.cyan(value.map(i => {
        return pretty(i);
      }).join(colors.white(', ')))}]`;
    }
  } else if (value.working !== undefined) {
    return '{\n  ' +
      Object.entries(value).map(entry => {
        const [k, v] = entry;
        if (k === 'input') {
          return undefined;
        }
        return `${k.startsWith(':') ? colors.yellow(k) : k} = ${pretty(v)}`;
      }).filter(v => v).join(',\n  ') +
      '\n}';
  // CloverError
  } else if (value.constructor?.name === 'CloverError') {
    return `${colors.red('e:')} ${value.message}
${colors.cyan(`   (line ${Clover.line})`)}`;
  // uncaught error
  } else if (value instanceof Error) {
    return `${colors.red('e:')} ${value.message} ${colors.red('(uncaught!)')}
${colors.gray(value.stack.split('\n').slice(1).join('\n'))}`;
  }
}

/**
 * pretty print a value
 * @param {*} value
 */
export function pprint (value) {
  console.log(pretty(value));
}

/**
 * perform string substitution with format specifiers
 * supported specifiers include:
 *   %s  plain string
 *   %t  Clover token
 * @param {string} str
 * @param {...*} subs values to substitute in
 */
export function format (str, ...subs) {
  (str.match(/%./gm) || []).forEach((match, index) => {
    if (match === '%s') {
      if (subs[index] !== undefined) {
        str = str.replace(match, subs[index]);
      }
    } else if (match === '%t') {
      str = str.replace(match, pretty(subs[index]));
    }
  });
  return str;
}

/**
 * cause Clover to output a value
 * updates Clover.outputs
 * @param {*} value
 */
export function output (value) {
  Clover.outputs.push(value);
  if (!Clover.options.silent) {
    pprint(value);
  }
}

/**
 * escape special characters in a string
 * useful anywhere that `String.prototype.match` is being used
 * @param {string} str
 */
export function escape (str) {
  return str.replace(/[.*+?^$()[\]{}|\\]/g, match => '\\' + match);
}

export function arrayDepth (arr) {
  return Array.isArray(arr)
    ? 1 + Math.max(0, ...arr.map(arrayDepth))
    : 0;
}
