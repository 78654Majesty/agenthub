import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar activeLink="Docs" />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
