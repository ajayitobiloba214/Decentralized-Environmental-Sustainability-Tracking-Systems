import { describe, it, expect, beforeEach } from "vitest"

describe("Goal Tracking System", () => {
  let mockContract
  
  beforeEach(() => {
    mockContract = {
      goals: new Map(),
      goalProgress: new Map(),
      officerGoals: new Map(),
      goalCounter: 0,
      authorizedOfficers: new Set(["ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"]),
      currentBlock: 1000,
    }
  })
  
  describe("Goal Creation", () => {
    it("should create a goal successfully", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const title = "Reduce Carbon Emissions"
      const description = "Reduce carbon emissions by 20% this quarter"
      const metricType = "carbon-emissions"
      const targetValue = 1000
      const deadline = 2000
      
      const result = createGoal(mockContract, officer, title, description, metricType, targetValue, deadline)
      
      expect(result.success).toBe(true)
      expect(result.goalId).toBe(1)
      expect(mockContract.goals.has(1)).toBe(true)
      expect(mockContract.goals.get(1).title).toBe(title)
      expect(mockContract.goals.get(1).targetValue).toBe(targetValue)
    })
    
    it("should not allow unauthorized officers to create goals", () => {
      const officer = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"
      const title = "Reduce Carbon Emissions"
      const description = "Reduce carbon emissions by 20% this quarter"
      const metricType = "carbon-emissions"
      const targetValue = 1000
      const deadline = 2000
      
      const result = createGoal(mockContract, officer, title, description, metricType, targetValue, deadline)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR-NOT-AUTHORIZED")
    })
    
    it("should not allow goals with zero target value", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const title = "Invalid Goal"
      const description = "Goal with zero target"
      const metricType = "carbon-emissions"
      const targetValue = 0
      const deadline = 2000
      
      const result = createGoal(mockContract, officer, title, description, metricType, targetValue, deadline)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR-INVALID-TARGET")
    })
    
    it("should not allow goals with past deadlines", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      const title = "Past Goal"
      const description = "Goal with past deadline"
      const metricType = "carbon-emissions"
      const targetValue = 1000
      const deadline = 500 // Past deadline
      
      const result = createGoal(mockContract, officer, title, description, metricType, targetValue, deadline)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR-GOAL-EXPIRED")
    })
  })
  
  describe("Goal Progress Tracking", () => {
    it("should update goal progress correctly", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      createGoal(mockContract, officer, "Test Goal", "Description", "carbon-emissions", 1000, 2000)
      const result = updateGoalValue(mockContract, officer, 1, 250)
      
      expect(result.success).toBe(true)
      expect(mockContract.goals.get(1).currentValue).toBe(250)
      expect(mockContract.goalProgress.get(1).progressPercentage).toBe(25)
    })
    
    it("should calculate progress percentage correctly", () => {
      const currentValue = 300
      const targetValue = 1000
      
      const percentage = calculateProgressPercentage(currentValue, targetValue)
      
      expect(percentage).toBe(30)
    })
    
    it("should handle zero target value in progress calculation", () => {
      const currentValue = 100
      const targetValue = 0
      
      const percentage = calculateProgressPercentage(currentValue, targetValue)
      
      expect(percentage).toBe(0)
    })
  })
  
  describe("Goal Status Management", () => {
    it("should update goal status successfully", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      createGoal(mockContract, officer, "Test Goal", "Description", "carbon-emissions", 1000, 2000)
      const result = updateGoalStatus(mockContract, officer, 1, "completed")
      
      expect(result.success).toBe(true)
      expect(mockContract.goals.get(1).status).toBe("completed")
    })
    
    it("should extend goal deadline successfully", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      createGoal(mockContract, officer, "Test Goal", "Description", "carbon-emissions", 1000, 2000)
      const result = extendGoalDeadline(mockContract, officer, 1, 3000)
      
      expect(result.success).toBe(true)
      expect(mockContract.goals.get(1).deadline).toBe(3000)
    })
    
    it("should not extend deadline to past date", () => {
      const officer = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
      
      createGoal(mockContract, officer, "Test Goal", "Description", "carbon-emissions", 1000, 2000)
      const result = extendGoalDeadline(mockContract, officer, 1, 500)
      
      expect(result.success).toBe(false)
      expect(result.error).toBe("ERR-GOAL-EXPIRED")
    })
  })
})

// Mock functions for testing
function createGoal(contract, officer, title, description, metricType, targetValue, deadline) {
  if (!contract.authorizedOfficers.has(officer)) {
    return { success: false, error: "ERR-NOT-AUTHORIZED" }
  }
  
  if (targetValue <= 0) {
    return { success: false, error: "ERR-INVALID-TARGET" }
  }
  
  if (deadline <= contract.currentBlock) {
    return { success: false, error: "ERR-GOAL-EXPIRED" }
  }
  
  const goalId = ++contract.goalCounter
  
  contract.goals.set(goalId, {
    creator: officer,
    title,
    description,
    metricType,
    targetValue,
    currentValue: 0,
    deadline,
    status: "active",
    createdAt: contract.currentBlock,
  })
  
  contract.goalProgress.set(goalId, {
    progressPercentage: 0,
    lastUpdated: contract.currentBlock,
    measurementsCount: 0,
  })
  
  const officerGoals = contract.officerGoals.get(officer) || []
  officerGoals.push(goalId)
  contract.officerGoals.set(officer, officerGoals)
  
  return { success: true, goalId }
}

function updateGoalValue(contract, officer, goalId, newValue) {
  if (!contract.authorizedOfficers.has(officer)) {
    return { success: false, error: "ERR-NOT-AUTHORIZED" }
  }
  
  if (!contract.goals.has(goalId)) {
    return { success: false, error: "ERR-GOAL-NOT-FOUND" }
  }
  
  const goal = contract.goals.get(goalId)
  goal.currentValue = newValue
  contract.goals.set(goalId, goal)
  
  const progressPercentage = calculateProgressPercentage(newValue, goal.targetValue)
  contract.goalProgress.set(goalId, {
    progressPercentage,
    lastUpdated: contract.currentBlock,
    measurementsCount: (contract.goalProgress.get(goalId)?.measurementsCount || 0) + 1,
  })
  
  return { success: true }
}

function updateGoalStatus(contract, officer, goalId, newStatus) {
  if (!contract.authorizedOfficers.has(officer)) {
    return { success: false, error: "ERR-NOT-AUTHORIZED" }
  }
  
  if (!contract.goals.has(goalId)) {
    return { success: false, error: "ERR-GOAL-NOT-FOUND" }
  }
  
  const goal = contract.goals.get(goalId)
  goal.status = newStatus
  contract.goals.set(goalId, goal)
  
  return { success: true }
}

function extendGoalDeadline(contract, officer, goalId, newDeadline) {
  if (!contract.authorizedOfficers.has(officer)) {
    return { success: false, error: "ERR-NOT-AUTHORIZED" }
  }
  
  if (newDeadline <= contract.currentBlock) {
    return { success: false, error: "ERR-GOAL-EXPIRED" }
  }
  
  if (!contract.goals.has(goalId)) {
    return { success: false, error: "ERR-GOAL-NOT-FOUND" }
  }
  
  const goal = contract.goals.get(goalId)
  if (goal.creator !== officer) {
    return { success: false, error: "ERR-NOT-AUTHORIZED" }
  }
  
  goal.deadline = newDeadline
  contract.goals.set(goalId, goal)
  
  return { success: true }
}

function calculateProgressPercentage(currentValue, targetValue) {
  if (targetValue === 0) return 0
  return Math.floor((currentValue * 100) / targetValue)
}
