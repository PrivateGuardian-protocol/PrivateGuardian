// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.12;

interface IPoseidonHasher {
    function poseidon(uint[1] calldata inputs) external view returns (uint256);
}
