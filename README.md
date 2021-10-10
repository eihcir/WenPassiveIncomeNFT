![image](https://repository-images.githubusercontent.com/410123230/e0606bb2-9432-40c1-9c0a-4230ccfa5f97)

WenPassiveIncome (WPI) NFT protocol adds passive income flows to an existing NFT collection. 


Stake NFT's to earn eth
Borrow eth using the NFT as collateral
Automatically deposits excess eth to an interest earning vault


The WPI protocol was developed with a "DAO first" approach.  It is flexible and full-featured enough to work with a DAO.  But it is also simple enough to be implemented by a solo NFT creator.

Compound - The WPI protocol is directly integrated with Compound, over a certain threshold, all eth received by the protocol contract is automatically deposited into a Compound vault.  When the reserves of the contract get too low, eth is withdrawn from the vault.

Rarible - The entire front end was built with the rarible-sdk.  Furthermore, the contract used was the Rarible ERC-721 contract with royalties that are automatically sent to the WenPassiveIncome protocol contract and deposited into a Compound vault to start earning interest.


Features

Lending - NFT holders may use their NFTs as collateral to borrow eth.  The loan terms (max borrowable, interest, duration) are set on the protocol contract

Staking - Users may stake their NFTs which entitle them to any rewards added during the time they are staked

Automatic deposit - Easy "Treasury Management" via automatic deposits into an interest earning Compound vault is another source of passive income

How it was built
We had the initial idea of wanting to bring NFT's and DeFi together but we weren't sure how to do it.  We spent a lot of time reviewing the sponsors and in the end decided to go with Rarible and Compound as two leaders in their respective spaces and also because of their feature sets and community support.

We spent a lot of time doing tutorials and hacking around with both Compound and Rarible.  During this time we scoped out our project and started thinking about the smart contract.

The most time was spent on the smart contract.  Using scaffold-eth (Hardhat / React)  definitely made our life easier as it was so simple to quickly prototype and test.  We had been working with Ropsten the whole time, but towards the end, we figured out one of the external contracts we were working with was broken on Ropsten so we had to switch to Rinkeby.  That was pretty seamless thanks to scaffold-eth but our only problem was we had no Rinkeby eth!! Haha.  We turned to the EthGlobal community and soon had more than enough eth for our demo :)

Throughout the process, we were very mindful of gas costs.  That is another reason we selected Rarible, because using their smart contract allowed for lazy minting which could potentially save a small artist/operator a lot in minting costs.

Additionally, we went to great lengths to save gas within the smart contract.  For example, we used a concept called Full Knowledge User Proofs (Owleksiy)  that takes advantage of the fact that the front end can read contract storage for free then pass the arrays in as an argument to a contract function so the contract only has to use calldata.  This can reduce gas costs significantly when reading large arrays stored in state -- as much as 90% or more.  We specifically used this concept in the claimRewards() function which has to iterate through 2 potentially very large arrays stored in state in order to calculate the staking rewards due a user. https://medium.com/coinmonks/full-knowledge-user-proofs-working-with-storage-without-paying-for-gas-e124cef0c078

There was a lot of complexity with the smart contract and it took a majority of our time.  As such we didn't have much time to work on the front end which is a shame because working with the rarible-sdk made it very easy to implement features.  In the end, we were unable to implement about half of the features we had planned including:

 - add buy/sell orders to user dashboard
 - Add ability to borrow stablecoins from Compound for users and treasury
 - Add adjust Rarity royalties to the admin dashboard
 - add lazy-minting to admin dashboard


We will continue to work on this project and add these futures in the future.

