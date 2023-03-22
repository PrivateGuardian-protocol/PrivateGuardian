const { expect } = require("chai");
const { ethers } = require("hardhat");
const { poseidon_gencontract, poseidon, eddsa, smt } = require("circomlibjs")
const { genPrivKey } = require("maci-crypto");
const {
  generateUpdateGuardianProof,
  generateSocialRecoveryProof
} = require("./Utils");

describe.only("test guardian", function () {
    let poseidonContract;
    let account;
    let tree;
    let guards;
    beforeEach(async function () {
        [owner, ...addrs] = await ethers.getSigners();

        // poseidon contract
        const poseidonT3ABI = poseidon_gencontract.generateABI(1);
        const poseidonT3Bytecode = poseidon_gencontract.createCode(1);
        const PoseidonContract = new ethers.ContractFactory(poseidonT3ABI, poseidonT3Bytecode, owner);
        poseidonContract = await PoseidonContract.deploy();
        await poseidonContract.deployed();
        
        // guardian storage contract
        guardianStorageFactory = await ethers.getContractFactory("GuardianStorage");
        guardianStorageLib = await guardianStorageFactory.deploy();
        await guardianStorageLib.deployed()
        console.log("storage: " + guardianStorageLib.address);

        // private recovery account contract
        accountContract = await ethers.getContractFactory("PrivateRecoveryAccount", {
            libraries: {
                "contracts/GuardianStorage.sol:GuardianStorage": guardianStorageLib.address,
            },
        });
        account = await accountContract.connect(owner).deploy(owner.address); //random useless entryPoint address
        await account.deployed();
        // await account.connect(owner).initialize(owner.address);
        console.log("account: " + account.address);
        nonce = await account.nonce();
        console.log("nonce: " + nonce);

        // update verifier contract
        updateVerifierContract = await ethers.getContractFactory("UpdateGuardianVerifier");
        updateVerifier = await updateVerifierContract.deploy();
        await updateVerifier.deployed();

        // recover verifier contract
        recoverVerifierContract = await ethers.getContractFactory("SocialRecoveryVerifier");
        recoverVerifier = await recoverVerifierContract.deploy();
        await recoverVerifier.deployed();

        // init guardians
        prvA = genPrivKey().toString();
        prvB = genPrivKey().toString();
        prvC = genPrivKey().toString();
        pubA = eddsa.prv2pub(prvA)[0];
        pubB = eddsa.prv2pub(prvB)[0];
        pubC = eddsa.prv2pub(prvC)[0];
        tree = await smt.newMemEmptyTrie();
        await tree.insert(0, owner.address);
        await tree.insert(1, eddsa.prv2pub(prvA)[0]);
        await tree.insert(2, eddsa.prv2pub(prvB)[0]);
        await tree.insert(3, eddsa.prv2pub(prvC)[0]);

        guards = [pubA, pubB, pubC];
        await account.connect(owner).initilizeGuardians(
            guards,
            2,
            tree.root,
            updateVerifier.address,
            recoverVerifier.address,
            poseidonContract.address
        );
        console.log("old root: ", tree.root);
    });

    it("Change guardian", async function() {
        
        oldGuardians = await account.getGuardians();
        console.log("old guardians: ", oldGuardians);

        alterIdx = 1
        pubToBeAltered = guards[alterIdx];
        prvToBeAltered = guards[alterIdx];

        newPrv = genPrivKey().toString();
        newPub = eddsa.prv2pub(newPrv);
        const sig = eddsa.signMiMC(prvToBeAltered, newPub[0]);
        const res = await tree.update(alterIdx + 1, newPub[0]);
        console.log("new guardian: ", newPub[0]);
        
        const { public, proof } = await generateUpdateGuardianProof(
          res.siblings,
          sig, // priv: old sign new
          res.oldRoot, // pub
          res.oldKey,
          eddsa.prv2pub(prvToBeAltered), // pub
          newPub,
        );

        const a = [proof[0], proof[1]];
        const b = [[proof[2], proof[3]], [proof[4], proof[5]]];
        const c = [proof[6], proof[7]];

        console.log(public);
        console.log("old root2: ", res.oldRoot);
        await account.updateGuardian(a, b, c, public);
        newGuardians = await account.getGuardians();
        console.log("new guardians: ", newGuardians);
    })
});