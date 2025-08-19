import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const seller = accounts.get("wallet_1")!;
const buyer = accounts.get("wallet_2")!;
const bidder1 = accounts.get("wallet_3")!;
const bidder2 = accounts.get("wallet_4")!;

describe("REC Marketplace Contract", () => {
  beforeEach(() => {
    // Setup: Register facility, verify, and mint REC for testing
    simnet.callPublicFn(
      "rec-nft",
      "register-facility",
      [
        Cl.stringAscii("TEST-FACILITY"),
        Cl.uint(100),
        Cl.stringAscii("Solar PV"),
        Cl.uint(1640995200),
        Cl.stringAscii("California, USA")
      ],
      seller
    );
    
    simnet.callPublicFn(
      "rec-nft",
      "verify-facility",
      [Cl.stringAscii("TEST-FACILITY")],
      deployer
    );
    
    simnet.callPublicFn(
      "rec-nft",
      "mint-rec",
      [
        Cl.principal(seller),
        Cl.stringAscii("TEST-FACILITY"),
        Cl.stringAscii("Solar"),
        Cl.uint(1672531200),
        Cl.uint(1000),
        Cl.stringAscii("California, USA"),
        Cl.principal(deployer),
        Cl.stringAscii("Green-e"),
        Cl.stringAscii("QmTestHash123")
      ],
      seller
    );
  });

  describe("Direct Listings", () => {
    it("should allow NFT owner to create direct listing", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-direct",
        [Cl.uint(1), Cl.uint(1000000)], // 1 STX price
        seller
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should reject listing from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-direct",
        [Cl.uint(1), Cl.uint(1000000)],
        buyer
      );

      expect(result).toBeErr(Cl.uint(200)); // err-unauthorized
    });

    it("should reject listing with zero price", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-direct",
        [Cl.uint(1), Cl.uint(0)],
        seller
      );

      expect(result).toBeErr(Cl.uint(208)); // err-invalid-price
    });

    it("should store listing information correctly", () => {
      // Create listing
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-direct",
        [Cl.uint(1), Cl.uint(2000000)],
        seller
      );

      // Check listing info
      const { result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-listing",
        [Cl.uint(1)],
        buyer
      );

      expect(result).toBeSome(
        Cl.tuple({
          seller: Cl.principal(seller),
          "token-id": Cl.uint(1),
          price: Cl.uint(2000000),
          "listing-type": Cl.stringAscii("direct"),
          "end-time": Cl.none(),
          active: Cl.bool(true),
          "created-at": Cl.uint(simnet.blockHeight)
        })
      );
    });
  });

  describe("Direct Purchase", () => {
    beforeEach(() => {
      // Create a direct listing
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-direct",
        [Cl.uint(1), Cl.uint(1000000)],
        seller
      );
    });

    it("should allow buyer to purchase REC", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "buy-rec",
        [Cl.uint(1)],
        buyer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject self-purchase", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "buy-rec",
        [Cl.uint(1)],
        seller
      );

      expect(result).toBeErr(Cl.uint(209)); // err-self-bid
    });

    it("should transfer NFT ownership after purchase", () => {
      // Purchase REC
      simnet.callPublicFn(
        "rec-marketplace",
        "buy-rec",
        [Cl.uint(1)],
        buyer
      );

      // Check new owner
      const { result } = simnet.callReadOnlyFn(
        "rec-nft",
        "get-owner",
        [Cl.uint(1)],
        buyer
      );

      expect(result).toBeOk(Cl.some(Cl.principal(buyer)));
    });

    it("should mark listing as inactive after purchase", () => {
      // Purchase REC
      simnet.callPublicFn(
        "rec-marketplace",
        "buy-rec",
        [Cl.uint(1)],
        buyer
      );

      // Check listing status
      const { result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-listing",
        [Cl.uint(1)],
        buyer
      );

      const listing = result.expectSome();
      expect(Cl.tuple(listing).active).toBe(Cl.bool(false));
    });
  });

  describe("Auction Listings", () => {
    it("should allow NFT owner to create auction listing", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-auction",
        [
          Cl.uint(1),
          Cl.uint(500000), // starting price
          Cl.uint(1000) // duration in blocks
        ],
        seller
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should reject auction with insufficient duration", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-auction",
        [
          Cl.uint(1),
          Cl.uint(500000),
          Cl.uint(100) // Too short duration
        ],
        seller
      );

      expect(result).toBeErr(Cl.uint(201)); // err-invalid-listing
    });

    it("should store auction information correctly", () => {
      const currentBlock = simnet.blockHeight;
      const duration = 1000;
      
      // Create auction
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-auction",
        [Cl.uint(1), Cl.uint(750000), Cl.uint(duration)],
        seller
      );

      // Check listing info
      const { result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-listing",
        [Cl.uint(1)],
        buyer
      );

      expect(result).toBeSome(
        Cl.tuple({
          seller: Cl.principal(seller),
          "token-id": Cl.uint(1),
          price: Cl.uint(750000),
          "listing-type": Cl.stringAscii("auction"),
          "end-time": Cl.some(Cl.uint(currentBlock + duration)),
          active: Cl.bool(true),
          "created-at": Cl.uint(currentBlock)
        })
      );
    });
  });

  describe("Auction Bidding", () => {
    beforeEach(() => {
      // Create auction listing
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-auction",
        [Cl.uint(1), Cl.uint(500000), Cl.uint(1000)],
        seller
      );
    });

    it("should allow valid bids on auction", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "place-bid",
        [Cl.uint(1), Cl.uint(600000)],
        bidder1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject bids below starting price", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "place-bid",
        [Cl.uint(1), Cl.uint(400000)],
        bidder1
      );

      expect(result).toBeErr(Cl.uint(205)); // err-bid-too-low
    });

    it("should reject bids from seller", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "place-bid",
        [Cl.uint(1), Cl.uint(600000)],
        seller
      );

      expect(result).toBeErr(Cl.uint(209)); // err-self-bid
    });

    it("should update highest bid correctly", () => {
      // Place first bid
      simnet.callPublicFn(
        "rec-marketplace",
        "place-bid",
        [Cl.uint(1), Cl.uint(600000)],
        bidder1
      );

      // Check highest bid
      const { result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-highest-bid",
        [Cl.uint(1)],
        seller
      );

      expect(result).toBeSome(
        Cl.tuple({
          bidder: Cl.principal(bidder1),
          amount: Cl.uint(600000)
        })
      );
    });

    it("should handle bid outbidding correctly", () => {
      // Place first bid
      simnet.callPublicFn(
        "rec-marketplace",
        "place-bid",
        [Cl.uint(1), Cl.uint(600000)],
        bidder1
      );

      // Place higher bid
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "place-bid",
        [Cl.uint(1), Cl.uint(700000)],
        bidder2
      );

      expect(result).toBeOk(Cl.bool(true));

      // Check new highest bid
      const { result: highestBid } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-highest-bid",
        [Cl.uint(1)],
        seller
      );

      expect(highestBid).toBeSome(
        Cl.tuple({
          bidder: Cl.principal(bidder2),
          amount: Cl.uint(700000)
        })
      );
    });
  });

  describe("Auction Finalization", () => {
    beforeEach(() => {
      // Create auction and place bid
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-auction",
        [Cl.uint(1), Cl.uint(500000), Cl.uint(200)], // Short duration for testing
        seller
      );
      
      simnet.callPublicFn(
        "rec-marketplace",
        "place-bid",
        [Cl.uint(1), Cl.uint(600000)],
        bidder1
      );
    });

    it("should reject finalization before auction ends", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "finalize-auction",
        [Cl.uint(1)],
        seller
      );

      expect(result).toBeErr(Cl.uint(206)); // err-auction-active
    });

    it("should allow finalization after auction ends", () => {
      // Mine blocks to end auction
      simnet.mineEmptyBlocks(250);

      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "finalize-auction",
        [Cl.uint(1)],
        seller
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should transfer NFT to winning bidder", () => {
      // Mine blocks to end auction
      simnet.mineEmptyBlocks(250);

      // Finalize auction
      simnet.callPublicFn(
        "rec-marketplace",
        "finalize-auction",
        [Cl.uint(1)],
        seller
      );

      // Check NFT owner
      const { result } = simnet.callReadOnlyFn(
        "rec-nft",
        "get-owner",
        [Cl.uint(1)],
        bidder1
      );

      expect(result).toBeOk(Cl.some(Cl.principal(bidder1)));
    });
  });

  describe("Listing Management", () => {
    beforeEach(() => {
      // Create direct listing
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-direct",
        [Cl.uint(1), Cl.uint(1000000)],
        seller
      );
    });

    it("should allow seller to cancel listing", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "cancel-listing",
        [Cl.uint(1)],
        seller
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject cancellation from non-seller", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "cancel-listing",
        [Cl.uint(1)],
        buyer
      );

      expect(result).toBeErr(Cl.uint(207)); // err-not-seller
    });

    it("should mark listing as inactive after cancellation", () => {
      // Cancel listing
      simnet.callPublicFn(
        "rec-marketplace",
        "cancel-listing",
        [Cl.uint(1)],
        seller
      );

      // Check listing status
      const { result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-listing",
        [Cl.uint(1)],
        seller
      );

      const listing = result.expectSome();
      expect(Cl.tuple(listing).active).toBe(Cl.bool(false));
    });
  });

  describe("Platform Revenue", () => {
    beforeEach(() => {
      // Create and purchase REC to generate revenue
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-direct",
        [Cl.uint(1), Cl.uint(1000000)],
        seller
      );
      
      simnet.callPublicFn(
        "rec-marketplace",
        "buy-rec",
        [Cl.uint(1)],
        buyer
      );
    });

    it("should track platform revenue correctly", () => {
      const { result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-platform-revenue",
        [],
        deployer
      );

      // 1% of 1000000 = 10000
      expect(result).toBe(Cl.uint(10000));
    });

    it("should allow owner to withdraw revenue", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "withdraw-platform-revenue",
        [Cl.uint(5000)],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject withdrawal from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "rec-marketplace",
        "withdraw-platform-revenue",
        [Cl.uint(5000)],
        seller
      );

      expect(result).toBeErr(Cl.uint(200)); // err-unauthorized
    });
  });

  describe("Read-only Functions", () => {
    it("should return correct listing count", () => {
      // Initially no listings
      let { result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-listing-count",
        [],
        seller
      );
      expect(result).toBe(Cl.uint(0));

      // Create listing
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-direct",
        [Cl.uint(1), Cl.uint(1000000)],
        seller
      );

      // Check count again
      ({ result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "get-listing-count",
        [],
        seller
      ));
      expect(result).toBe(Cl.uint(1));
    });

    it("should correctly identify ended auctions", () => {
      // Create short auction
      simnet.callPublicFn(
        "rec-marketplace",
        "list-rec-auction",
        [Cl.uint(1), Cl.uint(500000), Cl.uint(100)],
        seller
      );

      // Check before end
      let { result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "is-auction-ended",
        [Cl.uint(1)],
        seller
      );
      expect(result).toBe(Cl.bool(false));

      // Mine blocks to end auction
      simnet.mineEmptyBlocks(150);

      // Check after end
      ({ result } = simnet.callReadOnlyFn(
        "rec-marketplace",
        "is-auction-ended",
        [Cl.uint(1)],
        seller
      ));
      expect(result).toBe(Cl.bool(true));
    });
  });
});