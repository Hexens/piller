const latchRegex = /\.(is|set|in)[a-zA-Z]+/;

async function zeroOne(piller) {
    //filter latter polynomials based on the regex
    let latchers = piller.filterPolWithRegex(latchRegex, piller.commitedPols);
    console.log("Latch polynomials found: ", latchers);

    let emulated = await piller.createEmulatedExpression(`
    pol commit A;
    A * (1-A) = 0;
    (1-A)*A = 0;
    `);

    let zeroOnesExpr = piller.filterExpressionsEmulated(emulated);
    let zeroOnesPols = piller.getPolsFromExpressions(zeroOnesExpr);

    console.log("Polynomials that have zero one constraints: ", zeroOnesPols);

    let difference =  Object.keys(latchers).filter(x => !zeroOnesPols.includes(x));

    console.log("POLYNOMIALS THAT DONT HAVE ZERO ONE CONSTRAINTS! : ", difference);
}

module.exports = zeroOne;