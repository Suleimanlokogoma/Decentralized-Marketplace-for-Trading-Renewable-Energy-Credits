import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const user1 = accounts.get("wallet_1")!;
const user2 = accounts.get("wallet_2")!;
const verifier = accounts.get("wallet_3")!;

describe("REC NFT Contract", () => {
  beforeEach(() => {
    // Reset the simnet state before each test
  });

  describe("Facility Registration", () => {
    it("should allow users to register a facility", () => {
      const { result } = simnet.callPublicFn(
        "rec-nft",
        "register-facility",
        [
          Cl.stringAscii("SOLAR-001"),
          Cl.uint(100), // 100 MW capacity
          Cl.stringAscii("Solar PV"),
          Cl.uint(1640995200), // commissioning date
          Cl.stringAscii("California, USA")
        ],
        user1
      );

      expect(result).toBeOk(Cl.stringAscii("SOLAR-001"));
    });

    it("should reject facility registration with zero capacity", () => {
      const { result } = simnet.callPublicFn(
        "rec-nft",
        "register-facility",
        [
          Cl.stringAscii("SOLAR-002"),
          Cl.uint(0), // Invalid capacity
          Cl.stringAscii("Solar PV"),
          Cl.uint(1640995200),
          Cl.stringAscii("California, USA")
        ],
        user1
      );

      expect(result).toBeErr(Cl.uint(106)); // err-invalid-amount
    });

    it("should store facility information correctly", () => {
      // Register facility
      simnet.callPublicFn(
        "rec-nft",
        "register-facility",
        [
          Cl.stringAscii("WIND-001"),
          Cl.uint(50),
          Cl.stringAscii("Wind Turbine"),
          Cl.uint(1640995200),
          Cl.stringAscii("Texas, USA")
        ],
        user1
      );

      // Check facility info
      const { result } = simnet.callReadOnlyFn(
        "rec-nft",
        "get-facility-info",
        [Cl.stringAscii("WIND-001")],
        user1
      );

      expect(result).toBeSome(
        Cl.tuple({
          owner: Cl.principal(user1),
          "capacity-mw": Cl.uint(50),
          technology: Cl.stringAscii("Wind Turbine"),
          "commissioning-date": Cl.uint(1640995200),
          verified: Cl.bool(false),
          location: Cl.stringAscii("Texas, USA")
        })
      );
    });
  });

  describe("Facility Verification", () => {
    beforeEach(() => {
      // Register a facility for testing
      simnet.callPublicFn(
        "rec-nft",
        "register-facility",
        [
          Cl.stringAscii("HYDRO-001"),
          Cl.uint(25),
          Cl.stringAscii("Hydroelectric"),
          Cl.uint(1640995200),
          Cl.stringAscii("Oregon, USA")
        ],
        user1
      );
    });

    it("should allow contract owner to verify facilities", () => {
      const { result } = simnet.callPublicFn(
        "rec-nft",
        "verify-facility",
        [Cl.stringAscii("HYDRO-001")],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject verification from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "rec-nft",
        "verify-facility",
        [Cl.stringAscii("HYDRO-001")],
        user1
      );

      expect(result).toBeErr(Cl.uint(100)); // err-owner-only
    });

    it("should update facility verification status", () => {
      // Verify facility
      simnet.callPublicFn(
        "rec-nft",
        "verify-facility",
        [Cl.stringAscii("HYDRO-001")],
        deployer
      );

      // Check verification status
      const { result } = simnet.callReadOnlyFn(
        "rec-nft",
        "is-facility-verified",
        [Cl.stringAscii("HYDRO-001")],
        user1
      );

      expect(result).toBe(Cl.bool(true));
    });
  });

  describe("REC Minting", () => {
    beforeEach(() => {
      // Register and verify a facility
      simnet.callPublicFn(
        "rec-nft",
        "register-facility",
        [
          Cl.stringAscii("SOLAR-003"),
          Cl.uint(75),
          Cl.stringAscii("Solar PV"),
          Cl.uint(1640995200),
          Cl.stringAscii("Arizona, USA")
        ],
        user1
      );
      
      simnet.callPublicFn(
        "rec-nft",
        "verify-facility",
        [Cl.stringAscii("SOLAR-003")],
        deployer
      );
    });

    it("should allow facility owner to mint RECs", () => {
      const { result } = simnet.callPublicFn(
        "rec-nft",
        "mint-rec",
        [
          Cl.principal(user1),
          Cl.stringAscii("SOLAR-003"),
          Cl.stringAscii("Solar"),
          Cl.uint(1672531200), // generation date
          Cl.uint(1000), // 1000 MWh
          Cl.stringAscii("Arizona, USA"),
          Cl.principal(verifier),
          Cl.stringAscii("Green-e"),
          Cl.stringAscii("QmTestHash123456789")
        ],
        user1
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should reject minting for unverified facility", () => {
      // Register but don't verify facility
      simnet.callPublicFn(
        "rec-nft",
        "register-facility",
        [
          Cl.stringAscii("SOLAR-004"),
          Cl.uint(50),
          Cl.stringAscii("Solar PV"),
          Cl.uint(1640995200),
          Cl.stringAscii("Nevada, USA")
        ],
        user2
      );

      const { result } = simnet.callPublicFn(
        "rec-nft",
        "mint-rec",
        [
          Cl.principal(user2),
          Cl.stringAscii("SOLAR-004"),
          Cl.stringAscii("Solar"),
          Cl.uint(1672531200),
          Cl.uint(500),
          Cl.stringAscii("Nevada, USA"),
          Cl.principal(verifier),
          Cl.stringAscii("Green-e"),
          Cl.stringAscii("QmTestHash987654321")
        ],
        user2
      );

      expect(result).toBeErr(Cl.uint(105)); // err-facility-not-verified
    });

    it("should reject minting with zero MWh amount", () => {
      const { result } = simnet.callPublicFn(
        "rec-nft",
        "mint-rec",
        [
          Cl.principal(user1),
          Cl.stringAscii("SOLAR-003"),
          Cl.stringAscii("Solar"),
          Cl.uint(1672531200),
          Cl.uint(0), // Invalid amount
          Cl.stringAscii("Arizona, USA"),
          Cl.principal(verifier),
          Cl.stringAscii("Green-e"),
          Cl.stringAscii("QmTestHash123456789")
        ],
        user1
      );

      expect(result).toBeErr(Cl.uint(106)); // err-invalid-amount
    });

    it("should store REC metadata correctly", () => {
      // Mint REC
      simnet.callPublicFn(
        "rec-nft",
        "mint-rec",
        [
          Cl.principal(user1),
          Cl.stringAscii("SOLAR-003"),
          Cl.stringAscii("Solar"),
          Cl.uint(1672531200),
          Cl.uint(1500),
          Cl.stringAscii("Arizona, USA"),
          Cl.principal(verifier),
          Cl.stringAscii("I-REC"),
          Cl.stringAscii("QmMetadataHash123")
        ],
        user1
      );

      // Check metadata
      const { result } = simnet.callReadOnlyFn(
        "rec-nft",
        "get-token-metadata",
        [Cl.uint(1)],
        user1
      );

      expect(result).toBeSome(
        Cl.tuple({
          "facility-id": Cl.stringAscii("SOLAR-003"),
          "energy-type": Cl.stringAscii("Solar"),
          "generation-date": Cl.uint(1672531200),
          "mwh-amount": Cl.uint(1500),
          location: Cl.stringAscii("Arizona, USA"),
          verifier: Cl.principal(verifier),
          "certification-standard": Cl.stringAscii("I-REC"),
          "ipfs-hash": Cl.stringAscii("QmMetadataHash123")
        })
      );
    });
  });

  describe("NFT Transfer", () => {
    beforeEach(() => {
      // Setup: Register facility, verify, and mint REC
      simnet.callPublicFn(
        "rec-nft",
        "register-facility",
        [
          Cl.stringAscii("WIND-002"),
          Cl.uint(100),
          Cl.stringAscii("Wind Turbine"),
          Cl.uint(1640995200),
          Cl.stringAscii("Kansas, USA")
        ],
        user1
      );
      
      simnet.callPublicFn(
        "rec-nft",
        "verify-facility",
        [Cl.stringAscii("WIND-002")],
        deployer
      );
      
      simnet.callPublicFn(
        "rec-nft",
        "mint-rec",
        [
          Cl.principal(user1),
          Cl.stringAscii("WIND-002"),
          Cl.stringAscii("Wind"),
          Cl.uint(1672531200),
          Cl.uint(2000),
          Cl.stringAscii("Kansas, USA"),
          Cl.principal(verifier),
          Cl.stringAscii("TIGR"),
          Cl.stringAscii("QmWindHash456")
        ],
        user1
      );
    });

    it("should allow owner to transfer NFT", () => {
      const { result } = simnet.callPublicFn(
        "rec-nft",
        "transfer",
        [Cl.uint(1), Cl.principal(user1), Cl.principal(user2)],
        user1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject transfer from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "rec-nft",
        "transfer",
        [Cl.uint(1), Cl.principal(user2), Cl.principal(user1)],
        user2
      );

      expect(result).toBeErr(Cl.uint(101)); // err-not-token-owner
    });

    it("should update ownership after transfer", () => {
      // Transfer NFT
      simnet.callPublicFn(
        "rec-nft",
        "transfer",
        [Cl.uint(1), Cl.principal(user1), Cl.principal(user2)],
        user1
      );

      // Check new owner
      const { result } = simnet.callReadOnlyFn(
        "rec-nft",
        "get-owner",
        [Cl.uint(1)],
        user1
      );

      expect(result).toBeOk(Cl.some(Cl.principal(user2)));
    });
  });

  describe("Read-only Functions", () => {
    it("should return correct last token ID", () => {
      const { result } = simnet.callReadOnlyFn(
        "rec-nft",
        "get-last-token-id",
        [],
        user1
      );

      expect(result).toBeOk(Cl.uint(0)); // No tokens minted yet
    });

    it("should return facility owner correctly", () => {
      // Register facility
      simnet.callPublicFn(
        "rec-nft",
        "register-facility",
        [
          Cl.stringAscii("GEOTHERMAL-001"),
          Cl.uint(30),
          Cl.stringAscii("Geothermal"),
          Cl.uint(1640995200),
          Cl.stringAscii("Iceland")
        ],
        user2
      );

      const { result } = simnet.callReadOnlyFn(
        "rec-nft",
        "get-facility-owner",
        [Cl.stringAscii("GEOTHERMAL-001")],
        user1
      );

      expect(result).toBeSome(Cl.principal(user2));
    });
  });
});