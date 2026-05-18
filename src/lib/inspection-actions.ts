import { InspectionStatus } from "@/types/api";

export const getReportViewBaseUrl = () => {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/inspections`;
  }
  const envUrl = process.env.NEXT_PUBLIC_REPORT_VIEW_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) {
    return `${envUrl.replace(/\/$/, "")}/inspections`;
  }
  return "http://localhost:3000/inspections";
};

export const REPORT_VIEW_BASE_URL = typeof window !== "undefined"
  ? `${window.location.origin}/inspections`
  : "http://localhost:3000/inspections";

export const getInspectionReportUrl = (inspectionId: string) =>
  `${getReportViewBaseUrl()}/${inspectionId}/report`;

export type InspectionAction = {
  key: string;
  label: string;
  onClick: () => void;
};

export type InspectionActionSet = {
  primary?: InspectionAction;
  menu?: InspectionAction[];
  emptyLabel?: string;
};

type ActionHandlers = {
  statusId: number;
  onEditInspection?: () => void;
  onDeleteInspection?: () => void;
  onViewReport?: () => void;
  onCloseReport?: () => void;
  onReopenReport?: () => void;
};

const buildAction = (key: string, label: string, handler?: () => void) =>
  handler ? ({ key, label, onClick: handler } as InspectionAction) : undefined;

export const getInspectionActions = ({
  statusId,
  onEditInspection,
  onDeleteInspection,
  onViewReport,
  onCloseReport,
  onReopenReport,
}: ActionHandlers): InspectionActionSet => {
  if (statusId === InspectionStatus.Pending) {
    return {
      menu: [
        buildAction("edit", "Edit", onEditInspection),
        buildAction("delete", "Delete", onDeleteInspection),
      ].filter(Boolean) as InspectionAction[],
    };
  }

  if (statusId === InspectionStatus.InProgress || statusId === InspectionStatus.InSync) {
    return { emptyLabel: "No actions available" };
  }

  if (statusId === InspectionStatus.Completed) {
    return {
      primary: buildAction("view-report", "View Report", onViewReport),
      menu: [
        buildAction("view-report", "View Report", onViewReport),
        buildAction("close-report", "Close Report", onCloseReport),
      ].filter(Boolean) as InspectionAction[],
    };
  }

  if (statusId === InspectionStatus.Closed) {
    return {
      primary: buildAction("view-report", "View Report", onViewReport),
      menu: [
        buildAction("view-report", "View Report", onViewReport),
        buildAction("reopen-report", "Reopen Report", onReopenReport),
      ].filter(Boolean) as InspectionAction[],
    };
  }

  return { emptyLabel: "No actions available" };
};
