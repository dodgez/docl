const program = require('commander');
const fs = require('fs');
const lngr = require('lngr');

const Interpreter = require('./src/interpreter');
const DVM = require('./src/dvm');

let input_file;
let grammar_file = './grammar.json';

program.version('1.0.0')
  .arguments('[input file]')
  .option('-i, --interactive')
  .action(function (file) {
    input_file = file;
  });

program.parse(process.argv);

let code;
if (!program.interactive || (program.interactive && typeof input_file !== 'undefined')) {
  if (typeof input_file === 'undefined') {
    console.error('No input file specified!');
    process.exit(1);
  }

  if (!fs.existsSync(input_file)) {
    console.error('Input file does not exist!');
    process.exit(1);
  }

  if (fs.lstatSync(input_file).isDirectory()) {
    console.error('Input is not a file!');
    process.exit(1);
  }

  code = fs.readFileSync(input_file, 'utf8') + '\n';
} else {
  code = 'nop\n'
}

if (!fs.existsSync(grammar_file)) {
  console.error('Grammar file is missing!');
  process.exit(1);
}

let grammar;

try {
  grammar = JSON.parse(fs.readFileSync('./grammar.json', 'utf8'));
} catch(e) {
  console.error(`Error when parsing grammar file: ${e}`);
  process.exit(1);
}

let lexemes = lngr.lexer.formatTokens(grammar.tokens);
let tokens = lngr.lexer.lex(lexemes, lngr.utils.getStringStream(code));
let rules = lngr.parser.formatRules(grammar.rules);
let parsed = lngr.parser.parse(rules, lngr.utils.getTokenStream(tokens));

if (program.interactive) {
  let interpreter = new Interpreter(parsed.children, lexemes, rules);
  interpreter.startDVM();
  interpreter.startListening();
} else {
  let dvm = new DVM(parsed.children);
  dvm.run_and_stop();
}
