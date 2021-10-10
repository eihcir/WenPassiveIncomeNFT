import { SyncOutlined } from "@ant-design/icons";
import { utils, ethers } from "ethers";
import { Button, Card, DatePicker, Divider, Input, List, Progress, Slider, Spin, Switch } from "antd";
import React, { useState } from "react";
import { Address, Balance } from "../components";

import axios from "axios";
const me = "0xE7aa7AF667016837733F3CA3809bdE04697730eF".toLowerCase();
const nftAddy = "0xd845533626e52ccc6282160c19861581b14aa233".toLowerCase();
const convertBig = x => ethers.utils.hexlify(ethers.BigNumber.from(x.toString()));

const data = {
  type: "RARIBLE_V2",
  maker: me,
  make: {
    assetType: {
      assetClass: "ERC721",
      contract: nftAddy,
      tokenId: 6,
    },
    value: "1",
  },
  take: {
    assetType: {
      assetClass: "ETH",
    },
    value: "1000000000000000000",
  },
  data: {
    dataType: "RARIBLE_V2_DATA_V1",
    payouts: [],
    originFees: [],
  },
  salt: 1234,
};

axios.post("https://api-staging.rarible.com/protocol/v0.1/ethereum/order/encoder/order", data).then(res => {
  console.log("reeeeeeeeeeeeeeeeeeees", res);
});
export default function AdminDash({ sdk, readContracts, writeContracts, localProvider, price }) {
  // const [newPurpose, setNewPurpose] = useState("loading...");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  var [nftsPre, setNftsPre] = useState({});
  const [allItems, setAllItems] = useState(false);
  console.log(readContracts);
  // const nftAddy = (readContracts?.WenPassiveIncomeNFT?.address || "").toLowerCase();
  const protoAddy = (readContracts?.WenPassiveIncomeProtocol?.address || "").toLowerCase();
  let promises = [];
  if (nftAddy && !loaded & !loading) getNfts();
  async function getNfts() {
    const nfts = {};
    setLoading(true);
    const res = await sdk.apis.nftItem.getNftItemsByCollection({ collection: nftAddy });
    for (const item of res.items) {
      const itemMeta = await sdk.apis.nftItem.getNftItemMetaById({ itemId: item.id });
      if (!nfts[item.tokenId]) {
        nfts[item.tokenId] = {
          ...item,
          ...itemMeta,
        };
      }
      setNftsPre(nfts);
      processNfts(nfts);
    }
  }

  async function processNfts(nfts) {
    const items = {};
    for (const [key, value] of Object.entries(nfts)) {
      const item = { ...nfts[key] };
      const owners = item.owners;
      if (owners.includes(me)) {
        item.status = "owned";
        items[item.tokenId] = item;
      } else if (owners.includes(protoAddy)) {
        const staked = await readContracts.WenPassiveIncomeProtocol.staked(convertBig(item.tokenId));
        if (staked[0].toLowerCase() == me) {
          item.status = "staked";
          items[item.tokenId] = item;
        }
        const loaned = await readContracts.WenPassiveIncomeProtocol.loaned(convertBig(item.tokenId));
        if (loaned[0].toLowerCase() == me) {
          item.status = "loaned";
          items[item.tokenId] = item;
        }
      }
    }
    setLoaded(true);
    setLoading(false);
    console.log("allitems", items);
    setAllItems(items);
  }

  async function stake(tokenId) {
    await writeContracts.WenPassiveIncomeProtocol.stake(convertBig(tokenId), {
      gasLimit: 20000000,
    });
    setAllItems({
      ...allItems,
      [tokenId]: {
        ...allItems[tokenId],
        status: "staked",
      },
    });
  }
  async function claimRewardsAndUnstake(tokenId) {
    await writeContracts.WenPassiveIncomeProtocol.claimRewards(convertBig(tokenId), true, {
      gasLimit: 20000000,
    });
    setAllItems({
      ...allItems,
      [tokenId]: {
        ...allItems[tokenId],
        status: "owned",
      },
    });
  }
  async function claimRewards(tokenId) {
    await writeContracts.WenPassiveIncomeProtocol.claimRewards(convertBig(tokenId), false, {
      gasLimit: 20000000,
    });
    setAllItems({
      ...allItems,
      [tokenId]: {
        ...allItems[tokenId],
        status: "owned",
      },
    });
  }

  async function borrow(tokenId) {
    await writeContracts.WenPassiveIncomeProtocol.borrow(convertBig(tokenId), ethers.utils.parseEther("0.1"), {
      gasLimit: 20000000,
    });
    setAllItems({
      ...allItems,
      [tokenId]: {
        ...allItems[tokenId],
        status: "loaned",
      },
    });
  }

  async function repay(tokenId) {
    await writeContracts.WenPassiveIncomeProtocol.repay(convertBig(tokenId), {
      gasLimit: 20000000,
      value: ethers.utils.parseEther("0.1"),
    });
    setAllItems({
      ...allItems,
      [tokenId]: {
        ...allItems[tokenId],
        status: "owned",
      },
    });
  }

  /**
   * Create sell order from minted nft
   */
  const createSellOrder = async tokenId => {
    const request = {
      makeAssetType: {
        assetClass: "ERC721",
        contract: nftAddy,
        tokenId: convertBig(tokenId),
      },
      amount: 1,
      maker: me,
      originFees: [],
      payouts: [],
      price: ethers.utils.parseEther("0.1"),
      takeAssetType: { assetClass: "ETH" },
    };
    console.log(request);
    // Create an order
    const resultOrder = await sdk.order.sell(request);
    // const resultOrder = await sdk.order.sell(request).then(a => a.build().runAll());
    console.log(resultOrder);
  };

  const NFTDisplay = ({ item }) => (
    <div style={{}}>
      <img src={item.image.url.PREVIEW} />
      <h1>
        {item.name} {item.tokenId}
      </h1>
    </div>
  );

  const Buttons = ({ item }) => {
    const buttons = [];
    switch (item.status) {
      case "staked":
        buttons.push(<button onClick={() => claimRewardsAndUnstake(item.tokenId)}>CLAIM REWARDS AND UNSTAKE</button>);
        buttons.push(<button onClick={() => claimRewards(item.tokenId)}>CLAIM REWARDS</button>);
        break;

      case "owned":
        buttons.push(<button onClick={() => stake(item.tokenId)}>STAKE</button>);
        buttons.push(<button onClick={() => borrow(item.tokenId)}>BORROW</button>);
        buttons.push(<button onClick={() => createSellOrder(item.tokenId)}>SELL</button>);
        break;

      case "loaned":
        buttons.push(<button onClick={() => repay(item.tokenId)}>REPAY LOAN</button>);
        break;

      default:
        break;
    }
    return buttons;
  };

  const Tile = ({ item }) => {
    return (
      <div
        key={item.tokenId}
        style={{
          padding: "2rem",
          margin: "2rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <NFTDisplay item={item} />
        <Buttons item={item} />
      </div>
    );
  };

  console.log("allItems", allItems);
  return (
    <div>
      eth reserves in contract: <Balance address={protoAddy} provider={localProvider} price={price} />
      minimum reserves: 10.0 interest rate loan duration loan count total amount owed staked count total holders
    </div>
  );
}
