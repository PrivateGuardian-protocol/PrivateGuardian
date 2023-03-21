const { expect } = require("chai");
const { run, ethers } = require("hardhat");
const {
  generateUpdateGuardianProof,
  generateSocialRecoveryProof
} = require("./Utils");
const { genPrivKey } = require("maci-crypto");
const { eddsa, poseidon, smt } = require("circomlibjs");

describe("test", function () {
  let owner;

  let tree;

  let prvA;
  let prvB;
  let prvC;
  let newPrvA;

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
    console.log("old root: "+tree.root)
    // deploy contracts
    const contracts = await run("deploy", {});
    updateGuardianVerifier = contracts.updateGuardianVerifierIns;
    socialRecoveryVerifier = contracts.socialRecoveryVerifierIns;
    console.log('updateGuardianVerifier address is: '+updateGuardianVerifier.address)
    console.log('socialRecoveryVerifier address is: '+socialRecoveryVerifier.address)
    owner = (await ethers.getSigner()).address; // for token transfer
  });

  describe("test cases", () => {
    it("Update GuardianA's PublicKey", async () => {
      // new A key
      const newPrv = genPrivKey().toString();
      const newPub = eddsa.prv2pub(newPrv);
      const sig = eddsa.signMiMC(prvA, newPub[0]);
      newPrvA = newPrv;

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
      expect(await updateGuardianVerifier.verifyProof(a,b,c,public)).to.equal(true);
      expect(await updateGuardianVerifier.verifyProof(
        [0,0],[[0,0], [0,0]],[0,0],public)).to.equal(false);
    })
    it("Verify Social Recovey Proof From GuardianB", async () => {
      const pubKey = eddsa.prv2pub(prvB);
      const signers = await ethers.getSigners();
      const newOwnerAddress = signers[1].address;
      const hashOfNewOwner = poseidon([newOwnerAddress]);
      const sig = eddsa.signMiMC(prvB, hashOfNewOwner);
      const res = await tree.find(1);

      const { public, proof } = await generateSocialRecoveryProof(
        res.siblings,
        pubKey,
        1,
        sig,
        hashOfNewOwner,
        tree.root,
      );

      // Re-construct the a, b, c parameters for the verification
      const a = [proof[0], proof[1]];
      const b = [[proof[2], proof[3]], [proof[4], proof[5]]];
      const c = [proof[6], proof[7]];
      expect(await socialRecoveryVerifier.verifyProof(a,b,c,public)).to.equal(true);
      expect(await socialRecoveryVerifier.verifyProof(
        [0,0],[[0,0], [0,0]],[0,0,],public)).to.equal(false);
    });
  });
});
