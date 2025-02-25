[![npm](https://img.shields.io/npm/v/@solarity/hardhat-markup.svg)](https://www.npmjs.com/package/@solarity/hardhat-markup) [![hardhat](https://hardhat.org/buidler-plugin-badge.svg?1)](https://hardhat.org)

# Hardhat Markup

[Hardhat](https://hardhat.org) plugin to generate customizable smart contracts documentation.

## What

This plugin generates markdown documentation of the contracts present in the project. Leveraging the `natspec` and `solc` capabilities, it is able to output beautiful uniswap-like `.md` files.

## Installation

```bash
npm install --save-dev @solarity/hardhat-markup
```

Add the following statement to your `hardhat.config.js`:

```js
require("@solarity/hardhat-markup")
```


Or, if you are using TypeScript, add this to your `hardhat.config.ts`:

```ts
import "@solarity/hardhat-markup"
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

## Example

<table style="width:100%">
<tr>
<th>Generated markdown</th>
<th>Example Solidity code</th>
</tr>


<tr>
<td>
  
# Example

## Overview

#### License: MIT

```solidity
contract Example
```

Author: Solidity lover

The example contract

This contract is meant to work as the example of how `hardhat-markup` plugin works.

In a nutshell, the plugin parses natspec documentation and presents it in a beautiful,
Uniswap-like style, leveraging MD format.

You can also have code blocks inside the comments!

```solidity
contract Example {
    function foo() external {
        . . .
    }
}
```
## Events info

### Random

```solidity
event Random(uint256 value)
```

The event that emits a random value


Parameters:

| Name  | Type    | Description      |
| :---- | :------ | :--------------- |
| value | uint256 | the random value |

## Errors info

### Oops

```solidity
error Oops(string reason)
```

The error, occurs from time to time


Parameters:

| Name   | Type   | Description |
| :----- | :----- | :---------- |
| reason | string | the reason  |

## Functions info

### foo (0xbd0d639f)

```solidity
function foo(address user, uint256 entropy) external returns (uint256)
```

The very important function that computes the answer to the Universe


Parameters:

| Name    | Type    | Description                        |
| :------ | :------ | :--------------------------------- |
| user    | address | the user who created the Universe  |
| entropy | uint256 | the entropy                        |


Return values:

| Name | Type    | Description     |
| :--- | :------ | :-------------- |
| [0]  | uint256 | the answer (42) |

  
</td>
<td>

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/**
 * @author Solidity lover
 * @notice The example contract
 *
 * This contract is meant to work as the example of how `hardhat-markup` plugin works.
 *
 * In a nutshell, the plugin parses natspec documentation and presents it in a beautiful,
 * Uniswap-like style, leveraging MD format.
 *
 * You can also have code blocks inside the comments!
 *
 * ```solidity
 * contract Example {
 *     function foo() external {
 *         . . .
 *     }
 * }
 * ```
 */
contract Example {
    /**
     * @notice The event that emits a random value
     * @param value the random value
     */
    event Random(uint256 value);

    /**
     * @notice The error, occurs from time to time
     * @param reason the reason
     */
    error Oops(string reason);

    /**
     * @notice The very important function that computes the answer to the Universe
     * @param user the user who created the Universe
     * @param entropy the entropy
     * @return the answer (42)
     */
    function foo(address user, uint256 entropy) external returns (uint256) {
        emit Random(uint256(uint160(user)) + entropy);

        return 42;
    }
}
```

</td>
</tr>
</table>

## Known limitations

- `Vyper` is currently not supported.
- `inheritdoc` parsing is ignored for state variable declarations.
