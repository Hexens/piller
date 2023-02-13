const process = require('process');

async function permutationPlookupSelectorConstraints(piller) {
    let emulated = await piller.createEmulatedExpression(`
    pol commit A;
    A * (1-A) = 0;
    A * (A-1) = 0;
    `);

    //get expressions that correspond to emulated constraints
    let zeroOnesExpr = piller.filterEmulatedExpressions(emulated, null, true);

    //get polynomial names from the expressions
    let zeroOnesPols = piller.getPolNamesFromExpressions(zeroOnesExpr);


    //taint all the polynomials from the left side of plookups
    let plookupLeftIds = piller.getPlookupLeftSelectorExpressions();
    let taintedCommittedPols = piller.getPolNamesFromExpressions(plookupLeftIds); //TODO rethink the level

    let difference = taintedCommittedPols.filter(x => !zeroOnesPols.includes(x));
    difference = difference.filter(x => piller.commitedPolsNames.includes(x));

    console.log("All polynomials that are plookup selectors, but dont have 0/1 constraints : ", difference);


    //taint all the polynomials from the left side of permutations
    let permLeftIds = piller.getPermutationLeftSelectorExpressions();
    let taintedPermCommitedPols = piller.getPolNamesFromExpressions(permLeftIds);

    difference =  taintedPermCommitedPols.filter(x => !zeroOnesPols.includes(x));
    difference = difference.filter(x => piller.commitedPolsNames.includes(x));

    console.log("All polynomials that are permutation selectors, but dont have 0/1 constraints : ", difference);


}

module.exports = permutationPlookupSelectorConstraints;