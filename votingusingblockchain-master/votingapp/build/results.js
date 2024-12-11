const provider = new ethers.providers.JsonRpcProvider('http://localhost:7545'); // Replace with your provider URL
const contractAddress = '0x890DeeD05d174b070Da656364B0EEC8e3dfEf02b'; // Replace with your contract address
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
                "name": "",
                "type": "uint256"
            }
        ],
        "name": "candidates",
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
        "type": "function",
        "constant": true
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
    const resultsBody = document.getElementById('resultsBody'); // Corrected ID
    const totalVotesElement = document.getElementById('totalVotes');

    try {
        const totalCandidates = await contract.getCandidatesCount();

        for (let i = 1; i <= totalCandidates; i++) {
            try {
                const [candidateId, candidateName, voteCount] = await contract.getCandidate(i);

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
        totalVotesElement.textContent = totalVotes.toString();
    } catch (error) {
        console.error("Error fetching candidates count:", error);
    }
}

// Fetch votes when the page loads
document.addEventListener('DOMContentLoaded', () => {
    fetchVotes();
});
