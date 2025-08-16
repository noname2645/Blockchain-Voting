// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Voting {
    event VotedEvent(uint256 indexed candidateId);

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public voters;
    uint256 public candidatesCount;

    constructor() {
        addCandidate("PARTY A");
        addCandidate("PARTY B");
        addCandidate("PARTY C");
        addCandidate("PARTY D");
    }

    function addCandidate(string memory _name) public {
        candidatesCount++;
        candidates[candidatesCount] = Candidate(candidatesCount, _name, 0);
    }

    function vote(uint256 _candidateId) public {

        voters[msg.sender] = true;
        candidates[_candidateId].voteCount++;
        emit VotedEvent(_candidateId);
    }

    function getCandidate(uint256 _candidateId) public view returns (uint256 id, string memory name, uint256 voteCount) {
        Candidate memory candidate = candidates[_candidateId];
        return (candidate.id, candidate.name, candidate.voteCount);
    }

    function getCandidatesCount() public view returns (uint256) {
        return candidatesCount;
    }

    function getTotalVotes() public view returns (uint256 totalVotes) {
        for (uint256 i = 1; i <= candidatesCount; i++) {
            totalVotes += candidates[i].voteCount;
        }
    }
}
