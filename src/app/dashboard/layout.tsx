import { Header } from "@/components/layout/Header";
import { CommandMenu } from "@/components/ui/command-menu";
import { Toaster } from "@/components/ui/toaster";
import { DashboardClientWrapper } from "@/components/layout/DashboardClientWrapper";

const DashboardLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return (
    <DashboardClientWrapper
      header={<Header />}
      command={<CommandMenu />}
      toaster={<Toaster />}
    >
      {children}
    </DashboardClientWrapper>
  );
};

export default DashboardLayout;
