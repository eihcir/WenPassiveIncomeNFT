pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT

interface IWenPassiveIncomeProtocol {
    struct StakedData {
        address user;
        uint256 timestamp;
    }

    struct LoanData {
        address user;
        uint256 timestamp;
        uint256 owed;
    }

    event CollateralReleased(address indexed guy, uint256 indexed tokenId);
    event Deposited(uint256 amount);
    event EthReceived(address indexed guy, uint256 amount);
    event Liquidated(address indexed guy, uint256 indexed tokenId);
    event Loaned(
        address indexed guy,
        uint256 indexed tokenId,
        uint256 loanAmount
    );
    event LoanDurationSet(uint256 amount);
    event LoanInterestRateSet(uint256 amount);
    event MaximumLoanSet(uint256 amount);
    event MaximumReservesSet(uint256 amount);
    event MinimumReservesSet(uint256 amount);
    event Repaid(address indexed guy, uint256 tokenId, uint256 amount);
    event RewardAdded(uint256 wad, uint256 timestamp);
    event RewardsClaimed(
        address indexed guy,
        uint256 indexed tokenId,
        uint256 amount
    );
    event Staked(address indexed guy, uint256 indexed tokenId);
    event Unstaked(address indexed guy, uint256 indexed tokenId);
    event VaultTokenSet(address indexed token);
    event Withdrawn(uint256 amount);
}
