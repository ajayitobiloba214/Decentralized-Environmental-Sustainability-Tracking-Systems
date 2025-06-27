;; Impact Measurement System
;; Tracks and measures environmental impact metrics

;; Constants
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-INVALID-METRIC (err u201))
(define-constant ERR-INVALID-VALUE (err u202))
(define-constant ERR-NOT-FOUND (err u203))

;; Data Variables
(define-data-var measurement-counter uint u0)

;; Data Maps
(define-map measurements
  uint
  {
    officer: principal,
    metric-type: (string-ascii 50),
    value: uint,
    unit: (string-ascii 20),
    timestamp: uint,
    location: (string-ascii 100),
    verified: bool
  }
)

(define-map metric-totals
  (string-ascii 50)
  {
    total-value: uint,
    measurement-count: uint,
    last-updated: uint
  }
)

(define-map officer-measurements
  { officer: principal, metric: (string-ascii 50) }
  {
    total-value: uint,
    count: uint,
    last-measurement: uint
  }
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
(define-read-only (get-measurement (measurement-id uint))
  (map-get? measurements measurement-id)
)

(define-read-only (get-metric-total (metric-type (string-ascii 50)))
  (map-get? metric-totals metric-type)
)

(define-read-only (get-officer-metric-summary (officer principal) (metric (string-ascii 50)))
  (map-get? officer-measurements { officer: officer, metric: metric })
)

(define-read-only (get-measurement-count)
  (var-get measurement-counter)
)

;; Private functions
(define-private (is-authorized-officer (officer principal))
  (match (map-get? officer-permissions officer)
    permissions (get can-measure permissions)
    false
  )
)

(define-private (update-metric-totals (metric-type (string-ascii 50)) (value uint))
  (match (map-get? metric-totals metric-type)
    existing-total (map-set metric-totals metric-type {
      total-value: (+ (get total-value existing-total) value),
      measurement-count: (+ (get measurement-count existing-total) u1),
      last-updated: block-height
    })
    (map-set metric-totals metric-type {
      total-value: value,
      measurement-count: u1,
      last-updated: block-height
    })
  )
)

(define-private (update-officer-measurements (officer principal) (metric (string-ascii 50)) (value uint))
  (let ((key { officer: officer, metric: metric }))
    (match (map-get? officer-measurements key)
      existing (map-set officer-measurements key {
        total-value: (+ (get total-value existing) value),
        count: (+ (get count existing) u1),
        last-measurement: block-height
      })
      (map-set officer-measurements key {
        total-value: value,
        count: u1,
        last-measurement: block-height
      })
    )
  )
)

;; Public functions
(define-public (record-measurement (metric-type (string-ascii 50)) (value uint) (unit (string-ascii 20)) (location (string-ascii 100)))
  (let ((measurement-id (+ (var-get measurement-counter) u1)))
    (asserts! (is-authorized-officer tx-sender) ERR-NOT-AUTHORIZED)
    (asserts! (> value u0) ERR-INVALID-VALUE)
    (map-set measurements measurement-id {
      officer: tx-sender,
      metric-type: metric-type,
      value: value,
      unit: unit,
      timestamp: block-height,
      location: location,
      verified: true
    })
    (update-metric-totals metric-type value)
    (update-officer-measurements tx-sender metric-type value)
    (var-set measurement-counter measurement-id)
    (ok measurement-id)
  )
)

(define-public (set-officer-permissions (officer principal) (can-measure bool))
  (begin
    (map-set officer-permissions officer {
      can-measure: can-measure,
      can-set-goals: false,
      can-generate-reports: false,
      can-coordinate: false
    })
    (ok true)
  )
)

(define-public (verify-measurement (measurement-id uint) (verified bool))
  (begin
    (asserts! (is-authorized-officer tx-sender) ERR-NOT-AUTHORIZED)
    (match (map-get? measurements measurement-id)
      measurement (begin
        (map-set measurements measurement-id (merge measurement { verified: verified }))
        (ok true)
      )
      ERR-NOT-FOUND
    )
  )
)
