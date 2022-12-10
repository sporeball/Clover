export function accesses (mutable, type) {
  if (Clover.mutables[mutable] !== undefined) {
    return;
  }
  switch (type) {
    case 'number':
      Clover.mutables[mutable] = 0;
      break;
    case 'string':
      Clover.mutables[mutable] = '';
      break;
  }
}
