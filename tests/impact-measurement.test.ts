import { describe, it, expect, beforeEach } from "vitest"

describe("Impact Measurement System", () => {
  let mockContract
  
  beforeEach(() => {
    mockContract = {
      measurements: new Map(),
      metricTotals: new Map(),
      officerMeasurements: new Map(),
      measurementCounter: 0,
      authorizedOfficers: new Set(["ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"]),
    }
  })
  
  describe("Recording Measurements", () => {
    it("should record a measurement successfully", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const metricType = "carbon-emissions"
      const value = 100
      const unit = "kg"
      const location = "Building A"
      
      const result = recordMeasurement(mockContract, officer, metricType, value, unit, location)
      
      expect(result.success).toBe(true)
      expect(result.measurementId).toBe(1)
      expect(mockContract.measurements.has(1)).toBe(true)
      expect(mockContract.measurements.get(1).value).toBe(value)
      expect(mockContract.measurements.get(1).metricType).toBe(metricType)
    })
    
    it("should not allow unauthorized officers to record measurements", () => {
      const officer = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
      const metricType = "carbon-emissions"
      const value = 100
      const unit = "kg"
      const location = "Building A"
      
      const result = recordMeasurement(mockContract, officer, metricType, value, unit, location)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
    
    it("should not allow zero or negative values", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const metricType = "carbon-emissions"
      const value = 0
      const unit = "kg"
      const location = "Building A"
      
      const result = recordMeasurement(mockContract, officer, metricType, value, unit, location)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR-INVALID-VALUE")
    })
  })
  
  describe("Metric Totals", () => {
    it("should update metric totals when recording measurements", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const metricType = "carbon-emissions"
      
      recordMeasurement(mockContract, officer, metricType, 100, "kg", "Building A")
      recordMeasurement(mockContract, officer, metricType, 150, "kg", "Building B")
      
      const totals = mockContract.metricTotals.get(metricType)
      expect(totals.totalValue).toBe(250)
      expect(totals.measurementCount).toBe(2)
    })
    
    it("should track officer-specific measurements", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const metricType = "carbon-emissions"
      
      recordMeasurement(mockContract, officer, metricType, 100, "kg", "Building A")
      recordMeasurement(mockContract, officer, metricType, 50, "kg", "Building B")
      
      const key = `${officer}-${metricType}`
      const officerMeasurements = mockContract.officerMeasurements.get(key)
      expect(officerMeasurements.totalValue).toBe(150)
      expect(officerMeasurements.count).toBe(2)
    })
  })
  
  describe("Measurement Verification", () => {
    it("should allow verified officers to verify measurements", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const verifier = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      recordMeasurement(mockContract, officer, "carbon-emissions", 100, "kg", "Building A")
      const result = verifyMeasurement(mockContract, verifier, 1, true)
      
      expect(result.success).toBe(true)
      expect(mockContract.measurements.get(1).verified).toBe(true)
    })
    
    it("should not verify non-existent measurements", () => {
      const verifier = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      const result = verifyMeasurement(mockContract, verifier, 999, true)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR-NOT-FOUND")
    })
  })
})

// Mock functions for testing
function recordMeasurement(contract, officer, metricType, value, unit, location) {
  if (!contract.authorizedOfficers.has(officer)) {
    return { success: false, error: "ERR-NOT-AUTHORIZED" }
  }
  
  if (value <= 0) {
    return { success: false, error: "ERR-INVALID-VALUE" }
  }
  
  const measurementId = ++contract.measurementCounter
  
  contract.measurements.set(measurementId, {
    officer,
    metricType,
    value,
    unit,
    location,
    timestamp: Date.now(),
    verified: true,
  })
  
  // Update metric totals
  const existing = contract.metricTotals.get(metricType) || { totalValue: 0, measurementCount: 0 }
  contract.metricTotals.set(metricType, {
    totalValue: existing.totalValue + value,
    measurementCount: existing.measurementCount + 1,
    lastUpdated: Date.now(),
  })
  
  // Update officer measurements
  const key = `${officer}-${metricType}`
  const officerExisting = contract.officerMeasurements.get(key) || { totalValue: 0, count: 0 }
  contract.officerMeasurements.set(key, {
    totalValue: officerExisting.totalValue + value,
    count: officerExisting.count + 1,
    lastMeasurement: Date.now(),
  })
  
  return { success: true, measurementId }
}

function verifyMeasurement(contract, verifier, measurementId, verified) {
  if (!contract.authorizedOfficers.has(verifier)) {
    return { success: false, error: "ERR-NOT-AUTHORIZED" }
  }
  
  if (!contract.measurements.has(measurementId)) {
    return { success: false, error: "ERR-NOT-FOUND" }
  }
  
  const measurement = contract.measurements.get(measurementId)
  measurement.verified = verified
  contract.measurements.set(measurementId, measurement)
  
  return { success: true }
}
