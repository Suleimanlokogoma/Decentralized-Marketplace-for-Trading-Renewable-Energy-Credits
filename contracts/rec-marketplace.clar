;; REC Marketplace Contract
;; Handles trading operations for Renewable Energy Credits

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u200))
(define-constant err-invalid-listing (err u201))
(define-constant err-insufficient-funds (err u202))
(define-constant err-listing-not-found (err u203))
(define-constant err-auction-ended (err u204))
(define-constant err-bid-too-low (err u205))
(define-constant err-auction-active (err u206))
(define-constant err-not-seller (err u207))
(define-constant err-invalid-price (err u208))
(define-constant err-self-bid (err u209))

;; Trading fee (1% = 100 basis points)
(define-constant trading-fee-bps u100)
(define-constant min-auction-duration u144) ;; ~24 hours in blocks

;; Data Variables
(define-data-var next-listing-id uint u1)
(define-data-var platform-revenue uint u0)

;; Data Maps
(define-map listings uint {
    seller: principal,
    token-id: uint,
    price: uint,
    listing-type: (string-ascii 10), ;; "direct" or "auction"
    end-time: (optional uint),
    active: bool,
    created-at: uint
})

(define-map highest-bids uint {
    bidder: principal,
    amount: uint
})

(define-map user-bids { listing-id: uint, bidder: principal } uint)

;; Public Functions
(define-public (list-rec-direct
    (token-id uint)
    (price uint))
    (let
        ((listing-id (var-get next-listing-id)))
        (asserts! (> price u0) err-invalid-price)
        (map-set listings listing-id {
            seller: tx-sender,
            token-id: token-id,
            price: price,
            listing-type: "direct",
            end-time: none,
            active: true,
            created-at: burn-block-height
        })
        (var-set next-listing-id (+ listing-id u1))
        (print {
            event: "listing-created",
            listing-id: listing-id,
            token-id: token-id,
            price: price,
            listing-type: "direct"
        })
        (ok listing-id)
    )
)

(define-public (list-rec-auction
    (token-id uint)
    (starting-price uint)
    (duration uint))
    (let
        ((listing-id (var-get next-listing-id))
         (end-time (+ burn-block-height duration)))
        (asserts! (> starting-price u0) err-invalid-price)
        (asserts! (>= duration min-auction-duration) err-invalid-listing)
        (map-set listings listing-id {
            seller: tx-sender,
            token-id: token-id,
            price: starting-price,
            listing-type: "auction",
            end-time: (some end-time),
            active: true,
            created-at: burn-block-height
        })
        (var-set next-listing-id (+ listing-id u1))
        (print {
            event: "auction-created",
            listing-id: listing-id,
            token-id: token-id,
            starting-price: starting-price,
            end-time: end-time
        })
        (ok listing-id)
    )
)

(define-public (buy-rec (listing-id uint))
    (let
        ((listing (unwrap! (map-get? listings listing-id) err-listing-not-found))
         (price (get price listing))
         (seller (get seller listing))
         (token-id (get token-id listing))
         (fee (/ (* price trading-fee-bps) u10000)))
        (asserts! (get active listing) err-invalid-listing)
        (asserts! (is-eq (get listing-type listing) "direct") err-invalid-listing)
        (asserts! (not (is-eq tx-sender seller)) err-self-bid)
        
        ;; Transfer payment (minus fee) to seller
        (try! (stx-transfer? (- price fee) tx-sender seller))
        
        ;; Transfer fee to platform
        (try! (stx-transfer? fee tx-sender contract-owner))
        (var-set platform-revenue (+ (var-get platform-revenue) fee))
        
        ;; Mark listing as inactive
        (map-set listings listing-id (merge listing { active: false }))
        
        (print {
            event: "rec-purchased",
            listing-id: listing-id,
            token-id: token-id,
            buyer: tx-sender,
            seller: seller,
            price: price
        })
        (ok true)
    )
)

