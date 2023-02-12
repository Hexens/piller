const latchRegex = /.*(inv|Inv|INV).*/;

async function inverseCheck(piller) {
    //filter latter polynomials based on the regex
    let inverses = piller.filterPolWithRegex(latchRegex, piller.commitedPols);
    //console.log(inverses);

    let emulated = await piller.createEmulatedExpression(`
    pol commit A,B;
    pol isZ = 1-A*B;
    isZ*A = 0;
    `);

    let invExpr = piller.filterEmulatedExpressions(emulated, null, false);
    let invPols = piller.getPolNamesFromExpressions(invExpr);


    let difference = Object.keys(inverses).filter(x => !invPols.includes(x));

    console.log("Polynomials that have *inv|Inv*, but don't have correct inverse constraints! : ", difference);

}

module.exports = inverseCheck;