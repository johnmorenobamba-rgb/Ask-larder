import { checkBaseline } from "./helpers/baseline";

export default async function globalTeardown() {
  await checkBaseline();
}
