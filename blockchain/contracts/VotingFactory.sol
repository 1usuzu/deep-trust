// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./Voting.sol";

contract VotingFactory {
    address[] public allVotings;
    mapping(address => address[]) public adminVotings;

    event VotingCreated(address votingAddress, address admin, string title);

    function createVoting(string memory _title, string memory _description) external returns (address) {
        Voting newVoting = new Voting(msg.sender, _title, _description);
        allVotings.push(address(newVoting));
        adminVotings[msg.sender].push(address(newVoting));
        emit VotingCreated(address(newVoting), msg.sender, _title);
        return address(newVoting);
    }

    function getAllVotings() external view returns (address[] memory) {
        return allVotings;
    }

    function getVotingsCount() external view returns (uint256) {
        return allVotings.length;
    }

    function getMyVotings() external view returns (address[] memory) {
        return adminVotings[msg.sender];
    }
}
