import { contractAddress } from "./config.js"; // Ensure this is correct

const provider = new ethers.providers.JsonRpcProvider('http://localhost:7545');
const contractABI = [
    {
        "anonymous": false,
        "inputs": [
            {
                "indexed": true,
                "internalType": "uint256",
                "name": "candidateId",
                "type": "uint256"
            }
        ],
        "name": "VotedEvent",
        "type": "event"
    },
    {
        "inputs": [
            {
                "internalType": "uint256",
                "name": "_candidateId",
                "type": "uint256"
            }
        ],
        "name": "getCandidate",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "id",
                "type": "uint256"
            },
            {
                "internalType": "string",
                "name": "name",
                "type": "string"
            },
            {
                "internalType": "uint256",
                "name": "voteCount",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getCandidatesCount",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "count",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "getTotalVotes",
        "outputs": [
            {
                "internalType": "uint256",
                "name": "",
                "type": "uint256"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const contract = new ethers.Contract(contractAddress, contractABI, provider);

async function fetchVotes() {
    const resultsBody = document.getElementById('resultsBody');
    const totalVotesElement = document.getElementById('totalVotes');

    try {
        const totalCandidates = await contract.getCandidatesCount();
        console.log(`Total candidates: ${totalCandidates.toString()}`);

        if (totalCandidates.toNumber() === 0) {
            console.log("No candidates found.");
        }

        for (let i = 1; i <= totalCandidates; i++) {
            try {
                const candidate = await contract.getCandidate(i);
                console.log(`Fetched candidate ${i}:`, candidate);

                const candidateId = candidate.id;
                const candidateName = candidate.name;
                const voteCount = candidate.voteCount;
                
                const row = document.createElement('tr');
                const nameCell = document.createElement('td');
                nameCell.textContent = candidateName;

                const voteCell = document.createElement('td');
                voteCell.textContent = voteCount.toString();

                row.appendChild(nameCell);
                row.appendChild(voteCell);
                resultsBody.appendChild(row);
            } catch (error) {
                console.error(`Error fetching candidate with ID ${i}:`, error);
            }
        }

        // Fetch total votes
        const totalVotes = await contract.getTotalVotes();
        console.log(`Total votes: ${totalVotes.toString()}`);
        totalVotesElement.textContent = totalVotes.toString();

    } catch (error) {
        console.error("Error fetching candidates count:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchVotes();
});
