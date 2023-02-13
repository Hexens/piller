const process = require('process');

async function noStrictCheckPolynomials(piller) {
    return; //TODO: need to enable this manually, as the result is very bogus and needs verification
    let targetPolynomials = piller.commitedPolsNames;

    let emulated = await piller.createEmulatedExpression(`
    pol commit A;
    A * (1-A) = 0;
    A * (A-1) = 0;
    `);

    //get expressions that correspond to emulated constraints
    let zeroOnesExpr = piller.filterEmulatedExpressions(emulated, null, true);

    //get polynomial names from the expressions
    let zeroOnesPols = piller.getPolNamesFromExpressions(zeroOnesExpr);

    let difference = targetPolynomials.filter(x => !zeroOnesPols.includes(x));


    //taint all the polynomials from the left side of plookups
    let plookupLeftIds = piller.getPlookupLeftExpressions();
    let taintedCommittedPols = piller.getTaintedCommitedPolsFromExpressions(plookupLeftIds); //TODO rethink the level

    difference = difference.filter(x => !Object.keys(taintedCommittedPols).includes(x));

    //taint all the polynomials from the left side of permutations
    let permLeftIds = piller.getPermutationLeftExpressions();
    let taintedPermCommitedPols = piller.getTaintedCommitedPolsFromExpressions(permLeftIds);

    difference = difference.filter(x => !Object.keys(taintedPermCommitedPols).includes(x));

    //taint all the polynomials from the left side of connections
    let connLeftIds = piller.getConnectLeftExpressions();
    let taintedConnCommittedPols = piller.getTaintedCommitedPolsFromExpressions(connLeftIds);

    difference = difference.filter(x => !Object.keys(taintedConnCommittedPols).includes(x));


    console.log("All polynomials that dont have strict constraints (most likely a bigger list needed to review manually) : ");
    process.stdout.write(JSON.stringify(difference) + '\n');


}

module.exports = noStrictCheckPolynomials;