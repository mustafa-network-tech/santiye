import { createClient } from "@/lib/supabase/server";
import { SettingsRepository } from "@/modules/settings/settings-repository";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata = {
  title: "Ayarlar",
};

export default async function SettingsPage() {
  const supabase = await createClient();
  const initialTypes = await new SettingsRepository(
    supabase
  ).getCustomProjectTypes();

  return <SettingsForm initialTypes={initialTypes} />;
}
