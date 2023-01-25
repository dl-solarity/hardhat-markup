[![npm](https://img.shields.io/npm/v/@dlsl/hardhat-markup.svg)](https://www.npmjs.com/package/@dlsl/hardhat-markup) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# Hardhat Markup

[Hardhat](https://hardhat.org) plugin to generate customizable smart contracts documentation.

## What

This plugin generates markdown documentation of the contracts present in the project. Leveraging the `natspec` and `solc` capabilities, it is able to output beautiful uniswap-like `.md` files.

## Installation

```bash
npm install --save-dev @dlsl/hardhat-markup
```

Add the following statement to your `hardhat.config.js`:

```js
require("@dlsl/hardhat-markup")
```

Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```ts
import "@dlsl/hardhat-markup"
```

## Tasks

The documentation generation can be run either with built-in `compile` or the provided `markup` task.

To view the available options, run these help commands:

```bash
npx hardhat help compile
npx hardhat help markup
```

## Environment extensions

This plugin does not extend the environment.

## Usage

The `npx hardhat markup` command will compile and generate documentation for all the contracts used in the project into the default folder.

Clean old artifacts via `npx hardhat clean` command.

### Configuration

The default configuration looks as follows. You may customize all fields in your *hardhat config* file.

```js
module.exports = {
  markup: {
    outdir: "./generated-markups",
    onlyFiles: [],
    skipFiles: [],
    noCompile: false,
    verbose: false,
  },
}
```

- `outdir`: The directory where to store the generated documentation
- `onlyFiles`: If specified, documentation will be generated **only for matching** sources, other will be ignored
- `skipFiles`: Documentation will not be generated for **any matching** sources, also if those match `onlyFiles`
- `noCompile`: Skips project recompilation before the documentation generation
- `verbose`: Detailed logging on generation

### Including/excluding files

- Path stands for relative path from project root to either `.sol` file or directory.
- If path is a directory, all its files and sub-directories are considered matching.
- If source is a node module, `node_modules` must not be present in the path.

## Known limitations

- The generator does not recognize structs in the function signature. `tuple` is used instead.
- `@inheritdoc` is currently not supported.
