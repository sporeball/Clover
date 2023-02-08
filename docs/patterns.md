## aeiou
**Type:** `Pattern`\
**Flower type:** `char`\
**Returns:** `boolean`

Return whether a flower is a vowel (`a`, `e`, `i`, `o`, or `u`).

## aeiouy
**Type:** `Pattern`\
**Flower type:** `char`\
**Returns:** `boolean`

Return whether a flower is a vowel (`a`, `e`, `i`, `o`, or `u`) or `y`.

## all
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `boolean`

Return whether every element of a flower passes a condition.

#### conditionCommand
Type: `command`

## any
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `boolean`

Return whether any element of a flower passes a condition.

#### conditionCommand
Type: `command`

## append
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Append a value to a flower.

#### appendValue
Type: `any`

## apply
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Run a command on each element of a flower.

#### command
Type: `command`

## applyto
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Run a command on each element of a flower for which a condition is true.

#### conditionCommand
Type: `command`
#### command
Type: `command`

## blocks
**Type:** `Pattern`\
**Flower type:** `string`\
**Returns:** `string[][]`

Split a flower by blocks (`\n\n`), then split each block by lines (`\n`).

## cast
**Type:** `Pattern`\
**Flower type:** `number|string`\
**Returns:** `number|string`

Cast a flower from a number to a string, or vice-versa.\
Throws if this yields an invalid result.

## count
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `number`

Count occurrences of a value in a flower.

#### searchValue
Type: `any`

## crush
**Type:** `PlantPattern`

Reduce a plant to just one leaf, by running a command on an array containing all of its flowers.

#### command
Type: `command`

### Examples
```lua
focus [1 2 3 4 5]
itemize
crush (sum)
-- { flower = 15 }
```

## divisible
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return whether a flower is divisible by a number.

#### divisor
Type: `number`

## eq
**Type:** `Pattern`\
**Flower type:** `any`\
**Returns:** `boolean`

Return whether a flower is equal to a value.

#### cmpValue
Type: `any`

## even
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return whether a flower is even.

## filter
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Remove occurrences of a value from a flower.

#### filterValue
Type: `any`

## flatten
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Flatten a flower.

## focus
**Type:** `Pattern`

Set a flower equal to another value.

#### focusValue
Type: `any`

## foreach
**Type:** `Pattern`

Run a command on a flower multiple times, and replace the flower with an array of the results.\
Performs arg substitution.

#### list
Type: `list`
#### command
Type: `command`

### Examples
```lua
focus 5
foreach [1 2 3] (plus *)
-- { flower = [6, 7, 8] }
```

## groups
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Split a flower into groups of up to n values.

#### size
Type: `number`

### Examples
```lua
focus [1 2 3 4 5]
groups 2
-- { flower = [[1, 2], [3, 4], [5]] }
```

## gt
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return whether a flower is greater than a value.

#### cmpValue
Type: `number`

## gte
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return whether a flower is greater than or equal to a value.

#### cmpValue
Type: `number`

## itemize
**Type:** `PlantPattern`

Take a plant with a single array-type flower, and use its elements as the leaves of a new plant.

### Examples
```lua
focus [1 2 3]
itemize
-- { flower = 1 }, { flower = 2 }, { flower = 3 }
```

## last
**Type:** `Pattern`\
**Flower type:** `any`\
**Returns:** `any`

Return the last element of a flower.\
Returns the flower itself if it is not an array.

## lazy
**Type:** `PlantPattern`

Convert a plant into a lazy plant, with known terms taken from the original, and further terms calculated as needed using the result of a command.\
Use `take` to get more terms.

#### command
Type: `command`

## lines
**Type:** `Pattern`\
**Flower type:** `string`\
**Returns:** `string[]`

Split a flower by lines (`\n`).

## lower
**Type:** `Pattern`\
**Flower type:** `char|string`\
**Returns:** `char|string`

Lowercase a flower.

## lt
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return whether a flower is less than a value.

#### cmpValue
Type: `number`

## lte
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return whether a flower is less than or equal to a value.

#### cmpValue
Type: `number`

## maximum
**Type:** `Pattern`\
**Flower type:** `number[]`\
**Returns:** `number`

Return the highest number in a flower.

## minimum
**Type:** `Pattern`\
**Flower type:** `number[]`\
**Returns:** `number`

Return the lowest number in a flower.

## minus
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `number`

Subtract from a flower.

#### subtrahend
Type: `number`

## mod
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `number`

Return a flower mod n.

#### argument
Type: `number`

## odd
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return whether a flower is odd.

## over
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `number`

Divide a flower.

#### divisor
Type: `number`

## pluck
**Type:** `PlantPattern`

Remove leaves from a plant for which a command is false.

#### command
Type: `command`

### Examples
```lua
flowers [1 2 3 4 5]
pluck (odd)
-- { flower = 2 }, { flower = 4 }
```

## plus
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `number`

Add to a flower.

#### addend
Type: `number`

## prepend
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Prepend a value to a flower.

#### prependValue
Type: `any`

## prime
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return if a flower is prime.

## product
**Type:** `Pattern`\
**Flower type:** `number[]`\
**Returns:** `number`

Return the product of a flower.

## replace
**Type:** `Pattern`\
**Flower type:** `any`\
**Returns:** `any`

If a flower matches one value, replace it with another.

#### matchValue
Type: `any`
#### replacementValue
Type: `any`

## rld
**Type:** `Pattern`\
**Flower type:** `string`\
**Returns:** `string`

Run-length decode a string.

## sort
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Sort a flower.

## split
**Type:** `Pattern`\
**Flower type:** `string`\
**Returns:** `string[]`

String split a flower.

#### splitter
Type: `char|string`

## stop
**Type:** `PlantPattern`

Stop execution early.

## sum
**Type:** `Pattern`\
**Flower type:** `number[]`\
**Returns:** `number`

Return the sum of a flower.

## take
**Type:** `PlantPattern`

Yield the first n terms of a lazy plant.\
Skips known terms and uses the plant's command to generate unknown terms.\
Performs arg substitution.

#### n
Type: `number`

## times
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `number`

Multiply a flower.

#### multiplier
Type: `number`

## to
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `number[]`

Return a range between a flower and another number.\
If applicable, the range will count down.

#### end
Type: `number`

## unique
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Return unique elements of a flower.

## until
**Type:** `Pattern`\
**Flower type:** `any`\
**Returns:** `any`

Repeatedly run one command on a flower until another command returns true.

#### conditionCommand
Type: `command`
#### command
Type: `command`

## upper
**Type:** `Pattern`\
**Flower type:** `char|string`\
**Returns:** `char|string`

Uppercase a flower.

## using
**Type:** `Pattern`\
**Flower type:** `any`

Replace a flower with the result of a command run on a different value.

#### otherValue
Type: `any`
#### command
Type: `command`

### Examples
```lua
flowers [1]
using [4 5 6] (sum)
-- { flower = 15 }
```

## zip
**Type:** `Pattern`\
**Flower type:** `list`\
**Returns:** `list`

Zip two arrays together.

#### seconds
Type: `list`

