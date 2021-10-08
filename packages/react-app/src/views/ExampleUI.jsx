import { SyncOutlined } from "@ant-design/icons";
import { utils, ethers } from "ethers";
import { Button, Card, DatePicker, Divider, Input, List, Progress, Slider, Spin, Switch } from "antd";
import React, { useState } from "react";
import { Address, Balance } from "../components";

const me = "0xE7aa7AF667016837733F3CA3809bdE04697730eF".toLowerCase();
const nftAddy = "0x3d87D8fbB1E537Aa50B0876ca13AD6D464678117".toLowerCase();
const convertBig = x => ethers.utils.hexlify(ethers.BigNumber.from(x.toString()));

export default function ExampleUI({ sdk, readContracts, writeContracts }) {
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
    console.log("hi");
    const nfts = {};
    setLoading(true);
    const res = await sdk.apis.nftItem.getNftItemsByCollection({ collection: nftAddy });
    console.log("res***********************************************************", res);
    for (const item of res.items) {
      console.log("item", item);
      const itemMeta = await sdk.apis.nftItem.getNftItemMetaById({ itemId: item.id });
      console.log("meta", itemMeta);
      console.log("item.tokenId", item.tokenId);
      console.log("nfts before", nfts);
      if (!nfts[item.tokenId]) {
        nfts[item.tokenId] = {
          ...item,
          ...itemMeta,
        };
      }
      console.log("nfts after", nfts);
      setNftsPre(nfts);
      processNfts(nfts);
    }
  }

  async function processNfts(nfts) {
    console.log("POROCESSSING NFTSS!!");
    const items = {};
    for (const [key, value] of Object.entries(nfts)) {
      console.log("key", key);
      const item = { ...nfts[key] };
      console.log("item", item);
      const owners = item.owners;
      console.log("owners", owners);
      console.log("address", me);
      console.log(owners.includes(me));
      if (owners.includes(me)) {
        console.log("OWNEEEEEEEEEEEEEEEEEEEEEEEEEEDDDD!!!!!!!!!", item.tokenId);
        item.status = "owned";
        items[item.tokenId] = item;
      } else if (owners.includes(protoAddy)) {
        console.log("itemid", item.tokenId);
        console.log("big", convertBig(item.tokenId));
        const staked = await readContracts.WenPassiveIncomeProtocol.staked(convertBig(item.tokenId));
        console.log("me", me);
        console.log("staked", item, staked[0].toLowerCase());
        if (staked[0].toLowerCase() == me) {
          item.status = "staked";
          items[item.tokenId] = item;
        }
        const loaned = await readContracts.WenPassiveIncomeProtocol.loaned(convertBig(item.tokenId));
        console.log("loaned", item, loaned[0].toLowerCase());
        if (loaned[0].toLowerCase() == me) {
          item.status = "staked";
          items[item.tokenId] = item;
        }
      }
    }
    console.log("done yo!!!!!!!!!!!!!!!!!!!!!!");
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

  // console.log(nfts);
  // sdk.apis.nftItem.getNftItemsByOwner({ owner: address }).then(items => {
  //   console.log("hiiiiiiiiiiiiiii");
  //   console.log(items);
  //   console.log("id", items.items[0].id);
  //   console.log("lkdaafldlkakljdkljdkljdlkjdgkljlkjdglkjlkjdglkjdkj");
  //   const itemId = items.items[0].id;
  //   sdk.apis.nftItem.getNftItemMetaById({ itemId }).then(x => console.log(x));
  // });
  console.log("allItems", allItems);
  return (
    <div style={{ display: "flex" }}>
      {setLoaded && Object.keys(allItems).map(key => <Tile item={allItems[key]} />)}
    </div>
  );
}
