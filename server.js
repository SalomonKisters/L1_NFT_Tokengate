const express = require('express');
const { Alchemy, Network } = require("alchemy-sdk");

const app = express();
const port = 3000; // You can change this to any port you prefer

const config = {
  apiKey: "<-- ALCHEMY APP API KEY -->",
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(config);

app.get('/nft-owner', async (req, res) => {
  try {
    const address = "0xDd69da9a83ceDc730bc4d3C56E96D29Acc05eCDE";
    const tokenId = 4254;

    const owner = await alchemy.nft.getOwnersForNft(address, tokenId);
    res.json(owner);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while fetching the NFT owner' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});