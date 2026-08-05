"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Mail, ShieldCheck, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useProjects } from "@/lib/projects";
import { displayNameOf, initialsOf } from "@/components/shell/shell-header-account";

type Profile = { email: string; name: string | null; createdAt: string; hasPassword: boolean };

/**
 * Профиль: то, что о человеке действительно известно, и ничего сверх.
 *
 * Заглушки на будущее сознательно не расставлены рядами: пустой раздел «скоро» на странице
 * аккаунта читается как недоделка, а не как обещание.
 */
export default function ProfilePage() {
  const { user, isLoaded } = useAuth();
  const { projects } = useProjects();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    void fetch("/api/auth/session?profile=1", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setProfile(data.profile ?? null))
      .catch(() => setProfile(null));
  }, [user]);

  if (!isLoaded) return <div className="workspace-page" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="workspace-page">
        <div className="workspace-empty">
          <span className="workspace-empty-icon">
            <User className="h-5 w-5" />
          </span>
          <p className="workspace-empty-title">Профиль доступен после входа</p>
          <p className="workspace-empty-desc">Войдите в аккаунт или создайте его — займёт минуту.</p>
          <Link href="/app/login" className="workspace-topbar-action">Войти</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-page">
      <div className="profile-head">
        <span className="profile-avatar" aria-hidden="true">{initialsOf(user)}</span>
        <div>
          <h2 className="profile-name">{displayNameOf(user)}</h2>
          <p className="profile-email">{user.email}</p>
        </div>
      </div>

      <dl className="profile-facts">
        <div>
          <dt><Mail className="h-3.5 w-3.5" /> Почта</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt><User className="h-3.5 w-3.5" /> Имя</dt>
          <dd>{profile?.name ?? "не указано"}</dd>
        </div>
        <div>
          <dt><ShieldCheck className="h-3.5 w-3.5" /> Пароль</dt>
          <dd>{profile ? (profile.hasPassword ? "задан" : "не задан — вход по коду") : "…"}</dd>
        </div>
        <div>
          <dt><FolderKanban className="h-3.5 w-3.5" /> Проектов в аккаунте</dt>
          <dd>{projects.length}</dd>
        </div>
        {profile?.createdAt ? (
          <div>
            <dt>Аккаунт создан</dt>
            <dd>{new Date(profile.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</dd>
          </div>
        ) : null}
      </dl>

      <Link href="/app/settings" className="workspace-topbar-action">Настройки аккаунта</Link>
    </div>
  );
}
