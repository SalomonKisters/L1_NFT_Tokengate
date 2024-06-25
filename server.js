const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Alchemy, Network } = require("alchemy-sdk");

const app = express();
const port = 3000;

app.use(express.json());

const config = {
  apiKey: "qYe311uJNVM9iiEwzK0D9JsvUN_mgb92",
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);
const cache = {}

// API key for verification (in a real-world scenario, store this securely)
const API_KEY = 'fibmprmjbkguugwflhqxtluenxqxrwtl';

// Middleware for API key verification
const verifyApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

app.post('/nfts', verifyApiKey, async (req, res) => {
  try {
    const { walletAddress, collectionAddress } = req.body;

    if (!walletAddress || !collectionAddress) {
      return res.status(400).json({ error: 'Both wallet address and collection address are required' });
    }

    const walletOpts = {
      omitMetadata: true,
      pageSize: 100,
      tokenUriTimeoutInMs: 0,
    };

    let matchingTokenIds = [];
    for await (const nft of alchemy.nft.getNftsForOwnerIterator(walletAddress, walletOpts)) {
      if (nft.contractAddress.toLowerCase() === collectionAddress.toLowerCase()) {
        matchingTokenIds.push(nft.tokenId);
      }
    }

    if (matchingTokenIds.length == 0) {
      return res.json(false);
    }

    for (let tokenId of matchingTokenIds) {
      if (cache[collectionAddress] && cache[collectionAddress][tokenId] === true) {
        return res.json(true);
      }

      const collectionOpts = {
        omitMetadata: true,
        pageSize: 1,
        pageKey: tokenId
      };

      const collectionResponse = await alchemy.nft.getNftsForContract(collectionAddress, collectionOpts);
      let isInCollection = collectionResponse.nfts[0].tokenId.toLowerCase() === tokenId.toLowerCase();

      cacheTokenId(collectionAddress, tokenId, isInCollection);

      if (isInCollection) {
        return res.json(true);
      }
    }

    return res.json(false);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the NFTs' });
  }
});

function cacheTokenId(collectionAddress, tokenId, result) {
  if (!cache[collectionAddress]) {
    cache[collectionAddress] = {};
  }
  cache[collectionAddress][tokenId] = result;
}

// HTTPS server configuration
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// Create HTTPS server
https.createServer(httpsOptions, app).listen(port, '0.0.0.0', () => {
  console.log(`HTTPS Server running at https://0.0.0.0:${port}`);
});