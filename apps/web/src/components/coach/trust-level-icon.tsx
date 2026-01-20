"use client";

import { Shield, ShieldCheck, ShieldPlus, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const LEVEL_CONFIG = [
  {
    name: "New",
    icon: Shield,
    color: "text-gray-500",
    bgColor: "bg-gray-100",
    description: "All summaries require review",
  },
  {
    name: "Learning",
    icon: ShieldPlus,
    color: "text-blue-600",
    bgColor: "bg-blue-100",
    description: "Building trust through approvals",
  },
  {
    name: "Trusted",
    icon: ShieldCheck,
    color: "text-green-600",
    bgColor: "bg-green-100",
    description: "Most summaries auto-approved",
  },
  {
    name: "Expert",
    icon: Sparkles,
    color: "text-purple-600",
    bgColor: "bg-purple-100",
    description: "Full automation enabled",
  },
];

type TrustLevelIconProps = {
  level: number;
  totalApprovals?: number;
  onClick?: () => void;
  className?: string;
};

export function TrustLevelIcon({
  level,
  totalApprovals,
  onClick,
  className,
}: TrustLevelIconProps) {
  const config = LEVEL_CONFIG[level] || LEVEL_CONFIG[0];
  const Icon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors sm:h-9 sm:w-9",
            config.bgColor,
            "hover:opacity-80",
            className
          )}
          onClick={onClick}
          type="button"
        >
          <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", config.color)} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <div className="text-center">
          <div className="font-medium">
            Trust Level {level}: {config.name}
          </div>
          <div className="text-muted-foreground text-xs">
            {config.description}
          </div>
          {totalApprovals !== undefined && (
            <div className="mt-1 text-muted-foreground text-xs">
              {totalApprovals} approvals
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
