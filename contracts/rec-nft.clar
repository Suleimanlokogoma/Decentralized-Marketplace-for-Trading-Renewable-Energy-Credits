;; REC NFT Contract
;; Implements SIP-009 NFT Standard for Renewable Energy Credits

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-not-token-owner (err u101))
(define-constant err-invalid-metadata (err u102))
(define-constant err-token-not-found (err u103))
(define-constant err-facility-not-found (err u104))
(define-constant err-facility-not-verified (err u105))
(define-constant err-invalid-amount (err u106))

;; Data Variables
(define-data-var last-token-id uint u0)
(define-data-var contract-uri (optional (string-utf8 256)) none)

;; Data Maps
(define-map token-metadata uint {
    facility-id: (string-ascii 50),
    energy-type: (string-ascii 20),
    generation-date: uint,
    mwh-amount: uint,
    location: (string-ascii 100),
    verifier: principal,
    certification-standard: (string-ascii 30),
    ipfs-hash: (string-ascii 64)
})

(define-map facility-registry (string-ascii 50) {
    owner: principal,
    capacity-mw: uint,
    technology: (string-ascii 30),
    commissioning-date: uint,
    verified: bool,
    location: (string-ascii 100)
})

(define-map token-uris uint (string-utf8 256))

;; NFT Definition
(define-non-fungible-token renewable-energy-credit uint)

;; SIP-009 Implementation
(define-read-only (get-last-token-id)
    (ok (var-get last-token-id))
)

(define-read-only (get-token-uri (token-id uint))
    (ok (map-get? token-uris token-id))
)

(define-read-only (get-owner (token-id uint))
    (ok (nft-get-owner? renewable-energy-credit token-id))
)

(define-public (transfer (token-id uint) (sender principal) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender sender) err-not-token-owner)
        (asserts! (is-eq sender (unwrap! (nft-get-owner? renewable-energy-credit token-id) err-token-not-found)) err-not-token-owner)
        (nft-transfer? renewable-energy-credit token-id sender recipient)
    )
)

;; Public Functions
(define-public (register-facility 
    (facility-id (string-ascii 50))
    (capacity-mw uint)
    (technology (string-ascii 30))
    (commissioning-date uint)
    (location (string-ascii 100)))
    (begin
        (asserts! (> capacity-mw u0) err-invalid-amount)
        (map-set facility-registry facility-id {
            owner: tx-sender,
            capacity-mw: capacity-mw,
            technology: technology,
            commissioning-date: commissioning-date,
            verified: false,
            location: location
        })
        (ok facility-id)
    )
)

(define-public (verify-facility (facility-id (string-ascii 50)))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (let ((facility (unwrap! (map-get? facility-registry facility-id) err-facility-not-found)))
            (map-set facility-registry facility-id (merge facility { verified: true }))
            (ok true)
        )
    )
)

(define-public (mint-rec
    (recipient principal)
    (facility-id (string-ascii 50))
    (energy-type (string-ascii 20))
    (generation-date uint)
    (mwh-amount uint)
    (location (string-ascii 100))
    (verifier principal)
    (certification-standard (string-ascii 30))
    (ipfs-hash (string-ascii 64)))
    (let
        ((token-id (+ (var-get last-token-id) u1))
         (facility (unwrap! (map-get? facility-registry facility-id) err-facility-not-found)))
        (asserts! (get verified facility) err-facility-not-verified)
        (asserts! (> mwh-amount u0) err-invalid-amount)
        (asserts! (is-eq (get owner facility) tx-sender) err-not-token-owner)
        (try! (nft-mint? renewable-energy-credit token-id recipient))
        (map-set token-metadata token-id {
            facility-id: facility-id,
            energy-type: energy-type,
            generation-date: generation-date,
            mwh-amount: mwh-amount,
            location: location,
            verifier: verifier,
            certification-standard: certification-standard,
            ipfs-hash: ipfs-hash
        })
        (map-set token-uris token-id u"ipfs://placeholder/metadata.json")
        (var-set last-token-id token-id)
        (print {
            event: "rec-minted",
            token-id: token-id,
            facility-id: facility-id,
            mwh-amount: mwh-amount,
            recipient: recipient
        })
        (ok token-id)
    )
)

;; Read-only Functions
(define-read-only (get-token-metadata (token-id uint))
    (map-get? token-metadata token-id)
)

(define-read-only (get-facility-info (facility-id (string-ascii 50)))
    (map-get? facility-registry facility-id)
)

(define-read-only (get-facility-owner (facility-id (string-ascii 50)))
    (match (map-get? facility-registry facility-id)
        facility (some (get owner facility))
        none
    )
)

(define-read-only (is-facility-verified (facility-id (string-ascii 50)))
    (match (map-get? facility-registry facility-id)
        facility (get verified facility)
        false
    )
)

;; Admin Functions
(define-public (set-contract-uri (uri (string-utf8 256)))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (var-set contract-uri (some uri))
        (ok true)
    )
)

(define-public (update-token-uri (token-id uint) (uri (string-utf8 256)))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-owner-only)
        (asserts! (is-some (nft-get-owner? renewable-energy-credit token-id)) err-token-not-found)
        (map-set token-uris token-id uri)
        (ok true)
    )
)