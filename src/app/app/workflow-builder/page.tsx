import { Workflow } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/page-header";
import { WorkspaceEmptyState } from "@/components/workspace/empty-state";

export default function WorkflowBuilderPage() {
  return (
    <div className="workspace-page">
      <WorkspacePageHeader
        title="Конструктор процессов"
        description="Собирайте автоматизацию бизнеса как визуальную схему — шаги, условия и интеграции в одном экране."
      />
      <WorkspaceEmptyState
        icon={Workflow}
        title="В разработке"
        description="Конструктор процессов появится в одной из следующих версий AEVIX. Сегодня карта процесса уже строится автоматически внутри AI-консультанта — по итогам разбора вашего бизнеса."
      />
    </div>
  );
}
