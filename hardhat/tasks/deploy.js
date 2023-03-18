const { task, types } = require("hardhat/config");

task("deploy", "Deploy Guardian verifier contract")
    // .addParam("merkleRoot", "Merkle Root of SMT ", undefined, types.string)
    .addOptionalParam("updateGuardianVerifier", "UpdateGuardianVerifier contract address", undefined, types.string)
    // .addOptionalParam("updateGuardianVerifier", "updateGuardianVerifier contract address", undefined, types.string)
    // .addOptionalParam("inclusionOfGuardianVerifier", "inclusionOfGuardianVerifier contract address", undefined, types.string)
    .setAction(async ({ updateGuardianVerifier }, { ethers, _ }) => {
        
        if (!updateGuardianVerifier) {
            const UpdateGuardianVerifier = await ethers.getContractFactory("UpdateGuardianVerifier");
            const _updateGuardianVerifier = await UpdateGuardianVerifier.deploy();
            await _updateGuardianVerifier.deployed();
            updateGuardianVerifier = _updateGuardianVerifier.address;
            console.log(`deploy update Guardian verifier to testnet in ${updateGuardianVerifier}`);
        }

        // get deployed instances
        const updateGuardianVerifierIns = await hre.ethers.getContractAt("UpdateGuardianVerifier", updateGuardianVerifier);
        // console.log("updateGuardianVerifierIns's address is: "+updateGuardianVerifierIns.address)
        return {
            updateGuardianVerifierIns
        };
    });