export const MAGAZINE_SIZE = 30;
export const RELOAD_SECONDS = 1.85;

// Simulation time drives ammunition; pausing the arena also pauses reloads.
export function createWeaponState() {
  let ammo = MAGAZINE_SIZE, reserve = 90, cooldown = 0, remaining = 0;
  return {
    get ammo() { return ammo; },
    get reserve() { return reserve; },
    get reloading() { return remaining > 0; },
    get reloadProgress() { return remaining > 0 ? 1 - remaining / RELOAD_SECONDS : 0; },
    reload() {
      if (remaining > 0 || ammo === MAGAZINE_SIZE || reserve === 0) return false;
      remaining = RELOAD_SECONDS;
      return true;
    },
    fire() {
      if (cooldown > 0 || remaining > 0 || ammo === 0) return false;
      ammo--;
      cooldown = 0.096;
      return true;
    },
    update(dt) {
      const step = Math.max(0, Number(dt) || 0);
      cooldown = Math.max(0, cooldown - step);
      if (remaining <= 0) return false;
      remaining = Math.max(0, remaining - step);
      if (remaining > 0) return false;
      const loaded = Math.min(MAGAZINE_SIZE - ammo, reserve);
      ammo += loaded;
      reserve -= loaded;
      return true;
    },
    reset() { ammo = MAGAZINE_SIZE; reserve = 90; cooldown = 0; remaining = 0; }
  };
}
