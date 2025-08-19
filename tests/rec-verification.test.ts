import { describe, expect, it, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const verifier1 = accounts.get("wallet_1")!;
const verifier2 = accounts.get("wallet_2")!;
const tokenOwner = accounts.get("wallet_3")!;
const user = accounts.get("wallet_4")!;

describe("REC Verification Contract", () => {
  describe("Verifier Management", () => {
    it("should allow contract owner to add verifiers", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Green Energy Certifiers"),
          Cl.stringAscii("Green-e")
        ],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject verifier addition from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Unauthorized Verifier"),
          Cl.stringAscii("I-REC")
        ],
        user
      );

      expect(result).toBeErr(Cl.uint(300)); // err-unauthorized
    });

    it("should store verifier information correctly", () => {
      // Add verifier
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Renewable Energy Validators"),
          Cl.stringAscii("TIGR")
        ],
        deployer
      );

      // Check verifier info
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verifier-info",
        [Cl.principal(verifier1)],
        user
      );

      expect(result).toBeSome(
        Cl.tuple({
          name: Cl.stringAscii("Renewable Energy Validators"),
          "certification-body": Cl.stringAscii("TIGR"),
          "authorized-date": Cl.uint(simnet.blockHeight),
          active: Cl.bool(true)
        })
      );
    });

    it("should initialize verifier stats correctly", () => {
      // Add verifier
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier2),
          Cl.stringAscii("Clean Energy Auditors"),
          Cl.stringAscii("Green-e")
        ],
        deployer
      );

      // Check initial stats
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verifier-stats",
        [Cl.principal(verifier2)],
        user
      );

      expect(result).toBeSome(
        Cl.tuple({
          "total-verifications": Cl.uint(0),
          "verified-count": Cl.uint(0),
          "rejected-count": Cl.uint(0),
          "reputation-score": Cl.uint(100)
        })
      );
    });
  });

  describe("Verifier Deactivation", () => {
    beforeEach(() => {
      // Add verifier for testing
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Test Verifier"),
          Cl.stringAscii("Test-Standard")
        ],
        deployer
      );
    });

    it("should allow contract owner to deactivate verifiers", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "deactivate-verifier",
        [Cl.principal(verifier1)],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject deactivation from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "deactivate-verifier",
        [Cl.principal(verifier1)],
        user
      );

      expect(result).toBeErr(Cl.uint(300)); // err-unauthorized
    });

    it("should update verifier status to inactive", () => {
      // Deactivate verifier
      simnet.callPublicFn(
        "rec-verification",
        "deactivate-verifier",
        [Cl.principal(verifier1)],
        deployer
      );

      // Check authorization status
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "is-authorized-verifier",
        [Cl.principal(verifier1)],
        user
      );

      expect(result).toBe(Cl.bool(false));
    });
  });

  describe("Verification Submission", () => {
    beforeEach(() => {
      // Add authorized verifier
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Certified Verifier"),
          Cl.stringAscii("Green-e")
        ],
        deployer
      );
    });

    it("should allow authorized verifier to submit verification", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(1), // token-id
          Cl.stringAscii("verified"),
          Cl.stringAscii("All documentation verified and compliant"),
          Cl.stringAscii("QmVerificationHash123"),
          Cl.some(Cl.uint(1735689600)) // expiry date
        ],
        verifier1
      );

      expect(result).toBeOk(Cl.uint(1));
    });

    it("should reject verification from unauthorized verifier", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(1),
          Cl.stringAscii("verified"),
          Cl.stringAscii("Unauthorized verification attempt"),
          Cl.stringAscii("QmUnauthorizedHash"),
          Cl.none()
        ],
        user
      );

      expect(result).toBeErr(Cl.uint(302)); // err-invalid-verifier
    });

    it("should reject verification with invalid status", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(1),
          Cl.stringAscii("invalid-status"),
          Cl.stringAscii("Test notes"),
          Cl.stringAscii("QmTestHash"),
          Cl.none()
        ],
        verifier1
      );

      expect(result).toBeErr(Cl.uint(304)); // err-invalid-status
    });

    it("should store verification record correctly", () => {
      // Submit verification
      simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(2),
          Cl.stringAscii("verified"),
          Cl.stringAscii("Comprehensive verification completed"),
          Cl.stringAscii("QmDetailedHash456"),
          Cl.some(Cl.uint(1767225600))
        ],
        verifier1
      );

      // Check verification record
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verification",
        [Cl.uint(1)],
        user
      );

      expect(result).toBeSome(
        Cl.tuple({
          "token-id": Cl.uint(2),
          verifier: Cl.principal(verifier1),
          "verification-date": Cl.uint(simnet.blockHeight),
          status: Cl.stringAscii("verified"),
          notes: Cl.stringAscii("Comprehensive verification completed"),
          "evidence-hash": Cl.stringAscii("QmDetailedHash456"),
          "expiry-date": Cl.some(Cl.uint(1767225600))
        })
      );
    });

    it("should update verifier statistics", () => {
      // Submit verified verification
      simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(3),
          Cl.stringAscii("verified"),
          Cl.stringAscii("Verification passed"),
          Cl.stringAscii("QmPassHash"),
          Cl.none()
        ],
        verifier1
      );

      // Submit rejected verification
      simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(4),
          Cl.stringAscii("rejected"),
          Cl.stringAscii("Documentation insufficient"),
          Cl.stringAscii("QmRejectHash"),
          Cl.none()
        ],
        verifier1
      );

      // Check updated stats
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verifier-stats",
        [Cl.principal(verifier1)],
        user
      );

      expect(result).toBeSome(
        Cl.tuple({
          "total-verifications": Cl.uint(2),
          "verified-count": Cl.uint(1),
          "rejected-count": Cl.uint(1),
          "reputation-score": Cl.uint(100)
        })
      );
    });
  });

  describe("Verification Updates", () => {
    beforeEach(() => {
      // Setup: Add verifier and submit initial verification
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Update Tester"),
          Cl.stringAscii("Test-Standard")
        ],
        deployer
      );

      simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(5),
          Cl.stringAscii("pending"),
          Cl.stringAscii("Initial submission"),
          Cl.stringAscii("QmInitialHash"),
          Cl.none()
        ],
        verifier1
      );
    });

    it("should allow verifier to update their own verification", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "update-verification-status",
        [
          Cl.uint(1),
          Cl.stringAscii("verified"),
          Cl.stringAscii("Updated after additional review")
        ],
        verifier1
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject update from different verifier", () => {
      // Add second verifier
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier2),
          Cl.stringAscii("Other Verifier"),
          Cl.stringAscii("Other-Standard")
        ],
        deployer
      );

      const { result } = simnet.callPublicFn(
        "rec-verification",
        "update-verification-status",
        [
          Cl.uint(1),
          Cl.stringAscii("verified"),
          Cl.stringAscii("Unauthorized update attempt")
        ],
        verifier2
      );

      expect(result).toBeErr(Cl.uint(300)); // err-unauthorized
    });

    it("should update verification record correctly", () => {
      // Update verification
      simnet.callPublicFn(
        "rec-verification",
        "update-verification-status",
        [
          Cl.uint(1),
          Cl.stringAscii("rejected"),
          Cl.stringAscii("Failed compliance check")
        ],
        verifier1
      );

      // Check updated record
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verification",
        [Cl.uint(1)],
        user
      );

      const verification = result.expectSome();
      expect(Cl.tuple(verification).status).toBe(Cl.stringAscii("rejected"));
      expect(Cl.tuple(verification).notes).toBe(Cl.stringAscii("Failed compliance check"));
    });
  });

  describe("Dispute Management", () => {
    beforeEach(() => {
      // Setup: Add verifier and submit verification
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Dispute Test Verifier"),
          Cl.stringAscii("Dispute-Standard")
        ],
        deployer
      );

      simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(6),
          Cl.stringAscii("rejected"),
          Cl.stringAscii("Disputed verification"),
          Cl.stringAscii("QmDisputeHash"),
          Cl.none()
        ],
        verifier1
      );
    });

    it("should allow users to dispute verification", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "dispute-verification",
        [
          Cl.uint(1),
          Cl.stringAscii("Verification was incorrect based on provided documentation")
        ],
        tokenOwner
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should update verification status to disputed", () => {
      // Dispute verification
      simnet.callPublicFn(
        "rec-verification",
        "dispute-verification",
        [
          Cl.uint(1),
          Cl.stringAscii("Disputing the rejection")
        ],
        tokenOwner
      );

      // Check verification status
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verification",
        [Cl.uint(1)],
        user
      );

      const verification = result.expectSome();
      expect(Cl.tuple(verification).status).toBe(Cl.stringAscii("disputed"));
    });

    it("should store dispute information", () => {
      // Dispute verification
      simnet.callPublicFn(
        "rec-verification",
        "dispute-verification",
        [
          Cl.uint(1),
          Cl.stringAscii("Evidence was not properly considered")
        ],
        tokenOwner
      );

      // Check dispute record
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verification-dispute",
        [Cl.uint(1)],
        user
      );

      expect(result).toBeSome(
        Cl.tuple({
          disputer: Cl.principal(tokenOwner),
          reason: Cl.stringAscii("Evidence was not properly considered"),
          "dispute-date": Cl.uint(simnet.blockHeight),
          resolved: Cl.bool(false),
          resolution: Cl.none()
        })
      );
    });
  });

  describe("Dispute Resolution", () => {
    beforeEach(() => {
      // Setup: Add verifier, submit verification, and create dispute
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Resolution Test Verifier"),
          Cl.stringAscii("Resolution-Standard")
        ],
        deployer
      );

      simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(7),
          Cl.stringAscii("rejected"),
          Cl.stringAscii("Initial rejection"),
          Cl.stringAscii("QmResolutionHash"),
          Cl.none()
        ],
        verifier1
      );

      simnet.callPublicFn(
        "rec-verification",
        "dispute-verification",
        [
          Cl.uint(1),
          Cl.stringAscii("Disputing the decision")
        ],
        tokenOwner
      );
    });

    it("should allow contract owner to resolve disputes", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.stringAscii("After review, verification should be approved"),
          Cl.stringAscii("verified")
        ],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject dispute resolution from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.stringAscii("Unauthorized resolution"),
          Cl.stringAscii("verified")
        ],
        user
      );

      expect(result).toBeErr(Cl.uint(300)); // err-unauthorized
    });

    it("should update dispute as resolved", () => {
      // Resolve dispute
      simnet.callPublicFn(
        "rec-verification",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.stringAscii("Dispute resolved in favor of token owner"),
          Cl.stringAscii("verified")
        ],
        deployer
      );

      // Check dispute status
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verification-dispute",
        [Cl.uint(1)],
        user
      );

      const dispute = result.expectSome();
      expect(Cl.tuple(dispute).resolved).toBe(Cl.bool(true));
      expect(Cl.tuple(dispute).resolution).toBeSome(
        Cl.stringAscii("Dispute resolved in favor of token owner")
      );
    });

    it("should update verification status after resolution", () => {
      // Resolve dispute
      simnet.callPublicFn(
        "rec-verification",
        "resolve-dispute",
        [
          Cl.uint(1),
          Cl.stringAscii("Resolution complete"),
          Cl.stringAscii("verified")
        ],
        deployer
      );

      // Check verification status
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verification",
        [Cl.uint(1)],
        user
      );

      const verification = result.expectSome();
      expect(Cl.tuple(verification).status).toBe(Cl.stringAscii("verified"));
    });
  });

  describe("Read-only Functions", () => {
    beforeEach(() => {
      // Setup test data
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Read Test Verifier"),
          Cl.stringAscii("Read-Standard")
        ],
        deployer
      );

      simnet.callPublicFn(
        "rec-verification",
        "submit-verification",
        [
          Cl.uint(8),
          Cl.stringAscii("verified"),
          Cl.stringAscii("Test verification"),
          Cl.stringAscii("QmReadHash"),
          Cl.none()
        ],
        verifier1
      );
    });

    it("should correctly identify verified tokens", () => {
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "is-token-verified",
        [Cl.uint(8)],
        user
      );

      expect(result).toBe(Cl.bool(true));
    });

    it("should return correct verification count", () => {
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-verification-count",
        [],
        user
      );

      expect(result).toBe(Cl.uint(1));
    });

    it("should get token verification correctly", () => {
      const { result } = simnet.callReadOnlyFn(
        "rec-verification",
        "get-token-verification",
        [Cl.uint(8)],
        user
      );

      expect(result).toBeSome(
        Cl.tuple({
          "token-id": Cl.uint(8),
          verifier: Cl.principal(verifier1),
          "verification-date": Cl.uint(simnet.blockHeight),
          status: Cl.stringAscii("verified"),
          notes: Cl.stringAscii("Test verification"),
          "evidence-hash": Cl.stringAscii("QmReadHash"),
          "expiry-date": Cl.none()
        })
      );
    });
  });

  describe("Admin Functions", () => {
    beforeEach(() => {
      // Add verifier for testing
      simnet.callPublicFn(
        "rec-verification",
        "add-verifier",
        [
          Cl.principal(verifier1),
          Cl.stringAscii("Admin Test Verifier"),
          Cl.stringAscii("Admin-Standard")
        ],
        deployer
      );
    });

    it("should allow owner to update verifier reputation", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "update-verifier-reputation",
        [Cl.principal(verifier1), Cl.uint(85)],
        deployer
      );

      expect(result).toBeOk(Cl.bool(true));
    });

    it("should reject reputation update from non-owner", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "update-verifier-reputation",
        [Cl.principal(verifier1), Cl.uint(75)],
        user
      );

      expect(result).toBeErr(Cl.uint(300)); // err-unauthorized
    });

    it("should reject invalid reputation scores", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "update-verifier-reputation",
        [Cl.principal(verifier1), Cl.uint(150)], // Invalid score > 100
        deployer
      );

      expect(result).toBeErr(Cl.uint(304)); // err-invalid-status
    });

    it("should allow bulk verification", () => {
      const { result } = simnet.callPublicFn(
        "rec-verification",
        "bulk-verify-tokens",
        [
          Cl.list([Cl.uint(10), Cl.uint(11), Cl.uint(12)]),
          Cl.principal(verifier1)
        ],
        deployer
      );

      expect(result).toBeOk(Cl.list([Cl.uint(1), Cl.uint(2), Cl.uint(3)]));
    });
  });
});