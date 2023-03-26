const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");
const { poseidon_gencontract, poseidon, eddsa, smt } = require("circomlibjs")
const { genPrivKey } = require("maci-crypto");
const {
  generateUpdateGuardianProof,
  generateSocialRecoveryProof
} = require("./Utils");
const { BigNumber } = require("ethers");

describe("test guardian", function () {
    let poseidonContract;
    let account;
    let tree;
    let prvs;
    let pubs;
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

        // private recovery account contract
        accountContract = await ethers.getContractFactory("PrivateRecoveryAccount", {
            libraries: {
                "contracts/GuardianStorage.sol:GuardianStorage": guardianStorageLib.address,
            },
        });
        account = await accountContract.connect(owner).deploy(owner.address); //random useless entryPoint address
        await account.deployed();

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
        pubA = eddsa.prv2pub(prvA);
        pubB = eddsa.prv2pub(prvB);
        pubC = eddsa.prv2pub(prvC);
        tree = await smt.newMemEmptyTrie();
        await tree.insert(0, owner.address);
        await tree.insert(1, eddsa.prv2pub(prvA)[0]);
        await tree.insert(2, eddsa.prv2pub(prvB)[0]);
        await tree.insert(3, eddsa.prv2pub(prvC)[0]);

        prvs = [prvA, prvB, prvC];
        pubs = [pubA, pubB, pubC];
        guards = [pubA[0], pubB[0], pubC[0]];
        await account.connect(owner).initilizeGuardians(
            guards,
            2,
            tree.root,
            updateVerifier.address,
            recoverVerifier.address,
            poseidonContract.address
        );
    });

    it("update guardian", async function() {
        oldGuardians = await account.getGuardians();

        updateIdx = 1
        prvToBeUpdated = prvs[updateIdx];
        pubToBeUpdated = guards[updateIdx];

        newPrv = genPrivKey().toString();
        newPub = eddsa.prv2pub(newPrv);
        const sig = eddsa.signMiMC(prvToBeUpdated, newPub[0]);
        const res = await tree.update(updateIdx + 1, newPub[0]);

        var { public, proof } = await generateUpdateGuardianProof(
          res.siblings,
          sig, // priv: old sign new
          res.oldRoot, // pub
          res.oldKey,
          eddsa.prv2pub(prvToBeUpdated), // pub
          newPub,
        );

        const a = [proof[0], proof[1]];
        const b = [[proof[2], proof[3]], [proof[4], proof[5]]];
        const c = [proof[6], proof[7]];

        await account.updateGuardian(a, b, c, public);
        newGuardians = await account.getGuardians();

        for(i = 0; i < oldGuardians.length; i++) {
            if(i == updateIdx) {
                expect(newGuardians[i]).to.equal(BigNumber.from(newPub[0]));
            } else {
                expect(newGuardians[i]).to.equal(oldGuardians[i]);
            }
        }
    })

    it("social recover", async function() {
        guardians = await account.getGuardians();
        oldOwner = await account.owner();
        newOwner = addrs[3].address;
        hashOfNewOwner = poseidon([newOwner]);

        for(i = 0; i < Math.floor(guardians.length / 2) + 1; i ++) {
            sig = eddsa.signMiMC(prvs[i], hashOfNewOwner);
            console.log("🚀 ~ file: test_guardians.js:121 ~ it ~ sig:", sig)
            res = await tree.find(i + 1); //plus one because of the root
            console.log("🚀 ~ file: test_guardians.js:123 ~ it ~ res:", res)
            var { public, proof } = await generateSocialRecoveryProof(
            res.siblings,
            pubs[i],
            i + 1, //plus one because of the root
            sig,
            hashOfNewOwner,
            tree.root,
            );

            a = [proof[0], proof[1]];
            b = [[proof[2], proof[3]], [proof[4], proof[5]]];
            c = [proof[6], proof[7]];

            // Call recover from arbitrary eoa account
            await account.connect(addrs[1]).recover(
                newOwner,
                a,
                b,
                c,
                public
            )
        }

        owner2 = await account.owner();
        expect(newOwner).to.equal(owner2);
    })
});