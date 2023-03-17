const fs = require("fs");
const solidityRegex = /pragma solidity \^\d+\.\d+\.\d+/ // ^0.6.11
const solidityRegex2 = /pragma solidity >=\d+\.\d+\.\d+ <\d+\.\d+\.\d+/ // >=0.7.0 <0.9.0
const verifierRegex = /contract (Verifier|PlonkVerifier)/

// [assignment] add your own scripts below to modify the other verifier contracts you will build during the assignment
let contracts = ['UpdateGuardianVerifier'];

contracts.forEach(contract => {
  let content = fs.readFileSync(`./contracts/libraries/${contract}.sol`, { encoding: 'utf-8' });
  let bumped = content.replace(solidityRegex, 'pragma solidity ^0.8.0')
                      .replace(solidityRegex2, 'pragma solidity ^0.8.0');
  bumped = bumped.replace(verifierRegex, `contract ${contract}`);

  fs.writeFileSync(`./contracts/libraries/${contract}.sol`, bumped);
  console.log(`${contract} is bumped`);
});