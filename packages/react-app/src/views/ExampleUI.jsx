import { SyncOutlined } from "@ant-design/icons";
import { utils, ethers } from "ethers";
import { Button, Card, DatePicker, Divider, Input, List, Progress, Slider, Spin, Switch } from "antd";
import React, { useState } from "react";
import { Address, Balance } from "../components";

const me = "0xE7aa7AF667016837733F3CA3809bdE04697730eF".toLowerCase();
const nftAddy = "0xd845533626e52ccc6282160c19861581b14aa233".toLowerCase();
const convertBig = x => ethers.utils.hexlify(ethers.BigNumber.from(x.toString()));

export default function ExampleUI({ sdk, sdk2, readContracts, writeContracts }) {
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

  async function borrow(tokenId, value) {
    console.log(tokenId, value);
    await writeContracts.WenPassiveIncomeProtocol.borrow(convertBig(tokenId), ethers.utils.parseEther(value), {
      gasLimit: 2000000,
    });
    setAllItems({
      ...allItems,
      [tokenId]: {
        ...allItems[tokenId],
        status: "loaned",
      },
    });
  }

  async function repay(tokenId, value) {
    await writeContracts.WenPassiveIncomeProtocol.repay(convertBig(tokenId), {
      gasLimit: 2000000,
      value: ethers.utils.parseEther(value),
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

  const NumericInputButton = ({ action, label, tokenId }) => {
    const [value, setValue] = useState("1.0");
    const [pressed, setPressed] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const handleClick = () => setPressed(true);
    const handleChange = e => setValue(e.target.value);
    const handleKeyPress = e => {
      if (e.key === "Enter") {
        setSubmitted(true);
        action(tokenId, value);
      }
    };
    if (submitted) return <button style={{ backgroundColor: "lightgrey", color: "black" }}>Confirming...</button>;
    if (pressed)
      return (
        <button style={{ backgroundColor: "lightgrey", color: "black" }}>
          <input type="text" onChange={e => setValue(e.target.value)} value={value} onKeyPress={handleKeyPress} />
          <div>
            <div>
              {" "}
              Max <bold style={{ fontWeight: "bold" }}>1 eth</bold>
            </div>
            <div>
              {" "}
              <bold style={{ fontWeight: "bold" }}>10%</bold> interest paid up front
            </div>
            <div>
              {" "}
              Due in <bold style={{ fontWeight: "bold" }}>30</bold> days
            </div>
          </div>
        </button>
      );
    return (
      <button style={{ backgroundColor: "lightgrey", color: "black" }} onClick={handleClick}>
        {label}
      </button>
    );
  };

  const Buttons = ({ item }) => {
    const buttons = [];
    switch (item.status) {
      case "staked":
        buttons.push(
          <button
            style={{ backgroundColor: "lightgrey", color: "black" }}
            onClick={() => claimRewardsAndUnstake(item.tokenId)}
          >
            CLAIM REWARDS AND UNSTAKE
          </button>,
        );
        buttons.push(
          <button style={{ backgroundColor: "lightgrey", color: "black" }} onClick={() => claimRewards(item.tokenId)}>
            CLAIM REWARDS
          </button>,
        );
        break;

      case "owned":
        buttons.push(
          <button style={{ backgroundColor: "lightgrey", color: "black" }} onClick={() => stake(item.tokenId)}>
            STAKE
          </button>,
        );
        // buttons.push(<button style={{backgroundColor: 'lightgrey', 'color': 'white'}}onClick={() => borrow(item.tokenId)}>BORROW</button>);
        buttons.push(<NumericInputButton label="BORROW" action={borrow} tokenId={item.tokenId} />);
        break;

      case "loaned":
        buttons.push(<NumericInputButton label="REPAY LOAN" action={repay} tokenId={item.tokenId} />);
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
    <div style={{ display: "flex" }}>
      {setLoaded && Object.keys(allItems).map(key => <Tile item={allItems[key]} />)}
    </div>
  );
}
