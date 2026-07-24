import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { UpcomingScheduleTable } from "./UpcomingScheduleTable"

vi.mock("next-intl", () => ({
  useLocale: () => "en-NG",
}))

const mockSchedule = [
  {
    period: 1,
    month: "January 2025",
    amount: 50000,
    dueDate: "2025-01-15",
    status: "paid" as const,
  },
  {
    period: 2,
    month: "February 2025",
    amount: 50000,
    dueDate: "2025-02-15",
    status: "upcoming" as const,
    isNextDue: true,
  },
]

describe("UpcomingScheduleTable accessibility", () => {
  it("renders an accessible table with a label", () => {
    render(<UpcomingScheduleTable schedule={mockSchedule} onPayNow={vi.fn()} />)
    expect(screen.getByRole("table", { name: /payment schedule/i })).toBeInTheDocument()
  })

  it("column headers have scope='col'", () => {
    const { container } = render(
      <UpcomingScheduleTable schedule={mockSchedule} onPayNow={vi.fn()} />,
    )
    const scopedHeaders = container.querySelectorAll("th[scope='col']")
    expect(scopedHeaders.length).toBeGreaterThanOrEqual(4)
  })

  it("Pay Now button has a descriptive accessible label", () => {
    render(<UpcomingScheduleTable schedule={mockSchedule} onPayNow={vi.fn()} />)
    expect(
      screen.getByRole("button", { name: /pay installment 2/i }),
    ).toBeInTheDocument()
  })

  it("hides Pay Now button while an optimistic pending is active", () => {
    render(
      <UpcomingScheduleTable
        schedule={mockSchedule}
        onPayNow={vi.fn()}
        optimisticStatuses={{ 2: "pending" }}
      />,
    )
    expect(screen.queryByRole("button", { name: /pay/i })).not.toBeInTheDocument()
  })

  it("shows Processing label for optimistic pending row", () => {
    render(
      <UpcomingScheduleTable
        schedule={mockSchedule}
        onPayNow={vi.fn()}
        optimisticStatuses={{ 2: "pending" }}
      />,
    )
    expect(screen.getByLabelText(/status: processing/i)).toBeInTheDocument()
  })

  it("shows Failed label for optimistic failed row", () => {
    render(
      <UpcomingScheduleTable
        schedule={mockSchedule}
        onPayNow={vi.fn()}
        optimisticStatuses={{ 2: "failed" }}
      />,
    )
    expect(screen.getByLabelText(/status: failed/i)).toBeInTheDocument()
  })

  it("icons are hidden from screen readers", () => {
    const { container } = render(
      <UpcomingScheduleTable schedule={mockSchedule} onPayNow={vi.fn()} />,
    )
    const hiddenIcons = container.querySelectorAll("[aria-hidden='true']")
    expect(hiddenIcons.length).toBeGreaterThan(0)
  })
})
