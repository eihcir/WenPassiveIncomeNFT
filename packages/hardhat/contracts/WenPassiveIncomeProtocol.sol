pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT
import "./IWenPassiveIncomeProtocol.sol";
import "./IERC721.sol";
import "./ICETH.sol";


//   /$$      /$$
//  | $$  /$ | $$
//  | $$ /$$$| $$  /$$$$$$  /$$$$$$$
//  | $$/$$ $$ $$ /$$__  $$| $$__  $$
//  | $$$$_  $$$$| $$$$$$$$| $$  \ $$
//  | $$$/ \  $$$| $$_____/| $$  | $$
//  | $$/   \  $$|  $$$$$$$| $$  | $$
//  |__/     \__/ \_______/|__/  |__/
//
//
//
//   /$$$$$$$                              /$$
//  | $$__  $$                            |__/
//  | $$  \ $$ /$$$$$$   /$$$$$$$ /$$$$$$$ /$$ /$$    /$$ /$$$$$$
//  | $$$$$$$/|____  $$ /$$_____//$$_____/| $$|  $$  /$$//$$__  $$
//  | $$____/  /$$$$$$$|  $$$$$$|  $$$$$$ | $$ \  $$/$$/| $$$$$$$$
//  | $$      /$$__  $$ \____  $$\____  $$| $$  \  $$$/ | $$_____/
//  | $$     |  $$$$$$$ /$$$$$$$//$$$$$$$/| $$   \  $/  |  $$$$$$$
//  |__/      \_______/|_______/|_______/ |__/    \_/    \_______/
//
//
//
//   /$$$$$$                                                       /$$$$
//  |_  $$_/                                                      /$$  $$
//    | $$   /$$$$$$$   /$$$$$$$  /$$$$$$  /$$$$$$/$$$$   /$$$$$$|__/\ $$
//    | $$  | $$__  $$ /$$_____/ /$$__  $$| $$_  $$_  $$ /$$__  $$   /$$/
//    | $$  | $$  \ $$| $$      | $$  \ $$| $$ \ $$ \ $$| $$$$$$$$  /$$/
//    | $$  | $$  | $$| $$      | $$  | $$| $$ | $$ | $$| $$_____/ |__/
//   /$$$$$$| $$  | $$|  $$$$$$$|  $$$$$$/| $$ | $$ | $$|  $$$$$$$  /$$
//  |______/|__/  |__/ \_______/ \______/ |__/ |__/ |__/ \_______/ |__/
//
//


