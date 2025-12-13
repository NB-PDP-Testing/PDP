"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Mail,
  Phone,
  User,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface Parent {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  phone?: string;
  relationship?: string;
  isPrimary?: boolean;
}

interface Team {
  _id: string;
  name: string;
  ageGroup?: string;
  sport?: string;
  [key: string]: any; // Allow additional properties
}

interface PlayerData {
  _id: string;
  name: string;
  ageGroup: string;
  sport: string;
  gender: string;
  season: string;
  completionDate?: string;
  attendance?: {
    training: string;
    matches: string;
  };
  parents?: Parent[];
  teams?: Team[];
  injuryNotes?: string;
  dateOfBirth?: string;
  address?: string;
  town?: string;
  postcode?: string;
}

interface Props {
  player: PlayerData;
}

export function BasicInformationSection({ player }: Props) {
  const [isExpanded, setIsExpanded] = useState(true);

  // Sort teams with primary team first, then by age group
  const sortedTeams = player.teams
    ? [...player.teams].sort((a, b) => {
        const ageOrder: Record<string, number> = {
          U8: 1,
          U9: 2,
          U10: 3,
          U11: 4,
          U12: 5,
          U13: 6,
          U14: 7,
          U15: 8,
          U16: 9,
          U17: 10,
          U18: 11,
          Minor: 12,
          Adult: 13,
          Senior: 14,
        };
        return (
          (ageOrder[a.ageGroup || ""] || 99) -
          (ageOrder[b.ageGroup || ""] || 99)
        );
      })
    : [];

  return (
    <Collapsible onOpenChange={setIsExpanded} open={isExpanded}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer transition-colors hover:bg-accent/50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Basic Information
              </CardTitle>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Player Demographics */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InfoField label="Player Name" value={player.name} />
              <InfoField label="Age Group" value={player.ageGroup} />
              <InfoField label="Sport" value={player.sport} />
              <InfoField label="Gender" value={player.gender} />
              <InfoField
                label="Team(s)"
                value={
                  sortedTeams.length > 0
                    ? sortedTeams.map((t) => t.name).join(", ")
                    : "No teams assigned"
                }
              />
              <InfoField label="Season" value={player.season} />
              {player.completionDate && (
                <InfoField
                  label="Completion Date"
                  value={player.completionDate}
                />
              )}
              {player.dateOfBirth && (
                <InfoField label="Date of Birth" value={player.dateOfBirth} />
              )}
            </div>

            {/* Attendance */}
            {player.attendance && (
              <div className="border-t pt-4">
                <h4 className="mb-3 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                  Attendance
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <InfoField
                    label="Training Attendance"
                    value={player.attendance.training}
                  />
                  <InfoField
                    label="Match Attendance"
                    value={player.attendance.matches}
                  />
                </div>
              </div>
            )}

            {/* Address Information */}
            {(player.address || player.town || player.postcode) && (
              <div className="border-t pt-4">
                <h4 className="mb-3 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                  Address
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {player.address && (
                    <InfoField label="Address" value={player.address} />
                  )}
                  {player.town && (
                    <InfoField label="Town" value={player.town} />
                  )}
                  {player.postcode && (
                    <InfoField label="Postcode" value={player.postcode} />
                  )}
                </div>
              </div>
            )}

            {/* Parent/Guardian Information */}
            {player.parents && player.parents.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="mb-4 font-semibold text-muted-foreground text-sm uppercase tracking-wide">
                  {player.parents.length > 1
                    ? "Parents & Guardians"
                    : "Parent / Guardian"}
                </h4>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {player.parents.map((parent, idx) => (
                    <Card
                      className="transition-shadow hover:shadow-md"
                      key={parent.id || idx}
                    >
                      <CardContent className="p-4">
                        {/* Parent Header */}
                        <div className="mb-3 flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground text-sm">
                              {parent.firstName?.[0]}
                              {parent.surname?.[0]}
                            </div>
                            <div>
                              <h5 className="font-semibold text-sm">
                                {parent.firstName} {parent.surname}
                              </h5>
                              {parent.relationship && (
                                <p className="text-muted-foreground text-xs">
                                  {parent.relationship}
                                </p>
                              )}
                            </div>
                          </div>
                          {parent.isPrimary && (
                            <Badge className="text-xs" variant="default">
                              Primary
                            </Badge>
                          )}
                        </div>

                        {/* Contact Details */}
                        <div className="space-y-2">
                          <a
                            className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-primary"
                            href={`mailto:${parent.email}`}
                          >
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{parent.email}</span>
                          </a>
                          {parent.phone && (
                            <a
                              className="flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-primary"
                              href={`tel:${parent.phone}`}
                            >
                              <Phone className="h-4 w-4" />
                              <span>{parent.phone}</span>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Injury Notes */}
            {player.injuryNotes && (
              <div className="border-t pt-4">
                <div className="rounded-lg border-orange-500 border-l-4 bg-orange-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    <div>
                      <h4 className="font-semibold text-orange-900 text-sm">
                        Injury/Burnout Notes
                      </h4>
                      <p className="mt-1 text-orange-800 text-sm">
                        {player.injuryNotes}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-sm">{value || "Not specified"}</dd>
    </div>
  );
}
