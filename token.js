/**
 * return whether a token is equal to a value
 * assertable
 * @param {string} value
 */
export function equals (value) {
  return function (token = Clover.head) {
    const success = token === value;
    return {
      success,
      self_emsg: `expected token '${value}', got '${token}' instead`
    };
  };
}

/**
 * return whether a token is equal to one of multiple passed values
 * assertable
 * @param {...string} values
 */
export function any (...values) {
  return function (token = Clover.head) {
    const success = values.includes(token);
    return {
      success,
      self_emsg: `expected one of [${values.map(v => `'${v}'`).join(', ')}], got '${token}' instead`
    };
  };
}

/**
 * return whether a token matches a regular expression
 * assertable
 * @param {RegExp} regexp
 */
export function matches (regexp) {
  return function (token = Clover.head) {
    const success = token.match(regexp) !== null;
    return {
      success,
      self_emsg: `token '${token}' does not match regex`
    };
  };
}

// default object
// import with the name Token
export default {
  /**
   * set the current token stream
   * updates relevant values in Clover object
   * @param {string[]} tkstream
   */
  setStream(tkstream) {
    Clover.tkstream = tkstream;
    Clover.head = tkstream[0];
  },
  /**
   * verify that something is true
   * requires an assertable function
   * throws the associated error message if the assertion returns false
   * chainable
   * @param {*} cb a call to an assertable function
   */
  assert(cb) {
    if (cb.success === false) {
      throw new Error(cb.self_emsg);
    }
    return this;
  },
  /**
   * move on to the next token of the current token stream
   * chainable
   */
  next() {
    Clover.prev = Clover.tkstream.shift();
    Clover.head = Clover.tkstream[0];
    return this;
  },
  /**
   * syntactic sugar
   * chainable
   */
  then() {
    this.next();
    return this;
  },
  /**
   * syntactic sugar
   * chainable
   */
  drop() {
    this.next();
    return this;
  },
  /**
   * cast the current token from a raw string to something else
   * @returns {number|string}
   */
  cast() {
    // number
    if (matches(/^0$|^-?[1-9][0-9]*$/)().success) {
      return Number(Clover.head);
    }
    return Clover.head;
  }
};
