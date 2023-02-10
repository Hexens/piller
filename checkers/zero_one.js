const latchRegex = /\.(is)[a-zA-Z]+/;

async function zeroOne(piller) {
    //filter latcher polynomials based on the regex
    let latchers = piller.filterPolWithRegex(latchRegex, piller.commitedPols);

    //console.log("Latch polynomials found: ", Object.keys(latchers).length, " : ", latchers);


    //we emulate the expression that we want to find:
    //      A * (1-A) = 0
    //      (1-A) * A = 0
    //...
    let emulated = await piller.createEmulatedExpression(`
    pol commit A;
    A * (1-A) = 0;
    (1-A)*A = 0;
    A * (A-1) = 0;
    (A-1) * A = 0;
    `);

    //get expressions that correspond to emulated constraints
    let zeroOnesExpr = piller.filterExpressionsEmulated(emulated);

    //get polynomial names from the expressions
    let zeroOnesPols = piller.getPolNamesFromExpressions(zeroOnesExpr);


    let difference = Object.keys(latchers).filter(x => !zeroOnesPols.includes(x));

    console.log("Final polynomials that dont have 0/1 constraints: ", difference);

}

module.exports = zeroOne;