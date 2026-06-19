import { PackageCheck, ShieldCheck, WalletCards } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

const features = [
  {
    title: "จองสต็อกทันที",
    copy: "กัน oversell ตั้งแต่ลูกค้ากดส่งออเดอร์",
    Icon: PackageCheck,
  },
  {
    title: "เครดิตลูกค้า",
    copy: "ยอดหนี้เพิ่มเมื่อแอดมินอนุมัติออเดอร์",
    Icon: WalletCards,
  },
  {
    title: "อนุมัติก่อนใช้",
    copy: "บัญชีใหม่ต้องผ่านแอดมินก่อนเห็นสินค้า",
    Icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-4 py-12">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-accent">
            Nak Inventory MVP
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-foreground sm:text-5xl">
            ระบบสั่งสินค้า เครดิตลูกค้า และตรวจสลิปสำหรับทีมเล็ก
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted">
            ลูกค้าสั่งสินค้าได้หลังอนุมัติบัญชี สต็อกถูกจองทันที แอดมินตรวจออเดอร์
            ตรวจสลิป และทีมแพ็คของอัปโหลดรูปก่อนจัดส่ง
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/login">เข้าสู่ระบบ</ButtonLink>
            <ButtonLink href="/login?mode=signup" variant="secondary">
              สมัครใช้งาน
            </ButtonLink>
          </div>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {features.map(({ title, copy, Icon }) => (
            <div key={title} className="rounded-lg border border-border bg-surface p-4">
              <Icon className="h-5 w-5 text-accent" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-muted">{copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
