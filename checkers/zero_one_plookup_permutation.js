const latchRegex = /\.(is|last|first|sel|in|set|latch).+/i;

async function zeroOnePlookupPermutation(piller) {
    //filter latter polynomials based on the regex
    let latchers = piller.filterPolWithRegex(latchRegex, piller.commitedPols);
    //console.log("Latch polynomials found: ", Object.keys(latchers).length, " : ", latchers);

    let emulated = await piller.createEmulatedExpression(`
    pol commit A;
    A * (1-A) = 0;
    (1-A)*A = 0;
    `);

    let zeroOnesExpr = piller.filterEmulatedExpressions(emulated);
    let zeroOnesPols = piller.getPolNamesFromExpressions(zeroOnesExpr);

    let difference = Object.keys(latchers).filter(x => !zeroOnesPols.includes(x));

    //console.log("POLYNOMIALS THAT DONT HAVE ZERO-ONE CONSTRAINTS! : ", difference);


    //taint all the polynomials from the left side of plookups
    let plookupLeftIds = piller.getPlookupLeftExpressions();
    let taintedCommitedPols = piller.getTaintedCommitedPolsFromExpressions(plookupLeftIds, 2); //TODO rethink the level

    difference = difference.filter(x => !Object.keys(taintedCommitedPols).includes(x));

    //taint all the polynomials from the left side of permutations
    let permLeftIds = piller.getPermutationLeftExpressions();
    let taintedPermCommitedPols = piller.getTaintedCommitedPolsFromExpressions(permLeftIds, 2);

    difference = difference.filter(x => !Object.keys(taintedPermCommitedPols).includes(x));

    console.log("Final polynomials that dont have 0/1 constraints and dont have plookups or permutations:", difference);

}

module.exports = zeroOnePlookupPermutation;