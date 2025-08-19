;; REC Verification Contract
;; Manages third-party verification of renewable energy generation

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-unauthorized (err u300))
(define-constant err-already-verified (err u301))
(define-constant err-invalid-verifier (err u302))
(define-constant err-verification-not-found (err u303))
(define-constant err-invalid-status (err u304))

;; Verification statuses
(define-constant status-pending "pending")
(define-constant status-verified "verified")
(define-constant status-rejected "rejected")
(define-constant status-disputed "disputed")

;; Data Variables
(define-data-var next-verification-id uint u1)

;; Data Maps
(define-map authorized-verifiers principal {
    name: (string-ascii 100),
    certification-body: (string-ascii 50),
    authorized-date: uint,
    active: bool
})

(define-map verification-records uint {
    token-id: uint,
    verifier: principal,
    verification-date: uint,
    status: (string-ascii 10),
    notes: (string-ascii 500),
    evidence-hash: (string-ascii 64),
    expiry-date: (optional uint)
})

(define-map token-verifications uint uint) ;; token-id -> verification-id

(define-map verifier-stats principal {
    total-verifications: uint,
    verified-count: uint,
    rejected-count: uint,
    reputation-score: uint ;; 0-100
})

(define-map verification-disputes uint {
    disputer: principal,
    reason: (string-ascii 500),
    dispute-date: uint,
    resolved: bool,
    resolution: (optional (string-ascii 500))
})

;; Public Functions
(define-public (add-verifier 
    (verifier principal)
    (name (string-ascii 100))
    (certification-body (string-ascii 50)))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (map-set authorized-verifiers verifier {
            name: name,
            certification-body: certification-body,
            authorized-date: burn-block-height,
            active: true
        })
        (map-set verifier-stats verifier {
            total-verifications: u0,
            verified-count: u0,
            rejected-count: u0,
            reputation-score: u100
        })
        (print {
            event: "verifier-added",
            verifier: verifier,
            name: name
        })
        (ok true)
    )
)

(define-public (deactivate-verifier (verifier principal))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (let
            ((verifier-info (unwrap! (map-get? authorized-verifiers verifier) err-invalid-verifier)))
            (map-set authorized-verifiers verifier (merge verifier-info { active: false }))
            (print {
                event: "verifier-deactivated",
                verifier: verifier
            })
            (ok true)
        )
    )
)

(define-public (submit-verification
    (token-id uint)
    (status (string-ascii 10))
    (notes (string-ascii 500))
    (evidence-hash (string-ascii 64))
    (expiry-date (optional uint)))
    (let
        ((verification-id (var-get next-verification-id))
         (verifier-info (unwrap! (map-get? authorized-verifiers tx-sender) err-invalid-verifier)))
        (asserts! (get active verifier-info) err-invalid-verifier)
        (asserts! (or (is-eq status status-verified) 
                     (is-eq status status-rejected) 
                     (is-eq status status-pending)) err-invalid-status)
        
        (map-set verification-records verification-id {
            token-id: token-id,
            verifier: tx-sender,
            verification-date: burn-block-height,
            status: status,
            notes: notes,
            evidence-hash: evidence-hash,
            expiry-date: expiry-date
        })
        
        (map-set token-verifications token-id verification-id)
        (var-set next-verification-id (+ verification-id u1))
        
        ;; Update verifier stats
        (let
            ((current-stats (default-to 
                { total-verifications: u0, verified-count: u0, rejected-count: u0, reputation-score: u100 }
                (map-get? verifier-stats tx-sender))))
            (map-set verifier-stats tx-sender {
                total-verifications: (+ (get total-verifications current-stats) u1),
                verified-count: (if (is-eq status status-verified) 
                                   (+ (get verified-count current-stats) u1)
                                   (get verified-count current-stats)),
                rejected-count: (if (is-eq status status-rejected)
                                   (+ (get rejected-count current-stats) u1)
                                   (get rejected-count current-stats)),
                reputation-score: (get reputation-score current-stats)
            })
        )
        
        (print {
            event: "verification-submitted",
            verification-id: verification-id,
            token-id: token-id,
            verifier: tx-sender,
            status: status
        })
        (ok verification-id)
    )
)

