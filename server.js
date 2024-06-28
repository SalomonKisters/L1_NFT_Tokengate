const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Alchemy, Network } = require("alchemy-sdk");
const cors = require('cors'); 

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Middleware to log incoming requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(req.body);
  next();
});

const config = {
  apiKey: "qYe311uJNVM9iiEwzK0D9JsvUN_mgb92",
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);
const cacheFilePath = path.join(__dirname, 'cache.json');

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

// Load cache from file
function loadCache() {
  try {
    const data = fs.readFileSync(cacheFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading cache:', error);
    return { collections: {}, excluded: {} };
  }
}

// Save cache to file
function saveCache(cache) {
  try {
    fs.writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.error('Error saving cache:', error);
  }
}


function cacheTokenId(cache, collectionAddress, tokenId, result) {
  if (!cache.collections[collectionAddress]) {
    cache.collections[collectionAddress] = {};
  }
  cache.collections[collectionAddress][tokenId] = result;
}


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
      return res.json({
        "success": false,
        "message": "You do not own an NFT from the collection."
      });
    }

    const cache = loadCache();

    let validNftTokens = [];
    let failMessage = "";
    
    for (let tokenId of matchingTokenIds) {
      if (cache.excluded[collectionAddress] && cache.excluded[collectionAddress].includes(tokenId)) {
        failMessage = "All of your NFTs were already used to claim the product.";
        continue;
      }

      if (cache.collections[collectionAddress] && cache.collections[collectionAddress][tokenId] === true) {
        validNftTokens.push(tokenId);
        continue;
      }

      const collectionOpts = {
        omitMetadata: true,
        pageSize: 1,
        pageKey: tokenId
      };

      const collectionResponse = await alchemy.nft.getNftsForContract(collectionAddress, collectionOpts);
      let isInCollection = collectionResponse.nfts[0].tokenId.toLowerCase() === tokenId.toLowerCase();

      cacheTokenId(cache, collectionAddress, tokenId, isInCollection);

      if (isInCollection) {
        validNftTokens.push(tokenId);
      }
    }

    saveCache(cache);

    if (validNftTokens.length > 0) {
      return res.json({
        "success": true,
        "message": "Authentication Successful.",
        "selection": validNftTokens
      });
    } else {
      return res.json({
        "success": false,
        "message": failMessage || "No valid NFTs found in the collection.",
        "selection": []
      });
    }

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the NFTs' });
  }
});


// New endpoint to add excluded NFTs
app.post('/exclude', verifyApiKey, (req, res) => {
  const { collectionAddress, tokenIds } = req.body;

  if (!collectionAddress || !Array.isArray(tokenIds)) {
    return res.status(400).json({ error: 'Collection address and an array of token IDs are required' });
  }

  const cache = loadCache();

  if (!cache.excluded[collectionAddress]) {
    cache.excluded[collectionAddress] = [];
  }

  const stringTokenIds = tokenIds.map(id => id.toString());

  cache.excluded[collectionAddress] = [...new Set([...cache.excluded[collectionAddress], ...stringTokenIds])];

  saveCache(cache);

  res.json({ message: 'Exclusion list updated successfully.' });
});



// HTTPS server configuration
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem'))
};

// Create HTTPS server
https.createServer(httpsOptions, app).listen(port, '0.0.0.0', () => {
  console.log(`HTTPS Server running at https://0.0.0.0:${port}`);
});