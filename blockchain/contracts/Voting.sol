// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        address candidateAddress;
        uint256 voteCount;
    }

    address public admin;
    string public title;
    string public description;
    bool public votingOpen;
    uint256 public createdAt;
    
    Candidate[] private candidatesList;
    mapping(address => bool) public voters;

    event CandidateAdded(uint256 id, string name);
    event Voted(address voter, uint256 candidateId);
    event VotingClosed();
    event VotingOpened();

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    constructor(address _admin, string memory _title, string memory _description) {
        admin = _admin;
        title = _title;
        description = _description;
        votingOpen = true;
        createdAt = block.timestamp;
    }

    function addCandidate(string memory _name, address _candidateAddress) external onlyAdmin {
        uint256 newId = candidatesList.length;
        candidatesList.push(Candidate({
            id: newId,
            name: _name,
            candidateAddress: _candidateAddress,
            voteCount: 0
        }));
        emit CandidateAdded(newId, _name);
    }

    function vote(uint256 _candidateId) external {
        require(votingOpen, "Voting is closed");
        require(!voters[msg.sender], "Already voted");
        require(_candidateId < candidatesList.length, "Invalid candidate");

        voters[msg.sender] = true;
        candidatesList[_candidateId].voteCount += 1;
        emit Voted(msg.sender, _candidateId);
    }

    function getAllCandidates() external view returns (Candidate[] memory) {
        return candidatesList;
    }

    function closeVoting() external onlyAdmin {
        votingOpen = false;
        emit VotingClosed();
    }

    function openVoting() external onlyAdmin {
        votingOpen = true;
        emit VotingOpened();
    }

    function hasVoted(address _voterAddress) external view returns (bool) {
        return voters[_voterAddress];
    }

    function getVotingInfo() external view returns (
        string memory, 
        string memory, 
        address, 
        uint256, 
        bool, 
        uint256
    ) {
        return (title, description, admin, candidatesList.length, votingOpen, createdAt);
    }
}
