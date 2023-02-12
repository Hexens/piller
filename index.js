#!/usr/bin/env node

const path = require("path");
const version = require("./package.json").version;
const compile = require("pilcom").compile;
const F = require("pilcom").F; //is actually ffjavascript.F1Field((1n<<64n)-(1n<<32n)+1n );
const Piller = require("./piller.js");


//Constants declarations
const checkerPath = './checkers/';

const yargs = require("yargs")
    .version(version)
    .usage("piller <main.pil>");
const argv = yargs.argv;

async function compileAndRun() {
    //Args processing
    const inputFile = argv._[0];

    if (!inputFile) {
        yargs.showHelp("log");
        return;
    }
    //Compiling PIL to json
    const fullFileName = path.resolve(process.cwd(), inputFile);

    const ctx = await compile(F, fullFileName, null, {}); // config is set to {} for now, maybe will change

    //initialize piller with ctx
    let piller = new Piller(ctx, "Main", compile, F);

    //loop the checkers and run them
    const checkerFiles = require(checkerPath);

    for (let file of checkerFiles) {
        let checker = require(path.join(process.cwd(), checkerPath, file));

        console.log("\n\n------ %s -------", checker.name);
        await checker(piller); //run the checker
    }

    return piller;
}

compileAndRun().then((piller) => {
    console.log("PILLER FINISHED");
})