#!/bin/bash

algo=$1
version=$2
name=$3

cd circuits

# rebuild the r1cs and zkey and verification key
circom ./${name}.circom --r1cs --wasm -o ./compile
mv ./compile/${name}_js/${name}.wasm ../hardhat/statics
rm -R ./compile/${name}_js
snarkjs ${algo} setup ./compile/${name}.r1cs ./compile/trust_setup/pot${version}_final.ptau ./compile/${name}_0000.zkey
snarkjs zkey contribute ./compile/${name}_0000.zkey ./compile/${name}.zkey --name="1st Contributor Name" -v -e="random text xxxxxx"

cp ./compile/${name}.zkey ../hardhat/statics
cp ../hardhat/statics/${name}.zkey ./compile/frontend
cp ../hardhat/statics/${name}.wasm ./compile/frontend

# export solidity verfier
snarkjs zkey export solidityverifier ./compile/${name}.zkey ../hardhat/contracts/libraries/${name}Verifier.sol