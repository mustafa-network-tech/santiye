import { createClient } from "@/lib/supabase/server";
import { PersonnelRepository } from "@/modules/work-plans/personnel-repository";
import { PersonnelManager } from "@/components/work-plans/personnel-manager";

export const metadata = {
  title: "Personel",
};

export default async function PersonnelPage() {
  const supabase = await createClient();
  const personnel = await new PersonnelRepository(supabase).list();

  return <PersonnelManager initialPersonnel={personnel} />;
}
