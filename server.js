const express = require('express');
const { Alchemy, Network } = require("alchemy-sdk");

const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

const config = {
  apiKey: "qYe311uJNVM9iiEwzK0D9JsvUN_mgb92",
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

app.post('/nfts', async (req, res) => {
  try {
    const { walletAddress, collectionAddress } = req.body;

    if (!walletAddress || !collectionAddress) {
      return res.status(400).json({ error: 'Both wallet address and collection address are required' });
    }

    // Get all NFTs for the collection
    let collection_nft_ids = [];
    const response = await alchemy.nft.getNftsForContract(collectionAddress);
    for (let nft of response.nfts) {
      collection_nft_ids.push(nft.tokenId);
    }

    // Get all NFTs for the wallet
    const wallet_nfts = await alchemy.nft.getNftsForOwner(walletAddress);

    let wallet_has_collection = false;
    for (let nft of wallet_nfts.ownedNfts) {
      if (nft.contract.address.toLowerCase() === collectionAddress.toLowerCase() && 
          collection_nft_ids.includes(nft.tokenId)) {
        wallet_has_collection = true;
        break;
      }
    }

    res.json({ "result": wallet_has_collection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the NFTs' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});