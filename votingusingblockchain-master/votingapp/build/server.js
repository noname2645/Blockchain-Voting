import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { privateKey, contractAddress, emailConfig } from './config.js';

// Load service account JSON
const serviceAccount = JSON.parse(fs.readFileSync('./votinginblockchain.json', 'utf8'));

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.DATA_URL
});

const db = admin.firestore(); // Use Firestore database

// FIXED: Provider initialization with proper error handling
let provider;
try {
  // Use HTTP protocol (not WS) and specify the full URL with port
  provider = new ethers.providers.JsonRpcProvider({
    url: 'http://127.0.0.1:7545',
    name: 'ganache',
    chainId: 1337
  });
  
  console.log('Provider initialized');
} catch (error) {
  console.error('Failed to initialize provider:', error);
  process.exit(1); // Exit if we can't connect to blockchain
}

// FIXED: Initialize wallet with better error handling
let wallet;
try {
  wallet = new ethers.Wallet(privateKey, provider);
  console.log('Wallet initialized with address:', wallet.address);
} catch (error) {
  console.error('Failed to initialize wallet:', error);
  process.exit(1);
}

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
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

// FIXED: Contract initialization with error handling
let contract;
try {
  contract = new ethers.Contract(contractAddress, contractABI, wallet);
  console.log('Contract initialized at address:', contractAddress);
} catch (error) {
  console.error('Failed to initialize contract:', error);
  process.exit(1);
}

// Nodemailer Transporter Configuration
const transporter = nodemailer.createTransport({
  host: '127.0.0.1',
  port: '465',
  service: 'gmail',
  secure: true,
  auth: {
    user: emailConfig.user,
    pass: emailConfig.pass  
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
});

// Function to send email
function sendVoteConfirmationEmail(toEmail) {
  const mailOptions = {
    from: emailConfig.user, // Sender address
    to: toEmail, // Recipient's email address
    subject: 'THANKYOU FOR YOUR VOTE',
    text: `This email is a confirmation email regarding your vote.
           If you have received this email that means your vote has been successfully recorded on our system.
      
           Best regards,
           Team ECI`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email: ', error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

// NEW: Add health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Test blockchain connection
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    
    return res.status(200).json({
      status: 'ok',
      blockchain: {
        networkId: network.chainId,
        name: network.name,
        blockNumber: blockNumber,
        walletAddress: wallet.address
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// FIXED: Vote endpoint with better error handling
app.post('/vote', async (req, res) => {
  const { candidateId, userEmail } = req.body;
  console.log(`Received vote request for candidateId: ${candidateId}, userEmail: ${userEmail}`);

  try {
    // First check if we're connected to the network
    try {
      const network = await provider.getNetwork();
      console.log(`Connected to network: ${network.name} (${network.chainId})`);
    } catch (networkError) {
      console.error('Network connection error:', networkError);
      return res.status(500).send('Error: could not detect network. Please ensure Ganache is running.');
    }
    
    // Check contract connection
    try {
      const gasEstimate = await contract.estimateGas.vote(candidateId);
      console.log(`Gas estimate for voting: ${gasEstimate.toString()}`);
    } catch (contractError) {
      console.error('Contract interaction error:', contractError);
      return res.status(500).send(`Contract error: ${contractError.message}`);
    }
    
    console.log(`Submitting vote transaction for candidateId: ${candidateId}`);
    const tx = await contract.vote(candidateId);
    console.log(`Transaction submitted: ${tx.hash}`);
    
    const receipt = await tx.wait(); // Wait for the transaction to be mined
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);

    // Get the UTC timestamp
    const utcTimestamp = admin.firestore.Timestamp.now();

    // Convert the UTC timestamp to IST
    const istTimestamp = new Date(utcTimestamp.toDate().getTime() + (5.5 * 60 * 60 * 1000));

    // Update Firebase with the new vote and IST timestamp
    const candidateRef = db.collection('votes').doc(candidateId.toString());
    await candidateRef.set({
      timestamp: istTimestamp
    });
    console.log(`Vote recorded in Firestore for candidateId: ${candidateId}`);

    // Send confirmation email
    sendVoteConfirmationEmail(userEmail);
    console.log(`Confirmation email sent to: ${userEmail}`);

    res.send('Vote cast successfully, email sent.');
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).send(error.toString());
  }
});

app.setMaxListeners(20);

// Test blockchain connection on startup
(async () => {
  try {
    const network = await provider.getNetwork();
    console.log(`✅ Connected to blockchain network: ${network.name} (chainId: ${network.chainId})`);
    
    const blockNumber = await provider.getBlockNumber();
    console.log(`✅ Current block number: ${blockNumber}`);
    
    console.log(`✅ Wallet address: ${wallet.address}`);
    
    // Try to interact with the contract
    try {
      const gasEstimate = await contract.estimateGas.vote(1);
      console.log(`✅ Contract connection successful (gas estimate: ${gasEstimate.toString()})`);
    } catch (contractError) {
      console.error('❌ Contract interaction failed:', contractError.message);
      console.log('Check if the contract address is correct and the contract is deployed');
    }
  } catch (error) {
    console.error('❌ Failed to connect to blockchain:', error.message);
    console.error('Make sure Ganache is running at http://127.0.0.1:7545');
  }
})();

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});