import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentUser } from "@/hooks/use-current-user";
import { authClient } from "@/lib/auth-client";
import { Button } from "./ui/button";

export default function UserMenu() {
  const router = useRouter();
  const user = useCurrentUser();

  // Get first name or first initial for mobile display
  const getDisplayName = () => {
    if (!user?.name) {
      return "";
    }
    const firstName = user.name.split(" ")[0];
    return firstName.length > 8 ? `${firstName.slice(0, 7)}...` : firstName;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <span className="hidden sm:inline">{user?.name}</span>
          <span className="sm:hidden">{getDisplayName()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>{user?.email}</DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button
            className="w-full"
            onClick={() => {
              authClient.signOut({
                fetchOptions: {
                  onSuccess: () => {
                    router.push("/login");
                  },
                },
              });
            }}
            variant="destructive"
          >
            Sign Out
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
