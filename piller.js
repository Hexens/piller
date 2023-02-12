function Piller(_ctx, _mainNamespace, _compile, _F) {
    //set the context object and the main namespace
    //we need to specify the main namespace, for some cases in PIL
    //it will be the distinguishing factor for plookup/perm/connect checkers
    this.ctx = _ctx;
    this.mainNamespace = _mainNamespace ? _mainNamespace : "Main";
    this.compile = _compile;
    this.F = _F;

    //Parse and set different type of polynomials
    this.parseReferences();
    this.parseCommitedPols();
    this.parseConstantPols();
    this.parseIntermediatePols();
    this.parseExpressions();

    return this;
}

//return the polynomial reference based on id
Piller.prototype.getPolReferencesFromExpression = function (expression) {
    let type = expression.op === "exp" ? "imP" : (expression.op === "cm" ? "cmP" : "constP");

    return this.polNames.filter(ref => this.polReferences[ref].type === type && this.polReferences[ref].id === expression.id);
}

//parses the expression tree and populates expressionMap and polToExprMap preserving the connected polynomials and expressions
Piller.prototype.parseExpressions = function () {
    this.expressionMap = [];
    this.polToExprMap = {};

    let exprId = 0;

    const self = this;

    const recursiveParseExpressions = function (expression) {
        let currentId = exprId++;

        self.expressionMap.push({expression, id: currentId});

        if (expression.op === "exp" || expression.op === "cm" || expression.op === "const") {
            if (expression.op === "exp") {
                let childId = recursiveParseExpressions(self.ctx.expressions[expression.id]);
                self.expressionMap[currentId].refs = [childId];
                Array.isArray(self.expressionMap[childId].backRefs) ?
                    self.expressionMap[childId].backRefs.push(currentId) :
                    self.expressionMap[childId].backRefs = [currentId];
            }

            let refNames = self.getPolReferencesFromExpression(expression);
            if (refNames.length > 0) {
                let refPol = {};
                refPol[refNames[0]] = self.polReferences[refNames[0]];
                self.expressionMap[currentId].refPol = refPol;

                if (!self.polToExprMap[refNames[0]]) {
                    self.polToExprMap[refNames[0]] = {};
                }

                Array.isArray(self.polToExprMap[refNames[0]].refExpr) ?
                    self.polToExprMap[refNames[0]].refExpr.push(currentId) :
                    self.polToExprMap[refNames[0]].refExpr = [currentId];
            }


        } else if (Array.isArray(expression.values)) {
            let childId = new Array(expression.values.length);

            for (let i = 0; i < expression.values.length; i++) {
                childId[i] = recursiveParseExpressions(expression.values[i]);
            }

            self.expressionMap[currentId].refs = [];
            for (let cId of childId) {
                self.expressionMap[cId].backRefs = [currentId];
                self.expressionMap[currentId].refs.push(cId);
            }
        }

        return currentId;
    }

    for (let i = 0; i < this.ctx.expressions.length; i++) {
        let currentId = recursiveParseExpressions(this.ctx.expressions[i]);
        this.expressionMap[currentId].ctxExprId = i;
    }
}

//parses the references, as we need more structured information than the compiler gives
Piller.prototype.parseReferences = function () {
    this.polNames = [];
    this.polReferences = {};

    const refs = Object.keys(this.ctx.references);

    //need loop because we need to "actually" reconstruct the array polynomials (e.g. pol A[32])
    for (let ref of refs) {

        if (this.ctx.references[ref].isArray) {
            for (let j = 0; j < this.ctx.references[ref].len; j++) {

                let polName = `${ref}[${j}]`;
                this.polNames.push(`${ref}[${j}]`); //create the name (A -> A[0],..A[N])

                let polRef = Object.assign({}, this.ctx.references[ref]);
                polRef.id = polRef.id + j;

                this.polReferences[polName] = polRef;
            }
        } else {
            this.polNames.push(ref);
            this.polReferences[ref] = Object.assign({}, this.ctx.references[ref]);
        }
    }
}

//populate the committed polynomials objects
Piller.prototype.parseCommitedPols = function (_namespace) {
    let namespace = _namespace ? _namespace : '';

    const refs = this.polNames;

    //Populate separately for names, since this may come handy in checkers, and it to be done only once
    this.commitedPolsNames = refs.filter(ref =>
        this.polReferences[ref].type === "cmP" && (namespace === undefined || ref.startsWith(namespace))
    );

    this.commitedPols = this.commitedPolsNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: this.polReferences[key]})
        }, {});

}

//populate the constant polynomials objects
Piller.prototype.parseConstantPols = function (_namespace) {
    let namespace = _namespace ? _namespace : '';

    const refs = this.polNames;

    //Populate separately for names, since this may come handy in checkers, and it to be done only once
    this.constantPolsNames = refs.filter(ref =>
        this.polReferences[ref].type === "constP" && ref.startsWith(namespace)
    );

    this.constantPols = this.constantPolsNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: this.polReferences[key]})
        }, {});

}

