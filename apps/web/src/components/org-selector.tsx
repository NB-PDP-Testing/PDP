"use client";

import { Building2, Check, ChevronsUpDown, Plus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date;
}

export function OrgSelector() {
  const router = useRouter();
  const params = useParams();
  const urlOrgId = params.orgId as string | undefined;

  const [open, setOpen] = useState(false);

  // Use Convex query to get user with custom fields
  const user = useCurrentUser();

  const { data: organizations, isPending: isLoadingOrganizations } =
    authClient.useListOrganizations();

  const currentOrg = organizations?.find(
    (org: Organization) => org.id === urlOrgId
  );

  const handleSelectOrg = (orgId: string) => {
    setOpen(false);
    router.push(`/orgs/${orgId}/admin`);
  };

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className="w-[200px] justify-between"
          disabled={isLoadingOrganizations}
          role="combobox"
          variant="outline"
        >
          {isLoadingOrganizations ? (
            "Loading..."
          ) : currentOrg ? (
            <div className="flex items-center gap-2 truncate">
              {currentOrg.logo ? (
                <img alt="" className="h-4 w-4 rounded" src={currentOrg.logo} />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              <span className="truncate">{currentOrg.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span>Select org...</span>
            </div>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search organizations..." />
          <CommandList>
            <CommandEmpty>No organization found.</CommandEmpty>
            <CommandGroup heading="Your Organizations">
              {organizations?.map((org: Organization) => (
                <CommandItem
                  key={org.id}
                  onSelect={() => handleSelectOrg(org.id)}
                  value={org.id}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      urlOrgId === org.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2 truncate">
                    {org.logo ? (
                      <img alt="" className="h-4 w-4 rounded" src={org.logo} />
                    ) : (
                      <Building2 className="h-4 w-4" />
                    )}
                    <span className="truncate">{org.name}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            {user && "isPlatformStaff" in user && user.isPlatformStaff ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <Link href="/orgs/create">
                    <CommandItem
                      onSelect={() => {
                        setOpen(false);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      <span>Create Organization</span>
                    </CommandItem>
                  </Link>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
