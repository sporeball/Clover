export function accesses (mut, type) {
  if (Clover.mutables[mut] !== undefined) {
    return;
  }
  switch (type) {
    case 'number':
      Clover.mutables[mut] = 0;
      break;
    case 'string':
      Clover.mutables[mut] = '';
      break;
  }
}
