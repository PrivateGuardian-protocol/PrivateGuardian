const { expect } = require("chai");
const { ethers } = require("hardhat");
const {poseidon_gencontract, poseidon} = require("circomlibjs")

describe("test poseidon", function () {
    let poseidonT3Lib;
    beforeEach(async function () {
        [owner, ...addrs] = await ethers.getSigners();
        const poseidonT3ABI = poseidon_gencontract.generateABI(1);
        const poseidonT3Bytecode = poseidon_gencontract.createCode(1);

        const PoseidonLibT3Factory = new ethers.ContractFactory(poseidonT3ABI, poseidonT3Bytecode, owner);
        poseidonT3Lib = await PoseidonLibT3Factory.deploy();

        await poseidonT3Lib.deployed();
    });

    it("CASE 1", async function() {
        
    })
});