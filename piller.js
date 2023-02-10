function Piller(_ctx, _mainNamespace, _compile, _F) {
    //set the context object and the main namespace
    //we need to specify the main namespace as in case of PIL is using includes/different namespaces
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

Piller.prototype.getPolReferencesFromId = function (expression) {
    let type = expression.op === "exp" ? "imP" : (expression.op === "cm" ? "cmP" : "constP");

    return this.polNames.filter(ref => this.polReferences[ref].type === type && this.polReferences[ref].id === expression.id);
}

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

            let refNames = self.getPolReferencesFromId(expression);
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


Piller.prototype.getExpressionsByCtxExprIds = function (ctxExprIds) {
    let resultExprs = [];

    for (let expr of this.expressionMap) {
        if (ctxExprIds.includes(expr.ctxExprId))
            resultExprs.push(expr);
    }

    return resultExprs;
}

Piller.prototype.getPlookupLeftExpressions = function () {
    let resultPlookups = [];

    for (let plookup of this.ctx.plookupIdentities) {
        resultPlookups = resultPlookups.concat(this.getExpressionsByCtxExprIds(plookup.f));
    }

    return resultPlookups;
}

Piller.prototype.getPlookupRightExpressions = function () {
    let resultPlookups = [];

    for (let plookup of this.ctx.plookupIdentities) {
        resultPlookups = resultPlookups.concat(this.getExpressionsByCtxExprIds(plookup.t));
    }

    return resultPlookups;
}

Piller.prototype.getPermutationLeftExpressions = function () {
    let resultPermutations = [];

    for(let plookup of this.ctx.permutationIdentities){
        resultPermutations = resultPermutations.concat(this.getExpressionsByCtxExprIds(plookup.f));
    }

    return resultPermutations;
}

Piller.prototype.parseReferences = function () {
    this.polNames = [];
    this.polReferences = {};

    const refs = Object.keys(this.ctx.references);

    //we loop in for because we need to "actually" reconstruct to the array polynomials (e.g. pol A[32])
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

Piller.prototype.parseIntermediatePols = function (_namespace) {
    let namespace = _namespace ? _namespace : '';

    const refs = this.polNames;

    //Populate separately for names, since this may come handy in checkers, and it to be done only once
    this.intermediatePolsNames = refs.filter(ref =>
        this.polReferences[ref].type === "imP" && ref.startsWith(namespace)
    );

    this.intermediatePols = this.intermediatePolsNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: this.constantPolsNames[key]})
        }, {});

}

Piller.prototype.filterPolWithRegex = function (regex, pols) {
    const polynomials = pols ? pols : this.polReferences;

    const polNames = this.filterPolNamesWithRegex(regex, Object.keys(polynomials));

    return polNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: pols[key]})
        }, {});
}

Piller.prototype.filterPolNamesWithRegex = function (regex, pols) {
    return pols.filter(pol => pol.search(regex) !== -1);
}

Piller.prototype.expressionsEq = function (value, _expressions) {
    const expressions = _expressions ? _expressions : this.expressionMap;

    return expressions
        .filter(expr => expr.expression.op === "sub")
        .filter(expr => expr.expression.values.filter(v => v.value == value).length !== 0);
}

Piller.prototype.createEmulatedExpression = async function (pilString, _config) {
    const config = _config ? _config : {compileFromString: true};

    const ctx = await this.compile(this.F, pilString, null, config);
    return ctx.expressions;
}

Piller.prototype.filterExpressionsEmulated = function (expressionsEmulated, _expressions) {
    let expressions = _expressions ? _expressions : this.expressionMap;

    const recursiveCheck = function (exprEmul, expr) {
        if (exprEmul === undefined && expr === undefined)
            return true;

        if (Array.isArray(exprEmul.values) && Array.isArray(expr.values))
            return recursiveCheck(exprEmul.values[0], expr.values[0]) && recursiveCheck(exprEmul.values[1], expr.values[1]);

        return exprEmul.op === expr.op && exprEmul.value == expr.value;

    }

    let resultExpressions = [];

    for (let i = 0; i < expressionsEmulated.length; i++) {
        for (let j = 0; j < expressions.length; j++)
            if (recursiveCheck(expressionsEmulated[i], expressions[j].expression)) {
                resultExpressions.push(expressions[j]);
            }
    }
    return resultExpressions;

}

Piller.prototype.getPolNamesFromExpressions = function (_expressions) {
    let expressions = _expressions ? _expressions : this.expressionMap;

    let resultPols = {};
    const self = this;
    const recursiveGetPols = function (expression) {
        if (expression === undefined)
            return;

        if (expression.op === "exp" || expression.op === "cm" || expression.op === "const") {

            let refNames = self.getPolReferencesFromId(expression);

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

//This function is for internal calls
//returns the paths from any expression array to commited polynomials
//can be used for plookup rules and such
Piller.prototype.getTaintedCommitedPolsFromExpressions = function (_expressions) {
    let expressions = _expressions ? _expressions : this.expressionMap;

    const self = this;

    let resultPols = {};
    const recursiveFindCommitedPols = function (expr, path) {
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


module.exports = Piller;