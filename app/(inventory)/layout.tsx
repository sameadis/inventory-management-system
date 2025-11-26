import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">ALIC Inventory Management</h1>
              <p className="text-sm text-muted-foreground">
                Fixed Asset Inventory for Church Branches
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-right">
                <p className="font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {process.env.NODE_ENV === "development" ? "Dev Mode" : "Production"}
                </p>
              </div>
              <form action="/api/auth/signout" method="post">
                <button
                  type="submit"
                  className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

