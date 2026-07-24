const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export interface InspectorProfile {
  userId: string;
  verificationStatus: 'pending' | 'verified' | 'suspended';
  bio?: string;
  serviceAreas: string[];
  completedInspections: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyInspection {
  id: string;
  listingId: string;
  inspectorId: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  scheduledAt?: string;
  submittedAt?: string;
  approvedAt?: string;
  inspectorNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionJob {
  id: string;
  listingId: string;
  address?: string;
  propertyTitle?: string;
  inspectionType?: 'new_listing' | 're_inspection';
  offeredFee?: number;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected' | 'available' | 'claimed' | 'completed';
  scheduledAt?: string;
  createdAt?: string;
  completedAt?: string;
}

export interface ChecklistItem {
  category: 'structural' | 'plumbing' | 'electrical' | 'safety' | 'exterior';
  item: string;
  result: 'pass' | 'fail' | 'na';
  notes?: string;
}

export interface InspectionPhoto {
  url: string;
  caption?: string;
}

export interface InspectorEarnings {
  inspectorId: string;
  completedInspections: number;
  totalEarnings: number;
  inspections: Array<{
    id: string;
    listingId: string;
    completedAt: string;
    fee: number;
  }>;
}

export interface InspectionSummary {
  inspectionId: string;
  listingId: string;
  approvedAt: string;
  categoryResults: Record<string, { pass: number; fail: number; na: number }>;
  totalItems: number;
  passCount: number;
  failCount: number;
  photoCount: number;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || error.error || 'Request failed');
  }

  return response.json();
}

export const propertyInspectionApi = {
  // Inspector Application
  async applyAsInspector(data: { bio?: string; serviceAreas: string[] }): Promise<InspectorProfile> {
    return fetchWithAuth('/inspector/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Jobs
  async getAvailableJobs(): Promise<InspectionJob[]> {
    return fetchWithAuth('/inspector/jobs');
  },

  async acceptJob(inspectionId: string): Promise<PropertyInspection> {
    return fetchWithAuth(`/inspector/jobs/${inspectionId}/accept`, {
      method: 'POST',
    });
  },

  // Report Submission
  async submitReport(inspectionId: string, data: {
    checklistItems: ChecklistItem[];
    photos: InspectionPhoto[];
    inspectorNotes: string;
  }): Promise<PropertyInspection> {
    return fetchWithAuth(`/inspector/jobs/${inspectionId}/report`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Earnings
  async getEarnings(): Promise<InspectorEarnings> {
    return fetchWithAuth('/inspector/earnings');
  },

  // Public Inspection Summary
  async getInspectionSummary(propertyId: string): Promise<InspectionSummary> {
    return fetchWithAuth(`/properties/${propertyId}/inspection-summary`);
  },
};
