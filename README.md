# Piller
is a static analysis framework for Polynomial Identity Language (PIL) used in zkEVM for defining state machines.

## Usage
arguments: `piller <main.pil>`

example: `node index.js rom/main.pil`

or simply:

`./index.js rom/main.pil`

## Features
Piller gives ability to write custom checkers and use the API that provides with all the data that can be obtained through compiler and additionally:
* Parsed expression and polynomial maps that contain reference data between each of them
* Get polynomials by their type (committed, constant, intermediate)
* Filtering the polynomials with regex
* Get specific type of expressions (e.g. EXPR = 0, EXPR = 1 etc.)
* Find expressions based on a template PIL emulation:

Example: 

To find all the binary constraint expressions

`A * (1-A) = 0`

You can use:
```javascript
let emulated = await piller.createEmulatedExpression(`
    pol commit A;
    A * (1-A) = 0;
    `);
let zeroOnesExpr = piller.filterEmulatedExpressions(
    emulated,
    null /*filter from all the expression, otherwise specify manual set*/,
    true /*strict-mode*/);
```

* Get commited polynomials tainted from expressions:

```
let taintedCommitedPols = piller.getTaintedCommitedPolsFromExpressions(zeroOnesExpr);
```

Will return the list of commited polynomials that sink into any of the given expressions.

## Checkers
Current list of checkers for different PIL constraints:
* Zero/One (binary) constraints
* Inverse constraints checker 
* Plookup/Permutation selectors constraints checker (to have 0/1 constriants)
* Plookup/Permutation selectors constraints checker (to have 0/1 constriants or to sink into plookup/permuatation identities)
* Scraped SM executors for polynomials that evaluate to only 0/1, but don't have corresponding constraints in PIL.
* **(Disabled by default)** No strict check polynomials - returns polynomials that dont have restrictive checks implemented (like inverse, 0/1, or 1-2 level sink into permutation/plookup identities). This checker is disabled as the result is quite bogus and contains big number of false positives, and should be turned on only when needed to manually review all of the output

## Adding new checkers
Developing and adding new checkers is a straightforward process, add the Javascript module file to ```./checkers/``` folder and add the filename into ```./checkers/index.json``` file

## TODOs
* Improve the emulated PIL filtering (add the possiblity to match ALL of the identities, instead of just one of many)
* Add more API for Piller class
* Unify the checkers inputs and outputs (currently the checkers just console.log() whatever they find important to)
