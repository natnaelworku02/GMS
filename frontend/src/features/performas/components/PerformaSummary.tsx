import { useTranslations } from "next-intl";

interface Props {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  grandTotal: number;
}

export function PerformaSummary({ subtotal, vatRate, vatAmount, grandTotal }: Props) {
  const t = useTranslations("performas");

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "ETB", minimumFractionDigits: 2 }).format(n);

  return (
    <div className="space-y-1.5 border-t pt-3 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("subtotal")}</span>
        <span>{fmt(subtotal)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("vatRate")}</span>
        <span>{vatRate}%</span>
      </div>
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("vatAmount")}</span>
        <span>{fmt(vatAmount)}</span>
      </div>
      <div className="flex justify-between border-t pt-1.5 font-semibold">
        <span>{t("grandTotal")}</span>
        <span>{fmt(grandTotal)}</span>
      </div>
    </div>
  );
}
