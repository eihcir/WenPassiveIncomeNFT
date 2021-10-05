// pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

import "hardhat/console.sol";
// import "@openzeppelin/contracts/access/Ownable.sol"; //https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/access/Ownable.sol
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

struct StakedData {
    address user;
    uint256 timestamp;
}

struct LoanData {
    address user;
    uint256 timestamp;
    uint256 owed;
}

//@Notice Protocol for adding staking or lending to a NFT collection
contract WenPassiveIncomeProtocol {
    event SetToken(address indexed token);
    event Loaned(uint256 indexed tokenId, address indexed guy, uint256 loanAmount);
    event Staked(uint256 indexed tokenId, address indexed guy);
    event Unstaked(uint256 indexed tokenId, address indexed guy);
    event RewardsClaimed(
        uint256 indexed tokenId,
        address indexed guy,
        uint256 amount
    );

    IERC721 public token;
    using Counters for Counters.Counter;
    Counters.Counter public stakedCount;
    mapping(uint256 => StakedData) public staked; // mapping of tokenId to (user/timestamp)
    uint256[] public rewardTimes; //array of times rewards are claimable
    uint256[] public rewardAmounts; //array of reward amounts
    bytes32 public rewardAmountsHash;
    bytes32 public rewardTimesHash;

    mapping(uint256 => LoanData) public loaned; // mapping of tokenId to (user/amount/timestamp)

    constructor() public payable {
        console.log("hi");
        // require(rewardsHash == bytes32(""), 'whaat');
    }

    // @notice Required for any contract that wants to support safeTransfers
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function stake(uint256 tokenId) external {
        require(token.ownerOf(tokenId) == msg.sender, "Not owned");
        require(
            token.isApprovedForAll(msg.sender, address(this)),
            "Not approved"
        );

        staked[tokenId] = StakedData(msg.sender, block.timestamp);
        stakedCount.increment();

        token.safeTransferFrom(msg.sender, address(this), tokenId);
        emit Staked(tokenId, msg.sender);
    }

    function _unstake(uint256 tokenId) internal {
        stakedCount.decrement();
        staked[tokenId] = StakedData(address(0), 0);
        token.approve(msg.sender, tokenId);
        token.safeTransferFrom(address(this), msg.sender, tokenId);
        emit Unstaked(tokenId, msg.sender);
    }

    function claimRewardsAndUnstake(uint256 tokenId) external {
        require(staked[tokenId].user == msg.sender, "Unauthorized");
        // TODO: Include arrays in calldata
        uint256[] memory rewardAmounts_ = rewardAmounts; // change to callData later with UI
        uint256[] memory rewardTimes_ = rewardTimes;
        require(rewardAmounts_.length == rewardTimes_.length);
        require(
            keccak256(abi.encode(rewardAmounts_)) == rewardAmountsHash,
            "Invalid"
        );
        require(
            keccak256(abi.encode(rewardTimes_)) == rewardTimesHash,
            "Invalid"
        );

        _unstake(tokenId);

        StakedData memory stakedData = staked[tokenId];
        uint256 totalRewards = 0;
        for (uint256 idx = 0; idx < rewardTimes_.length; idx++) {
            if (rewardTimes_[idx] >= stakedData.timestamp) {
                totalRewards += rewardAmounts_[idx];
            }
        }

        (bool success, ) = msg.sender.call{value: totalRewards}("");
        require(success, "Failed transfer");
        emit RewardsClaimed(tokenId, msg.sender, totalRewards);
    }

    function addReward(uint256 amount) external {
        rewardAmounts.push(amount);
        rewardTimes.push(block.timestamp);
        rewardAmountsHash = keccak256(abi.encode(rewardAmounts));
        rewardTimesHash = keccak256(abi.encode(rewardTimes));
        //emit RewardAdded
    }

    function setToken(IERC721 token_) external {
        token = token_;
        emit SetToken(address(token_));
    }

    function borrow(uint256 tokenId, uint256 loanAmount) external {
        require(token.ownerOf(tokenId) == msg.sender, "Not owned");
        require(
            token.isApprovedForAll(msg.sender, address(this)),
            "Not approved"
        );

        loaned[tokenId] = LoanData(msg.sender, block.timestamp, loanAmount);

        token.safeTransferFrom(msg.sender, address(this), tokenId);

        // TODO: Apply interest up front
        (bool success, ) = msg.sender.call{value: loanAmount}("");
        require(success, "Failed transfer");

        emit Loaned(tokenId, msg.sender, loanAmount);
    }

    function _release(uint256 tokenId) internal {
        loaned[tokenId] = LoanData(address(0), 0, 0);
        token.approve(msg.sender, tokenId);
        token.safeTransferFrom(address(this), msg.sender, tokenId);
        // emit event collateralreleased
    }

    function liquidate(uint256 tokenId) external {
        // TODO: Needs access control
        // TODO: some check about loan safety
        loaned[tokenId] = LoanData(address(0), 0, 0);
        // emit event liquidated
    }

    function repay(uint256 tokenId) external payable {
        LoanData memory loanData = loaned[tokenId];
        require(loanData.user == msg.sender, "Unauthorized");
        require(msg.value <= loanData.owed, "overpayment");

        if (msg.value == loanData.owed) {
            _release(tokenId);
        } else {
            loaned[tokenId].owed = loanData.owed - msg.value;
        }
        // emit Repaid(tokenId, amount);
    }
}
