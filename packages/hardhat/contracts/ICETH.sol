pragma solidity >=0.8.0 <0.9.0;
//SPDX-License-Identifier: MIT


interface ICETH {
    function mint() external payable;

    function redeem(uint256 redeemTokens) external returns (uint256);

    function exchangeRateStored() external view returns (uint256);

    function balanceOf(address owner) external view returns (uint256);
}

