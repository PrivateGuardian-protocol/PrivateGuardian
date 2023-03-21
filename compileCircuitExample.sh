#!/bin/bash

algo=$1
version=$2
names=("${@:3}")

for name in "${names[@]}"; do
  cd circuits
  # rebuild the r1cs and zkey and verification key
  circom ./${name}.circom --r1cs --wasm -o ./compile
  mkdir -p ../hardhat/statics
  mv ./compile/${name}_js/${name}.wasm ../hardhat/statics
  rm -r ./compile/${name}_js
  # TODO: We should download pot file first
  snarkjs ${algo} setup ./compile/${name}.r1cs ./compile/trust_setup/pot${version}_final.ptau ./compile/${name}_0000.zkey
  snarkjs zkey contribute ./compile/${name}_0000.zkey ./compile/${name}.zkey --name="1st Contributor Name" -v -e="random text xxxxxx"

  cp ./compile/${name}.zkey ../hardhat/statics
  mkdir -p ./compile/frontend
  cp ../hardhat/statics/${name}.zkey ./compile/frontend
  cp ../hardhat/statics/${name}.wasm ./compile/frontend

  # export solidity verfier
  snarkjs zkey export solidityverifier ./compile/${name}.zkey ../contracts/libraries/${name}Verifier.sol
  cd ..
  node ./scripts/bump-solidity.js
done
