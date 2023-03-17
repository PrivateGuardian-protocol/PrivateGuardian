pragma circom 2.0.0;

include "./node_modules/circomlib/circuits/smt/smtprocessor.circom";
include "./node_modules/circomlib/circuits/poseidon.circom";
include "./node_modules/circomlib/circuits/eddsamimc.circom";

template UpdateGuardian(nLevels) {
    
    // private signal
    signal input siblings[nLevels];
    signal input sig[3]; // EdDSAMiMCVerifier
    // public signal
    signal input oldRoot;
    signal input indexOfGuardian;
    signal input oldPubKey[2];
    signal input newPubKey;
    signal output newRoot;

    component verifySignature = EdDSAMiMCVerifier();
    verifySignature.enabled <== 1;
    verifySignature.Ax <== oldPubKey[0];
    verifySignature.Ay <== oldPubKey[1];
    verifySignature.S <== sig[0];
    verifySignature.R8x <== sig[1];
    verifySignature.R8y <== sig[2];
    verifySignature.M <== newPubKey;

    component verifyUpdate = SMTProcessor(nLevels);
    verifyUpdate.oldRoot <== oldRoot;
    
    var i;
    for (i = 0; i < nLevels; i++) {
        verifyUpdate.siblings[i] <== siblings[i];
    }

    verifyUpdate.oldKey <== indexOfGuardian;
    verifyUpdate.oldValue <== oldPubKey[0];
    verifyUpdate.isOld0 <== 0;
    verifyUpdate.newKey <== indexOfGuardian;
    verifyUpdate.newValue <== newPubKey;
    verifyUpdate.fnc[0] <== 0;
    verifyUpdate.fnc[1] <== 1;

    newRoot <== verifyUpdate.newRoot;
}

component main { public [ oldRoot, indexOfGuardian, oldPubKey, newPubKey] } = UpdateGuardian(10);