(define-public (update-verification-status
    (verification-id uint)
    (new-status (string-ascii 10))
    (additional-notes (string-ascii 500)))
    (let
        ((verification (unwrap! (map-get? verification-records verification-id) err-verification-not-found)))
        (asserts! (is-eq tx-sender (get verifier verification)) err-unauthorized)
        (asserts! (or (is-eq new-status status-verified) 
                     (is-eq new-status status-rejected) 
                     (is-eq new-status status-pending)
                     (is-eq new-status status-disputed)) err-invalid-status)
        
        (map-set verification-records verification-id 
            (merge verification { 
                status: new-status,
                notes: additional-notes,
                verification-date: burn-block-height
            }))
        
        (print {
            event: "verification-updated",
            verification-id: verification-id,
            new-status: new-status
        })
        (ok true)
    )
)

(define-public (dispute-verification
    (verification-id uint)
    (reason (string-ascii 500)))
    (let
        ((verification (unwrap! (map-get? verification-records verification-id) err-verification-not-found)))
        (map-set verification-disputes verification-id {
            disputer: tx-sender,
            reason: reason,
            dispute-date: burn-block-height,
            resolved: false,
            resolution: none
        })
        
        ;; Update verification status to disputed
        (map-set verification-records verification-id 
            (merge verification { status: status-disputed }))
        
        (print {
            event: "verification-disputed",
            verification-id: verification-id,
            disputer: tx-sender
        })
        (ok true)
    )
)

(define-public (resolve-dispute
    (verification-id uint)
    (resolution (string-ascii 500))
    (final-status (string-ascii 10)))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (let
            ((dispute (unwrap! (map-get? verification-disputes verification-id) err-verification-not-found))
             (verification (unwrap! (map-get? verification-records verification-id) err-verification-not-found)))
            (asserts! (not (get resolved dispute)) err-already-verified)
            
            ;; Update dispute as resolved
            (map-set verification-disputes verification-id 
                (merge dispute { 
                    resolved: true,
                    resolution: (some resolution)
                }))
            
            ;; Update verification status
            (map-set verification-records verification-id 
                (merge verification { 
                    status: final-status,
                    verification-date: burn-block-height
                }))
            
            (print {
                event: "dispute-resolved",
                verification-id: verification-id,
                final-status: final-status
            })
            (ok true)
        )
    )
)

;; Read-only Functions
(define-read-only (get-verification (verification-id uint))
    (map-get? verification-records verification-id)
)

(define-read-only (get-token-verification (token-id uint))
    (match (map-get? token-verifications token-id)
        verification-id (map-get? verification-records verification-id)
        none
    )
)

(define-read-only (is-authorized-verifier (verifier principal))
    (match (map-get? authorized-verifiers verifier)
        verifier-info (get active verifier-info)
        false
    )
)

(define-read-only (get-verifier-info (verifier principal))
    (map-get? authorized-verifiers verifier)
)

(define-read-only (get-verifier-stats (verifier principal))
    (map-get? verifier-stats verifier)
)

(define-read-only (get-verification-dispute (verification-id uint))
    (map-get? verification-disputes verification-id)
)

(define-read-only (is-token-verified (token-id uint))
    (match (get-token-verification token-id)
        verification (is-eq (get status verification) status-verified)
        false
    )
)

(define-read-only (get-verification-count)
    (- (var-get next-verification-id) u1)
)

;; Admin Functions
(define-public (update-verifier-reputation (verifier principal) (new-score uint))
    (begin
        (asserts! (is-eq tx-sender contract-owner) err-unauthorized)
        (asserts! (<= new-score u100) err-invalid-status)
        (let
            ((current-stats (unwrap! (map-get? verifier-stats verifier) err-invalid-verifier)))
            (map-set verifier-stats verifier 
                (merge current-stats { reputation-score: new-score }))
            (ok true)
        )
    )
)