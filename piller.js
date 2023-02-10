function Piller(_ctx, _mainNamespace, _compile, _F) {
    //set the context object and the main namespace
    //we need to specify the main namespace as in case of PIL is using includes/different namespaces
    //it will be the distinguishing factor for plookup/perm/connect checkers
    this.ctx = _ctx;
    this.mainNamespace = _mainNamespace ? _mainNamespace : "Main";
    this.compile = _compile;
    this.F = _F;

    //Parse and set different type of polynomials
    this.parseCommitedPols();
    this.parseConstantPols();
    this.parseIntermediatePols();


    return this;
}


Piller.prototype.parseCommitedPols = function (namespace) {
    const refs = Object.keys(this.ctx.references);

    //Populate separately for names, since this may come handy in checkers, and it to be done only once
    this.commitedPolsNames = refs.filter(ref =>
        this.ctx.references[ref].type === "cmP" && (namespace === undefined || ref.startsWith(namespace))
    );

    this.commitedPols = this.commitedPolsNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: this.ctx.references[key]})
        }, {});

}

Piller.prototype.parseConstantPols = function (namespace) {
    const refs = Object.keys(this.ctx.references);

    //Populate separately for names, since this may come handy in checkers, and it to be done only once
    this.constantPolsNames = refs.filter(ref =>
        this.ctx.references[ref].type === "constP" && (namespace === undefined || ref.startsWith(namespace))
    );

    this.constantPols = this.constantPolsNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: this.ctx.references[key]})
        }, {});

}

Piller.prototype.parseIntermediatePols = function (namespace) {
    const refs = Object.keys(this.ctx.references);

    //Populate separately for names, since this may come handy in checkers, and it to be done only once
    this.intermediatePolsNames = refs.filter(ref =>
        this.ctx.references[ref].type === "imP" && (namespace === undefined || ref.startsWith(namespace))
    );

    this.intermediatePols = this.intermediatePolsNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: this.ctx.references[key]})
        }, {});

}

Piller.prototype.filterPolWithRegex = function (regex, pols) {
    const polynomials = pols ? pols : this.ctx.references;

    const polNames = this.filterPolNamesWithRegex(regex, Object.keys(polynomials));

    return polNames.reduce(
        (cur, key) => {
            return Object.assign(cur, {[key]: pols[key]})
        }, {});
}

Piller.prototype.filterPolNamesWithRegex = function (regex, pols) {
    return pols.filter(pol => pol.search(regex) !== -1);
}

Piller.prototype.expressionsEq = function (value, pols) {
    const expressions = pols ? pols : this.ctx.expressions;

    return expressions
        .filter(expr => expr.op === "sub")
        .filter(expr => expr.values.filter(v => v.value === value).length !== 0);
}

Piller.prototype.createEmulatedExpression = async function (pilString, _config) {
    const config = _config ? _config : {compileFromString: true};

    const ctx = await this.compile(this.F, pilString, null, config);
    return ctx.expressions;
}

Piller.prototype.filterExpressionsEmulated = function (expressionsEmulated, _expressions) {
    let expressions = _expressions ? expressions : this.ctx.expressions;

    const recursiveCheck = function (exprEmul, expr) {
        if (exprEmul === undefined && expr === undefined)
            return true;

        if (Array.isArray(exprEmul.values) && Array.isArray(expr.values))
            return recursiveCheck(exprEmul.values[0], expr.values[0]) && recursiveCheck(exprEmul.values[1], expr.values[1]);

        return exprEmul.op === expr.op && exprEmul.value === expr.value;

    }

    let resultExpressions = [];

    for (let i = 0; i < expressionsEmulated.length; i++) {
        for (let j = 0; j < expressions.length; j++)
            if (recursiveCheck(expressionsEmulated[i], expressions[j])) {
                resultExpressions.push(expressions[j]);
            }
    }
    return resultExpressions;

}

Piller.prototype.getPolsFromExpressions = function (_expressions) {
    let expressions = _expressions ? _expressions : this.ctx.expressions;

    let resultPols = {};
    const recursiveGetPols = function (expression) {
        if (expression === undefined)
            return;

        if (expression.op === "pol") {
            resultPols[(expression.namespace + "." + expression.name)] = true;
        } else if (Array.isArray(expression.values)) {
            recursiveGetPols(expression.values[0]);
            recursiveGetPols(expression.values[1]);
        }
    }

    expressions.filter(expr => {
        recursiveGetPols(expr);
    });
    return Object.keys(resultPols);
}

module.exports = Piller;