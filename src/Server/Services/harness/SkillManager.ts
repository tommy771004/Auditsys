export interface Skill {
  id: string;
  name: string;
  isLoaded: boolean;
  load: () => Promise<void>;
}

/**
 * 漸進式技能載入管理器 (Progressive Skill Disclosure)
 * 允許 Agent 在執行過程中動態請求高階技能，避免預先載入龐大且不需要的模組
 */
export class SkillManager {
  private skills: Map<string, Skill> = new Map();

  public registerSkill(id: string, name: string, loader: () => Promise<void>) {
    this.skills.set(id, { id, name, isLoaded: false, load: loader });
  }

  public async requireSkill(id: string): Promise<void> {
    const skill = this.skills.get(id);
    if (!skill) {
      throw new Error(`[SkillManager] Skill '${id}' is not registered.`);
    }

    if (!skill.isLoaded) {
      console.log(`[SkillManager] Lazy loading skill: ${skill.name} (${skill.id})`);
      await skill.load();
      skill.isLoaded = true;
    }
  }

  public hasSkill(id: string): boolean {
    return this.skills.get(id)?.isLoaded ?? false;
  }
}
