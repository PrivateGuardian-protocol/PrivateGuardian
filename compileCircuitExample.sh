#!/bin/bash

algo=$1
version=$2
names=("${@:3}")

for name in "${names[@]}"; do
  cd circuits
  # rebuild the r1cs and zkey and verification key
  circom ./${name}.circom --r1cs --wasm -o ./compile
  mkdir -p ../statics
  mv ./compile/${name}_js/${name}.wasm ../statics
  rm -r ./compile/${name}_js

  # download pot file first
  if [ -f ./compile/trust_setup/powersOfTau28_hez_final_${version}.ptau ]; then
    echo "powersOfTau28_hez_final_${version}.ptau already exists. Skipping."
  else
    mkdir -p ./compile/trust_setup
    cd ./compile/trust_setup
    echo "Downloading powersOfTau28_hez_final_${version}.ptau"
    wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_${version}.ptau
    cd ../..
  fi

  snarkjs ${algo} setup ./compile/${name}.r1cs ./compile/trust_setup/powersOfTau28_hez_final_${version}.ptau ./compile/${name}_0000.zkey
  snarkjs zkey contribute ./compile/${name}_0000.zkey ./compile/${name}.zkey --name="1st Contributor Name" -v -e="random text xxxxxx"

  cp ./compile/${name}.zkey ../statics
  mkdir -p ./compile/frontend
  cp ../statics/${name}.zkey ./compile/frontend
  cp ../statics/${name}.wasm ./compile/frontend

  # export solidity verfier
  snarkjs zkey export solidityverifier ./compile/${name}.zkey ../contracts/libraries/${name}Verifier.sol
  cd ..
  node ./scripts/bump-solidity.js
done
