import type { ApiResponse } from "@/types/api";

export type ReportConditionType = "boolean" | "text" | "date" | "number" | string;

export interface ReportHeader {
  reportId: string;
  reportType: string;
  reportTitle: string;
  agencyLogoUrl?: string | null;
  agencyName?: string | null;
  agencyPhone?: string | null;
  propertyAddress?: string | null;
  leaseStartDate?: string | null;
  leaseEndDate?: string | null;
  inspectionDate?: string | null;
  tenant?: {
    name?: string | null;
    contactInfo?: string | null;
  } | null;
  inspector?: {
    name?: string | null;
    email?: string | null;
  } | null;
  agencyWhiteLabel?: {
    agencyNameColor?: string | null;
    addressColor?: string | null;
    accentColor?: string | null;
    accentFontFamily?: string | null;
    logoUrl?: string | null;
    primaryColor?: string | null;
    secondaryColor?: string | null;
    fontFamily?: string | null;
  } | null;
}

export interface ReportCondition {
  id: string;
  reportItemId: string;
  description: string;
  type: ReportConditionType;
  value?: string | null;
}

export interface ReportMedia {
  mediaId: string;
  reportItemId: string;
  url: string;
  type: "photo" | "video" | string;
  comments?: string[] | null;
}

export interface ReportItem {
  itemId: string;
  itemName: string;
  conditions: ReportCondition[];
  inspectorComments?: string | null;
  media: ReportMedia[];
}

export interface ReportArea {
  areaId: string;
  areaName: string;
  items: ReportItem[];
}

export interface InspectionReportData {
  inspectionId: string;
  reportType: string;
  notes?: string | null;
  header: ReportHeader;
  areas: ReportArea[];
  id: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string | null;
  updatedBy?: string | null;
  isDeleted: boolean;
  deletedBy?: string | null;
  deletedAt?: string | null;
  isActive: boolean;
}

export type InspectionReportResponse = ApiResponse<InspectionReportData>;
