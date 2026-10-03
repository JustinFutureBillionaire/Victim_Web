"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type CreateTicketState = { id?: string; error?: string };

export async function createTicket(_prev: CreateTicketState, formData: FormData): Promise<CreateTicketState> {
  const field = (name: string, max: number) => {
    const v = formData.get(name);
    const s = typeof v === "string" ? v.trim() : "";
    return s && s.length <= max ? s : null;
  };
  const customer_email = field("email", 200);
  const subject = field("subject", 200);
  const body = field("body", 10000);

  if (!customer_email || !/^\S+@\S+\.\S+$/.test(customer_email)) return { error: "Enter a valid email." };
  if (!subject) return { error: "Subject is required (max 200 characters)." };
  if (!body) return { error: "Message is required (max 10,000 characters)." };

  try {
    const { data, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({ customer_email, subject, body })
      .select("id")
      .single<{ id: string | number }>();
    if (error) return { error: error.message };
    return { id: String(data.id) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
