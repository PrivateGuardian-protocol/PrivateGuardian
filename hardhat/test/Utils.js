const { ZqField } = require("ffjavascript");
const { groth16 } = require("snarkjs");
const { poseidon } = require("circomlibjs");

// Creates the finite field
const SNARK_FIELD_SIZE = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);
const Fq = new ZqField(SNARK_FIELD_SIZE);

const generateUpdateGuardianProof = async (
  siblings,
  sig,
  oldRoot,
  indexOfGuardian,
  oldPubKey,
  newPubKey,
) => {
  // depth of smt : 10
  const length = 10 - siblings.length;
  for (let i = 0; i < length; i++) {
    siblings.push(BigInt(0));
  }

  const input = {
    siblings: siblings,
    sig: [sig.S, sig.R8[0], sig.R8[1]],
    oldRoot: oldRoot,
    indexOfGuardian: indexOfGuardian,
    oldPubKey: oldPubKey,
    newPubKey: newPubKey[0],
  };

  const result = await groth16.fullProve(
    input,
    "./statics/UpdateGuardian.wasm",
    "./statics/UpdateGuardian.zkey"
  );

  return {
    public: result.publicSignals,
    proof: packToSolidityProof(result.proof),
    // proof: result.proof,
  };
};

const generateSocialRecoveryProof = async (
    siblings,
    pubKey,
    indexOfGuardian,
    sig,
    hashOfNewOwner,
    merkleRoot,
  ) => {
    // depth of smt : 10
    const length = 10 - siblings.length;
    for (let i = 0; i < length; i++) {
      siblings.push(BigInt(0));
    }
  
    const input = {
        siblings: siblings,
        pubKey: pubKey,
        indexOfGuardian: indexOfGuardian,
        sig: [sig.S, sig.R8[0], sig.R8[1]],
        hashOfNewOwner: hashOfNewOwner,
        merkleRoot: merkleRoot,
    };
  
    const result = await groth16.fullProve(
      input,
      "./statics/SocialRecovery.wasm",
      "./statics/SocialRecovery.zkey"
    );
  
    return {
      public: result.publicSignals,
      proof: packToSolidityProof(result.proof),
    };
  };

const fulfillSiblings = (siblings) => {
  const length = 10 - siblings.length;
  for (let i = 0; i < length; i++) {
    siblings.push(BigInt(0));
  }
  return siblings;
}

// transform to solidity proof format
function packToSolidityProof(proof) {
  return [
    proof.pi_a[0],
    proof.pi_a[1],
    proof.pi_b[0][1],
    proof.pi_b[0][0],
    proof.pi_b[1][1],
    proof.pi_b[1][0],
    proof.pi_c[0],
    proof.pi_c[1],
  ];
}

function unstringifyBigInts(o) {
  if ((typeof(o) == "string") && (/^[0-9]+$/.test(o) ))  {
      return BigInt(o);
  } else if ((typeof(o) == "string") && (/^0x[0-9a-fA-F]+$/.test(o) ))  {
      return BigInt(o);
  } else if (Array.isArray(o)) {
      return o.map(unstringifyBigInts);
  } else if (typeof o == "object") {
      if (o===null) return null;
      const res = {};
      const keys = Object.keys(o);
      keys.forEach( (k) => {
          res[k] = unstringifyBigInts(o[k]);
      });
      return res;
  } else {
      return o;
  }
}

async function getInput(public, proof) {
    // Convert parameter array elements from string to BigInt
    const editedPublicSignals = unstringifyBigInts(public);
    const editedProof = unstringifyBigInts(proof);

    // Generate copy-pasteable input parameters to call the verify method in the Solidity contract
    const calldata = await groth16.exportSolidityCallData(editedProof, editedPublicSignals);

    // Flatten the array. 2nd calldata element is a nested array, we flatten it to generate single array
    const argv = calldata.replace(/["[\]\s]/g, "").split(',').map(x => BigInt(x).toString());

    // Re-construct the a, b, c parameters for the verification
    const a = [argv[0], argv[1]];
    const b = [[argv[2], argv[3]], [argv[4], argv[5]]];
    const c = [argv[6], argv[7]];
    // Last element is the public output. It is "2" for the current input
    const Input = argv.slice(8);
    return a,b,c,Input
  }

module.exports = {
  generateUpdateGuardianProof,
  generateSocialRecoveryProof,
  unstringifyBigInts,
  getInput
};