//populate the intermediate polynomials objects
Piller.prototype.parseIntermediatePols = function (_namespace) {
    let namespace = _namespace ? _namespace : '';

    const refs = this.polNames;

    //Populate separately for names, since this may come handy in checkers, and it to be done only once
    this.intermediatePolsNames = refs.filter(ref =>
        this.polReferences[ref].type === "imP" && ref.startsWith(namespace)
    );

    this.intermediatePols = this.intermediatePolsNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: this.polReferences[key]})
        }, {});

}

//filters polynomial reference object by regex
Piller.prototype.filterPolWithRegex = function (regex, pols) {
    const polynomials = pols ? pols : this.polReferences;

    const polNames = this.filterPolNamesWithRegex(regex, Object.keys(polynomials));

    return polNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: pols[key]})
        }, {});
}

//filters polynomial names array by regex
Piller.prototype.filterPolNamesWithRegex = function (regex, pols) {
    return pols.filter(pol => pol.search(regex) !== -1);
}

//finds and returns the expressions that have < ... = X > structure
Piller.prototype.getExpressionsEq = function (value, _expressions) {
    const expressions = _expressions ? _expressions : this.expressionMap;

    return expressions
        .filter(expr => expr.expression.op === "sub")
        .filter(expr => expr.expression.values.filter(v => v.value == value).length !== 0);
}

//creates (compiles) expressions that can be emulated later and filtered with
Piller.prototype.createEmulatedExpression = async function (pilString, _config) {
    const config = _config ? _config : {compileFromString: true};

    const ctx = await this.compile(this.F, pilString, null, config);
    return ctx.expressions;
}

Piller.prototype.isExpressionPolynomial = function (expression) {
    return expression.op === "exp" || expression.op === "cm" || expression.op === "const"
}

//filters expressions with emulated expressions, strict mode means that if polynomials in the emulated formula will be distinct
//e.g:  A + B = 0 is same as A + A = 0 when strict == false
//but   A + B = 0 is not same as A + A = 0 when strict == true
Piller.prototype.filterEmulatedExpressions = function (expressionsEmulated, _expressions, strict) {
    let expressions = _expressions ? _expressions : this.expressionMap;

    const self = this;
    //we need to keep the mapping of matched polynomials in case it is a strict match
    let polMatch;
    const recursiveCheck = function (exprEmul, expr) {
        if (exprEmul === undefined && expr === undefined)
            return true;

        if (Array.isArray(exprEmul.values) && Array.isArray(expr.values)) {
            if (exprEmul.values.length !== expr.values.length)
                return false;

            let res = recursiveCheck(exprEmul.values[0], expr.values[0]);

            for (let i = 1; i < expr.values.length; i++) {
                res = res && recursiveCheck(exprEmul.values[i], expr.values[i])
            }

            //in case the operation is MUL or ADD we want to check for expressions that are essentially equal, but have different operand ordering
            //e.g. A * B = B * A
            //     A + B = B + A
            if ((expr.op === exprEmul.op && exprEmul.op === "mul") || (expr.op === exprEmul.op && exprEmul.op === "add"))
                res = res ?
                    res :
                    (res || (recursiveCheck(exprEmul.values[1], expr.values[0]) && recursiveCheck(exprEmul.values[0], expr.values[1])));
            return res;
        }

        //we purposely use == for values
        if (exprEmul.value == expr.value && exprEmul.next === expr.next) {
            if (strict && (exprEmul.op === expr.op)) {
                let exprId = `expr${expr.op}${expr.id}`;
                let emulId = `exprEmul${expr.op}${exprEmul.id}`;
                //we are in a strict matching mode, need to check that it is the same polynomial emulated as in previous matches
                //if it's the first time, set the mapping
                if (polMatch[exprId] === undefined && polMatch[emulId] === undefined) {
                    polMatch[exprId] = exprEmul.id;
                    polMatch[emulId] = expr.id;
                }
                return polMatch[emulId] === expr.id && polMatch[exprId] === exprEmul.id;
            } else if (!strict) {
                return self.isExpressionPolynomial(exprEmul) === self.isExpressionPolynomial(expr);
            }
            return false;
        } else
            return false;

    }

    let resultExpressions = [];

    for (let i = 0; i < expressionsEmulated.length; i++) {
        for (let j = 0; j < expressions.length; j++) {
            polMatch = {}; //reset the matching map
            if (recursiveCheck(expressionsEmulated[i], expressions[j].expression)) {
                resultExpressions.push(expressions[j]);
            }
        }
    }
    return resultExpressions;

}

//find recursively and return polynomial names that are reachable from given expressions
Piller.prototype.getPolNamesFromExpressions = function (_expressions) {
    let expressions = _expressions ? _expressions : this.expressionMap;

    let resultPols = {};
    const self = this;
    const recursiveGetPols = function (expression) {
        if (expression === undefined)
            return;

        if (expression.op === "exp" || expression.op === "cm" || expression.op === "const") {

            let refNames = self.getPolReferencesFromExpression(expression);

            if (refNames.length > 0)
                resultPols[refNames[0]] = true;

        } else if (Array.isArray(expression.values)) {
            recursiveGetPols(expression.values[0]);
            recursiveGetPols(expression.values[1]);
        }
    }

    expressions.map(expr => recursiveGetPols(expr.expression));

    return Object.keys(resultPols);
}

