// deploy/00_deploy_your_contract.js

const { ethers } = require("hardhat");

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  // const { deployer } = await getNamedAccounts();
  const deployer = "0xE7aa7AF667016837733F3CA3809bdE04697730eF";
  await deploy("WenPassiveIncomeProtocol", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    // value: ethers.utils.parseEther("100"),
    // args: ["Hello Amigos"],
    log: true,
  });
  await deploy("WenPassiveIncomeNFT", {
    // Learn more about args here: https://www.npmjs.com/package/hardhat-deploy#deploymentsdeploy
    from: deployer,
    // value: ethers.utils.parseEther("5"),
    // args: ["Hello Amigos123"],
    log: true,
  });

  const token = await ethers.getContract("WenPassiveIncomeNFT", deployer);

  const protocol = await ethers.getContract(
    "WenPassiveIncomeProtocol",
    deployer
  );

  await protocol.setToken(token.address);
  await protocol.setVaultToken("0x859e9d8a4edadfedb5a2ff311243af80f85a91b8");
  /*
    // Getting a previously deployed contract

    To take ownership of wenPassiveIncomeProtocol using the ownable library uncomment next line and add the
    address you want to be the owner.
    // wenPassiveIncomeProtocol.transferOwnership(YOUR_ADDRESS_HERE);

    //const wenPassiveIncomeProtocol = await ethers.getContractAt('WenPassiveIncomeProtocol', "0xaAC799eC2d00C013f1F11c37E654e59B0429DF6A") //<-- if you want to instantiate a version of a contract at a specific address!
  */

  /*
  //If you want to send value to an address from the deployer
  const deployerWallet = ethers.provider.getSigner()
  await deployerWallet.sendTransaction({
    to: "0x34aA3F359A9D614239015126635CE7732c18fDF3",
    value: ethers.utils.parseEther("0.001")
  })
  */

  /*
  //If you want to send some ETH to a contract on deploy (make your constructor payable!)
  const wenPassiveIncomeProtocol = await deploy("WenPassiveIncomeProtocol", [], {
  value: ethers.utils.parseEther("0.05")
  });
  */

  /*
  //If you want to link a library into your contract:
  // reference: https://github.com/austintgriffith/scaffold-eth/blob/using-libraries-example/packages/hardhat/scripts/deploy.js#L19
  const wenPassiveIncomeProtocol = await deploy("WenPassiveIncomeProtocol", [], {}, {
   LibraryName: **LibraryAddress**
  });
  */
};
module.exports.tags = ["WenPassiveIncomeProtocol"];
