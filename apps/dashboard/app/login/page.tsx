import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="card w-full max-w-md text-center">
        <div className="mb-2 text-3xl font-bold text-white">Hoixi Panel</div>
        <p className="mb-6 text-sm text-gray-400">
          Sunucu ayarlarını yönetmek için Discord ile giriş yap.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/dashboard" });
          }}
        >
          <button type="submit" className="btn w-full bg-[#5865F2] hover:bg-[#4752c4]">
            Discord ile Giriş Yap
          </button>
        </form>
        <p className="mt-4 text-xs text-gray-500">
          Sadece <strong>Sunucuyu Yönet</strong> yetkin olan sunucuları görürsün.
        </p>
      </div>
    </main>
  );
}
