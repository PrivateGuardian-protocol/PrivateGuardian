const { task, types } = require("hardhat/config");

task("deploy", "Deploy Guardian verifier contract")
    // .addParam("merkleRoot", "Merkle Root of SMT ", undefined, types.string)
    .addOptionalParam("updateGuardianVerifier", "UpdateGuardianVerifier contract address", undefined, types.string)
    .addOptionalParam("socialRecoveryVerifier", "socialRecoveryVerifier contract address", undefined, types.string)
    .setAction(async ({ updateGuardianVerifier, socialRecoveryVerifier }, { ethers, _ }) => {

        if (!updateGuardianVerifier) {
            const UpdateGuardianVerifier = await ethers.getContractFactory("UpdateGuardianVerifier");
            const _updateGuardianVerifier = await UpdateGuardianVerifier.deploy();
            await _updateGuardianVerifier.deployed();
            updateGuardianVerifier = _updateGuardianVerifier.address;
            console.log(`deploy update Guardian verifier to testnet in ${updateGuardianVerifier}`);
        }

        if (!socialRecoveryVerifier) {
            const SocialRecoveryVerifier = await ethers.getContractFactory("SocialRecoveryVerifier");
            const _socialRecoveryVerifier = await SocialRecoveryVerifier.deploy();
            await _socialRecoveryVerifier.deployed();
            socialRecoveryVerifier = _socialRecoveryVerifier.address;
            console.log(`deploy social recovery verifier to testnet in ${socialRecoveryVerifier}`);
        }

        // get deployed instances
        const updateGuardianVerifierIns = await hre.ethers.getContractAt("UpdateGuardianVerifier", updateGuardianVerifier);
        const socialRecoveryVerifierIns = await hre.ethers.getContractAt("SocialRecoveryVerifier", socialRecoveryVerifier);
        // console.log("updateGuardianVerifierIns's address is: "+updateGuardianVerifierIns.address)
        return {
            updateGuardianVerifierIns,
            socialRecoveryVerifierIns
        };
    });