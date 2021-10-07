import { PageHeader } from "antd";
import React from "react";

// displays a page header

export default function Header() {
  return (
    <a href="https://github.com/austintgriffith/scaffold-eth" target="_blank" rel="noopener noreferrer">
      <PageHeader
        title="WenPassiveIncome?"
        subTitle="instantly add staking and lending to any nft collection"
        style={{ cursor: "pointer" }}
      />
    </a>
  );
}
