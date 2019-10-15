# docl

[![Actions Status](https://github.com/dodgez/docl/workflows/CI/badge.svg)](https://github.com/dodgez/docl/actions)

This is a command line tool to run code for the `do` programming language.

The do programming language is a small programming language that I wrote as an example language that is parseable by my [lngr](https://www.npmjs.com/package/lngr) library.
The language specification is inspired by the simplicity of 32-bit assembly language code with Intel syntax.
_Note: `node` has a default maximum JavaScript heap allocation size.
See [this stackoverflow question](https://stackoverflow.com/questions/34356012/how-to-increase-nodejs-default-memory) to change how much memory it will allow._

This implementation uses a `dvm` (do virtual machine) to execute the code line by line and keep track of memory that is in use.
It also has an _interactive mode_, where the user can type lines of `do` code and the `dvm` will execute them as it goes.

- To learn more about the syntax of this language, check out the token and rule definitions in [grammar.json](https://github.com/dodgez/docl/blob/master/grammar.json).
- To see some example code, check out [sample.as](https://github.com/dodgez/docl/blob/master/sample.as).
- To run code from a file, pass the filename as an argument to `node index.js`.
- To run in interactive mode, pass the `-i` or `--interactive` flag, optionally with a file to run beforehand.
- To build precompiled binaries, run `npm run build` in the root directory.

Go to the [releases](https://github.com/dodgez/docl/releases) tab to download precompiled binaries.
