pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/smt/smtverifier.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/eddsamimc.circom";

template SocialRecovery(nLevels) {
    signal input siblings[nLevels];
    signal input pubKey[2];
    signal input indexOfGuardian;
    signal input sig[3];
    signal input hashOfNewOwner; // poseidon hash
    signal input merkleRoot;
    signal output nullifier; // hash of hash of owner and index

    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== hashOfNewOwner;
    poseidon.inputs[1] <== indexOfGuardian;
    nullifier <== poseidon.out;

    component verifySignature = EdDSAMiMCVerifier();
    verifySignature.enabled <== 1;
    verifySignature.Ax <== pubKey[0];
    verifySignature.Ay <== pubKey[1];
    verifySignature.S <== sig[0];
    verifySignature.R8x <== sig[1];
    verifySignature.R8y <== sig[2];
    verifySignature.M <== hashOfNewOwner;

    component verifySMT = SMTVerifier(nLevels);
    verifySMT.enabled <== 1;
    verifySMT.root <== merkleRoot;
    for(var i = 0; i < nLevels; i++) {
        verifySMT.siblings[i] <== siblings[i];
    }
    verifySMT.oldKey <== indexOfGuardian;
    verifySMT.oldValue <== pubKey[0];
    verifySMT.isOld0 <== 0;
    verifySMT.key <== indexOfGuardian;
    verifySMT.value <== pubKey[0];
    verifySMT.fnc <== 0;
}

component main { public [ hashOfNewOwner, merkleRoot] } = SocialRecovery(10);