(define-public (place-bid (listing-id uint) (bid-amount uint))
    (let
        ((listing (unwrap! (map-get? listings listing-id) err-listing-not-found))
         (current-highest (map-get? highest-bids listing-id))
         (end-time (unwrap! (get end-time listing) err-invalid-listing)))
        (asserts! (get active listing) err-invalid-listing)
        (asserts! (is-eq (get listing-type listing) "auction") err-invalid-listing)
        (asserts! (<= burn-block-height end-time) err-auction-ended)
        (asserts! (not (is-eq tx-sender (get seller listing))) err-self-bid)
        (asserts! (> bid-amount (get price listing)) err-bid-too-low)
        
        ;; Check if bid is higher than current highest
        (match current-highest
            highest-bid (asserts! (> bid-amount (get amount highest-bid)) err-bid-too-low)
            true
        )
        
        ;; Refund previous highest bidder if exists
        (match current-highest
            highest-bid (try! (stx-transfer? (get amount highest-bid) tx-sender (get bidder highest-bid)))
            true
        )
        
        ;; Lock the bid amount
        (try! (stx-transfer? bid-amount tx-sender (as-contract tx-sender)))
        
        ;; Update highest bid
        (map-set highest-bids listing-id {
            bidder: tx-sender,
            amount: bid-amount
        })
        
        ;; Record user bid
        (map-set user-bids { listing-id: listing-id, bidder: tx-sender } bid-amount)
        
        (print {
            event: "bid-placed",
            listing-id: listing-id,
            bidder: tx-sender,
            amount: bid-amount
        })
        (ok true)
    )
)

(define-public (finalize-auction (listing-id uint))
    (let
        ((listing (unwrap! (map-get? listings listing-id) err-listing-not-found))
         (highest-bid (map-get? highest-bids listing-id))
         (end-time (unwrap! (get end-time listing) err-invalid-listing)))
        (asserts! (get active listing) err-invalid-listing)
        (asserts! (is-eq (get listing-type listing) "auction") err-invalid-listing)
        (asserts! (> burn-block-height end-time) err-auction-active)
        
        (match highest-bid
            bid (begin
                (let
                    ((winner (get bidder bid))
                     (winning-amount (get amount bid))
                     (seller (get seller listing))
                     (token-id (get token-id listing))
                     (fee (/ (* winning-amount trading-fee-bps) u10000)))
                    
                    ;; Transfer payment (minus fee) to seller
                    (try! (as-contract (stx-transfer? (- winning-amount fee) tx-sender seller)))
                    
                    ;; Transfer fee to platform
                    (try! (as-contract (stx-transfer? fee tx-sender contract-owner)))
                    (var-set platform-revenue (+ (var-get platform-revenue) fee))
                    
                    ;; Mark listing as inactive
                    (map-set listings listing-id (merge listing { active: false }))
                    
                    (print {
                        event: "auction-finalized",
                        listing-id: listing-id,
                        token-id: token-id,
                        winner: winner,
                        winning-amount: winning-amount
                    })
                    (ok true)
                )
            )
            ;; No bids - just mark as inactive
            (begin
                (map-set listings listing-id (merge listing { active: false }))
                (print {
                    event: "auction-ended-no-bids",
                    listing-id: listing-id
                })
                (ok false)
            )
        )
    )
)

(define-public (cancel-listing (listing-id uint))
    (let
        ((listing (unwrap! (map-get? listings listing-id) err-listing-not-found)))
        (asserts! (is-eq tx-sender (get seller listing)) err-not-seller)
        (asserts! (get active listing) err-invalid-listing)
        
        ;; For auctions, check if there are bids
        (if (is-eq (get listing-type listing) "auction")
            (begin
                (match (map-get? highest-bids listing-id)
                    highest-bid (begin
                        ;; Refund highest bidder
                        (try! (as-contract (stx-transfer? (get amount highest-bid) tx-sender (get bidder highest-bid))))
                        true
                    )
                    true
                )
            )
            true
        )
        
        ;; Mark listing as inactive
        (map-set listings listing-id (merge listing { active: false }))
        
        (print {
            event: "listing-cancelled",
            listing-id: listing-id
        })
        (ok true)
    )
)

;; Read-only Functions
(define-read-only (get-listing (listing-id uint))
    (map-get? listings listing-id)
)

(define-read-only (get-highest-bid (listing-id uint))
    (map-get? highest-bids listing-id)
)

(define-read-only (get-user-bid (listing-id uint) (bidder principal))
    (map-get? user-bids { listing-id: listing-id, bidder: bidder })
)

(define-read-only (get-platform-revenue)
    (var-get platform-revenue)
)

(define-read-only (is-auction-ended (listing-id uint))
    (match (map-get? listings listing-id)
        listing (match (get end-time listing)
            end-time (> burn-block-height end-time)
            false
        )
        false
    )
)

(define-read-only (get-listing-count)
    (- (var-get next-listing-id) u1)
)

;; Admin Functions
(define-public (withdraw-platform-revenue (amount uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (asserts! (<= amount (var-get platform-revenue)) err-insufficient-funds)
        (try! (as-contract (stx-transfer? amount tx-sender contract-owner)))
        (var-set platform-revenue (- (var-get platform-revenue) amount))
        (ok true)
    )
)