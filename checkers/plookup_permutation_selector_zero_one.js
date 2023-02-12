const latchRegex = /\.(is|set|in)[a-zA-Z]+/;

async function plookupPermutationSelectorZeroOne(piller) {
    //taint all selector polynomials from the left side of plookups
    let plookupLeftSelectorIds = piller.getPlookupLeftSelectorExpressions();
    let permLeftSelectorIds = piller.getPermutationLeftSelectorExpressions();


    let targetSelectors = [].concat(plookupLeftSelectorIds)
    targetSelectors = targetSelectors.concat(permLeftSelectorIds);

    let taintedCommitedPols = piller.getTaintedCommitedPolsFromExpressions(targetSelectors, 2);


    let emulated = await piller.createEmulatedExpression(`
    pol commit A;
    A * (1-A) = 0;
    A * (A-1) = 0;
    `);

    //get expressions that correspond to emulated constraints
    let zeroOnesExpr = piller.filterEmulatedExpressions(emulated, null, true);

    //get polynomial names from the expressions
    let zeroOnesPols = piller.getPolNamesFromExpressions(zeroOnesExpr);


    let difference = Object.keys(taintedCommitedPols).filter(x => !zeroOnesPols.includes(x));


    //taint all the polynomials from the left side of plookups
    let plookupLeftIds = piller.getPlookupLeftExpressions();
    taintedCommitedPols = piller.getTaintedCommitedPolsFromExpressions(plookupLeftIds, 2); //TODO rethink the level

    difference = difference.filter(x => !Object.keys(taintedCommitedPols).includes(x));

    //taint all the polynomials from the left side of permutations
    let permLeftIds = piller.getPermutationLeftExpressions();
    let taintedPermCommitedPols = piller.getTaintedCommitedPolsFromExpressions(permLeftIds, 2);

    difference = difference.filter(x => !Object.keys(taintedPermCommitedPols).includes(x));


    console.log("Plookup/Permutation (left) selectors that dont have 0/1 constraints and dont have 1-level plookup/permutation constraints: ", difference);

}

module.exports = plookupPermutationSelectorZeroOne;