import { recordBaseline } from "./helpers/baseline";

export default async function globalSetup() {
  await recordBaseline();
}
