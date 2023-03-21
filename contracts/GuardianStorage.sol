// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/structs/EnumerableMap.sol";

import "./interfaces/IUpdateGuardianVerifier.sol";
import "./interfaces/ISocialRecoveryVerifier.sol";
import "./interfaces/IPoseidonHasher.sol";

library GuardianStorage {
  using EnumerableMap for EnumerableMap.UintToUintMap;

  bytes32 private constant GUARDIANS_SLOT = keccak256("accountjs.contracts.GuardiansStorage");
  uint8 constant MAX_GUARDIANS_NUM = 7;

  struct Layout {
    // merkle root
    uint root;

    // number of guardians
    uint num_guardians;

    // current vote number on change owner
    uint cur_vote;

    // vote threshold
    uint vote_threshold;

    // guardians
    uint[MAX_GUARDIANS_NUM] guardians;

    // record of in progress voter
    EnumerableMap.UintToUintMap recover_nullifier_set;

    // update guardian verifier contract
    IUpdateGuardianVerifier updateGuardianVerifier;

    // poseidon hasher verifier contract
    ISocialRecoveryVerifier socialRecoveryVerifier;
  }

  function layout() internal pure returns (Layout storage l) {
    bytes32 slot = GUARDIANS_SLOT;
    assembly {
      l.slot := slot
    }
  }

  function initialize(
    GuardianStorage.Layout storage l,
    uint[] memory guardians,
    uint vote_threshold,
    uint root,
    address updateGuardianVerifierAddress,
    address socialRecoveryVerifierAddress,
    address poseidonContractAddress
  ) internal {
    require(guardians.length <= MAX_GUARDIANS_NUM, "Too many guardians");
    require(guardians.length / 2  < vote_threshold, "Vote threshold must be larger than half of total guardians");

    for(uint i = 0; i< guardians.length; i++) {
      l.guardians[i] = guardians[i];
    }
    l.num_guardians = guardians.length;
    l.vote_threshold = vote_threshold;
    l.root = root;
    l.updateGuardianVerifier = IUpdateGuardianVerifier(updateGuardianVerifierAddress);
    l.socialRecoveryVerifier = ISocialRecoveryVerifier(socialRecoveryVerifierAddress);
    l.hasher = IPoseidonHasher(poseidonContractAddress);
  }

  function updateGuardian(
    GuardianStorage.Layout storage l,
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[6] memory input // oldRoot, indexOfGuardian, oldPubKey[0], oldPubKey[1], newPubKey, newRoot
  ) external returns (bool) {
    // check root
    require(uint256(uint160(l.root)) == input[0], "Wrong merkel root");

    // check proof
    if(l.updateGuardianVerifier.verifyProof(a, b, c, input)) {
      // update guardian
      l.guardians[input[1]] = input[4];

      // update root
      l.root = input[5];
      return true;
    } else {
      return false;
    }
  }

  function recover(
    GuardianStorage.Layout storage l,
    uint[2] memory a,
    uint[2][2] memory b,
    uint[2] memory c,
    uint[3] memory input, // hashOfNewOwner, merkleRoot, nullifier
    address newOwner
  ) external returns (bool valid, bool update) {
    // record of voter
    uint nullifier = input[2];
    uint[1] memory newOwnerUint = [uint256(uint160(newOwner))];
    require(input[0] == l.hasher.poseidon1(newOwnerUint), "Wrong owner");

    if(!l.recover_nullifier_set.contains(nullifier)) {
      if(l.socialRecoveryVerifier.verifyProof(a, b, c, input)) {
        // proof is valid
        l.cur_vote += 1;

        if(l.cur_vote >= l.vote_threshold) {
          // Threshold reached
          l.cur_vote = 0;
          for(uint i = 0; i< l.recover_nullifier_set.length(); i++) {
            (uint n, ) = l.recover_nullifier_set.at(i);
            l.recover_nullifier_set.remove(n);
          }

          // update merkle root
          l.root = input[1];
          (valid, update) = (true, true);
        } else {
          // Threshold not reached
          l.recover_nullifier_set.set(nullifier, 1);
          (valid, update) = (true, false);
        }
      } {
        // proof is not valid
        (valid, update) = (false, false);
      }
    } else {
      // proof is replay
      (valid, update) = (false, false);
    }
  }

  function getGuardians(GuardianStorage.Layout storage l) external view returns (uint[] memory) {
    uint[] memory gs = new uint[](l.num_guardians);
    for(uint i = 0; i < l.num_guardians; i++) {
      gs[i] = l.guardians[i];
    }
    return gs;
  }
}