import { describe, it, expect, beforeEach } from 'vitest'
import { dealStore } from './dealStore.js'
import { DealStatus, ScheduleItemStatus, RepaymentMethod } from './deal.js'

describe('DealStore', () => {
  beforeEach(async () => {
    await dealStore.clear()
  })

  describe('create', () => {
    it('should create a new deal with generated ID', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      }

      const deal = await dealStore.create(input)

      expect(deal).toBeDefined()
      expect(deal.dealId).toBeDefined()
      expect(deal.tenantId).toBe('tenant-123')
      expect(deal.landlordId).toBe('landlord-123')
      expect(deal.annualRentNgn).toBe(120000)
      expect(deal.depositNgn).toBe(30000)
      expect(deal.financedAmountNgn).toBe(90000)
      expect(deal.termMonths).toBe(12)
      expect(deal.status).toBe(DealStatus.DRAFT)
      expect(deal.repaymentMethod).toBe('self_pay')
    })

    it('should generate repayment schedule', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      }

      const deal = await dealStore.create(input)

      expect(deal.schedule).toBeDefined()
      expect(Array.isArray(deal.schedule)).toBe(true)
      expect(deal.schedule.length).toBe(12)
      expect(deal.schedule[0].period).toBe(1)
      expect(deal.schedule[0].status).toBe(ScheduleItemStatus.UPCOMING)
    })

    it('should validate annual rent is greater than 0', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 0,
        depositNgn: 30000,
        termMonths: 12,
      }

      await expect(dealStore.create(input)).rejects.toThrow('Annual rent must be greater than 0')
    })

    it('should validate deposit is at least 20% of annual rent', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 20000, // Less than 20%
        termMonths: 12,
      }

      await expect(dealStore.create(input)).rejects.toThrow('Deposit must be at least 20% of annual rent')
    })

    it('should validate deposit is less than annual rent', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 120000,
        termMonths: 12,
      }

      await expect(dealStore.create(input)).rejects.toThrow('Deposit must be less than annual rent')
    })

    it('should validate term months is one of allowed values', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 24, // Not allowed
      }

      await expect(dealStore.create(input)).rejects.toThrow('Term months must be one of: 3, 6, 12')
    })

    it('should accept valid term months', async () => {
      for (const term of [3, 6, 12]) {
        const input = {
          tenantId: 'tenant-123',
          landlordId: 'landlord-123',
          annualRentNgn: 120000,
          depositNgn: 30000,
          termMonths: term,
        }

        const deal = await dealStore.create(input)
        expect(deal.termMonths).toBe(term)
        expect(deal.schedule.length).toBe(term)
      }
    })

    it('should set salary deduction details when repayment method is salary_deduction', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
        repaymentMethod: 'salary_deduction' as RepaymentMethod,
        employerId: 'employer-123',
        employeeId: 'employee-123',
        deductionDay: 25,
      }

      const deal = await dealStore.create(input)

      expect(deal.repaymentMethod).toBe('salary_deduction')
      expect(deal.employerId).toBe('employer-123')
      expect(deal.employeeId).toBe('employee-123')
      expect(deal.deductionDay).toBe(25)
    })

    it('should default to self_pay when repayment method not specified', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      }

      const deal = await dealStore.create(input)

      expect(deal.repaymentMethod).toBe('self_pay')
      expect(deal.employerId).toBeUndefined()
      expect(deal.employeeId).toBeUndefined()
      expect(deal.deductionDay).toBeUndefined()
    })
  })

  describe('findById', () => {
    it('should return deal when ID exists', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      }

      const createdDeal = await dealStore.create(input)
      const foundDeal = await dealStore.findById(createdDeal.dealId)

      expect(foundDeal).toBeDefined()
      expect(foundDeal?.dealId).toBe(createdDeal.dealId)
      expect(foundDeal?.tenantId).toBe('tenant-123')
      expect(foundDeal?.schedule).toBeDefined()
    })

    it('should return null when ID does not exist', async () => {
      const deal = await dealStore.findById('non-existent-id')

      expect(deal).toBeNull()
    })

    it('should return schedule in deal with schedule', async () => {
      const input = {
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      }

      const createdDeal = await dealStore.create(input)
      const foundDeal = await dealStore.findById(createdDeal.dealId)

      expect(foundDeal).toBeDefined()
      expect(foundDeal?.schedule).toBeDefined()
      expect(foundDeal?.schedule.length).toBe(12)
    })
  })

  describe('findMany', () => {
    beforeEach(async () => {
      // Create test deals
      await dealStore.create({
        tenantId: 'tenant-1',
        landlordId: 'landlord-1',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })
      await dealStore.create({
        tenantId: 'tenant-2',
        landlordId: 'landlord-1',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 6,
      })
      await dealStore.create({
        tenantId: 'tenant-1',
        landlordId: 'landlord-2',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 3,
      })
    })

    it('should return all deals when no filters provided', async () => {
      const result = await dealStore.findMany()

      expect(result.deals).toBeDefined()
      expect(result.deals.length).toBe(3)
      expect(result.total).toBe(3)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(result.totalPages).toBe(1)
    })

    it('should filter by tenantId', async () => {
      const result = await dealStore.findMany({ tenantId: 'tenant-1' })

      expect(result.deals.length).toBe(2)
      expect(result.deals.every((d) => d.tenantId === 'tenant-1')).toBe(true)
    })

    it('should filter by landlordId', async () => {
      const result = await dealStore.findMany({ landlordId: 'landlord-1' })

      expect(result.deals.length).toBe(2)
      expect(result.deals.every((d) => d.landlordId === 'landlord-1')).toBe(true)
    })

    it('should filter by status', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-3',
        landlordId: 'landlord-1',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })
      await dealStore.updateStatus(deal.dealId, DealStatus.ACTIVE)

      const result = await dealStore.findMany({ status: DealStatus.ACTIVE })

      expect(result.deals.length).toBe(1)
      expect(result.deals[0].status).toBe(DealStatus.ACTIVE)
    })

    it('should paginate results', async () => {
      const result = await dealStore.findMany({ page: 1, pageSize: 2 })

      expect(result.deals.length).toBe(2)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(2)
      expect(result.totalPages).toBe(2)
    })

    it('should sort by createdAt descending', async () => {
      const result = await dealStore.findMany()

      for (let i = 0; i < result.deals.length - 1; i++) {
        expect(result.deals[i].createdAt.getTime()).toBeGreaterThanOrEqual(
          result.deals[i + 1].createdAt.getTime()
        )
      }
    })

    it('should not include schedule in paginated results', async () => {
      const result = await dealStore.findMany()

      result.deals.forEach((deal) => {
        expect(deal).not.toHaveProperty('schedule')
      })
    })
  })

  describe('listActiveDealsWithSchedules', () => {
    it('should return deals with ACTIVE status', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })
      await dealStore.updateStatus(deal.dealId, DealStatus.ACTIVE)

      const activeDeals = await dealStore.listActiveDealsWithSchedules()

      expect(activeDeals.length).toBe(1)
      expect(activeDeals[0].dealId).toBe(deal.dealId)
      expect(activeDeals[0].status).toBe(DealStatus.ACTIVE)
      expect(activeDeals[0].schedule).toBeDefined()
    })

    it('should return deals with AT_RISK status', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })
      await dealStore.updateStatus(deal.dealId, DealStatus.AT_RISK)

      const activeDeals = await dealStore.listActiveDealsWithSchedules()

      expect(activeDeals.length).toBe(1)
      expect(activeDeals[0].status).toBe(DealStatus.AT_RISK)
    })

    it('should not return deals with DRAFT status', async () => {
      await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      const activeDeals = await dealStore.listActiveDealsWithSchedules()

      expect(activeDeals.length).toBe(0)
    })

    it('should not return deals with COMPLETED status', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })
      await dealStore.updateStatus(deal.dealId, DealStatus.COMPLETED)

      const activeDeals = await dealStore.listActiveDealsWithSchedules()

      expect(activeDeals.length).toBe(0)
    })
  })

  describe('updateStatus', () => {
    it('should update deal status', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      const updatedDeal = await dealStore.updateStatus(deal.dealId, DealStatus.ACTIVE)

      expect(updatedDeal).toBeDefined()
      expect(updatedDeal?.status).toBe(DealStatus.ACTIVE)
    })

    it('should return null for non-existent deal', async () => {
      const result = await dealStore.updateStatus('non-existent-id', DealStatus.ACTIVE)

      expect(result).toBeNull()
    })

    it('should preserve other deal properties when updating status', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      const updatedDeal = await dealStore.updateStatus(deal.dealId, DealStatus.ACTIVE)

      expect(updatedDeal?.tenantId).toBe(deal.tenantId)
      expect(updatedDeal?.landlordId).toBe(deal.landlordId)
      expect(updatedDeal?.annualRentNgn).toBe(deal.annualRentNgn)
      expect(updatedDeal?.schedule).toBeDefined()
    })
  })

  describe('updateScheduleItemStatus', () => {
    it('should update schedule item status', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      const updatedDeal = await dealStore.updateScheduleItemStatus(
        deal.dealId,
        1,
        ScheduleItemStatus.PAID
      )

      expect(updatedDeal).toBeDefined()
      expect(updatedDeal?.schedule[0].status).toBe(ScheduleItemStatus.PAID)
    })

    it('should return null for non-existent deal', async () => {
      const result = await dealStore.updateScheduleItemStatus(
        'non-existent-id',
        1,
        ScheduleItemStatus.PAID
      )

      expect(result).toBeNull()
    })

    it('should return null for non-existent period', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      const result = await dealStore.updateScheduleItemStatus(
        deal.dealId,
        99,
        ScheduleItemStatus.PAID
      )

      expect(result).toBeNull()
    })

    it('should preserve other schedule items when updating one', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      await dealStore.updateScheduleItemStatus(deal.dealId, 1, ScheduleItemStatus.PAID)

      const updatedDeal = await dealStore.findById(deal.dealId)
      expect(updatedDeal?.schedule[0].status).toBe(ScheduleItemStatus.PAID)
      expect(updatedDeal?.schedule[1].status).toBe(ScheduleItemStatus.UPCOMING)
    })
  })

  describe('setScheduleDueDateForTest', () => {
    it('should update schedule item due date', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      const newDueDate = new Date('2025-01-15').toISOString()
      await dealStore.setScheduleDueDateForTest(deal.dealId, 1, newDueDate)

      const updatedDeal = await dealStore.findById(deal.dealId)
      expect(updatedDeal?.schedule[0].dueDate).toBe(newDueDate)
    })

    it('should throw error for non-existent deal', async () => {
      await expect(
        dealStore.setScheduleDueDateForTest('non-existent-id', 1, '2025-01-15')
      ).rejects.toThrow('Deal non-existent-id not found')
    })

    it('should throw error for non-existent period', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      await expect(
        dealStore.setScheduleDueDateForTest(deal.dealId, 99, '2025-01-15')
      ).rejects.toThrow('Period 99 not found')
    })
  })

  describe('updateRepaymentMethod', () => {
    it('should update to salary_deduction with employer details', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
      })

      const updatedDeal = await dealStore.updateRepaymentMethod(
        deal.dealId,
        'salary_deduction',
        { employerId: 'employer-123', employeeId: 'employee-123', deductionDay: 25 }
      )

      expect(updatedDeal).toBeDefined()
      expect(updatedDeal?.repaymentMethod).toBe('salary_deduction')
      expect(updatedDeal?.employerId).toBe('employer-123')
      expect(updatedDeal?.employeeId).toBe('employee-123')
      expect(updatedDeal?.deductionDay).toBe(25)
    })

    it('should clear employer details when switching to self_pay', async () => {
      const deal = await dealStore.create({
        tenantId: 'tenant-123',
        landlordId: 'landlord-123',
        annualRentNgn: 120000,
        depositNgn: 30000,
        termMonths: 12,
        repaymentMethod: 'salary_deduction',
        employerId: 'employer-123',
        employeeId: 'employee-123',
        deductionDay: 25,
      })

      const updatedDeal = await dealStore.updateRepaymentMethod(deal.dealId, 'self_pay')

      expect(updatedDeal).toBeDefined()
      expect(updatedDeal?.repaymentMethod).toBe('self_pay')
      expect(updatedDeal?.employerId).toBeUndefined()
      expect(updatedDeal?.employeeId).toBeUndefined()
      expect(updatedDeal?.deductionDay).toBeUndefined()
    })

    it('should return null for non-existent deal', async () => {
      const result = await dealStore.updateRepaymentMethod('non-existent-id', 'self_pay')

      expect(result).toBeNull()
    })
  })

  // Note: These tests use the in-memory store which is suitable for
  // deterministic testing without database dependencies. The store
  // implements the same interface as the Postgres repository.
})
