import { SyncOutlined } from "@ant-design/icons";
import { utils, ethers } from "ethers";
import { Button, Card, DatePicker, Divider, Input, List, Progress, Slider, Spin, Switch } from "antd";
import React, { useState } from "react";
import { Address, Balance } from "../components";

const me = "0xE7aa7AF667016837733F3CA3809bdE04697730eF".toLowerCase();
const convertBig = x => ethers.utils.hexlify(ethers.BigNumber.from(x.toString()));

export default function ExampleUI({ sdk, readContracts, writeContracts }) {
  // const [newPurpose, setNewPurpose] = useState("loading...");
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  var [nftsPre, setNftsPre] = useState({});
  const [allItems, setAllItems] = useState([]);
  console.log(readContracts);
  const nftAddy = (readContracts?.WenPassiveIncomeNFT?.address || "").toLowerCase();
  const protoAddy = (readContracts?.WenPassiveIncomeProtocol?.address || "").toLowerCase();
  let promises = [];
  if (nftAddy && !loaded & !loading) getNfts();
  async function getNfts() {
    const nfts = {};
    setLoading(true);
    const res = await sdk.apis.nftItem.getNftItemsByCollection({ collection: nftAddy });
    console.log("res", res);
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
    const items = [];
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
      } else if (owners.includes(protoAddy)) {
        console.log("itemid", item.tokenId);
        console.log("big", convertBig(item.tokenId));
        const staked = await readContracts.WenPassiveIncomeProtocol.staked(convertBig(item.tokenId));
        console.log("me", me);
        console.log("staked", item, staked[0].toLowerCase());
        if (staked[0].toLowerCase() == me) {
          item.status = "staked";
        }
        const loaned = await readContracts.WenPassiveIncomeProtocol.loaned(convertBig(item.tokenId));
        console.log("loaned", item, loaned[0].toLowerCase());
        if (loaned[0].toLowerCase() == me) {
          item.status = "staked";
        }
      }
      items.push(item);
    }
    console.log("done yo!");
    setLoaded(true);
    setLoading(false);
    console.log("allitems", items);
    setAllItems(items);
  }

  const [a, setA] = useState(false);
  async function doSomething() {
    await writeContracts.WenPassiveIncomeProtocol.stake(convertBig(1));
    setA(true);
  }

  // console.log(nfts);
  // sdk.apis.nftItem.getNftItemsByOwner({ owner: address }).then(items => {
  //   console.log("hiiiiiiiiiiiiiii");
  //   console.log(items);
  //   console.log("id", items.items[0].id);
  //   console.log("lkdaafldlkakljdkljdkljdlkjdgkljlkjdglkjlkjdglkjdkj");
  //   const itemId = items.items[0].id;
  //   sdk.apis.nftItem.getNftItemMetaById({ itemId }).then(x => console.log(x));
  // });
  return (
    <div>
      <button onClick={doSomething}>PUSH ME</button>
      {a ? "true" : "false"}
    </div>
  );
}
