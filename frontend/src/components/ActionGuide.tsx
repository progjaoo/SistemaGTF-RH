import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Orientação cross-page reutilizável: "Para executar essa ação, vá na
// página Y…". Sem navegação própria — quem usa passa onGo (ex:
// onGo={() => setActiveTab("periods")} no App, ou a navegação do portal).
export default function ActionGuide({ targetLabel, onGo, hint }: {
  targetLabel: string;
  onGo: () => void;
  hint?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-teal-bg/40 px-3 py-2 text-[0.85rem]">
      <span className="text-ink">
        Para executar essa ação, vá na página <strong>{targetLabel}</strong>.
        {hint ? <span className="text-muted"> {hint}</span> : null}
      </span>
      <Button type="button" variant="outline" size="sm" onClick={onGo}>
        Ir para {targetLabel}
        <ArrowRight size={15} />
      </Button>
    </div>
  );
}
