const { expect } = require("chai");
const { groth16 } = require("snarkjs");
const { run, ethers } = require("hardhat");
const {
  generateUpdateGuardianProof,
} = require("./Utils");
const { genPrivKey } = require("maci-crypto");
const { eddsa, poseidon, smt } = require("circomlib");

describe("test", function () {
  let owner;

  let tree;

  let prvA;
  let prvB;
  let prvC;

  before(async () => {
    // create private keys
    prvA = genPrivKey().toString(); // get privateKey in snark-field size
    prvB = genPrivKey().toString();
    prvC = genPrivKey().toString();

    // create Sparse Merkle Tree(SMT)
    tree = await smt.newMemEmptyTrie();
    await tree.insert(0, eddsa.prv2pub(prvA)[0]);
    await tree.insert(1, eddsa.prv2pub(prvB)[0]);
    await tree.insert(2, eddsa.prv2pub(prvC)[0]);

    // deploy contracts
    const contracts = await run("deploy", {});
    updateGuardianVerifier = contracts.updateGuardianVerifierIns;
    console.log('updateGuardianVerifier address is: '+updateGuardianVerifier.address)
    owner = (await ethers.getSigner()).address; // for token transfer
  });

  describe("test cases", () => {
    it("Update GuardianA's PublicKey", async () => {
      // new A key
      const newPrv = genPrivKey().toString();
      const newPub = eddsa.prv2pub(newPrv);
      const sig = eddsa.signMiMC(prvA, newPub[0]);   
      
      // A index is 0
      const res = await tree.update(0, newPub[0]);

      const { public, proof } = await generateUpdateGuardianProof(
        res.siblings,
        sig, // priv: old sign new
        res.oldRoot, // pub
        res.oldKey,
        eddsa.prv2pub(prvA), // pub
        newPub,
      );

      // Re-construct the a, b, c parameters for the verification
      const a = [proof[0], proof[1]];
      const b = [[proof[2], proof[3]], [proof[4], proof[5]]];
      const c = [proof[6], proof[7]];
      await updateGuardianVerifier.testVerifyProof(a,b,c,public);
    })
  });
});