//returns the paths from any expression array to commited polynomials
//can be used for plookup/permutation rules and others
Piller.prototype.getTaintedCommitedPolsFromExpressions = function (_expressions, level) {
    let expressions = _expressions ? _expressions : this.expressionMap;

    const self = this;

    let resultPols = {};
    const recursiveFindCommitedPols = function (expr, path) {
        if (level !== undefined && path.length > level)
            return;

        let expression = expr.expression;

        if (expression.op === "cm") {

            let polName = Object.keys(expr.refPol);

            Array.isArray(resultPols[polName]) ?
                resultPols[polName].push([...path, expr.id]) :
                resultPols[polName] = [[...path, expr.id]];

            return;
        }
        if (!expr.refs || expr.refs.length === 0)
            return;

        expr.refs.map(
            ref => recursiveFindCommitedPols(self.expressionMap[ref], [...path, expr.id])
        );
    }

    expressions.map(expr => recursiveFindCommitedPols(expr, []));

    return resultPols;
}

//finds and returns expression object based on compiler context id (as they are not the same as ids that piller uses)
Piller.prototype.getExpressionsByCtxExprIds = function (ctxExprIds) {
    let resultExprs = [];

    for (let expr of this.expressionMap) {
        if (ctxExprIds.includes(expr.ctxExprId))
            resultExprs.push(expr);
    }

    return resultExprs;
}

//returns list of expressions that correspond to the left side of plookup expressions
Piller.prototype.getPlookupLeftExpressions = function () {
    let resultPlookups = [];

    for (let plookup of this.ctx.plookupIdentities) {
        resultPlookups = resultPlookups.concat(this.getExpressionsByCtxExprIds(plookup.f));
    }

    return resultPlookups;
}

//returns list of expressions that correspond to the right side of plookup expressions
Piller.prototype.getPlookupRightExpressions = function () {
    let resultPlookups = [];

    for (let plookup of this.ctx.plookupIdentities) {
        resultPlookups = resultPlookups.concat(this.getExpressionsByCtxExprIds(plookup.t));
    }

    return resultPlookups;
}

//returns list expressions that correspond to the left side's selector of plookup expressions
Piller.prototype.getPlookupLeftSelectorExpressions = function () {
    let resultPlookups = [];

    for (let plookup of this.ctx.plookupIdentities) {
        resultPlookups = resultPlookups.concat(this.getExpressionsByCtxExprIds([plookup.selF]));
    }

    return resultPlookups;
}

//returns list expressions that correspond to the right side's selector of plookup expressions
Piller.prototype.getPlookupRightSelectorExpressions = function () {
    let resultPlookups = [];

    for (let plookup of this.ctx.plookupIdentities) {
        resultPlookups = resultPlookups.concat(this.getExpressionsByCtxExprIds([plookup.selT]));
    }

    return resultPlookups;
}

//returns list of expressions that correspond to the left side of permutation expressions
Piller.prototype.getPermutationLeftExpressions = function () {
    let resultPermutations = [];

    for (let perm of this.ctx.permutationIdentities) {
        resultPermutations = resultPermutations.concat(this.getExpressionsByCtxExprIds(perm.f));
    }

    return resultPermutations;
}

//returns list of expressions that correspond to the right side of permutation expressions
Piller.prototype.getPermutationRightExpressions = function () {
    let resultPermutations = [];

    for (let perm of this.ctx.permutationIdentities) {
        resultPermutations = resultPermutations.concat(this.getExpressionsByCtxExprIds(perm.t));
    }

    return resultPermutations;
}

//returns list expressions that correspond to the left side's selector of permutation expressions
Piller.prototype.getPermutationLeftSelectorExpressions = function () {
    let resultPermutations = [];

    for (let perm of this.ctx.permutationIdentities) {
        resultPermutations = resultPermutations.concat(this.getExpressionsByCtxExprIds([perm.selF]));
    }

    return resultPermutations;
}

//returns list expressions that correspond to the right side's selector of permutation expressions
Piller.prototype.getPermutationLeftSelectorExpressions = function () {
    let resultPermutations = [];

    for (let perm of this.ctx.permutationIdentities) {
        resultPermutations = resultPermutations.concat(this.getExpressionsByCtxExprIds([perm.selT]));
    }

    return resultPermutations;
}

//returns list of expressions that correspond to the left side of connect expressions
Piller.prototype.getConnectLeftExpressions = function () {
    let resultConnect = [];

    for (let conn of this.ctx.connectionIdentities) {
        resultConnect = resultConnect.concat(this.getExpressionsByCtxExprIds(conn.pols));
    }

    return resultConnect;
}

//returns list of expressions that correspond to the right side of connect expressions
Piller.prototype.getConnectRightExpressions = function () {
    let resultConnect = [];

    for (let conn of this.ctx.connectionIdentities) {
        resultConnect = resultConnect.concat(this.getExpressionsByCtxExprIds(conn.connections));
    }

    return resultConnect;
}

module.exports = Piller;