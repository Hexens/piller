const latchRegex = /(\.(is|last|first|sel|latch))/i;

async function zeroOne(piller) {
    return;
    //filter latcher polynomials based on the regex
    let targetPols = Object.assign({}, piller.commitedPols, piller.intermediatePols);
    let latchers = piller.filterPolWithRegex(latchRegex, targetPols);


    //we emulate the expression that we want to find:
    //      A * (1-A) = 0
    //      (A-1) * A = 0
    //...
    //keep in mind that MUL and ADD operations will be checked loosely:
    //      A * (1-A) = (1-A) * A
    //      (A-1) * A = A * (A-1)
    let emulated = await piller.createEmulatedExpression(`
    pol commit A;
    A * (1-A) = 0;
    A * (A-1) = 0;
    `);

    //get expressions that correspond to emulated constraints
    let zeroOnesExpr = piller.filterEmulatedExpressions(emulated, null, true);

    //get polynomial names from the expressions
    let zeroOnesPols = piller.getPolNamesFromExpressions(zeroOnesExpr);


    let difference = Object.keys(latchers).filter(x => !zeroOnesPols.includes(x));

    console.log("Final polynomials that dont have 0/1 constraints: ", difference);

}

module.exports = zeroOne;