import { KaggleAnalyticsDashboard } from "@/components/dashboard/kaggle/AnalyticsDashboard";

export const metadata = {
  title: "Dataset Analytics | Analytics AI",
  description: "Ingest and analyze e-commerce transaction data.",
};

export default function AnalyticsPage() {
  return <KaggleAnalyticsDashboard />;
}
