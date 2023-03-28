const { task, types } = require("hardhat/config");
const circomlibjs = require("circomlibjs")

task("deploy", "Deploy Guardian verifier contract")
    // .addParam("merkleRoot", "Merkle Root of SMT ", undefined, types.string)
    .addOptionalParam("updateGuardianVerifier", "UpdateGuardianVerifier contract address", undefined, types.string)
    .addOptionalParam("socialRecoveryVerifier", "SocialRecoveryVerifier contract address", undefined, types.string)
    .addOptionalParam("privateRecoveryAccountFactory", "SocialRecoveryVerifier contract address", undefined, types.string)
    // .addOptionalParam("socialRecoveryVerifier", "SocialRecoveryVerifier contract address", undefined, types.string)
    .setAction(async ({ updateGuardianVerifier, socialRecoveryVerifier, privateRecoveryAccountFactory }, { ethers }) => {

  const [signer] = await ethers.getSigners();
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

        if (!privateRecoveryAccountFactory) {
          const guardianStorageFactory = await ethers.getContractFactory("GuardianStorage");
          const guardianStorageLib = await guardianStorageFactory.deploy();
          await guardianStorageLib.deployed()
          const PrivateRecoveryAccountFactory = await ethers.getContractFactory("PrivateRecoveryAccountFactory", {
            libraries: {
              "contracts/GuardianStorage.sol:GuardianStorage": guardianStorageLib.address,
            }
          });
          const _privateRecoveryAccountFactory = await PrivateRecoveryAccountFactory.deploy('0x0576a174D229E3cFA37253523E645A78A0C91B57');
          await _privateRecoveryAccountFactory.deployed();
          privateRecoveryAccountFactory = _privateRecoveryAccountFactory.address;
          console.log(`deploy private recovery account factory to testnet in ${privateRecoveryAccountFactory}`);
        }

        const poseidonT3ABI = circomlibjs.poseidon_gencontract.generateABI(1);
        const poseidonT3Bytecode = circomlibjs.poseidon_gencontract.createCode(1);
        const PoseidonLibT3Factory = new ethers.ContractFactory(poseidonT3ABI, poseidonT3Bytecode, signer);
        const poseidonT3Lib = await PoseidonLibT3Factory.deploy();
        await poseidonT3Lib.deployed();
        console.log(`PoseidonT3 library has been deployed to: ${poseidonT3Lib.address}`);

        // get deployed instances
        const updateGuardianVerifierIns = await hre.ethers.getContractAt("UpdateGuardianVerifier", updateGuardianVerifier);
        const socialRecoveryVerifierIns = await hre.ethers.getContractAt("SocialRecoveryVerifier", socialRecoveryVerifier);
        const privateRecoveryAccountFactoryIns = await hre.ethers.getContractAt("PrivateRecoveryAccountFactory", privateRecoveryAccountFactory);
        // console.log("updateGuardianVerifierIns's address is: "+updateGuardianVerifierIns.address)
        return {
            updateGuardianVerifierIns,
            socialRecoveryVerifierIns,
            privateRecoveryAccountFactoryIns
        };
    });