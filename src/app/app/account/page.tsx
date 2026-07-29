"use client";

import { Mail, MessageCircle, Send, UserCircle } from "lucide-react";
import { useBusiness } from "@/lib/business-context";
import { contacts } from "@/components/site-experience";
import { WorkspacePageHeader } from "@/components/workspace/page-header";

export default function AccountPage() {
  const { status, profile, input } = useBusiness();
  const personalized = status === "ready" && profile;

  return (
    <div className="workspace-page">
      <WorkspacePageHeader title="Аккаунт" description="Профиль и связанный бизнес-контекст." />

      <div className="workspace-settings-row">
        <span className="workspace-card-icon">
          <UserCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="workspace-card-title">Гостевой доступ</p>
          <p className="workspace-card-desc">
            Вход и профили появятся вместе с сохранением проектов. Сейчас Workspace работает без регистрации.
          </p>
        </div>
      </div>

      <div className="workspace-settings-row">
        <span className="workspace-card-icon">
          <UserCircle className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="workspace-card-title">Текущий бизнес-контекст</p>
          <p className="workspace-card-desc">
            {personalized ? `${profile.label} — «${input.trim().slice(0, 120)}»` : "Бизнес ещё не описан — начните с AI-консультанта или бизнес-анализа."}
          </p>
        </div>
      </div>

      <section>
        <p className="workspace-section-label">Связаться с командой AEVIX</p>
        <div className="workspace-card-grid">
          <a href={contacts.whatsapp.href} target="_blank" rel="noreferrer" className="workspace-card">
            <span className="workspace-card-icon">
              <MessageCircle className="h-5 w-5" />
            </span>
            <span className="workspace-card-title">WhatsApp</span>
            <span className="workspace-card-desc">{contacts.whatsapp.value}</span>
          </a>
          <a href={contacts.telegram.href} target="_blank" rel="noreferrer" className="workspace-card">
            <span className="workspace-card-icon">
              <Send className="h-5 w-5" />
            </span>
            <span className="workspace-card-title">Telegram</span>
            <span className="workspace-card-desc">{contacts.telegram.value}</span>
          </a>
          <a href={contacts.email.href} className="workspace-card">
            <span className="workspace-card-icon">
              <Mail className="h-5 w-5" />
            </span>
            <span className="workspace-card-title">Email</span>
            <span className="workspace-card-desc">{contacts.email.value}</span>
          </a>
        </div>
      </section>
    </div>
  );
}
