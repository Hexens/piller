//const zeroOnes = ['PoseidonG.LAST', 'PoseidonG.LATCH', 'PoseidonG.LASTBLOCK', 'PoseidonG.PARTIAL', 'PoseidonG.result1', 'PoseidonG.result2', 'PoseidonG.result3', 'PaddingPG.lastBlock', 'PaddingPG.spare', 'PaddingPG.lastHashLen', 'PaddingPG.lastHashDigest', 'PaddingPG.acc', 'Mem.mWr', 'Mem.lastAccess', 'PaddingKK.lastBlock', 'PaddingKK.lastBlockLatch', 'PaddingKK.forceLastHash', 'PaddingKK.connected', 'PaddingKK.spare', 'PaddingKK.lastHashLen', 'PaddingKK.lastHashDigest', 'PaddingKK.freeIn', 'PaddingKK.crF', 'PaddingKK.rem', 'MemAlign.resultRd', 'MemAlign.resultWr8', 'MemAlign.resultWr256', 'Main.hashK', 'Main.hashK1', 'Main.hashP', 'Main.hashP1', 'Main.arithEq1', 'Main.arithEq2', 'Main.carry', 'Main.useJmpAddr', 'Main.useElseAddr', 'Arith.SEL_BYTE2_BIT19', 'Arith.resultEq0', 'Arith.resultEq1', 'Arith.resultEq2', 'PaddingKKBit.connected']
const zeroOnes = ['PoseidonG.LAST', 'PoseidonG.result2', 'MemAlign.resultRd', 'Main.hashP', 'Rom.inSTEP', 'Main.hashP1', 'Main.arithEq1', 'PaddingKKBit.FSOut7', 'PaddingPG.lastHashLen', 'Rom.incStack', 'Main.arithEq2', 'PaddingKK.forceLastHash', 'PaddingKK.connected', 'Storage.rSetSiblingRkey', 'Rom.inPC', 'Storage.rSetValueHigh', 'Storage.rJmp', 'Rom.inROTL_C', 'PaddingPG.spare', 'Rom.inCntArith', 'Storage.rRotateLevel', 'Storage.rJmpz', 'PoseidonG.result3', 'PaddingPG.lastHashDigest', 'Storage.rHashType', 'Rom.binOpcode', 'MemAlign.resultWr8', 'Main.carry', 'PaddingPG.lastBlock', 'Rom.inCntMemAlign', 'PaddingKKBit.FSOut1', 'Rom.jmpAddr', 'PaddingKK.lastHashDigest', 'MemAlign.resultWr256', 'Main.jmpAddr', 'Storage.rClimbRkey', 'Rom.inD', 'Mem.mWr', 'Arith.resultEq2', 'PaddingKKBit.FSOut6', 'Arith.resultEq0', 'Mem.lastAccess', 'Storage.rInRkey', 'Storage.rSetRkey', 'PoseidonG.LASTBLOCK', 'PaddingPG.F', 'Rom.inCntKeccakF', 'PaddingPG.acc', 'Rom.CONST0', 'Rom.inRR', 'PaddingKKBit.FSOut0', 'Rom.inHASHPOS', 'Storage.rClimbSiblingRkeyN', 'Rom.inE', 'Storage.rInSiblingRkey', 'Rom.inC', 'PaddingPG.crF', 'PaddingKKBit.FSOut4', 'Rom.inSP', 'Storage.rHash', 'Storage.rSetOldRoot', 'Rom.offset', 'PaddingKKBit.FSOut3', 'Rom.inB', 'Storage.rSetValueLow', 'PoseidonG.LATCH', 'Storage.rSetNewRoot', 'Arith.SEL_BYTE2_BIT19', 'Storage.rSetHashRight', 'Storage.rSetRkeyBit', 'Storage.rInRkeyBit', 'Storage.rClimbSiblingRkey', 'Storage.rInOldRoot', 'PaddingKK.crF', 'Main.elseAddr', 'Rom.inCntPaddingPG', 'Rom.inGAS', 'PaddingKK.sOutId', 'Main.useElseAddr', 'Rom.inFREE', 'Storage.rLatchGet', 'PaddingKKBit.FSOut5', 'Rom.inCntBinary', 'Rom.elseAddr', 'Arith.resultEq1', 'Storage.rInSiblingValueHash', 'Storage.rInNewRoot', 'Rom.inCntPoseidonG', 'PaddingKK.lastHashLen', 'Rom.inCTX', 'Rom.inA', 'Rom.inRCX', 'Storage.rAddress', 'Storage.rInFree', 'Main.useJmpAddr', 'Storage.rLatchSet', 'Storage.rSetHashLeft', 'Rom.inSR', 'Main.hashK1', 'PaddingKK.lastBlock', 'PaddingKKBit.FSOut2', 'PoseidonG.PARTIAL', 'PaddingKK.lastBlockLatch', 'PaddingKK.spare', 'PoseidonG.result1', 'Storage.rSetLevel', 'Rom.inMAXMEM', 'Storage.rSetSiblingValueHash', 'PaddingKKBit.connected', 'Main.hashK'];

//regex used to parse executor: pols\.([^\[\]]+)\[(?:.+)\] += *.+ *\? *(?:1n|0n|F\.zero|F\.one) *:.*(?:1n|0n|F\.zero|F\.one).*
async function scrapedExecutorZeroOneViolation(piller) {
    //filter latcher polynomials based on the regex
    let latchers = zeroOnes.filter(name => piller.commitedPolsNames.includes(name));


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
    let zeroOnesExpr = piller.filterEmulatedExpressions(emulated, null, false);

    //get polynomial names from the expressions
    let zeroOnesPols = piller.getPolNamesFromExpressions(zeroOnesExpr);


    let difference = latchers.filter(x => !zeroOnesPols.includes(x));

    //taint all the polynomials from the left side of plookups
    let plookupLeftIds = piller.getPlookupLeftExpressions();
    let taintedCommitedPols = piller.getTaintedCommitedPolsFromExpressions(plookupLeftIds, 2); //TODO rethink the level

    difference = difference.filter(x => !Object.keys(taintedCommitedPols).includes(x));

    //taint all the polynomials from the left side of permutations
    let permLeftIds = piller.getPermutationLeftExpressions();
    let taintedPermCommitedPols = piller.getTaintedCommitedPolsFromExpressions(permLeftIds);

    difference = difference.filter(x => !Object.keys(taintedPermCommitedPols).includes(x));

    console.log("Final commited polynomials scraped from executor (set to 1 and 0 only) and which dont have 0/1 constraints: ", difference);

}

module.exports = scrapedExecutorZeroOneViolation;