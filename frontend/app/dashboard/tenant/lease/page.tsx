"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  MapPin,
  FileText,
  Download,
  User,
  Phone,
  Mail,
  Clock,
  X,
  Briefcase,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { leaseDetails, tenantDealId } from "@/lib/mockData/leaseData";
import {
  searchEmployers,
  updateDealRepayment,
  type RepaymentMethod,
  type EmployerSearchResult,
} from "@/lib/employersApi";
import {
  leaseAgreement,
  propertyInspectionReport,
  paymentSchedule,
  houseRules,
} from "@/lib/mockData/documents";

const DEDUCTION_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

export default function TenantLeasePage() {
  const [repaymentMethod, setRepaymentMethod] =
    useState<RepaymentMethod>("self_pay");
  const [employerQuery, setEmployerQuery] = useState("");
  const [employerResults, setEmployerResults] = useState<
    EmployerSearchResult[]
  >([]);
  const [selectedEmployer, setSelectedEmployer] =
    useState<EmployerSearchResult | null>(null);
  const [employeeId, setEmployeeId] = useState("");
  const [deductionDay, setDeductionDay] = useState(25);
  const [repaymentSaving, setRepaymentSaving] = useState(false);
  const [repaymentError, setRepaymentError] = useState<string | null>(null);
  const [repaymentSaved, setRepaymentSaved] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<
    | typeof leaseAgreement
    | typeof propertyInspectionReport
    | typeof paymentSchedule
    | typeof houseRules
    | null
  >(null);

  useEffect(() => {
    if (repaymentMethod !== "salary_deduction" || employerQuery.trim().length < 2) {
      setEmployerResults([]);
      return;
    }
    const timer = setTimeout(() => {
      searchEmployers(employerQuery)
        .then(setEmployerResults)
        .catch(() => setEmployerResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [employerQuery, repaymentMethod]);

  const saveRepaymentMethod = useCallback(async () => {
    setRepaymentSaving(true);
    setRepaymentError(null);
    setRepaymentSaved(false);
    try {
      await updateDealRepayment(tenantDealId, {
        repaymentMethod,
        employerId: selectedEmployer?.id,
        employeeId: repaymentMethod === "salary_deduction" ? employeeId : undefined,
        deductionDay:
          repaymentMethod === "salary_deduction" ? deductionDay : undefined,
      });
      setRepaymentSaved(true);
    } catch (err) {
      setRepaymentError(
        err instanceof Error ? err.message : "Failed to save repayment method",
      );
    } finally {
      setRepaymentSaving(false);
    }
  }, [repaymentMethod, selectedEmployer, employeeId, deductionDay]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const progressPercentage =
    (leaseDetails.paymentProgress.totalPaid /
      leaseDetails.paymentProgress.totalOwed) *
    100;

  const getDocumentObject = (docName: string) => {
    switch (docName) {
      case "Lease Agreement":
        return leaseAgreement;
      case "Property Inspection Report":
        return propertyInspectionReport;
      case "Payment Schedule":
        return paymentSchedule;
      case "House Rules":
        return houseRules;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <DashboardSidebar
        role="tenant"
        userInfo={{ name: "Ngozi Adekunle", roleLabel: "Tenant" }}
      />

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen pt-20">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">My Lease</h1>
              <p className="mt-1 text-muted-foreground">
                View your lease details and documents
              </p>
            </div>
            <div className="flex items-center gap-2 border-3 border-foreground bg-secondary px-4 py-2 font-bold">
              <CheckCircle className="h-5 w-5" />
              Active Lease
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Property Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-4 text-lg font-bold">Property Details</h3>
                <div className="mb-4 border-3 border-foreground bg-muted p-8">
                  <div className="flex items-center justify-center">
                    <Building2 className="h-20 w-20 text-muted-foreground" />
                  </div>
                </div>
                <h4 className="text-xl font-bold">
                  {leaseDetails.property.title}
                </h4>
                <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {leaseDetails.property.address}
                </p>
                <div className="mt-4 flex gap-4">
                  <span className="border-2 border-foreground bg-muted px-3 py-1 text-sm font-bold">
                    {leaseDetails.property.beds} Beds
                  </span>
                  <span className="border-2 border-foreground bg-muted px-3 py-1 text-sm font-bold">
                    {leaseDetails.property.baths} Baths
                  </span>
                  <span className="border-2 border-foreground bg-muted px-3 py-1 text-sm font-bold">
                    {leaseDetails.property.sqm} sqm
                  </span>
                </div>
              </Card>

              {/* Lease Terms */}
              <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-4 text-lg font-bold">Lease Terms</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="border-3 border-foreground bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">Start Date</span>
                    </div>
                    <p className="mt-1 font-bold">
                      {leaseDetails.lease.startDate}
                    </p>
                  </div>
                  <div className="border-3 border-foreground bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm">End Date</span>
                    </div>
                    <p className="mt-1 font-bold">
                      {leaseDetails.lease.endDate}
                    </p>
                  </div>
                  <div className="border-3 border-foreground bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">Duration</span>
                    </div>
                    <p className="mt-1 font-bold">
                      {leaseDetails.lease.duration}
                    </p>
                  </div>
                  <div className="border-3 border-foreground bg-primary/10 p-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CreditCard className="h-4 w-4" />
                      <span className="text-sm">Monthly Payment</span>
                    </div>
                    <p className="mt-1 font-bold text-primary">
                      {formatCurrency(leaseDetails.lease.monthlyPayment)}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Payment Progress
                    </span>
                    <span className="font-bold">
                      {leaseDetails.paymentProgress.paymentsCompleted}/
                      {leaseDetails.paymentProgress.totalPayments} payments
                    </span>
                  </div>
                  <div className="h-6 border-3 border-foreground bg-muted">
                    <div
                      className="h-full bg-secondary transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                    <span>
                      {formatCurrency(leaseDetails.paymentProgress.totalPaid)}{" "}
                      paid
                    </span>
                    <span>
                      {formatCurrency(leaseDetails.paymentProgress.totalOwed)}{" "}
                      total
                    </span>
                  </div>
                </div>
              </Card>

              {/* Repayment Method */}
              <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
                  <Briefcase className="h-5 w-5" />
                  Repayment Method
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setRepaymentMethod("self_pay")}
                    className={`border-3 border-foreground px-4 py-2 font-bold transition-all ${
                      repaymentMethod === "self_pay"
                        ? "bg-primary shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    Pay myself
                  </button>
                  <button
                    type="button"
                    onClick={() => setRepaymentMethod("salary_deduction")}
                    className={`border-3 border-foreground px-4 py-2 font-bold transition-all ${
                      repaymentMethod === "salary_deduction"
                        ? "bg-primary shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    Salary deduction
                  </button>
                </div>

                {repaymentMethod === "salary_deduction" && (
                  <div className="mt-6 space-y-4">
                    <div>
                      <label
                        htmlFor="employer-search"
                        className="mb-1 block text-sm font-bold"
                      >
                        Employer
                      </label>
                      <input
                        id="employer-search"
                        type="text"
                        value={employerQuery}
                        onChange={(e) => {
                          setEmployerQuery(e.target.value);
                          setSelectedEmployer(null);
                        }}
                        placeholder="Search by company name"
                        className="w-full border-3 border-foreground bg-background px-3 py-2 font-medium"
                      />
                      {employerResults.length > 0 && !selectedEmployer && (
                        <ul className="mt-2 border-3 border-foreground bg-card">
                          {employerResults.map((emp) => (
                            <li key={emp.id}>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left font-bold hover:bg-muted"
                                onClick={() => {
                                  setSelectedEmployer(emp);
                                  setEmployerQuery(emp.name);
                                  setEmployerResults([]);
                                }}
                              >
                                {emp.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="employee-id"
                        className="mb-1 block text-sm font-bold"
                      >
                        Employee ID (payroll)
                      </label>
                      <input
                        id="employee-id"
                        type="text"
                        value={employeeId}
                        onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder="Your ID at this employer"
                        className="w-full border-3 border-foreground bg-background px-3 py-2 font-medium"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="deduction-day"
                        className="mb-1 block text-sm font-bold"
                      >
                        Deduction day of month
                      </label>
                      <select
                        id="deduction-day"
                        value={deductionDay}
                        onChange={(e) =>
                          setDeductionDay(Number(e.target.value))
                        }
                        className="w-full border-3 border-foreground bg-background px-3 py-2 font-bold"
                      >
                        {DEDUCTION_DAYS.map((day) => (
                          <option key={day} value={day}>
                            Day {day}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="border-l-4 border-primary pl-3 text-sm text-muted-foreground">
                      Your employer will be notified to deduct{" "}
                      <span className="font-bold text-foreground">
                        {formatCurrency(leaseDetails.lease.monthlyPayment)}
                      </span>{" "}
                      on day{" "}
                      <span className="font-bold text-foreground">
                        {deductionDay}
                      </span>{" "}
                      of each month.
                    </p>
                  </div>
                )}

                {repaymentError && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-bold text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    {repaymentError}
                  </p>
                )}
                {repaymentSaved && (
                  <p className="mt-4 flex items-center gap-2 text-sm font-bold text-primary">
                    <CheckCircle className="h-4 w-4" />
                    Repayment preferences saved.
                  </p>
                )}

                <Button
                  className="mt-4 border-2 border-foreground bg-secondary font-bold shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
                  disabled={
                    repaymentSaving ||
                    (repaymentMethod === "salary_deduction" &&
                      (!selectedEmployer || !employeeId.trim()))
                  }
                  onClick={() => void saveRepaymentMethod()}
                >
                  {repaymentSaving ? "Saving…" : "Save repayment method"}
                </Button>
              </Card>

              {/* Documents */}
              <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-4 text-lg font-bold">Lease Documents</h3>
                <div className="space-y-3">
                  {leaseDetails.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex w-full items-center justify-between border-3 border-foreground bg-card p-4 text-left transition-all hover:bg-muted"
                    >
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-4 text-left"
                        onClick={() =>
                          setSelectedDocument(getDocumentObject(doc.name))
                        }
                      >
                        <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-muted shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">{doc.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.date} · {doc.size} · {doc.status}
                          </p>
                        </div>
                      </button>
                      <Button
                        className="border-2 border-foreground bg-primary px-4 py-2 font-bold shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]"
                        onClick={() =>
                          setSelectedDocument(getDocumentObject(doc.name))
                        }
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Document Viewer Modal */}
              {selectedDocument && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="max-h-[90vh] max-w-2xl w-full overflow-y-auto border-3 border-foreground bg-card shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
                    {/* Modal Header */}
                    <div className="sticky top-0 border-b-3 border-foreground bg-card px-6 py-4 flex items-center justify-between">
                      <h2 className="text-xl font-bold">
                        {selectedDocument.title}
                      </h2>
                      <button
                        onClick={() => setSelectedDocument(null)}
                        className="flex h-8 w-8 items-center justify-center border-2 border-foreground bg-muted hover:bg-primary transition-all"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 space-y-6">
                      {/* Document Info */}
                      <div className="flex flex-wrap gap-4 text-sm font-bold border-b-2 border-dashed border-foreground pb-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Date</p>
                          <p>{selectedDocument.date}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Size</p>
                          <p>{selectedDocument.size}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Status
                          </p>
                          <span className="capitalize inline-flex items-center gap-1 border-2 border-foreground px-2 py-1 bg-primary">
                            {selectedDocument.status}
                          </span>
                        </div>
                      </div>

                      {/* Document Sections */}
                      <div className="space-y-6">
                        {selectedDocument.content.sections.map(
                          (section) => (
                            <div
                              key={section.title}
                              className="border-l-4 border-primary pl-4"
                            >
                              <h3 className="font-bold text-lg mb-2">
                                {section.title}
                              </h3>
                              {"content" in section && section.content && (
                                <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                  {section.content}
                                </p>
                              )}
                              {"items" in section && section.items && (
                                <ul className="space-y-2">
                                  {section.items.map((item) => (
                                    <li
                                      key={`${section.title}:${item}`}
                                      className="flex gap-3 text-sm text-muted-foreground"
                                    >
                                      <span className="font-bold text-primary">
                                        •
                                      </span>
                                      <span>{item}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ),
                        )}
                      </div>

                      {/* Modal Footer */}
                      <div className="border-t-3 border-foreground pt-4 flex gap-3">
                        <Button className="flex-1 border-2 border-foreground bg-primary py-3 font-bold shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                          <Download className="mr-2 h-4 w-4" />
                          Download PDF
                        </Button>
                        <Button
                          onClick={() => setSelectedDocument(null)}
                          className="flex-1 border-2 border-foreground bg-transparent font-bold hover:bg-muted"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Cards */}
            <div className="space-y-6">
              {/* Landlord */}
              <Card className="border-3 border-foreground p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-4 text-lg font-bold">Landlord</h3>
                <div className="mb-4 flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center border-3 border-foreground bg-primary text-xl font-bold">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="font-bold">{leaseDetails.landlord.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {leaseDetails.landlord.company}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 border-t-2 border-foreground pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{leaseDetails.landlord.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{leaseDetails.landlord.email}</span>
                  </div>
                </div>
              </Card>

              {/* Need Help */}
              <Card className="border-3 border-foreground bg-accent/30 p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                <h3 className="mb-2 font-bold">Need Help?</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Having issues with your lease or property? Contact our support
                  team.
                </p>
                <Button
                  variant="outline"
                  className="w-full border-3 border-foreground bg-background font-bold"
                >
                  Contact Support
                </Button>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
