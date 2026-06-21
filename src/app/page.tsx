import { redirect } from "next/navigation";
import { getUser } from "@/lib/domain";

export default async function Home() {
  const user = await getUser();

  redirect(user ? "/dashboard" : "/login");
}
