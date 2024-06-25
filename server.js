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
    const collectionResponse = await alchemy.nft.getNftsForContract(collectionAddress);
    for (let nft of collectionResponse.nfts) {
      collection_nft_ids.push(nft.contract.address);
    }

    // TODO: ALSO CHECK FOR TOKEN_ID

    // Get all NFTs for the wallet
    let wallet_nfts = [];
    const walletResponse = await alchemy.nft.getNftsForOwner(walletAddress);
    for (let nft of walletResponse.ownedNfts) {
      wallet_nfts.push(nft.contract.address);
    }

    let wallet_has_collection = false;
    for (let nft of wallet_nfts) {
      if (collection_nft_ids.includes(nft)) {
        wallet_has_collection = true;
        break;
      }
    }

    res.json({ wallet_has_collection });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the NFTs' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});