//@notice (Defi + NFT) Protocol incorporating staking and lending to a NFT collection
//This is a proof of concept made as an entry in the 2021 EthOnline Hackathon
//It is unaudited and lacks basic security such as Access Control
contract WenPassiveIncomeProtocol is IWenPassiveIncomeProtocol {
    IERC721 public immutable token;
    ICETH public vaultToken;

    mapping(uint256 => StakedData) public staked; // mapping of tokenId to (user/timestamp)
    mapping(uint256 => LoanData) public loaned; // mapping of tokenId to (user/amount/timestamp)

    uint256[] public rewardTimes; //array of times rewards are claimable
    bytes32 public rewardTimesHash; // hash of rewardTimes
    uint256[] public rewardAmounts; //array of reward amounts
    bytes32 public rewardAmountsHash; // hash of rewardAmounts

    uint256 public minimumReserves; //minimum amount of Eth retained in this contract
    uint256 public maximumReserves; //maximum amount of Eth retained in this contract
    uint256 public maximumLoan; //minimum amount of Eth retained in this contract
    uint256 public loanInterestRate; //interest rate to charge up front
    uint256 public loanDuration; //days

    constructor(IERC721 token_) {
        token = token_;
        rewardAmountsHash = keccak256(abi.encode(rewardAmounts));
        rewardTimesHash = keccak256(abi.encode(rewardTimes));
    }

    // @notice This function is required for any contract supporting safeTransfers
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    //notice: Automatically deposits into vault any excess over maximum reserves
    receive() external payable {
        if (address(this).balance > maximumReserves) {
            uint256 amountOut = address(this).balance - maximumReserves;
            deposit(amountOut);
        }
        emit EthReceived(msg.sender, msg.value);
    }

    //@notice Direct transfer to the smart contract, skips vault deposits
    function receiveFunds() external payable {
        emit EthReceived( msg.sender, msg.value);
    }

    //@notice Deposit in vault, receive vault tokens
    //@param wad Amount to deposit
    function deposit(uint256 wad) public {
        (bool success, ) = address(vaultToken).call{value: wad, gas: 250000}(
            abi.encodeWithSignature("mint()")
        );
        require(success, "Failed to deposit");
        emit Deposited(wad);
    }

    //@notice Redeem vault tokens for ether
    //@param wad Amount to redeem
    function withdraw(uint256 wad) public {
        (bool success, ) = address(vaultToken).call{value: wad, gas: 250000}(
            abi.encodeWithSignature("redeem()", wad)
        );
        require(success, "Failed to withdraw");

        emit Withdrawn(wad);
    }

    //@notice ApproveAll required
    //@param tokenId Id of token being staked
    function stake(uint256 tokenId) external {
        require(token.ownerOf(tokenId) == msg.sender, "Not owned");
        require(
            token.isApprovedForAll(msg.sender, address(this)),
            "Not approved"
        );

        staked[tokenId] = StakedData(msg.sender, block.timestamp);

        token.safeTransferFrom(msg.sender, address(this), tokenId);
        emit Staked(msg.sender, tokenId);
    }

    //@notice Useful for transferring liquidated NFTs
    //@param tokenId Id of token being transfered
    //@param guy Address of recipient
    function transfer(uint256 tokenId, address guy) external {
        token.safeTransferFrom(address(this), guy, tokenId);
    }

    //@notice Internal function for unstaking
    //@param tokenId Id of token being unstaked
    function _unstake(uint256 tokenId) internal {
        staked[tokenId] = StakedData(address(0), 0);
        token.approve(msg.sender, tokenId);
        token.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Unstaked(msg.sender, tokenId);
    }

    //@notice Used to claim rewards and (optionally) unstake NFT
    //@param tokenId Id of token to claim rewards for
    //@param and_unstake Set to true if returning NFT to owner, setting false updats timestamp
    //@dev To save gas, the rewardAmounts[] and rewardTimes[] are passed in with the other arguments
    //and checked against their stored hash. Reading from calldata instead of SLOAD saves 90%+ gas
    //https://medium.com/coinmonks/full-knowledge-user-proofs-working-with-storage-without-paying-for-gas-e124cef0c078
    function claimRewards(
        uint256 tokenId,
        bool and_unstake,
        uint256[] calldata rewardAmounts_,
        uint256[] calldata rewardTimes_
    ) external {
        require(staked[tokenId].user == msg.sender, "Unauthorized");
        require(
            keccak256(abi.encode(rewardAmounts_)) == rewardAmountsHash,
            "Invalid"
        );
        require(
            keccak256(abi.encode(rewardTimes_)) == rewardTimesHash,
            "Invalid"
        );

        StakedData memory stakedData = staked[tokenId];
        uint256 totalRewards = 0;
        for (uint256 idx = 0; idx < rewardTimes_.length; idx++) {
            if (rewardTimes_[idx] >= stakedData.timestamp) {
                totalRewards += rewardAmounts_[idx];
            }
        }

        if (and_unstake) {
            _unstake(tokenId);
        } else {
            staked[tokenId] = StakedData(msg.sender, block.timestamp);
        }

        (bool success, ) = msg.sender.call{value: totalRewards}("");
        require(success, "Failed transfer");
        emit RewardsClaimed(msg.sender, tokenId, totalRewards);
    }

    //@notice Used by admin to set reward
    //@param wad Represents amount of eth PER STAKED ADDRESS available as reward
    //@dev RewardsAmounts and RewardsTimes hashes updated
    function addReward(uint256 wad) external {
        rewardAmounts.push(wad);
        uint256 timestamp = block.timestamp;
        rewardTimes.push(timestamp);
        rewardAmountsHash = keccak256(abi.encode(rewardAmounts));
        rewardTimesHash = keccak256(abi.encode(rewardTimes));
        emit RewardAdded(wad, timestamp);
    }

    //@notice NFT transferred to smart contract in exchange for an eth loan
    //@tokenId Id of token being used as collateral
    //@wad loan amount in eth
    function borrow(uint256 tokenId, uint256 wad) external {
        require(token.ownerOf(tokenId) == msg.sender, "Not owned");
        require(
            token.isApprovedForAll(msg.sender, address(this)),
            "Not approved"
        );

        loaned[tokenId] = LoanData(msg.sender, block.timestamp, wad);
        token.safeTransferFrom(msg.sender, address(this), tokenId);

        uint256 netAmount = wad * (1e18 - loanInterestRate) / 1e18;
        (bool success, ) = msg.sender.call{value: netAmount}("");
        require(success, "Failed transfer");

        emit Loaned(msg.sender, tokenId, wad);
    }

    //@notice Internal function used to release collateralized NFT
    //@param tokenId Id of token used for collateral
    function _release(uint256 tokenId) internal {
        loaned[tokenId] = LoanData(address(0), 0, 0);
        token.approve(msg.sender, tokenId);
        token.safeTransferFrom(address(this), msg.sender, tokenId);
        emit CollateralReleased(msg.sender, tokenId);
    }

    //@notice Used to liquidate overdue loan by seizing NFT
    //@param tokenId Id of token used as collateral for overdue loans
    function liquidate(uint256 tokenId) external {
        LoanData memory loaned_ = loaned[tokenId];
        require(block.timestamp > loaned_.timestamp + loanDuration, "Loan healthy");
        loaned[tokenId] = LoanData(address(0), 0, 0);
        emit Liquidated(loaned_.user, tokenId);
    }

    //@notice Used to repay loan
    //@param tokenId Id of token used as collateral
    function repay(uint256 tokenId) external payable {
        LoanData memory loanData = loaned[tokenId];
        require(loanData.user == msg.sender, "Unauthorized");
        require(msg.value <= loanData.owed, "overpayment");
        emit EthReceived(msg.sender, msg.value);
        if (msg.value == loanData.owed) {
            _release(tokenId);
        } else {
            loaned[tokenId].owed = loanData.owed - msg.value;
        }
        if (address(this).balance > maximumReserves) {
            uint256 amountOut = address(this).balance - maximumReserves;
            deposit(amountOut);
        }
        emit Repaid(msg.sender, tokenId, msg.value);
    }

    //@notice Used by admin to set Vault contract for use with deposits
    //@param Address of vault
    //@dev Becareful if changing this, redeem Vault deposits first
    function setVaultToken(ICETH token_) external {
        vaultToken = token_;
        emit VaultTokenSet(address(token_));
    }

    //@notice Used to set minimum reserves of eth held by this contract
    //@param wad Amount in eth
    function setMinimumReserves(uint256 minimumReserves_) external {
        minimumReserves = minimumReserves_;
        emit MinimumReservesSet(minimumReserves_);
    }

    //@notice Used to set maximum reserves of eth held by this contract
    //@param wad Amount in eth
    function setMaximumReserves(uint256 maximumReserves_) external {
        maximumReserves = maximumReserves_;
        emit MaximumReservesSet(maximumReserves_);
    }


    //@notice Used to set maximum loan amount
    //@param wad Amount in eth
    function setMaximumLoan(uint256 maximumLoan_) external {
        maximumLoan = maximumLoan_;
        emit MaximumLoanSet(maximumLoan_);
    }

    //@notice Used to set upfront interest rate taken for loans
    //@param rate_ Rate charged up front
    function setLoanInterestRate(uint256 rate) external {
        loanInterestRate = rate;
        emit LoanInterestRateSet(rate);
    }

    //@notice Used to set duration of loan
    //@param duration_ number of days ion loan term
    function setLoanDuration(uint256 duration) external {
        loanDuration = duration * (1 days);
        emit LoanDurationSet(duration);
    }
}
