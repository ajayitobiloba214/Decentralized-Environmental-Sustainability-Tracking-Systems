;; Goal Tracking System
;; Manages sustainability goals and progress monitoring

;; Constants
(define-constant ERR-NOT-AUTHORIZED (err u300))
(define-constant ERR-INVALID-GOAL (err u301))
(define-constant ERR-GOAL-NOT-FOUND (err u302))
(define-constant ERR-INVALID-TARGET (err u303))
(define-constant ERR-GOAL-EXPIRED (err u304))

;; Data Variables
(define-data-var goal-counter uint u0)

;; Data Maps
(define-map goals
  uint
  {
    creator: principal,
    title: (string-ascii 100),
    description: (string-ascii 500),
    metric-type: (string-ascii 50),
    target-value: uint,
    current-value: uint,
    deadline: uint,
    status: (string-ascii 20),
    created-at: uint
  }
)

(define-map goal-progress
  uint
  {
    progress-percentage: uint,
    last-updated: uint,
    measurements-count: uint
  }
)

(define-map officer-goals
  principal
  (list 50 uint)
)

(define-map officer-permissions
  principal
  {
    can-measure: bool,
    can-set-goals: bool,
    can-generate-reports: bool,
    can-coordinate: bool
  }
)

;; Read-only functions
(define-read-only (get-goal (goal-id uint))
  (map-get? goals goal-id)
)

(define-read-only (get-goal-progress (goal-id uint))
  (map-get? goal-progress goal-id)
)

(define-read-only (get-officer-goals (officer principal))
  (default-to (list) (map-get? officer-goals officer))
)

(define-read-only (get-goal-count)
  (var-get goal-counter)
)

(define-read-only (calculate-progress-percentage (current-value uint) (target-value uint))
  (if (is-eq target-value u0)
    u0
    (/ (* current-value u100) target-value)
  )
)

;; Private functions
(define-private (is-authorized-for-goals (officer principal))
  (match (map-get? officer-permissions officer)
    permissions (get can-set-goals permissions)
    false
  )
)

(define-private (update-goal-progress (goal-id uint) (new-value uint))
  (match (map-get? goals goal-id)
    goal (let ((progress-pct (calculate-progress-percentage new-value (get target-value goal))))
      (map-set goal-progress goal-id {
        progress-percentage: progress-pct,
        last-updated: block-height,
        measurements-count: (+ (default-to u0 (get measurements-count (map-get? goal-progress goal-id))) u1)
      })
      (map-set goals goal-id (merge goal { current-value: new-value }))
      (ok true)
    )
    ERR-GOAL-NOT-FOUND
  )
)

;; Public functions
(define-public (create-goal (title (string-ascii 100)) (description (string-ascii 500)) (metric-type (string-ascii 50)) (target-value uint) (deadline uint))
  (let ((goal-id (+ (var-get goal-counter) u1)))
    (asserts! (is-authorized-for-goals tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (> target-value u0) ERR-INVALID-TARGET)
    (asserts! (> deadline block-height) ERR-GOAL-EXPIRED)
    (map-set goals goal-id {
      creator: tx-sender,
      title: title,
      description: description,
      metric-type: metric-type,
      target-value: target-value,
      current-value: u0,
      deadline: deadline,
      status: "active",
      created-at: block-height
    })
    (map-set goal-progress goal-id {
      progress-percentage: u0,
      last-updated: block-height,
      measurements-count: u0
    })
    (let ((current-goals (get-officer-goals tx-sender)))
      (map-set officer-goals tx-sender (unwrap! (as-max-len? (append current-goals goal-id) u50) ERR-INVALID-GOAL))
    )
    (var-set goal-counter goal-id)
    (ok goal-id)
  )
)

(define-public (update-goal-value (goal-id uint) (new-value uint))
  (begin
    (asserts! (is-authorized-for-goals tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (is-some (map-get? goals goal-id)) ERR-GOAL-NOT-FOUND)
    (update-goal-progress goal-id new-value)
  )
)

(define-public (update-goal-status (goal-id uint) (new-status (string-ascii 20)))
  (begin
    (asserts! (is-authorized-for-goals tx-sender) ERR-NOT-AUTHORIZED)
    (match (map-get? goals goal-id)
      goal (begin
        (map-set goals goal-id (merge goal { status: new-status }))
        (ok true)
      )
      ERR-GOAL-NOT-FOUND
    )
  )
)

(define-public (extend-goal-deadline (goal-id uint) (new-deadline uint))
  (begin
    (asserts! (is-authorized-for-goals tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (> new-deadline block-height) ERR-GOAL-EXPIRED)
    (match (map-get? goals goal-id)
      goal (begin
        (asserts! (is-eq (get creator goal) tx-sender) ERR-NOT-AUTHORIZED)
        (map-set goals goal-id (merge goal { deadline: new-deadline }))
        (ok true)
      )
      ERR-GOAL-NOT-FOUND
    )
  )
)

(define-public (set-officer-permissions (officer principal) (can-set-goals bool))
  (begin
    (map-set officer-permissions officer {
      can-measure: false,
      can-set-goals: can-set-goals,
      can-generate-reports: false,
      can-coordinate: false
    })
    (ok true)
  )
)
