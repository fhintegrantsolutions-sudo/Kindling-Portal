import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4 py-12">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex items-center justify-center">
          <Image
            src="/logo.png"
            alt="Kindling logo"
            width={224}
            height={96}
            priority
          />
        </div>
        <div className="w-full">{children}</div>
      </div>
    </div>
  );
}
