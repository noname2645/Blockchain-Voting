import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import admin from 'firebase-admin';
import fs from 'fs';
import nodemailer from 'nodemailer';

// Load service account JSON
const serviceAccount = JSON.parse(fs.readFileSync('./votinginblockchain.json', 'utf8'));

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors());

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://votinginblockchain.firebaseio.com'
});

const db = admin.firestore(); // Use Firestore database

const provider = new ethers.providers.JsonRpcProvider('http://localhost:7545'); // Change this to your Ganache URL if different

const privateKey = '0x73159a8d0d5686bfa4a4927a43649e124c954c75f5eaa2ab993388049a4a9baa'; // Replace with your private key from Ganache
const wallet = new ethers.Wallet(privateKey, provider);

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

const contractAddress = '0x890DeeD05d174b070Da656364B0EEC8e3dfEf02b'; // Replace with your contract address
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// Nodemailer Transporter Configuration
const transporter = nodemailer.createTransport({
  host: '127.0.0.1',
  port:'465',
  service: 'gmail',
  secure:'true',
  auth: {
    user: 'weeb7286@gmail.com', // Replace with your Gmail email
    pass: 'jvbl ytof wtse psqm'   // Replace with your Gmail app password
  },
  tls: {
    rejectUnauthorized: false, // Allow self-signed certificates
  },
});

// Function to send email
function sendVoteConfirmationEmail(toEmail, candidateId) {
  const mailOptions = {
    from: 'weeb7286@gmail.com', // Sender address
    to: toEmail, // Recipient's email address
    subject: 'THANKYOU FOR YOUR VOTE',
    text:     `This email is a confirmation email regarding your vote.
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

app.post('/vote', async (req, res) => {
  const { candidateId, userEmail } = req.body;

  try {
    const tx = await contract.vote(candidateId);
    await tx.wait(); // Wait for the transaction to be mined

    // Get the UTC timestamp
    const utcTimestamp = admin.firestore.Timestamp.now();

    // Convert the UTC timestamp to IST
    const istTimestamp = new Date(utcTimestamp.toDate().getTime() + (5.5 * 60 * 60 * 1000));

    // Update Firebase with the new vote and IST timestamp
    const candidateRef = db.collection('votes').doc(candidateId.toString());
    await candidateRef.set({
      timestamp: istTimestamp
    });

    // Send confirmation email
    sendVoteConfirmationEmail(userEmail, candidateId);

    res.send('Vote cast successfully, email sent.');
  } catch (error) {
    res.status(500).send(error.toString());
  }
});

app.setMaxListeners(20);

app.listen(port, () => {
  console.log(`Backend server is running on http://localhost:${port}`);
});
