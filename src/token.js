import reserved from '../util/reserved.js';

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
 * return the type of a value
 * works with Tokens and with primitive values
 * @param {*} v
 */
export function typeOf (v) {
  let value = v; // true value to work with
  if (v instanceof Token.Token) {
    value = value.value; // haha...
  }
  if (value === undefined) {
    return 'none';
  }
  if (reserved.includes(value)) {
    return 'reserved';
  }
  if (matches(value, /:(0|[1-9]\d*)$/)) {
    return 'index';
  }
  if (
    Array.isArray(value) ||
    matches(value, /^\[.*\]$/)
  ) {
    return 'array';
  }
  if (
    typeof value === 'number' ||
    (typeof value === 'string' && value !== '' && !isNaN(Number(value)))
  ) {
    return 'number';
  }
  if (matches(value, /^'.*'$/)) {
    return 'string';
  }
  if (typeof value === 'string') {
    if (value.startsWith(':')) {
      return 'mutable';
    }
    return 'string';
  }
  return 'other';
}

/**
 * cast a value to a primitive JavaScript type
 * does not mutate the original value
 * @param {*} v
 * @returns {number|string}
 */
// TODO: automatic and manual
export function cast (v) {
  let value = v; // true value to work with
  if (v instanceof Token.Token) {
    value = value.value; // haha...
  }
  const T = typeOf(value);
  if (T === 'index') {
    const index = Number(value.slice(value.lastIndexOf(':') + 1));
    value = value.slice(0, value.lastIndexOf(':'));
    if (typeOf(value) === 'mutable' && Clover.mutables[value] === undefined) {
      throw new CloverError(
        'cannot index %s before initialization',
        value
      );
    }
    return cast(value)[index];
  }
  if (T === 'array') {
    if (Array.isArray(value)) {
      return value;
    }
    return value.slice(1, -1)
      .split(' ')
      .map(x => cast(x));
  }
  if (T === 'number') {
    return Number(value);
  }
  if (T === 'string') {
    value = value.replace(/\\n/g, '\n');
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1); // remove
    }
    return value;
  }
  if (T === 'mutable') {
    return Clover.mutables[value];
  }
  return value;
}

/**
 * return the format specifier that matches a token value
 * supported specifiers include:
 *   %n  number
 *   %s  string
 *   %r  reserved word
 *   %m  mutable
 *       (understood to be some other unqualified word)
 *   %a  any
 * @param {*} value
 */
function specifier (value) {
  const T = typeOf(value);
  // console.log(value, T);
  if (T === 'reserved') {
    return '%r';
  }
  if (T === 'array') {
    return '%l'; // for "list"
  }
  if (T === 'number') {
    return '%n';
  }
  if (T === 'string') {
    return '%s';
  }
  if (T === 'mutable') {
    return '%m';
  }
  return '%a';
}

// default object
const Token = {
  /**
   * class representing a token
   */
  Token: class Token {
    /**
     * @param {*} value
     */
    constructor (value) {
      this.value = value;
      this.specifier = specifier(value);
    }
  },
  assertAny (value, values) {
    if (!any(value, values)) {
      throw new CloverError(
        'expected one of %t, got %t instead', values, value
      );
    }
    return this;
  },
  assertDefined (value) {
    if (!defined(value)) {
      throw new CloverError("expected a token, but didn't get one");
    }
  },
  assertEqual (v1, v2) {
    if (!equal(v1, v2)) {
      throw new CloverError(
        'expected token %t, got %t instead', v1, v2
      );
    }
    return this;
  },
  assertMatches (value, regexp) {
    if (!matches(value, regexp)) {
      throw new CloverError('token %t does not match regex', value);
    }
    return this;
  },
  assertType (value, T) {
    const t = typeOf(value);
    if (t !== T) {
      throw new CloverError(
        'expected token of type %s, got %s instead', T, t
      );
    }
    return this;
  }
};

export default Token;
