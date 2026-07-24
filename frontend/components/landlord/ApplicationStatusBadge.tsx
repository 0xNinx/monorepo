import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ApplicationStatusBadgeProps {
  status: "pending" | "under_review" | "approved" | "rejected" | "withdrawn";
}

export function ApplicationStatusBadge({ status }: ApplicationStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "pending":
        return {
          label: "Pending",
          className: "bg-accent border-foreground text-foreground",
        };
      case "under_review":
        return {
          label: "Under Review",
          className: "bg-yellow-100 border-foreground text-yellow-800",
        };
      case "approved":
        return {
          label: "Approved",
          className: "bg-secondary border-foreground text-foreground",
        };
      case "rejected":
        return {
          label: "Rejected",
          className: "bg-destructive border-foreground text-destructive-foreground",
        };
      case "withdrawn":
        return {
          label: "Withdrawn",
          className: "bg-muted border-foreground text-muted-foreground",
        };
      default:
        return {
          label: "Unknown",
          className: "bg-muted border-foreground text-foreground",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge className={cn("border-2 font-bold", config.className)}>
      {config.label}
    </Badge>
  );
}
