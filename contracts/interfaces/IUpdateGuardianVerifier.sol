// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.12;

interface IUpdateGuardianVerifier {
  function verifyProof(uint[2] memory a, uint[2][2] memory b, uint[2] memory c, uint[6] memory input) external view returns (bool r);
}