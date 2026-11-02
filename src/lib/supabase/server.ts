import { getDemo } from "@/lib/demo";
import { createBaseClient } from "./base";

export async function createClient() {
  // A demo login reads the mirrored lender's data through a fetch that masks
  // their personal details. Every other login gets the plain client.
  const demo = await getDemo();
  return createBaseClient(demo?.fetch);
}
