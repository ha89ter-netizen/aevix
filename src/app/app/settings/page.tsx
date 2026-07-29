import { Bell, Globe2, Palette, Settings as SettingsIcon } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/page-header";

const groups = [
  {
    icon: Palette,
    title: "Внешний вид",
    desc: "Тема интерфейса и плотность интерфейса — появятся здесь.",
  },
  {
    icon: Bell,
    title: "Уведомления",
    desc: "Оповещения о готовности анализа и новых проектах — появятся здесь.",
  },
  {
    icon: Globe2,
    title: "Язык и регион",
    desc: "Сейчас AEVIX работает на русском языке.",
  },
] as const;

export default function SettingsPage() {
  return (
    <div className="workspace-page">
      <WorkspacePageHeader title="Настройки" description="Управление рабочим пространством AEVIX." />
      <div className="workspace-settings-list">
        {groups.map((group) => {
          const Icon = group.icon;
          return (
            <div key={group.title} className="workspace-settings-row">
              <span className="workspace-card-icon">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="workspace-card-title">{group.title}</p>
                <p className="workspace-card-desc">{group.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p className="workspace-page-desc">
        <SettingsIcon className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
        Больше настроек появится по мере развития Workspace.
      </p>
    </div>
  );
}
