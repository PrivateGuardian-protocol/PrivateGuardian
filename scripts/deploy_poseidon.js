const circomlibjs = require("circomlibjs")

async function main() {

  const poseidonT3ABI = circomlibjs.poseidon_gencontract.generateABI(1);
  const poseidonT3Bytecode = circomlibjs.poseidon_gencontract.createCode(1);

  const [signer] = await ethers.getSigners();

  const PoseidonLibT3Factory = new ethers.ContractFactory(poseidonT3ABI, poseidonT3Bytecode, signer);
  const poseidonT3Lib = await PoseidonLibT3Factory.deploy();

  await poseidonT3Lib.deployed();

  console.log(`PoseidonT3 library has been deployed to: ${poseidonT3Lib.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
