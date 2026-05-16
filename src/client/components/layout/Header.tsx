import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ProfileMenu } from "./ProfileMenu";

export const Header = async () => {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex items-center p-4 border-b bg-background shadow-sm h-16 w-full justify-end">
      <div className="flex items-center gap-x-4">
        <ProfileMenu user={session?.user || null} />
      </div>
    </div>
  );
};
