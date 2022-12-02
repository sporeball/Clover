/**
 * is token equal to some value?
 * @param {string} value
 */
export function is (value) {
  return (tk) => {
    if (tk !== value) {
      throw new Error(`expected token '${value}', got '${tk}' instead`);
    }
    return true;
  };
}

/**
 * verify that something is true about a token
 * removes the token afterwards
 * @param {string[]} tk entire token stream
 * @param {Function} cb condition to test
 */
export function assert (tk, cb) {
  cb(tk.shift());
}

/**
 * run code based on a list of options for a token
 * removes the token afterwards
 * @param {string[]} tk entire token stream
 * @param {object} obj options object
 */
export function option (tk, obj) {
  tk = tk.shift();
  if (!(tk in obj)) {
    throw new Error(`token '${tk}' is invalid here`);
  }
  obj[tk]();
}
