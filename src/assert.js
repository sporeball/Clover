import { typeOf } from './token.js';
import { any, defined, equal, matches } from './util.js';

const assert = {
  any (value, values) {
    if (!any(value, values)) {
      throw new CloverError(
        'expected one of %t, got %t instead', values, value
      );
    }
  },
  defined (value) {
    if (!defined(value)) {
      throw new CloverError("expected a token, but didn't get one");
    }
  },
  equal (v1, v2) {
    if (!equal(v1, v2)) {
      throw new CloverError(
        'expected token %t, got %t instead', v1, v2
      );
    }
  },
  matches (value, regexp) {
    if (!matches(value, regexp)) {
      throw new CloverError('token %t does not match regex', value);
    }
    return this;
  },
  type (value, T) {
    const t = typeOf(value);
    if (t !== T) {
      throw new CloverError(
        'expected token of type %s, got %s instead', T, t
      );
    }
  }
};

export default assert;
