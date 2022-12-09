const Mutables = {};

export function accesses (mutable, type) {
  if (Mutables[mutable] !== undefined) {
    return;
  }
  switch (type) {
    case 'number':
      Mutables[mutable] = 0;
      break;
    case 'string':
      Mutables[mutable] = '';
      break;
  }
}

export default Mutables;
