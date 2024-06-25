const express = require('express');
const { Alchemy, Network } = require("alchemy-sdk");

const app = express();
const port = 3000;

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

    const walletOpts = {
      omitMetadata: true,
      pageSize: 100,
      tokenUriTimeoutInMs: 0,
    };

    let matchingTokenIds = [];
    for await (const nft of alchemy.nft.getNftsForOwnerIterator(walletAddress, walletOpts)) {
      if (nft.contractAddress == collectionAddress) {
        matchingTokenIds.push(nft.tokenId);
      }
    }

    if (matchingTokenIds.length == 0){ 
      res.json( false )
    };
    

    for (let tokenId of matchingTokenIds) {
      const collectionOpts = {
        omitMetadata: true,
        pageSize: 1,
        pageKey: tokenId
      };

      const collectionResponse = await alchemy.nft.getNftsForContract(collectionAddress, collectionOpts);

      if (collectionResponse.nfts[0].tokenId == tokenId){ 
        res.json( true )
      };
    }

    res.json( false );

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the NFTs' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});