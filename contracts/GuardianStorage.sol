// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.12;

import "./interfaces/IUpdateGuardianVerifier.sol";
import "./interfaces/ISocialRecoveryVerifier.sol";

library GuardianStorage {
  bytes32 private constant GUARDIANS_SLOT = keccak256("accountjs.contracts.GuardiansStorage");
  uint8 constant MAX_GUARDIANS_NUM = 9;

  struct Layout {
    // guardians
    uint[MAX_GUARDIANS_NUM] guardians;

    uint num_guardians;

    // current vote number on change owner
    uint cur_vote;

    // vote threshold
    uint vote_threshold;

    // record of in progress voter
    mapping(uint => bool) recover_nullifier_set;

    IUpdateGuardianVerifier updateGuardianVerifier;
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
    IUpdateGuardianVerifier updateGuardianVerifier, 
    ISocialRecoveryVerifier socialRecoveryVerifier
  ) internal {
    require(guardians.length <= MAX_GUARDIANS_NUM, "Too many guardians");
    require(guardians.length / 2  < vote_threshold, "Vote threshold must be larger than half of total guardians");

    for(uint i = 0; i< guardians.length; i++) {
      l.guardians[i] = guardians[i];
    }
    l.num_guardians = guardians.length;
    l.vote_threshold = vote_threshold;
    l.updateGuardianVerifier = updateGuardianVerifier;
    l.socialRecoveryVerifier = socialRecoveryVerifier;
  }

  function updateGuardian(
    GuardianStorage.Layout storage l,
    uint[2] memory a, 
    uint[2][2] memory b, 
    uint[2] memory c, 
    uint[6] memory input // oldRoot, indexOfGuardian, oldPubKey[0], oldPubKey[1], newPubKey, newRoot
  ) external returns (bool) {
    if(l.updateGuardianVerifier.verifyProof(a, b, c, input)) {
      l.guardians[input[1]] = input[4];
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
    uint[3] memory input // hashOfNewOwner, merkleRoot, nullifier
  ) external returns (bool valid, bool update) {
    // record of voter
    uint nullifier = input[2];

    if(!l.recover_nullifier_set[nullifier]) {
      if(l.socialRecoveryVerifier.verifyProof(a, b, c, input)) {
        l.cur_vote += 1;

        if(l.cur_vote >= l.vote_threshold) {
          // Threshold reached
          l.cur_vote = 0;
          for(uint i = 0; i < l.guardians.length; i++) {
            if(l.recover_nullifier_set[nullifier]) {
              l.recover_nullifier_set[nullifier] = false;
            }
          }
          (valid, update) = (true, true);
        } else {
          // Threshold not reached
          l.recover_nullifier_set[nullifier] = true;
          (valid, update) = (true, false);
        }
      } {
        (valid, update) = (false, false);
      }
    } else {
      (valid, update) = (false, false);
    }
  }
}