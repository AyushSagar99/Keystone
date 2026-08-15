import { api } from './api';

export async function seedDemoData() {
  return api.seedScenario();
}
