import { TopNav } from "@/components/top-nav";

export default function LifeLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-50">
      <TopNav />
      {children}
    </div>
  );
}