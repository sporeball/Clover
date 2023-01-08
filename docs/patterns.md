## apply
**Type:** `Pattern`\
**Flower type:** `array`\
**Returns:** `array`

Run a command on each element of a flower.

#### command
Type: `command`

## count
**Type:** `Pattern`\
**Flower type:** `array|string`\
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
itemize naturals
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

## even
**Type:** `Pattern`\
**Flower type:** `number`\
**Returns:** `boolean`

Return whether a flower is even.

## filter
**Type:** `Pattern`\
**Flower type:** `array`\
**Returns:** `array`

Remove occurrences of a value from a flower.

#### filterValue
Type: `any`

## flatten
**Type:** `Pattern`\
**Flower type:** `array`\
**Returns:** `array`

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
Type: `array`
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
**Flower type:** `array`\
**Returns:** `array`

Split a flower into groups of up to n values.

#### size
Type: `number`

### Examples
```lua
focus [1 2 3 4 5]
groups 2
-- { flower = [[1, 2], [3, 4], [5]] }
```

## itemize
**Type:** `PlantPattern`

Take a plant with a single array-type flower, and use its elements as the leaves of a new plant, with a mutable set on each.

#### dest
Type: `string`

### Examples
```lua
focus [1 2 3]
itemize naturals
-- { flower = 1, natural = 1 }, ...
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

## maximum
**Type:** `Pattern`\
**Flower type:** `array`\
**Returns:** `number`

Return the highest number which is an element of a flower.

## minimum
**Type:** `Pattern`\
**Flower type:** `array`\
**Returns:** `number`

Return the lowest number which is an element of a flower.

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

## product
**Type:** `Pattern`\
**Flower type:** `array`\
**Returns:** `number`

Return the product of all numbers in a flower.

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
**Flower type:** `array[]`\
**Returns:** `array`

Array run-length decode.

## sort
**Type:** `Pattern`\
**Flower type:** `array`\
**Returns:** `array`

Sort a flower.

## split
**Type:** `Pattern`\
**Flower type:** `string`\
**Returns:** `string[]`

String split a flower.

#### splitter
Type: `string`

## stop
**Type:** `PlantPattern`

Stop execution early.

## sum
**Type:** `Pattern`\
**Flower type:** `array`\
**Returns:** `number`

Return the sum of all numbers in a flower.

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
**Returns:** `array`

Return a range between a flower and another number.\
If applicable, the range will count down.

#### end
Type: `number`

## unique
**Type:** `Pattern`\
**Flower type:** `array|string`\
**Returns:** `array`

Return unique elements of a flower.

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
**Flower type:** `array`\
**Returns:** `array`

Zip two arrays together.

#### seconds
Type: `array`

