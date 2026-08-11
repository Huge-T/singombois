import { PublicNav } from "@/components/PublicNav";
import { LoginForm } from "@/components/LoginForm";

export default async function MasukPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div>
      <PublicNav />
      <div
        className="kertas"
        style={{
          minHeight: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 24px",
        }}
      >
        <div style={{ width: 440, maxWidth: "100%" }}>
          <p className="alis" style={{ maxWidth: 280, margin: "0 auto 20px", textAlign: "center" }}>
            Masuk <span>· ke SINGO MBOIS</span>
          </p>
          <LoginForm callbackUrl={callbackUrl} />
        </div>
      </div>
    </div>
  );
}
